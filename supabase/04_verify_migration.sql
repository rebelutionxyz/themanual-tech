-- =============================================================================
-- Phase 4 — Post-migration verification
-- =============================================================================
-- Run AFTER 03_seed_atoms.js completes successfully.
-- All counts must match EXACTLY. Anything off = stop, do not unify BLiNG! yet.
-- =============================================================================

-- 1. Realms — all 14 present, palindrome order intact, atom_counts populated
SELECT display_order, id, name, atom_count
FROM realms
ORDER BY display_order;
-- Expected:
--   1  justice           Justice          684
--   2  reference         Reference        101
--   3  human_activities  Human activities 152
--   4  self              Self             162
--   5  geography         Geography        586
--   6  health            Health           183
--   7  society           Society          523
--   8  math              Math             173
--   9  science           Science          505
--  10  philosophy        Philosophy       227
--  11  tech              Tech             489
--  12  history           History          297
--  13  culture           Culture          416
--  14  religion          Religion         362

-- 2. Atom totals (must equal 4860)
SELECT count(*) AS total_atoms FROM atoms;

-- 3. Per-realm counts vs. integrity report
SELECT
    r.id              AS realm,
    r.atom_count      AS denormalized_count,
    count(a.id)       AS actual_count,
    CASE WHEN r.atom_count = count(a.id) THEN '✓' ELSE '✗' END AS match
FROM realms r
LEFT JOIN atoms a ON a.realm_id = r.id
GROUP BY r.id, r.atom_count, r.display_order
ORDER BY r.display_order;

-- 4. Kettle distribution snapshot (must match integrity report)
--    Expected:
--      Accepted   4723
--      Contested   107
--      Fringe       24
--      Emerging      6
SELECT kettle, count(*) FROM atoms GROUP BY kettle ORDER BY count DESC;

-- 5. Per-realm kettle breakdown (matches realm_kettles in integrity report)
SELECT realm_id, kettle, count(*)
FROM atoms
GROUP BY realm_id, kettle
ORDER BY realm_id, kettle;

-- 6. Integrity checks (all must return 0)
SELECT 'duplicate_ids'        AS check_name, count(*) - count(DISTINCT id)   FROM atoms
UNION ALL
SELECT 'duplicate_paths',     count(*) - count(DISTINCT path)                FROM atoms
UNION ALL
SELECT 'missing_realm_fk',    count(*)                                       FROM atoms WHERE realm_id IS NULL
UNION ALL
SELECT 'missing_kettle',      count(*)                                       FROM atoms WHERE kettle IS NULL
UNION ALL
SELECT 'depth_out_of_range',  count(*)                                       FROM atoms WHERE depth < 1 OR depth > 9
UNION ALL
SELECT 'orphan_realm_id',     count(*)                                       FROM atoms a
                              LEFT JOIN realms r ON r.id = a.realm_id
                              WHERE r.id IS NULL;

-- 7. Spot-check a few known atoms exist
SELECT id, realm_id, kettle, depth FROM atoms WHERE id IN (
    'referencereference',
    'justice-government-accountability-agency-reformnasa-budget-redirection-advocacy'
);

-- 8. Confirm preserved tables still have their expected row counts
SELECT 'bees'         AS t, count(*) FROM bees
UNION ALL SELECT 'pillars',         count(*) FROM pillars
UNION ALL SELECT 'forum_threads',   count(*) FROM forum_threads
UNION ALL SELECT 'forum_posts',     count(*) FROM forum_posts;
-- Expected: bees=1, pillars=5, forum_threads=6, forum_posts=4
