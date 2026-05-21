-- =============================================================================
-- Migration 20260521134000 — Symmetric donation settlement (Wave 2, step 6)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        2 (final step). Depends on steps 3 + 4 (bling_pots seeded).
-- Source:      canon/tag-progenitor-reconcile.md (treasury sub-bucket targeting)
--              ECON-13 (0.99% donation on OFFER fills)
--              Wave 1 G1 header DEFERRED note (this migration closes that loop)
--
-- Purpose:
--   Update BOTH bling_credit_purchase AND bling_fill_order so the ECON-13
--   0.99% donation on OFFER fills CREDITS the @combtreasury operational pot
--   (instead of sitting in pre-debit/net-credit limbo).
--
--   Pre-Wave-2 state: the OFFER seller's balance was pre-debited by the full
--   amount at order placement (CR-5 hardening). On fill, the buyer received
--   net_to_taker (amount - donation). The donation BLiNG! had no destination
--   — it sat in "limbo": no longer in the seller's balance, never landed in
--   the buyer's balance. Total supply was unchanged. The "ghost" donation
--   row in bling_transactions recorded the math but moved no money.
--
--   Post-Wave-2 state: the donation BLiNG! credits @combtreasury.operational
--   pot. The ghost donation row in bling_transactions is preserved (audit
--   trail; semantics unchanged). A new pot UPDATE inside each RPC actually
--   moves the BLiNG! to the operational pot. Net result: total supply
--   conserved across the trade (seller -X, buyer +net, treasury +donation,
--   sum = 0 change in circulating BLiNG! across actors).
--
-- Approach: CREATE OR REPLACE FUNCTION on both RPCs. Existing function
-- bodies are preserved exactly except for the addition of one UPDATE
-- statement after each donation INSERT.
--
-- SAFETY:
--   - bling_orders has 0 rows (verified Phase 1 + post-Wave-1) — no live
--     fills in flight. Re-deploying both RPCs is safe.
--   - bling_credit_purchase: just deployed Wave 1; this preserves G1 body
--     verbatim except adds the pot UPDATE.
--   - bling_fill_order: deployed before this session. Body is preserved
--     verbatim except adds the pot UPDATE.
--   - bling_pots has @combtreasury.operational row from step 4 (verified).
--   - All RPCs remain SECURITY DEFINER, preserving REVOKE posture.
--
-- Idempotency:
--   CREATE OR REPLACE on both functions is idempotent on identical body.
--   Pre-flight DO $$ block confirms the operational pot exists, otherwise
--   abort.
--
-- Blast radius:
--   - 2 function redefinitions. No table mutations beyond runtime pot UPDATEs.
--   - On future Stripe credit_purchase or direct bling_fill_order calls,
--     each donation row will be paired with a pot balance increment.
--   Rollback: re-apply the pre-Wave-2 bodies (see ROLLBACK section).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm @combtreasury.operational pot exists.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_operational_pot_exists boolean;
    v_bling_fill_order_exists boolean;
    v_bling_credit_purchase_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.bling_pots
        WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
          AND purpose = 'operational'
    ) INTO v_operational_pot_exists;
    IF NOT v_operational_pot_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: @combtreasury operational pot row missing. '
            'Step 4 (20260521131000_g9_system_bees_and_combtreasury_pots) must apply first.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='bling_fill_order'
          AND pg_get_function_identity_arguments(p.oid) = 'p_taker_id uuid, p_order_id bigint, p_fill_amt numeric'
    ) INTO v_bling_fill_order_exists;
    IF NOT v_bling_fill_order_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_fill_order RPC missing with expected signature.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='bling_credit_purchase'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric'
    ) INTO v_bling_credit_purchase_exists;
    IF NOT v_bling_credit_purchase_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_credit_purchase RPC missing with expected signature. '
            'Wave 1 step 1 (G1) must apply first.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: operational pot exists; both RPCs present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · bling_fill_order — add pot credit after donation row
