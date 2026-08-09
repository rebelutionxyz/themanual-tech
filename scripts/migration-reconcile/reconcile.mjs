#!/usr/bin/env node
// reconcile — measure and repair the drift between supabase_migrations.schema_migrations
// and TheMANUAL.tech/supabase/migrations/*.sql.
//
// Authored by DB22 (2026-08-03). Read TheMANUAL.tech/REPORT.md for the disposition
// this implements and the class definitions the counts below map to.
//
//   node scripts/migration-reconcile/reconcile.mjs measure
//       Both-direction reconciliation. Prints the four buckets and exits 1 if any
//       bucket is non-empty ON OR AFTER the baseline. THIS IS THE FREEZE-LIFT CHECK.
//
//   node scripts/migration-reconcile/reconcile.mjs plan
//       Same measurement, plus a per-row disposition class for every discrepancy.
//       Writes verify-out/reconcile-plan.json. Reads nothing but the DB and the repo.
//
//   node scripts/migration-reconcile/reconcile.mjs emit
//       Writes the repair artifacts to verify-out/. WRITES NOTHING to the database
//       and touches no file under supabase/migrations. What it emits:
//         adopt/<version>_<name>.sql   class A2/A3 orphan dumps, byte-faithful
//         renames.sh                   class A1a git mv statements
//         ledger-repair.sql            class B2d mark-as-applied INSERTs
//         ledger-rollback.sql          the DELETE that undoes ledger-repair.sql
//
// NOTHING in this script applies a migration. `apply_migration` is ask-gated per root
// CLAUDE.md R7 6b; nothing here reaches it. The ledger SQL it emits is DML against one
// ordinary table and is run by psql under its own dispatch, never from this file.
//
// The password is never handled here: psql runs with -w and reads pgpass.conf.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const PSQL = process.env.PSQL || 'C:/Program Files/PostgreSQL/17/bin/psql.exe';
const CONN = ['-h', 'aws-1-us-east-1.pooler.supabase.com', '-p', '5432',
              '-U', 'postgres.anxmqiehpyznifqgskzc', '-d', 'postgres'];

const REPO = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIG = join(REPO, 'supabase', 'migrations');
const OUT = join(REPO, 'verify-out');

// Everything strictly before the baseline is reconciled-by-fiat against the current
// schema; the dump IS the record for that era (OPS58: recovery is dump-and-restore).
// Lower it only by a pass that actually reconciles the earlier rows.
const BASELINE = process.env.RECONCILE_BASELINE || '20260801000000';

// ---------------------------------------------------------------- rail access

function query(label, sql) {
  const file = join(tmpdir(), 'reconcile-' + label + '.sql');
  writeFileSync(file, sql, 'utf8');
  const r = spawnSync(PSQL, [...CONN, '-w', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', file],
                      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error('psql failed for ' + label + ':\n' + (r.stderr || r.error));
    process.exit(2);
  }
  return r.stdout;
}

// psql on Windows emits CRLF. A sentinel split that assumes bare LF silently loads
// zero bodies and every comparison then reports drift — DB22 hit exactly that.
// Match on the sentinel alone and strip whatever newline follows it.
function loadHistory() {
  const meta = query('meta',
    // E'' — a plain literal leaves the backslash alone under standard_conforming_strings
    // and the separator silently becomes four characters instead of one byte.
    "SELECT version || E'\\x01' || coalesce(name,'') || E'\\x01' ||" +
    " coalesce(array_length(statements,1),0) || E'\\x01' || coalesce(created_by,'')" +
    "  FROM supabase_migrations.schema_migrations ORDER BY version;");
  const rows = new Map();
  for (const line of meta.split('\n')) {
    if (!line.trim()) continue;
    const [version, name, nstmt, createdBy] = line.replace(/\r$/, '').split('\x01');
    rows.set(version, { version, name, nstmt: +nstmt, createdBy, body: '' });
  }
  // A CLOSING sentinel, not just an opening one. psql terminates every row with a
  // newline and the next record's leading E'\n' adds another, so an open-ended slice
  // silently gains two trailing bytes and no dump is ever byte-faithful.
  const bodies = query('bodies',
    "SELECT E'\\n<<<REC ' || version || '>>>' || E'\\n' || coalesce(array_to_string(statements,E'\\n'),'') || '<<<ENDREC>>>'" +
    "  FROM supabase_migrations.schema_migrations ORDER BY version;");
  let loaded = 0;
  for (const chunk of bodies.split('<<<REC ')) {
    const i = chunk.indexOf('>>>');
    const j = chunk.indexOf('<<<ENDREC>>>');
    if (i < 0 || j < 0) continue;
    const v = chunk.slice(0, i).trim();
    // psql's Windows build converts LF to CRLF on the way out. No stored statement
    // contains a CR (verified: 0 of 650), so undoing that is lossless — and required,
    // or every dump is 1 byte per line larger than what was applied and md5 never matches.
    if (rows.has(v)) { rows.get(v).body = chunk.slice(i + 3, j).replace(/^\r?\n/, '').replace(/\r\n/g, '\n'); loaded++; }
  }
  if (loaded < rows.size) {
    console.error('body loader filled ' + loaded + ' of ' + rows.size + ' rows — refusing to compare on a partial read');
    process.exit(2);
  }
  return rows;
}

function loadRepo() {
  const versioned = new Map(), unparseable = [];
  for (const f of readdirSync(MIG)) {
    if (!f.endsWith('.sql')) continue;
    const text = readFileSync(join(MIG, f), 'utf8');
    const m = /^(\d{14})_(.*)\.sql$/.exec(f);
    if (m) versioned.set(m[1], { file: f, slug: m[2], text });
    else unparseable.push(f);
  }
  return { versioned, unparseable };
}

// ---------------------------------------------------------------- comparison

// Whitespace and comments are the two things that legitimately differ between a file
// and the statement the management API stored, so a faithful/drifted verdict has to
// survive both. Anything left is a real content difference.
const squash = s => String(s).toLowerCase().replace(/\s+/g, '');
const decomment = s => squash(String(s).replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''));

