// OPS18 — append one heartbeat run to a CSV cost ledger.
// Per the DOCS5 verdict §1.4: `--output-format json` exposes `total_cost_usd`,
// so a heartbeat can account for its own spend without touching the usage
// dashboard. Wired from run one, as that section recommends.
//
// Deliberately tolerant: a malformed or truncated payload must never make the
// heartbeat itself look like it failed. Worst case we log zeros and move on.
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';

const [, , outPath, ledgerPath, stamp, rc] = process.argv;

let cost = '', turns = '', sessionId = '', resultKind = '';
try {
  const raw = JSON.parse(readFileSync(outPath, 'utf8'));
  const r = Array.isArray(raw) ? (raw.find((x) => x?.type === 'result') ?? raw.at(-1)) : raw;
  cost = r?.total_cost_usd ?? '';
  turns = r?.num_turns ?? '';
  sessionId = r?.session_id ?? '';
  resultKind = r?.subtype ?? r?.type ?? '';
} catch {
  resultKind = 'unparseable';
}

if (!existsSync(ledgerPath)) {
  writeFileSync(ledgerPath, 'stamp,exit_code,result,turns,total_cost_usd,session_id\n');
}
appendFileSync(
  ledgerPath,
  [stamp, rc, resultKind, turns, cost, sessionId].join(',') + '\n',
);
console.log(`[heartbeat] logged cost ${cost || 'n/a'} (${resultKind || 'n/a'})`);
