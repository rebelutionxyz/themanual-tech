// Check collisions: proposed new_ids vs existing atom ids/paths.
// Also check which target prefixes already exist as containers vs need to be created.

const fs = require('fs');
const path = require('path');

const allIds = JSON.parse(fs.readFileSync(path.join(__dirname, '_all_ids.json'), 'utf8'));
const moves = JSON.parse(fs.readFileSync(path.join(__dirname, '_moves.json'), 'utf8'));

const existingIds = new Set(allIds.map(a => a.id));
const existingPaths = new Set(allIds.map(a => a.path));

// Source ids of moves (will be UPDATEd → so their current ids are about to vacate)
const sourceIds = new Set(moves.moves.map(m => m.id));

// New_id collisions: new_id already exists AND it's not a source-id we're vacating
const newIdCollisions = moves.moves.filter(m => existingIds.has(m.new_id) && !sourceIds.has(m.new_id));

// Target prefixes: how many already exist (as paths)?
const prefixesExisting = moves.targetPrefixes.filter(p => existingPaths.has(p));
const prefixesMissing = moves.targetPrefixes.filter(p => !existingPaths.has(p));

// Per-realm move counts
const byBucket = {};
const byRealm = {};
for (const m of moves.moves) {
  byBucket[m.bucket] = (byBucket[m.bucket] || 0) + 1;
  byRealm[m.new_realm_name] = (byRealm[m.new_realm_name] || 0) + 1;
}

console.log('Moves:', moves.moves.length);
console.log('Skipped:', moves.skipped.length);
console.log('\nBy bucket:');
for (const [k,v] of Object.entries(byBucket)) console.log(' ', k.padEnd(16), v);
console.log('\nBy target realm:');
for (const [k,v] of Object.entries(byRealm).sort((a,b)=>b[1]-a[1])) console.log(' ', k.padEnd(20), v);

console.log('\nTarget prefixes (containers needed):');
console.log('  total distinct:', moves.targetPrefixes.length);
console.log('  already exist :', prefixesExisting.length);
console.log('  MISSING (need INSERT):', prefixesMissing.length);

console.log('\nWithin-batch new_id collisions:', moves.withinBatchCollisions.length);
for (const [id,n] of moves.withinBatchCollisions) {
  console.log(' ', id, '×', n);
  for (const m of moves.moves.filter(m => m.new_id === id)) {
    console.log('    ←', m.id, '(' + m.bucket + ')', '→', m.new_path);
  }
}

console.log('\nProduction-existing-id collisions (new_id matches a live atom that is NOT a source):', newIdCollisions.length);
for (const m of newIdCollisions.slice(0, 50)) {
  console.log(' ', m.id, '→', m.new_id);
}

fs.writeFileSync(path.join(__dirname, '_collisions.json'), JSON.stringify({
  newIdCollisions, prefixesExisting, prefixesMissing, byBucket, byRealm,
}, null, 2));
console.log('\nwrote _collisions.json');
