-- =============================================================================
-- Migration 20260521150000 — Wave 2.5: integral bonding-curve pricing
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Source:      shared/canon/bonding-curve-resolution.md v0.1 §6 (Fix 2: step
--              curve + integral pricing). Audit confirmed flat-tier live in
--              bling_free + bling_credit_purchase.
--
-- Purpose:
--   Implement Fix 2 from bonding-curve-resolution.md. Adds a pure function
--   bling_curve_integral_cost(supply, amount) that computes the USD cost of
--   freeing `amount` BLiNG! starting at supply `supply`, by integrating the
--   step function over the supply movement.
--
--   Modifies bling_free + bling_credit_purchase to surface the integral cost
--   in their return jsonb and in the transaction memo string. BLiNG! credited
--   to bees is unchanged — this migration adds COST visibility without
--   changing BALANCE flow. Upstream Stripe webhook can adopt the integral
--   cost for accurate charging in a follow-up; flat-tier upstream behavior
--   continues to work in the interim (just under-charges on multi-tier
--   trades — known gap, see §2.2 of canon).
--
-- Why surface cost but not enforce charge:
--   bling_free / bling_credit_purchase do not see USD — they take a BLiNG!
--   amount and credit the bee. The USD ↔ BLiNG! exchange happens in the
--   Stripe webhook handler upstream (out of this session's scope). This
--   migration provides the math; the webhook is the future caller. Until
--   the webhook adopts integral pricing, multi-tier purchases under-charge
--   by the integral-vs-flat difference (small at typical trade sizes:
--   <0.01% for trades within one $0.01 tier band; grows for trades
--   spanning multiple tiers, which require supply movement >= 1 billion
--   BLiNG! per tier — practically irrelevant for Stripe purchases at
--   $0.0037–$0.83 per directive per rate-cap-pricing.md §3).
--
-- STEP-FUNCTION INTEGRAL:
--   tier_width  = 1,000,000,000 BLiNG! per tier
--   tier_price  = LEAST(101.0, 1.0 + tier_index × 0.01)  USD per BLiNG!
--   ceiling     = $101 reached at tier 10000 (supply = 10 trillion)
--   hard cap    = supply ≤ 11.222333222111 trillion (per bling_free body)
--
--   For a trade from supply S to supply S+A:
--     start_tier = floor(S / tier_width)
--     end_tier   = floor((S+A) / tier_width)
--     if start_tier == end_tier:
--       cost = A × tier_price(start_tier)
--     else:
--       cost = (start_tier_remaining × tier_price(start_tier))
--            + sum over middle tiers of (tier_width × tier_price(t))
--            + (end_tier_consumed × tier_price(end_tier))
--
--   Edge case: when (S+A) lands exactly on a tier boundary, end_tier_consumed
--   is 0 and the end-tier contribution is 0 — handled cleanly.
--
-- BACKWARD COMPATIBILITY:
--   - bling_free signature unchanged: (uuid, numeric) RETURNS jsonb
--   - bling_credit_purchase signature unchanged: (uuid, numeric) RETURNS jsonb
--   - Return jsonb gets NEW fields appended ('integral_cost_usd',
--     'effective_price_per_bling'). Existing fields preserved.
--   - Transaction memo strings get cost suffix.
--   No schema migration; function-only.
--
-- Idempotency: CREATE OR REPLACE on all three functions. Pre-flight DO $$
-- confirms bling_credit_purchase has Wave 2 step 6 shape (references
-- bling_pots) — re-applying against pre-Wave-2 body would silently strip
-- the donation settlement. Abort if so.
--
-- Blast radius:
--   - 1 new pure function (no side effects).
--   - 2 RPC redefinitions (bling_free, bling_credit_purchase).
--   - No table mutations. Existing transactions, balances, supplies
--     untouched.
--   Rollback: revert the two RPCs to their Wave 2 step 6 bodies; drop
--   the pure function.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm Wave 2 step 6 is applied (bling_credit_purchase
-- references bling_pots). If it doesn't, re-applying via this migration
-- would clobber the donation settlement.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_step_6_applied boolean;
    v_bling_free_exists boolean;
BEGIN
    SELECT (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure)
            LIKE '%bling_pots%')
      INTO v_step_6_applied;
    IF NOT v_step_6_applied THEN
        RAISE EXCEPTION
            'Pre-flight failed: bling_credit_purchase does not reference '
            'bling_pots — Wave 2 step 6 (20260521134000_symmetric_donation_'
            'settlement) appears unapplied. Apply step 6 before Wave 2.5.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='bling_free'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric'
    ) INTO v_bling_free_exists;
    IF NOT v_bling_free_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_free RPC missing.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: Wave 2 step 6 detected; bling_free present.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · NEW pure function bling_curve_integral_cost
