-- ROLLBACK for 20260817190000_db50_fund_fee_activate_v1.sql
-- DB50, 2026-08-17. WRITTEN BEFORE THE FORWARD MIGRATION, per the MIGRATION
-- AMENDMENT (root CLAUDE.md R7).
--
-- WHAT RUNNING THIS RESTORES: fee_schedule.fee_key='give' goes back to
-- active=false, and its note back to "Dormant until payout rails". Because
-- fee_resolve() filters on `fs.active`, an inactive row resolves to NULL, and
-- fountain v15 treats NULL as "no platform fee" and omits application_fee_amount
-- from the PaymentIntent entirely. So this one row IS the kill switch: flipping
-- it off stops the fee being charged WITHOUT redeploying the function.
--
-- IT MOVES NO MONEY AND TOUCHES NO PLEDGE. fee_schedule is configuration.
--
-- THE OTHER HALF OF THE ROLLBACK IS NOT SQL. Reverting the function to v14 is a
-- redeploy, not a statement:
--   git revert the fountain/index.ts change, then redeploy under a named deploy
--   dispatch (DEPLOY AMENDMENT), and confirm the deployed version incremented and
--   the bundle hash matches, recording both in REPORT.md.
-- Order matters if both halves are being run: FLIP THE ROW OFF FIRST. With the
-- row inactive the deployed v15 already charges nothing, so the redeploy stops
-- being urgent. Doing it the other way round leaves a live fee row against a
-- function that ignores it — the exact silent lie the dispatch forbids in the
-- forward direction.

BEGIN;

UPDATE public.fee_schedule
   SET active = false,
       note = 'Crowdfunding / The Fountain. Dormant until payout rails.',
       updated_at = now()
 WHERE fee_key = 'give' AND astra_ref IS NULL AND bee_ref IS NULL;

DO $$
DECLARE v_active boolean;
BEGIN
  SELECT active INTO v_active FROM public.fee_schedule
   WHERE fee_key = 'give' AND astra_ref IS NULL AND bee_ref IS NULL;
  IF v_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'DB50 rollback did not deactivate the give fee row (active=%)', v_active;
  END IF;
END $$;

COMMIT;
