const fs = require('fs');
const path = require('path');

const src = String.raw`C:\Users\Butch\.claude\projects\C--Users-Butch-Documents-HONEYCOMB-TheMANUAL-tech\85380cb0-df28-4c52-ab80-e6d02083ffe5\tool-results\mcp-claude_ai_Supabase-execute_sql-1779194788451.txt`;
const raw = fs.readFileSync(src, 'utf8');
const outer = JSON.parse(raw);
const inner = outer.result;
const m = inner.match(/<untrusted-data-[a-f0-9-]+>\s*(\[[\s\S]*?\])\s*<\/untrusted-data/);
if (!m) { console.error('no match'); process.exit(1); }
const rows = JSON.parse(m[1]);
console.log('total rows:', rows.length);

const outdir = String.raw`C:\Users\Butch\Documents\HONEYCOMB\TheMANUAL.tech\.tmp-lists`;
fs.mkdirSync(outdir, {recursive: true});

// Group by realm
const byRealm = {};
for (const r of rows) {
  (byRealm[r.realm_name] ||= []).push(r);
}

function tsvLine(arr) {
  return arr.map(v => String(v == null ? '' : v).replace(/[\t\n\r]/g, ' ')).join('\t');
}

const realms = Object.keys(byRealm).sort();
for (const realm of realms) {
  const list = byRealm[realm];
  list.sort((a,b) => a.path.localeCompare(b.path));
  const fname = realm.replace(/[^a-z0-9]/gi,'_').toLowerCase() + '.tsv';
  const fp = path.join(outdir, fname);
  const out = ['id\tdepth\ttype\tis_leaf\tname\tpath'];
  for (const r of list) {
    out.push(tsvLine([r.id, r.depth, r.type, r.is_leaf, r.name, r.path_str]));
  }
  fs.writeFileSync(fp, out.join('\n'), 'utf8');
  console.log(realm.padEnd(20), String(list.length).padStart(3), '→', fname.padEnd(30), fs.statSync(fp).size, 'bytes');
}

fs.writeFileSync(path.join(outdir, '_all.json'), JSON.stringify(rows));
console.log('combined json:', fs.statSync(path.join(outdir, '_all.json')).size, 'bytes');
