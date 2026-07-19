-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719060000_creator_studio_media_v1.sql
-- CREATOR STUDIO — MEDIA LIBRARY FOUNDATION (v1) · 2026-07-19
--
-- Run AFTER 20260717020000_bazaar_media_v1.sql.
--
-- The Creators Studio (a Workshop section, /studio) gains a per-Bee media
-- library: images, video, audio, AND documents — the central shelf every
-- Astra (Groups, COMMs, Events, Pulse, Bazaar, …) can pull from. Editors
-- (image / video / response recorder) save their exports back here.
--
-- What this does:
--   1. Creates the `creator-media` storage bucket (public read, MIME
--      allowlist spanning image/video/audio/document; size cap governed by
--      the project-global upload limit — no bucket-level override).
--   2. Creates public.media_folders — logical folders, per-Bee tree.
--      Folders are DB-level only; storage paths stay flat, so a move is a
--      metadata UPDATE, never a storage copy.
--   3. Creates public.media_assets — one row per library item. Kind
--      discriminator (image|video|audio|document), storage pointer,
--      intrinsic metadata (bytes, dimensions, duration), organization
--      (folder, title, alt text, tags), lineage (source, edit_of), and
--      soft-delete trash (trashed_at).
--   4. updated_at auto-bump triggers (reuses public.set_updated_at()).
--   5. RLS — user-authored content pattern: owner-scoped SELECT / INSERT /
--      UPDATE / DELETE on both tables (auth.uid() = bee_id). Anon: zero.
--   6. Storage RLS on `creator-media` objects — path convention
--      library/{bee_id}/{uuid}.{ext}; only the owning Bee writes/deletes
--      under their prefix. Public SELECT (public bucket precedent:
--      group-media).
--   7. public.media_library_usage() — per-kind byte/count totals for the
--      calling Bee (quota display in the Library UI).
--
-- What this does NOT do:
--   * No cross-Astra link table (entity_media_links) — Astra attach by URL
--     in v1; a link spine lands with the first real consumer.
--   * No quota ENFORCEMENT — usage RPC is read-only; caps are a policy
--     decision for a later dispatch.
--   * No changes to group-media bucket or existing Astra media flows.
--   * No BLiNG! integration (no fees, no Drops on upload).
--   * No transcoding / thumbnail pipeline — client renders previews from
--     originals in v1.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- DROP POLICY IF EXISTS → CREATE POLICY, DROP TRIGGER IF EXISTS → CREATE
-- TRIGGER, CREATE OR REPLACE FUNCTION, bucket INSERT ... ON CONFLICT DO
-- NOTHING.
--
-- ⚠ FK note: media_assets.bee_id / media_folders.bee_id → bees(id)
--   ON DELETE CASCADE (user-authored content posture — purging a Bee purges
--   their library rows; storage objects are removed by the client/ops, not
--   by this FK).
-- ⚠ Language firewall: nothing here is Bee-facing copy; column values
--   ('upload', 'ready', …) never render verbatim in UI.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 — creator-media bucket
-- ─────────────────────────────────────────────────────────────────────────────
-- Public read (URL sharing across Astra), MIME allowlist for the four kinds.
-- file_size_limit NULL → project-global upload cap governs (raise globally
-- when video demands it; bucket needs no per-bucket ceiling).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-media',
  'creator-media',
  true,
  NULL,
  ARRAY[
    -- images
    'image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/avif',
    -- video
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    -- audio
    'audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/ogg',
    'audio/webm','audio/flac',
    -- documents
    'application/pdf','text/plain','text/markdown','text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 — media_folders (logical tree, per Bee)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_folders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id      uuid NOT NULL REFERENCES public.bees(id)
                    ON DELETE CASCADE ON UPDATE CASCADE,
    name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    parent_id   uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_folders IS
  'Creator Studio library folders — logical per-Bee tree. Storage paths stay flat (library/{bee_id}/{uuid}.{ext}); folder membership lives on media_assets.folder_id, so moves are metadata-only. creator_studio_media_v1 2026-07-19.';

-- One name per level per Bee (root level keyed via the nil uuid sentinel).
CREATE UNIQUE INDEX IF NOT EXISTS media_folders_unique_name_per_level
    ON public.media_folders (
      bee_id,
      COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
      lower(name)
    );

CREATE INDEX IF NOT EXISTS media_folders_bee_parent_idx
    ON public.media_folders (bee_id, parent_id);

DROP TRIGGER IF EXISTS media_folders_set_updated_at ON public.media_folders;
CREATE TRIGGER media_folders_set_updated_at
    BEFORE UPDATE ON public.media_folders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — media_assets (the shelf)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_assets (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id           uuid NOT NULL REFERENCES public.bees(id)
                         ON DELETE CASCADE ON UPDATE CASCADE,
    kind             text NOT NULL CHECK (kind IN ('image','video','audio','document')),
    bucket           text NOT NULL DEFAULT 'creator-media',
    storage_path     text NOT NULL UNIQUE,
    file_name        text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
    mime_type        text NOT NULL,
    byte_size        bigint NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
    width            integer CHECK (width IS NULL OR width > 0),
    height           integer CHECK (height IS NULL OR height > 0),
    duration_seconds numeric(10,3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    folder_id        uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
    title            text CHECK (title IS NULL OR char_length(title) <= 200),
    alt_text         text CHECK (alt_text IS NULL OR char_length(alt_text) <= 500),
    description      text CHECK (description IS NULL OR char_length(description) <= 2000),
    tags             text[] NOT NULL DEFAULT '{}',
    source           text NOT NULL DEFAULT 'upload'
                         CHECK (source IN ('upload','image_editor','video_editor','response_recorder','import')),
    edit_of          uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
    status           text NOT NULL DEFAULT 'ready'
                         CHECK (status IN ('uploading','ready','failed')),
    trashed_at       timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_assets IS
  'Creator Studio media library — one row per item (image|video|audio|document). storage_path points into creator-media bucket (library/{bee_id}/{uuid}.{ext}). source+edit_of track editor lineage; trashed_at = soft-delete trash. Astra attach by public URL in v1. creator_studio_media_v1 2026-07-19.';

CREATE INDEX IF NOT EXISTS media_assets_bee_kind_created_idx
    ON public.media_assets (bee_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS media_assets_bee_folder_idx
    ON public.media_assets (bee_id, folder_id)
    WHERE trashed_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_bee_trashed_idx
    ON public.media_assets (bee_id, trashed_at DESC)
    WHERE trashed_at IS NOT NULL;

-- pg_trgm fuzzy search across name/title (house rule 6: never skip trgm on
-- searchable text).
CREATE INDEX IF NOT EXISTS media_assets_file_name_trgm_idx
    ON public.media_assets USING gin (file_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS media_assets_title_trgm_idx
    ON public.media_assets USING gin (title gin_trgm_ops);

DROP TRIGGER IF EXISTS media_assets_set_updated_at ON public.media_assets;
CREATE TRIGGER media_assets_set_updated_at
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 — RLS (user-authored content pattern: owner-scoped everything)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_folders FROM anon;
REVOKE ALL ON public.media_assets  FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets  TO authenticated;

DROP POLICY IF EXISTS "media_folders_owner_select" ON public.media_folders;
CREATE POLICY "media_folders_owner_select" ON public.media_folders
    FOR SELECT TO authenticated USING (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_folders_owner_insert" ON public.media_folders;
CREATE POLICY "media_folders_owner_insert" ON public.media_folders
    FOR INSERT TO authenticated WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_folders_owner_update" ON public.media_folders;
CREATE POLICY "media_folders_owner_update" ON public.media_folders
    FOR UPDATE TO authenticated
    USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_folders_owner_delete" ON public.media_folders;
CREATE POLICY "media_folders_owner_delete" ON public.media_folders
    FOR DELETE TO authenticated USING (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_assets_owner_select" ON public.media_assets;
CREATE POLICY "media_assets_owner_select" ON public.media_assets
    FOR SELECT TO authenticated USING (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_assets_owner_insert" ON public.media_assets;
CREATE POLICY "media_assets_owner_insert" ON public.media_assets
    FOR INSERT TO authenticated WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_assets_owner_update" ON public.media_assets;
CREATE POLICY "media_assets_owner_update" ON public.media_assets
    FOR UPDATE TO authenticated
    USING (bee_id = auth.uid()) WITH CHECK (bee_id = auth.uid());

DROP POLICY IF EXISTS "media_assets_owner_delete" ON public.media_assets;
CREATE POLICY "media_assets_owner_delete" ON public.media_assets
    FOR DELETE TO authenticated USING (bee_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 — storage RLS on creator-media objects
-- ─────────────────────────────────────────────────────────────────────────────
-- Path convention: library/{bee_id}/{uuid}.{ext}. Prefix segment 2 must equal
-- the caller's uid on INSERT; owner (or prefix) governs UPDATE/DELETE.

DROP POLICY IF EXISTS "creator_media_insert" ON storage.objects;
CREATE POLICY "creator_media_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'creator-media'
      AND (storage.foldername(name))[1] = 'library'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    );

DROP POLICY IF EXISTS "creator_media_read" ON storage.objects;
CREATE POLICY "creator_media_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'creator-media');

DROP POLICY IF EXISTS "creator_media_update" ON storage.objects;
CREATE POLICY "creator_media_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'creator-media'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    WITH CHECK (bucket_id = 'creator-media');

DROP POLICY IF EXISTS "creator_media_delete" ON storage.objects;
CREATE POLICY "creator_media_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'creator-media'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 — media_library_usage() — quota readout for the calling Bee
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY INVOKER: RLS scopes rows to the caller. Trash included (it still
-- occupies storage until purged).

CREATE OR REPLACE FUNCTION public.media_library_usage()
RETURNS TABLE (kind text, asset_count bigint, total_bytes bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT a.kind, count(*)::bigint, COALESCE(sum(a.byte_size), 0)::bigint
  FROM public.media_assets a
  WHERE a.bee_id = auth.uid()
  GROUP BY a.kind
$$;

REVOKE EXECUTE ON FUNCTION public.media_library_usage() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.media_library_usage() TO authenticated;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually; do not execute as part of the migration)
--
-- 1. Bucket exists with MIME allowlist:
--      SELECT id, public, allowed_mime_types FROM storage.buckets
--      WHERE id = 'creator-media';
--    → one row, public = true, 28 MIME types.
--
-- 2. Tables + RLS:
--      SELECT relname, relrowsecurity FROM pg_class
--      WHERE relname IN ('media_assets','media_folders');
--    → both rows relrowsecurity = t.
--
-- 3. Policies (8 table + 4 storage):
--      SELECT policyname FROM pg_policies
--      WHERE tablename IN ('media_assets','media_folders')
--         OR policyname LIKE 'creator_media_%';
--    → 12 rows.
--
-- 4. Usage RPC gated:
--      SELECT proname FROM pg_proc WHERE proname = 'media_library_usage';
--    → one row; EXECUTE denied to anon (check information_schema.
--      routine_privileges or attempt as anon → permission denied).
--
-- 5. Owner-scope smoke (as a signed-in Bee):
--      INSERT INTO media_folders (bee_id, name) VALUES (auth.uid(), 'Test');
--      SELECT count(*) FROM media_folders;   -- ≥ 1, only own rows
--
-- ROLLBACK PLAN (destructive — removes the library schema and bucket config;
-- storage OBJECTS in creator-media are NOT deleted by this):
--
--   -- BEGIN;
--   -- DROP FUNCTION IF EXISTS public.media_library_usage();
--   -- DROP POLICY IF EXISTS "creator_media_insert"  ON storage.objects;
--   -- DROP POLICY IF EXISTS "creator_media_read"    ON storage.objects;
--   -- DROP POLICY IF EXISTS "creator_media_update"  ON storage.objects;
--   -- DROP POLICY IF EXISTS "creator_media_delete"  ON storage.objects;
--   -- DROP TABLE IF EXISTS public.media_assets;
--   -- DROP TABLE IF EXISTS public.media_folders;
--   -- DELETE FROM storage.buckets WHERE id = 'creator-media';
--   --   (⚠ only after emptying the bucket via storage API)
--   -- COMMIT;
--
-- END creator_studio_media_v1
-- ═════════════════════════════════════════════════════════════════════════════
