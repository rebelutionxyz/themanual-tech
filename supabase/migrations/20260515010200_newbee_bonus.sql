-- =============================================================================
-- Migration 20260515010200 — issue_newbee_bonus RPC + defensive prereqs
-- =============================================================================
-- Date:        2026-05-15
-- Author:      Code 3 (Claude Opus 4.7) — supervised by OG HUMAN
-- Branch:      feat/operations-newbee-v1 (TheMANUAL.tech)
-- Status:      UNAPPLIED. Author commits; OG HUMAN applies via Studio MCP.
-- Source:      ~/Documents/HONEYCOMB/newbee-welcome-bonus-v1-spec.md §3, §6,
--              §7.2, §8 (issue mechanic, single-hop restriction, race
--              protection). A4 v1.0 §7 (NewBEE Fund 2.5B genesis, 1M Bee cap,
--              single-hop non-sellable). Task brief authoritative for RPC
--              shape (column names, type values, bling_balance update).
-- Sibling:     20260515010000_operations_funds.sql — provides 'newbee' row
--              (this RPC RAISES if absent).
--
-- Purpose:
--   (a) Defensively ensure bling_transactions.origin_restricted column exists
--       (Code 2's feat/escrow-v1 branch — migration 20260515000000 — may or
--       may not have been applied before this one; the column add is
--       idempotent via IF NOT EXISTS).
--   (b) Defensively extend bling_transactions.type CHECK to include
--       'newbee_bonus' (NEW for this RPC). Drop existing CHECK by predicate
--       match and recreate with the canonical union of all known types,
--       including escrow_in/escrow_unlock from Code 2's parallel branch —
--       so applying this migration AFTER feat/escrow-v1's 20260515000000
--       does not strip Code 2's additions, and applying it BEFORE does not
--       break Code 2's later apply.
--   (c) CREATE FUNCTION issue_newbee_bonus(p_bee_id UUID) RETURNS BOOLEAN
--       per task brief — SELECT FOR UPDATE on operations_funds 'newbee'
--       row for race protection, fund-balance + duplicate pre-checks,
--       inserts bling_transactions ledger row (type='newbee_bonus',
--       category='welcome', origin_restricted=TRUE per A4 §9 single-hop),
--       credits bees.bling_balance, decrements operations_funds.newbee.
--
-- Design notes:
--   - 2,500 BLiNG! per Bee per A4 §7 + spec §3. Constant in RPC.
--   - Race protection: SELECT FOR UPDATE locks the 'newbee' operations_funds
--     row for the duration of the transaction; concurrent issue_newbee_bonus
--     calls serialize on this row. Combined with the duplicate-check on
--     bling_transactions (type='newbee_bonus' for that bee), prevents
--     both double-spend and double-issue.
--   - Returns BOOLEAN: TRUE on success, FALSE on fund-depleted or duplicate.
--     RAISEs only on genuine error conditions (missing fund row, missing
--     bee row, negative balance impossible).
--   - SECURITY DEFINER + REVOKE EXECUTE FROM PUBLIC/anon/authenticated +
--     GRANT EXECUTE TO service_role. Caller is the server-side verification
--     flow (Twilio + SendGrid webhook → service-role RPC call).
--   - balance_after on the ledger row is the new (post-credit) bling_balance.
--   - origin_restricted=TRUE per A4 §9 single-hop anti-farming mechanic
--     (clears on first transfer out by the receiving Bee).
--
-- Idempotency: ADD COLUMN IF NOT EXISTS; CHECK drop-and-recreate guarded by
--              predicate match; CREATE OR REPLACE FUNCTION.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- (a) Defensive: ensure origin_restricted column on bling_transactions
--     (Code 2's feat/escrow-v1 20260515000000 may or may not be applied yet)
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
  ADD COLUMN IF NOT EXISTS origin_restricted BOOLEAN NOT NULL DEFAULT FALSE;

-- ───────────────────────────────────────────────────────────────────────
-- (b) Defensive: extend bling_transactions.type CHECK to include 'newbee_bonus'
--     Preserves escrow_in/escrow_unlock from Code 2's parallel branch so
--     order-of-apply between feat/operations-newbee-v1 and feat/escrow-v1
--     does not strip either side's type additions.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_check_name text;
BEGIN
  SELECT conname INTO v_check_name
    FROM pg_constraint
   WHERE conrelid = 'public.bling_transactions'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) LIKE '%type =%'
   LIMIT 1;

  IF v_check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bling_transactions DROP CONSTRAINT %I', v_check_name);
    RAISE NOTICE 'Dropped existing type CHECK: %', v_check_name;
  END IF;
END $$;

ALTER TABLE public.bling_transactions
  ADD CONSTRAINT bling_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'free',
    'send_debit', 'send_credit',
    'escrow_hold', 'escrow_release', 'escrow_cancel', 'escrow_dispute',
    'order_reserve', 'order_fill_debit', 'order_fill_credit',
    'order_cancel_refund', 'order_donation',
    'stripe_credit', 'chargeback',
    'escrow_in', 'escrow_unlock',     -- Code 2's feat/escrow-v1 (preserved)
    'newbee_bonus'                    -- NEW for this RPC
  ]));

