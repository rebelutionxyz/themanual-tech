-- =============================================================================
-- Migration 20260515000200 — bling_emergency_fund_escrows table + accrue/unlock
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/escrow-v1
-- Status:      UNAPPLIED. Apply after 20260515000100_escrow_retirement.sql
--              (depends on active_membership_check() defined there).
-- Source:      ~/Documents/HONEYCOMB/escrow-mechanics-v1-spec.md §3.1, §4
--              (emergency fund accrual via opt-in skim), §5.2 (10-year
--              schedule, no cliff), §6 (active membership — same helper),
--              §8 (emergency fund unlock = origin_restricted = TRUE,
--              single-hop restriction).
-- Sibling:     20260515000100_escrow_retirement.sql (Migration 2 — provides
--              active_membership_check()).
--              20260515000300_annual_unlock_check.sql (Migration 4 — calls
--              emergency_fund_escrow_unlock()).
--
-- Purpose:
--   (a) CREATE TABLE bling_emergency_fund_escrows per spec §3.1.
--   (b) CREATE FUNCTION emergency_fund_escrow_accrue(p_bee_id, p_amount,
--       p_source_event_id) — lazy-create cache row, update total_accrued,
--       append bling_transactions row (type=escrow_in, category=emergency_fund).
--   (c) CREATE FUNCTION emergency_fund_escrow_unlock(p_bee_id, p_unlock_amount)
--       — year >= 1 (no cliff per spec §5.2), active-membership gated,
--       credits main wallet, appends bling_transactions row with
--       origin_restricted=TRUE (single-hop per spec §8).
--
-- Design notes:
--   - opt_in_pct is the Bee-controlled skim rate (0-100, default 0). The
--     accrue RPC takes pre-computed amount (caller computes skim from
--     opt_in_pct on incoming flows); this RPC just records the accrual.
--   - first_accrual_year anchors the 10-year schedule (vs first_active_year
--     for retirement). Set on first accrual via INSERT.
--   - Unlock writes origin_restricted=TRUE — single-hop anti-farming guard.
--     The unlocked BLiNG! lands in main wallet but is un-sellable on order
--     book until the Bee transfers some out (first hop clears restriction
--     on the transferred amount only; remaining un-transferred portion
--     stays restricted until it too is transferred).
--   - Same SECURITY DEFINER + REVOKE EXECUTE posture as retirement RPCs.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- (a) bling_emergency_fund_escrows table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_emergency_fund_escrows (
  bee_id              UUID PRIMARY KEY REFERENCES public.bees(id) ON DELETE RESTRICT,
  opt_in_pct          NUMERIC(5,2) NOT NULL DEFAULT 0
                       CHECK (opt_in_pct >= 0 AND opt_in_pct <= 100),
  total_accrued       NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_unlocked      NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_forfeited     NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_disbursed     NUMERIC(20,6) NOT NULL DEFAULT 0,
  first_accrual_year  INT,
  last_active_year    INT,
  unlock_state        TEXT NOT NULL DEFAULT 'accruing'
                       CHECK (unlock_state IN (
                         'accruing','unlocking','fully_unlocked',
                         'suspended','banned','deceased'
                       )),
  suspended_at        TIMESTAMPTZ,
  banned_at           TIMESTAMPTZ,
  final_waggle_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bling_emergency_fund_escrows_amounts_nonneg CHECK (
    total_accrued    >= 0 AND
    total_unlocked   >= 0 AND
    total_forfeited  >= 0 AND
    total_disbursed  >= 0
  ),
  CONSTRAINT bling_emergency_fund_escrows_unlocked_le_accrued CHECK (
    total_unlocked + total_forfeited <= total_accrued
  )
);

COMMENT ON TABLE public.bling_emergency_fund_escrows IS
  'Per-Bee emergency fund escrow cache. Source-of-truth ledger is '
  'bling_transactions (type=escrow_in/escrow_unlock, category=emergency_fund). '
  'Row created lazily on first accrual via emergency_fund_escrow_accrue(). '
  'opt_in_pct is Bee-controlled skim rate (0-100). Unlock schedule: 10%/yr '
  'years 1-10 (no cliff). Spec: escrow-mechanics-v1.md §3.1 + §5.2.';

