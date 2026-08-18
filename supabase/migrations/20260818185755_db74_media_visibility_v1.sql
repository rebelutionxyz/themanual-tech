-- =============================================================================
-- FORWARD — db74 media_assets.visibility v1
-- Step 0 of the DB74 HYBRID proposal (see REPORT.md, DB74). Owner-approved
-- 2026-08-18: three-state ENUM, not a boolean; 'sealed' is NOT a visibility
-- value — sealing is the encryption applied to private/consented files and is
-- tracked SEPARATELY (a later migration), aligned with the DB76 consent ledger.
--
-- Rollback: _drafts/20260818185755_db74_media_visibility_v1_rollback.sql (first).
-- (Filename stamped 20260818185755 by apply_migration; authored as ...185449.)
-- Model: ORACLE_MF v1.39 Access model (five scopes) + v1.31 hybrid fork.
--
-- WHAT THIS IS: a pure discriminator. It records the OWNER'S INTENT for an asset;
-- it does not itself move bytes, change a bucket ACL, or encrypt anything. It is
-- purely additive — a new enum type and one NOT NULL column defaulting to
-- 'public', which is exactly today's reality (every existing asset is served from
-- the public creator-media bucket). Enforcement of 'consented'/'private' lands in
-- later steps (sealed storage path, consent_grants mediation, bucket routing).
--
--   public     world-readable; served by public URL, no grant required.
--              Today's default and today's only real state.
--   consented  access is MEDIATED BY THE CONSENT LEDGER — reachable by another
--              party only via a live consent_grants row (scope_kind file/folder,
--              scope_ref = this asset). Bytes are sealed; the grant governs use.
--   private    owner-only, never shared. Bytes are sealed. No grant path out.
--
-- 'consented' and 'private' are the two states to which file-level SEALING
-- applies; that sealing marker is deliberately NOT in this file (separate concern,
-- separate migration) so visibility-intent and encryption-state never conflate.
-- =============================================================================

BEGIN;

CREATE TYPE public.media_visibility AS ENUM ('public', 'consented', 'private');

ALTER TABLE public.media_assets
  ADD COLUMN visibility public.media_visibility NOT NULL DEFAULT 'public';

COMMENT ON COLUMN public.media_assets.visibility IS
  'Owner intent, ORACLE_MF v1.39: public = world-readable; consented = access mediated by consent_grants (DB76); private = owner-only. Sealing (encryption) applies to consented/private and is tracked separately, not here.';

-- ── Verify (fails the migration if the shape is wrong).
DO $verify$
BEGIN
  IF to_regtype('public.media_visibility') IS NULL THEN
    RAISE EXCEPTION 'db74: media_visibility enum missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'media_assets'
       AND column_name = 'visibility'
       AND is_nullable = 'NO'
       AND column_default LIKE '%media_visibility%'
  ) THEN
    RAISE EXCEPTION 'db74: media_assets.visibility column missing or wrong shape';
  END IF;

  -- Exactly the three approved values, in order.
  IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'media_visibility')
     <> ARRAY['public','consented','private']
  THEN
    RAISE EXCEPTION 'db74: media_visibility values are not exactly public/consented/private';
  END IF;
END
$verify$;

COMMIT;
