-- Migration — money_rpc_revoke_anon_execute_atlasoracle_completion
-- APPLIED to prod (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- The prior money_rpc_revoke_anon_execute batch revoked the 7 bling_* RPCs but missed the 4
-- atlasoracle_* functions. This revokes anon directly (no-op as it turned out — see next migration
-- for the real PUBLIC-grant root cause — but retained for ledger faithfulness).
REVOKE EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(p_bee_id uuid, p_tier text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(p_amount numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(p_bee_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(p_amount numeric) FROM anon;
