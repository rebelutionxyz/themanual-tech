-- =============================================================================
-- Migration 20260527240000 — refresh_atom_trending() admin gate
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  HQ-3 dispatch — Admin Actions section needs an admin-callable
--          path to refresh atom_trending_* matviews until pg_cron lands.
--
-- Replaces the prior service-role-only function (created in
-- 20260527200000_manual_spine_v1_observability) with an admin-aware
-- version. Service-role callers (future pg_cron job) still pass cleanly;
-- authenticated Bees pass only if bees.is_admin = true. Anon callers are
-- denied at the EXECUTE-grant layer.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_atom_trending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Service role (pg_cron when it lands, MCP execute_sql, etc.) bypasses
    -- the is_admin lookup. For authenticated Bees, require is_admin.
    IF auth.role() = 'service_role' THEN
        NULL;
    ELSE
        SELECT is_admin INTO v_is_admin FROM public.bees WHERE id = auth.uid();
        IF v_is_admin IS NOT TRUE THEN
            RAISE EXCEPTION 'unauthorized: platform admin required';
        END IF;
    END IF;

    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_24h;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_7d;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.atom_trending_30d;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.refresh_atom_trending() TO authenticated;

COMMIT;
