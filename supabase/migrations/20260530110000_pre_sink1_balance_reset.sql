-- =====================================================================
-- 20260530110000 — Pre-Sink-1 bee balance reset
-- =====================================================================
-- Author:  Code (Claude Opus 4.8) — supervised by Butch (OG HUMAN)
-- Source:  Wave 1 redesign May 30 — Step 4 lock (Option A: Reset).
--
-- All existing bees.bling_balance values reset to 0 before The Source
-- pool is seeded. This establishes the closed-loop conservation invariant
-- from a clean state. Pre-existing balances were development/test data
-- (confirmed by Butch); resetting destroys nothing of real economic
-- significance.
-- =====================================================================

BEGIN;

-- Pre-reset accounting (logs for the record)
DO $$
DECLARE
  v_total numeric;
  v_count integer;
BEGIN
  SELECT count(*), coalesce(sum(bling_balance), 0)
    INTO v_count, v_total
    FROM bees;
  RAISE NOTICE 'Pre-reset: % bees, total bling_balance = %', v_count, v_total;
END $$;

-- Reset all balances to 0
UPDATE bees SET bling_balance = 0;

-- Post-reset verification
DO $$
DECLARE
  v_remaining numeric;
BEGIN
  SELECT coalesce(sum(bling_balance), 0) INTO v_remaining FROM bees;
  IF v_remaining != 0 THEN
    RAISE EXCEPTION 'Reset failed: sum of bee balances is %, expected 0', v_remaining;
  END IF;
  RAISE NOTICE 'Reset complete: all bee balances = 0';
END $$;

COMMIT;
