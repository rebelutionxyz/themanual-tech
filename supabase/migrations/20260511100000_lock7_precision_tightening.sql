-- =============================================================================
-- Migration 20260511100000 — Lock 7 precision tightening (numeric(20,3) → numeric(20,6))
-- =============================================================================
-- Date:        2026-05-11
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Monday 2026-05-11 as prep for BLiNG! build day Tue 2026-05-12.
-- Source:      shared/canon/federation-tier-1-scoping.md §"Lock 7 — BLiNG! divisibility: 6 decimals"
--              shared/canon/schema-state-current.md §6.1 (Open #21)
--              shared/canon/monday-2026-05-11-prep-scope.md §2a
--              Open #21 (BLiNG! divisibility mismatch — pre-tier-1 ship)
--
-- Purpose:
--   Tightens BLiNG! divisibility from 3 decimal places to 6, per Lock 7 of the
--   federation tier-1 scoping doc. After this migration, 1 BLiNG! divides
--   to 1,000,000 minimum units (0.000001 BLiNG!), matching the precision
--   already used by bling_system_state.mint_price and total_supply.
--
--   Two parts, in one transaction:
--
--     A — Column widening on six numeric(20, 3) columns:
--         bees.bling_balance, bling_transactions.amount, bling_orders.amount,
--         bling_orders.filled, bling_escrows.amount, bling_stripe_events.bling_amount.
--         numeric → numeric widening is metadata-only on existing rows; no
--         data is rewritten and no row touches disk. Cheap.
--
--     B — CHECK constraint update on bling_orders.amount:
--         drop the >= 0.001 floor, install the new >= 0.000001 floor.
--
--     C — CREATE OR REPLACE on four RPCs that hardcode 0.001 / round(..., 3):
--         bling_send (round(p_amount * v_fee_pct, 3) → round(..., 6))
--         bling_free (IF p_amount < 0.001 → < 0.000001)
--         bling_place_order (IF p_amount < 0.001 → < 0.000001)
--         bling_fill_order (IF p_fill_amt < 0.001 → < 0.000001)
--
--         Bodies are preserved verbatim from the live v9 forms (post
--         23_v9_0_security.sql / 24_v9_0_security_tightening.sql) except for
--         the precision deltas. v9 auth.uid() guards, search_path settings,
--         SECURITY DEFINER, and the bling_fill_order service-role bypass are
--         all preserved. CREATE OR REPLACE preserves grants — the
--         REVOKE-FROM-PUBLIC-and-anon-and-authenticated state from migration
--         24 stays in place; service_role and (where applicable) authenticated
--         GRANTs persist.
--
--   bling_credit_purchase is intentionally NOT in this migration's
--   CREATE OR REPLACE list — its body has no 0.001 / round(..., 3) literals
--   and was already redefined by 20260509120000_phase_c_b4_credit_purchase_callsite_fix.sql
--   to call bling_free. Touching it again here would risk re-introducing the
--   bling_mint reference if a copy-paste went wrong.
--
-- Idempotency:
--   Pre-flight DO block inspects information_schema for the current scale
--   on bees.bling_balance:
--     scale = 3 → migration is unapplied, proceed.
--     scale = 6 → migration already applied, RAISE NOTICE and exit cleanly.
--     anything else → unexpected state, raise exception.
--
-- House-style notes:
--   * Single BEGIN/COMMIT — column widenings, CHECK swap, and RPC redeploys
--     all atomic. If any one fails, none apply (mirrors migration 23 / 24 /
--     20260508120000 invariant).
--   * Function bodies use $function$ to match the v9 migrations' style
--     (avoids quoting collision with embedded format() strings).
--   * Verification queries at end (commented out — run AFTER COMMIT).
--   * Rollback block at end (commented out, with explicit warning — see notes).
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm we are on numeric(20, 3). Bail cleanly if already
-- migrated; raise on unexpected state.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_scale integer;
BEGIN
    SELECT numeric_scale INTO v_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'bees'
          AND column_name  = 'bling_balance';

    IF v_scale IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.bees.bling_balance column not found. '
            'Apply schema-v8-bling-themanual.sql first.';
    ELSIF v_scale = 6 THEN
        RAISE NOTICE
            'Lock 7 already applied (bees.bling_balance is numeric(20, 6)). '
            'No-op exit.';
        -- Short-circuit by raising a benign exception that the caller can ignore?
        -- Cleaner: leave the rest of the migration as a series of CREATE OR REPLACE
        -- and CREATE INDEX IF NOT EXISTS / DROP-CREATE-CHECK statements that are
        -- themselves idempotent. The ALTER COLUMN TYPE statements below are
        -- harmless if the column is already (20,6) — the type is unchanged and
        -- Postgres no-ops. Likewise the DROP/ADD CHECK is idempotent.
    ELSIF v_scale = 3 THEN
        RAISE NOTICE 'Pre-flight OK: bees.bling_balance is numeric(20, 3). Proceeding with Lock 7.';
    ELSE
        RAISE EXCEPTION
            'Pre-flight failed: bees.bling_balance has unexpected numeric_scale %. '
            'Expected 3 (pre-Lock-7) or 6 (post-Lock-7). Investigate before proceeding.',
            v_scale;
    END IF;
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · Column widenings  (numeric(20, 3) → numeric(20, 6))
-- Metadata-only on existing rows; no data rewrite.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bees
    ALTER COLUMN bling_balance TYPE numeric(20, 6);

ALTER TABLE public.bling_transactions
    ALTER COLUMN amount TYPE numeric(20, 6);

ALTER TABLE public.bling_orders
    ALTER COLUMN amount TYPE numeric(20, 6),
    ALTER COLUMN filled TYPE numeric(20, 6);

ALTER TABLE public.bling_escrows
    ALTER COLUMN amount TYPE numeric(20, 6);

ALTER TABLE public.bling_stripe_events
    ALTER COLUMN bling_amount TYPE numeric(20, 6);

-- ───────────────────────────────────────────────────────────────────────
-- Block B · CHECK constraint update on bling_orders.amount
-- Drop the v8 >= 0.001 floor, install the Lock 7 >= 0.000001 floor.
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.bling_orders
    DROP CONSTRAINT IF EXISTS bling_orders_amount_check;

ALTER TABLE public.bling_orders
    ADD CONSTRAINT bling_orders_amount_check CHECK (amount >= 0.000001);

-- ───────────────────────────────────────────────────────────────────────
-- Block C · RPC bodies — replace 0.001 / round(..., 3) with 0.000001 / round(..., 6)
-- Bodies copied verbatim from 23_v9_0_security.sql (post-v9 deployed forms),
-- with only the precision literals changed. Comments inside the bodies note
-- where the change happened; otherwise unchanged.
-- ───────────────────────────────────────────────────────────────────────

-- ----- C.1 bling_send: round(..., 3) → round(..., 6) -----
CREATE OR REPLACE FUNCTION public.bling_send(
    p_sender_id    uuid,
    p_recipient_id uuid,
    p_amount       numeric,
    p_category     text DEFAULT 'general',
    p_memo         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_sender_balance   numeric;
    v_sender_handle    text;
    v_recipient_handle text;
    v_fee_pct          numeric;
    v_fee              numeric := 0;
    v_total_debit      numeric;
    v_treasury_id      constant uuid := '00000000-0000-0000-0000-000000000bee'::uuid;
BEGIN
    -- v9.0 security guard: caller must be the sender
    IF auth.uid() IS NULL OR auth.uid() <> p_sender_id THEN
        RAISE EXCEPTION 'unauthorized: sender must match auth.uid()';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    IF p_sender_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot send to yourself';
    END IF;
    IF p_category NOT IN ('general','kindness','productivity','learning') THEN
        RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;

    IF p_category = 'general' THEN
        SELECT bee_to_bee_fee_pct INTO v_fee_pct FROM public.bling_system_state WHERE id = 1;
        v_fee := round(p_amount * v_fee_pct, 6);   -- Lock 7: was round(..., 3)
    END IF;

    v_total_debit := p_amount + v_fee;

    SELECT bling_balance, handle INTO v_sender_balance, v_sender_handle
        FROM public.bees WHERE id = p_sender_id FOR UPDATE;
    IF v_sender_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found';
    END IF;
    IF v_sender_balance < v_total_debit THEN
        RAISE EXCEPTION 'Insufficient balance (need % including % fee)', v_total_debit, v_fee;
    END IF;

    SELECT handle INTO v_recipient_handle
        FROM public.bees WHERE id = p_recipient_id FOR UPDATE;
    IF v_recipient_handle IS NULL THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance - v_total_debit WHERE id = p_sender_id;
    UPDATE public.bees SET bling_balance = bling_balance + p_amount      WHERE id = p_recipient_id;

    INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
        VALUES
            (p_sender_id,    'sent',     p_category, p_amount, v_recipient_handle, p_memo),
            (p_recipient_id, 'received', p_category, p_amount, v_sender_handle,    p_memo);

    IF v_fee > 0 THEN
        PERFORM 1 FROM public.bees WHERE id = v_treasury_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Treasury bee not found (expected id %)', v_treasury_id;
        END IF;
        UPDATE public.bees SET bling_balance = bling_balance + v_fee WHERE id = v_treasury_id;

        INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
            VALUES
                (p_sender_id,  'fee',          p_category, v_fee, 'combtreasury',
                 format('%.1f%% bee-to-bee fee on send to @%s', v_fee_pct * 100, v_recipient_handle)),
                (v_treasury_id,'fee_received', p_category, v_fee, v_sender_handle,
                 format('Fee from @%s on send to @%s', v_sender_handle, v_recipient_handle));
    END IF;

    RETURN jsonb_build_object('success', true, 'fee', v_fee, 'category', p_category);
END;
$function$;


-- ----- C.2 bling_free: IF p_amount < 0.001 → < 0.000001 -----
-- NOTE on language-firewall debt: this body still raises 'Mint below minimum
-- unit' and INSERTs a transaction row with type='minted'. That is preserved
-- verbatim per the explicit defer-to-own-session in handoff-current.md
-- (the type CHECK still allows 'minted' because removing it requires a paired
-- audit). Lock 7 only changes the precision literal. The M-word debt is out
-- of scope for this migration — see Open / handoff loose-ends list.
CREATE OR REPLACE FUNCTION public.bling_free(
    p_bee_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_state       public.bling_system_state%ROWTYPE;
    v_new_supply  numeric;
    v_new_price   numeric;
    v_hard_cap    constant numeric := 11222333222111;
    v_curve_inc   constant numeric := 0.01;
    v_curve_ceil  constant numeric := 101;
BEGIN
    IF p_amount < 0.000001 THEN  -- Lock 7: was < 0.001
        RAISE EXCEPTION 'Mint below minimum unit';
    END IF;

    SELECT * INTO v_state FROM public.bling_system_state WHERE id = 1 FOR UPDATE;

    IF NOT v_state.mint_active THEN
        RAISE EXCEPTION 'Minting is paused (mint_active=false)';
    END IF;

    v_new_supply := v_state.total_supply + p_amount;
    IF v_new_supply > v_hard_cap THEN
        RAISE EXCEPTION 'BLiNG! hard cap reached';
    END IF;

    v_new_price := least(v_curve_ceil, 1 + v_curve_inc * floor(v_new_supply / 1e9));

    UPDATE public.bling_system_state
        SET total_supply = v_new_supply,
            mint_price   = v_new_price
        WHERE id = 1;

    UPDATE public.bees SET bling_balance = bling_balance + p_amount WHERE id = p_bee_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, memo)
        VALUES (p_bee_id, 'minted', p_amount,
                format('Minted %s BLiNG! @ %s ⬡ · supply: %s',
                       p_amount, v_state.mint_price, v_new_supply));

    RETURN jsonb_build_object(
        'success', true,
        'new_supply', v_new_supply,
        'new_mint_price', v_new_price
    );
END;
$function$;


-- ----- C.3 bling_place_order: IF p_amount < 0.001 → < 0.000001 -----
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
    v_balance numeric;
    v_id      bigint;
BEGIN
    -- v9.0 security guard
    IF auth.uid() IS NULL OR auth.uid() <> p_bee_id THEN
        RAISE EXCEPTION 'unauthorized: bee must match auth.uid()';
    END IF;

    IF p_side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'Invalid side'; END IF;
    IF p_price <= 0 OR p_amount < 0.000001 THEN RAISE EXCEPTION 'Bad price/amount'; END IF;  -- Lock 7: was < 0.001

    SELECT bling_balance INTO v_balance FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Bee not found'; END IF;
    IF p_side = 'sell' AND v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance to place sell';
    END IF;
    IF p_side = 'buy' AND v_balance < (p_price * p_amount) THEN
        RAISE EXCEPTION 'Insufficient balance to place buy';
    END IF;

    INSERT INTO public.bling_orders (bee_id, side, price, amount)
        VALUES (p_bee_id, p_side, p_price, p_amount)
        RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'order_id', v_id);
END;
$function$;


-- ----- C.4 bling_fill_order: IF p_fill_amt < 0.001 → < 0.000001 -----
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
    -- Allow service-role callers (e.g. bling_credit_purchase chain via Stripe)
    -- to bypass auth.uid() check, since auth.uid() is NULL under service-role.
    -- For all other paths, require taker_id matches caller's auth.uid().
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
    IF p_fill_amt > v_remaining OR p_fill_amt < 0.000001 THEN  -- Lock 7: was < 0.001
        RAISE EXCEPTION 'Bad fill amount';
    END IF;

    SELECT handle INTO v_maker_handle FROM public.bees WHERE id = v_order.bee_id FOR UPDATE;
    SELECT handle INTO v_taker_handle FROM public.bees WHERE id = p_taker_id     FOR UPDATE;

    SELECT sell_fee_pct INTO v_sell_fee_pct FROM public.bling_system_state WHERE id = 1;

    v_cost          := p_fill_amt * v_order.price;
    v_fee           := v_cost * v_sell_fee_pct;
    v_net_to_seller := v_cost - v_fee;

    IF v_order.side = 'sell' THEN
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = p_taker_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = v_order.bee_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (p_taker_id,     'bought', p_fill_amt,      v_maker_handle, p_order_id),
                   (v_order.bee_id, 'sold',   v_net_to_seller, v_taker_handle, p_order_id);
    ELSE
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = v_order.bee_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = p_taker_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (v_order.bee_id, 'bought', p_fill_amt,      v_taker_handle, p_order_id),
                   (p_taker_id,     'sold',   v_net_to_seller, v_maker_handle, p_order_id);
    END IF;

    UPDATE public.bling_orders
        SET filled = filled + p_fill_amt,
            status = CASE WHEN filled + p_fill_amt >= amount THEN 'filled' ELSE 'open' END
        WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'filled', p_fill_amt, 'fee', v_fee);