// ...and transaction control is the third (DB42, 2026-08-09). Whether a migration's
// BEGIN;/COMMIT; wrapper reaches schema_migrations depends on how it was submitted:
// a body passed to apply_migration WITH the wrapper stores it verbatim (20260809002940),
// one passed without it does not (20260808202736 and five others). Both ran under a
// transaction either way -- the API supplies one. DB42 diffed all six statement by
// statement and the ONLY file statements absent from the applied text were BEGIN; and
// COMMIT;. No schema statement was ever missing from production.
//
// So this strips them before comparing, rather than "fixing" the six files by deleting
// their wrappers. Deleting them would be the wrong repair: a migration file is also a
// replayable artifact, and one without BEGIN/COMMIT replays under psql in autocommit --
// which is precisely the DB37 breach mode (HARNESS_SAFETY v1.0 rules 2 and 3). The
// bookkeeping tool bends; the safety property does not.
//
// LINE-ANCHORED and END IS DELIBERATELY ABSENT. plpgsql blocks contain a bare BEGIN
// (no semicolon, so it cannot match) and a terminating END; on its own line (which
// WOULD match, and stripping it would blind the comparison to real body changes).
const detx = s => String(s).replace(
  /^[ \t]*(begin|commit|rollback|start[ \t]+transaction)[ \t]*;[ \t]*$/gim, '');

function relate(appliedRaw, fileRaw) {
  const applied = detx(appliedRaw), file = detx(fileRaw);
  const a = squash(applied), b = squash(file);
  if (a === b) return 'IDENTICAL';
  const a2 = decomment(applied), b2 = decomment(file);
  if (a2 === b2) return 'IDENTICAL-SANS-COMMENTS';
  if (b2.includes(a2)) return 'REPO-SUPERSET';   // file grew after it was applied
  if (a2.includes(b2)) return 'DB-SUPERSET';     // more ran than the file says
  return 'DIVERGENT';
}
const faithful = rel => rel === 'IDENTICAL' || rel === 'IDENTICAL-SANS-COMMENTS';

