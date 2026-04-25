-- =============================================================================
-- Phase 0.5 — Inspect existing atom-related columns BEFORE dropping anything
-- =============================================================================
-- Run this in Supabase SQL Editor. Paste the output back to Claude before
-- running 01_drop_old_taxonomy.sql. We need to know:
--   1. Whether atom data lives inline somewhere we missed
--   2. What column types entity_atom_links uses to reference atoms
--      (text? uuid? bigint?) — the new atoms.id column must match
-- =============================================================================

-- 1. All columns on every atom-related and entity-link table
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'atom_comments',
      'atom_kettle_votes',
      'atom_sources',
      'entity_atom_links',
      'entity_category_links',
      'pillars'
  )
ORDER BY table_name, ordinal_position;

-- 2. Any existing FK constraints pointing at presumed atom/realm tables
SELECT
    tc.table_name      AS source_table,
    kcu.column_name    AS source_column,
    ccu.table_name     AS target_table,
    ccu.column_name    AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema   = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema   = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
ORDER BY source_table, source_column;

-- 3. Sample rows from entity_atom_links to see what atom_id values look like
SELECT * FROM entity_atom_links LIMIT 10;

-- 4. Confirm there's no hidden atoms / realms / categories table
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
      table_name ILIKE '%atom%'
      OR table_name ILIKE '%realm%'
      OR table_name ILIKE '%categor%'
      OR table_name ILIKE '%taxonom%'
  )
ORDER BY table_name;
