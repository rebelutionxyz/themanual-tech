-- CRITICAL: lot_credit/lot_debit/lot_reconcile_balance are INTERNAL choke points. They must NEVER be
-- callable from client context (a user calling lot_credit on themselves = infinite freeing). Supabase's
-- default privileges grant EXECUTE to anon+authenticated on new public functions, so REVOKE FROM PUBLIC
-- alone is insufficient — must revoke the role grants explicitly. Only owner (SECURITY DEFINER callers)
-- and service_role retain access; D2's rewired functions call these internally as the definer.
REVOKE EXECUTE ON FUNCTION public.lot_credit(uuid,numeric,text,jsonb,text,numeric) FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.lot_debit(uuid,numeric,text) FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.lot_reconcile_balance(uuid) FROM anon, authenticated, PUBLIC;
