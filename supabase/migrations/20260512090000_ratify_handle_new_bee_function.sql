-- =============================================================================
-- Migration 20260512090000 — Ratify handle_new_bee() into the repo
-- =============================================================================
-- Date:        2026-05-12 (placeholder authored); ratified 2026-05-14
-- Author:      Code 2 (Claude) — supervised by Butch
-- Status:      RATIFIED. Body below captured via pg_get_functiondef() against
--              production catalog 2026-05-14 on branch
--              wed-canon-lock-2026-05-13. CREATE OR REPLACE with this exact
--              body is a no-op against production — migration is purely a
--              documentation / repo-hygiene ratification.
-- Source:      shared/canon/auto-create-bee-trigger-analysis.md (§6a — the
--              recommendation to recover and ratify the function body)
--              shared/canon/bling-build-day-2026-05-12-preflight.md §5
--              shared/notes/audits/schema-architect-phase-c-foundations-2026-05-08.md
--              (lines 127, 245 — Phase C audit confirming trigger chain works)
--
-- Purpose:
--   Bring the body of public.handle_new_bee() — which today exists ONLY
--   in the production catalog (created out-of-repo via Supabase Studio
--   early in the project's life) — under repo control. Two of our three
--   most recent migrations (23_v9_0_security.sql:598 and
--   24_v9_0_security_tightening.sql:58) REVOKE EXECUTE on this function
--   without the function ever having been authored in repo. Future
--   branch-DB or fresh-stack work will fail without the body in tree.
--
--   Lock 2c (account linking, BLiNG! build day Tue 2026-05-12) is the
--   first piece of work that needs to reason about what this trigger does
--   under federation. Without the body, that reasoning is comment-level
--   inference. This migration closes the gap so Lock 2c can ship.
--
-- Why first thing Tuesday morning:
--   The chain auth.users INSERT → handle_new_bee → bees INSERT →
--   bees_create_profile → bee_profiles INSERT is **load-bearing for
--   every signup, including the test bee used during Tuesday's BLiNG!
--   work**. Ratifying the body before any other Tuesday work means
--   Lock 2c sketches operate against a known-good function definition.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OPERATOR INSTRUCTIONS — TUESDAY MORNING
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Step 1 — Recover the function definition from production.
--
--   Run ONE of the following against the production catalog:
--
--     (a) Via Supabase Studio SQL editor:
--           SELECT pg_get_functiondef('public.handle_new_bee'::regproc);
--
--     (b) Via supabase CLI / psql:
--           psql "$SUPABASE_DB_URL" -c \
--             "SELECT pg_get_functiondef('public.handle_new_bee'::regproc);"
--
--     (c) Via the Supabase MCP server:
--           mcp__claude_ai_Supabase__execute_sql with
--           query = "SELECT pg_get_functiondef('public.handle_new_bee'::regproc);"
--
-- Step 2 — Paste the result into the placeholder block below.
--
--   The result will be a complete CREATE OR REPLACE FUNCTION statement
--   ending in a semicolon. Replace the entire `-- BEGIN PASTE` /
--   `-- END PASTE` block (preserving those marker comments for future
--   audits to find) with the captured definition.
--
--   Verify the captured definition declares:
--     LANGUAGE plpgsql
--     SECURITY DEFINER
--     and (per migration 23 Block D pattern) SET search_path = public,
--       pg_temp — if it does NOT, flag this to Butch before applying.
--       The absence of search_path hardening on a SECURITY DEFINER
--       trigger function is itself a security finding worth its own
--       conversation.
--
-- Step 3 — Apply the migration.
--
--   Because CREATE OR REPLACE preserves grants and dependent triggers,
--   re-applying the captured body is a no-op behaviorally. The migration
--   is purely a documentation / repo-hygiene exercise.
--
-- Step 4 — Verify (queries in the verification block below).
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Idempotency:
--   CREATE OR REPLACE on the same body is a no-op. Re-running this
--   migration after a successful first apply re-installs the same
--   definition. The pre-flight DO-block aborts cleanly if the function
--   does not exist in production — you cannot accidentally "ratify" a
--   missing function into existence with a placeholder body.
--
-- Permission posture (preserved by CREATE OR REPLACE):
--   Migration 23 (line 598) and migration 24 (line 58) already REVOKE
--   EXECUTE on this function FROM PUBLIC and FROM anon, authenticated.
--   Triggers fire regardless of EXECUTE grant; this REVOKE chain is
--   defense-in-depth. CREATE OR REPLACE preserves the existing REVOKE
--   state, so this migration does NOT need to re-issue them.
--
-- Trigger preservation:
--   The on_auth_user_created trigger on auth.users references this
--   function. CREATE OR REPLACE swaps the function body but does NOT
--   touch the trigger definition. The trigger continues to fire on
--   the same event with the same timing.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight — confirm public.handle_new_bee() exists in the catalog.
-- If it doesn't, abort: "ratifying" a function that isn't there would
-- silently install whatever body is below (placeholder included),
-- which could break the auth.users → bees trigger chain.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_oid       oid;
    v_secdef    boolean;
    v_lang      text;
    v_config    text[];
BEGIN
    SELECT p.oid, p.prosecdef, l.lanname, p.proconfig
      INTO v_oid, v_secdef, v_lang, v_config
      FROM pg_proc p
      JOIN pg_language l ON l.oid = p.prolang
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'handle_new_bee';

    IF v_oid IS NULL THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.handle_new_bee() not found in catalog. '
            'This migration ratifies an existing function — it does not create '
            'one from scratch. If the function genuinely does not exist, the '
            'auth.users INSERT chain is currently broken and that is the '
            'problem to investigate, not this migration.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: handle_new_bee() exists (oid=%, lang=%, secdef=%, config=%).',
        v_oid, v_lang, v_secdef, v_config;

    IF v_secdef IS NOT TRUE THEN
        RAISE NOTICE
            'WARNING: handle_new_bee() is NOT SECURITY DEFINER. Trigger '
            'functions on auth.users typically need SECURITY DEFINER to '
            'INSERT into public.bees. Confirm this is intentional before '
            'pasting the body.';
    END IF;

    IF v_config IS NULL OR NOT ('search_path=public' = ANY(v_config))
                       AND NOT ('search_path=public, pg_temp' = ANY(v_config))
                       AND NOT ('search_path=pg_temp, public' = ANY(v_config)) THEN
        RAISE NOTICE
            'WARNING: handle_new_bee() does not have search_path hardened. '
            'Migration 23 Block D set search_path on 4 trigger/util '
            'functions; this one was apparently missed. Flag to Butch '
            'before applying — adding search_path is a behavior change.';
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Function definition — captured 2026-05-14 from production catalog via
-- pg_get_functiondef('public.handle_new_bee'::regproc). Reproduced
-- verbatim below. Note: search_path is set to 'public' only (NOT
-- 'public, pg_temp' as the original placeholder header recommended).
-- Tightening search_path is a behavior change; deferred to a separate
-- hygiene migration if/when Butch decides.
-- ───────────────────────────────────────────────────────────────────────

-- BEGIN PASTE ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_bee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.bees (id, handle, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'handle', ''),
      'bee_' || substr(new.id::text, 1, 8)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
-- END PASTE ───────────────────────────────────────────────────────────

COMMIT;

-- =============================================================================
-- Verification queries — run AFTER apply (NOT inside the transaction).
-- =============================================================================
--
-- 1. Function definition is now what we intended (compare against the
--    captured pg_get_functiondef output):
-- SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='handle_new_bee';
--
-- 2. SECURITY DEFINER + search_path preserved:
-- SELECT p.prosecdef, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='handle_new_bee';
-- → prosecdef=t (or whatever the captured body declared);
--   proconfig should include search_path setting.
--
-- 3. The on_auth_user_created trigger still references the function:
-- SELECT t.tgname, t.tgenabled, c.relname AS table_name,
--        n.nspname AS schema, p.proname AS function
--   FROM pg_trigger t
--   JOIN pg_class    c ON c.oid = t.tgrelid
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   JOIN pg_proc     p ON p.oid = t.tgfoid
--  WHERE t.tgname = 'on_auth_user_created';
-- → one row, tgenabled='O', table_name='users', schema='auth',
--   function='handle_new_bee'.
--
-- 4. Permissions still locked down (REVOKE chain from migration 23/24
--    is preserved by CREATE OR REPLACE):
-- SELECT grantee, privilege_type
--   FROM information_schema.routine_privileges
--  WHERE routine_schema='public' AND routine_name='handle_new_bee';
-- → postgres + service_role only. NO anon, NO authenticated.
--   (Triggers fire regardless of EXECUTE grant; this is hygiene.)
--
-- 5. Smoke test — full chain still fires (against a non-prod branch DB):
--    BEGIN;
--      INSERT INTO auth.users (id, email, encrypted_password, …)
--        VALUES (gen_random_uuid(), 'ratify-smoke@example.test', …);
--      -- Expect: 1 new row in public.bees, 1 new row in public.bee_profiles.
--      SELECT COUNT(*) FROM public.bees       WHERE email='ratify-smoke@example.test';
--      SELECT COUNT(*) FROM public.bee_profiles
--        WHERE bee_id = (SELECT id FROM public.bees WHERE email='ratify-smoke@example.test');
--    ROLLBACK;
-- → both COUNTs = 1. Same shape as the Phase C audit smoke test
--   (schema-architect-phase-c-foundations-2026-05-08.md:127).
--
-- =============================================================================
-- Cross-references
-- =============================================================================
--   • Trigger comment, REQUIRED READING — schema-v9-rewards-pool.sql:33-46
--   • Phase C audit smoke test — schema-architect-phase-c-foundations-2026-05-08.md:127, 245
--   • REVOKE chain — 23_v9_0_security.sql:598; 24_v9_0_security_tightening.sql:58
--   • Federation Lock 2c (account linking) — federation-tier-1-scoping.md lines 80-99
--   • Auto-create-bee analysis — shared/canon/auto-create-bee-trigger-analysis.md
-- =============================================================================
