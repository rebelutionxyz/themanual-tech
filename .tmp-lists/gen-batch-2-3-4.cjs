// Generate Batch 2 (INTRA_REALM), Batch 3 (CROSS_REALM), Batch 4 (IMPORT_REALIZE) SQL.
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) {
  return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]';
}

function emitBatch(batchNum, bucket, expectedCount, expectedTotalBefore) {
  const subset = moves.filter(m => m.bucket === bucket);
  if (subset.length !== expectedCount) {
    throw new Error(`expected ${expectedCount} ${bucket} moves, got ${subset.length}`);
  }

  const updates = subset.map(m => {
    if (bucket === 'CROSS_REALM') {
      return `UPDATE atoms SET id=${sqlString(m.new_id)}, name=${sqlString(m.new_path_parts[m.new_path_parts.length-1])}, path=${sqlString(m.new_path)}, path_parts=${sqlArray(m.new_path_parts)}, depth=${m.new_depth}, realm_id=${sqlString(m.new_realm_id)}, realm_name=${sqlString(m.new_realm_name)}, updated_at=now() WHERE id=${sqlString(m.id)};`;
    } else {
      // INTRA_REALM and IMPORT_REALIZE — same realm, just path change.
      return `UPDATE atoms SET id=${sqlString(m.new_id)}, name=${sqlString(m.new_path_parts[m.new_path_parts.length-1])}, path=${sqlString(m.new_path)}, path_parts=${sqlArray(m.new_path_parts)}, depth=${m.new_depth}, updated_at=now() WHERE id=${sqlString(m.id)};`;
    }
  }).join('\n');

  const sql = `-- Lists Disposition · BATCH ${batchNum} · ${bucket} (${subset.length} atoms)
-- Date: 2026-05-19

-- ===== PRE-FLIGHT =====
DO $$
DECLARE total_atoms int; expected_sources int;
BEGIN
  SELECT count(*) INTO total_atoms FROM atoms;
  IF total_atoms <> ${expectedTotalBefore} THEN
    RAISE EXCEPTION 'BATCH-${batchNum} PRE-FLIGHT FAIL: expected ${expectedTotalBefore} atoms, found %', total_atoms;
  END IF;

  SELECT count(*) INTO expected_sources FROM atoms WHERE id IN (${subset.map(m => sqlString(m.id)).join(',')});
  IF expected_sources <> ${subset.length} THEN
    RAISE EXCEPTION 'BATCH-${batchNum} PRE-FLIGHT FAIL: expected ${subset.length} source atoms, found %', expected_sources;
  END IF;

  RAISE NOTICE 'BATCH-${batchNum} PRE-FLIGHT OK';
END$$;

-- ===== UPDATES =====
${updates}

-- ===== POST-BATCH INTEGRITY CHECK =====
DO $$
DECLARE
  new_total int; delta int;
  leaf_with_children int; depth_mismatch int; skipped_level int; dup_id int;
BEGIN
  SELECT count(*) INTO new_total FROM atoms;
  delta := new_total - ${expectedTotalBefore};
  IF delta <> 0 THEN
    RAISE EXCEPTION 'BATCH-${batchNum} FAIL: row delta expected 0, found %', delta;
  END IF;

  SELECT count(*) INTO leaf_with_children FROM atoms p
  WHERE p.is_leaf=true AND EXISTS (
    SELECT 1 FROM atoms c WHERE c.depth>p.depth AND c.path_parts[1:p.depth]=p.path_parts
  );
  IF leaf_with_children <> 0 THEN RAISE EXCEPTION 'BATCH-${batchNum} FAIL: leaf-with-children=%', leaf_with_children; END IF;

  SELECT count(*) INTO depth_mismatch FROM atoms WHERE depth <> array_length(path_parts,1);
  IF depth_mismatch <> 0 THEN RAISE EXCEPTION 'BATCH-${batchNum} FAIL: depth-mismatch=%', depth_mismatch; END IF;

  SELECT count(*) INTO skipped_level FROM atoms a
  WHERE a.depth > 1 AND NOT EXISTS (
    SELECT 1 FROM atoms p WHERE p.path=array_to_string(a.path_parts[1:a.depth-1], ' / ')
  );
  IF skipped_level <> 0 THEN RAISE EXCEPTION 'BATCH-${batchNum} FAIL: skipped-level=%', skipped_level; END IF;

  SELECT count(*) INTO dup_id FROM (SELECT id FROM atoms GROUP BY id HAVING count(*)>1) x;
  IF dup_id <> 0 THEN RAISE EXCEPTION 'BATCH-${batchNum} FAIL: dup-id=%', dup_id; END IF;

  RAISE NOTICE 'BATCH-${batchNum} OK: 0 row delta, integrity preserved';
END$$;
`;

  const filename = `2026-05-19-lists-batch-${batchNum}-${bucket.toLowerCase().replace('_','-')}.sql`;
  const outpath = path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'migrations', filename);
  fs.writeFileSync(outpath, sql, 'utf8');
  console.log('batch', batchNum, bucket, subset.length, '→', filename, fs.statSync(outpath).size, 'bytes');
  return outpath;
}

const b2 = emitBatch(2, 'INTRA_REALM', 334, 5011);
const b3 = emitBatch(3, 'CROSS_REALM', 35, 5011);
const b4 = emitBatch(4, 'IMPORT_REALIZE', 68, 5011);
console.log('done');
