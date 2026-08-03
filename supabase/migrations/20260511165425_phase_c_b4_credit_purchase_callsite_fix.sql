-- =============================================================================
-- Migration 20260509120000 — Phase C B-4 follow-up: bling_credit_purchase callsite fix
-- =============================================================================
-- Date:        2026-05-09
-- Author:      Code 2 (Claude) — supervised by Butch
-- Status:      UNAPPLIED. Apply during BLiNG! build day pre-flight (Tue 2026-05-12),
--              ahead of any Stripe webhook activation.
-- Source:      shared/canon/cancel-recovery-adr.md (Appendix item 3)
--              shared/notes/audits/schema-architect-phase-c-foundations-2026-05-08.md
--
-- Purpose:
--   Closes the latent failure introduced by the B-4 rename
--   (20260508120100_phase_c_b4_bling_rename.sql). That migration ran:
--       ALTER FUNCTION public.bling_mint(uuid, numeric) RENAME TO bling_free;
--   which preserves the renamed function's own body, grants, SECURITY DEFINER,
--   and search_path — but does NOT rewrite other functions whose bodies
--   reference bling_mint by name.
--
--   public.bling_credit_purchase has a body that ends with the curve-FREE
--   branch:
--       IF v_remaining > 0 THEN
--           PERFORM public.bling_mint(p_bee_id, v_remaining);
--           v_filled := v_filled + v_remaining;
--       END IF;
--
--   PL/pgSQL resolves function references at execution time, not at
--   definition time. After the rename, every call into this branch raises
--       ERROR: function public.bling_mint(uuid, numeric) does not exist
--   With the order book essentially empty (single test bee in production),
--   every Stripe purchase falls into this branch — so every purchase will
--   error.
--
--   The bug is currently latent because Stripe is deferred per project
--   CLAUDE.md; the webhook handler at freedomblings.com is not active.
--   This migration MUST land before the Stripe webhook is activated on
--   BLiNG! build day. See Open #CR-1 in cancel-recovery-adr.md.
--
-- Approach:
--   CREATE OR REPLACE FUNCTION public.bling_credit_purchase(...) with body
--   identical to the v8 form except the single PERFORM line in the curve
--   branch:
--       PERFORM public.bling_mint(p_bee_id, v_remaining);   -- broken
--       PERFORM public.bling_free(p_bee_id, v_remaining);   -- fixed
--   Signature, return shape, SECURITY DEFINER, search_path, the entire
--   fill-from-order-book loop, and locking semantics are preserved exactly.
--
-- Grants:
--   CREATE OR REPLACE on the same signature preserves the existing
--   REVOKE EXECUTE FROM PUBLIC + anon + authenticated installed by
--   23_v9_0_security.sql (block C.9) and 24_v9_0_security_tightening.sql
--   (Block 1). Service-role retains implicit access — Stripe webhook path
--   keeps working. No re-issue of REVOKEs needed; a defensive re-REVOKE
--   would be idempotent but is omitted here to keep this migration minimal.
--
-- Idempotency:
--   The pre-flight DO $$ block confirms the rename precondition
--   (bling_free(uuid, numeric) exists; bling_mint(uuid, numeric) does not).
--   If the precondition does not hold, the migration aborts with an
--   explicit message rather than running CREATE OR REPLACE against a
--   still-misnamed catalog. CREATE OR REPLACE is intrinsically idempotent
--   on identical body — re-running this migration after a successful first
--   apply re-installs the same definition.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm the rename precondition.
--   bling_free(uuid, numeric) MUST exist.
--   bling_mint(uuid, numeric) MUST be gone.
-- If either condition fails, abort. Don't redefine bling_credit_purchase
-- against a still-misnamed catalog — that would mask the real problem.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_mint_oid oid;
    v_free_oid oid;
