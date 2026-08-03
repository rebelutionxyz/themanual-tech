-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719080000_creator_studio_collections_v1.sql
-- CREATOR STUDIO — COLLECTIONS (Albums / Playlists / Categories) · 2026-07-19
--
-- Run AFTER 20260719070000_creator_studio_media_v1a_scope_object_listing.sql.
--
-- Curation layer over the media library, per Butch's call tonight: folders
-- stay the single-location FILING system; collections are kind-scoped
-- curated shelves where one asset can live in MANY (Google-Photos model).
-- UI labels by kind: image → Album, video/audio → Playlist,
-- document → Category. One system underneath.
--
-- What this does:
--   1. public.media_collections — per-Bee, kind-scoped, named shelves.
--      cover_asset_id reserved for a chosen cover (UI derives one meanwhile).
--   2. public.media_collection_items — m2m membership (position reserved
--      for manual ordering; v1 orders by added_at).
--   3. RLS — owner-scoped everything; the items INSERT policy also enforces
--      the invariant IN-POLICY: collection and asset share the caller as
--      owner AND share the same kind (no trigger needed).
--   4. updated_at auto-bump on collections (reuses public.set_updated_at()).
--
-- What this does NOT do:
--   * No sharing/publishing of collections (per-Bee private in v1; a Group/
--    profile publish surface is a future dispatch).
--   * No change to media_folders, media_assets, or storage.
--   * No manual reordering UI yet (position column is ready for it).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- DROP POLICY IF EXISTS → CREATE POLICY, DROP TRIGGER IF EXISTS → CREATE
-- TRIGGER.
--
-- ⚠ FK note: all FKs ON DELETE CASCADE off the owning rows (user-authored
--   content posture). Deleting an asset silently drops it from every
--   collection; deleting a collection never touches assets.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 — media_collections
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_collections (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id          uuid NOT NULL REFERENCES public.bees(id)
                        ON DELETE CASCADE ON UPDATE CASCADE,
    kind            text NOT NULL CHECK (kind IN ('image','video','audio','document')),
    name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    description     text CHECK (description IS NULL OR char_length(description) <= 500),
    cover_asset_id  uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_collections IS
  'Creator Studio curation shelves — kind-scoped, per-Bee. UI label by kind: image=Album, video/audio=Playlist, document=Category. m2m membership via media_collection_items; folders remain the single-location filing system. creator_studio_collections_v1 2026-07-19.';

CREATE UNIQUE INDEX IF NOT EXISTS media_collections_unique_name_per_kind
    ON public.media_collections (bee_id, kind, lower(name));

CREATE INDEX IF NOT EXISTS media_collections_bee_kind_idx
    ON public.media_collections (bee_id, kind, created_at DESC);

DROP TRIGGER IF EXISTS media_collections_set_updated_at ON public.media_collections;
CREATE TRIGGER media_collections_set_updated_at
    BEFORE UPDATE ON public.media_collections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 — media_collection_items (m2m)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_collection_items (
    collection_id  uuid NOT NULL REFERENCES public.media_collections(id) ON DELETE CASCADE,
    asset_id       uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    position       integer NOT NULL DEFAULT 0,
    added_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, asset_id)
);

COMMENT ON TABLE public.media_collection_items IS
  'Membership rows for media_collections (one asset in many shelves). INSERT policy enforces same-owner AND same-kind between collection and asset. position reserved for manual ordering. creator_studio_collections_v1 2026-07-19.';

CREATE INDEX IF NOT EXISTS media_collection_items_asset_idx
    ON public.media_collection_items (asset_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.media_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_collections      FROM anon;
REVOKE ALL ON public.media_collection_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_collections      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_collection_items TO authenticated;

DROP POLICY IF EXISTS "media_collections_owner_select" ON public.media_collections;
CREATE POLICY "media_collections_owner_select" ON public.media_collections
    FOR SELECT TO authenticated USING (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_collections_owner_insert" ON public.media_collections;
CREATE POLICY "media_collections_owner_insert" ON public.media_collections
    FOR INSERT TO authenticated WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_collections_owner_update" ON public.media_collections;
CREATE POLICY "media_collections_owner_update" ON public.media_collections
    FOR UPDATE TO authenticated
    USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_collections_owner_delete" ON public.media_collections;
CREATE POLICY "media_collections_owner_delete" ON public.media_collections
    FOR DELETE TO authenticated USING (bee_id = auth.uid());

-- Items: reads/deletes ride the collection's ownership; INSERT additionally
-- pins the kind-match invariant (collection.kind = asset.kind) in-policy.

DROP POLICY IF EXISTS "media_collection_items_owner_select" ON public.media_collection_items;
CREATE POLICY "media_collection_items_owner_select" ON public.media_collection_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.media_collections c
        WHERE c.id = collection_id AND c.bee_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "media_collection_items_owner_insert" ON public.media_collection_items;
CREATE POLICY "media_collection_items_owner_insert" ON public.media_collection_items
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.media_collections c
        JOIN public.media_assets a ON a.id = asset_id
        WHERE c.id = collection_id
          AND c.bee_id = auth.uid()
          AND a.bee_id = auth.uid()
          AND a.kind   = c.kind
      )
    );

DROP POLICY IF EXISTS "media_collection_items_owner_update" ON public.media_collection_items;
CREATE POLICY "media_collection_items_owner_update" ON public.media_collection_items
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.media_collections c
        WHERE c.id = collection_id AND c.bee_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.media_collections c
        WHERE c.id = collection_id AND c.bee_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "media_collection_items_owner_delete" ON public.media_collection_items;
CREATE POLICY "media_collection_items_owner_delete" ON public.media_collection_items
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.media_collections c
        WHERE c.id = collection_id AND c.bee_id = auth.uid()
      )
    );

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually)
--
-- 1. SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('media_collections','media_collection_items');
--    → both t.
-- 2. SELECT count(*) FROM pg_policies
--    WHERE tablename IN ('media_collections','media_collection_items');
--    → 8.
-- 3. Kind-guard smoke (as a Bee): inserting an item whose asset.kind differs
--    from collection.kind → "new row violates row-level security policy".
--
-- ROLLBACK PLAN (destructive — removes curation shelves; assets untouched):
--   -- BEGIN;
--   -- DROP TABLE IF EXISTS public.media_collection_items;
--   -- DROP TABLE IF EXISTS public.media_collections;
--   -- COMMIT;
--
-- END creator_studio_collections_v1
-- ═════════════════════════════════════════════════════════════════════════════
