-- ============================================================================
-- OPS33 — security_invoker on the build-progress views.
--
-- DEFECT FOUND BY THE PASS'S OWN RLS PROBE, before the report was written:
-- ops_build_steps correctly returned 0 rows to a non-admin `authenticated`
-- role, but ops_build_progress returned all 57. Postgres views run as their
-- OWNER by default, so they bypass the base table's RLS entirely — the RLS
-- policy was real and the views walked straight past it.
--
-- This is the same property that makes public.oracle_token_balances safe
-- (it carries security_invoker=true); these views shipped without it.
--
-- ADDITIVE ONLY: every object altered here was created by this same pass.
-- No pre-existing ops_ object is touched.
-- ============================================================================

ALTER VIEW public.ops_pass_durations   SET (security_invoker = true);
ALTER VIEW public.ops_effort_stats     SET (security_invoker = true);
ALTER VIEW public.ops_build_progress   SET (security_invoker = true);
ALTER VIEW public.ops_build_rollup     SET (security_invoker = true);
ALTER VIEW public.ops_build_honeycomb  SET (security_invoker = true);

-- Mission control reads as `postgres` over psql, which bypasses RLS, so the
-- local panel is unaffected. A future web reader (OPS34) now correctly sees
-- only what its own role is entitled to.