-- (rest of body preserved verbatim from current deployed version)
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_fill_order(
    p_taker_id uuid,
    p_order_id bigint,
    p_fill_amt numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_order record;
    v_donation_pct numeric(8,6); v_donation_amount numeric(20,6); v_net_to_taker numeric(20,6);
    v_taker_balance_after numeric(20,6); v_remaining numeric(20,6); v_new_status text;
    v_credit_tx_id bigint; v_donation_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_taker_id THEN RAISE EXCEPTION 'caller may not fill as bee %', p_taker_id; END IF;
    IF p_fill_amt <= 0 THEN RAISE EXCEPTION 'fill_amt must be positive'; END IF;

    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'order % not found', p_order_id; END IF;
    IF v_order.status NOT IN ('open','partial') THEN RAISE EXCEPTION 'order status is %, cannot fill', v_order.status; END IF;
    IF v_order.bee_id = p_taker_id THEN RAISE EXCEPTION 'cannot fill own order'; END IF;

    v_remaining := v_order.amount - v_order.filled;
    IF p_fill_amt > v_remaining THEN RAISE EXCEPTION 'fill_amt % exceeds remaining %', p_fill_amt, v_remaining; END IF;

    SELECT offer_donation_pct INTO v_donation_pct FROM public.bling_system_state WHERE id = 1;
    v_donation_amount := round(p_fill_amt * v_donation_pct, 6);
    v_net_to_taker := p_fill_amt - v_donation_amount;

    IF v_order.side = 'request' THEN RAISE EXCEPTION 'filling ''request''-side orders requires Stripe Connect (deferred to follow-up session)'; END IF;

    UPDATE public.bees SET bling_balance = bling_balance + v_net_to_taker
     WHERE id = p_taker_id RETURNING bling_balance INTO v_taker_balance_after;

    UPDATE public.bling_orders
       SET filled = filled + p_fill_amt,
           status = CASE WHEN (filled + p_fill_amt) >= amount THEN 'filled' ELSE 'partial' END
     WHERE id = p_order_id RETURNING status INTO v_new_status;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_order_id, memo)
    VALUES (p_taker_id, 'order_fill_credit', v_net_to_taker, v_taker_balance_after, v_order.bee_id, p_order_id, 'OFFER fill (net of donation)')
    RETURNING id INTO v_credit_tx_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_order_id, memo)
    VALUES (p_taker_id, 'order_donation', -v_donation_amount, v_taker_balance_after, v_order.bee_id, p_order_id,
            'ECON-13 donation 0.99% on OFFER fill')
    RETURNING id INTO v_donation_tx_id;

    -- Wave 2 step 6 addition: credit the @combtreasury operational pot with
    -- the donation amount. Closes the ECON-13 settlement loop — the donation
    -- BLiNG! no longer sits in pre-debit/net-credit limbo; it lands in the
    -- treasury pot for monthly USD reconciliation against provider obligations.
    UPDATE public.bling_pots
       SET balance = balance + v_donation_amount
     WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
       AND purpose = 'operational';

    RETURN jsonb_build_object('ok', true, 'credit_tx_id', v_credit_tx_id, 'donation_tx_id', v_donation_tx_id,
        'taker_balance_after', v_taker_balance_after, 'donation_amount', v_donation_amount, 'order_new_status', v_new_status,
        'treasury_pot_credited', '@combtreasury.operational');
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Block B · bling_credit_purchase — add pot credit after each donation row
-- in the fill-from-OFFERs loop (curve-FREE branch has no donation row).
-- Wave 1 G1 body preserved exactly except memo update + pot UPDATE in loop.
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
    v_freedom_price       numeric(20,6);
    v_total_supply        numeric(20,6);
    v_free_active         boolean;
    v_offer_donation_pct  numeric(8,6);
    v_remaining           numeric(20,6) := p_amount;
    v_filled_from_offers  numeric(20,6) := 0;
    v_filled_from_curve   numeric(20,6) := 0;
    v_total_donation      numeric(20,6) := 0;
    v_order               record;
    v_fill_amt            numeric(20,6);
    v_donation_amount     numeric(20,6);
    v_net_to_taker        numeric(20,6);
    v_buyer_balance_after numeric(20,6);
    v_new_order_status    text;
    v_new_total           numeric(20,6);
    v_new_freedom_price   numeric(20,6);
    v_hard_cap constant   numeric(20,6) := 11222333222111;
