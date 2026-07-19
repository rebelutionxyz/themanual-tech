-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719070000_creator_studio_media_v1a_scope_object_listing.sql
-- CREATOR STUDIO MEDIA v1a — scope storage object LISTING to the owner · 2026-07-19
--
-- Run AFTER 20260719060000_creator_studio_media_v1.sql.
--
-- Advisor `public_bucket_allows_listing` flagged creator_media_read
-- (SELECT USING bucket_id='creator-media') — a broad policy lets any client
-- ENUMERATE every object in the bucket via the storage list API. Public-URL
-- object ACCESS does not need this policy at all (public buckets serve
-- object URLs outside RLS), and the Library UI lists from media_assets, not
-- storage.list(). So listing can be owner-scoped with zero behavior loss.
--
-- What this does:
--   1. Replaces creator_media_read with an owner-prefix SELECT policy
--      (authenticated, library/{auth.uid()}/… only).
--
-- What this does NOT do:
--   * No change to public URL serving (bucket stays public).
--   * No change to group-media policies (pre-existing pattern, separate call).
--
-- Idempotent: DROP POLICY IF EXISTS → CREATE POLICY.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS "creator_media_read" ON storage.objects;
CREATE POLICY "creator_media_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'creator-media'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    );

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually)
--
-- 1. SELECT policyname, roles::text, qual FROM pg_policies
--    WHERE policyname = 'creator_media_read';
--    → one row, roles {authenticated}, qual includes foldername[2] = auth.uid.
--
-- ROLLBACK PLAN (restores the broad read policy):
--   -- DROP POLICY IF EXISTS "creator_media_read" ON storage.objects;
--   -- CREATE POLICY "creator_media_read" ON storage.objects
--   --     FOR SELECT USING (bucket_id = 'creator-media');
--
-- END creator_studio_media_v1a
-- ═════════════════════════════════════════════════════════════════════════════
