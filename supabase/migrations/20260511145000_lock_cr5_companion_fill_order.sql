-- =============================================================================
-- Migration 20260511145000 — CR-5 Companion: bling_fill_order pre-debit alignment
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Monday 2026-05-11 AFTER 20260511140000_lock_cr5_*
--              and BEFORE 20260511150000_lock_role_hierarchy.sql. The timestamp
--              places this companion between CR-5 and the role-hierarchy
--              migration deliberately — apply order is enforced by the
--              pre-flight DO-block (#2 below), not by timestamp alone.
-- Source:      supabase/migrations/20260511140000_lock_cr5_order_book_hardening.sql
--                (the CR-5 migration — see header §3 note 3, which flagged
--                 loud that this companion is required before the live order
--                 book can be activated)
--              supabase/migrations/20260511100000_lock7_precision_tightening.sql
--                (precision baseline: numeric(20,6) on all amounts)
--              supabase/schema-v8-bling-themanual.sql lines 473–545 (the
--                pre-CR-5 bling_fill_order body, denomination commentary,
--                and the BLiNG!↔BLiNG! priced-in-BLiNG! model)
--              supabase/schema-v8-bling-themanual.sql lines 547–615 (the
--                pre-CR-5 bling_place_order body + the bling_credit_purchase
--                caller that uses PERFORM bling_fill_order(...) under
--                service_role — preserved auth-bypass branch)
--
-- Purpose:
--   CR-5 (20260511140000) rewrote bling_place_order to pre-debit the placer's
--   bling_balance at order placement:
--     sell side: bling_balance -= p_amount       (the BLiNG! being offered)
--     buy  side: bling_balance -= p_price * p_amount  (the BLiNG! to pay)
--
--   After CR-5 applies, every NEW row in bling_orders carries an implicit
--   pre-debit (the placer's balance is already reduced). bling_fill_order's
--   existing body, however, still operates on the PRE-CR-5 assumption that
--   the maker's BLiNG! and cash are both live in their bling_balance at fill
--   time — so it debits the maker AGAIN on each fill. The result: a maker
--   whose order fills is double-debited; their bling_balance goes negative
--   by exactly the pre-debit amount.
--
--   This companion realigns bling_fill_order so the maker's fill-time balance
--   movement reflects the post-pre-debit reality:
--
--     sell side, maker:
--       Before: bling_balance += v_net_to_seller - p_fill_amt
--               (received cash, gave up BLiNG! from live balance)
--       After:  bling_balance += v_net_to_seller
--               (received cash; the BLiNG! was already debited at place time —
--                no further BLiNG! debit at fill)
--
--     buy side, maker:
--       Before: bling_balance += -v_cost + p_fill_amt
--               (paid cash, received BLiNG!)
--       After:  bling_balance += p_fill_amt
--               (received BLiNG!; cash was already debited at place time —
--                no further cash debit at fill)
--
--   Taker-side balance math is unchanged from the Lock 7 body — the taker
--   has no pre-debit (they're matching against an open order live, not
--   placing one). Fee math, transaction-row shape, status-update logic,
--   auth.uid() guards, SECURITY DEFINER, search_path, and the
--   service_role caller bypass are all preserved verbatim.
--
-- Why this is its own migration (not part of CR-5):
--   CR-5's header §3 note 3 flagged the gap loud: "Do not activate the
--   order book live until the bling_fill_order companion change ships."
--   Splitting it into a separate migration lets CR-5 apply cleanly Monday
--   morning (it's purely additive — adds bling_cancel_order and tightens
--   bling_place_order) and this companion apply right after as a paired
--   close. The order book remains unsafe to activate between the two
--   applies — but applying both Monday closes the window before Tuesday.
--
-- Partial vs full fill — reconciliation math (worked example):
--   Scenario: maker places sell order amount=1.0 at price=0.95.
--     Place time (CR-5): maker.bling_balance -= 1.0  (pre-debit)
--     Order: {amount=1.0, filled=0.0, status='open'}
--
--   First fill: taker fills 0.3 of the order. v_cost = 0.3 * 0.95 = 0.285.
--     v_fee = 0.285 * sell_fee_pct. v_net_to_seller = 0.285 - v_fee.
--     Pre-CR-5 maker delta: +v_net_to_seller - 0.3
--     Post-CR-5 maker delta: +v_net_to_seller            (this companion)
--     Order: {amount=1.0, filled=0.3, status='open'}
--     Maker's pre-debit pool: implicitly 0.7 BLiNG! "still locked" — it's not
--     in a column; it's reflected by maker.bling_balance being 0.7 short of
--     what it would otherwise be.
--
--   Second fill: taker fills the remaining 0.7. v_cost = 0.665.
--     Maker delta: +v_net_to_seller (the cash for this fill)
--     Order: {amount=1.0, filled=1.0, status='filled'}
--     Pre-debit pool: fully consumed. No refund needed at full-fill because
--     amount = total pre-debit at p_amount; the fill consumes exactly that
--     across all fills (all fills happen at v_order.price, enforced by the
--     RPC — taker can't negotiate).
--
--   Cancel-after-partial-fill: handled by bling_cancel_order (CR-5):
--     v_unfilled = v_order.amount - v_order.filled
--     sell side refund = v_unfilled
--     buy  side refund = v_unfilled * v_order.price
--   Cancel reads the CURRENT v_order.filled value, so the refund formula
--   reflects exactly how much pre-debit remains locked at cancel time.
--   This companion migration's UPDATE to bling_orders.filled at fill time
--   keeps that formula correct on subsequent cancel.
--
-- Buy-side note on fee accounting:
--   The pre-CR-5 body computed v_cost from p_fill_amt * v_order.price, then
--   the maker's net was -v_cost + p_fill_amt and the taker's was
--   +v_net_to_seller - p_fill_amt. The difference (v_fee) was implicit
--   deflation — the v_fee BLiNG! was destroyed (not credited to any
--   treasury bee, not written to a transaction row). This companion
--   PRESERVES that fee-destruction behavior verbatim. The broader question
--   of where order-book fees should route (treasury? burned to system_state?
--   per-Astra fee revenue?) is an economy-design question for Tuesday's
--   BLiNG! day or a downstream session — NOT a Monday companion-migration
--   decision. Flag deliberately, do not silently change.
--
-- bling_credit_purchase caller compatibility:
--   schema-v8-bling-themanual.sql line 614 shows bling_credit_purchase calls
--   bling_fill_order via PERFORM under service_role (auth.uid() bypass branch).
--   The service-role caller bypass is preserved in this body verbatim. The
--   pre-debit-aware fill logic works identically when called from a
--   purchase-flow loop: the maker has been pre-debited at their original
--   place_order call; the credit-purchase taker has cash from the Stripe
--   purchase flow. Both sides reconcile as expected.
--
-- Idempotency:
--   CREATE OR REPLACE on the function. Re-running is safe; the function
--   body is identical on re-apply. REVOKE/GRANT statements are no-ops on
--   re-run. No DDL outside the function body — no tables, columns,
--   constraints, or indexes touched. The pre-flight DO-blocks raise
--   RAISE EXCEPTION on missing prerequisites, so re-running after a
--   successful first apply is benign (preconditions still met; body
--   replacement is a no-op).
--
-- Permission posture:
--   Mirror CR-5's bling_place_order + bling_cancel_order block: REVOKE FROM
--   PUBLIC + anon + authenticated, then GRANT EXECUTE TO authenticated.
--   service_role retains implicit access (used by bling_credit_purchase).
--   This matches the existing v9-hardening posture (migration 23 / 24);
--   the REVOKE/GRANT block is re-asserted explicitly here so that any
--   accidental grant drift between Lock 7 and now is washed out by the
--   re-apply.
--
-- House-style notes:
--   * Single BEGIN/COMMIT — atomic function replacement.
--   * Pre-flight DO blocks fire BEFORE the CREATE OR REPLACE so a missing
--     prerequisite aborts cleanly with no state change.
--   * Verification queries at end (commented — run AFTER COMMIT).
--   * Rollback block at end (commented out, with explicit warning — see
--     notes).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 1: confirm Lock 7 has applied (bling_orders.amount is
-- numeric(20,6)). If not, abort — the pre-debit math the body relies on
-- assumes 6-decimal precision throughout. Running this against (20,3)
-- columns would silently round at every fill and accumulate drift.
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
            'Pre-flight 1 failed: bling_orders.amount not found. '
            'Schema is in unexpected state — investigate before applying.';
    END IF;

    IF v_precision <> 20 OR v_scale <> 6 THEN
        RAISE EXCEPTION
            'Pre-flight 1 failed: bling_orders.amount is numeric(%, %). '
            'Expected (20, 6). Apply Lock 7 (20260511100000) FIRST.',
            v_precision, v_scale;
    END IF;

    RAISE NOTICE 'Pre-flight 1 OK: Lock 7 confirmed applied (bling_orders.amount = numeric(20, 6)).';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight 2: confirm CR-5 has applied (bling_place_order body contains
-- the pre-debit UPDATE). Detect by inspecting pg_get_functiondef for the
-- "bling_balance = bling_balance - v_pre_debit" pattern — the unique
-- signature of CR-5's pre-debit logic. If absent, abort: aligning
-- bling_fill_order to pre-debit semantics against a non-pre-debiting
-- place_order would double-decrement the maker on EVERY fill.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_cr5_applied boolean;
BEGIN
    SELECT (pg_get_functiondef(p.oid) LIKE '%bling_balance = bling_balance - v_pre_debit%')
      INTO v_cr5_applied
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'bling_place_order';

    IF v_cr5_applied IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight 2 failed: bling_place_order function not found. '
            'Unexpected schema state — investigate before applying.';
    END IF;

    IF NOT v_cr5_applied THEN
        RAISE EXCEPTION
            'Pre-flight 2 failed: bling_place_order does not contain the '
            'CR-5 pre-debit UPDATE (looking for "bling_balance = bling_balance - v_pre_debit"). '
            'Apply CR-5 (20260511140000_lock_cr5_order_book_hardening.sql) FIRST. '
            'Applying this companion against a non-pre-debiting place_order '
            'would silently double-decrement makers on every fill.';
    END IF;

    RAISE NOTICE 'Pre-flight 2 OK: CR-5 confirmed applied (bling_place_order contains pre-debit UPDATE).';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Body replacement.
-- Identical to the Lock 7 form (supabase/migrations/20260511100000_*
-- block C.4) EXCEPT for the maker-side balance UPDATE on each side:
--   sell-side maker: drop the "- p_fill_amt" term (BLiNG! was pre-debited
--                    at place time; only the cash credit applies at fill).
--   buy-side  maker: drop the "- v_cost" term (cash was pre-debited at
--                    place time; only the BLiNG! credit applies at fill).
-- Taker-side math, auth, fee computation, transaction inserts, and the
-- final orders-table UPDATE are byte-identical to the Lock 7 body.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_fill_order(
    p_taker_id uuid,
    p_order_id bigint,
    p_fill_amt numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_order         public.bling_orders%ROWTYPE;
    v_maker_handle  text;
    v_taker_handle  text;
    v_remaining     numeric;
    v_cost          numeric;
    v_sell_fee_pct  numeric;
    v_fee           numeric;
    v_net_to_seller numeric;
    v_caller_role   text;
BEGIN
    -- v9.0 security guard:
    -- Allow service-role callers (e.g. bling_credit_purchase chain via
    -- Stripe) to bypass auth.uid() — auth.uid() is NULL under service_role.
    -- For all other paths, require taker_id matches caller's auth.uid().
    -- Preserved verbatim from Lock 7 body.
    v_caller_role := current_setting('request.jwt.claim.role', true);
    IF v_caller_role IS DISTINCT FROM 'service_role' THEN
        IF auth.uid() IS NULL OR auth.uid() <> p_taker_id THEN
            RAISE EXCEPTION 'unauthorized: taker must match auth.uid()';
        END IF;
    END IF;

    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'open' THEN
        RAISE EXCEPTION 'Order not open';
    END IF;

    v_remaining := v_order.amount - v_order.filled;
    IF p_fill_amt > v_remaining OR p_fill_amt < 0.000001 THEN  -- Lock 7 floor
        RAISE EXCEPTION 'Bad fill amount';
    END IF;

    SELECT handle INTO v_maker_handle FROM public.bees WHERE id = v_order.bee_id FOR UPDATE;
    SELECT handle INTO v_taker_handle FROM public.bees WHERE id = p_taker_id     FOR UPDATE;

    SELECT sell_fee_pct INTO v_sell_fee_pct FROM public.bling_system_state WHERE id = 1;

    v_cost          := p_fill_amt * v_order.price;
    v_fee           := v_cost * v_sell_fee_pct;
    v_net_to_seller := v_cost - v_fee;

    -- ╔═════════════════════════════════════════════════════════════════╗
    -- ║ Balance reconciliation: maker side now reflects pre-debit.      ║
    -- ║ Taker side is unchanged — taker has no pre-debit (live match).  ║
    -- ║ See header "Partial vs full fill" worked example.               ║
    -- ╚═════════════════════════════════════════════════════════════════╝
    IF v_order.side = 'sell' THEN
        -- Taker: pays v_cost cash, receives p_fill_amt BLiNG! — unchanged.
        UPDATE public.bees
            SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = p_taker_id;

        -- Maker (post-CR-5): receives v_net_to_seller cash. The p_fill_amt
        -- BLiNG! was pre-debited at place time — do NOT debit again here.
        -- Pre-CR-5 form was: + v_net_to_seller - p_fill_amt.
        UPDATE public.bees
            SET bling_balance = bling_balance + v_net_to_seller
            WHERE id = v_order.bee_id;

        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (p_taker_id,     'bought', p_fill_amt,      v_maker_handle, p_order_id),
                   (v_order.bee_id, 'sold',   v_net_to_seller, v_taker_handle, p_order_id);
    ELSE  -- v_order.side = 'buy'
        -- Maker (post-CR-5): receives p_fill_amt BLiNG!. The v_cost cash was
        -- pre-debited at place time (as part of p_price * p_amount) — do
        -- NOT debit again here. Pre-CR-5 form was: - v_cost + p_fill_amt.
        UPDATE public.bees
            SET bling_balance = bling_balance + p_fill_amt
            WHERE id = v_order.bee_id;

        -- Taker: gives p_fill_amt BLiNG!, receives v_net_to_seller cash —
        -- unchanged.
        UPDATE public.bees
            SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = p_taker_id;

        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (v_order.bee_id, 'bought', p_fill_amt,      v_taker_handle, p_order_id),
                   (p_taker_id,     'sold',   v_net_to_seller, v_maker_handle, p_order_id);
    END IF;

    -- Order-row state update — preserved verbatim from Lock 7 body.
    -- bling_cancel_order (CR-5) reads v_order.filled to compute the unfilled
    -- portion of the pre-debit refund; keeping this UPDATE shape ensures
    -- partial-fill-then-cancel reconciles correctly.
    UPDATE public.bling_orders
        SET filled = filled + p_fill_amt,
            status = CASE WHEN filled + p_fill_amt >= amount THEN 'filled' ELSE 'open' END
        WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'filled', p_fill_amt, 'fee', v_fee);
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- Permissions: re-assert the v9-hardening posture explicitly.
-- CREATE OR REPLACE preserves grants by itself; this block washes out any
-- accidental drift since Lock 7 redeployed the function. Mirrors CR-5's
-- bling_place_order + bling_cancel_order REVOKE/GRANT pattern.
-- ───────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)
    FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)
    TO authenticated;
-- service_role retains implicit access (used by bling_credit_purchase).

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) bling_fill_order signature, SECURITY DEFINER, search_path preserved:
--     SELECT pg_get_function_identity_arguments(p.oid) AS args,
--            p.prosecdef, p.proconfig
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public' AND p.proname = 'bling_fill_order';
--     -- expect: args = 'p_taker_id uuid, p_order_id bigint, p_fill_amt numeric',
--     --         prosecdef = t, proconfig = {search_path=public}.
--
-- (2) Maker-side sell branch no longer subtracts p_fill_amt from bling_balance.
--     The old Lock 7 body had "bling_balance + v_net_to_seller - p_fill_amt"
--     for the maker on sell side; the new body has only "+ v_net_to_seller".
--     Detect the absence of the old shape:
--     SELECT (pg_get_functiondef(p.oid) LIKE '%v_net_to_seller - p_fill_amt%')
--         AS still_double_debits_maker
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public' AND p.proname = 'bling_fill_order';
--     -- expect: still_double_debits_maker = false.
--
-- (3) Buy-side maker branch no longer subtracts v_cost from bling_balance.
--     The old Lock 7 body had "bling_balance - v_cost + p_fill_amt" for the
--     maker on buy side; the new body has only "+ p_fill_amt".
--     SELECT (pg_get_functiondef(p.oid) LIKE '%bling_balance = bling_balance - v_cost + p_fill_amt%')
--         AS still_double_debits_buyer
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public' AND p.proname = 'bling_fill_order';
--     -- expect: still_double_debits_buyer = false.
--
-- (4) Permissions: postgres + service_role + authenticated; NO anon.
--     SELECT grantee, privilege_type
--     FROM information_schema.routine_privileges
--     WHERE routine_schema = 'public' AND routine_name = 'bling_fill_order'
--     ORDER BY grantee;
--     -- expect: postgres + service_role + authenticated. No anon.
--
-- (5) End-to-end smoke (run on branch DB only — production is single-test-bee):
--     -- Setup: two test bees with balances; maker balance = M, taker balance = T.
--     -- a. Maker places a sell order amount=0.1 at price=1.0
--     --    -> maker.bling_balance = M - 0.1  (CR-5 pre-debit)
--     -- b. Taker fills 0.05 of the order
--     --    v_cost = 0.05, v_fee = 0.05 * sell_fee_pct, v_net = 0.05 - v_fee
--     --    -> taker.bling_balance = T - 0.05 + 0.05 = T - 0 + (-v_fee) implicit;
--     --       wait — taker -= v_cost + p_fill_amt = -0.05 + 0.05 = 0 net. Actually
--     --       taker -= v_cost = 0.05 and += p_fill_amt = 0.05. Net 0. Hmm, that
--     --       is correct for price=1.0 — degenerate case. Use price=0.95 for a
--     --       meaningful smoke: v_cost=0.0475, v_net=0.0475*(1-fee), p_fill=0.05.
--     --       Taker net: -0.0475 + 0.05 = +0.0025 (taker profits — they paid 0.0475
--     --       and got 0.05 worth of BLiNG! — that's the spread).
--     --       Maker net (post-pre-debit): + v_net (just the cash side).
--     -- c. Cancel the order. Refund = (0.1 - 0.05) = 0.05 BLiNG! credited back.
--     -- d. Assert sum invariant: total BLiNG! across maker + taker + supply
--     --    decreased by exactly v_fee (fee destruction is preserved).
--
-- (6) Conservation invariant (high-confidence audit query, branch DB only):
--     -- Capture maker.bling_balance + taker.bling_balance + bling_system_state.total_supply
--     -- pre- and post-fill. Delta should equal exactly -v_fee for that fill,
--     -- and zero for cancel-with-refund. If the invariant doesn't hold, this
--     -- companion's reconciliation is wrong — STOP, do not enable live order book.


-- =============================================================================
-- ROLLBACK (commented out — read carefully before considering)
-- =============================================================================
-- ⚠ ROLLBACK requires reverting both this companion AND CR-5's place_order
-- pre-debit logic. Rolling back ONLY this companion against a CR-5'd
-- place_order leaves the order book in the same broken state CR-5 §3 note 3
-- explicitly warned about — every fill double-debits the maker.
--
-- The correct rollback path is to roll back the entire CR-5 + companion pair:
-- redeploy the Lock 7 body of bling_place_order (no pre-debit) AND the Lock 7
-- body of bling_fill_order (the pre-CR-5 maker-debiting form). At that point
-- the order book returns to its v9-hardened-but-place_order-not-pre-debiting
-- state — which is the state production was in before Monday's apply chain.
--
-- A standalone rollback of this file is therefore actively dangerous and
-- should be performed only after rolling back CR-5 first. The Lock 7 form
-- of bling_fill_order is in supabase/migrations/20260511100000_lock7_*
-- block C.4 — copy-paste from there if a rollback chain is needed.
--
-- BEGIN;
-- -- (Re-deploy Lock 7 bling_fill_order body. Use the verbatim block C.4
-- --  from 20260511100000_lock7_precision_tightening.sql.)
-- -- (Re-deploy Lock 7 bling_place_order body. Use the verbatim block C.3
-- --  from 20260511100000_lock7_precision_tightening.sql — no pre-debit.)
-- COMMIT;
