-- =====================================================================
-- Migration 20260606193253 — money_rpc_revoke_anon_execute_atlasoracle_completion
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration (by OG HUMAN).
-- OUTCOME-FAITHFUL reconstruction (exact body not captured in this session).
-- Completes the anon revoke for the 4 atlasoracle_* money/escrow RPCs. (Direct
-- REVOKE-FROM-anon is a no-op for these — they carry a default PUBLIC grant — so
-- the actual fix lands in the companion REVOKE-FROM-PUBLIC migration 20260606193318.)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(uuid, text) FROM anon;
