-- =============================================================================
-- Migration 20260529120000 — bees RLS lockdown, PHASE A (ADDITIVE / non-breaking)
-- =============================================================================
-- Status:  UNAPPLIED. Butch reviews + applies via Supabase tooling.
-- Context: schema.sql's `bees_public_read USING(true)` exposes ALL bees columns
--          (incl. email + bling_balance) to anon via the REST API. This phased
--          migration closes that. PHASE A is additive only — it creates the
--          safe-projection view + self/admin RPCs and changes NO existing RLS,
--          so it breaks nothing on its own.
--
-- Apply order (STRICT):
--   1. Apply this Phase A migration.
--   2. Deploy the Phase B frontend (callers repointed to bees_public / RPCs).
--   3. Only then apply Phase C (20260529130000_bees_rls_phase_c.sql) which
--      revokes anon table SELECT and adds the self-only policy.
--
-- Column classification (reconstructed live bees schema):
--   SAFE      : id, handle, name, avatar_url, bio, bling_rank, honeycomb_ring,
--               action_count, created_at
--   SENSITIVE : email (PII), bling_balance (financial), is_admin
--               (admin-discovery), updated_at (no exposure need)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. bees_public — safe-column projection.
--    A normal (non-security_invoker) view runs with its OWNER's privileges
--    (postgres), so it bypasses bees RLS and returns the SAFE columns for ALL
--    bees to any grantee. That is intentional: handles/ranks/bios are public.
--    Sensitive columns are never projected, so they can't leak through it.
--    (After Phase C revokes anon's direct bees SELECT, this view remains the
--    public read path.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.bees_public AS
    SELECT id, handle, name, avatar_url, bio,
           bling_rank, honeycomb_ring, action_count, created_at
    FROM public.bees;

GRANT SELECT ON public.bees_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. am_i_admin() — self-only admin check. Lets the HQ gate confirm the
--    CURRENT bee's is_admin without granting read access to other bees'
--    is_admin (admin-discovery hardening).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $function$
    SELECT COALESCE((SELECT is_admin FROM public.bees WHERE id = auth.uid()), false);
$function$;

REVOKE EXECUTE ON FUNCTION public.am_i_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.am_i_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. my_bling_balance() — self-only financial read. No current frontend
--    caller reads bees.bling_balance directly; this is the canonical
--    self-balance path for after Phase C locks down the table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_bling_balance()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $function$
    SELECT bling_balance FROM public.bees WHERE id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.my_bling_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_bling_balance() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. list_bees_admin() — admin-only listing including the sensitive admin
--    fields (updated_at, is_admin). Hard-gated on the caller's is_admin;
--    raises 'admin only' otherwise. Serves HQ Active Bees (activity counts +
--    leaderboard, which need updated_at) and Admin Actions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_bees_admin(limit_n integer DEFAULT 1000, offset_n integer DEFAULT 0)
RETURNS TABLE (
    id             uuid,
    handle         text,
    name           text,
    bling_rank     integer,
    honeycomb_ring integer,
    action_count   integer,
    is_admin       boolean,
    created_at     timestamptz,
    updated_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF NOT COALESCE((SELECT b.is_admin FROM public.bees b WHERE b.id = auth.uid()), false) THEN
        RAISE EXCEPTION 'admin only';
    END IF;
    RETURN QUERY
        SELECT b.id, b.handle, b.name, b.bling_rank, b.honeycomb_ring,
               b.action_count, b.is_admin, b.created_at, b.updated_at
        FROM public.bees b
        ORDER BY b.updated_at DESC
        LIMIT limit_n OFFSET offset_n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_bees_admin(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_bees_admin(integer, integer) TO authenticated;

COMMIT;

-- =============================================================================
-- SMOKE TESTS (run after apply; before Phase C they coexist with old RLS)
-- =============================================================================
-- -- anon/authenticated can read the safe view:
--    SELECT id, handle, bling_rank FROM public.bees_public LIMIT 1;   -- OK
-- -- view does NOT expose sensitive columns:
--    SELECT email FROM public.bees_public;     -- ERROR: column does not exist
-- -- self RPCs (as an authenticated session):
--    SELECT public.am_i_admin();               -- false for non-admin, true for admin
--    SELECT public.my_bling_balance();         -- caller's own balance
-- -- admin gate:
--    SELECT * FROM public.list_bees_admin(5,0);-- non-admin → ERROR 'admin only'
--                                              -- admin     → up to 5 rows
-- =============================================================================
-- ROLLBACK (reference only)
-- =============================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.list_bees_admin(integer, integer);
-- DROP FUNCTION IF EXISTS public.my_bling_balance();
-- DROP FUNCTION IF EXISTS public.am_i_admin();
-- DROP VIEW IF EXISTS public.bees_public;
-- COMMIT;