function reconcile() {
  const history = loadHistory();
  const { versioned, unparseable } = loadRepo();

  const inBoth = [...history.keys()].filter(v => versioned.has(v));
  const historyOnly = [...history.keys()].filter(v => !versioned.has(v));
  const repoOnly = [...versioned.keys()].filter(v => !history.has(v));

  // B-1 version-matched pairs whose file does not describe what ran
  const lying = [];
  for (const v of inBoth) {
    const rel = relate(history.get(v).body, versioned.get(v).text);
    if (!faithful(rel)) lying.push({ version: v, file: versioned.get(v).file, rel });
  }

  // B-2 repo-only files re-joined to an orphan by slug, then by content.
  // The management API stamps its OWN apply-time version, so a file applied that way
  // lands in history under a version that is not its filename. That single mechanism
  // manufactures one orphan AND one repo-only file per apply, which is why the raw
  // two-set diff overstates the drift so badly.
  const claimed = new Set(), paired = [], orphanUnpaired = [], repoUnpaired = [];
  for (const v of repoOnly) {
    const r = versioned.get(v);
    let hit = historyOnly.find(o => !claimed.has(o) && history.get(o).name === r.slug);
    let how = 'slug';
    if (!hit) {
      hit = historyOnly.find(o => !claimed.has(o) &&
        (history.get(o).name.startsWith(r.slug) || r.slug.startsWith(history.get(o).name)));
      how = 'slug-prefix';
    }
    if (!hit) {
      const rs = decomment(r.text);
      hit = historyOnly.find(o => !claimed.has(o) && decomment(history.get(o).body) === rs);
      how = 'content';
    }
    if (!hit) { repoUnpaired.push(v); continue; }
    claimed.add(hit);
    paired.push({ repoVersion: v, file: r.file, appliedVersion: hit, how,
                  rel: relate(history.get(hit).body, r.text) });
  }
  for (const o of historyOnly) if (!claimed.has(o)) orphanUnpaired.push(o);

  return { history, versioned, unparseable, inBoth, historyOnly, repoOnly,
           lying, paired, orphanUnpaired, repoUnpaired };
}

// A statement set that only moves rows around is a DATA operation. It was recorded in
// schema history by accident of the tool used, and it does not belong in a folder whose
// job is to rebuild a schema — see REPORT.md class A4.
const isDDL = sql => /(^|[^a-z_])(create|alter|drop)\s+(or\s+replace\s+)?(table|view|materialized|function|procedure|type|index|trigger|policy|schema|extension|sequence|domain|publication)/i.test(sql);
const isPriv = sql => /(^|[^a-z_])(grant|revoke)\s/i.test(sql);

function classify(r, version) {
  const sql = r.history.get(version).body;
  if (!r.history.get(version).nstmt) return 'A5-stamp-only';
  if (isDDL(sql)) return 'A2-schema-ddl';
  if (isPriv(sql)) return 'A3-privileges';
  return 'A4-data';
}

// ---------------------------------------------------------------- commands

const cmd = process.argv[2] || 'measure';
const r = reconcile();
const after = v => v >= BASELINE;

// An unparseable filename has no version to compare against the baseline, and it can
// never be ordered by any replay tool, so it blocks regardless of when it was written.
const buckets = {
  'history rows with no repo file':        { rows: r.orphanUnpaired, dated: true },
  'repo files with no history row':        { rows: r.repoUnpaired, dated: true },
  'version-matched pairs, file != applied': { rows: r.lying.map(x => x.version), dated: true },
  'repo files with an unparseable version': { rows: r.unparseable, dated: false },
};

console.log('baseline            ' + BASELINE);
console.log('history rows        ' + r.history.size);
console.log('repo .sql           ' + (r.versioned.size + r.unparseable.length) +
            '  (' + r.versioned.size + ' versioned, ' + r.unparseable.length + ' unparseable)');
console.log('version-matched     ' + r.inBoth.length + '  (' + (r.inBoth.length - r.lying.length) + ' faithful, ' + r.lying.length + ' drifted)');
console.log('re-stamped applies  ' + r.paired.length + '  (one orphan + one repo-only file each, same migration)');
console.log('');
let blocking = 0;
for (const [label, b] of Object.entries(buckets)) {
  const live = b.dated ? b.rows.filter(after) : b.rows;
  blocking += live.length;
  console.log(String(b.rows.length).padStart(5) + ' ' + label +
              (b.dated ? '   (' + live.length + ' on/after baseline)' : '   (all blocking — no version to date)'));
}
console.log('');
console.log(blocking === 0 ? 'RECONCILED on/after baseline — freeze-lift criterion MET'
                           : 'NOT RECONCILED — ' + blocking + ' discrepancies on/after baseline');

if (cmd === 'measure') process.exit(blocking === 0 ? 0 : 1);

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

if (cmd === 'plan') {
  const plan = {
    baseline: BASELINE,
    counts: { history: r.history.size, repoVersioned: r.versioned.size, unparseable: r.unparseable.length },
    A1_restamped: r.paired.map(p => ({ ...p, disposition: faithful(p.rel) ? 'rename-file-to-applied-version' : 'adjudicate-per-file' })),
    A2_A3_A4_orphans: r.orphanUnpaired.map(v => ({ version: v, name: r.history.get(v).name, class: classify(r, v) })),
    B_repo_unpaired: r.repoUnpaired.map(v => ({ version: v, file: r.versioned.get(v).file })),
    C_drifted_pairs: r.lying,
    unparseable: r.unparseable,
  };
  writeFileSync(join(OUT, 'reconcile-plan.json'), JSON.stringify(plan, null, 2));
  console.log('\nwrote ' + join(OUT, 'reconcile-plan.json'));
  process.exit(0);
}