-- Returns USD cost of freeing p_amount BLiNG! starting at p_current_supply.
-- IMMUTABLE — no side effects, can be cached / inlined by planner.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_curve_integral_cost(
    p_current_supply numeric,
    p_amount         numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_tier_width   constant numeric := 1000000000;   -- 1B BLiNG! per tier
    v_start_tier   int;
    v_end_tier     int;
    v_cost         numeric(20,6) := 0;
    v_tier         int;
    v_tier_price   numeric(20,6);
    v_start_tier_remaining numeric(20,6);
    v_end_tier_consumed    numeric(20,6);
BEGIN
    IF p_current_supply IS NULL OR p_amount IS NULL THEN
        RAISE EXCEPTION 'p_current_supply and p_amount required';
    END IF;
    IF p_current_supply < 0 THEN
        RAISE EXCEPTION 'p_current_supply must be non-negative';
    END IF;
    IF p_amount < 0 THEN
        RAISE EXCEPTION 'p_amount must be non-negative (% given)', p_amount;
    END IF;
    IF p_amount = 0 THEN
        RETURN 0;
    END IF;

    v_start_tier := floor(p_current_supply / v_tier_width)::int;
    v_end_tier   := floor((p_current_supply + p_amount) / v_tier_width)::int;

    IF v_start_tier = v_end_tier THEN
        -- Entirely within one tier.
        v_tier_price := LEAST(101.0, 1.0 + v_start_tier * 0.01);
        v_cost := p_amount * v_tier_price;
    ELSE
        -- Spans multiple tiers.
        v_start_tier_remaining := (v_start_tier + 1) * v_tier_width - p_current_supply;
        v_end_tier_consumed    := (p_current_supply + p_amount) - v_end_tier * v_tier_width;

        v_tier_price := LEAST(101.0, 1.0 + v_start_tier * 0.01);
        v_cost := v_start_tier_remaining * v_tier_price;

        v_tier := v_start_tier + 1;
        WHILE v_tier <= v_end_tier - 1 LOOP
            v_tier_price := LEAST(101.0, 1.0 + v_tier * 0.01);
            v_cost := v_cost + v_tier_width * v_tier_price;
            v_tier := v_tier + 1;
        END LOOP;

        IF v_end_tier_consumed > 0 THEN
            v_tier_price := LEAST(101.0, 1.0 + v_end_tier * 0.01);
            v_cost := v_cost + v_end_tier_consumed * v_tier_price;
        END IF;
    END IF;

    RETURN round(v_cost, 6);
END;
$function$;

-- Pure function: keep public EXECUTE so RPC + future webhook can call it.
-- No REVOKE.

-- ───────────────────────────────────────────────────────────────────────
-- Block B · bling_free — surface integral cost in return + memo
-- Body preserved verbatim except:
--   - declare v_integral_cost + v_avg_price
--   - compute integral cost from current supply (pre-trade)
--   - include in transaction memo + return jsonb
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_free(p_bee_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_free_active boolean;
    v_total_supply numeric(20,6);
    v_new_total numeric(20,6);
    v_new_freedom_price numeric(20,6);
    v_balance_after numeric(20,6);
    v_tx_id bigint;
    v_hard_cap constant numeric(20,6) := 11222333222111;
    v_integral_cost numeric(20,6);
    v_avg_price numeric(20,6);
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller % may not FREE BLiNG! into bee %', v_caller, p_bee_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

    SELECT free_active, total_supply INTO v_free_active, v_total_supply
      FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
    IF NOT v_free_active THEN RAISE EXCEPTION 'FREE issuance currently paused (free_active=false)'; END IF;
    v_new_total := v_total_supply + p_amount;
    IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'would exceed hard cap (% > %)', v_new_total, v_hard_cap; END IF;

    -- Wave 2.5: compute integral cost over the supply movement.
    v_integral_cost := public.bling_curve_integral_cost(v_total_supply, p_amount);
    v_avg_price := CASE WHEN p_amount > 0 THEN round(v_integral_cost / p_amount, 6) ELSE NULL END;

    v_new_freedom_price := LEAST(101.0, 1.0 + (v_new_total / 1000000000.0) * 0.01);
    UPDATE public.bling_system_state SET total_supply = v_new_total, freedom_price = v_new_freedom_price WHERE id = 1;

    UPDATE public.bees SET bling_balance = bling_balance + p_amount
     WHERE id = p_bee_id RETURNING bling_balance INTO v_balance_after;
    IF v_balance_after IS NULL THEN RAISE EXCEPTION 'bee % not found', p_bee_id; END IF;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, memo)
    VALUES (p_bee_id, 'free', p_amount, v_balance_after,
            'FREE from bonding curve · integral cost $' || v_integral_cost::text
            || ' · avg $' || COALESCE(v_avg_price::text, 'N/A') || '/BLiNG!')
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'tx_id', v_tx_id,
        'balance_after', v_balance_after,
        'new_total_supply', v_new_total,
        'new_freedom_price', v_new_freedom_price,
        'integral_cost_usd', v_integral_cost,
        'effective_price_per_bling', v_avg_price
    );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Block C · bling_credit_purchase — surface integral cost on curve-FREE branch
