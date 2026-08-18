-- ROLLBACK for 20260818032122_db66_raised_counts_captured_only_v1.sql
-- DB66, 2026-08-18. WRITTEN BEFORE THE FORWARD MIGRATION per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: the DB58 definition, in which raised_cents counts
-- CONFIRMED HOLDS as well as captured charges. On the record as it stands that
-- puts fund-live-test-20260817 back to raised_cents 2500 against captured_cents
-- 1300 - the 1200-cent difference being pi_3U5bdFAPNY1rgvEA1K64FsyO, a
-- manual-capture-era hold that nothing in the current flow can ever capture.
--
-- IT MOVES NO MONEY, DELETES NO PLEDGE, AND DROPS NOTHING. The only change is the
-- body of one STABLE function plus a recount of the stored counters derived from
-- it. authorized_at, the DB58 stamp trigger and every pledge row are untouched,
-- so the restored definition has all the evidence it needs the moment it is back.
--
-- Restores the body live at 2026-08-18 03:0x UTC, captured verbatim from
-- pg_get_functiondef(): md5 7dfce0fb928a800081ce809fed36a6f0, length 600 chars.
-- (That md5 is of the full CREATE statement pg_get_functiondef emits, not of this
-- file - the text below is the same body reformatted to house style, so verify a
-- rollback by BEHAVIOUR - raised 2500 on the live campaign - not by re-hashing.)

-- 1. Counters back to the DB58 body: raised = confirmed holds + captured.
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

comment on function public.fountain_counters(uuid) is null;

-- 2. Recount every campaign so the stored counters match the restored definition.
DO $rb$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $rb$;
