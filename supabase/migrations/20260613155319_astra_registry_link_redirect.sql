-- =============================================================================
-- Migration 20260613155319 — astra_registry.link_redirect_slug
-- =============================================================================
-- Status:  APPLIED to production 2026-06-13 (version 20260613155319). This file
--          is a PARITY BACKFILL — reproduces the applied migration for repo
--          parity and fresh-DB rebuilds. Idempotent; re-applying is a no-op.
--
-- Purpose:
--   Lets a grid Astra point its link at ANOTHER Astra's surface while its own
--   surface isn't built yet. The INTEL Astras grid still shows the row's own
--   default_name; clicking routes to the target slug's surface instead.
--   NULL = links to its own surface.
--
--   Seed: thehoneycombgames (Games) -> braindualgames (Trivia/Braindual).
-- =============================================================================

BEGIN;

ALTER TABLE public.astra_registry
    ADD COLUMN IF NOT EXISTS link_redirect_slug text;

COMMENT ON COLUMN public.astra_registry.link_redirect_slug IS
    'If set, the grid item links to this target slug''s surface instead of its '
    'own (surface-not-built-yet redirect). NULL = links to own surface.';

UPDATE public.astra_registry
    SET link_redirect_slug = 'braindualgames'
    WHERE slug = 'thehoneycombgames';

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
--   SELECT slug, default_name, link_redirect_slug
--   FROM public.astra_registry WHERE link_redirect_slug IS NOT NULL;
--   -- expect: thehoneycombgames | Games | braindualgames
--
-- ROLLBACK (reference only):
--   ALTER TABLE public.astra_registry DROP COLUMN IF EXISTS link_redirect_slug;
