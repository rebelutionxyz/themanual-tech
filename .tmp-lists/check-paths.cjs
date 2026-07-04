// Verify new_path uniqueness + depth bounds, and check that the 114 missing containers don't collide.
const fs = require('fs');
const path = require('path');

const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8'));
const allIds = JSON.parse(fs.readFileSync(path.join(__dirname, '_all_ids.json'), 'utf8'));
const existingPaths = new Set(allIds.map(a => a.path));
const sourcePaths = new Set(moves.moves.map(m => m.src_path));

// New path collisions: new_path already exists AND is not a source we vacate
const newPathCollisions = moves.moves.filter(m => existingPaths.has(m.new_path) && !sourcePaths.has(m.new_path));

// Max depth among proposed targets
const maxNewDepth = moves.moves.reduce((mx,m) => Math.max(mx, m.new_depth), 0);
const deepest = moves.moves.filter(m => m.new_depth === maxNewDepth);

// Missing containers (the 114) — verify none collide with an existing path
const missingPrefixes = moves.targetPrefixes.filter(p => !existingPaths.has(p));
// Compute new_id for each missing prefix
function kebab(s) {
  return s.toLowerCase().replace(/['']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function slug(parts) { return parts.map(kebab).join('-'); }

const existingIds = new Set(allIds.map(a => a.id));
const missingContainers = missingPrefixes.map(p => {
  const parts = p.split(' / ');
  return {
    path: p,
    id: slug(parts),
    name: parts[parts.length-1],
    realm_name: parts[0],
    realm_id: kebab(parts[0]),
    depth: parts.length,
  };
});

// Container id collisions: any missing-container new id matches an existing atom id (but path is "missing")
const containerIdCollisions = missingContainers.filter(c => existingIds.has(c.id));

// Container max depth
const maxContainerDepth = missingContainers.reduce((mx,c) => Math.max(mx, c.depth), 0);

// Within-batch container id collisions (two missing-prefixes resolving to same id)
const counts = new Map();
for (const c of missingContainers) counts.set(c.id, (counts.get(c.id)||0)+1);
const dupContainers = [...counts.entries()].filter(([,n]) => n > 1);

console.log('new_path collisions (against existing non-source paths):', newPathCollisions.length);
for (const c of newPathCollisions) console.log(' ', c.id, '→', c.new_path);

console.log('\nMax proposed new_depth (atoms):', maxNewDepth, '— constraint allows ≤9');
console.log('Deepest proposed atoms:', deepest.length);
for (const d of deepest.slice(0, 5)) console.log(' ', d.new_depth, d.new_path);

console.log('\nMissing intermediate containers:', missingContainers.length);
console.log('Container id collisions (id exists but path doesn\'t — shouldn\'t happen if data is consistent):', containerIdCollisions.length);
for (const c of containerIdCollisions) console.log(' ', c.id, 'at', c.path);
console.log('Container within-set dup ids:', dupContainers.length);
console.log('Max container depth:', maxContainerDepth, '— constraint allows ≤9');

fs.writeFileSync(path.join(__dirname, '_path_check.json'), JSON.stringify({
  newPathCollisions,
  maxNewDepth, deepest: deepest.slice(0, 10),
  missingContainers,
  containerIdCollisions,
  dupContainers,
  maxContainerDepth,
}, null, 2));
console.log('\nwrote _path_check.json');
