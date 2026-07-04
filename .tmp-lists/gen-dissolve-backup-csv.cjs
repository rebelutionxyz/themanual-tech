// Parse Supabase JSON dump and emit dissolved-rows-backup.csv
const fs = require('fs');
const path = require('path');

const src = String.raw`C:\Users\Butch\.claude\projects\C--Users-Butch-Documents-HONEYCOMB-TheMANUAL-tech\85380cb0-df28-4c52-ab80-e6d02083ffe5\tool-results\mcp-claude_ai_Supabase-execute_sql-1779229853426.txt`;
const raw = fs.readFileSync(src, 'utf8');
const outer = JSON.parse(raw);
const inner = outer.result;
const m = inner.match(/<untrusted-data-[a-f0-9-]+>\s*(\[[\s\S]*?\])\s*<\/untrusted-data/);
const rows = JSON.parse(m[1]);
console.log('rows:', rows.length);

// Categorize each row
function categorize(r) {
  if ('Lists' === r.path_parts.find(p => p === 'Lists') && r.depth === 2) return 'DISSOLVE_CONTAINER (L2 shell)';
  if (r.path_parts.includes('Lists') && !r.is_leaf) return 'DISSOLVE_CONTAINER (nested shell)';
  if (r.path_parts.includes('Lists') && r.is_leaf) return 'IN-LISTS-LEAF';
  if (/^reference-(general-reference-lists|research-tools-and-resources)$/.test(r.id)) return 'REFERENCE_L2_SHELL';
  if (/^reference-(general-reference-lists|research-tools-and-resources)/.test(r.id)) return 'REFERENCE_LEAF';
  if (r.id === 'culture-mass-media-news-sources-newspapers') return 'CLOSURE_DISSOLVE';
  return 'OTHER';
}

// Apply CSV-safe escaping
function esc(v) {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[,"\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const cols = ['id','name','path','path_parts','realm_id','realm_name','depth','type','kettle','is_leaf','theme_tags','realm_tags','pillar_tags','skin_tags','geo','note','meta','created_at','updated_at','_bucket','_re_insert_sql'];

function reInsertSql(r) {
  // Build a re-insertable INSERT statement
  function arr(v) {
    if (!v) return 'ARRAY[]::text[]';
    if (Array.isArray(v) && v.length === 0) return 'ARRAY[]::text[]';
    return 'ARRAY[' + v.map(s => "'" + String(s).replace(/'/g, "''") + "'").join(',') + ']::text[]';
  }
  function s(v) { return v == null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'"; }
  function jsonb(v) {
    if (v == null) return "'{}'::jsonb";
    return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
  }
  return `INSERT INTO atoms (id,name,path,path_parts,realm_id,realm_name,depth,type,kettle,is_leaf,theme_tags,realm_tags,pillar_tags,skin_tags,geo,note,meta,created_at,updated_at) VALUES (${s(r.id)},${s(r.name)},${s(r.path)},${arr(r.path_parts)},${s(r.realm_id)},${s(r.realm_name)},${r.depth},${s(r.type)},${s(r.kettle)},${r.is_leaf},${arr(r.theme_tags)},${arr(r.realm_tags)},${arr(r.pillar_tags)},${arr(r.skin_tags)},${r.geo == null ? 'NULL' : jsonb(r.geo)},${r.note == null ? 'NULL' : s(r.note)},${jsonb(r.meta)},${s(r.created_at)},${s(r.updated_at)});`;
}

const out = [cols.join(',')];
const counts = {};
for (const r of rows) {
  const bucket = categorize(r);
  counts[bucket] = (counts[bucket] || 0) + 1;
  const re_insert = reInsertSql(r);
  out.push(cols.map(c => {
    if (c === '_bucket') return esc(bucket);
    if (c === '_re_insert_sql') return esc(re_insert);
    return esc(r[c]);
  }).join(','));
}

const outpath = path.resolve(__dirname, '..', 'shared', 'canon', 'taxonomy', 'dissolved-rows-backup.csv');
fs.writeFileSync(outpath, out.join('\r\n'), 'utf8');
console.log('wrote', outpath, fs.statSync(outpath).size, 'bytes');
console.log('Bucket counts:');
for (const [k,v] of Object.entries(counts).sort((a,b) => b[1]-a[1])) console.log(' ', k.padEnd(35), v);
console.log('Total candidate-DELETE atoms:', rows.length);
