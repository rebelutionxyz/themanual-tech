const fs = require('fs');
const path = require('path');

// Save dedup + L2 results from last queries for downstream classifier use.
// (Stored in .tmp-lists/_l2_branches.json and _name_dupes.json — extracted manually from query output above.)
// Left as marker: actual data was captured in chat scratch; classifier will use rules table directly.
fs.writeFileSync(path.join(__dirname, '_marker.txt'), 'context saved ' + new Date().toISOString());
