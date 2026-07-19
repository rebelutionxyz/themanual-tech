-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719152000_creator_studio_collections_v2a_fix_policy_recursion.sql
-- CREATOR STUDIO — v2a: break RLS policy recursion (42P17) · 2026-07-19
--
-- Run AFTER 20260719150000_creator_studio_collections_v2_visibility.sql.
--
-- v2's media_assets public-shelf SELECT policy referenced
-- media_collection_items, whose INSERT policy references media_assets —
-- Postgres detects relation-level policy recursion (42P17) on item writes.
-- Fix: the shelf-membership probe moves into a SECURITY DEFINER helper
-- (bypasses inner RLS → no recursive policy expansion). Behavior identical.
--
-- Idempotent: CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS → CREATE.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.media_asset_in_public_shelf(p_asset uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.media_collection_items i
    JOIN public.media_collections c ON c.id = i.collection_id
    WHERE i.asset_id = p_asset
      AND c.visibility = 'public'
  )
$$;

COMMENT ON FUNCTION public.media_asset_in_public_shelf(uuid) IS
  'RLS helper (SECURITY DEFINER to avoid policy recursion): true when the asset sits in at least one public shelf. Used by media_assets_hive_select_public_shelf. creator_studio_collections_v2a 2026-07-19.';

REVOKE EXECUTE ON FUNCTION public.media_asset_in_public_shelf(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.media_asset_in_public_shelf(uuid) TO authenticated;

DROP POLICY IF EXISTS "media_assets_hive_select_public_shelf" ON public.media_assets;
CREATE POLICY "media_assets_hive_select_public_shelf" ON public.media_assets
    FOR SELECT TO authenticated
    USING (
      trashed_at IS NULL
      AND public.media_asset_in_public_shelf(id)
    );

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: as another Bee, SELECT a public shelf's items + assets →
-- rows visible, no 42P17 on membership inserts. Verified live 2026-07-19.
--
-- ROLLBACK PLAN:
--   -- DROP POLICY IF EXISTS "media_assets_hive_select_public_shelf" ON public.media_assets;
--   -- DROP FUNCTION IF EXISTS public.media_asset_in_public_shelf(uuid);
--
-- END creator_studio_collections_v2a
-- ═════════════════════════════════════════════════════════════════════════════
