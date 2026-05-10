-- =============================================================================
-- Migration 20260511140000 — Open #CR-5: Order-Book Hardening
--                            (bling_cancel_order + bling_place_order pre-debit)
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code 2 (Claude) — supervised by Butch
-- Status:      UNAPPLIED. Apply during Monday 2026-05-11 prep day, item 4.
-- Source:      shared/canon/cancel-recovery-adr.md (Lock 3d + Appendix item 1+2)
--              shared/canon/monday-2026-05-11-prep-scope.md (item 4)
--              shared/canon/schema-state-current.md (drift §6.1 items 2+3)
--              schema-v8-bling-themanual.sql:548-549 (the v9-hardening
--                  comment that documented this gap and never landed)
--
-- Purpose:
--   Closes Open #CR-5 — two paired drifts in the order-book surface:
--
--     (a) bling_cancel_order RPC does not exist. The bling_orders.status
--         enum allows 'cancelled', but no deployed function transitions a
--         row into that state. A Bee whose offer is open cannot recall it.
--
--     (b) bling_place_order does not pre-debit / lock the placer's balance.
--         The schema comment at schema-v8-bling-themanual.sql:548-549
--         acknowledges the gap explicitly as v9-hardening that did not
--         land. Without pre-debit, a maker can place an offer, drain the
--         backing balance via bling_send, and a later taker hitting the
--         order fails with insufficient balance at fill time.
--
--   The two land together because cancel without pre-debit is meaningless
--   (nothing to refund) and pre-debit without cancel is asymmetric (locked
--   balance becomes irrecoverable).
--
-- Order:
--   This migration MUST land AFTER the Lock 7 + Lock 3 migration
--   (20260511120000_lock7_lock3_*). The pre-flight DO-block aborts if
--   bling_orders.amount is still numeric(20,3) — pre-debit math at
--   3-decimal precision against a 6-decimal balance would silently
--   round and accumulate drift over time.
--
-- Idempotency:
--   - Both RPCs use CREATE OR REPLACE.
--   - One-time backfill of pre-existing open orders to 'cancelled' is
--     guarded by an existence check + RAISE NOTICE; safe to re-run.
--   - REVOKE / GRANT are safe to re-run.
--
-- Permission posture:
--   bling_cancel_order: mirror bling_cancel_escrow exactly —
--     SECURITY DEFINER, auth.uid() guard against p_actor_id, REVOKE FROM
--     PUBLIC + anon + authenticated, then GRANT EXECUTE TO authenticated.
--   bling_place_order: posture preserved from migration 23 C.6 (auth.uid
--     guard, REVOKE FROM PUBLIC + anon + authenticated, GRANT TO
--     authenticated). The hardening adds pre-debit logic; permission
--     posture is unchanged.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- IMPORTANT: backfill of pre-existing open orders
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Orders placed BEFORE this migration were NOT pre-debited. Orders placed
-- AFTER this migration WILL BE pre-debited. The bling_orders table has no
-- per-row marker distinguishing the two regimes.
--
-- Without a backfill, bling_cancel_order has no safe way to know whether
-- to refund: refunding a pre-migration order gives the Bee BLiNG! they
-- never debited (free supply); not refunding a post-migration order
-- locks BLiNG! they DID debit (silent loss).
--
-- Resolution: this migration cancels every pre-existing 'open' order
-- WITHOUT refund (since they were never debited, there's nothing to
-- refund). After this migration, every 'open' order in the table is
-- post-migration ⇒ pre-debited ⇒ refundable on cancel.
--
-- Per schema-state-current.md, production currently has "single test bee"
-- and the order book is "essentially empty" — blast radius is near-zero
-- in practice. The migration RAISES NOTICE with the count so Butch can
-- abort if the pre-existing open count is non-trivial.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Open / flagged for review (do NOT silently fix):
--   1. The cancel-recovery ADR § Lock 3d sketch suggested a `locked_balance`
--      column on bling_orders to make pre-debit explicit. This migration
--      does NOT add that column — pre-debit is implicit in the bee's
--      bling_balance reduction, and refund logic mirrors the v8
--      bling_create_escrow ⇄ bling_cancel_escrow pair (which also has no
--      locked_balance column). If you want explicit per-order locked
--      tracking, request a follow-up.
--   2. Buy-side pre-debit cost is `p_price * p_amount` (the cash needed
--      to cover the buy if it fills); sell-side pre-debit cost is
--      `p_amount` (the BLiNG! being offered). Refund symmetry on cancel
--      mirrors that decomposition.
--   3. fill_order does NOT yet credit the maker's locked balance back to
--      bling_balance on fill — it currently uses the maker's live
--      bling_balance. With pre-debit landed, fill_order needs a parallel
--      change so the maker's balance accounting stays correct on
--      partial fills. Flagged loud: this migration does NOT touch
--      bling_fill_order. **Do not activate the order book live until
--      the bling_fill_order companion change ships.**
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 1: confirm Lock 7 has applied (bling_orders.amount is
-- numeric(20,6)). If not, abort.
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
       AND table_name   = 'bling_orders'
       AND column_name  = 'amount';

    IF v_precision IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_orders.amount not found. '
            'Schema is in unexpected state — investigate before applying.';
    END IF;

    IF v_precision <> 20 OR v_scale <> 6 THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_orders.amount is numeric(%, %). '
            'Expected (20, 6). Apply Lock 7 + Lock 3 migration FIRST.',
            v_precision, v_scale;
    END IF;

    RAISE NOTICE 'Pre-flight 1 OK: Lock 7 confirmed applied.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 2: confirm bling_cancel_order does NOT already exist.
