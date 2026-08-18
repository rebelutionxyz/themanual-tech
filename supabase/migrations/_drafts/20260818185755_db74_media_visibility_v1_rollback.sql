-- =============================================================================
-- ROLLBACK — db74 media_assets.visibility v1
-- Authored FIRST, before the forward file, per the MIGRATION AMENDMENT.
-- Parked in _drafts/ (a recovery script, not a migration the reconcile ledger applies).
--
-- Reverses: 20260818185755_db74_media_visibility_v1.sql
-- Purely additive forward migration → rollback is a clean DROP. No data is lost
-- that the forward migration did not itself introduce: the column is a pure
-- discriminator with no user content, and every row carried the default 'public'.
-- =============================================================================

BEGIN;

ALTER TABLE public.media_assets DROP COLUMN IF EXISTS visibility;

DROP TYPE IF EXISTS public.media_visibility;

COMMIT;