if (cmd === 'emit') {
  const adopt = join(OUT, 'adopt');
  if (!existsSync(adopt)) mkdirSync(adopt, { recursive: true });

  // class A2 + A3: the schema history the repo does not have. Dump verbatim — the
  // stored statement IS the artifact; do not re-terminate or re-join it (OPS45 §2
  // produced a trailing ';;' that way and only md5 caught it).
  let dumped = 0;
  for (const v of r.orphanUnpaired) {
    const cls = classify(r, v);
    if (cls !== 'A2-schema-ddl' && cls !== 'A3-privileges') continue;
    writeFileSync(join(adopt, v + '_' + r.history.get(v).name + '.sql'), r.history.get(v).body);
    dumped++;
  }

  // class A1a: file and applied statement agree, only the version differs.
  const renames = r.paired.filter(p => faithful(p.rel))
    .map(p => 'git mv "supabase/migrations/' + p.file + '" "supabase/migrations/' +
              p.appliedVersion + '_' + r.history.get(p.appliedVersion).name + '.sql"');

  // class B2d: applied through a path that wrote no history row. Marking it applied is
  // DML on one ordinary table — no apply_migration, no ask-click. The guard is the
  // NOT EXISTS: re-running inserts nothing.
  //
  // A row is emitted ONLY for a version recorded APPLIED in applied-evidence.json, and
  // the evidence is quoted into the statement. Inferring "it is in the repo, so it must
  // have run" is how fake history gets written — five of these files provably never ran.
  const evidence = JSON.parse(readFileSync(new URL('./applied-evidence.json', import.meta.url), 'utf8')).versions;
  const q = s => "'" + String(s).replace(/'/g, "''") + "'";
  const ledger = ['BEGIN;'], marked = [], skipped = [];
  for (const v of r.repoUnpaired) {
    const f = r.versioned.get(v);
    const e = evidence[v];
    if (!isDDL(f.text) && !isPriv(f.text)) { skipped.push([f.file, 'A4-data — no schema change to record']); continue; }
    if (!e)                    { skipped.push([f.file, 'NO EVIDENCE RECORDED — probe it, then add it to applied-evidence.json']); continue; }
    if (e.verdict !== 'APPLIED') { skipped.push([f.file, e.verdict + ' — ' + e.evidence]); continue; }
    marked.push(v);
    ledger.push('-- ' + f.file + '  evidence: ' + e.evidence.replace(/\n/g, ' '));
    ledger.push(
      'INSERT INTO supabase_migrations.schema_migrations (version, name, statements)' +
      ' SELECT ' + q(v) + ', ' + q(f.slug) + ', ARRAY[$MIGSTMT$' + f.text + '$MIGSTMT$]' +
      ' WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ' + q(v) + ');');
  }
  ledger.push('COMMIT;');
  const rollback = ['BEGIN;',
    'DELETE FROM supabase_migrations.schema_migrations WHERE version IN (' + marked.map(q).join(', ') + ');',
    'COMMIT;'];
  writeFileSync(join(OUT, 'ledger-skipped.txt'),
    skipped.map(([f, why]) => f + '\n    ' + why).join('\n') + '\n');

  for (const [name, body] of [['renames.sh', renames.join('\n')],
                              ['ledger-repair.sql', ledger.join('\n')],
                              ['ledger-rollback.sql', rollback.join('\n')]]) {
    writeFileSync(join(OUT, name), body + '\n');
  }
  if (ledger.some(l => l.includes('$MIGSTMT$') && l.split('$MIGSTMT$').length > 3)) {
    console.error('DOLLAR-TAG COLLISION: a migration body contains $MIGSTMT$. Refusing.');
    process.exit(2);
  }
  console.log('\nemitted to ' + OUT);
  console.log('  adopt/           ' + dumped + ' orphan dumps (class A2 + A3)');
  console.log('  renames.sh       ' + renames.length + ' git mv (class A1a)');
  console.log('  ledger-repair.sql / ledger-rollback.sql   ' + marked.length + ' mark-as-applied rows');
  console.log('  ledger-skipped.txt ' + skipped.length + ' repo-only files deliberately NOT stamped');
  console.log('\nNothing was applied and nothing was written to the database.');
  process.exit(0);
}

console.error('unknown command: ' + cmd + '  (measure | plan | emit)');
process.exit(2);