-- Body preserved verbatim except:
--   - declare v_integral_cost + v_avg_price in curve-FREE block
--   - compute integral cost when curve-FREE fires
--   - include in transaction memo + return jsonb
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
    v_curve_integral_cost numeric(20,6) := 0;
    v_curve_avg_price     numeric(20,6);
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

        -- Wave 2.5: compute integral cost over the curve-FREE supply movement.
        v_curve_integral_cost := public.bling_curve_integral_cost(v_total_supply, v_remaining);
        v_curve_avg_price := CASE
            WHEN v_remaining > 0 THEN round(v_curve_integral_cost / v_remaining, 6)
            ELSE NULL
        END;

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
            'FREE from bonding curve via Stripe credit_purchase · integral cost $'
            || v_curve_integral_cost::text
            || ' · avg $' || COALESCE(v_curve_avg_price::text, 'N/A') || '/BLiNG!'
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
        'curve_integral_cost_usd', v_curve_integral_cost,
        'curve_effective_price_per_bling', v_curve_avg_price,
        'balance_after', v_buyer_balance_after,
        'freedom_price_after', COALESCE(v_new_freedom_price, v_freedom_price),
        'total_supply_after',  COALESCE(v_new_total, v_total_supply)
    );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Permissions: bling_credit_purchase remains service-role only.
-- bling_free remains Bee-callable (its own auth.uid check is the gate).
-- bling_curve_integral_cost is pure / IMMUTABLE; default grant is fine.
-- ───────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric) FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT)
-- =============================================================================
--
-- (1) Pure function exists, IMMUTABLE, returns numeric:
-- SELECT proname,
--        pg_get_function_identity_arguments(oid) AS args,
--        pg_get_function_result(oid) AS returns,
--        provolatile
--   FROM pg_proc WHERE proname='bling_curve_integral_cost' AND pronamespace='public'::regnamespace;
-- → bling_curve_integral_cost | p_current_supply numeric, p_amount numeric | numeric | i (immutable)
--
-- (2) Test the formula at known points:
-- SELECT
--   public.bling_curve_integral_cost(0, 1) AS one_at_zero,                -- $1.00
--   public.bling_curve_integral_cost(0, 1000000000) AS one_billion_at_zero, -- ~$1B + boundary dust
--   public.bling_curve_integral_cost(0, 1500000000) AS one_pt_five_b,      -- 1B × $1.00 + 0.5B × $1.01 = $1.505B
--   public.bling_curve_integral_cost(2500000000, 1) AS one_at_2pt5b,       -- tier 2 → $1.02
--   public.bling_curve_integral_cost(0, 0) AS zero_amount,                  -- $0.00
--   public.bling_curve_integral_cost(10000000000000, 1000000000) AS at_ceiling; -- 1B × $101 = $101B
-- → expected: 1, 1000000000.000000, 1505000000.000000, 1.02, 0, 101000000000.000000
--
-- (3) Round-trip arbitrage check (canon §2.2 scenario, modified for curve-only):
--   Pre-trade supply = 0. Buy 1B then buy another 1B (total 2B). Sell back 2B.
--   Under flat-tier: profit $20M. Under integral: profit ~$0.
-- SELECT
--   public.bling_curve_integral_cost(0, 1000000000) AS cost_buy_1,         -- $1B
--   public.bling_curve_integral_cost(1000000000, 1000000000) AS cost_buy_2, -- $1.01B
--   public.bling_curve_integral_cost(0, 1000000000) + public.bling_curve_integral_cost(1000000000, 1000000000) AS total_cost_buy; -- $2.01B
--   (Selling back is not currently supported; if it were, the symmetric
--    integral would yield the same $2.01B revenue, profit ~$0.)
--
-- (4) bling_free + bling_credit_purchase now reference bling_curve_integral_cost:
-- SELECT
--   (pg_get_functiondef('public.bling_free(uuid,numeric)'::regprocedure) LIKE '%bling_curve_integral_cost%')         AS free_uses_integral,
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%bling_curve_integral_cost%') AS credit_uses_integral,
--   (pg_get_functiondef('public.bling_credit_purchase(uuid,numeric)'::regprocedure) LIKE '%bling_pots%')              AS credit_still_credits_pot;
-- → all three true (Wave 2.5 layered on top of Wave 2 step 6).
--
-- (5) Permissions preserved (no anon/authenticated on credit_purchase):
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name IN ('bling_credit_purchase','bling_free','bling_curve_integral_cost')
--  ORDER BY routine_name, grantee;

-- =============================================================================
-- ROLLBACK (commented)
-- =============================================================================
-- Revert bling_free + bling_credit_purchase to their Wave 2 step 6 bodies
-- (drop the v_integral_cost / v_curve_integral_cost variables and the
-- bling_curve_integral_cost calls; remove the new jsonb fields).
-- DROP FUNCTION public.bling_curve_integral_cost(numeric, numeric);
