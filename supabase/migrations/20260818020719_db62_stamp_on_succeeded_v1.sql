-- DB62 — STAMP authorized_at ON payment_intent.succeeded TOO (2026-08-18)
-- ROLLBACK: _drafts/20260818020000_db62_stamp_on_succeeded_v1_rollback.sql
--
-- ATOMIC 1 OF 3. Order is not negotiable: DB62 (this), then DB63 (the fountain
-- flips capture_method to 'automatic'), then FRONT64 (the copy).
--
-- WHY THIS ONE GOES FIRST. Under automatic capture Stripe never sends
-- payment_intent.amount_capturable_updated again — there is no separate
-- authorization step to report. DB58's stamp listens for exactly that event and
-- nothing else, so on the day the fountain flips it would stop stamping, and a
-- pledge whose card had genuinely been charged would carry authorized_at NULL.
--
-- WHAT THAT WOULD AND WOULD NOT COST, stated precisely because the lead and DB61
-- disagreed about it and DB61 was right: the ledger does NOT silently zero
-- forever. fountain_counters carries `OR status = 'captured'`, so once
-- give-webhook routes payment_intent.succeeded into fountain_pledge_captured the
-- row flips to 'captured' and counts again. The exposure is narrower and sharper
-- than "everything reads zero":
--   * a WINDOW between the charge and the webhook where the money has actually
--     left the giver's card and the campaign total shows nothing — every earlier
--     defect on this astra had the ledger OVERSTATING; this is the first that
--     makes it UNDERSTATE over money already spent;
--   * a PERMANENT zero for any pledge whose succeeded event never lands, while
--     the money sits in the manager's account.
-- Relying on the OR clause alone is therefore not enough: it is correct only
-- after the RPC runs, whereas the stamp is correct the moment Stripe's event
-- arrives.
--
-- THE COLUMN KEEPS ONE MEANING under either capture mode: STRIPE SAYS THIS MONEY
-- IS REAL. Today that is a confirmed hold; after DB63 it is a completed charge.
-- Both are the same claim about the same thing, which is why one column and one
-- stamp can carry both rather than needing a second concept.
--
-- LANDING THIS EARLY IS HARMLESS. While the fountain still holds, Stripe sends
-- amount_capturable_updated and not succeeded for a pledge, so the added
-- condition simply never fires. Nothing about today's behaviour changes.
--
-- DB-ONLY. No deploy. give-webhook already writes every verified fund event into
-- stripe_events before it branches, so both event types are already arriving in
-- the table this trigger watches.

CREATE OR REPLACE FUNCTION public.stripe_events_stamp_fund_authorization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_pi text;
BEGIN
  -- coalesce, not a bare NOT IN: event_type is nullable, and `NULL NOT IN (...)`
  -- evaluates to NULL, which would fall THROUGH this guard and stamp on an event
  -- with no type at all. The empty string matches neither name. (The DB58 body
  -- used IS DISTINCT FROM, which was already null-safe; this coalesce protects
  -- the NEW two-value construct, it does not fix an old defect.)
  IF NEW.product_type IS DISTINCT FROM 'fund'
     OR coalesce(NEW.event_type, '') NOT IN (
          'payment_intent.amount_capturable_updated',  -- manual capture: a hold exists
          'payment_intent.succeeded'                   -- automatic capture: the charge landed
        ) THEN
    RETURN NULL;
  END IF;

  v_pi := NEW.payload->'data'->'object'->>'id';
  IF v_pi IS NULL THEN RETURN NULL; END IF;

  -- coalesce keeps the FIRST confirmation: Stripe can resend, and the earliest
  -- moment the money was known to be real is the honest timestamp. The
  -- `authorized_at IS NULL` predicate means a later succeeded event never
  -- overwrites the earlier amount_capturable_updated one on a held pledge that
  -- is subsequently captured.
  UPDATE public.fountain_pledges
     SET authorized_at = coalesce(authorized_at, NEW.created_at, now())
   WHERE stripe_payment_intent_id = v_pi
     AND authorized_at IS NULL;

  RETURN NULL;
END; $$;

COMMENT ON FUNCTION public.stripe_events_stamp_fund_authorization() IS
  'Stamps fountain_pledges.authorized_at from a verified Stripe event. Fires on '
  'amount_capturable_updated (manual capture, a hold exists) and on succeeded '
  '(automatic capture, the charge landed). One meaning: Stripe says this money is '
  'real. DB58 created it, DB62 broadened it ahead of the capture_method flip.';
