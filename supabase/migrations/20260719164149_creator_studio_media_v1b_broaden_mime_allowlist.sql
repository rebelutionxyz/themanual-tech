-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719180000_creator_studio_media_v1b_broaden_mime_allowlist.sql
-- CREATOR STUDIO — v1b: broaden creator-media MIME allowlist · 2026-07-19
--
-- Run AFTER 20260719170000_media_comments_v1.sql.
--
-- Dispatch 5.1 hotfix (live upload testing, Butch 2026-07-19 morning):
-- real-world files arrive as .avi / .mpeg / .m4v / .3gp / .m4a too. Add
-- them so honest uploads aren't bounced on MIME; the per-file SIZE cap
-- (project-level storage setting) remains the real gate for big videos.
-- Companion client change keeps MEDIA_ACCEPT in src/lib/media.ts in sync
-- and surfaces upload-failure reasons inline in the tray.
--
-- Idempotent: plain UPDATE (safe to re-run).
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- images
  'image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/avif',
  -- video
  'video/mp4','video/webm','video/quicktime','video/x-matroska',
  'video/x-msvideo','video/mpeg','video/x-m4v','video/3gpp',
  -- audio
  'audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/ogg',
  'audio/webm','audio/flac','audio/x-m4a',
  -- documents
  'application/pdf','text/plain','text/markdown','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'creator-media';

COMMIT;

-- VERIFICATION: SELECT array_length(allowed_mime_types,1) FROM storage.buckets
--               WHERE id='creator-media'; → 33
-- ROLLBACK: re-run the v1 array (28 types) via the same UPDATE.
--
-- END creator_studio_media_v1b
-- ═════════════════════════════════════════════════════════════════════════════
