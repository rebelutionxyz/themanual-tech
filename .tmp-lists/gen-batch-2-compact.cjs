// Compact Batch 2 SQL: single UPDATE FROM VALUES + the 4 deferred INSERTs.
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;
const intra = moves.filter(m => m.bucket === 'INTRA_REALM');
intra.sort((a,b) => a.new_depth - b.new_depth || a.new_path.localeCompare(b.new_path));
console.log('INTRA_REALM:', intra.length);

const deferred = JSON.parse(fs.readFileSync(path.join(__dirname, '_batch1b_split.json'), 'utf8')).deferred;
console.log('Deferred from batch 1B:', deferred.length);

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) { return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]'; }

const valueRows = intra.map(m => `(${sqlString(m.id)}, ${sqlString(m.new_id)}, ${sqlString(m.new_path)})`).join(',\n  ');
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

const sql = `-- Lists Disposition · BATCH 2 + 2.5 · INTRA_REALM updates + deferred container inserts
-- Date: 2026-05-19
-- 334 INTRA_REALM UPDATEs (depth-ordered via the VALUES order) + 4 deferred INSERTs.

DO $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM atoms;
  IF total <> 4978 THEN RAISE EXCEPTION 'BATCH-2 PRE-FLIGHT FAIL: expected 4978 atoms, found %', total; END IF;
  RAISE NOTICE 'BATCH-2 PRE-FLIGHT OK';
END$$;

WITH moves(old_id, new_id, new_path) AS (VALUES
  ${valueRows}
)
UPDATE atoms a SET
  id = m.new_id,
  name = (string_to_array(m.new_path, ' / '))[array_length(string_to_array(m.new_path, ' / '), 1)],
  path = m.new_path,
  path_parts = string_to_array(m.new_path, ' / '),
  depth = array_length(string_to_array(m.new_path, ' / '), 1),
  updated_at = now()
FROM moves m
WHERE a.id = m.old_id;

-- Batch 2.5: insert 4 deferred deep containers (parents created by Batch 2 above)
INSERT INTO atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, meta, created_at, updated_at) VALUES
${deferredValues}
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  new_total int; expected int := 4978 + ${deferred.length};
  leaf_with_children int; depth_mismatch int; skipped_level int; dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  IF new_total <> expected THEN RAISE EXCEPTION 'BATCH-2 FAIL: expected % atoms, found %', expected, new_total; END IF;
  SELECT count(*) INTO leaf_with_children FROM atoms p WHERE p.is_leaf=true AND EXISTS (SELECT 1 FROM atoms c WHERE c.depth>p.depth AND c.path_parts[1:p.depth]=p.path_parts);
  IF leaf_with_children <> 0 THEN RAISE EXCEPTION 'BATCH-2 FAIL: leaf-with-children=%', leaf_with_children; END IF;
  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts,1);
  IF depth_mismatch <> 0 THEN RAISE EXCEPTION 'BATCH-2 FAIL: depth-mismatch=%', depth_mismatch; END IF;
  SELECT count(*) INTO skipped_level FROM atoms a WHERE a.depth > 1 AND NOT EXISTS (SELECT 1 FROM atoms p WHERE p.path = array_to_string(a.path_parts[1:a.depth-1], ' / '));
  IF skipped_level <> 0 THEN RAISE EXCEPTION 'BATCH-2 FAIL: skipped-level=%', skipped_level; END IF;
  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*)>1) x;
  IF dup_id <> 0 THEN RAISE EXCEPTION 'BATCH-2 FAIL: dup-id=%', dup_id; END IF;
  RAISE NOTICE 'BATCH-2 OK: + % rows', new_total - 4978;
END$$;
`;

fs.writeFileSync(path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'migrations', '2026-05-19-lists-batch-2-intra-realm-compact.sql'), sql);
console.log('size:', sql.length, 'bytes');