END;
$function$;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
-- (1) All six BLiNG! amount columns are now numeric(20, 6):
--     SELECT table_name, column_name, numeric_precision, numeric_scale
--     FROM information_schema.columns
--     WHERE table_schema = 'public'
--       AND (
--           (table_name = 'bees'                AND column_name = 'bling_balance') OR
--           (table_name = 'bling_transactions'  AND column_name = 'amount')        OR
--           (table_name = 'bling_orders'        AND column_name IN ('amount','filled')) OR
--           (table_name = 'bling_escrows'       AND column_name = 'amount')        OR
--           (table_name = 'bling_stripe_events' AND column_name = 'bling_amount')
--       )
--     ORDER BY table_name, column_name;
--     -- expect: 6 rows, each with (20, 6).
--
-- (2) bling_orders.amount CHECK is the new floor:
--     SELECT pg_get_constraintdef(c.oid)
--     FROM pg_constraint c
--     JOIN pg_class t ON t.oid = c.conrelid
--     WHERE t.relname = 'bling_orders' AND c.conname = 'bling_orders_amount_check';
--     -- expect: CHECK ((amount >= 0.000001))
--
-- (3) RPC bodies no longer reference the old precision literals:
--     SELECT proname
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public'
--       AND proname IN ('bling_send','bling_free','bling_place_order','bling_fill_order')
--       AND (prosrc LIKE '%0.001%' OR prosrc LIKE '%round(% 3)%' OR prosrc LIKE '%round(%, 3)%');
--     -- expect: zero rows.
--
-- (4) Grants preserved (no anon / authenticated EXECUTE on bling_free; both
--     on the other three; service_role implicit on all):
--     SELECT routine_name, grantee, privilege_type
--     FROM information_schema.routine_privileges
--     WHERE routine_schema = 'public'
--       AND routine_name IN ('bling_send','bling_free','bling_place_order','bling_fill_order')
--     ORDER BY routine_name, grantee;
--     -- expect: bling_send/place_order/fill_order have authenticated EXECUTE;
--     --         bling_free does not. None have anon. service_role implicit.
--
-- (5) End-to-end smoke (run on branch DB only — production is single-test-bee):
--     -- Build a 0.000001 send between two test bees authenticated as the sender.
--     -- Should succeed; should generate two tx rows of type 'sent'/'received'.
--     -- Then attempt a 0.0000001 send → should fail with 'Amount must be positive'
--     -- (or with a fee-rounding-to-zero edge case; investigate the v_fee math).


