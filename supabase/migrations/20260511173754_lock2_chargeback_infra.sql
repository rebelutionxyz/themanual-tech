-- =============================================================================
-- Migration 20260511130000 — Lock 2 Cancel-Recovery: Chargeback Infrastructure
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code 2 (Claude) — supervised by Butch
-- Status:      UNAPPLIED. Apply during Monday 2026-05-11 prep day, item 3.
-- Source:      shared/canon/cancel-recovery-adr.md (Lock 2 — Stripe chargeback)
--              shared/canon/monday-2026-05-11-prep-scope.md (item 3, §2d)
--              shared/canon/schema-state-current.md (drift §6.1 item 4)
--
-- Purpose:
--   Stand up the schema and RPC needed to process Stripe chargeback events
--   (charge.dispute.created / charge.refunded). Without this, the
--   freedomblings.com webhook surface cannot reverse a fraudulent purchase:
--     - bling_stripe_events lacks the linkage fields that bind a dispute
--       event back to the originating purchase;
--     - bling_transactions.type CHECK rejects the new 'chargeback_clawback'
--       value;
--     - the SECURITY DEFINER RPC that performs the atomic balance-debit +
--       supply-burn + audit-write does not exist.
--
-- Order:
--   This migration MUST land AFTER the Lock 7 + Lock 3 migration
--   (20260511120000_lock7_lock3_*). The pre-flight DO-block aborts if it
--   sees bling_stripe_events.bling_amount still at numeric(20,3), so re-
--   running this against an un-Lock-7'd catalog is a clean abort rather
--   than silent precision drift on the new usd_amount column.
--
-- Idempotency:
--   - Column ADDs use ADD COLUMN IF NOT EXISTS.
--   - CHECK constraint replacement uses DROP CONSTRAINT IF EXISTS + ADD.
--   - Index creation uses CREATE INDEX IF NOT EXISTS.
--   - RPC uses CREATE OR REPLACE.
--   - REVOKE / GRANT are safe to re-run.
--   Re-applying after a successful first apply is a no-op.
--
-- Permission posture:
--   bling_chargeback_clawback is service-role exclusive. The
--   freedomblings.com Stripe webhook is the only legitimate caller; no
--   client-side path should ever invoke it. Mirror the bling_credit_purchase
--   posture from migration 23 / 24 (REVOKE FROM PUBLIC + anon + authenticated;
--   service_role retains implicit access; no GRANT TO authenticated).
--
-- Audit row shape (per locked Monday spec):
--   On chargeback, ONE bling_transactions row is written:
--     type='chargeback_clawback', amount=p_amount, counterparty='stripe',
--     memo references source_event_id.
--   The supply burn is reflected as a direct decrement on
--   bling_system_state.total_supply; it is NOT represented as a separate
--   transaction row. (The cancel-recovery ADR sketched a 2-row pattern
--   with a 'chargeback_burn' type — this migration uses the simpler 1-row
--   pattern. If a separate burn row is later wanted, add via follow-up.)
--
-- Open / flagged for review (do NOT silently fix):
--   1. The original purchase row in bling_stripe_events stays at
--      status='completed' after a chargeback; the new dispute row carries
--      status='charged_back'. Querying "was this purchase reversed"
--      requires a self-JOIN on source_event_id. The cancel-recovery ADR
--      called for an UPDATE on the source row (SET status =
--      'clawback_applied'); this migration does NOT do that, per the
--      locked Monday spec. Decision deferred.
--   2. Bee-facing notification (in-app banner, email, copy that honors
--      the language firewall) is out of scope for this migration —
--      that's a freedomblings.com webhook handler concern (Open #CR-2).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm Lock 7 has applied (bling_stripe_events.bling_amount
-- is numeric(20,6)). If not, abort — we don't want to introduce
-- usd_amount at numeric(20,6) alongside an un-tightened bling_amount,
-- and we definitely don't want to widen bling_amount as a side-effect
-- here (that's Lock 7's job).
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_precision int;
    v_scale     int;
