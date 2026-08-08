-- DB31 -- DINGLEBERRY POSTURE REMEDIATION v1
--
-- Closes the actionable subset of the Supabase security advisor run of
-- 2026-08-08 (376 findings). 348 of those 376 are
-- anon/authenticated_security_definer_function_executable -- the house RPC-write
-- pattern, SECURITY DEFINER functions that self-guard on auth.uid() internally.
-- Those are the architecture and are deliberately NOT touched here.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808180000_dingleberry_posture_remediation_v1_rollback.sql
--           Written before this file. It restores the worse state; see its header.
--
-- REHEARSED against production inside BEGIN ... ROLLBACK on 2026-08-08.
-- Full verbatim output in REPORT.md, DB31 section.
--
-- NOT IN THIS FILE, and why:
--   * question_bank_public -- the second SECURITY DEFINER view. The flip BREAKS
--     it: anon and authenticated hold no SELECT on base table public.question_bank
--     (deliberately -- the base table carries the answer key), so
--     security_invoker=on turns 3,246 readable rows into
--     "permission denied for table question_bank". Measured, not assumed.
--     Filed as DB31-Q for an owner ruling. Advisor security_definer_view
--     therefore goes 2 -> 1, not 2 -> 0.
--   * justice_claims_unsourced_report and justice_karma_totals_recomputed --
--     same anon+authenticated write grants as the seven below, but not named in
--     the DB31 dispatch. Reported, not silently widened.

BEGIN;

-- ============================================================================
-- LEG 1 -- justice public read views: remove write grants.
-- ============================================================================
-- All seven carry INSERT/UPDATE/DELETE for BOTH anon and authenticated: 42
-- grants that should not exist on a public read surface. Inert today only
-- because the views are not auto-updatable; it becomes a live RLS-bypass write
-- path (the DB11 incident class) the day anyone adds an INSTEAD OF trigger or a
-- CREATE OR REPLACE changes the shape.
--
-- SELECT is deliberately untouched -- these are public read surfaces and the app
-- depends on it. Rehearsal confirmed all 14 SELECT grants survive.
--
-- This supersedes the DB28 file 20260804090000_justice_public_views_revoke_anon_writes.sql,
-- which was authored but never applied (absent from supabase_migrations.schema_migrations)
-- and which revoked from anon only. DB31 revokes from anon AND authenticated.

REVOKE INSERT, UPDATE, DELETE ON public.justice_claims_public        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_dockets_public       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_docket_events_public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_exhibits_public      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_filings_public       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_outcomes_public      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_timeline_public      FROM anon, authenticated;

-- ============================================================================
-- LEG 2 -- SECURITY DEFINER view: trivia_topic_candidates.
-- ============================================================================
-- ALTER VIEW SET, not CREATE OR REPLACE. The dispatch prescribed recreate-from-
-- pg_get_viewdef; ALTER reaches the identical end state without retyping a
-- 12-predicate safety filter (where a transcription slip would silently widen
-- what trivia may ask about) and without needing to re-issue grants. Same
-- mechanism DB28 chose for this exact object.
--
-- READ-NEUTRAL, measured: anon 8,524 rows before and after; authenticated the
-- same. atoms_read_visible (status='live') is permissive enough that enforcing
-- it changes nothing, and the view already filters status='live' itself.

ALTER VIEW public.trivia_topic_candidates SET (security_invoker = on);

-- ============================================================================
-- LEG 3 -- pin search_path on eight mutable-search_path functions.
-- ============================================================================
-- 'pg_catalog', 'public' is the house hardened pattern (90 functions already use
-- it). All eight are SECURITY INVOKER with proconfig NULL today, and every body
-- resolves only public objects plus pg_catalog builtins -- verified by reading
-- all eight (elections_private.counted_options touches no table at all).
-- ALTER FUNCTION SET, so no body is rewritten. Signatures are the exact
-- identity arguments from pg_get_function_identity_arguments; none is overloaded.

ALTER FUNCTION public.bee_handle_skeleton(text)                SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.get_atom_level(text)                     SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.realm_path_match(text[], jsonb, text[])  SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.press_fill_stats(uuid)                   SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.press_slot_map(uuid)                     SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.press_slot_price_cents(uuid, uuid)       SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION public.press_touch_updated_at()                 SET search_path TO 'pg_catalog', 'public';
ALTER FUNCTION elections_private.counted_options(uuid[], text) SET search_path TO 'pg_catalog', 'public';

COMMIT;
