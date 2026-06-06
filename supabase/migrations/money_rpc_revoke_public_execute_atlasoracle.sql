-- Migration — money_rpc_revoke_public_execute_atlasoracle
-- APPLIED to prod (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- ROOT CAUSE FIX. The 4 atlasoracle_* RPCs granted EXECUTE to PUBLIC (ACL leading '=X/postgres'),
-- so anon inherited EXECUTE via PUBLIC and REVOKE ... FROM anon was a no-op. REVOKE FROM PUBLIC
-- removes the inherited path; authenticated keeps its OWN explicit grant (authenticated=X), so
-- signed-in callers are unaffected. service_role + postgres unaffected. Verified post-apply:
-- anon_exec=0, authenticated=11, service_role=11 across all 11 money/escrow RPCs.
-- Defense-in-depth; the internal auth.uid() guard in each function remains the primary control.
REVOKE EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(p_bee_id uuid, p_tier text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(p_amount numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(p_bee_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(p_amount numeric) FROM PUBLIC;
