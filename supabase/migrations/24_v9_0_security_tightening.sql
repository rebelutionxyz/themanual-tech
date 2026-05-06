-- =============================================================================
-- Migration 24 — Schema v9.0 Security Tightening Patch
-- =============================================================================
-- Date:        2026-05-06
-- Author:      Claude Opus 4.7 (Code 5) — supervised by Butch
-- Status:      APPLIED to production main (anxmqiehpyznifqgskzc) on 2026-05-06.
--              This file is the source-of-truth record. DO NOT re-apply to a
--              database that already has migration 24 — it is idempotent (REVOKE
--              and GRANT are no-ops if state already matches) but should be
--              skipped to avoid confusion in migration history tools.
--
-- Reason:      Migration 23 used `REVOKE EXECUTE … FROM PUBLIC`, which removes
--              only the PUBLIC pseudo-role grant. Supabase ALSO grants EXECUTE
--              directly to the named roles `anon`, `authenticated`, and
--              `service_role` when functions are created in the public schema.
--              Those direct grants survived the FROM PUBLIC revoke. Result:
--              all 13 BLiNG! / utility functions still showed `anon=X` and
--              `authenticated=X` in proacl after migration 23, and an anon
--              caller could still execute `bling_mint(...)` past the permission
--              gate (failed only on FK due to synthetic test UUID).
--
-- This patch:  Explicitly REVOKEs EXECUTE from `anon` and `authenticated` for
--              all 13 functions, then re-GRANTs EXECUTE TO `authenticated` for
--              the 9 user-callable functions. The 4 remaining functions
--              (`bling_mint`, `bling_credit_purchase`, `handle_forum_post_insert`,
--              `handle_new_bee`) get no re-grant — `service_role` retains
--              implicit access for the first two (Stripe webhook path); trigger
--              functions fire regardless of EXECUTE grant on the function name.
--
-- Verification: All 6 verification checks from migration 23's verification
--               block passed after this patch was applied. Detail in
--               shared/notes/audits/v9-security-production-verification-2026-05-06.md
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- BLOCK 1 — REVOKE EXECUTE from anon, authenticated for all 13 functions
-- -----------------------------------------------------------------------------

-- 9 user-callable / defense-in-depth functions
REVOKE EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text)              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text)     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid)                       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid)                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid)                       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text)                         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid)                       FROM anon, authenticated;

-- 2 service-role-only functions (no re-grant after this)
REVOKE EXECUTE ON FUNCTION public.bling_mint(uuid, numeric)                                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric)                     FROM anon, authenticated;

-- 2 trigger functions (no re-grant — triggers fire regardless of EXECUTE grant)
REVOKE EXECUTE ON FUNCTION public.handle_forum_post_insert()                               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_bee()                                         FROM anon, authenticated;


-- -----------------------------------------------------------------------------
-- BLOCK 2 — GRANT EXECUTE TO authenticated for the 9 user-callable functions
-- -----------------------------------------------------------------------------
-- These functions all have body guards (auth.uid() = p_actor_id) ensuring
-- callers can only act on their own bee_id. Authenticated bees need EXECUTE
-- to call them through the API.

GRANT EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid)                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid)                        TO authenticated;

COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT — NOT inside the txn)
-- =============================================================================
-- These queries confirm the tightening applied correctly. Save as a separate
-- verification script for any future re-deployment.
--
-- -- Check 3 (revised): proacl + named-role privilege checks
-- SELECT proname,
--        (SELECT bool_or(aclitem::text ~ '^=X/') FROM unnest(coalesce(proacl, ARRAY[]::aclitem[])) AS aclitem) AS public_has_execute,
--        has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_can_execute,
--        has_function_privilege('anon',          oid, 'EXECUTE') AS anon_can_execute,
--        has_function_privilege('service_role',  oid, 'EXECUTE') AS service_role_can_execute,
--        proacl::text AS proacl_text
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('bling_mint','bling_credit_purchase','bling_send','bling_create_escrow',
--                   'bling_release_escrow','bling_cancel_escrow','bling_dispute_escrow',
--                   'bling_place_order','bling_fill_order','bump_canonical_fetch_count',
--                   'increment_thread_reply_count','handle_forum_post_insert','handle_new_bee')
-- ORDER BY proname;
--
-- -- Expected results:
-- -- public_has_execute      = false for all 13
-- -- anon_can_execute        = false for all 13
-- -- auth_can_execute        = true  for 9 user-callable
-- -- auth_can_execute        = false for bling_mint, bling_credit_purchase, handle_*
-- -- service_role_can_execute = true for all 13
--
-- -- Check 6: anon exploit attempt against bling_mint MUST fail
-- -- (Run from a session WITHOUT JWT, simulating anon)
-- -- SET LOCAL ROLE anon;
-- -- SELECT public.bling_mint('00000000-0000-0000-0000-000000000bee'::uuid, 100);
-- -- Expected: ERROR 42501: permission denied for function bling_mint


-- =============================================================================
-- ROLLBACK (commented out — for reference only, do not run unless reverting)
-- =============================================================================
-- This rollback restores the post-migration-23 state (which has C3 still open
-- for bling_mint and bling_credit_purchase). Running it makes production LESS
-- secure — only do so if you're explicitly backing out v9.0 entirely.
--
-- BEGIN;
--
-- -- Reverse Block 2 — drop the explicit grants to authenticated
-- REVOKE EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text)              FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text)     FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid)                       FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid)                        FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid)                       FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)          FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)                  FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text)                         FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid)                       FROM authenticated;
--
-- -- Reverse Block 1 — restore the Supabase-default per-role grants
-- GRANT EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text)               TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_create_escrow(uuid, uuid, numeric, text, text)      TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_release_escrow(bigint, uuid)                        TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_cancel_escrow(bigint, uuid)                         TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_dispute_escrow(bigint, uuid)                        TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric)           TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric)                   TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bump_canonical_fetch_count(text)                          TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.increment_thread_reply_count(uuid)                        TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_mint(uuid, numeric)                                 TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.bling_credit_purchase(uuid, numeric)                      TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.handle_forum_post_insert()                                TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.handle_new_bee()                                          TO anon, authenticated;
--
-- COMMIT;

-- 🐝
