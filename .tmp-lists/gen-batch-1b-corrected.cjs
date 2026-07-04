// Generate corrected Batch 1B: full rewind of original 114 + re-INSERT 85 collision-free containers.
const fs = require('fs');
const path = require('path');

const pc = JSON.parse(fs.readFileSync(path.join(__dirname, '_path_check.json'), 'utf8'));
const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;

const containers = pc.missingContainers;
const moveNewPaths = new Set(moves.map(m => m.new_path));

// Original 114 ids (for the DELETE list)
const original114Ids = containers.map(c => c.id);

// Corrected set: containers whose path is NOT a move target
const corrected = containers.filter(c => !moveNewPaths.has(c.path));

// Verify
const dropped = containers.filter(c => moveNewPaths.has(c.path));
console.log('original batch-1 containers:', containers.length);
console.log('dropped (collisions):', dropped.length);
console.log('corrected batch-1B containers:', corrected.length);
if (corrected.length + dropped.length !== containers.length) throw new Error('arithmetic mismatch');

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) { return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]'; }

const deleteList = original114Ids.map(sqlString).join(',\n  ');
const valuesRows = corrected.map(c => {
  const parts = c.path.split(' / ');
  return [
    sqlString(c.id), sqlString(c.name), sqlString(c.path), sqlArray(parts),
    sqlString(c.realm_id), sqlString(c.realm_name), String(c.depth),
    "'event'", "'Accepted'", 'false',
    'ARRAY[]::text[]','ARRAY[]::text[]','ARRAY[]::text[]','ARRAY[]::text[]',
    "'{}'::jsonb",'now()','now()'
  ].join(', ');
});

const sql = `-- Lists Disposition · BATCH 1B · Rewind + corrected re-INSERT
-- Date: 2026-05-19
-- Per Butch ORDERS: full rewind-redo to the genuinely-missing intermediates only.
-- 29 of the original 114 batch-1 containers collided with batch-2/3/4 move targets.
-- This batch: DELETE all 114 originals, re-INSERT the 85 collision-free ones.
-- Atomic; non-collision descendants briefly orphaned mid-TX, restored by INSERT before COMMIT.

-- ===== PRE-FLIGHT =====
DO $$
DECLARE total int; batch1_count int;
BEGIN
  SELECT count(*) INTO total FROM atoms;
  IF total <> 5011 THEN RAISE EXCEPTION 'BATCH-1B PRE-FLIGHT FAIL: expected 5011 atoms, found %', total; END IF;

  SELECT count(*) INTO batch1_count FROM atoms WHERE id IN (
    ${deleteList}
  );
  IF batch1_count <> 114 THEN RAISE EXCEPTION 'BATCH-1B PRE-FLIGHT FAIL: expected 114 batch-1 containers, found %', batch1_count; END IF;

  RAISE NOTICE 'BATCH-1B PRE-FLIGHT OK';
END$$;

-- ===== REWIND: DELETE all 114 batch-1 containers =====
DELETE FROM atoms WHERE id IN (
  ${deleteList}
);

-- ===== RE-INSERT 85 collision-free containers =====
INSERT INTO atoms (id, name, path, path_parts, realm_id, realm_name, depth, type, kettle, is_leaf, theme_tags, realm_tags, pillar_tags, skin_tags, meta, created_at, updated_at) VALUES
${valuesRows.map(v => '  (' + v + ')').join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- ===== POST-BATCH INTEGRITY CHECK =====
DO $$
DECLARE
  new_total int; expected int := 5011 - 114 + ${corrected.length};
  leaf_with_children int; depth_mismatch int; skipped_level int; dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  IF new_total <> expected THEN RAISE EXCEPTION 'BATCH-1B FAIL: expected % atoms, found %', expected, new_total; END IF;

  SELECT count(*) INTO leaf_with_children FROM atoms p
  WHERE p.is_leaf=true AND EXISTS (
    SELECT 1 FROM atoms c WHERE c.depth>p.depth AND c.path_parts[1:p.depth]=p.path_parts
  );
  IF leaf_with_children <> 0 THEN RAISE EXCEPTION 'BATCH-1B FAIL: leaf-with-children=%', leaf_with_children; END IF;

  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts,1);
  IF depth_mismatch <> 0 THEN RAISE EXCEPTION 'BATCH-1B FAIL: depth-mismatch=%', depth_mismatch; END IF;

  SELECT count(*) INTO skipped_level FROM atoms a
  WHERE a.depth > 1 AND NOT EXISTS (
    SELECT 1 FROM atoms p WHERE p.path = array_to_string(a.path_parts[1:a.depth-1], ' / ')
  );
  IF skipped_level <> 0 THEN RAISE EXCEPTION 'BATCH-1B FAIL: skipped-level=%', skipped_level; END IF;

  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*)>1) x;
  IF dup_id <> 0 THEN RAISE EXCEPTION 'BATCH-1B FAIL: dup-id=%', dup_id; END IF;

  RAISE NOTICE 'BATCH-1B OK: net % new containers, integrity preserved', expected - 5011 + 114;
END$$;
`;

const outpath = path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'migrations', '2026-05-19-lists-batch-1b-rewind-corrected.sql');
fs.writeFileSync(outpath, sql, 'utf8');
console.log('wrote', outpath, fs.statSync(outpath).size, 'bytes');
console.log('SQL summary: DELETE 114 originals, INSERT', corrected.length, 'corrected');
console.log('Expected final atom count after batch 1B:', 5011 - 114 + corrected.length);

// Save corrected list for reference
fs.writeFileSync(path.join(__dirname, '_corrected_containers.json'), JSON.stringify({corrected, dropped}, null, 2));
