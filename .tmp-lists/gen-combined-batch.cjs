// Combined Batch 2+3+4: all 437 moves + 4 deferred inserts + is_leaf recompute + integrity.
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;
const deferred = JSON.parse(fs.readFileSync(path.join(__dirname, '_batch1b_split.json'), 'utf8')).deferred;

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) { return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]'; }

// Sort moves by new_depth ASC (parents before children for diagnostic order)
moves.sort((a,b) => a.new_depth - b.new_depth || a.new_path.localeCompare(b.new_path));

// 4-column VALUES: (old_id, new_id, new_path, new_realm_name)
// CROSS_REALM needs realm rename; INTRA_REALM and IMPORT_REALIZE keep src realm
const valueRows = moves.map(m => `(${sqlString(m.id)}, ${sqlString(m.new_id)}, ${sqlString(m.new_path)}, ${sqlString(m.new_realm_name)})`).join(',\n  ');

function kebab(s) {
  return s.toLowerCase().replace(/['']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const deferredValues = deferred.map(c => {
  const parts = c.path.split(' / ');
  return [
    sqlString(c.id), sqlString(c.name), sqlString(c.path), sqlArray(parts),
    sqlString(c.realm_id), sqlString(c.realm_name), String(c.depth),
    "'event'", "'Accepted'", 'false',
    'ARRAY[]::text[]','ARRAY[]::text[]','ARRAY[]::text[]','ARRAY[]::text[]',
    "'{}'::jsonb",'now()','now()'
  ].join(', ');
}).map(v => '  (' + v + ')').join(',\n');

const sql = `-- Lists Disposition · COMBINED BATCH 2/3/4 + 2.5 · all 437 non-destructive moves
-- Date: 2026-05-19
-- Single transaction: 334 INTRA_REALM + 35 CROSS_REALM + 68 IMPORT_REALIZE + 4 deferred INSERTs + is_leaf recompute.

DO $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM atoms;
  IF total <> 4978 THEN RAISE EXCEPTION 'BATCH-COMBINED PRE-FLIGHT FAIL: expected 4978 atoms, found %', total; END IF;
END$$;

WITH moves(old_id, new_id, new_path, new_realm_name) AS (VALUES
  ${valueRows}
)
UPDATE atoms a SET
  id = m.new_id,
  name = (string_to_array(m.new_path, ' / '))[array_length(string_to_array(m.new_path, ' / '), 1)],
  path = m.new_path,
  path_parts = string_to_array(m.new_path, ' / '),
  depth = array_length(string_to_array(m.new_path, ' / '), 1),
  realm_name = m.new_realm_name,
  realm_id = lower(replace(replace(m.new_realm_name, ' ', '-'), '''', '')),
  updated_at = now()
FROM moves m
WHERE a.id = m.old_id;

INSERT INTO atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, meta, created_at, updated_at) VALUES
${deferredValues}
ON CONFLICT (id) DO NOTHING;

-- Recompute is_leaf for all atoms based on final state
UPDATE atoms a SET is_leaf = NOT EXISTS (
  SELECT 1 FROM atoms c WHERE c.depth > a.depth AND c.path_parts[1:a.depth] = a.path_parts
);

DO $$
DECLARE
  new_total int; expected int := 4978 + 4;
  leaf_with_children int; depth_mismatch int; skipped_level int; dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  IF new_total <> expected THEN RAISE EXCEPTION 'BATCH-COMBINED FAIL: expected % atoms, found %', expected, new_total; END IF;
  SELECT count(*) INTO leaf_with_children FROM atoms p WHERE p.is_leaf=true AND EXISTS (SELECT 1 FROM atoms c WHERE c.depth>p.depth AND c.path_parts[1:p.depth]=p.path_parts);
  IF leaf_with_children <> 0 THEN RAISE EXCEPTION 'BATCH-COMBINED FAIL: leaf-with-children=%', leaf_with_children; END IF;
  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts,1);
  IF depth_mismatch <> 0 THEN RAISE EXCEPTION 'BATCH-COMBINED FAIL: depth-mismatch=%', depth_mismatch; END IF;
  SELECT count(*) INTO skipped_level FROM atoms a WHERE a.depth > 1 AND NOT EXISTS (SELECT 1 FROM atoms p WHERE p.path = array_to_string(a.path_parts[1:a.depth-1], ' / '));
  IF skipped_level <> 0 THEN RAISE EXCEPTION 'BATCH-COMBINED FAIL: skipped-level=%', skipped_level; END IF;
  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*)>1) x;
  IF dup_id <> 0 THEN RAISE EXCEPTION 'BATCH-COMBINED FAIL: dup-id=%', dup_id; END IF;
  RAISE NOTICE 'BATCH-COMBINED OK: % atoms', new_total;
END$$;
`;

fs.writeFileSync(path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'migrations', '2026-05-19-lists-batch-combined.sql'), sql);
console.log('size:', sql.length, 'bytes');
console.log('moves total:', moves.length);