BEGIN
    IF p_bee_id IS NULL THEN RAISE EXCEPTION 'p_bee_id required'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'p_amount must be positive'; END IF;

    SELECT freedom_price, total_supply, free_active, offer_donation_pct
      INTO v_freedom_price, v_total_supply, v_free_active, v_offer_donation_pct
      FROM public.bling_system_state
     WHERE id = 1
     FOR UPDATE;

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

        IF v_order.status NOT IN ('open','partial') THEN CONTINUE; END IF;
        IF v_order.bee_id = p_bee_id THEN CONTINUE; END IF;

        v_fill_amt := LEAST(v_remaining, v_order.amount - v_order.filled);
        IF v_fill_amt <= 0 THEN CONTINUE; END IF;

        v_donation_amount := round(v_fill_amt * v_offer_donation_pct, 6);
        v_net_to_taker    := v_fill_amt - v_donation_amount;

        UPDATE public.bees
           SET bling_balance = bling_balance + v_net_to_taker
         WHERE id = p_bee_id
        RETURNING bling_balance INTO v_buyer_balance_after;

        IF v_buyer_balance_after IS NULL THEN
            RAISE EXCEPTION 'bee % not found', p_bee_id;
        END IF;

        UPDATE public.bling_orders
           SET filled = filled + v_fill_amt,
               status = CASE
                          WHEN (filled + v_fill_amt) >= amount THEN 'filled'
                          ELSE 'partial'
                        END
         WHERE id = v_order.id
        RETURNING status INTO v_new_order_status;

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

        INSERT INTO public.bling_transactions (
            bee_id, type, amount, balance_after,
            counterparty_bee_id, ref_order_id,
            source_type, counterparty,
            memo
        ) VALUES (
            p_bee_id, 'order_donation', -v_donation_amount, v_buyer_balance_after,
            v_order.bee_id, v_order.id,
            'stripe_webhook', '@combtreasury.operational',
            'ECON-13 donation 0.99% on OFFER fill via Stripe (settled to @combtreasury.operational)'
        );

        -- Wave 2 step 6 addition: credit the operational pot.
        UPDATE public.bling_pots
           SET balance = balance + v_donation_amount
         WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
           AND purpose = 'operational';

        v_total_donation     := v_total_donation + v_donation_amount;
        v_filled_from_offers := v_filled_from_offers + v_fill_amt;
        v_remaining          := v_remaining - v_fill_amt;
    END LOOP;

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
        'total_donation_to_treasury_operational', v_total_donation,
        'balance_after', v_buyer_balance_after,
        'freedom_price_after', COALESCE(v_new_freedom_price, v_freedom_price),
        'total_supply_after',  COALESCE(v_new_total, v_total_supply)
    );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Permissions: re-apply REVOKE on bling_credit_purchase (CREATE OR REPLACE
-- preserves grants but re-applying is idempotent + defensive). bling_fill_order
-- remains Bee-callable (NOT REVOKE'd from authenticated — Bees fill orders directly).
-- ───────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric) FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT)
-- =============================================================================
--
-- (1) Both RPCs now reference bling_pots:
-- SELECT
--   (pg_get_functiondef('public.bling_fill_order(uuid,bigint,numeric)'::regprocedure)
--      LIKE '%bling_pots%') AS fill_order_credits_pots,
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure)
--      LIKE '%bling_pots%') AS credit_purchase_credits_pots;
-- → both true.
--
-- (2) bling_credit_purchase still REVOKE'd from anon + authenticated:
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='bling_credit_purchase';
-- → only postgres + service_role.
--
-- (3) bling_fill_order remains accessible to authenticated (Bee direct calls):
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='bling_fill_order';
-- → postgres / service_role (per default).  (No change to grants — this RPC
--   was NOT REVOKE'd previously; Bees call it directly with their own auth.)
--
-- (4) @combtreasury operational pot still at 0 (no fills yet):
-- SELECT balance FROM public.bling_pots
--  WHERE bee_id='00000000-0000-0000-0000-000000000bee'::uuid
--    AND purpose='operational';
-- → 0.000000.
--
-- (5) End-to-end smoke (skip in prod; documents the expected behavior):
-- -- Pre: bling_balance=10 on seller, 0 on buyer; freedom_price=1.0; operational pot=0.
-- -- Seller PLACEs OFFER amount=10, price=1.0   → seller balance 0; order amount=10,filled=0.
-- -- Buyer FILLs amount=5
-- --   - donation = round(5 * 0.0099, 6) = 0.049500
-- --   - net = 5 - 0.0495 = 4.9505
-- --   - buyer balance = 4.9505 (was 0)
-- --   - order filled=5, status='partial'
-- --   - operational pot = 0.0495 (was 0)
-- -- Sum check: -10 (seller) + 4.9505 (buyer) + 0.0495 (pot) + 5 (order remaining held) = 0 ✓
-- --   (treasury sub-bucket pot grows by 0.0495 per ECON-13 donation; total supply unchanged.)

-- =============================================================================
-- ROLLBACK (commented — re-applies the pre-Wave-2 bodies)
-- =============================================================================
-- Restore bling_fill_order without the pot UPDATE; restore bling_credit_purchase
-- without the pot UPDATE in the loop. See Wave 1 G1 migration source and the
-- pre-Wave-2 bling_fill_order body (captured in this migration's source above
-- for reference). Re-deploy via CREATE OR REPLACE.
