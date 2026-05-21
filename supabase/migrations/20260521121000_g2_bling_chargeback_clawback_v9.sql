-- =============================================================================
-- Migration 20260521121000 — G2: bling_chargeback_clawback v9 (Wave 1, step 2)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        1 (Stripe surface). Depends on step 1.5 + step 1 having applied.
-- Source:      Body recovery from supabase/migrations/20260511130000_lock2_chargeback_infra.sql
--              v9 column-name + behavior reconciliation from this session's Phase 1 audit
--              shared/canon/cancel-recovery-adr.md (Lock 2 — Stripe chargeback)
--
-- Purpose:
--   Restore the Stripe-dispute clawback RPC. On `charge.dispute.created` or
--   `charge.refunded` webhook events, this RPC atomically:
--     1. Decrements the affected Bee's bling_balance by the chargeback amount
--        (negative balance ALLOWED — Bee enters clawback / frozen-from-
--        transacting state per Lock 2).
--     2. Decrements bling_system_state.total_supply by the same amount
--        (supply burn — reverses the original FREE that the chargeback'd
--        purchase produced).
--     3. Inserts an audit row in bling_stripe_events with status='reversed'.
--     4. Inserts an audit row in bling_transactions with type='chargeback'.
--
-- ADAPTATIONS from the v8 source body (supabase/migrations/20260511130000):
--
--   1. `bling_stripe_events.bling_amount` → `amount_bling` (v9 column name).
--   2. `bling_stripe_events.usd_amount`   → `amount_usd`   (v9 column name).
--   3. `bling_stripe_events.event_type`   → folded into payload jsonb
--                                            (v9 has no event_type column).
--   4. stripe status `'charged_back'`     → `'reversed'`
--                                            (v9 enum: pending/completed/failed/duplicate/reversed).
--   5. `bling_transactions.type='chargeback_clawback'` → `'chargeback'`
--                                            (existing v9 enum value; Bee-dispute
--                                             vs auto-clawback distinction now
--                                             tracked via source_type column
--                                             added by step 1.5).
--   6. `bling_transactions.counterparty='stripe'` (TEXT) — uses the
--      counterparty column added by step 1.5. counterparty_bee_id stays NULL.
--   7. `balance_after` is now NOT NULL (v9 constraint); body computes and
--      supplies it (v8 body left it implicit).
--
-- Q1 LOCK (Butch, 2026-05-21): DO NOT add 'chargeback_clawback' to the
--   bling_transactions.type CHECK enum. Use the existing 'chargeback' value.
--   Source distinction lives in source_type column ('stripe_webhook' vs
--   future 'bee_dispute', etc.). Cleaner enum, no churn.
--
-- Idempotency:
--   - Primary defense: pre-flight SELECT against bling_stripe_events looking
--     for any row with source_event_id = p_stripe_event_id AND
--     status = 'reversed'. If found, return idempotent=true with the
--     existing event_id. No state mutation.
--   - Secondary defense: the bling_stripe_events PRIMARY KEY (event_id)
--     prevents duplicate inserts. The synthetic chargeback event_id is
--     `'cb_' || p_stripe_event_id` — distinct from the source event_id so
--     the source row (status='completed') and the chargeback row
--     (status='reversed') can coexist on the same Stripe event.
--   - The bling_chargeback_clawback function itself is CREATE OR REPLACE
--     so re-applying the migration is a no-op.
--
-- Permission posture:
--   SECURITY DEFINER. REVOKE EXECUTE FROM PUBLIC + anon + authenticated.
--   service_role retains implicit access. Stripe webhook → service_role only.
--   Mirror of G1.
--
-- Blast radius:
--   Function add only. No table mutations on existing tables (this migration
--   doesn't touch the bling_transactions type CHECK enum — Q1 lock means we
--   reuse the existing 'chargeback' value). Rollback is `DROP FUNCTION`.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm the v9 deployed surface this RPC depends on.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_amount_bling_exists boolean;
    v_amount_usd_exists   boolean;
    v_status_check_ok     boolean;
    v_type_check_has_chargeback boolean;
    v_source_type_exists  boolean;
    v_counterparty_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_stripe_events'
          AND column_name='amount_bling'
    ) INTO v_amount_bling_exists;
    IF NOT v_amount_bling_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_stripe_events.amount_bling missing. '
            'v9 schema is in unexpected state.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_stripe_events'
          AND column_name='amount_usd'
    ) INTO v_amount_usd_exists;
    IF NOT v_amount_usd_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_stripe_events.amount_usd missing.';
    END IF;

    -- Confirm the 'reversed' status value is in the v9 status CHECK enum.
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'bling_stripe_events_status_check'
           AND pg_get_constraintdef(oid) LIKE '%reversed%'
    ) INTO v_status_check_ok;
    IF NOT v_status_check_ok THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_stripe_events_status_check does not include ''reversed''. '
            'v9 enum drift — investigate before applying.';
    END IF;

    -- Confirm 'chargeback' is already in bling_transactions.type CHECK enum.
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'bling_transactions_type_check'
           AND pg_get_constraintdef(oid) LIKE '%''chargeback''%'
    ) INTO v_type_check_has_chargeback;
    IF NOT v_type_check_has_chargeback THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_transactions_type_check does not include ''chargeback''. '
            'Per Q1 lock this migration reuses the existing value rather than adding a new one — '
            'if the value is missing, the v9 enum has drifted from canon.';
    END IF;

    -- Confirm source_type + counterparty columns from step 1.5 exist.
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_transactions'
          AND column_name='source_type'
    ) INTO v_source_type_exists;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_transactions'
          AND column_name='counterparty'
    ) INTO v_counterparty_exists;
    IF NOT (v_source_type_exists AND v_counterparty_exists) THEN
        RAISE EXCEPTION
            'Pre-flight failed: source_type / counterparty columns missing. '
            'Step 1.5 (20260521115000_bling_transactions_source_columns) must apply first.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: v9 chargeback surface present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- bling_chargeback_clawback — Stripe dispute / refund webhook entry point.
