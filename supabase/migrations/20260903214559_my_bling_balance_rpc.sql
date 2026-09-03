-- ============================================================================
-- my_bling_balance() — the caller's own BLiNG! balance, lockdown-safe.
-- Applied 2026-09-03, stamped 20260903214559. Pass SHELL_BLING1.
-- ----------------------------------------------------------------------------
-- HandleSettingsPage (SINK 1) has called this since it shipped and its header
-- comment names it "the canonical pattern for all future sink UIs" — but the
-- function was never created. Verified against pg_proc 2026-09-03: absent.
-- Every caller silently got an error and showed "—". SHELL v1.8 put real BLiNG
-- in the header via the same RPC, which is how it finally surfaced.
--
-- SECURITY DEFINER because bees column exposure is deliberately narrowed
-- (DB14) and a direct select is not the sanctioned path. Returns the ONE row
-- for auth.uid() and nothing else; NULL when signed out.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.my_bling_balance()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT bling_balance FROM public.bees WHERE id = auth.uid()
$fn$;
COMMENT ON FUNCTION public.my_bling_balance() IS
  'The calling Bee''s BLiNG! balance (bees.bling_balance for auth.uid()). NULL when signed out. Lockdown-safe read; never a direct bees select from the client.';

-- REVOKE FROM PUBLIC is not enough in this project (ALTER DEFAULT PRIVILEGES
-- grants anon explicitly) — lesson from 20260903202124.
REVOKE ALL ON FUNCTION public.my_bling_balance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_bling_balance() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_bling_balance() TO authenticated;
