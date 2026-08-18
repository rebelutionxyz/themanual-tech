-- ROLLBACK for 20260818011500_db58_confirmed_holds_only_v1.sql
-- DB58, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: a ledger that counts pledges Stripe never confirmed.
-- give_campaigns.raised_cents goes back to including any row written at
-- PaymentIntent CREATION, so fund-live-test-20260817 returns to reading 1100
-- against a 1000 goal - GOAL MET on an intent with no payment method attached -
-- and fountain_begin_close can pass its all-or-nothing verdict on it and capture
-- the real cards of everyone who did pledge.
--
-- IT MOVES NO MONEY AND DELETES NO PLEDGE. Dropping authorized_at discards the
-- record of WHICH holds Stripe confirmed; that evidence remains recoverable from
-- stripe_events, which is append-only and untouched here.

-- 1. Counters back to the DB54 body (md5 afcc5b9191b297f5b6fe96e291f41f31, len 283).
CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
RETURNS TABLE (raised_cents bigint, captured_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status IN ('authorized','captured')), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id
     AND is_fixture = false;
$$;

-- 2. Stop stamping confirmations.
drop trigger if exists stripe_events_stamp_fund_authorization on public.stripe_events;
drop function if exists public.stripe_events_stamp_fund_authorization();

-- 3. Drop the column.
alter table public.fountain_pledges drop column if exists authorized_at;

-- 4. Recount every campaign so the stored counters match the restored definition.
DO $rb$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $rb$;
