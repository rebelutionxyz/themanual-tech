-- ROLLBACK for 20260818020000_db62_stamp_on_succeeded_v1.sql
-- DB62, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: a stamp that fires ONLY on
-- payment_intent.amount_capturable_updated. That is harmless while the fountain
-- still holds (manual capture), because that is the event Stripe sends. It becomes
-- dangerous the moment DB63 flips capture_method to 'automatic': the event never
-- fires again, authorized_at is never stamped, and a charged pledge counts as
-- nothing until fountain_pledge_captured happens to run.
--
-- SO: DO NOT RUN THIS AFTER DB63 HAS LANDED. Run it only to undo DB62 while the
-- fountain is still on manual capture.
--
-- IT WRITES NO ROW. authorized_at values already stamped stay exactly as they are;
-- this only changes which future events cause a stamp.

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
