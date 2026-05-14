-- =============================================================================
-- Migration 20260514150000 — handle_new_bee() search_path hygiene
-- =============================================================================
-- Date:     2026-05-14
-- Author:   Code 2 (Claude) — supervised by Butch
--
-- Why:
--   Today's ratification (commit 717d316, migration 20260512090000) captured
--   the production handle_new_bee() body verbatim. That body declared
--   SET search_path TO 'public' only — NOT 'public, pg_temp' as migration
--   23 Block D hardened on four other trigger/util functions. The
--   absence of pg_temp pinning on a SECURITY DEFINER function is a
--   defense-in-depth gap: in pathological cases, search_path manipulation
--   can route an unqualified function call through a session-temp schema
--   carrying a same-named shim.
--
--   Tighten to the canonical pattern used elsewhere in the v9 hardening.
--   ALTER FUNCTION ... SET preserves the function body, the
--   SECURITY DEFINER posture, all grants, and the trigger binding —
--   only proconfig changes.
--
-- Reference:
--   • 23_v9_0_security.sql Block D — search_path hardening on
--     other SECURITY DEFINER trigger/util functions
--   • shared/canon/auto-create-bee-trigger-analysis.md §6a — recovery + ratify
--   • Migration 20260512090000 — ratification of the body
--
-- Scope:
--   Single object: public.handle_new_bee() proconfig.
--   No body change. No grant change. No trigger change.
--
-- Idempotency:
--   ALTER FUNCTION ... SET search_path is idempotent — re-applying the
--   same SET is a no-op.
--
-- Rollback:
--   ALTER FUNCTION public.handle_new_bee() SET search_path TO 'public';
--   (the prior single-element value, captured 2026-05-14 pre-ratification.)
-- =============================================================================

BEGIN;

-- Pre-flight — confirm the function still exists. Without it, the ALTER
-- below would silently fail (actually it raises 'function does not exist'
-- which is fine, but explicit guard keeps the error legible).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname = 'handle_new_bee'
    ) THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.handle_new_bee() not found. This '
            'hygiene migration alters an existing function — it does not '
            'create one. Investigate the missing function before retrying.';
    END IF;
END $$;

ALTER FUNCTION public.handle_new_bee()
    SET search_path = public, pg_temp;

COMMIT;

-- =============================================================================
-- Verification — run AFTER apply (outside this transaction):
--   SELECT p.proconfig
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public' AND p.proname='handle_new_bee';
-- Expected: proconfig contains 'search_path=public, pg_temp' (replaces the
--           prior 'search_path=public').
--
--   SELECT pg_get_functiondef(p.oid)
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public' AND p.proname='handle_new_bee';
-- Expected: body unchanged from the ratified body; SET search_path line
--           now reads SET search_path TO 'public', 'pg_temp'.
-- =============================================================================
