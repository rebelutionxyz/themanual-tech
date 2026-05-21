-- =============================================================================
-- Migration 20260521120000 — G1: bling_credit_purchase v9 (INLINED) (Wave 1, step 1)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        1 (Stripe surface). Depends on step 1.5 having applied.
-- Source:      Body recovery from supabase/migrations/20260509120000_phase_c_b4_credit_purchase_callsite_fix.sql
--              v9 column-name + behavior reconciliation from this session's Phase 1 audit
--              ECON-13 donation pattern mirrored from deployed public.bling_fill_order
--              shared/canon/freedomblings-v8-final-state.json (v8 → v9 translation notes)
--
-- Purpose:
--   Restore the Stripe-webhook entry point `bling_credit_purchase(uuid, numeric)`
--   which was dropped during the Phase A v8 nuclear wipe (2026-05-13). Without
--   this RPC, Stripe webhooks cannot credit Bees with BLiNG! purchased via USD.
--
-- WHY INLINED — DESIGN NOTE (intentional duplication):
--
--   The deployed v9 RPCs `bling_free` and `bling_fill_order` enforce
--       IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required';
--       IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller may not …';
--   at the top of their bodies (v9 security hardening, 2026-05-06). These
--   guards are correct for Bee-callable direct invocation but break
--   service-role delegation: when Stripe's webhook calls bling_credit_purchase
--   via the service-role key, auth.uid() returns NULL and the guard raises.
--
--   Three options were considered:
--     (A) Inline the math here — DO NOT delegate to bling_free / bling_fill_order.
--     (B) Add a service-role bypass to those two RPCs (touches deployed surface).
--     (C) Defer G1 entirely.
--   Per Butch's Wave 1 ratification 2026-05-21: Option A.
--
--   This RPC is REVOKE'd from PUBLIC, anon, authenticated — only the
--   service-role can invoke it. Therefore the inlined body needs no
--   auth.uid() guard of its own: the authorization gate is the REVOKE.
--
--   The duplicated math:
--     - Order-fill loop mirrors bling_fill_order exactly, INCLUDING the
--       ECON-13 0.99% donation accounting pattern. Per Butch's Q2 lock:
--       OFFER seller pays the donation regardless of buyer funding source.
--     - Curve-FREE branch mirrors bling_free exactly: free_active gate,
--       total_supply increment, freedom_price recompute (LEAST(101.0,
--       1.0 + (new_total / 1B) * 0.01)), hard cap at 11_222_333_222_111.
--
--   Future drift cost: if bling_free or bling_fill_order ever changes
--   shape, this RPC silently diverges. Mitigation: documented here; the
--   v9 audit harness should periodically re-verify the three bodies agree
--   on the math they share.
--
--   DEFERRED to Wave 2 (G8/G9):
--     - The ECON-13 0.99% donation row mirrors deployed bling_fill_order:
--       it is recorded as a "ghost" transaction (amount=-donation but
--       balance_after = same as the credit row's balance_after). The
--       donation BLiNG! sits in pre-debit-vs-net-credit limbo — neither
--       in the seller's balance (pre-debited at OFFER placement) nor in
--       the buyer's balance (net-credited here). Settlement of those
--       limbo BLiNG! to @combtreasury.operational (Wave 2's bling_pots
--       surface) closes the accounting gap. Both bling_fill_order AND
--       this RPC will route donation BLiNG! to that bucket once Wave 2
--       lands.
--
-- Permission posture:
--   SECURITY DEFINER. REVOKE EXECUTE FROM PUBLIC + anon + authenticated.
--   service_role retains implicit access. Stripe webhook → service_role only.
--
-- Idempotency:
--   CREATE OR REPLACE on the same signature is idempotent. Pre-flight
--   DO $$ block confirms the v9 deployed surface is present (freedom_price
--   column, bling_orders, bling_system_state singleton). Pre-flight aborts
--   on any drift rather than silently redefining against a broken catalog.
--
-- Blast radius:
--   Function-only add. No table mutations. Rollback is `DROP FUNCTION`.
--   Existing RPCs (bling_free, bling_fill_order, bling_place_order, etc.)
--   are NOT touched.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm the v9 deployed surface this RPC depends on.
-- Specifically: freedom_price column (NOT free_price — the v8 final-state
-- JSON translation note is stale; deployed name is freedom_price), the
-- bling_system_state singleton, the source columns from step 1.5.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_freedom_price_exists boolean;
    v_source_type_exists   boolean;
    v_orders_exists        boolean;
    v_offer_donation_pct   numeric;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_system_state'
          AND column_name='freedom_price'
    ) INTO v_freedom_price_exists;
    IF NOT v_freedom_price_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_system_state.freedom_price missing. '
            'v9 fresh schema (20260513202323) is incomplete or unapplied.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='bling_transactions'
          AND column_name='source_type'
    ) INTO v_source_type_exists;
    IF NOT v_source_type_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_transactions.source_type missing. '
            'Step 1.5 (20260521115000_bling_transactions_source_columns) '
            'must apply before this migration.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='bling_orders'
    ) INTO v_orders_exists;
    IF NOT v_orders_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_orders table missing.';
    END IF;

    -- Confirm bling_system_state has exactly one row (singleton).
    PERFORM 1 FROM public.bling_system_state WHERE id = 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_system_state singleton row (id=1) absent.';
    END IF;

    SELECT offer_donation_pct INTO v_offer_donation_pct
        FROM public.bling_system_state WHERE id = 1;

    RAISE NOTICE
        'Pre-flight OK: v9 surface present (freedom_price, source_type, '
        'bling_orders, system_state singleton with offer_donation_pct=%).',
        v_offer_donation_pct;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- bling_credit_purchase — Stripe webhook entry point.
