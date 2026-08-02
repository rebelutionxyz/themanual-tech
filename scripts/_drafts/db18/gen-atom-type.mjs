#!/usr/bin/env node
// =====================================================================
// DRAFT - NOT WIRED. DB18, 2026-08-02.
//
// THE GENERATION MECHANISM for AtomType.
//
// A hand-copied union is what created the DB18 defect: src/types/manual.ts
// declared five values, production held nine, and the two never met because
// nothing made them meet. This script is the thing that makes them meet.
//
// SOURCE OF TRUTH = the CHECK constraint `atoms_type_check`, NOT the data.
//   Generating from `SELECT DISTINCT type` would make the union track
//   whatever happened to get inserted last - a typo would silently become
//   canon. Generating from the constraint means the vocabulary changes only
//   when someone writes a migration, and the TypeScript follows automatically.
//   The constraint itself is generated from the data ONCE, in
//   supabase/migrations/_drafts/20260802000000_db18_atoms_type_check.sql.
//
// TRANSPORT: psql, not a client library.
//   The repo has no `pg` dependency and this must not add one. psql is
//   already the workspace's prod-read path, and it reads the password from
//   %APPDATA%\postgresql\pgpass.conf - no secret is passed, printed, or
//   logged. Read-only: one SELECT against pg_constraint.
//
// TO WIRE (proposed, not done):
//   1. move this file to scripts/gen-atom-type.mjs
//   2. package.json:
//        "gen:atom-type":       "node scripts/gen-atom-type.mjs",
//        "gen:atom-type:check": "node scripts/gen-atom-type.mjs --check",
//        "build": "npm run gen:atom-type:check && tsc -b && vite build"
//   3. commit the generated src/types/atom-type.generated.ts
//   4. src/types/manual.ts re-exports it (see manual.ts.proposed.diff)
//
//   --check exits 1 if the committed file differs from what the DB implies.
//   That is the whole point: drift becomes a failing build, not a silent lie.
//   Putting it in `build` and not only in CI means a local build catches it
//   too; `dev` is deliberately left alone so the dev server never needs prod.
//
// FAILURE POSTURE: if psql is unreachable, --check EXITS 0 with a warning.
//   A developer offline must still be able to build. The generator can only
//   ever catch drift when it can see the DB; making it fatal would make the
//   build depend on network reachability, which trades one silent failure for
//   a louder, more frequent one. CI has the DB, so CI is where it bites.
// =====================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PSQL = 'C:/Program Files/PostgreSQL/17/bin/psql.exe';
const CONN = [
  '-h', 'aws-1-us-east-1.pooler.supabase.com',
  '-p', '5432',
  '-U', 'postgres.anxmqiehpyznifqgskzc',
  '-d', 'postgres',
  '-w',                       // never prompt; pgpass.conf or nothing
  '-v', 'ON_ERROR_STOP=1',
  '-t', '-A',                 // tuples only, unaligned
];

// pg_get_constraintdef renders the CHECK; we pull the quoted literals out of
// it rather than re-deriving from the data. Any value legal in the DB appears
// here exactly once.
const SQL =
  "SELECT pg_get_constraintdef(oid) FROM pg_constraint " +
  "WHERE conrelid = 'public.atoms'::regclass AND conname = 'atoms_type_check';";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', '..', 'src', 'types', 'atom-type.generated.ts');

const checkOnly = process.argv.includes('--check');

function readVocabulary() {
  const def = execFileSync(PSQL, [...CONN, '-c', SQL], { encoding: 'utf8' }).trim();
  if (!def) {
    throw new Error(
      "constraint atoms_type_check not found on public.atoms - has " +
      "20260802000000_db18_atoms_type_check.sql been applied?",
    );
  }
  // 'city'::text  ->  city
  const values = [...def.matchAll(/'([^']+)'::text/g)].map((m) => m[1]);
  if (values.length === 0) throw new Error(`could not parse vocabulary from: ${def}`);
  return [...new Set(values)].sort();
}

function render(values) {
  return [
    '// GENERATED FILE - DO NOT EDIT.',
    '//',
    '// Source of truth: the atoms_type_check CHECK constraint on public.atoms.',
    '// Regenerate with `npm run gen:atom-type`. Changing the vocabulary means',
    '// writing a migration; this file follows, it never leads.',
    '//',
    '// Mechanism: scripts/gen-atom-type.mjs (DB18, 2026-08-02).',
    '',
    'export type AtomType =',
    ...values.map((v, i) => `  | '${v}'${i === values.length - 1 ? ';' : ''}`),
    '',
    '/** Every legal atoms.type value, in the constraint\'s order. */',
    'export const ATOM_TYPES = [',
    ...values.map((v) => `  '${v}',`),
    '] as const satisfies readonly AtomType[];',
    '',
    '/** Runtime guard for values arriving from the DB as `unknown`/`string`. */',
    'export function isAtomType(v: unknown): v is AtomType {',
    '  return typeof v === \'string\' && (ATOM_TYPES as readonly string[]).includes(v);',
    '}',
    '',
  ].join('\n');
}

let values;
try {
  values = readVocabulary();
} catch (err) {
  if (checkOnly) {
    console.warn(`[gen-atom-type] SKIPPED (DB unreachable): ${err.message}`);
    process.exit(0);
  }
  console.error(`[gen-atom-type] FAILED: ${err.message}`);
  process.exit(1);
}

const next = render(values);
const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;

if (checkOnly) {
  if (prev === next) {
    console.log(`[gen-atom-type] OK - ${values.length} values, in sync.`);
    process.exit(0);
  }
  console.error(
    '[gen-atom-type] DRIFT - src/types/atom-type.generated.ts does not match ' +
    `the DB. Expected: ${values.join(' | ')}. Run \`npm run gen:atom-type\`.`,
  );
  process.exit(1);
}

writeFileSync(OUT, next, 'utf8');
console.log(`[gen-atom-type] wrote ${OUT} - ${values.length} values: ${values.join(', ')}`);
