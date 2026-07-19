-- ═════════════════════════════════════════════════════════════════════════════
-- 20260719153000_creator_studio_media_quota_v1a_search_path_hygiene.sql
-- CREATOR STUDIO — quota v1a: pin search_path on media_quota_cap · 2026-07-19
--
-- Run AFTER 20260719151000_creator_studio_media_quota_v1.sql.
--
-- Advisor flagged function_search_path_mutable on media_quota_cap (house
-- rule: harden_function_search_paths, 2026-06-06). Behavior unchanged.
--
-- Companion note: the advisor also WARNs that media_asset_in_public_shelf
-- (SECURITY DEFINER) is REST-executable by authenticated. That grant is
-- REQUIRED — RLS policies execute it as the querying role — and the
-- function only answers "is this asset on a public shelf?", which is
-- definitionally public information. Accepted.
--
-- Idempotent: CREATE OR REPLACE FUNCTION.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.media_quota_cap()
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 2147483648::bigint $$;

COMMENT ON FUNCTION public.media_quota_cap() IS
  'Creator Studio library cap in bytes (v1: flat 2 GiB for every Bee). Single source of truth — swap for tier-based caps here. creator_studio_media_quota_v1 2026-07-19.';

COMMIT;

-- END creator_studio_media_quota_v1a
-- ═════════════════════════════════════════════════════════════════════════════