-- Service-role only (REVOKE'd below). Inlined per Wave 1 ratification.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_credit_purchase(
    p_bee_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    -- Curve state
    v_freedom_price       numeric(20,6);
    v_total_supply        numeric(20,6);
    v_free_active         boolean;
    v_offer_donation_pct  numeric(8,6);

    -- Loop state for OFFER fills
    v_remaining           numeric(20,6) := p_amount;
    v_filled_from_offers  numeric(20,6) := 0;
    v_filled_from_curve   numeric(20,6) := 0;
    v_order               record;
    v_fill_amt            numeric(20,6);
    v_donation_amount     numeric(20,6);
    v_net_to_taker        numeric(20,6);
    v_buyer_balance_after numeric(20,6);
    v_new_order_status    text;

    -- Curve-FREE branch state
    v_new_total           numeric(20,6);
    v_new_freedom_price   numeric(20,6);

    -- Hard cap constant (matches public.bling_free body exactly)
    v_hard_cap constant   numeric(20,6) := 11222333222111;
BEGIN
    -- Validation
    IF p_bee_id IS NULL THEN RAISE EXCEPTION 'p_bee_id required'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'p_amount must be positive'; END IF;

    -- Lock the singleton system state row for the duration of this transaction.
    -- All curve / supply / freedom_price reads + writes serialize on this lock.
    SELECT freedom_price, total_supply, free_active, offer_donation_pct
      INTO v_freedom_price, v_total_supply, v_free_active, v_offer_donation_pct
      FROM public.bling_system_state
     WHERE id = 1
     FOR UPDATE;

    -- ===================================================================
    -- Phase 1 · Fill from OFFER orders priced at or below freedom_price.
    -- Cheapest-first, then oldest-first (mirrors v8 ORDER BY pattern).
    -- Each iteration locks the order row for update.
    --
    -- DUPLICATED from public.bling_fill_order body (intentional — see
    -- header). Differences from that RPC:
    --   - No auth.uid() check (REVOKE is the gate).
    --   - No "cannot fill own order" check — Stripe buyer ≠ OFFER seller
    --     by webhook invariant (a Bee can't Stripe-purchase to themselves).
    --   - Loop instead of single-fill; we walk OFFERs until v_remaining ≤ 0
    --     or no more eligible orders.
    -- ===================================================================
    FOR v_order IN
        SELECT id, bee_id, amount, filled, side, status
          FROM public.bling_orders
         WHERE side   = 'offer'
           AND status IN ('open','partial')
           AND price <= v_freedom_price
         ORDER BY price ASC, created_at ASC
         FOR UPDATE
    LOOP
        EXIT WHEN v_remaining <= 0;

        -- Defensive: skip orders fully filled by a concurrent transaction
        -- (locked here, but the SELECT predicate was evaluated pre-lock).
        IF v_order.status NOT IN ('open','partial') THEN CONTINUE; END IF;
        IF v_order.bee_id = p_bee_id THEN CONTINUE; END IF;  -- can't fill own (defensive)

        v_fill_amt := LEAST(v_remaining, v_order.amount - v_order.filled);
        IF v_fill_amt <= 0 THEN CONTINUE; END IF;

        v_donation_amount := round(v_fill_amt * v_offer_donation_pct, 6);
        v_net_to_taker    := v_fill_amt - v_donation_amount;

        -- Credit the BUYER (taker) by NET amount.
        UPDATE public.bees
           SET bling_balance = bling_balance + v_net_to_taker
         WHERE id = p_bee_id
        RETURNING bling_balance INTO v_buyer_balance_after;

        IF v_buyer_balance_after IS NULL THEN
            RAISE EXCEPTION 'bee % not found', p_bee_id;
        END IF;

        -- Update the OFFER order's filled tracker + status.
        UPDATE public.bling_orders
           SET filled = filled + v_fill_amt,
               status = CASE
                          WHEN (filled + v_fill_amt) >= amount THEN 'filled'
                          ELSE 'partial'
                        END
         WHERE id = v_order.id
        RETURNING status INTO v_new_order_status;

        -- Audit row 1: credit to taker (net of donation).
        INSERT INTO public.bling_transactions (
            bee_id, type, amount, balance_after,
            counterparty_bee_id, ref_order_id,
            source_type, counterparty,
            memo
        ) VALUES (
            p_bee_id, 'order_fill_credit', v_net_to_taker, v_buyer_balance_after,
            v_order.bee_id, v_order.id,
            'stripe_webhook', NULL,
            'OFFER fill via Stripe credit_purchase (net of donation)'
        );

        -- Audit row 2: ECON-13 0.99% donation accounting.
        -- balance_after deliberately equals the credit row's balance_after
        -- (ghost-row pattern; matches deployed bling_fill_order). The
        -- pre-debit-vs-net-credit limbo BLiNG! await Wave 2 settlement
        -- to @combtreasury.operational — see header DEFERRED note.
        INSERT INTO public.bling_transactions (
            bee_id, type, amount, balance_after,
            counterparty_bee_id, ref_order_id,
            source_type, counterparty,
            memo
        ) VALUES (
            p_bee_id, 'order_donation', -v_donation_amount, v_buyer_balance_after,
            v_order.bee_id, v_order.id,
            'stripe_webhook', '@combtreasury',  -- target (Wave 2 settlement)
            'ECON-13 donation 0.99% on OFFER fill via Stripe (Wave 2 settlement TODO)'
        );

        v_filled_from_offers := v_filled_from_offers + v_fill_amt;
        v_remaining          := v_remaining - v_fill_amt;
    END LOOP;

    -- ===================================================================
    -- Phase 2 · FREE the remainder from the bonding curve, if any.
    --
    -- DUPLICATED from public.bling_free body (intentional — see header).
    -- Differences from that RPC:
    --   - No auth.uid() check (REVOKE is the gate).
    --   - free_active=false raises, which rolls back the whole tx — correct:
    --     Stripe webhook returns 5xx, retries, idempotency on the webhook
    --     side prevents double-credit, operator flips free_active back on.
    -- ===================================================================
    IF v_remaining > 0 THEN
        IF NOT v_free_active THEN
            RAISE EXCEPTION 'FREE issuance currently paused (free_active=false)';
        END IF;

        v_new_total := v_total_supply + v_remaining;
        IF v_new_total > v_hard_cap THEN
            RAISE EXCEPTION 'would exceed hard cap (% > %)', v_new_total, v_hard_cap;
        END IF;

        v_new_freedom_price := LEAST(101.0, 1.0 + (v_new_total / 1000000000.0) * 0.01);

        UPDATE public.bling_system_state
           SET total_supply  = v_new_total,
               freedom_price = v_new_freedom_price
         WHERE id = 1;

        UPDATE public.bees
           SET bling_balance = bling_balance + v_remaining
         WHERE id = p_bee_id
        RETURNING bling_balance INTO v_buyer_balance_after;

        IF v_buyer_balance_after IS NULL THEN
            RAISE EXCEPTION 'bee % not found', p_bee_id;
        END IF;

        INSERT INTO public.bling_transactions (
            bee_id, type, amount, balance_after,
            source_type, counterparty,
            memo
        ) VALUES (
            p_bee_id, 'free', v_remaining, v_buyer_balance_after,
            'stripe_webhook', NULL,
            'FREE from bonding curve via Stripe credit_purchase'
        );

        v_filled_from_curve := v_remaining;
        v_remaining := 0;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'bee_id', p_bee_id,
        'amount_requested', p_amount,
        'filled_from_offers', v_filled_from_offers,
        'filled_from_curve',  v_filled_from_curve,
        'balance_after', v_buyer_balance_after,
        'freedom_price_after', COALESCE(v_new_freedom_price, v_freedom_price),
        'total_supply_after',  COALESCE(v_new_total, v_total_supply)
    );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Permissions: service-role exclusive. Stripe webhook is the only
-- legitimate caller; no client-side path should ever invoke this.
-- ───────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric)
    FROM anon, authenticated;
