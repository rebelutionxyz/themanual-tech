// Emit INSERT chunks for the staging table, ~80 rows per chunk.
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8')).moves;
moves.sort((a,b) => a.new_depth - b.new_depth || a.new_path.localeCompare(b.new_path));

function s(str) { return "'" + String(str).replace(/'/g, "''") + "'"; }

const CHUNK = 80;
const chunks = [];
for (let i = 0; i < moves.length; i += CHUNK) {
  const slice = moves.slice(i, i + CHUNK);
  const values = slice.map(m => `(${s(m.id)}, ${s(m.new_id)}, ${s(m.new_path)}, ${s(m.new_realm_name)})`).join(',\n  ');
  chunks.push(`INSERT INTO _lists_moves_staging (old_id, new_id, new_path, new_realm_name) VALUES\n  ${values};`);
}

for (let i = 0; i < chunks.length; i++) {
  fs.writeFileSync(path.join(__dirname, `staging-chunk-${i+1}.sql`), chunks[i]);
  console.log('chunk', i+1, '→', chunks[i].length, 'bytes,', Math.ceil(chunks[i].length/300), 'rows approx');
}
console.log('total chunks:', chunks.length);
