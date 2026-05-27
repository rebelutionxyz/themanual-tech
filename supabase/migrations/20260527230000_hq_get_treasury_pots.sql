-- =============================================================================
-- Migration 20260527230000 — get_treasury_pots() admin-only RPC
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  HQ-2 dispatch — Treasury Balances + Economy Snapshot sections
--          need to read @combtreasury's bling_pots from the browser.
--
-- Problem: bling_pots RLS is `bling_pots_owner_read` (bee_id = auth.uid()
-- OR service_role). An admin Bee querying @combtreasury's pots via the
-- anon supabase-js client returns 0 rows. Two paths considered:
--   (a) Add bling_pots_admin_read policy — touches economy-table RLS,
--       red zone per code-autonomy-mandate §3 (cross-Astra impact).
--   (b) SECURITY DEFINER RPC with internal is_admin check — RLS-bypass
--       scoped to one function, admin-only at the EXECUTE layer.
-- Going with (b). Aligned with og-human-v1-authority-canon.md §3
-- canonical v1 pattern (auth.uid() → bees.is_admin gate inside the RPC).
--
-- Returns one row per @combtreasury pot (current production: campaign,
-- defense, operational, promotions, reserve — 5 pots, all 0.000000 BLiNG!).
-- Raises 'unauthorized' for non-admin callers (defense in depth on top of
-- the EXECUTE grant).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_treasury_pots()
RETURNS TABLE (purpose text, balance numeric, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_is_admin boolean;
BEGIN
    SELECT is_admin INTO v_is_admin FROM public.bees WHERE id = auth.uid();
    IF v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'unauthorized: platform admin required';
    END IF;

    RETURN QUERY
        SELECT p.purpose, p.balance, p.updated_at
          FROM public.bling_pots p
         WHERE p.bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
         ORDER BY p.purpose;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_treasury_pots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_treasury_pots() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_treasury_pots() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_treasury_pots() TO service_role;

COMMIT;
