-- =============================================================================
-- Migration 20260515000300 — annual_unlock_check orchestrator
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/escrow-v1
-- Status:      UNAPPLIED. Apply after 20260515000100 + 20260515000200
--              (depends on retirement_escrow_unlock + emergency_fund_escrow_unlock).
-- Source:      ~/Documents/HONEYCOMB/escrow-mechanics-v1-spec.md §6.2 (annual
--              evaluation on escrow_anniversary_date) + §5.1/§5.2 (unlock
--              schedules: retirement year 6-15, emergency fund year 1-10).
--
-- Purpose:
--   CREATE FUNCTION annual_unlock_check() RETURNS INT — orchestrator intended
--   to run nightly via cron (or any external scheduler). Iterates all escrow
--   rows whose anniversary date is today (calendar month/day match on
--   created_at), evaluates the schedule + active-membership criteria, and
--   issues a 10% unlock chunk via the per-table unlock RPC when eligible.
--
-- Returns:    INT — count of unlocks successfully processed (retirement +
--             emergency_fund combined).
--
-- Design notes:
--   - Anniversary anchor = bling_retirement_escrows.created_at MM/DD (and
--     similarly for emergency fund). This is the v1 anchor; spec §6.2
--     describes annual evaluation per-Bee on the anniversary date but does
--     not lock the anchor source. created_at MM/DD is the simplest stable
--     anchor available without adding a separate anchor column.
--   - Schedule: retirement year_on_schedule >= 6 (cliff); emergency fund
--     year_on_schedule >= 1 (no cliff).
--   - Pooled-model 10% chunk = round(total_accrued * 0.10, 6). Caps at
--     remaining (total_accrued - total_unlocked) so the final partial
--     unlock can be less than 10% if the pool was top-up'd late.
--   - Per-row failure isolation: each PERFORM is wrapped in BEGIN/EXCEPTION
--     so an active-membership-failure or any other RAISE in one row does
--     NOT abort the batch. Errors are logged via RAISE NOTICE; batch
--     continues to next row. Caller sees the processed-count regardless.
--   - Idempotency in same calendar day: if the orchestrator runs twice on
--     the same day for the same Bee, the second call's retirement/emergency
--     unlock RPC re-applies the active-membership + ceiling checks; in
--     practice the same year_on_schedule * 10% chunk would be re-issued
--     (no de-dup logic at this layer — spec §6.2 assumes one cron run/day).
--     A future refinement is to add a "last_unlock_year_processed" column
--     on each escrow row to enforce one-per-year.
--   - SECURITY DEFINER + REVOKE EXECUTE FROM public/anon/authenticated.
--     Caller is the server-side cron (service-role JWT).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.annual_unlock_check()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today        DATE := current_date;
  v_current_year INT  := EXTRACT(YEAR  FROM v_today)::INT;
  v_today_month  INT  := EXTRACT(MONTH FROM v_today)::INT;
  v_today_day    INT  := EXTRACT(DAY   FROM v_today)::INT;
  v_rec_r        public.bling_retirement_escrows%ROWTYPE;
  v_rec_e        public.bling_emergency_fund_escrows%ROWTYPE;
  v_year         INT;
  v_unlock_amt   NUMERIC(20,6);
  v_processed    INT  := 0;
BEGIN
  -- ────────────────────────────────────────────────────────────────────
  -- Retirement: year_on_schedule >= 6, anniversary = created_at MM/DD
  -- ────────────────────────────────────────────────────────────────────
  FOR v_rec_r IN
    SELECT * FROM public.bling_retirement_escrows
     WHERE unlock_state NOT IN ('suspended','banned','deceased','fully_unlocked')
       AND first_active_year IS NOT NULL
       AND (first_active_year + 5) <= v_current_year   -- past cliff
       AND EXTRACT(MONTH FROM created_at)::INT = v_today_month
       AND EXTRACT(DAY   FROM created_at)::INT = v_today_day
       AND total_unlocked < total_accrued
  LOOP
    v_year := v_current_year - v_rec_r.first_active_year + 1;
    IF v_year < 6 THEN
      CONTINUE;
    END IF;

    -- 10% of total_accrued (pooled-model per spec §5.3), capped at remaining
    v_unlock_amt := round(v_rec_r.total_accrued * 0.10, 6);
    IF v_rec_r.total_unlocked + v_unlock_amt > v_rec_r.total_accrued THEN
      v_unlock_amt := v_rec_r.total_accrued - v_rec_r.total_unlocked;
    END IF;

    IF v_unlock_amt <= 0 THEN
      CONTINUE;
    END IF;

    -- Per-row error isolation
    BEGIN
      PERFORM public.retirement_escrow_unlock(v_rec_r.bee_id, v_unlock_amt);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'retirement unlock skipped for bee %: %', v_rec_r.bee_id, SQLERRM;
    END;
  END LOOP;

  -- ────────────────────────────────────────────────────────────────────
  -- Emergency Fund: year_on_schedule >= 1 (no cliff), anniversary = created_at MM/DD
  -- ────────────────────────────────────────────────────────────────────
  FOR v_rec_e IN
    SELECT * FROM public.bling_emergency_fund_escrows
     WHERE unlock_state NOT IN ('suspended','banned','deceased','fully_unlocked')
       AND first_accrual_year IS NOT NULL
       AND EXTRACT(MONTH FROM created_at)::INT = v_today_month
       AND EXTRACT(DAY   FROM created_at)::INT = v_today_day
       AND total_unlocked < total_accrued
  LOOP
    v_year := v_current_year - v_rec_e.first_accrual_year + 1;
    IF v_year < 1 THEN
      CONTINUE;
    END IF;

    v_unlock_amt := round(v_rec_e.total_accrued * 0.10, 6);
    IF v_rec_e.total_unlocked + v_unlock_amt > v_rec_e.total_accrued THEN
      v_unlock_amt := v_rec_e.total_accrued - v_rec_e.total_unlocked;
    END IF;

    IF v_unlock_amt <= 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      PERFORM public.emergency_fund_escrow_unlock(v_rec_e.bee_id, v_unlock_amt);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'emergency_fund unlock skipped for bee %: %', v_rec_e.bee_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$;

COMMENT ON FUNCTION public.annual_unlock_check() IS
  'Nightly cron orchestrator for retirement + emergency-fund escrow unlocks. '
  'Iterates all eligible escrow rows whose anniversary (created_at MM/DD) is '
  'today, evaluates schedule + active-membership criteria, and issues a 10% '
  'unlock chunk via the per-table unlock RPC. Per-row errors are isolated '
  '(BEGIN/EXCEPTION) so a single Bees failure does not abort the batch. '
  'Returns the count of unlocks processed. Spec: escrow-mechanics-v1.md §6.2.';

REVOKE EXECUTE ON FUNCTION public.annual_unlock_check() FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT to_regprocedure('public.annual_unlock_check()')) IS NOT NULL,
    'annual_unlock_check() function missing';

  -- Sibling dependencies must exist
  ASSERT (SELECT to_regprocedure('public.retirement_escrow_unlock(uuid,numeric)')) IS NOT NULL,
    'retirement_escrow_unlock missing — apply 20260515000100 first';
  ASSERT (SELECT to_regprocedure('public.emergency_fund_escrow_unlock(uuid,numeric)')) IS NOT NULL,
    'emergency_fund_escrow_unlock missing — apply 20260515000200 first';

  RAISE NOTICE 'Migration 20260515000300 OK: annual_unlock_check + sibling dependencies verified.';
END $$;

COMMIT;
