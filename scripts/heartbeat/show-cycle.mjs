// OPS81 - print one heartbeat cycle's outcome to the TERMINAL.
//
// heartbeat.cmd writes its Claude payload to logs/heartbeat/hb-<stamp>.json and
// stderr to hb-<stamp>.err.txt. That is right for a scheduled run and useless for
// a manual one, where the whole point is seeing what happened without opening a
// file. This prints the readable parts of a run: outcome, turns, cost, denials,
// and the session's final message verbatim.
//
// Deliberately tolerant, same posture as log-cost.mjs: a malformed payload must
// never make a good run look failed. Every field is optional and missing ones
// print as "-". Read-only - it writes nothing, ever.
//
// usage: node show-cycle.mjs <hb-*.json> [<hb-*.err.txt>]

import fs from 'node:fs';

const [, , jsonPath, errPath] = process.argv;

if (!jsonPath) {
  console.error('[show-cycle] usage: node show-cycle.mjs <hb-*.json> [<hb-*.err.txt>]');
  process.exit(64);
}

const line = (label, value) => console.log(String(label).padEnd(16) + (value ?? '-'));

let payload = null;
let raw = '';
try {
  raw = fs.readFileSync(jsonPath, 'utf8');
  payload = JSON.parse(raw);
} catch (e) {
  console.log('--- CYCLE PAYLOAD: UNREADABLE ---');
  line('file', jsonPath);
  line('reason', e.message);
  if (raw) {
    console.log('--- raw, first 800 chars ---');
    console.log(raw.slice(0, 800));
  }
}

if (payload) {
  console.log('--- CYCLE OUTCOME ---');
  line('file', jsonPath);
  line('subtype', payload.subtype);
  line('is_error', payload.is_error);
  line('stop_reason', payload.stop_reason);
  line('terminal_reason', payload.terminal_reason);
  line('turns', payload.num_turns);
  line('duration_ms', payload.duration_ms);
  line('cost_usd', payload.total_cost_usd);
  line('session_id', payload.session_id);

  const denials = payload.permission_denials;
  if (Array.isArray(denials) && denials.length) {
    console.log(`--- PERMISSION DENIALS (${denials.length}) ---`);
    // Denials are the heartbeat's most load-bearing signal: under dontAsk they are
    // how the session PARKS instead of aborting, so they are never noise.
    for (const d of denials) {
      console.log('  ' + JSON.stringify(d));
    }
  } else {
    line('denials', Array.isArray(denials) ? '0' : '-');
  }

  console.log('--- FINAL MESSAGE (verbatim) ---');
  console.log(payload.result === undefined ? '(no result field)' : String(payload.result));
}

if (errPath) {
  let errText = null;
  try {
    errText = fs.readFileSync(errPath, 'utf8');
  } catch {
    // A missing .err.txt is normal on a clean run - heartbeat.cmd only appends to
    // it on a nonzero exit, so absence is not an error worth shouting about.
  }
  console.log('--- STDERR / WRAPPER LOG ---');
  if (errText === null) console.log(`(no file at ${errPath})`);
  else if (errText.trim() === '') console.log('(empty - clean run)');
  else console.log(errText);
}