-- service_role retains implicit access (Postgres default for functions
-- not explicitly granted to other roles). No GRANT TO authenticated.

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) Function exists with the expected signature, SECURITY DEFINER, search_path:
-- SELECT p.proname,
--        pg_get_function_identity_arguments(p.oid) AS args,
--        pg_get_function_result(p.oid) AS returns,
--        p.prosecdef AS security_definer,
--        p.proconfig AS function_settings
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='bling_credit_purchase';
-- → bling_credit_purchase | p_bee_id uuid, p_amount numeric | jsonb | t | {search_path=pg_catalog,public}
--
-- (2) Permissions: NO anon, NO authenticated:
-- SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='bling_credit_purchase';
-- → only postgres / service_role rows.
--
-- (3) Body references freedom_price (NOT free_price, NOT mint_price):
-- SELECT
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%freedom_price%') AS uses_freedom_price,
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%mint_price%')    AS still_references_mint;
-- → uses_freedom_price=t, still_references_mint=f
--
-- (4) Body does NOT delegate to bling_free / bling_fill_order:
-- SELECT
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%bling_free(%')       AS delegates_free,
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%bling_fill_order(%') AS delegates_fill;
-- → both false (inline by design).
--
-- (5) bling_free + bling_fill_order untouched (sanity):
-- SELECT proname, md5(pg_get_functiondef(oid)) AS body_hash
--   FROM pg_proc WHERE proname IN ('bling_free','bling_fill_order') AND pronamespace='public'::regnamespace
--  ORDER BY proname;
-- → expect the same hashes as pre-migration. Capture pre-migration values
--   for comparison if drift suspected.
--
-- (6) End-to-end smoke (ONLY on a non-production branch DB; requires
--     a test bee + service-role call context):
-- -- Pre: SELECT bling_balance FROM bees WHERE id='<test-bee-uuid>';
-- --      SELECT total_supply FROM bling_system_state WHERE id=1;
-- SELECT public.bling_credit_purchase('<test-bee-uuid>'::uuid, 1.0);
-- -- Expect: jsonb {ok:true, filled_from_offers:0, filled_from_curve:1.0, ...}
-- -- Post: bling_balance +1.0, total_supply +1.0, freedom_price recomputed.

-- =============================================================================
-- ROLLBACK (commented — only if reverting this RPC intentionally)
-- =============================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.bling_credit_purchase(uuid, numeric);
-- COMMIT;