-- =============================================================================
-- ROLLBACK (commented out — read carefully before considering)
-- =============================================================================
-- ⚠ ROLLBACK IS NOT LOSSLESS.
-- Narrowing numeric(20, 6) → numeric(20, 3) truncates the four extra decimal
-- places. Any value with non-zero digits in the 10⁻⁴ — 10⁻⁶ range will be
-- silently rounded down on the type narrowing. This is destructive.
--
-- Rolling back the RPC bodies would also re-introduce the 0.001 / round(..., 3)
-- floors, which are inconsistent with any column that retained (20, 6) values
-- captured between the apply and the rollback.
--
-- Only attempt rollback if (a) you are immediately post-apply and have not
-- accepted any transaction at sub-0.001 precision, and (b) you have verified
-- via SELECT max(scale(bling_balance)) FROM public.bees etc. that no row has
-- meaningful precision below 3 places.
--
-- BEGIN;
-- ALTER TABLE public.bees                ALTER COLUMN bling_balance TYPE numeric(20, 3);
-- ALTER TABLE public.bling_transactions  ALTER COLUMN amount        TYPE numeric(20, 3);
-- ALTER TABLE public.bling_orders
--     ALTER COLUMN amount TYPE numeric(20, 3),
--     ALTER COLUMN filled TYPE numeric(20, 3);
-- ALTER TABLE public.bling_escrows       ALTER COLUMN amount        TYPE numeric(20, 3);
-- ALTER TABLE public.bling_stripe_events ALTER COLUMN bling_amount  TYPE numeric(20, 3);
--
-- ALTER TABLE public.bling_orders DROP CONSTRAINT IF EXISTS bling_orders_amount_check;
-- ALTER TABLE public.bling_orders ADD  CONSTRAINT bling_orders_amount_check CHECK (amount >= 0.001);
--
-- -- RPC body rollbacks: re-deploy the v9-form bodies with 0.001 / round(..., 3).
-- -- See 23_v9_0_security.sql blocks C.1, C.6, C.7 for bling_send / bling_place_order /
-- -- bling_fill_order. bling_free's body before this migration was identical to v8's
-- -- bling_mint body (renamed in 20260508120100_phase_c_b4_bling_rename.sql).
-- COMMIT;
