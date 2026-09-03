-- ============================================================================
-- PATCHBOARD1 — post-apply grant correction
-- Applied 2026-09-03, stamped 20260903202124. Pass PATCHBOARD_DB1.
-- ----------------------------------------------------------------------------
-- The parent migration (20260903202047) flagged this check in its own footer:
--   "REVOKE-from-role check: this project grants anon/authenticated via ALTER
--    DEFAULT PRIVILEGES — verify pg_proc.proacl after apply (rail README rule)."
--
-- Ran the check. It does. `REVOKE ... FROM PUBLIC` removes only the PUBLIC
-- grant; this project's ALTER DEFAULT PRIVILEGES had already granted EXECUTE to
-- `anon` EXPLICITLY, so all five WRITE RPCs came out of the apply with
-- anon=X/postgres in pg_proc.proacl despite the parent intending
-- authenticated-only. get_advisors(security) confirmed it as five
-- `anon_security_definer_function_executable` warnings.
--
-- NOT exploitable as it stood: every write RPC opens with
--   IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'
-- and patchboard_set_master_switch additionally requires is_platform_admin(),
-- so an anon caller got an exception rather than a write. This closes the gap at
-- the GRANT layer so the function body is the second line of defence instead of
-- the only one.
--
-- get_effective_switch_state KEEPS anon deliberately — a logged-out visitor has
-- to resolve an astra's public switches for the shell to render correctly.
--
-- LESSON FOR EVERY FUTURE MIGRATION IN THIS PROJECT: REVOKE FROM PUBLIC is not
-- enough here. Any function that must not be anon-callable needs an explicit
-- REVOKE ... FROM anon after its GRANT.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.patchboard_set_bee_switch(text, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patchboard_set_master_switch(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patchboard_set_use(text, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patchboard_connect_begin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patchboard_disconnect(text) FROM anon;
