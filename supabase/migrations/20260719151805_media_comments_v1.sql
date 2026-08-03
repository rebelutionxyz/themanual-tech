-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719170000_media_comments_v1.sql
-- CREATOR STUDIO — MEDIA DISCUSSIONS (comment threads on media) · 2026-07-19
--
-- Run AFTER 20260719153000_creator_studio_media_quota_v1a_search_path_hygiene.sql.
--
-- Butch, dispatch 5: "open an image and to the right there's a thread where
-- users can comment or debate the image or video or album or doc." One
-- generic comment spine covers every media surface:
--
--   target_kind 'asset'       → a Library asset (uuid ref)   — Showcase items
--   target_kind 'collection'  → a whole shelf (uuid ref)     — Album debates
--   target_kind 'group_image' → a group-album object (path)  — UNITE albums
--
-- Posture mirrors pulse_comments: writes ONLY via SECURITY DEFINER RPCs,
-- hive-read (authenticated) with removed rows hidden, author soft-delete.
--
-- What this does:
--   1. public.media_comments — the spine (generic text ref, no FK: targets
--      span two shapes; orphan comments on deleted media are harmless and
--      invisible once the surface is gone).
--   2. media_comment_post(kind, ref, body) — validated insert, returns id.
--   3. media_comment_remove(id) — author-only soft delete.
--
-- What this does NOT do:
--   * No notifications yet (asset-owner pings are a later dispatch).
--   * No votes on comments, no nesting — flat thread v1.
--   * No moderation surface (author-remove only; group-mod remove later).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
-- DROP POLICY IF EXISTS → CREATE POLICY.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 — media_comments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_comments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_kind  text NOT NULL CHECK (target_kind IN ('asset','collection','group_image')),
    target_ref   text NOT NULL CHECK (char_length(target_ref) BETWEEN 1 AND 500),
    bee_id       uuid NOT NULL REFERENCES public.bees(id)
                     ON DELETE CASCADE ON UPDATE CASCADE,
    body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at   timestamptz NOT NULL DEFAULT now(),
    removed_at   timestamptz
);

COMMENT ON TABLE public.media_comments IS
  'Discussion threads on media surfaces (asset | collection | group_image). Generic text target_ref (uuid or storage path). Writes via media_comment_post/remove SECDEF RPCs only; RLS read hides removed. media_comments_v1 2026-07-19.';

CREATE INDEX IF NOT EXISTS media_comments_target_idx
    ON public.media_comments (target_kind, target_ref, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 — RLS: hive-read (removed hidden), zero direct writes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_comments FROM anon;
GRANT SELECT ON public.media_comments TO authenticated;

DROP POLICY IF EXISTS "media_comments_hive_read" ON public.media_comments;
CREATE POLICY "media_comments_hive_read" ON public.media_comments
    FOR SELECT TO authenticated
    USING (removed_at IS NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — write RPCs (SECURITY DEFINER, pulse_comments pattern)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.media_comment_post(
    p_target_kind text,
    p_target_ref  text,
    p_body        text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bee uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_bee IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;
  IF p_target_kind NOT IN ('asset','collection','group_image') THEN
    RAISE EXCEPTION 'unknown target kind';
  END IF;
  IF char_length(coalesce(trim(p_body), '')) < 1 THEN
    RAISE EXCEPTION 'empty comment';
  END IF;
  INSERT INTO public.media_comments (target_kind, target_ref, bee_id, body)
  VALUES (p_target_kind, p_target_ref, v_bee, trim(p_body))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.media_comment_remove(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bee uuid := auth.uid();
BEGIN
  IF v_bee IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;
  UPDATE public.media_comments
  SET removed_at = now()
  WHERE id = p_comment_id
    AND bee_id = v_bee
    AND removed_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not your comment (or already removed)' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.media_comment_post(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.media_comment_remove(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.media_comment_post(text, text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.media_comment_remove(uuid) TO authenticated;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually)
-- 1. SELECT relrowsecurity FROM pg_class WHERE relname='media_comments'; → t
-- 2. As Bee A: SELECT media_comment_post('asset','<uuid>','First!'); → uuid
--    As Bee B: SELECT count(*) FROM media_comments; → sees it.
--    As Bee B: media_comment_remove(<that id>) → 42501 (not the author).
--    As Bee A: media_comment_remove(<that id>) → ok; Bee B count → 0.
-- 3. Direct INSERT as authenticated → permission denied (no write policy).
--
-- ROLLBACK PLAN:
--   -- BEGIN;
--   -- DROP FUNCTION IF EXISTS public.media_comment_remove(uuid);
--   -- DROP FUNCTION IF EXISTS public.media_comment_post(text, text, text);
--   -- DROP TABLE IF EXISTS public.media_comments;
--   -- COMMIT;
--
-- END media_comments_v1
-- ═════════════════════════════════════════════════════════════════════════════
