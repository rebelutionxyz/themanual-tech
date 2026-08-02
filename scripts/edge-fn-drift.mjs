#!/usr/bin/env node
// edge-fn-drift.mjs - the check that would have caught OPS55.
//
// Compares the slugs Supabase is RUNNING against the directory names under
// supabase/functions/, in BOTH directions:
//
//   LOST     deployed but no source in the repo  -> the artifact can vanish
//   UNSHIPPED  source in the repo but not deployed -> dead code or pending work
//
// The three lines that do the work are marked CORE below. Everything else is
// invocation and formatting.
//
// Usage (from TheMANUAL.tech/):   node scripts/edge-fn-drift.mjs
// Exit 0 = no LOST functions. Exit 1 = at least one LOST function.
// UNSHIPPED is reported but never fails the run - it is a normal state.
//
// Read-only: the only remote call is `supabase functions list`. It deploys
// nothing and writes nothing.
//
// PROPOSED HOME: the SWEEP gate (root CLAUDE.md "SWEEP - the routine commit",
// step 2 "Hard gates"). A LOST function is exactly the class of thing a sweep
// must not walk past: it means production is running code that the commit
// about to be made does not contain. Running it there costs one API call per
// sweep and needs no new schedule.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'anxmqiehpyznifqgskzc';
// EDGE_FUNCTIONS_DIR override exists so the check can be demonstrated against a
// reconstructed directory state (e.g. proving it fires on the pre-OPS55 tree).
const FUNCTIONS_DIR = process.env.EDGE_FUNCTIONS_DIR
  ?? join(dirname(dirname(fileURLToPath(import.meta.url))), 'supabase', 'functions');

const raw = execFileSync('supabase', ['functions', 'list', '--project-ref', PROJECT_REF, '-o', 'json'], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});

// CORE 1 - what production is running (ACTIVE only).
const deployed = new Set(JSON.parse(raw).filter((f) => f.status === 'ACTIVE').map((f) => f.slug));
// CORE 2 - what the repo carries ( _shared and friends are libraries, not functions).
const inRepo = new Set(readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name));
// CORE 3 - both difference sets.
const lost = [...deployed].filter((s) => !inRepo.has(s)).sort();
const unshipped = [...inRepo].filter((s) => !deployed.has(s)).sort();

console.log(`deployed: ${deployed.size}  in repo: ${inRepo.size}`);
console.log(lost.length ? `LOST (deployed, no source in repo): ${lost.join(', ')}` : 'LOST: none');
console.log(unshipped.length ? `UNSHIPPED (source, not deployed): ${unshipped.join(', ')}` : 'UNSHIPPED: none');
process.exit(lost.length ? 1 : 0);
