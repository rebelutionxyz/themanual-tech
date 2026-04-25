-- =============================================================================
-- Phase 1 — Drop old taxonomy-related tables
-- =============================================================================
-- DESTRUCTIVE. Run only after:
--   1. Phase 0 dump completed and verified
--   2. Phase 0.5 inspection confirmed no hidden atoms/realms tables
--
-- Drops only taxonomy tables. Preserves bees, transactions/Stripe-related,
-- forum/groups/events/bazaar/messaging — wipes only the atom-link rows
-- (10 rows) since those reference soon-deleted atoms.
--
-- Order matters: drop FK-dependent tables first.
-- =============================================================================

BEGIN;

-- 1. Wipe rows that reference atoms (10 entity_atom_links, 0 of others)
TRUNCATE TABLE
    atom_comments,
    atom_kettle_votes,
    atom_sources,
    entity_atom_links,
    entity_category_links
RESTART IDENTITY CASCADE;

-- 2. Drop atom-companion tables. We will recreate them in Phase 2 with
--    column types matching the new atoms.id (TEXT, since atom IDs are
--    string slugs like "justice-government-accountability-...").
DROP TABLE IF EXISTS atom_comments      CASCADE;
DROP TABLE IF EXISTS atom_kettle_votes  CASCADE;
DROP TABLE IF EXISTS atom_sources       CASCADE;
DROP TABLE IF EXISTS entity_atom_links  CASCADE;
DROP TABLE IF EXISTS entity_category_links CASCADE;

-- 3. Drop any pre-existing realms / atoms tables if a previous attempt
--    left them around (idempotent re-run safety).
DROP TABLE IF EXISTS atoms  CASCADE;
DROP TABLE IF EXISTS realms CASCADE;

-- 4. Drop any taxonomy-specific functions/triggers if present
DROP FUNCTION IF EXISTS atom_path_tsvector(text) CASCADE;

COMMIT;

-- Verify nothing taxonomy-shaped remains
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%atom%' OR table_name ILIKE '%realm%')
ORDER BY table_name;
-- Expected: 0 rows
