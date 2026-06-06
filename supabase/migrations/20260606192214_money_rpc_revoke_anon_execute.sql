-- =====================================================================
-- Migration 20260606192214 — money_rpc_revoke_anon_execute
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Defense-in-depth: REVOKE EXECUTE FROM anon on guarded money/escrow RPCs
-- (redundant with each function's internal auth.uid() guard). authenticated +
-- service_role grants are independent and left intact; internal guards unchanged.
--
-- NOTE: this REVOKE-FROM-anon closed the 7 bling_* functions (direct anon grant),
-- but the 4 atlasoracle_* functions reach anon via a default PUBLIC grant, so
-- they remained anon-executable until the follow-up REVOKE-FROM-PUBLIC migration
-- (20260606193318). LESSON: prefer REVOKE FROM PUBLIC for these.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.bling_free(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_escrow_create(uuid, uuid, numeric, text, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_escrow_release(bigint, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_escrow_cancel(bigint, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_escrow_dispute(bigint, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bling_escrow_timelock(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(uuid, text) FROM anon;
