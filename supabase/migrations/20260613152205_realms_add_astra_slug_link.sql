-- =============================================================================
-- Migration 20260613152205 — realms.astra_slug (Intel toolbar realm → Astra jump)
-- =============================================================================
-- Status:  APPLIED to production 2026-06-13 (version 20260613152205). This file
--          is a PARITY BACKFILL — the applied migration was authored against the
--          live DB; this reproduces it for repo parity and fresh-DB rebuilds.
--          Idempotent; re-applying is a no-op.
--
-- Purpose:
--   Adds a soft reference from each realm to the Astra it jumps to from the
--   INTEL Top Top toolbar. NULL = no dedicated Astra. Soft ref by design (no FK)
--   — astra_registry is authenticated-only RLS, while realms is anon-readable;
--   a hard FK would couple anon realm reads to a table anon can't see, and the
--   mapping is editorial (one realm may point at an Astra that serves several
--   realms, e.g. AtlasADVOCATE serves Legal + Justice).
--
--   Seed mapping: justice -> atlasadvocate. Other realms stay NULL until a
--   dedicated Astra is assigned.
-- =============================================================================

BEGIN;

ALTER TABLE public.realms
    ADD COLUMN IF NOT EXISTS astra_slug text;

COMMENT ON COLUMN public.realms.astra_slug IS
    'Soft ref to astra_registry.slug; the Astra this realm jumps to from the '
    'Intel toolbar. NULL = no dedicated Astra. justice -> atlasadvocate '
    '(AtlasADVOCATE, serves Legal + Justice).';

-- Seed: Justice → AtlasADVOCATE.
UPDATE public.realms SET astra_slug = 'atlasadvocate' WHERE id = 'justice';

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
--   SELECT id, name, astra_slug FROM public.realms WHERE astra_slug IS NOT NULL;
--   -- expect: justice | Justice | atlasadvocate
--
-- ROLLBACK (reference only):
--   ALTER TABLE public.realms DROP COLUMN IF EXISTS astra_slug;
