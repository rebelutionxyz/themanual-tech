-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719151000_creator_studio_media_quota_v1.sql
-- CREATOR STUDIO — LIBRARY STORAGE QUOTA (v1 flat cap) · 2026-07-19
--
-- Run AFTER 20260719150000_creator_studio_collections_v2_visibility.sql.
--
-- Dispatch 4: per-Bee library cap. v1 policy: FLAT 2 GiB for every Bee —
-- a single source of truth in media_quota_cap() so a later dispatch can
-- swap in tier-based caps (membership ladder) by editing ONE function.
--
-- What this does:
--   1. media_quota_cap() — the cap in bytes (2 GiB v1).
--   2. media_quota_guard() BEFORE INSERT trigger on media_assets — rejects
--      an insert that would push the Bee past the cap (trash still counts;
--      purge frees space). Client shows a friendly message on P0001.
--   3. media_quota_status() — { used_bytes, cap_bytes } for the meter UI.
--
-- What this does NOT do:
--   * No retroactive enforcement on existing rows (guard is insert-time).
--   * No tier lookups yet — cap function is deliberately dumb.
--   * No storage-layer enforcement (metadata-row guard; the client removes
--     the storage object when the row insert is rejected — same cleanup
--     path it already uses for any insert failure).
--
-- Idempotent: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS → CREATE.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.media_quota_cap()
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 2147483648::bigint $$;  -- 2 GiB flat, v1

COMMENT ON FUNCTION public.media_quota_cap() IS
  'Creator Studio library cap in bytes (v1: flat 2 GiB for every Bee). Single source of truth — swap for tier-based caps here. creator_studio_media_quota_v1 2026-07-19.';

CREATE OR REPLACE FUNCTION public.media_quota_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_used bigint;
BEGIN
  SELECT COALESCE(sum(byte_size), 0) INTO v_used
  FROM public.media_assets
  WHERE bee_id = NEW.bee_id;
  IF v_used + COALESCE(NEW.byte_size, 0) > public.media_quota_cap() THEN
    RAISE EXCEPTION 'library quota exceeded' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_assets_quota_guard ON public.media_assets;
CREATE TRIGGER media_assets_quota_guard
    BEFORE INSERT ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION public.media_quota_guard();

CREATE OR REPLACE FUNCTION public.media_quota_status()
RETURNS TABLE (used_bytes bigint, cap_bytes bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT sum(a.byte_size) FROM public.media_assets a WHERE a.bee_id = auth.uid()), 0)::bigint,
    public.media_quota_cap()
$$;

REVOKE EXECUTE ON FUNCTION public.media_quota_status() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.media_quota_status() TO authenticated;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run manually)
-- 1. SELECT public.media_quota_cap(); → 2147483648
-- 2. SELECT * FROM public.media_quota_status();  (as a Bee) → used, 2147483648
-- 3. Guard smoke: insert a media_assets row with byte_size = 3e9 as a Bee
--    → ERROR 'library quota exceeded'.
--
-- ROLLBACK PLAN:
--   -- BEGIN;
--   -- DROP TRIGGER IF EXISTS media_assets_quota_guard ON public.media_assets;
--   -- DROP FUNCTION IF EXISTS public.media_quota_guard();
--   -- DROP FUNCTION IF EXISTS public.media_quota_status();
--   -- DROP FUNCTION IF EXISTS public.media_quota_cap();
--   -- COMMIT;
--
-- END creator_studio_media_quota_v1
-- ═════════════════════════════════════════════════════════════════════════════
