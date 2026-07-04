-- =============================================================================
-- Migration 20260515010000 — operations_funds table + 6-row genesis seed
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/operations-newbee-v1 (TheMANUAL.tech)
-- Status:      UNAPPLIED. Author commits; OG HUMAN applies via Studio MCP
--              after review. DO NOT auto-apply.
-- Source:      ~/Documents/HONEYCOMB/founding-allocation-v1-0.md (A4 v1.0)
--              §5 Operations 200B umbrella with 6 sub-funds:
--                Treasury 50B + Defense 100B + Campaign 35B + Promotions 10B
--                + NewBEE 2.5B + HoneyPOT 2.5B = 200,000,000,000 ✓
--              ~/Documents/HONEYCOMB/newbee-welcome-bonus-v1-spec.md §7.1
--              (operations_funds table shape — task brief is authoritative
--              source for column list used here).
-- Sibling:     20260515010100_bee_sponsorships.sql (Migration 2 — independent)
--              20260515010200_newbee_bonus.sql      (Migration 3 — depends
--                                                    on the 'newbee' row)
--
-- Purpose:
--   (a) CREATE TABLE operations_funds — singleton-style config table; one
--       row per Operations sub-fund. fund_name is the natural primary key.
--   (b) Seed 6 rows with genesis allocations per A4 v1.0 §5; both
--       genesis_balance and current_balance are initialized to the genesis
--       value (current = genesis at seed).
--
-- Design notes:
--   - NUMERIC(20,6) matches Lock 7 precision for BLiNG! amounts.
--   - current_balance is mutated by per-fund disbursement RPCs (e.g.,
--     issue_newbee_bonus in Migration 20260515010200 decrements 'newbee').
--     A per-event 89-weight replenishment channel (Defense / Treasury /
--     Campaign / Promotions) is pinned `#OPERATIONS-REPLENISHMENT-MAP`
--     and authored in a later session.
--   - RLS: service_role only. Operations fund balances are platform-state;
--     read access is via per-Astra dashboards which use service-role
--     queries server-side, not direct Bee queries. Public-read can be
--     added later via a follow-up migration if transparency reporting
--     wants it.
--   - CHECK constraint enforces non-negative balances and current <= genesis
--     (current should never EXCEED genesis without an explicit replenishment
--     event recorded elsewhere — at v1 there are no replenishment channels
--     wired, so current can only decrease from genesis).
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; INSERT ... ON CONFLICT DO NOTHING
--              (re-run won't duplicate the 6 seed rows).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- (a) operations_funds table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations_funds (
  fund_name             TEXT PRIMARY KEY,
  genesis_balance       NUMERIC(20,6) NOT NULL,
  current_balance       NUMERIC(20,6) NOT NULL,
  last_disbursement_at  TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT operations_funds_amounts_nonneg CHECK (
    genesis_balance >= 0 AND current_balance >= 0
  ),
  CONSTRAINT operations_funds_current_le_genesis CHECK (
    current_balance <= genesis_balance
  )
);

COMMENT ON TABLE public.operations_funds IS
  'Operations umbrella sub-fund balance cache (A4 v1.0 §5). One row per '
  'sub-fund (Treasury / Defense / Campaign / Promotions / NewBEE / HoneyPOT). '
  'genesis_balance is immutable post-seed; current_balance is decremented '
  'by disbursement RPCs. Per-event 89-weight replenishment channels deferred '
  '(#OPERATIONS-REPLENISHMENT-MAP).';

-- RLS: service_role only (v9 security posture)
ALTER TABLE public.operations_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operations_funds_service_all ON public.operations_funds;
CREATE POLICY operations_funds_service_all
  ON public.operations_funds
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- (b) Seed 6 rows per A4 v1.0 §5
--     Sum genesis = 50B + 100B + 35B + 10B + 2.5B + 2.5B = 200B ✓
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO public.operations_funds (fund_name, genesis_balance, current_balance) VALUES
  ('treasury',    50000000000,  50000000000),    -- 50B
  ('defense',    100000000000, 100000000000),    -- 100B
  ('campaign',    35000000000,  35000000000),    -- 35B
  ('promotions',  10000000000,  10000000000),    -- 10B
  ('newbee',       2500000000,   2500000000),    -- 2.5B (1M Bees × 2,500)
  ('honeypot',     2500000000,   2500000000)     -- 2.5B
ON CONFLICT (fund_name) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count        INT;
  v_sum_genesis  NUMERIC(20,6);
  v_sum_current  NUMERIC(20,6);
BEGIN
  -- Table exists
  ASSERT (SELECT to_regclass('public.operations_funds')) IS NOT NULL,
    'operations_funds table missing';

  -- Exactly 6 rows
  SELECT count(*) INTO v_count FROM public.operations_funds;
  ASSERT v_count = 6, format('operations_funds row count = %s (expected 6)', v_count);

  -- Sum of genesis_balance = 200,000,000,000 (200B)
  SELECT sum(genesis_balance) INTO v_sum_genesis FROM public.operations_funds;
  ASSERT v_sum_genesis = 200000000000::numeric,
    format('SUM(genesis_balance) = % (expected 200,000,000,000)', v_sum_genesis);

  -- current_balance = genesis_balance at seed
  SELECT sum(current_balance) INTO v_sum_current FROM public.operations_funds;
  ASSERT v_sum_current = 200000000000::numeric,
    format('SUM(current_balance) = % (expected 200,000,000,000 at seed)', v_sum_current);

  -- All 6 expected fund names present
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'treasury'   AND genesis_balance =  50000000000),
    'treasury row missing or wrong genesis';
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'defense'    AND genesis_balance = 100000000000),
    'defense row missing or wrong genesis';
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'campaign'   AND genesis_balance =  35000000000),
    'campaign row missing or wrong genesis';
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'promotions' AND genesis_balance =  10000000000),
    'promotions row missing or wrong genesis';
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'newbee'     AND genesis_balance =   2500000000),
    'newbee row missing or wrong genesis';
  ASSERT EXISTS (SELECT 1 FROM public.operations_funds WHERE fund_name = 'honeypot'   AND genesis_balance =   2500000000),
    'honeypot row missing or wrong genesis';

  ASSERT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.operations_funds'::regclass),
    'RLS not enabled on operations_funds';

  RAISE NOTICE 'Migration 20260515010000 OK: operations_funds 6-row seed (sum=200B) verified.';
END $$;

COMMIT;
