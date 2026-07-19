-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719150000_creator_studio_collections_v2_visibility.sql
-- CREATOR STUDIO — COLLECTION VISIBILITY (public Showcase) · 2026-07-19
--
-- Run AFTER 20260719080000_creator_studio_collections_v1.sql.
--
-- Dispatch 4: a Bee can flip a shelf (Album / Playlist / Category) from
-- private to PUBLIC. Public shelves render as the Showcase on the Bee's
-- profile (own /profile today; lights up for visitors when /bees/:handle
-- lands with the deferred bees-RLS migration) and are readable by any
-- signed-in Bee — hive-read, not anon.
--
-- What this does:
--   1. media_collections.visibility ('private'|'public', default private).
--   2. Hive-read SELECT policies for public shelves: the collection row,
--      its membership rows, and the member ASSETS' metadata (non-trashed
--      only) — additive permissive policies alongside the owner-only ones.
--
-- What this does NOT do:
--   * No anon access (signed-in Bees only, house posture).
--   * No public WRITE of any kind — visibility is owner-flipped only
--     (owner UPDATE policy from v1 already covers the flip).
--   * No change to folders, storage policies, or the editors.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS → CREATE.
--
-- ⚠ Note: this adds a second permissive SELECT policy on three tables
--   (owner OR public-member). Postgres ORs them; the advisor may WARN on
--   multiple-permissive-policies — accepted, matches the feature.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.media_collections
    ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private','public'));

COMMENT ON COLUMN public.media_collections.visibility IS
  'private (owner-only, default) | public (any signed-in Bee can view — profile Showcase). creator_studio_collections_v2 2026-07-19.';

CREATE INDEX IF NOT EXISTS media_collections_public_idx
    ON public.media_collections (bee_id, kind)
    WHERE visibility = 'public';

DROP POLICY IF EXISTS "media_collections_hive_select_public" ON public.media_collections;
CREATE POLICY "media_collections_hive_select_public" ON public.media_collections
    FOR SELECT TO authenticated
    USING (visibility = 'public');

DROP POLICY IF EXISTS "media_collection_items_hive_select_public" ON public.media_collection_items;
CREATE POLICY "media_collection_items_hive_select_public" ON public.media_collection_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.media_collections c
        WHERE c.id = collection_id AND c.visibility = 'public'
      )
    );

DROP POLICY IF EXISTS "media_assets_hive_select_public_shelf" ON public.media_assets;
CREATE POLICY "media_assets_hive_select_public_shelf" ON public.media_assets
    FOR SELECT TO authenticated
    USING (
      trashed_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.media_collection_items i
        JOIN public.media_collections c ON c.id = i.collection_id
        WHERE i.asset_id = media_assets.id
          AND c.visibility = 'public'
      )
    );

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually)
-- 1. SELECT count(*) FROM pg_policies WHERE policyname LIKE '%hive_select_public%'; → 3
-- 2. As Bee B: SELECT from a Bee A public collection → rows visible;
--    flip to private → zero rows.
--
-- ROLLBACK PLAN:
--   -- BEGIN;
--   -- DROP POLICY IF EXISTS "media_assets_hive_select_public_shelf" ON public.media_assets;
--   -- DROP POLICY IF EXISTS "media_collection_items_hive_select_public" ON public.media_collection_items;
--   -- DROP POLICY IF EXISTS "media_collections_hive_select_public" ON public.media_collections;
--   -- ALTER TABLE public.media_collections DROP COLUMN IF EXISTS visibility;
--   -- COMMIT;
--
-- END creator_studio_collections_v2_visibility
-- ═════════════════════════════════════════════════════════════════════════════
