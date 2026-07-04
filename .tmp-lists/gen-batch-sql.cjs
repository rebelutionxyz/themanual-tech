// Emit batch-1 SQL: container creation for the 114 missing intermediate paths.
const fs = require('fs');
const path = require('path');

const pc = JSON.parse(fs.readFileSync(path.join(__dirname, '_path_check.json'), 'utf8'));
const containers = pc.missingContainers;

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) {
  if (!items || items.length === 0) return "ARRAY[]::text[]";
  return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]';
}

const valuesRows = containers.map(c => {
  const parts = c.path.split(' / ');
  return [
    sqlString(c.id),
    sqlString(c.name),
    sqlString(c.path),
    sqlArray(parts),
    sqlString(c.realm_id),
    sqlString(c.realm_name),
    String(c.depth),
    "'event'",                  // type — matches the production monoculture
    "'Accepted'",               // kettle — dominant value
    'false',                    // is_leaf — containers are not leaves
    'ARRAY[]::text[]',          // theme_tags
    'ARRAY[]::text[]',          // realm_tags
    'ARRAY[]::text[]',          // pillar_tags
    'ARRAY[]::text[]',          // skin_tags
    "'{}'::jsonb",              // meta
    'now()',                    // created_at
    'now()',                    // updated_at
  ].join(', ');
});

let sql = `-- Lists Disposition · BATCH 1 of 4 · Container creation
-- Date: 2026-05-19
-- Authorized by: Butch · "Cadence: one checkpoint only" · ORDERS 2026-05-19
-- Scope: INSERT 114 missing intermediate parent containers for the 437 non-destructive moves.
-- Idempotency: ON CONFLICT (id) DO NOTHING — safe to re-run if interrupted.
-- Integrity: full structural check after the INSERT batch. If any check fails, the TX rolls back.

BEGIN;

-- ===== PRE-FLIGHT =====
DO $$
DECLARE
  total_atoms int;
  lists_atoms int;
  lists_refs int;
BEGIN
  SELECT count(*) INTO total_atoms FROM atoms;
  IF total_atoms <> 4897 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 4897 atoms, found %', total_atoms;
  END IF;

  SELECT count(*) INTO lists_atoms FROM atoms WHERE 'Lists' = ANY(path_parts);
  IF lists_atoms <> 606 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 606 Lists atoms, found %', lists_atoms;
  END IF;

  -- 0 references on any of the 606 source atoms (verified during planning)
  SELECT
    (SELECT count(*) FROM atom_kettle_votes v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM atom_sources v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM atom_comments v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM entity_atom_links v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts)) +
    (SELECT count(*) FROM promotions v JOIN atoms a ON v.atom_id=a.id WHERE 'Lists' = ANY(a.path_parts))
  INTO lists_refs;
  IF lists_refs <> 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAIL: expected 0 referencing rows on Lists atoms, found %. Investigate before proceeding.', lists_refs;
  END IF;

  RAISE NOTICE 'PRE-FLIGHT OK: 4897 atoms, 606 Lists atoms, 0 FK refs on Lists atoms.';
END$$;

-- ===== INSERT 114 missing intermediate containers =====
INSERT INTO atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, meta, created_at, updated_at) VALUES
${valuesRows.map((v,i) => '  (' + v + ')').join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- ===== POST-BATCH INTEGRITY CHECK =====
DO $$
DECLARE
  new_total int;
  delta int;
  leaf_with_children int;
  depth_mismatch int;
  skipped_level int;
  dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  delta := new_total - 4897;
  IF delta <> 114 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: row delta expected +114, found %', delta;
  END IF;

  -- 0 leaf-with-children: no atom flagged is_leaf=true while having a deeper child
  SELECT count(*) INTO leaf_with_children FROM atoms p
  WHERE p.is_leaf = true AND EXISTS (
    SELECT 1 FROM atoms c
    WHERE c.depth > p.depth
      AND c.path_parts[1:p.depth] = p.path_parts
  );
  IF leaf_with_children <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: leaf-with-children = %', leaf_with_children;
  END IF;

  -- 0 depth mismatch
  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts, 1);
  IF depth_mismatch <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: depth-mismatch = %', depth_mismatch;
  END IF;

  -- 0 skipped-level: every atom at depth N>1 has a parent at depth N-1 with matching prefix
  SELECT count(*) INTO skipped_level FROM atoms a
  WHERE a.depth > 1 AND NOT EXISTS (
    SELECT 1 FROM atoms p
    WHERE p.path = array_to_string(a.path_parts[1:a.depth-1], ' / ')
  );
  IF skipped_level <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: skipped-level = %', skipped_level;
  END IF;

  -- 0 dup id (structurally guaranteed by PK but verify)
  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*) > 1) x;
  IF dup_id <> 0 THEN
    RAISE EXCEPTION 'BATCH-1 FAIL: dup-id = %', dup_id;
  END IF;

  RAISE NOTICE 'BATCH-1 OK: +% rows · 0 leaf-with-children · 0 depth-mismatch · 0 skipped-level · 0 dup-id', delta;
END$$;

COMMIT;
-- BATCH 1 report: +114 atoms · structural integrity preserved.
`;

fs.writeFileSync(path.join(__dirname, 'batch-1.sql'), sql, 'utf8');
console.log('wrote batch-1.sql', fs.statSync(path.join(__dirname, 'batch-1.sql')).size, 'bytes');
console.log('container count:', containers.length);

// Sample the first 5 containers for the migration plan doc
console.log('\nFirst 5 containers to be created:');
for (const c of containers.slice(0,5)) {
  console.log(' ', c.depth, c.path, '→', c.id);
}
