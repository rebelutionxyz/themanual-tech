-- DB58 — COUNT ONLY HOLDS STRIPE HAS CONFIRMED (2026-08-18)
-- ROLLBACK: _drafts/20260818011500_db58_confirmed_holds_only_v1_rollback.sql
--
-- THE THIRD VARIANT OF ONE DEFECT. DB48 stopped the ledger counting money that
-- EVAPORATED (expired authorizations). DB54 stopped it counting money that NEVER
-- EXISTED (fixture seed rows). This stops it counting money that NEVER ARRIVED.
--
-- MEASURED: fund-live-test-20260817 reads raised_cents 1100 against goal_cents
-- 1000, so the live page shows GOAL MET. The whole 1100 is one pledge whose
-- PaymentIntent (pi_3U5azMAPNY1rgvEA3ZCi7Lry) was never confirmed - no payment
-- method was ever attached and the connected account shows Uncaptured: 0.
--
-- WHY IT IS SEVERE. fountain_begin_close computes v_success := raised_cents >=
-- goal_cents. A campaign can therefore pass its all-or-nothing verdict on intents
-- nobody ever paid for and then capture the REAL cards of everyone who did pledge.
--
-- ROOT CAUSE: the fountain writes status 'authorized' at PaymentIntent CREATION.
-- 'authorized' has been carrying two different claims in one word - "we asked
-- Stripe for an intent" and "a card is being held". Only the second may count.
--
-- THE FIX NEEDS NO DEPLOY, and that is why this shape was chosen over renaming
-- the status. Stripe already tells us when a hold truly exists:
-- payment_intent.amount_capturable_updated. give-webhook already receives it,
-- already verifies its signature, and already writes every fund event into
-- stripe_events BEFORE it branches - so the evidence is in this database today.
-- What give-webhook does NOT do is record the confirmation against the pledge: on
-- that event it returns early when the row already exists. Rather than change and
-- redeploy the function, this migration reads the evidence it already stores.
-- (Renaming the status to 'created'/'pending' is the cleaner SEMANTICS and would
-- need a fountain change plus a webhook change - two deploys, two dispatches. It
-- remains open as a follow-up; nothing here forecloses it.)

-- ---------------------------------------------------------------- the column

-- NULL means "Stripe has not told us a hold exists". Defaulting to NULL rather
-- than now() is the whole point: an unconfirmed pledge must not count, and the
-- safe direction for a funding verdict is to UNDERSTATE.
alter table public.fountain_pledges
  add column if not exists authorized_at timestamptz;

comment on column public.fountain_pledges.authorized_at is
  'When Stripe confirmed a hold exists (payment_intent.amount_capturable_updated). '
  'NULL = the PaymentIntent was created but never confirmed, so the pledge counts '
  'toward nothing. Stamped from stripe_events by trigger, never by hand. DB58.';

-- ------------------------------------------------------------- the stamp

-- Fires on the row give-webhook writes for every verified fund event. The event
-- body is already signature-verified before it reaches stripe_events, so this
-- trusts nothing the webhook did not already authenticate.
CREATE OR REPLACE FUNCTION public.stripe_events_stamp_fund_authorization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_pi text;
BEGIN
  IF NEW.product_type IS DISTINCT FROM 'fund'
     OR NEW.event_type IS DISTINCT FROM 'payment_intent.amount_capturable_updated' THEN
    RETURN NULL;
  END IF;

  v_pi := NEW.payload->'data'->'object'->>'id';
  IF v_pi IS NULL THEN RETURN NULL; END IF;

  -- coalesce keeps the FIRST confirmation: Stripe can resend, and the earliest
  -- moment the hold was known to exist is the honest timestamp.
  UPDATE public.fountain_pledges
     SET authorized_at = coalesce(authorized_at, NEW.created_at, now())
   WHERE stripe_payment_intent_id = v_pi
     AND authorized_at IS NULL;

  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS stripe_events_stamp_fund_authorization ON public.stripe_events;

CREATE TRIGGER stripe_events_stamp_fund_authorization
  AFTER INSERT OR UPDATE ON public.stripe_events
  FOR EACH ROW EXECUTE FUNCTION public.stripe_events_stamp_fund_authorization();

-- ------------------------------------------------------------- the backfill

-- Evidence already held: any fund confirmation event stripe_events has seen.
-- There are none today - the only fund event on record is a cancel - so this
-- writes nothing. It runs anyway so the state is derived rather than believed.
UPDATE public.fountain_pledges p
   SET authorized_at = e.created_at
  FROM public.stripe_events e
 WHERE e.product_type = 'fund'
   AND e.event_type = 'payment_intent.amount_capturable_updated'
   AND e.payload->'data'->'object'->>'id' = p.stripe_payment_intent_id
   AND p.authorized_at IS NULL;

-- A captured pledge is self-evidently one that was held: Stripe cannot capture
-- what was never authorized. Backfilling these keeps history countable without
-- depending on whether a webhook happened to be configured at the time.
UPDATE public.fountain_pledges
   SET authorized_at = coalesce(captured_at, created_at)
 WHERE status = 'captured' AND authorized_at IS NULL;

-- ------------------------------------------------------------- the counters

-- raised now requires POSITIVE EVIDENCE of a hold. Everything else is unchanged
-- from DB54: fixtures still excluded, captured still the settled figure.
CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
RETURNS TABLE (raised_cents bigint, captured_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
  SELECT coalesce(sum(amount_cents) FILTER (
           WHERE status IN ('authorized','captured')
             AND (authorized_at IS NOT NULL OR status = 'captured')), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id
     AND is_fixture = false;
$$;

-- Recount every campaign so the stored counters match the new definition.
DO $db58$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $db58$;

REVOKE EXECUTE ON FUNCTION public.stripe_events_stamp_fund_authorization() FROM PUBLIC, anon, authenticated;