-- ───────────────────────────────────────────────────────────────────────
-- (c) issue_newbee_bonus RPC
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.issue_newbee_bonus(p_bee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_bonus_amount  CONSTANT NUMERIC(20,6) := 2500;
  v_fund_balance  NUMERIC(20,6);
  v_already       BOOLEAN;
  v_new_balance   NUMERIC(20,6);
BEGIN
  -- Race protection: lock the 'newbee' fund row for the duration of this tx
  SELECT current_balance INTO v_fund_balance
    FROM public.operations_funds
   WHERE fund_name = 'newbee'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'operations_funds row for ''newbee'' not found — apply 20260515010000 first';
  END IF;

  -- Pre-check: fund has enough balance for one bonus
  IF v_fund_balance < v_bonus_amount THEN
    -- Fund depleted (or insufficient for one more bonus). Signal to caller;
    -- post-1M-Bee policy fires per #WELCOME-BONUS-DEPLETION.
    RETURN FALSE;
  END IF;

  -- Pre-check: bee hasn't already received the bonus
  SELECT EXISTS (
    SELECT 1 FROM public.bling_transactions
     WHERE bee_id = p_bee_id
       AND type   = 'newbee_bonus'
  ) INTO v_already;

  IF v_already THEN
    RETURN FALSE;
  END IF;

  -- Verify bee exists (RAISE on missing — that's a caller error)
  IF NOT EXISTS (SELECT 1 FROM public.bees WHERE id = p_bee_id) THEN
    RAISE EXCEPTION 'no bees row for %', p_bee_id;
  END IF;

  -- Credit bee main wallet
  UPDATE public.bees
    SET bling_balance = bling_balance + v_bonus_amount,
        updated_at    = now()
   WHERE id = p_bee_id
  RETURNING bling_balance INTO v_new_balance;

  -- Append ledger row — single-hop restricted per A4 v1.0 §9 anti-farming
  INSERT INTO public.bling_transactions (
    bee_id, type, amount, balance_after, currency_type,
    category, origin_restricted
  ) VALUES (
    p_bee_id, 'newbee_bonus', v_bonus_amount, v_new_balance, 'BLiNG',
    'welcome', TRUE
  );

  -- Debit fund
  UPDATE public.operations_funds
    SET current_balance      = current_balance - v_bonus_amount,
        last_disbursement_at = now(),
        updated_at           = now()
   WHERE fund_name = 'newbee';

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.issue_newbee_bonus(uuid) IS
  'Issue 2,500 BLiNG! NewBEE welcome bonus to a verified Bee. Caller is the '
  'server-side verification webhook (Twilio + SendGrid → service-role). '
  'Returns TRUE on success, FALSE on fund-depleted or duplicate-issue. '
  'Race protection via SELECT FOR UPDATE on the operations_funds newbee row. '
  'origin_restricted=TRUE on the ledger row per A4 v1.0 §9 single-hop '
  'anti-farming mechanic. Spec: newbee-welcome-bonus-v1.md §7.2.';

-- Permission posture (matches Code 2's pattern; service_role explicit GRANT
-- per task brief — implicit by default but stated for catalog clarity)
REVOKE EXECUTE ON FUNCTION public.issue_newbee_bonus(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.issue_newbee_bonus(uuid) TO service_role;

-- ───────────────────────────────────────────────────────────────────────
-- Post-migration sanity assertions
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Column exists (whether added by Code 2 or by this migration)
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'bling_transactions'
       AND column_name  = 'origin_restricted'
       AND data_type    = 'boolean'
  ), 'bling_transactions.origin_restricted missing or wrong type';

  -- type CHECK now permits 'newbee_bonus'
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.bling_transactions'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) LIKE '%newbee_bonus%'
  ), 'bling_transactions.type CHECK does not include newbee_bonus';

  -- Function exists with correct signature
  ASSERT (SELECT to_regprocedure('public.issue_newbee_bonus(uuid)')) IS NOT NULL,
    'issue_newbee_bonus(uuid) function missing';

  -- service_role can execute (and authenticated cannot)
  ASSERT has_function_privilege('service_role', 'public.issue_newbee_bonus(uuid)', 'EXECUTE'),
    'service_role missing EXECUTE on issue_newbee_bonus';
  ASSERT NOT has_function_privilege('authenticated', 'public.issue_newbee_bonus(uuid)', 'EXECUTE'),
    'authenticated should not have EXECUTE on issue_newbee_bonus';
  ASSERT NOT has_function_privilege('anon', 'public.issue_newbee_bonus(uuid)', 'EXECUTE'),
    'anon should not have EXECUTE on issue_newbee_bonus';

  -- Sibling dependency: operations_funds 'newbee' row exists (from 010000)
  ASSERT EXISTS (
    SELECT 1 FROM public.operations_funds WHERE fund_name = 'newbee'
  ), 'operations_funds newbee row missing — apply 20260515010000 first';

  RAISE NOTICE 'Migration 20260515010200 OK: issue_newbee_bonus + defensive prereqs verified.';
END $$;

COMMIT;
