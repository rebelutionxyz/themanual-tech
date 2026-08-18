-- DB66 — raised_cents COUNTS ONLY MONEY THAT MOVED (2026-08-18)
-- ROLLBACK: _drafts/20260818031500_db66_raised_counts_captured_only_v1_rollback.sql
--
-- LEAD RULING on DB64 Defect A, accepted in full: under charge-on-pledge,
-- raised_cents counts only `captured`. It becomes identical to captured_cents.
--
-- THE FOURTH VARIANT OF ONE DEFECT, and the one the flip to automatic capture
-- created. DB48 stopped the ledger counting money that EVAPORATED. DB54 stopped
-- it counting money that NEVER EXISTED. DB58 stopped it counting money that NEVER
-- ARRIVED. This stops it counting money that CAN NO LONGER ARRIVE.
--
-- WHY THE DB58 DISTINCTION STOPPED PAYING FOR ITSELF. DB61 argued for keeping
-- raised and captured separate because they diverge legitimately between the
-- charge and the webhook. DB64 then MEASURED that window on the first real
-- charge: authorized_at 02:34:58.076, captured_at 02:34:58.618 — 0.54 seconds.
-- Meanwhile the only row where the two actually differ today is
-- pi_3U5bdFAPNY1rgvEA1K64FsyO, a 1200-cent hold confirmed at 01:16:32 under
-- MANUAL capture, which nothing in the current flow will ever capture — the
-- fountain now creates intents with capture_method 'automatic' (DB63) and no
-- close loop reaches back for an old hold. So the "nuance" is 0.54 seconds of
-- honesty bought at the price of a permanent 1200-cent overstatement.
--
-- Under charge-on-pledge money either moved or it did not. There is no third
-- state worth showing a giver.
--
-- MEASURED BEFORE (2026-08-18 03:0x UTC):
--   fund-live-test-20260817   raised 2500   captured 1300   <- the 2500 is 1300 + 1200
--   bee-sanctuary  (fixture)  raised    0   captured    0
--   community-mural(fixture)  raised    0   captured    0
--   fund-the-fountain(fixture)raised    0   captured    0
-- EXPECTED AFTER:
--   fund-live-test-20260817   raised 1300   captured 1300   <- the one real charge
--   all three fixtures        raised    0   captured    0   <- DB54 exclusion intact
--
-- BOTH COLUMNS ARE KEPT. They cost nothing, the FUND app renders both today
-- (LedgerStrip, PledgePanel), and retiring one is front work with no ledger
-- benefit. From here they simply carry the same number. The copy that explains a
-- difference between them is now wrong and belongs to FRONT64's sweep, not here.
--
-- WHAT THIS DOES **NOT** DO: the 1200-cent hold still EXISTS at Stripe and still
-- expires in about seven days. Removing it from the total is correct — it is
-- money that will never reach the campaign — but it is not the same as disposing
-- of it. DB67 owns that.

-- ---------------------------------------------------------------- the counters

-- One filter changes: raised now reads status = 'captured', exactly as captured
-- does. Everything else is unchanged from DB58 — fixtures still excluded by
-- is_fixture, and the authorized_at evidence stays on the table and stays
-- stamped, so the DB58 definition is a CREATE OR REPLACE away if this is wrong.
CREATE OR REPLACE FUNCTION public.fountain_counters(p_campaign_id uuid)
RETURNS TABLE (raised_cents bigint, captured_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
  SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint,
         coalesce(sum(amount_cents) FILTER (WHERE status = 'captured'), 0)::bigint
    FROM public.fountain_pledges
   WHERE campaign_id = p_campaign_id
     AND is_fixture = false;
$$;

comment on function public.fountain_counters(uuid) is
  'Derived ledger for a campaign. Under charge-on-pledge (DB63) BOTH columns count '
  'only status = ''captured'': money either moved or it did not. Fixture pledges are '
  'excluded (DB54). authorized_at is still stamped (DB58) and still available if the '
  'two figures ever need to diverge again. DB66.';

-- Recount every campaign so the stored counters match the new definition. Fixture
-- campaigns are included deliberately: their pledges are excluded inside
-- fountain_counters, so a recount holds them at 0/0 rather than skipping them.
DO $db66$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.give_campaigns LOOP
    PERFORM public.fountain_recount(r.id);
  END LOOP;
END $db66$;

-- ---------------------------------------------------------------- the done-test

-- Asserts the INVARIANT rather than today's numbers, so this migration cannot
-- pass by accident and cannot fail merely because another pledge landed between
-- authoring and apply. Fails the whole migration if either half is wrong.
DO $db66_test$
DECLARE v_bad int; v_fixture_bad int;
BEGIN
  SELECT count(*) INTO v_bad
    FROM public.give_campaigns WHERE raised_cents IS DISTINCT FROM captured_cents;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'DB66: % campaign(s) still have raised_cents <> captured_cents after recount', v_bad;
  END IF;

  SELECT count(*) INTO v_fixture_bad
    FROM public.give_campaigns
   WHERE is_fixture = true AND (raised_cents <> 0 OR captured_cents <> 0);
  IF v_fixture_bad > 0 THEN
    RAISE EXCEPTION 'DB66: DB54 fixture exclusion broken — % fixture campaign(s) carry a non-zero counter', v_fixture_bad;
  END IF;
END $db66_test$;