-- If a prior session shipped it via a different path, abort and
-- investigate rather than overwriting blindly.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_existing_oid oid;
BEGIN
    SELECT p.oid INTO v_existing_oid
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'bling_cancel_order'
       AND pg_get_function_identity_arguments(p.oid) = 'p_order_id bigint, p_actor_id uuid';

    IF v_existing_oid IS NOT NULL THEN
        RAISE NOTICE
            'bling_cancel_order(bigint, uuid) already exists (oid=%). '
            'CREATE OR REPLACE will overwrite it — confirm this is intended '
            'before re-running.', v_existing_oid;
    ELSE
        RAISE NOTICE 'Pre-flight 2 OK: bling_cancel_order is net new.';
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Backfill — cancel pre-existing open orders WITHOUT refund.
-- See header notes. Production today has near-zero open orders.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_pre_existing_count int;
BEGIN
    SELECT COUNT(*) INTO v_pre_existing_count
      FROM public.bling_orders
     WHERE status = 'open';

    IF v_pre_existing_count > 0 THEN
        RAISE NOTICE
            'Backfill: cancelling % pre-existing open order(s) without refund. '
            'These orders predate pre-debit hardening and were never debited '
            'against the placer''s balance — no refund owed.', v_pre_existing_count;

        UPDATE public.bling_orders
            SET status = 'cancelled',
                updated_at = now()
            WHERE status = 'open';
    ELSE
        RAISE NOTICE 'Backfill: no pre-existing open orders. Nothing to cancel.';
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block B · bling_place_order — preserve v9 auth.uid() guard, ADD pre-debit
-- Body identical to migration 23 C.6 except (a) precision floor follows
-- Lock 7 (0.000001 not 0.001), and (b) UPDATE bees SET bling_balance =
-- bling_balance - <pre_debit_amount> after the balance check.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_place_order(
    p_bee_id  uuid,
    p_side    text,
    p_price   numeric,
    p_amount  numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_balance     numeric;
    v_pre_debit   numeric;
    v_id          bigint;
BEGIN
    -- v9.0 security guard (preserved from migration 23 C.6)
    IF auth.uid() IS NULL OR auth.uid() <> p_bee_id THEN
        RAISE EXCEPTION 'unauthorized: bee must match auth.uid()';
    END IF;

    IF p_side NOT IN ('buy','sell') THEN
        RAISE EXCEPTION 'Invalid side';
    END IF;
    -- Lock 7 floor: 0.000001
    IF p_price <= 0 OR p_amount < 0.000001 THEN
        RAISE EXCEPTION 'Bad price/amount';
    END IF;

    SELECT bling_balance INTO v_balance
      FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Bee not found';
    END IF;

    -- Pre-debit math: sell side locks p_amount BLiNG!; buy side locks
    -- p_price * p_amount worth of BLiNG! (the cash needed to cover the
    -- buy if it fills).
    IF p_side = 'sell' THEN
        v_pre_debit := p_amount;
    ELSE -- 'buy'
        v_pre_debit := p_price * p_amount;
    END IF;

    IF v_balance < v_pre_debit THEN
        RAISE EXCEPTION 'Insufficient balance to place %: need %, have %',
            p_side, v_pre_debit, v_balance;
    END IF;

    -- Pre-debit: lock the balance into the order.
    UPDATE public.bees
        SET bling_balance = bling_balance - v_pre_debit
        WHERE id = p_bee_id;

    INSERT INTO public.bling_orders (bee_id, side, price, amount)
        VALUES (p_bee_id, p_side, p_price, p_amount)
        RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success',   true,
        'order_id',  v_id,
        'pre_debit', v_pre_debit
    );