BEGIN
    SELECT numeric_precision, numeric_scale
      INTO v_precision, v_scale
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'bling_stripe_events'
       AND column_name  = 'bling_amount';

    IF v_precision IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_stripe_events.bling_amount not found. '
            'Schema is in unexpected state — investigate before applying.';
    END IF;

    IF v_precision <> 20 OR v_scale <> 6 THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_stripe_events.bling_amount is '
            'numeric(%, %). Expected (20, 6). Apply Lock 7 + Lock 3 '
            'migration (20260511120000_lock7_lock3_*) FIRST.',
            v_precision, v_scale;
    END IF;

    RAISE NOTICE 'Pre-flight OK: Lock 7 confirmed applied; proceeding.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · ALTER bling_stripe_events — add chargeback linkage columns
-- All new columns are nullable EXCEPT status (NOT NULL with DEFAULT
-- 'completed' so existing rows backfill automatically).
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_stripe_events
    ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
    ADD COLUMN IF NOT EXISTS source_event_id  TEXT,
    ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS usd_amount       NUMERIC(20, 6);

-- CHECK on status (drop-then-add for idempotency)
ALTER TABLE public.bling_stripe_events
    DROP CONSTRAINT IF EXISTS bling_stripe_events_status_chk;
ALTER TABLE public.bling_stripe_events
    ADD  CONSTRAINT bling_stripe_events_status_chk
        CHECK (status IN ('completed', 'charged_back', 'refunded'));

-- ───────────────────────────────────────────────────────────────────────
-- Block B · Indexes for the new columns
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bling_stripe_events_stripe_charge_id_idx
    ON public.bling_stripe_events(stripe_charge_id)
    WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bling_stripe_events_status_idx
    ON public.bling_stripe_events(status)
    WHERE status <> 'completed';

CREATE INDEX IF NOT EXISTS bling_stripe_events_source_event_id_idx
    ON public.bling_stripe_events(source_event_id)
    WHERE source_event_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Block C · Extend bling_transactions.type CHECK to allow
-- 'chargeback_clawback'. Existing 11 values preserved.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_transactions_type_check;
ALTER TABLE public.bling_transactions
    ADD  CONSTRAINT bling_transactions_type_check
        CHECK (type IN (
            'sent','received','bought','sold','minted','fee','fee_received',
            'escrow_created','escrow_released','escrow_disputed','escrow_cancelled',
            'chargeback_clawback'
        ));

-- ───────────────────────────────────────────────────────────────────────
-- Block D · bling_chargeback_clawback RPC
-- Service-role exclusive. Idempotent on p_stripe_event_id.
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
SET search_path = public
AS $function$
DECLARE
    v_existing_event_id TEXT;
    v_balance_after     NUMERIC;
    v_supply_after      NUMERIC;