BEGIN
    SELECT p.oid INTO v_mint_oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_mint'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric';

    SELECT p.oid INTO v_free_oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_free'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric';

    IF v_free_oid IS NULL THEN
        RAISE EXCEPTION
            'bling_free(uuid, numeric) is missing — rename migration 20260508120100 has not been applied. Apply it first.';
    END IF;

    IF v_mint_oid IS NOT NULL THEN
        RAISE EXCEPTION
            'bling_mint(uuid, numeric) still exists — rename migration 20260508120100 reports incomplete. Investigate before redefining bling_credit_purchase.';
    END IF;

    RAISE NOTICE
        'Precondition OK: bling_free exists and bling_mint is gone. Redefining bling_credit_purchase to call bling_free.';
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- bling_credit_purchase — Stripe webhook entry point
-- Body is identical to the v8-deployed version (schema-v8-bling-themanual.sql
-- §10, lines 586–626) except the single PERFORM line inside the curve
-- branch, which now calls bling_free instead of bling_mint.
--
-- CREATE OR REPLACE preserves the function OID, REVOKEs from PUBLIC + anon +
-- authenticated (per migrations 23 C.9 and 24 Block 1), and any other
-- catalog state attached to this signature.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_credit_purchase(
    p_bee_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mint_price numeric;
    v_remaining  numeric := p_amount;
    v_filled     numeric := 0;
    v_fill_amt   numeric;
    v_order      record;
BEGIN
    SELECT mint_price INTO v_mint_price
        FROM public.bling_system_state WHERE id = 1 FOR UPDATE;

    FOR v_order IN
        SELECT id, amount, filled
        FROM public.bling_orders
        WHERE side = 'sell' AND status = 'open' AND price <= v_mint_price
        ORDER BY price ASC, created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining <= 0;
        v_fill_amt := least(v_remaining, v_order.amount - v_order.filled);
        PERFORM public.bling_fill_order(p_bee_id, v_order.id, v_fill_amt);
        v_filled    := v_filled    + v_fill_amt;
        v_remaining := v_remaining - v_fill_amt;
    END LOOP;

    -- FREE the rest from the bonding curve. If mint_active=false this raises
    -- and the whole tx rolls back, which is correct: Stripe webhook returns
    -- 5xx, Stripe retries, idempotency table prevents double-credit, and the
    -- operator can flip mint_active back on. (Renamed from bling_mint to
    -- bling_free on 2026-05-08 per the language firewall; this migration
    -- closes the corresponding callsite.)
    IF v_remaining > 0 THEN
        PERFORM public.bling_free(p_bee_id, v_remaining);
        v_filled := v_filled + v_remaining;
    END IF;

    RETURN jsonb_build_object('success', true, 'filled', v_filled);
END;
$$;

COMMIT;


-- =============================================================================
-- VERIFICATION (post-COMMIT)
-- =============================================================================
-- (1) bling_credit_purchase body now references bling_free, not bling_mint:
--     SELECT 'broken'  WHERE pg_get_functiondef('public.bling_credit_purchase(uuid, numeric)'::regprocedure) LIKE '%public.bling_mint(%';
--     SELECT 'fixed'   WHERE pg_get_functiondef('public.bling_credit_purchase(uuid, numeric)'::regprocedure) LIKE '%public.bling_free(%';
--     -- expect: zero 'broken' rows; one 'fixed' row.
--
-- (2) Signature, return shape, SECURITY DEFINER, search_path unchanged:
--     SELECT proname,
--            pg_get_function_identity_arguments(oid) AS args,
--            prosecdef AS security_definer,
--            proconfig AS function_settings
--     FROM pg_proc
--     WHERE proname = 'bling_credit_purchase'
--       AND pronamespace = 'public'::regnamespace;
--     -- expect: bling_credit_purchase | p_bee_id uuid, p_amount numeric | t | {search_path=public}
--
-- (3) Grants preserved across CREATE OR REPLACE — no anon / authenticated EXECUTE:
--     SELECT grantee, privilege_type
--     FROM information_schema.routine_privileges
--     WHERE routine_schema = 'public' AND routine_name = 'bling_credit_purchase';
--     -- expect: postgres / service_role rows only; no anon, no authenticated.
--
-- (4) End-to-end smoke (run ONLY on a non-production branch DB):
--     -- Pick a non-treasury test bee with a known balance, then:
--     SELECT public.bling_credit_purchase(
--         '<test-bee-uuid>'::uuid,
--         0.001                 -- current bling_free minimum unit; Lock 7 tightens to 0.000001
--     );
--     -- expect: jsonb {"success": true, "filled": 0.001}
--     -- post-call: SELECT total_supply FROM bling_system_state WHERE id = 1;
--     --           should be 0.001 higher than before the call (curve-FREE path exercised).
--     -- post-call: SELECT bling_balance FROM bees WHERE id = '<test-bee-uuid>';
--     --           should be 0.001 higher.

-- =============================================================================
-- ROLLBACK (commented out — only valid if the rename itself is also reverted)
-- =============================================================================
-- This rollback only makes sense if migration 20260508120100 has also been
-- rolled back (bling_free renamed back to bling_mint). Running this against
-- a DB where bling_mint does not exist will install a freshly-broken
-- bling_credit_purchase. Do not run otherwise.
--
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.bling_credit_purchase(
--     p_bee_id uuid,
--     p_amount numeric
-- ) RETURNS jsonb
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $$
-- DECLARE
--     v_mint_price numeric;
--     v_remaining  numeric := p_amount;
--     v_filled     numeric := 0;
--     v_fill_amt   numeric;
--     v_order      record;
-- BEGIN
--     SELECT mint_price INTO v_mint_price FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
--     FOR v_order IN
--         SELECT id, amount, filled FROM public.bling_orders
--         WHERE side = 'sell' AND status = 'open' AND price <= v_mint_price
--         ORDER BY price ASC, created_at ASC FOR UPDATE
--     LOOP
--         EXIT WHEN v_remaining <= 0;
--         v_fill_amt := least(v_remaining, v_order.amount - v_order.filled);
--         PERFORM public.bling_fill_order(p_bee_id, v_order.id, v_fill_amt);
--         v_filled    := v_filled    + v_fill_amt;
--         v_remaining := v_remaining - v_fill_amt;
--     END LOOP;
--     IF v_remaining > 0 THEN
--         PERFORM public.bling_mint(p_bee_id, v_remaining);
--         v_filled := v_filled + v_remaining;
--     END IF;
--     RETURN jsonb_build_object('success', true, 'filled', v_filled);
-- END;
-- $$;
-- COMMIT;
