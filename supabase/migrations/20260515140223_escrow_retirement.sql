-- =============================================================================
-- Migration 20260515000100 — bling_retirement_escrows table + accrue/unlock RPCs
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/escrow-v1
-- Status:      UNAPPLIED. Apply after 20260515000000_origin_restricted.sql.
-- Source:      ~/Documents/HONEYCOMB/escrow-mechanics-v1-spec.md §3.1, §4
--              (retirement accrual), §5.1 (15-year unlock schedule),
--              §6 (active membership criteria), §8 (sellability — retirement
--              unlocked = fully sellable / origin_restricted = FALSE).
-- Sibling:     20260515000200_escrow_emergency_fund.sql (Migration 3) — depends
--              on active_membership_check() defined here.
--              20260515000300_annual_unlock_check.sql (Migration 4) — depends
--              on retirement_escrow_unlock() defined here.
--
-- Purpose:
--   (a) CREATE TABLE bling_retirement_escrows per spec §3.1.
--   (b) CREATE FUNCTION active_membership_check(p_bee_id, p_lookback_days)
--       — shared helper for retirement + emergency_fund unlocks (spec §6).
--   (c) CREATE FUNCTION retirement_escrow_accrue(p_bee_id, p_amount,
--       p_source_event_id) — lazy-create cache row, update total_accrued,
--       append bling_transactions row with type='escrow_in', category='retirement'.
--   (d) CREATE FUNCTION retirement_escrow_unlock(p_bee_id, p_unlock_amount)
--       — cliff + active-membership gated; credits main wallet; appends
--       bling_transactions row with type='escrow_unlock' / origin_restricted=FALSE
--       (retirement unlocks are fully sellable per spec §8).
--
-- Design notes:
--   - bee_id is PK of the escrow table (one row per Bee). `bling_transactions.bee_id`
--     establishes the implicit FK to the escrow row (not via `ref_escrow_id`,
--     which is bigint and reserved for the existing `bling_escrows` table).
--   - balance_after on accrual ledger rows = the Bee's CURRENT bling_balance
--     (escrow accrual does NOT change main wallet balance; balance_after is
--     unchanged from the prior tx). The ledger row records the accrual to the
--     escrow surface, not a debit/credit on the main balance.
--   - balance_after on unlock ledger rows = new main wallet balance (unlock
--     DOES credit main wallet).
--   - active_membership_check v1 implements ONLY the revenue-events criterion
--     (>=10 events / past 365 days). Drops criterion + login-days criterion
--     are deferred per spec §6 calibration note (drops table + login-day
--     tracker not yet in v1 schema). OR semantics: meeting any one criterion
--     qualifies; v1 ships with the implementable signal.
--   - Permission: SECURITY DEFINER + REVOKE EXECUTE FROM public/anon/authenticated.
--     Callers are server-side only (cron job via annual_unlock_check + admin
--     tooling). v9 security posture.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
--              CREATE INDEX IF NOT EXISTS, CREATE POLICY guarded by DROP-first.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- (a) bling_retirement_escrows table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_retirement_escrows (
  bee_id                 UUID PRIMARY KEY REFERENCES public.bees(id) ON DELETE RESTRICT,
  total_accrued          NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_unlocked         NUMERIC(20,6) NOT NULL DEFAULT 0,
  total_forfeited        NUMERIC(20,6) NOT NULL DEFAULT 0,    -- to Honeypot on lifetime ban
  total_disbursed        NUMERIC(20,6) NOT NULL DEFAULT 0,    -- transferred out
  first_active_year      INT,                                  -- spec §5.1 anchor
  last_active_year       INT,
  unlock_state           TEXT NOT NULL DEFAULT 'accruing'
                         CHECK (unlock_state IN (
                           'accruing','cliff_eligible','unlocking',
                           'fully_unlocked','suspended','banned','deceased'
                         )),
  suspended_at           TIMESTAMPTZ,
  banned_at              TIMESTAMPTZ,
  final_waggle_at        TIMESTAMPTZ,
  succession_declaration JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bling_retirement_escrows_amounts_nonneg CHECK (
    total_accrued    >= 0 AND
    total_unlocked   >= 0 AND
    total_forfeited  >= 0 AND
    total_disbursed  >= 0
  ),
  CONSTRAINT bling_retirement_escrows_unlocked_le_accrued CHECK (
    total_unlocked + total_forfeited <= total_accrued
  )
);

COMMENT ON TABLE public.bling_retirement_escrows IS
  'Per-Bee retirement escrow cache. Source-of-truth ledger is bling_transactions '
  '(type=escrow_in/escrow_unlock, category=retirement). Row created lazily on '
  'first accrual via retirement_escrow_accrue(). Spec: escrow-mechanics-v1.md §3.1.';