CREATE INDEX IF NOT EXISTS bling_emergency_fund_escrows_unlock_state_idx
  ON public.bling_emergency_fund_escrows(unlock_state)
  WHERE unlock_state NOT IN ('fully_unlocked','banned','deceased');

-- RLS — Bee-self-read + service_role full access
ALTER TABLE public.bling_emergency_fund_escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bling_emergency_fund_escrows_self_select ON public.bling_emergency_fund_escrows;
CREATE POLICY bling_emergency_fund_escrows_self_select
  ON public.bling_emergency_fund_escrows
  FOR SELECT
  USING (bee_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS bling_emergency_fund_escrows_service_write ON public.bling_emergency_fund_escrows;
CREATE POLICY bling_emergency_fund_escrows_service_write
  ON public.bling_emergency_fund_escrows
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- (b) emergency_fund_escrow_accrue
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.emergency_fund_escrow_accrue(
  p_bee_id           UUID,
  p_amount           NUMERIC,
  p_source_event_id  UUID DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tx_id          BIGINT;
  v_balance_after  NUMERIC(20,6);
  v_current_year   INT := EXTRACT(YEAR FROM now())::INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0 (got %)', p_amount;
  END IF;

  -- Lazy-create or update cache row
  INSERT INTO public.bling_emergency_fund_escrows AS r (
    bee_id, total_accrued, first_accrual_year, last_active_year
  ) VALUES (
    p_bee_id, p_amount, v_current_year, v_current_year
  )
  ON CONFLICT (bee_id) DO UPDATE
    SET total_accrued      = r.total_accrued + EXCLUDED.total_accrued,
        first_accrual_year = COALESCE(r.first_accrual_year, EXCLUDED.first_accrual_year),
        updated_at         = now();

  -- balance_after = current main wallet balance (escrow accrual is
  -- ledger-only; main bling_balance unchanged on accrual).
  SELECT bling_balance INTO v_balance_after
    FROM public.bees WHERE id = p_bee_id;

  IF v_balance_after IS NULL THEN
    RAISE EXCEPTION 'no bees row for %', p_bee_id;
  END IF;

  INSERT INTO public.bling_transactions (
    bee_id, type, amount, balance_after, currency_type,
    category, memo, origin_restricted
  ) VALUES (
    p_bee_id, 'escrow_in', p_amount, v_balance_after, 'BLiNG',
    'emergency_fund',
    CASE WHEN p_source_event_id IS NOT NULL
         THEN 'source_event=' || p_source_event_id::text
         ELSE NULL
    END,
    FALSE
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

COMMENT ON FUNCTION public.emergency_fund_escrow_accrue(uuid, numeric, uuid) IS
  'Accrue BLiNG! to a Bee emergency fund escrow. Lazy-creates row, updates '
  'total_accrued, appends bling_transactions (type=escrow_in, category= '
  'emergency_fund). Caller is responsible for computing the opt_in_pct skim '
  'from incoming BLiNG! flows and invoking this RPC with the skim amount. '
  'Spec: escrow-mechanics-v1.md §4 (emergency fund accrual).';

REVOKE EXECUTE ON FUNCTION public.emergency_fund_escrow_accrue(uuid, numeric, uuid) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- (c) emergency_fund_escrow_unlock
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.emergency_fund_escrow_unlock(
  p_bee_id        UUID,
  p_unlock_amount NUMERIC
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_escrow            public.bling_emergency_fund_escrows%ROWTYPE;
  v_current_year      INT := EXTRACT(YEAR FROM now())::INT;
  v_year_on_schedule  INT;
  v_active            BOOLEAN;
  v_tx_id             BIGINT;
  v_new_balance       NUMERIC(20,6);
BEGIN
  IF p_unlock_amount IS NULL OR p_unlock_amount <= 0 THEN
    RAISE EXCEPTION 'unlock amount must be > 0 (got %)', p_unlock_amount;
  END IF;

  SELECT * INTO v_escrow
    FROM public.bling_emergency_fund_escrows
   WHERE bee_id = p_bee_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no emergency fund escrow row for bee %', p_bee_id;
  END IF;

  IF v_escrow.unlock_state IN ('suspended','banned','deceased') THEN
    RAISE EXCEPTION 'emergency fund escrow state=% — unlock not permitted', v_escrow.unlock_state;
  END IF;

  IF v_escrow.first_accrual_year IS NULL THEN
    RAISE EXCEPTION 'first_accrual_year not set on emergency fund escrow for bee %', p_bee_id;
  END IF;

  -- No cliff. Unlock starts year 1.
  v_year_on_schedule := v_current_year - v_escrow.first_accrual_year + 1;
  IF v_year_on_schedule < 1 THEN
    RAISE EXCEPTION 'invalid year_on_schedule % for emergency fund unlock', v_year_on_schedule;
  END IF;

  -- Don't unlock past the accrued ceiling
  IF v_escrow.total_unlocked + p_unlock_amount > v_escrow.total_accrued THEN
    RAISE EXCEPTION 'unlock would exceed total_accrued (% + % > %)',
      v_escrow.total_unlocked, p_unlock_amount, v_escrow.total_accrued;
  END IF;

  -- Active membership check (same helper as retirement)
  v_active := public.active_membership_check(p_bee_id, 365);
  IF NOT v_active THEN
    RAISE EXCEPTION 'bee % not active in past 365 days; emergency fund unlock delayed (spec §6.1)',
      p_bee_id;
  END IF;

  -- Update cache row
  UPDATE public.bling_emergency_fund_escrows
    SET total_unlocked   = total_unlocked + p_unlock_amount,
        last_active_year = v_current_year,
        unlock_state     = CASE
          WHEN total_unlocked + p_unlock_amount >= total_accrued THEN 'fully_unlocked'
          ELSE 'unlocking'
        END,
        updated_at       = now()
    WHERE bee_id = p_bee_id;

  -- Credit main wallet
  UPDATE public.bees
    SET bling_balance = bling_balance + p_unlock_amount,
        updated_at    = now()
   WHERE id = p_bee_id
  RETURNING bling_balance INTO v_new_balance;

  -- Ledger row — emergency fund unlocks are SINGLE-HOP RESTRICTED per spec §8
  INSERT INTO public.bling_transactions (
    bee_id, type, amount, balance_after, currency_type,
    category, origin_restricted
  ) VALUES (
    p_bee_id, 'escrow_unlock', p_unlock_amount, v_new_balance, 'BLiNG',
    'emergency_fund', TRUE                                  -- single-hop
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

COMMENT ON FUNCTION public.emergency_fund_escrow_unlock(uuid, numeric) IS
  'Unlock a chunk of emergency fund escrow to Bee main wallet. NO cliff '
  '(year >= 1), active membership criterion gates, accrued ceiling enforced. '
  'Credits bling_balance and appends bling_transactions (type=escrow_unlock, '
  'category=emergency_fund, origin_restricted=TRUE — single-hop restriction '
  'per spec §8: restriction clears on first transfer out of receiving wallet). '
  'Spec: escrow-mechanics-v1.md §5.2 + §8.';

REVOKE EXECUTE ON FUNCTION public.emergency_fund_escrow_unlock(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT to_regclass('public.bling_emergency_fund_escrows')) IS NOT NULL,
    'bling_emergency_fund_escrows table missing';

  ASSERT (SELECT to_regprocedure('public.emergency_fund_escrow_accrue(uuid,numeric,uuid)')) IS NOT NULL,
    'emergency_fund_escrow_accrue function missing';

  ASSERT (SELECT to_regprocedure('public.emergency_fund_escrow_unlock(uuid,numeric)')) IS NOT NULL,
    'emergency_fund_escrow_unlock function missing';

  -- Sibling helper must already exist (from migration 20260515000100)
  ASSERT (SELECT to_regprocedure('public.active_membership_check(uuid,integer)')) IS NOT NULL,
    'active_membership_check helper missing — apply 20260515000100 first';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename  = 'bling_emergency_fund_escrows'
       AND indexname  = 'bling_emergency_fund_escrows_unlock_state_idx'
  ), 'bling_emergency_fund_escrows_unlock_state_idx index missing';

  ASSERT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.bling_emergency_fund_escrows'::regclass),
    'RLS not enabled on bling_emergency_fund_escrows';

  RAISE NOTICE 'Migration 20260515000200 OK: emergency fund table + 2 functions + RLS verified.';
END $$;

COMMIT;