BEGIN
    IF p_stripe_event_id IS NULL OR length(p_stripe_event_id) = 0 THEN
        RAISE EXCEPTION 'p_stripe_event_id required';
    END IF;
    IF p_bee_id IS NULL THEN
        RAISE EXCEPTION 'p_bee_id required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'p_amount must be positive';
    END IF;

    -- Idempotency: a chargeback for this Stripe event has already been
    -- processed if a bling_stripe_events row exists with
    -- source_event_id = p_stripe_event_id AND status = 'charged_back'.
    -- Return success no-op rather than double-clawing.
    SELECT event_id INTO v_existing_event_id
        FROM public.bling_stripe_events
        WHERE source_event_id = p_stripe_event_id
          AND status = 'charged_back'
        LIMIT 1;

    IF v_existing_event_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success',    true,
            'idempotent', true,
            'existing_event_id', v_existing_event_id
        );
    END IF;

    -- Lock the bee row, decrement balance (negative balances ALLOWED
    -- per Lock 2 — Bee enters clawback / frozen-from-transacting state).
    PERFORM 1 FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bee not found';
    END IF;

    UPDATE public.bees
        SET bling_balance = bling_balance - p_amount
        WHERE id = p_bee_id
        RETURNING bling_balance INTO v_balance_after;

    -- Lock bling_system_state, burn the BLiNG! from total_supply.
    -- The full chargeback amount burns regardless of how the original
    -- purchase decomposed (curve-FREE vs. order-book-fill); see
    -- cancel-recovery ADR Lock 2 "order-book-fill nuance" note.
    UPDATE public.bling_system_state
        SET total_supply = total_supply - p_amount,
            updated_at   = now()
        WHERE id = 1
        RETURNING total_supply INTO v_supply_after;

    -- Audit: chargeback row in bling_stripe_events. PRIMARY KEY guard
    -- on event_id catches Stripe webhook retries that bypass the
    -- source_event_id idempotency check above.
    INSERT INTO public.bling_stripe_events (
        event_id,
        event_type,
        bee_id,
        bling_amount,
        stripe_charge_id,
        source_event_id,
        status,
        usd_amount
    ) VALUES (
        'cb_' || p_stripe_event_id,  -- prefix so PK is distinct from the source event
        'charge.dispute.created',
        p_bee_id,
        p_amount,
        p_stripe_charge_id,
        p_stripe_event_id,
        'charged_back',
        p_usd_amount
    );

    -- Audit: ledger row. counterparty='stripe' marks the external
    -- nature of the reversal. currency_type defaults to 'BLING' per
    -- Lock 3.
    INSERT INTO public.bling_transactions (
        bee_id,
        type,
        amount,
        counterparty,
        memo
    ) VALUES (
        p_bee_id,
        'chargeback_clawback',
        p_amount,
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
        'source_event_id', p_stripe_event_id
    );
END;
$function$;

-- Permissions: service-role exclusive. Mirror bling_credit_purchase posture.
REVOKE EXECUTE ON FUNCTION public.bling_chargeback_clawback(TEXT, TEXT, UUID, NUMERIC, NUMERIC)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_chargeback_clawback(TEXT, TEXT, UUID, NUMERIC, NUMERIC)
    FROM anon, authenticated;
-- DO NOT grant to authenticated. Stripe webhook → service_role only.

COMMIT;

-- =============================================================================
-- Verification queries — run AFTER apply (NOT inside the transaction).
-- Each should return the marked expected shape.
-- =============================================================================
--
-- 1. New columns present on bling_stripe_events:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='bling_stripe_events'
--    AND column_name IN ('stripe_charge_id','source_event_id','status','usd_amount')
--  ORDER BY column_name;
-- → 4 rows; status NOT NULL DEFAULT 'completed', others nullable.
--
-- 2. status CHECK accepts the three valid values:
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname = 'bling_stripe_events_status_chk';
-- → CHECK ((status = ANY (ARRAY['completed','charged_back','refunded'])))
--
-- 3. bling_transactions.type CHECK includes 'chargeback_clawback':
-- SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname = 'bling_transactions_type_check';
-- → must include 'chargeback_clawback' alongside the existing 11 values.
--
-- 4. RPC exists with the expected signature, SECURITY DEFINER, search_path:
-- SELECT pg_get_function_identity_arguments(p.oid),
--        p.prosecdef, p.proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='bling_chargeback_clawback';
-- → (text, text, uuid, numeric, numeric) | t | {search_path=public}
--
-- 5. Permissions: only postgres + service_role grantees:
-- SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='bling_chargeback_clawback';
-- → postgres + service_role only. NO anon, NO authenticated.
--
-- 6. Idempotency smoke test (against a non-prod branch DB only):
-- SELECT public.bling_chargeback_clawback(
--   'evt_test_001', 'ch_test_001',
--   '<test-bee-uuid>'::uuid, 0.5, 0.50
-- );
-- -- second call MUST return idempotent=true:
-- SELECT public.bling_chargeback_clawback(
--   'evt_test_001', 'ch_test_001',
--   '<test-bee-uuid>'::uuid, 0.5, 0.50
-- );
-- → second result: {"success":true,"idempotent":true,"existing_event_id":"cb_evt_test_001"}
-- =============================================================================
