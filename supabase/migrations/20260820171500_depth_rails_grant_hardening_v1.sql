BEGIN;
-- ============================================================================
-- 20260820171500_depth_rails_grant_hardening_v1
-- DEPTH RAILS E1 - grant hardening. DEPTH_RAILS2, 2026-08-20, SQL_AUTONOMY v1.
--
-- Supabase default privileges GRANT EXECUTE on every new public function to anon
-- + authenticated at creation; the E1 migration's `REVOKE ... FROM PUBLIC` does
-- NOT remove those role-specific grants. Result observed post-apply: all depth_*
-- functions carried anon + authenticated, where the built core (bling_send) is
-- authenticated + service_role with NO anon. This matches the core posture and,
-- critically, enforces service-role-only on the USD settle/payout/refund/
-- chargeback path (those functions have no internal auth.uid() guard).
--
-- ADDITIVE hardening: REVOKE only. No schema change. No bling_* object touched.
-- Idempotent (REVOKE of an absent grant is a no-op).
-- ============================================================================

-- User-callable BLiNG + invoice: drop anon. These guard auth.uid() internally,
-- but least-privilege should match bling_send. Keep authenticated + service_role.
REVOKE EXECUTE ON FUNCTION public.depth_rail_resolve(text,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_charge_bling(uuid,uuid,numeric,text,text,text,text,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_escrow_open(uuid,uuid,numeric,text,text,text,text,uuid,text,timestamptz,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_escrow_release(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_escrow_cancel(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_escrow_dispute(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_wallet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.depth_invoice_usd(uuid,text,text,bigint,text,uuid,text,text,text) FROM anon;

-- Service-role ONLY (no internal auth.uid() guard): drop anon AND authenticated.
REVOKE EXECUTE ON FUNCTION public.depth_settle_usd(text,text,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.depth_payout_usd(uuid,text,bigint,text,uuid,text,text,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.depth_refund_usd(text,text,bigint,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.depth_chargeback_usd(text,text,text) FROM anon, authenticated;

COMMIT;
