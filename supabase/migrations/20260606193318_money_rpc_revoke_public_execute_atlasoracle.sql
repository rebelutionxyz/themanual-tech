-- =====================================================================
-- Migration 20260606193318 — money_rpc_revoke_public_execute_atlasoracle (ROOT FIX)
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration (by OG HUMAN).
-- OUTCOME-FAITHFUL reconstruction (exact body not captured in this session);
-- reproduces the verified end-state: anon_exec=0, authenticated=11, service_role=11
-- across all 11 money/escrow RPCs.
--
-- ROOT FIX: the 4 atlasoracle_* RPCs were anon-executable via a default PUBLIC
-- grant, so REVOKE-FROM-anon was a no-op. REVOKE FROM PUBLIC closes it; the roles
-- that legitimately need EXECUTE keep explicit grants. Internal auth.uid()/role
-- guards unchanged.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(uuid, text) TO authenticated, service_role;