END;
$function$;

-- Permissions: preserved from migration 23 / 24
REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)
    FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)
    TO authenticated;

-- ───────────────────────────────────────────────────────────────────────
-- Block C · bling_cancel_order — close the missing-RPC gap.
-- Mirrors bling_cancel_escrow shape: actor must equal placer; only 'open'
-- orders are cancellable; status moves to 'cancelled'; refund the
-- unfilled portion (which equals the pre-debited amount minus the cost
-- decomposition for the filled portion).
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_cancel_order(
    p_order_id  bigint,
    p_actor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_order     public.bling_orders%ROWTYPE;
    v_unfilled  numeric;
    v_refund    numeric;
BEGIN
    -- v9.0 security guard (mirrors bling_cancel_escrow)
    IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
        RAISE EXCEPTION 'unauthorized: actor must match auth.uid()';
    END IF;

    SELECT * INTO v_order
      FROM public.bling_orders
      WHERE id = p_order_id
      FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'open' THEN
        RAISE EXCEPTION 'Order not open';
    END IF;
    IF v_order.bee_id <> p_actor_id THEN
        RAISE EXCEPTION 'Only placer can cancel';
    END IF;

    v_unfilled := v_order.amount - v_order.filled;

    -- Refund: the unfilled portion of the pre-debit returns to the placer.
    -- sell side: refund = v_unfilled (BLiNG!)
    -- buy side : refund = v_unfilled * v_order.price (cash equivalent)
    IF v_order.side = 'sell' THEN
        v_refund := v_unfilled;
    ELSE -- 'buy'
        v_refund := v_unfilled * v_order.price;
    END IF;

    UPDATE public.bling_orders
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = p_order_id;

    IF v_refund > 0 THEN
        UPDATE public.bees
            SET bling_balance = bling_balance + v_refund
            WHERE id = p_actor_id;

        INSERT INTO public.bling_transactions (
            bee_id, type, amount, ref_order_id, memo
        ) VALUES (
            p_actor_id,
            'escrow_cancelled',  -- reuse existing type; see header note 1
            v_refund,
            p_order_id,
            'Order cancelled · unfilled portion refunded'
        );
    END IF;

    RETURN jsonb_build_object(
        'success',          true,
        'order_id',         p_order_id,
        'unfilled',         v_unfilled,
        'refund',           v_refund
    );
END;
$function$;

-- Permissions: mirror bling_cancel_escrow exactly
REVOKE EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid)
    FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid)
    TO authenticated;

COMMIT;

-- =============================================================================
-- Verification queries — run AFTER apply (NOT inside the transaction).
-- =============================================================================
--
-- 1. bling_cancel_order exists with expected signature, SECURITY DEFINER,
--    search_path:
-- SELECT pg_get_function_identity_arguments(p.oid),
--        p.prosecdef, p.proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='bling_cancel_order';
-- → (p_order_id bigint, p_actor_id uuid) | t | {search_path=public}
--
-- 2. bling_place_order body now contains pre-debit UPDATE:
-- SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='bling_place_order';
-- → must show "UPDATE public.bees SET bling_balance = bling_balance - v_pre_debit"
--
-- 3. Permissions on both RPCs:
-- SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--  WHERE routine_schema='public'
--    AND routine_name IN ('bling_cancel_order', 'bling_place_order')
--  ORDER BY routine_name, grantee;
-- → both should show postgres + service_role + authenticated; NO anon.
--
-- 4. No pre-existing open orders remain after backfill:
-- SELECT COUNT(*) FROM public.bling_orders WHERE status='open';
-- → expected 0 immediately after apply (any new opens are post-pre-debit).
--
-- 5. Smoke test (against a non-prod branch DB only):
--    a. Place a sell order: confirm bling_balance decreases by p_amount.
--    b. Place a buy order:  confirm bling_balance decreases by p_price * p_amount.
--    c. Cancel each:        confirm bling_balance refunds correctly,
--                           confirm bling_transactions row written with
--                           ref_order_id set, confirm orders.status='cancelled'.
-- =============================================================================
