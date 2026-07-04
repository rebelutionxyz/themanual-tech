// Planning script: for each of the 448 non-destructive moves,
// compute new_id, new_path_parts, new_depth, missing-parent gaps, id collisions.
// Outputs JSON for the migration-plan + batch SQL generators.

const fs = require('fs');
const path = require('path');

const all = JSON.parse(fs.readFileSync(path.join(__dirname, '_all.json'), 'utf8'));
const csv = fs.readFileSync(path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'lists-disposition-table.csv'), 'utf8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const header = lines[0].split(',');
const idx = (n) => header.indexOf(n);

function parseCsvLine(line) {
  const out = [];
  let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"' && line[i+1] === '"') { cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c; }
    else { if (c === '"') inQ = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur);
  return out;
}

// realm slug map (kebab of realm name)
function kebab(s) {
  return s.toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugifyPathParts(parts) {
  return parts.map(kebab).join('-');
}

// Build dispositions
const dispositions = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const id = row[idx('id')];
  const bucket = row[idx('bucket')];
  const target_path = row[idx('target_path')];
  const target_realm = row[idx('target_realm')];
  const proposed_new_type = row[idx('proposed_new_type')];
  const notes = row[idx('notes')];
  dispositions.push({ id, bucket, target_path, target_realm, proposed_new_type, notes });
}

// Index existing atoms
const byId = new Map();
const byPath = new Map();
for (const a of all) {
  byId.set(a.id, a);
  byPath.set(a.path, a);
}

// We also need the full atoms table (not just the 606 Lists atoms) — but we only have the 606 in _all.json.
// For collision checks we need ALL ~4897 atom ids. We'll re-pull that separately.
// For now, the planning script assumes byId / byPath covers the 606; collision checks against existing-atoms will be a separate DB query.

// Non-destructive buckets we process
const NON_DESTRUCTIVE = new Set(['INTRA_REALM', 'CROSS_REALM', 'IMPORT_REALIZE']);

// Parse target_path into path_parts.
// Target paths in CSV use " / " separator.
// Special markers we filter:
//   - "lens:" prefix → LENS bucket (already filtered out; would be unreachable here)
//   - "DROP — duplicate" → not a real path (only one such row: math-lists-systems-theory, classified CROSS_REALM)
function parseTargetPath(s) {
  if (!s) return null;
  if (s.startsWith('lens:')) return null;
  if (s.startsWith('DROP ')) return null;
  return s.split(' / ').map(p => p.trim()).filter(Boolean);
}

const moves = [];
const allTargetPrefixes = new Set();  // every intermediate path that must exist
const expectedExistingPaths = new Set();  // current paths we expect on the source atoms

const skipped = [];
for (const d of dispositions) {
  if (!NON_DESTRUCTIVE.has(d.bucket)) continue;
  const src = byId.get(d.id);
  if (!src) { skipped.push({d, reason: 'source atom not in byId map (bug)'}); continue; }
  const tpath = parseTargetPath(d.target_path);
  if (!tpath || tpath.length < 2) {
    skipped.push({id: d.id, bucket: d.bucket, target_path: d.target_path, reason: 'unparseable target_path (likely DROP marker)'});
    continue;
  }
  const new_id = slugifyPathParts(tpath);
  const new_path = tpath.join(' / ');
  const new_realm_name = tpath[0];
  const new_realm_id = kebab(new_realm_name);
  const new_depth = tpath.length;

  // Record all path prefixes (containers) that must exist at the target — every prefix from len 1 to len-1
  for (let k = 1; k < tpath.length; k++) {
    allTargetPrefixes.add(tpath.slice(0, k).join(' / '));
  }
  expectedExistingPaths.add(src.path);

  moves.push({
    id: d.id, bucket: d.bucket,
    src_path: src.path, src_realm: src.realm_name, src_depth: src.depth, src_type: src.type, src_is_leaf: src.is_leaf,
    new_id, new_path, new_path_parts: tpath, new_realm_id, new_realm_name, new_depth,
    proposed_new_type: d.proposed_new_type,
    notes: d.notes
  });
}

// Within-batch id collisions
const newIdCounts = new Map();
for (const m of moves) {
  newIdCounts.set(m.new_id, (newIdCounts.get(m.new_id) || 0) + 1);
}
const withinBatchCollisions = [...newIdCounts.entries()].filter(([,c]) => c > 1);

console.log('moves:', moves.length);
console.log('skipped:', skipped.length);
console.log('distinct target prefixes (containers that must exist):', allTargetPrefixes.size);
console.log('within-batch new_id collisions:', withinBatchCollisions.length);
if (withinBatchCollisions.length) {
  for (const [id, n] of withinBatchCollisions) console.log(' ', id, '×', n);
}

fs.writeFileSync(path.join(__dirname, '_moves.json'), JSON.stringify({
  moves,
  skipped,
  targetPrefixes: [...allTargetPrefixes].sort(),
  withinBatchCollisions,
}, null, 2));
console.log('wrote _moves.json');
