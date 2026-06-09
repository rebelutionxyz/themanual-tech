-- =====================================================================
-- Migration 20260606204240 — harden_function_search_paths
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Hygiene: pins search_path on the 3 functions flagged
-- function_search_path_mutable (WARN). All three reference only schema-qualified
-- objects (public.*) plus pg_catalog built-ins, so a fixed search_path cannot
-- break them. Idempotent.
-- =====================================================================

ALTER FUNCTION public.fib_speed_multiplier(integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.comp_leaderboard(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.manual_groups_recalc_member_count() SET search_path = pg_catalog, public;
