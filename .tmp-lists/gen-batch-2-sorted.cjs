// Generate Batch 2 SQL (INTRA_REALM), depth-ordered (parents before children within batch).
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;
const intra = moves.filter(m => m.bucket === 'INTRA_REALM');
intra.sort((a,b) => a.new_depth - b.new_depth || a.new_path.localeCompare(b.new_path));
console.log('INTRA_REALM count:', intra.length);

function sqlString(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function sqlArray(items) { return 'ARRAY[' + items.map(sqlString).join(',') + ']::text[]'; }

const updates = intra.map(m => {
  const lastName = m.new_path_parts[m.new_path_parts.length-1];
  return `UPDATE atoms SET id=${sqlString(m.new_id)}, name=${sqlString(lastName)}, path=${sqlString(m.new_path)}, path_parts=${sqlArray(m.new_path_parts)}, depth=${m.new_depth}, updated_at=now() WHERE id=${sqlString(m.id)};`;
}).join('\n');

console.log('first 3 UPDATEs:');
console.log(updates.split('\n').slice(0,3).join('\n'));

fs.writeFileSync(path.join(__dirname, 'batch-2-updates.sql'), updates, 'utf8');
console.log('wrote batch-2-updates.sql', fs.statSync(path.join(__dirname, 'batch-2-updates.sql')).size, 'bytes');