CREATE INDEX IF NOT EXISTS bling_retirement_escrows_unlock_state_idx
  ON public.bling_retirement_escrows(unlock_state)
  WHERE unlock_state NOT IN ('fully_unlocked','banned','deceased');

-- RLS — Bee-self-read + service_role full access (v9 security posture)
ALTER TABLE public.bling_retirement_escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bling_retirement_escrows_self_select ON public.bling_retirement_escrows;
CREATE POLICY bling_retirement_escrows_self_select
  ON public.bling_retirement_escrows
  FOR SELECT
  USING (bee_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS bling_retirement_escrows_service_write ON public.bling_retirement_escrows;
CREATE POLICY bling_retirement_escrows_service_write
  ON public.bling_retirement_escrows
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ───────────────────────────────────────────────────────────────────────
-- (b) active_membership_check helper — shared by retirement + emergency_fund
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.active_membership_check(
  p_bee_id        UUID,
  p_lookback_days INT DEFAULT 365
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_since         TIMESTAMPTZ;
  v_events_count  INT;
BEGIN
  -- v1 implementable signal: >=10 revenue events / past 365 days
  -- (per spec §6 — Drops + login-days criteria deferred until those signal
  -- tables land; spec §6 calibration note authorizes any-one OR semantics).
  v_since := now() - make_interval(days => p_lookback_days);

  SELECT count(*) INTO v_events_count
    FROM public.bling_transactions
   WHERE bee_id = p_bee_id
     AND created_at >= v_since
     AND type IN (
       'send_debit','send_credit',
       'order_fill_debit','order_fill_credit',
       'order_reserve','order_cancel_refund','order_donation',
       'escrow_hold','escrow_release','escrow_cancel','escrow_dispute',
       'stripe_credit','chargeback','free'
     );

  IF v_events_count >= 10 THEN
    RETURN TRUE;
  END IF;

  -- Drops + login-days criteria deferred. Returning FALSE if revenue-events
  -- criterion unmet. Spec §6.1 dormant-year handling lets the unlock retry
  -- in any future qualifying year (delayed unlock, not forfeit).
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.active_membership_check(uuid, int) IS
  'v1 active-membership check per escrow-mechanics-v1 §6. Implements the '
  'revenue-events criterion only (>=10 events / lookback window). Drops + '
  'login-days criteria deferred until drops table + login-day tracker land. '
  'Used by retirement_escrow_unlock and emergency_fund_escrow_unlock.';

REVOKE EXECUTE ON FUNCTION public.active_membership_check(uuid, int) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- (c) retirement_escrow_accrue
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.retirement_escrow_accrue(
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
  INSERT INTO public.bling_retirement_escrows AS r (
    bee_id, total_accrued, first_active_year, last_active_year
  ) VALUES (
    p_bee_id, p_amount, v_current_year, v_current_year
  )
  ON CONFLICT (bee_id) DO UPDATE
    SET total_accrued     = r.total_accrued + EXCLUDED.total_accrued,
        first_active_year = COALESCE(r.first_active_year, EXCLUDED.first_active_year),
        updated_at        = now();

  -- balance_after = current main wallet balance (escrow accrual does not
  -- modify bling_balance; the ledger row records accrual to the escrow surface).
  SELECT bling_balance INTO v_balance_after
    FROM public.bees WHERE id = p_bee_id;

  IF v_balance_after IS NULL THEN
    RAISE EXCEPTION 'no bees row for %', p_bee_id;
  END IF;

  -- Append ledger row
  INSERT INTO public.bling_transactions (
    bee_id, type, amount, balance_after, currency_type,
    category, memo, origin_restricted
  ) VALUES (
    p_bee_id, 'escrow_in', p_amount, v_balance_after, 'BLiNG',
    'retirement',
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

COMMENT ON FUNCTION public.retirement_escrow_accrue(uuid, numeric, uuid) IS
  'Accrue BLiNG! to a Bee retirement escrow. Lazy-creates row, updates '
  'total_accrued, appends bling_transactions ledger row (type=escrow_in, '
  'category=retirement). Caller is the 89-weight Original-Sourcer routing '
  '(2-weight slot per A1 v1.1 §3). Spec: escrow-mechanics-v1.md §4.';

REVOKE EXECUTE ON FUNCTION public.retirement_escrow_accrue(uuid, numeric, uuid) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- (d) retirement_escrow_unlock
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.retirement_escrow_unlock(
  p_bee_id        UUID,
  p_unlock_amount NUMERIC
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_escrow            public.bling_retirement_escrows%ROWTYPE;
  v_current_year      INT := EXTRACT(YEAR FROM now())::INT;
  v_year_on_schedule  INT;
  v_active            BOOLEAN;
  v_tx_id             BIGINT;
  v_new_balance       NUMERIC(20,6);
BEGIN
  IF p_unlock_amount IS NULL OR p_unlock_amount <= 0 THEN
    RAISE EXCEPTION 'unlock amount must be > 0 (got %)', p_unlock_amount;
  END IF;

  -- Row-lock the escrow row to prevent concurrent double-unlock
  SELECT * INTO v_escrow
    FROM public.bling_retirement_escrows
   WHERE bee_id = p_bee_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no retirement escrow row for bee %', p_bee_id;
  END IF;

  IF v_escrow.unlock_state IN ('suspended','banned','deceased') THEN
    RAISE EXCEPTION 'retirement escrow state=% — unlock not permitted', v_escrow.unlock_state;
  END IF;

  IF v_escrow.first_active_year IS NULL THEN
    RAISE EXCEPTION 'first_active_year not set on retirement escrow for bee %', p_bee_id;
  END IF;

  -- Cliff: first 5 years are accrual-only. Unlock starts year 6.
  v_year_on_schedule := v_current_year - v_escrow.first_active_year + 1;
  IF v_year_on_schedule < 6 THEN
    RAISE EXCEPTION 'retirement cliff not passed (year % of schedule; need >= 6 per spec §5.1)',
      v_year_on_schedule;
  END IF;

  -- Don't unlock past the accrued ceiling
  IF v_escrow.total_unlocked + p_unlock_amount > v_escrow.total_accrued THEN
    RAISE EXCEPTION 'unlock would exceed total_accrued (% + % > %)',
      v_escrow.total_unlocked, p_unlock_amount, v_escrow.total_accrued;
  END IF;

  -- Active membership check (spec §6.1 — dormant year delays unlock, not forfeit)
  v_active := public.active_membership_check(p_bee_id, 365);
  IF NOT v_active THEN
    RAISE EXCEPTION 'bee % not active in past 365 days; retirement unlock delayed (spec §6.1)',
      p_bee_id;
  END IF;

  -- Update cache row
  UPDATE public.bling_retirement_escrows
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

  -- Ledger row — retirement unlocks are fully sellable per spec §8
  INSERT INTO public.bling_transactions (
    bee_id, type, amount, balance_after, currency_type,
    category, origin_restricted
  ) VALUES (
    p_bee_id, 'escrow_unlock', p_unlock_amount, v_new_balance, 'BLiNG',
    'retirement', FALSE
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

COMMENT ON FUNCTION public.retirement_escrow_unlock(uuid, numeric) IS
  'Unlock a chunk of retirement escrow to Bee main wallet. Enforces 5-year '
  'cliff (year_on_schedule >= 6) + active membership criterion + accrued '
  'ceiling. Credits bling_balance, appends bling_transactions (type=escrow_unlock, '
  'category=retirement, origin_restricted=FALSE — retirement unlocks are fully '
  'sellable per spec §8). Spec: escrow-mechanics-v1.md §5.1 + §6.';

REVOKE EXECUTE ON FUNCTION public.retirement_escrow_unlock(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT to_regclass('public.bling_retirement_escrows')) IS NOT NULL,
    'bling_retirement_escrows table missing';

  ASSERT (SELECT to_regprocedure('public.active_membership_check(uuid,integer)')) IS NOT NULL,
    'active_membership_check(uuid,int) function missing';

  ASSERT (SELECT to_regprocedure('public.retirement_escrow_accrue(uuid,numeric,uuid)')) IS NOT NULL,
    'retirement_escrow_accrue(uuid,numeric,uuid) function missing';

  ASSERT (SELECT to_regprocedure('public.retirement_escrow_unlock(uuid,numeric)')) IS NOT NULL,
    'retirement_escrow_unlock(uuid,numeric) function missing';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename  = 'bling_retirement_escrows'
       AND indexname  = 'bling_retirement_escrows_unlock_state_idx'
  ), 'bling_retirement_escrows_unlock_state_idx index missing';

  ASSERT (SELECT relrowsecurity FROM pg_class
           WHERE oid = 'public.bling_retirement_escrows'::regclass),
    'RLS not enabled on bling_retirement_escrows';

  RAISE NOTICE 'Migration 20260515000100 OK: retirement escrow table + 3 functions + RLS verified.';
END $$;

COMMIT;