-- Service-role only (REVOKE'd below).
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_chargeback_clawback(
    p_stripe_event_id   TEXT,
    p_stripe_charge_id  TEXT,
    p_bee_id            UUID,
    p_amount            NUMERIC,
    p_usd_amount        NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_existing_event_id TEXT;
    v_balance_after     numeric(20,6);
    v_supply_after      numeric(20,6);
    v_chargeback_event_id TEXT;
BEGIN
    -- Validation
    IF p_stripe_event_id IS NULL OR length(p_stripe_event_id) = 0 THEN
        RAISE EXCEPTION 'p_stripe_event_id required';
    END IF;
    IF p_bee_id IS NULL THEN
        RAISE EXCEPTION 'p_bee_id required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'p_amount must be positive';
    END IF;
    IF p_usd_amount IS NULL OR p_usd_amount <= 0 THEN
        RAISE EXCEPTION 'p_usd_amount must be positive';
    END IF;

    v_chargeback_event_id := 'cb_' || p_stripe_event_id;

    -- Idempotency: if a chargeback for this source event already exists,
    -- return success no-op rather than double-clawing.
    SELECT event_id INTO v_existing_event_id
        FROM public.bling_stripe_events
        WHERE source_event_id = p_stripe_event_id
          AND status = 'reversed'
        LIMIT 1;

    IF v_existing_event_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success',           true,
            'idempotent',        true,
            'existing_event_id', v_existing_event_id
        );
    END IF;

    -- Lock the bee row; debit balance (negatives allowed per Lock 2).
    PERFORM 1 FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bee % not found', p_bee_id;
    END IF;

    UPDATE public.bees
       SET bling_balance = bling_balance - p_amount
     WHERE id = p_bee_id
    RETURNING bling_balance INTO v_balance_after;

    -- Lock bling_system_state singleton; burn supply.
    -- Full chargeback amount burns regardless of how the original purchase
    -- decomposed (curve-FREE vs. order-book-fill). Per Lock 2 ADR.
    UPDATE public.bling_system_state
       SET total_supply = total_supply - p_amount,
           updated_at   = now()
     WHERE id = 1
    RETURNING total_supply INTO v_supply_after;

    -- Audit row in bling_stripe_events. event_id is the synthetic
    -- chargeback id ('cb_' prefix) — keeps the source row (status='completed'
    -- or 'pending') intact and adds the reversal row alongside.
    -- event_type folds into payload jsonb (v9 has no event_type column).
    INSERT INTO public.bling_stripe_events (
        event_id,
        bee_id,
        source_event_id,
        status,
        stripe_charge_id,
        amount_usd,
        amount_bling,
        payload,
        processed_at
    ) VALUES (
        v_chargeback_event_id,
        p_bee_id,
        p_stripe_event_id,
        'reversed',
        p_stripe_charge_id,
        p_usd_amount,
        p_amount,
        jsonb_build_object(
            'event_type',         'charge.dispute.created',
            'source_event_id',    p_stripe_event_id,
            'reversed_via_rpc',   'bling_chargeback_clawback'
        ),
        now()
    );

    -- Audit row in bling_transactions. type='chargeback' (existing v9
    -- enum value per Q1 lock). source_type marks origin; counterparty
    -- is the literal-string 'stripe'.
    INSERT INTO public.bling_transactions (
        bee_id,
        type,
        amount,
        balance_after,
        counterparty_bee_id,
        stripe_event_id,
        source_type,
        counterparty,
        memo
    ) VALUES (
        p_bee_id,
        'chargeback',
        -p_amount,                  -- negative: BLiNG! removed from bee
        v_balance_after,
        NULL,                       -- no Bee counterparty; 'stripe' is the counterparty
        v_chargeback_event_id,      -- FK to bling_stripe_events.event_id
        'stripe_webhook',
        'stripe',
        'Chargeback clawback · source event ' || p_stripe_event_id
    );

    RETURN jsonb_build_object(
        'success',         true,
        'idempotent',      false,
        'bee_id',          p_bee_id,
        'amount',          p_amount,
        'balance_after',   v_balance_after,
        'supply_after',    v_supply_after,
        'source_event_id', p_stripe_event_id,
        'chargeback_event_id', v_chargeback_event_id
    );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Permissions: service-role exclusive. Mirror of G1.
-- ───────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.bling_chargeback_clawback(TEXT, TEXT, UUID, NUMERIC, NUMERIC)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_chargeback_clawback(TEXT, TEXT, UUID, NUMERIC, NUMERIC)
    FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Function exists with expected signature + SECURITY DEFINER + search_path:
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        pg_get_function_result(p.oid) AS returns,
--        p.prosecdef AS security_definer,
--        p.proconfig AS function_settings
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='bling_chargeback_clawback';
-- → bling_chargeback_clawback | p_stripe_event_id text, p_stripe_charge_id text, p_bee_id uuid, p_amount numeric, p_usd_amount numeric | jsonb | t | {search_path=pg_catalog,public}
--
-- (2) Permissions: NO anon, NO authenticated:
-- SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='bling_chargeback_clawback';
-- → only postgres / service_role rows.
--
-- (3) Body uses v9 column names + 'reversed' + 'chargeback' (not v8 names):
-- SELECT
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%amount_bling%')     AS uses_amount_bling,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%amount_usd%')       AS uses_amount_usd,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%bling_amount%')     AS still_v8_bling_amount,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%''reversed''%')     AS uses_reversed_status,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%''charged_back''%') AS still_v8_charged_back,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%''chargeback''%')   AS uses_chargeback_type,
--   (pg_get_functiondef('public.bling_chargeback_clawback(text,text,uuid,numeric,numeric)'::regprocedure) LIKE '%chargeback_clawback%') AS still_has_clawback_string;
-- → uses_amount_bling=t, uses_amount_usd=t, uses_reversed_status=t, uses_chargeback_type=t.
--   still_v8_bling_amount=f, still_v8_charged_back=f.
--   still_has_clawback_string MAY be true (function name itself contains it) — that's OK.
--
-- (4) Idempotency smoke (ONLY on a non-production branch DB with a test bee):
-- -- First call:
-- SELECT public.bling_chargeback_clawback(
--   'evt_test_001', 'ch_test_001',
--   '<test-bee-uuid>'::uuid, 0.5, 0.50
-- );
-- -- Expect: {success:true, idempotent:false, ...}
-- -- Second call (same params):
-- SELECT public.bling_chargeback_clawback(
--   'evt_test_001', 'ch_test_001',
--   '<test-bee-uuid>'::uuid, 0.5, 0.50
-- );
-- -- Expect: {success:true, idempotent:true, existing_event_id:"cb_evt_test_001"}
-- -- Post-state: bee bling_balance -0.5, total_supply -0.5,
-- --             1 row in bling_stripe_events (status='reversed'),
-- --             1 row in bling_transactions (type='chargeback', amount=-0.5).
--
-- (5) Existing RPCs untouched (sanity):
-- SELECT proname, md5(pg_get_functiondef(oid)) AS body_hash
--   FROM pg_proc
--  WHERE pronamespace='public'::regnamespace
--    AND proname IN ('bling_free','bling_fill_order','bling_send','bling_place_order','bling_cancel_order')
--  ORDER BY proname;
-- → expect unchanged hashes vs pre-migration capture.

-- =============================================================================
-- ROLLBACK (commented — only if reverting this RPC intentionally)
-- =============================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.bling_chargeback_clawback(TEXT, TEXT, UUID, NUMERIC, NUMERIC);
-- COMMIT;
