// Re-run classifier logic; emit the DISSOLVE + DISSOLVE_CONTAINER id lists for the row-dump query.
const fs = require('fs');
const path = require('path');

// Parse CSV
const csv = fs.readFileSync(path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'lists-disposition-table.csv'), 'utf8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const header = lines[0].split(',');
const idIdx = header.indexOf('id');
const bucketIdx = header.indexOf('bucket');
const notesIdx = header.indexOf('notes');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const dissolveIds = [];
const containerIds = [];
const lensInducedHints = new Set();  // sub-set of DISSOLVE that came from §3c lens-induced
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const id = row[idIdx];
  const bucket = row[bucketIdx];
  const notes = row[notesIdx] || '';
  if (bucket === 'DISSOLVE') {
    dissolveIds.push(id);
    if (/LENS conversion/.test(notes) || /bucket dissolved by/.test(notes)) lensInducedHints.add(id);
  } else if (bucket === 'DISSOLVE_CONTAINER') {
    containerIds.push(id);
  }
}

console.log('DISSOLVE:', dissolveIds.length);
console.log('DISSOLVE_CONTAINER:', containerIds.length);
console.log('Lens-induced subset of DISSOLVE:', lensInducedHints.size);

fs.writeFileSync(path.join(__dirname, '_dissolve_ids.json'), JSON.stringify({dissolveIds, containerIds, lensInduced: [...lensInducedHints]}, null, 2));
console.log('wrote _dissolve_ids.json');
