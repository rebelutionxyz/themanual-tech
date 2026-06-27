-- =============================================================================
-- Migration 20260613154351 — astra_registry grid columns (default_name,
--                            astra_grid_group, show_in_grid)
-- =============================================================================
-- Status:  APPLIED to production 2026-06-13 (version 20260613154351). This file
--          is a PARITY BACKFILL — reproduces the applied migration for repo
--          parity and fresh-DB rebuilds. Idempotent; re-applying is a no-op.
--
-- Purpose:
--   Makes astra_registry the durable source for the INTEL Astras grid.
--     - default_name      — canonical/function name shown in the grid
--                            (e.g. 'Forum', 'Legal'). Skin aliases like INTEL /
--                            UNITE / RULE are NOT defaults — they live in the
--                            skin layer.
--     - astra_grid_group  — grid grouping bucket; NULL falls back to the
--                            frontend slug→group map.
--     - show_in_grid      — whether the row appears in the Astras grid. Default
--                            true; the spine fronts (themanual, freedomblings)
--                            are flipped false so they don't double up with the
--                            internal surfaces.
-- =============================================================================

BEGIN;

ALTER TABLE public.astra_registry
    ADD COLUMN IF NOT EXISTS default_name     text,
    ADD COLUMN IF NOT EXISTS astra_grid_group text,
    ADD COLUMN IF NOT EXISTS show_in_grid     boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.astra_registry.default_name IS
    'Canonical/function name shown in the INTEL Astras grid (e.g. Forum, Legal). '
    'Skin aliases (INTEL/UNITE/RULE) are not defaults — they live in the skin layer.';
COMMENT ON COLUMN public.astra_registry.astra_grid_group IS
    'INTEL Astras grid grouping bucket. NULL falls back to the frontend slug→group map.';
COMMENT ON COLUMN public.astra_registry.show_in_grid IS
    'Whether this Astra appears in the INTEL Astras grid. Default true.';

-- Canonical/function names per Astra.
UPDATE public.astra_registry AS a
SET default_name = v.default_name
FROM (VALUES
    ('atlasnation',       'Groups'),
    ('atlasintel',        'Forum'),
    ('atlasunited',       'Events'),
    ('atlascomms',        'Comms'),
    ('atlaslounge',       'Lounge'),
    ('atlasvote',         'Voting'),
    ('atlasads',          'Promotions'),
    ('entertheprize',     'Marketplace'),
    ('atlasresidential',  'Residential'),
    ('atlasenlightened',  'Education'),
    ('atlasindustry',     'Pro Services'),
    ('atlasadvocate',     'Legal'),
    ('freedomnetwork',    'Freedom Network'),
    ('freedomrings',      'Freedom Rings'),
    ('braindualgames',    'Trivia'),
    ('houseofcardgames',  'Cards'),
    ('thebeegames',       'Spelling Bee'),
    ('blingster',         'Wagering'),
    ('atlasoracle',       'AI'),
    ('brandosophic',      'Skins'),
    ('dingleberry',       'Security'),
    ('thehoneycombgames', 'Games'),
    ('honeycombglobal',   'HoneyComb'),
    ('freedomblings',     'Currency'),
    ('themanual',         'Knowledge')
) AS v(slug, default_name)
WHERE a.slug = v.slug;

-- Rows excluded from the grid (spine fronts + game houses rolled up under the
-- Games umbrella + not-yet-fronted Astras).
UPDATE public.astra_registry
    SET show_in_grid = false
    WHERE slug IN (
        'freedomblings', 'themanual', 'honeycombglobal',
        'braindualgames', 'houseofcardgames', 'thebeegames',
        'blingster', 'freedomrings'
    );

-- Grid grouping (every show_in_grid=true row carries a group; grouping is data).
UPDATE public.astra_registry
    SET astra_grid_group = 'Community'
    WHERE slug IN (
        'atlasnation', 'atlasintel', 'atlasunited', 'atlascomms',
        'atlaslounge', 'thehoneycombgames', 'freedomnetwork'
    );

UPDATE public.astra_registry
    SET astra_grid_group = 'Services'
    WHERE slug IN (
        'atlasoracle', 'dingleberry', 'atlasadvocate', 'atlasindustry',
        'entertheprize', 'atlasads', 'atlasresidential', 'atlasvote',
        'atlasenlightened', 'brandosophic'
    );

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
--   SELECT slug, default_name, astra_grid_group, show_in_grid
--   FROM public.astra_registry ORDER BY show_in_grid DESC, slug;
--   -- expect: show_in_grid=false only for themanual + freedomblings;
--   --         astra_grid_group='Services' only for dingleberry.
--
-- ROLLBACK (reference only):
--   ALTER TABLE public.astra_registry
--     DROP COLUMN IF EXISTS default_name,
--     DROP COLUMN IF EXISTS astra_grid_group,
--     DROP COLUMN IF EXISTS show_in_grid;
