// OPS17 — Mission Control v1. Hands and eyes on the ops rail, not a second brain.
//
// WHAT IT IS
//   A localhost-only page that RENDERS the rail (queued + claimed dispatches,
//   stale-claim flags, recent report headlines) and can SPAWN a Claude terminal
//   in a configured workspace folder. That is all.
//
// WHAT IT IS NOT — these are load-bearing, not stylistic:
//   * It performs ZERO rail writes. There is no INSERT, UPDATE or DELETE
//     anywhere in this file, and no code path that could emit one. Claiming
//     stays in the terminals where the protocol puts it (R2: one `go` = at most
//     one claim, provably). A button that claimed work would break that.
//   * It holds NO credential. Every query shells out to psql with `-w`, so the
//     password comes from %APPDATA%\postgresql\pgpass.conf and is never read,
//     printed, or held in this process. Nothing secret reaches the page.
//   * It binds 127.0.0.1 ONLY. Never 0.0.0.0 — this thing spawns processes.
//
// SPAWN SAFETY
//   The browser never sends a path. It sends an INDEX into the configured
//   folder list, which this file validates. Combined with execFile (argv array,
//   no shell), there is no string a page could send that becomes a command.
//
// OPS20 — WHY THE BUTTON SAID "opened" AND NOTHING OPENED
//   Reproduced: `execFile('wt.exe', …)` fails with ENOENT whenever this process's
//   PATH lacks %LOCALAPPDATA%\Microsoft\WindowsApps — the alias directory wt.exe
//   lives in, which is on the USER PATH and therefore absent from plenty of
//   launch contexts. The old code passed a no-op callback to execFile, so that
//   ENOENT went nowhere, and the handler answered {ok:true} before the child had
//   done anything at all. The page printed "opened <folder>" over a spawn that
//   never happened. Two faults, one symptom:
//     1. RESOLUTION — wt.exe was left to PATH luck at click time. It is now
//        resolved to an absolute path at startup, with an explicit WindowsApps
//        fallback and a plain-console fallback under that, so a thin PATH
//        degrades instead of failing.
//     2. REPORTING — the launcher's result was discarded. It is now awaited, and
//        an exit code is still not treated as proof: wt.exe is a stub that exits
//        0 in ~100ms regardless, so a spawn counts as successful only when a new
//        console-host process is observed. Anything less reports as a failure.
//   Not the cause, though it was the first suspect: `-d` alone does open a real
//   window, not a tab in the existing one (measured, 10 -> 11 top-level windows).
//   `-w new` is kept anyway so a later windowingBehavior=useExisting setting
//   cannot turn these into background tabs.
//
// OPS22 — WHY THE WINDOW OPENED BEHIND THE BROWSER
//   Not a spawn fault at all: it is Windows' foreground lock working as
//   documented. SetForegroundWindow refuses a process that did not receive the
//   last input event. The click landed in the BROWSER, so the browser holds
//   foreground; this server did not get the input, and neither did the terminal
//   it launched — so the new window opened behind and only flashed its taskbar
//   button.
//
//   The fix is a post-spawn activation step, `focus-window.ps1`, handed the PIDs
//   this file already observes for spawn verification. It walks an escalating
//   ladder (AttachThreadInput -> topmost flip -> minimize/restore -> taskbar
//   flash) and reports WHICH rung won, so the page can say "front" or "in front,
//   not focused" or "flashing — click it" instead of guessing.
//
//   Two things that are not obvious and cost real time to find:
//     * AttachThreadInput fails outright unless BOTH threads have a message
//       queue, and a console PowerShell thread has none until something forces
//       one. Measured here: without the PeekMessage primer the clean rung failed
//       100% of the time and the ladder fell through to the flickery
//       minimize/restore. With it, rung 1 wins.
//     * The PID that owns the window is NOT the launcher's. wt.exe is a stub
//       that exits immediately; the window belongs to the WindowsTerminal.exe
//       that appears during verification, which is why the pids collected there
//       are the ones handed to the activator.
//
//   Focus is attempted ONLY in response to a deliberate button click, and the
//   activator synthesises no input — no key or click injection anywhere.
//
// RUN:  node scripts/mission-control/server.mjs
//       then open http://127.0.0.1:7317

import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(HERE, 'mission-control.config.json');
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

// ── rail read ───────────────────────────────────────────────────────────────
// One psql invocation, JSON out, so nothing depends on delimiter parsing.
// SELECT only. If you are editing this and reach for a write, stop and read the
// header again.
const BOARD_SQL = `
SELECT json_build_object(
  'server_now', now(),
  'dispatches', COALESCE((
    -- OPS41: this ORDER BY used to be (status, priority, created_at), which is
    -- an order NOBODY would ever get. The canonical claim orders by sticky-lane
    -- DESC, then priority, then created_at. The board cannot know a given
    -- terminal's session lanes, so it shows the claim's order MINUS the sticky
    -- term - and the UI says exactly that rather than faking certainty.
    -- ASCII ONLY BELOW THIS LINE AND ABOVE IT. This text is handed to psql as a
    -- command-line ARGUMENT; Windows converts argv to the child's codepage, so a
    -- U+2014 em dash arrives as CP1252 0x97 and the server rejects the whole query
    -- with: invalid byte sequence for encoding "UTF8": 0x97. One character blinded
    -- the entire board (OPS43). Rail CONTENT keeps its em dashes - they travel the
    -- other way, in stdout, and are fine. This rule is about CODE.
    SELECT json_agg(row_to_json(d) ORDER BY d.priority, d.created_at)
      FROM (
        SELECT id, pass, lane, title, status, priority, workdir, scope,
               after_pass, created_at, claimed_at,
               EXTRACT(EPOCH FROM (now() - created_at))/60  AS age_min,
               CASE WHEN claimed_at IS NULL THEN NULL
                    ELSE EXTRACT(EPOCH FROM (now() - claimed_at))/60 END AS claimed_min,
               (after_pass IS NOT NULL AND NOT EXISTS (
                  SELECT 1 FROM public.ops_dispatches p
                   WHERE p.pass = ops_dispatches.after_pass AND p.status = 'done'
               )) AS blocked
          FROM public.ops_dispatches
         WHERE status IN ('queued','claimed')
      ) d
  ), '[]'::json),
  'reports', COALESCE((
    SELECT json_agg(row_to_json(r) ORDER BY r.created_at DESC)
      FROM (
        SELECT pass, terminal, title, created_at,
               EXTRACT(EPOCH FROM (now() - created_at))/60 AS age_min
          FROM public.ops_reports
         ORDER BY created_at DESC
         LIMIT ${Number(cfg.reportHeadlines) || 12}
      ) r
  ), '[]'::json),
  -- OPS33 build progress. Status is DERIVED from the rail wherever a step
  -- carries a pass; nobody ticks a box the rail already knows the answer to.
  'build_rollup', COALESCE((
    SELECT json_agg(row_to_json(x) ORDER BY x.astra)
      FROM (SELECT * FROM public.ops_build_rollup) x
  ), '[]'::json),
  'build_total', (SELECT row_to_json(h) FROM public.ops_build_honeycomb h),
  'build_steps', COALESCE((
    SELECT json_agg(row_to_json(s) ORDER BY s.astra, s.phase_no, s.step_no)
      FROM (
        SELECT astra, phase_no, phase, step_no, title, dispatch_pass, effort,
               derived_status, rail_derived, notes,
               est_median, est_p25, est_p75, est_sample_n
          FROM public.ops_build_progress
      ) s
  ), '[]'::json)
) AS board;`;

// OPS43 FAIL-SOFT, and this is the part that matters more than the byte fix.
//
// Before: ONE query fed all three panels, and any error rejected the whole read.
// A single undecodable character blanked the board, recent reports AND build
// progress at once — and a blank board looks exactly like an empty queue, which
// is a lie the rail has already punished us for once.
//
// Now: the big query is tried first (one round trip, the fast path). If it fails
// for ANY reason, each section is retried on its own, and whatever survives is
// returned alongside a `failed` list the UI must show. One poisoned section can
// no longer take the other two down with it.
const SECTION_SQL = {
  dispatches: "SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.status, d.priority, d.created_at), '[]'::json) FROM (SELECT * FROM public.ops_dispatches WHERE status IN ('queued','claimed')) d;",
  reports:    "SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::json) FROM (SELECT pass, terminal, title, created_at FROM public.ops_reports ORDER BY created_at DESC LIMIT 12) r;",
  build_steps: "SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM (SELECT * FROM public.ops_build_progress) s;",
};

function psqlJson(sql) {
  return new Promise((resolve, reject) => {
    execFile(
      cfg.psql,
      ['-h', cfg.db.host, '-p', cfg.db.port, '-U', cfg.db.user, '-d', cfg.db.name,
       '-w', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { maxBuffer: 1024 * 1024 * 8, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).trim().split('\n')[0]));
        try { resolve(JSON.parse(stdout.trim())); }
        catch { reject(new Error('rail returned unparseable JSON')); }
      },
    );
  });
}

async function readBoard() {
  try {
    return await psqlJson(BOARD_SQL);           // fast path, unchanged shape
  } catch (whole) {
    // Degraded path. Each section stands or falls alone.
    const board = { server_now: new Date().toISOString(), dispatches: [], reports: [], build_steps: [], build_rollup: [], build_total: null };
    const failed = [{ section: 'combined', error: whole.message }];
    for (const [name, sql] of Object.entries(SECTION_SQL)) {
      try { board[name] = await psqlJson(sql); }
      catch (e) { failed.push({ section: name, error: e.message }); }
    }
    board.failed = failed;
    console.error(`[rail] degraded read :: ${failed.map((f) => f.section).join(', ')}`);
    return board;
  }
}

// ── spawn ───────────────────────────────────────────────────────────────────
// Resolve executables ONCE, at startup, to absolute paths — via `where.exe`,
// deliberately, NOT by probing the filesystem.
//
//   wt.exe lives in %LOCALAPPDATA%\Microsoft\WindowsApps as an AppExecLink
//   reparse point. Node's stat and lstat BOTH return ENOENT on that reparse tag,
//   so existsSync() reports the file as missing even though CreateProcess runs
//   it happily. Any resolver built on existsSync silently concludes "no Windows
//   Terminal on this machine". `where.exe` performs the same search CreateProcess
//   does, so it is the only resolver that agrees with reality here.
//
// PATHEXT preference matters too: `where claude` lists the extensionless shell
// script before claude.cmd, and cmd.exe cannot run the former.
const PATHEXTS = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
  .split(';').filter(Boolean).map((e) => e.toLowerCase());

function resolveExe(name) {
  if (!name) return null;
  if (!/[\\/]/.test(name)) {
    try {
      const out = execFileSync('where.exe', [name], {
        encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
      });
      const hits = out.split('\n').map((s) => s.trim()).filter(Boolean);
      const runnable = hits.find((h) => PATHEXTS.includes((h.match(/\.[A-Za-z0-9]+$/) || [''])[0].toLowerCase()));
      if (runnable || hits[0]) return runnable || hits[0];
    } catch { /* where.exe exits 1 when nothing matches — fall through */ }
  }
  return existsSync(name) ? name : null;   // absolute path configured by hand
}

const WINDOWS_APPS = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps')
  : null;
const SYSTEM_CMD = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');

// Fallback chain, because a thin PATH must degrade rather than fail:
//   wt.exe on PATH  ->  the WindowsApps alias by its known path  ->  plain cmd.exe.
// The middle rung cannot be confirmed on disk (AppExecLink, see above), so it is
// taken on trust and any real failure surfaces from the launch itself.
function resolveTerminal() {
  const onPath = resolveExe(cfg.terminal.exe);
  if (onPath) return { path: onPath, kind: 'wt', how: 'PATH' };
  if (/^wt(\.exe)?$/i.test(cfg.terminal.exe) && WINDOWS_APPS) {
    return { path: join(WINDOWS_APPS, 'wt.exe'), kind: 'wt', how: 'WindowsApps fallback (not on PATH)' };
  }
  return { path: SYSTEM_CMD, kind: 'cmd', how: `fallback — ${cfg.terminal.exe} not found` };
}

const SYSTEM_PS = join(process.env.SystemRoot || 'C:\\Windows',
  'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

const RESOLVED = {
  terminal: resolveTerminal(),
  // Bare 'claude' is a usable last resort: cmd.exe resolves it from the child's
  // own PATH. Recorded as unresolved so startup says so out loud.
  command: resolveExe(cfg.terminal.command),
  // OPS22's activator host. PATH first, then the fixed System32 location — a
  // thin PATH must not silently cost us window focus.
  powershell: resolveExe('powershell.exe') || (existsSync(SYSTEM_PS) ? SYSTEM_PS : null),
  // OPS25's Tier 2 reader. Carries its own auth; the board holds no token.
  gh: resolveExe('gh.exe') || resolveExe('gh'),
};

// A console host appearing is the only honest evidence that a terminal opened —
// wt.exe's own exit code is not. Returns null when the check itself is
// unavailable, which is reported as "unverified", never as success.
const HOST_RE = /^"(WindowsTerminal\.exe|OpenConsole\.exe|conhost\.exe)","(\d+)"/i;
function consoleHostPids() {
  try {
    const out = execFileSync('tasklist.exe', ['/NH', '/FO', 'CSV'], {
      encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 * 8,
    });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const g = line.match(HOST_RE);
      if (g) pids.add(g[2]);
    }
    return pids;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns the PIDs that appeared, [] if none did, or null when the check itself
// is unavailable. OPS22 needs the pids themselves, not just a yes/no: the window
// to activate belongs to one of them.
//
// A terminal materialises as more than one process (WindowsTerminal.exe plus its
// OpenConsole/conhost), and they do not appear in one tick. After the first
// sighting we keep watching for a short settle so the activator gets the whole
// set — otherwise we might hand it only the console host, which owns no window.
async function waitForNewHosts(before, budgetMs) {
  const deadline = Date.now() + budgetMs;
  const fresh = new Set();
  let settleUntil = null;
  while (Date.now() < deadline) {
    await sleep(250);
    const now = consoleHostPids();
    if (!now) return null;
    for (const pid of now) if (!before.has(pid)) fresh.add(pid);
    if (fresh.size && settleUntil === null) settleUntil = Date.now() + 600;
    if (settleUntil !== null && Date.now() >= settleUntil) break;
  }
  return [...fresh];
}

// Run the launcher and actually LISTEN to it. Never resolves to success on a
// non-zero exit or a spawn error the way the old no-op callback did.
function runLauncher(exe, args, env) {
  return new Promise((resolve) => {
    const child = execFile(exe, args, { windowsHide: false, env: env || process.env }, (err, stdout, stderr) => {
      resolve({
        error: err && err.code === 'ENOENT' ? `${basename(exe)} not found` : null,
        code: err ? (typeof err.code === 'number' ? err.code : null) : 0,
        stderr: (stderr || '').trim(),
        stdout: (stdout || '').trim(),
        message: err ? err.message : null,
      });
    });
    child.on('error', () => {});   // surfaced through the callback above
  });
}

// `command` is passed as ONE argv element holding an absolute path, so the shell
// inside the terminal never has to resolve it either.
const COMMAND = () => RESOLVED.command || cfg.terminal.command;

// ── window naming (OPS32) ───────────────────────────────────────────────────
// Butch had TRIV22 and TRIV23 running side by side, both titled "claude code",
// could not tell which was which, and stopped both — costing a stopped pass and
// a lead round-trip.
//
// Two halves to the fix, and only the first belongs to this process:
//
//   1. STOP CLAUDE OVERWRITING THE TITLE. Claude Code titles the terminal from
//      an auto-generated topic summary, and it does so with an OSC escape AFTER
//      the window exists — so whatever the launcher set is simply replaced a
//      second or two later. OPS22 hit this and logged it as an unreliable focus
//      hint: the same window read `claude` on one run and `✳ Claude Code` on the
//      next. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` in the spawned environment
//      turns that off; see SPAWN_ENV below.
//   2. GIVE THE WINDOW A NAME WORTH KEEPING. That is the tag below.
//
// The tag is NOT the pass code, and it cannot be: this endpoint spawns a
// terminal in a FOLDER, and the pass is claimed later by the session itself when
// Butch types `go`. Nothing here knows, or can know, which pass that will be.
// See the OPS32 report — the pass-code half needs a protocol decision.
//
// So the tag is what the spawner genuinely owns: a per-spawn serial plus the
// folder. `MC3 · TheHoneycomb.games` distinguishes two terminals in the SAME
// folder, which is exactly the case that bit him — TRIV22 and TRIV23 were both
// TheHoneycomb.games, so a folder-only title would still have been ambiguous.
let spawnSerial = 0;
const nextTag = (folder) => `MC${++spawnSerial} · ${folder.label}`;

// Inherit everything, then suppress Claude's own titling. Measured on this box:
// an env var set on the wt.exe launcher DOES reach the shell inside the new tab
// (probe read it back), which was not obvious — wt.exe is an AppExecLink stub
// and OPS22 found it hands off to an already-running WindowsTerminal.exe.
//
// OPS41 also exports the tag as MC_SESSION so the canonical claim can record
// WHICH terminal holds a pass (ops_dispatches.claimed_by). Same identifier as
// the window title — one naming scheme, not two.
//
// ASCII-ONLY on purpose. The window tag uses '·', which does NOT survive the
// Windows console -> psql path: measured, `ERROR: invalid byte sequence for
// encoding "UTF8": 0xb7`. So the session id substitutes '/' for the separator.
// The window keeps its prettier form; the rail gets the transportable one.
const sessionId = (tag) => (tag || '').replace(/\s*·\s*/g, '/').replace(/[^\x20-\x7E]/g, '');
const SPAWN_ENV = (tag) => ({
  ...process.env,
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: '1',
  ...(tag ? { MC_SESSION: sessionId(tag) } : {}),
});

function wtArgv(folder, tag) {
  return [
    ...(cfg.terminal.newWindowArgs || []),   // `-w new nt` — a dedicated window, whatever the WT settings say
    '--title', tag,
    '-d', folder.path,
    ...(cfg.terminal.shellArgs || []),
    COMMAND(),
  ];
}

// Windows-Terminal-free fallback: `start` gives the console its own window, /D
// sets the working directory, and /k holds it open so an error stays readable.
// `start`'s first quoted argument IS the window title, so the tag lands the same
// way on this path.
function cmdArgv(folder, tag) {
  return ['/c', 'start', tag, '/D', folder.path, 'cmd', '/k', COMMAND()];
}

// ── focus (OPS22) ───────────────────────────────────────────────────────────
// The activation ladder lives in focus-window.ps1 so the Win32 sequence is
// auditable on its own terms rather than buried in a template string here. This
// function's only jobs are: hand it the pids, bound its runtime, and refuse to
// invent an outcome if it fails.
//
// Failure to focus is NEVER promoted to a spawn failure. The terminal is open;
// where it sits in the Z-order is a lesser problem and is reported as its own
// field.
const FOCUS_SCRIPT = join(HERE, 'focus-window.ps1');
const FOCUS_CFG = cfg.focus || {};
const focusEnabled = () => FOCUS_CFG.enabled !== false;
const focusAvailable = () => Boolean(RESOLVED.powershell) && existsSync(FOCUS_SCRIPT);

function runActivator(args, budgetMs) {
  return new Promise((resolve) => {
    execFile(
      RESOLVED.powershell,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', FOCUS_SCRIPT, ...args],
      // windowsHide matters here: a visible helper console would take foreground
      // itself and defeat the thing it was launched to do.
      { windowsHide: true, timeout: budgetMs, maxBuffer: 1024 * 256 },
      (err, stdout) => {
        const line = (stdout || '').trim().split('\n').pop() || '';
        try { resolve(JSON.parse(line)); }
        catch {
          resolve({ ok: false, rung: 'error', reason: err ? err.message : 'activator returned no JSON' });
        }
      },
    );
  });
}

// Taken BEFORE the launcher runs. See focus-window.ps1's header for why the
// window is identified by handle-diff and not by the spawned pid: Windows
// Terminal hosts new windows inside an ALREADY-RUNNING process, so the pid that
// owns the window is typically one that predates the click entirely.
async function windowSnapshot() {
  if (!focusEnabled() || !focusAvailable()) return null;
  const r = await runActivator(['-Snapshot'], 8000);
  return Array.isArray(r.hwnds) ? r.hwnds : null;
}

// Failure to focus is NEVER promoted to a spawn failure. The terminal is open;
// where it sits in the Z-order is a lesser problem and gets its own field.
async function focusWindow(snapshot, pids, title) {
  if (!focusEnabled()) return { ok: false, rung: 'disabled', reason: 'focus disabled in config' };
  if (!RESOLVED.powershell) return { ok: false, rung: 'skipped', reason: 'powershell not found' };
  if (!existsSync(FOCUS_SCRIPT)) return { ok: false, rung: 'skipped', reason: 'focus-window.ps1 missing' };
  if (!snapshot) return { ok: false, rung: 'skipped', reason: 'pre-spawn window snapshot unavailable' };

  const timeoutMs = Number(FOCUS_CFG.timeoutMs) || 4000;
  const args = [
    '-Exclude', snapshot.join(','),
    '-Pids', (pids || []).join(','),
    '-Title', title,
    '-TimeoutMs', String(timeoutMs),
  ];
  if (FOCUS_CFG.flashFallback === false) args.push('-NoFlash');
  return runActivator(args, timeoutMs + 8000);
}

async function attempt(exe, args, label, t0, tag) {
  // Both "before" pictures are taken together, and both must precede the
  // launcher: the pid set proves a terminal appeared, the handle set identifies
  // which window it is.
  const [before, snapshot] = [consoleHostPids(), await windowSnapshot()];
  console.log(`[spawn] ${label} :: ${exe} ${args.join(' ')}`);
  // OPS32: SPAWN_ENV suppresses Claude Code's own terminal titling, so the tag
  // this launcher sets is still there an hour later.
  const r = await runLauncher(exe, args, SPAWN_ENV(tag));
  if (r.error) return { ok: false, reason: r.error, hard: true };
  if (r.code !== 0) {
    return { ok: false, reason: `${basename(exe)} exited ${r.code}${r.stderr ? ` — ${r.stderr}` : ''}` };
  }
  const pids = before ? await waitForNewHosts(before, Number(cfg.spawnVerifyMs) || 3000) : null;
  // null = tasklist unavailable (unverified), [] = nothing appeared (failure),
  // non-empty = confirmed. Same three-state honesty as before, now carrying the
  // pids OPS22 needs.
  const verified = pids === null ? null : pids.length > 0;
  console.log(
    `[spawn] ${label} :: launcher exit 0 in ${Date.now() - t0}ms, terminal ` +
    (verified === true ? `CONFIRMED (pid ${pids.join(',')})`
      : verified === false ? 'NOT CONFIRMED' : 'unverified (tasklist unavailable)') +
    (r.stderr ? ` :: stderr ${r.stderr}` : ''),
  );
  if (verified === false) {
    return { ok: false, reason: `${basename(exe)} exited 0 but no terminal appeared` };
  }

  const focus = await focusWindow(snapshot, pids || [], tag || `MC ${label}`);
  console.log(
    `[focus] ${label} :: rung ${focus.rung}` +
    (focus.focused ? ' — FRONT + focused' : focus.raised ? ' — in front, NOT focused' : ' — not raised') +
    (focus.how ? ` :: matched by ${focus.how}` : '') +
    (focus.title ? ` :: "${focus.title}"` : '') +
    (focus.reason ? ` :: ${focus.reason}` : '') +
    (focus.attachDiag ? ` :: ${focus.attachDiag}` : ''),
  );

  return { ok: true, verified, focus };
}

async function spawnTerminal(index) {
  const folder = cfg.folders[index];
  if (!folder) throw new Error('unknown folder index');           // validated, not trusted
  if (!existsSync(folder.path)) throw new Error(`folder missing on disk: ${folder.path}`);

  const t0 = Date.now();
  // One tag per spawn, reused across the wt attempt and the cmd fallback so a
  // window that came up the long way still carries the same name.
  const tag = nextTag(folder);
  let r;
  if (RESOLVED.terminal.kind === 'wt') {
    r = await attempt(RESOLVED.terminal.path, wtArgv(folder, tag), folder.label, t0, tag);
    if (r.ok) return { label: folder.label, tag, verified: r.verified, focus: r.focus };
    // wt.exe genuinely absent — drop to a plain console rather than leave the
    // button dead. Anything else (non-zero exit, nothing opened) is a real
    // failure and is reported as one.
    if (!r.hard) throw new Error(r.reason);
    console.error(`[spawn] ${folder.label} :: wt unusable (${r.reason}) — falling back to cmd.exe`);
  }
  r = await attempt(SYSTEM_CMD, cmdArgv(folder, tag), folder.label, t0, tag);
  if (!r.ok) throw new Error(r.reason);
  return { label: folder.label, tag, verified: r.verified, focus: r.focus };
}

// ── backup age (OPS25) ──────────────────────────────────────────────────────
// Both backup tiers failed SILENTLY: Tier 3 for eleven weeks, Tier 2 for a week.
// Nothing anywhere showed a stale backup, so nobody looked. This panel puts the
// age of each tier on the board Butch already reads.
//
// Deliberately credential-free:
//   Tier 3 — a filesystem stat of the local snapshot directory.
//   Tier 2 — the GitHub Actions run history via `gh`, which carries its own
//            auth. The board does NOT hold the service-role key and does NOT
//            list the storage bucket; the run's own upload step already fails
//            hard on a non-2xx, so a successful run means the object landed.
const BK = cfg.backups || {};
const DAY_MS = 86400000;

function ageState(days) {
  if (days == null) return 'unknown';
  if (days >= (Number(BK.alertDays) || 14)) return 'alert';
  if (days >= (Number(BK.warnDays) || 8)) return 'warn';
  return 'ok';
}

function tier3Status() {
  try {
    const dir = BK.tier3Dir;
    if (!dir || !existsSync(dir)) return { tier: 'Tier 3 — local', error: 'directory not found' };
    const prefix = BK.tier3Glob || 'themanual-snapshot-';
    let newest = null;
    for (const name of readdirSync(dir)) {
      if (!name.startsWith(prefix) || !name.endsWith('.sql.gz')) continue;
      const st = statSync(join(dir, name));
      if (!newest || st.mtimeMs > newest.mtimeMs) newest = { name, mtimeMs: st.mtimeMs, size: st.size };
    }
    if (!newest) return { tier: 'Tier 3 — local', error: 'no snapshots found' };
    const days = (Date.now() - newest.mtimeMs) / DAY_MS;
    return {
      tier: 'Tier 3 — local', label: newest.name, bytes: newest.size,
      ageDays: days, state: ageState(days),
    };
  } catch (e) {
    return { tier: 'Tier 3 — local', error: e.message };
  }
}

function tier2Status() {
  return new Promise((resolve) => {
    const gh = RESOLVED.gh;
    if (!gh) return resolve({ tier: 'Tier 2 — Actions', error: 'gh CLI not found' });
    execFile(
      gh,
      ['run', 'list', '--repo', BK.tier2Repo, '--workflow', BK.tier2Workflow,
       '--limit', '10', '--json', 'status,conclusion,createdAt,databaseId'],
      { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 512 },
      (err, stdout) => {
        if (err) return resolve({ tier: 'Tier 2 — Actions', error: 'gh run list failed' });
        let runs;
        try { runs = JSON.parse(stdout); } catch { return resolve({ tier: 'Tier 2 — Actions', error: 'unparseable gh output' }); }
        const ok = runs.find((r) => r.conclusion === 'success');
        const newest = runs[0];
        if (!ok) return resolve({ tier: 'Tier 2 — Actions', error: 'no successful run in last 10' });
        const days = (Date.now() - Date.parse(ok.createdAt)) / DAY_MS;
        return resolve({
          tier: 'Tier 2 — Actions',
          label: new Date(ok.createdAt).toISOString().slice(0, 10),
          ageDays: days,
          state: ageState(days),
          // A red LATEST run with a green older one is its own warning: the
          // backup is not yet stale, but it has started failing.
          lastRunFailed: newest && newest.conclusion !== 'success' && newest.databaseId !== ok.databaseId,
        });
      },
    );
  });
}

async function backupStatus() {
  const [t2, t3] = await Promise.all([tier2Status(), Promise.resolve(tier3Status())]);
  return [t2, t3];
}

// ── page ────────────────────────────────────────────────────────────────────
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<title>Mission Control — ops rail</title>
<style>
 :root{--bg:#0d0f13;--panel:#151922;--line:#232936;--dim:#7c879c;--fg:#e6edf7;
       --amber:#f0a92b;--red:#e4574a;--green:#4bbf73;--blue:#4a9de4;--honey:#f5c451}
 *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
   font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
 header{display:flex;align-items:baseline;gap:16px;padding:14px 20px;
   border-bottom:1px solid var(--line);background:var(--panel);position:sticky;top:0;z-index:2}
 h1{font-size:14px;margin:0;letter-spacing:.14em;text-transform:uppercase;color:var(--honey)}
 .meta{color:var(--dim);font-size:11px}
 main{display:grid;grid-template-columns:1fr 340px;gap:18px;padding:18px 20px;align-items:start}
 @media(max-width:1000px){main{grid-template-columns:1fr}}
 section{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}
 h2{margin:0;padding:9px 14px;font-size:11px;letter-spacing:.13em;text-transform:uppercase;
    color:var(--dim);border-bottom:1px solid var(--line)}
 table{width:100%;border-collapse:collapse} td,th{padding:7px 10px;text-align:left;
    border-bottom:1px solid var(--line);vertical-align:top}
 th{color:var(--dim);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
 tr:last-child td{border-bottom:none}
 .pass{color:var(--honey);font-weight:600;white-space:nowrap}
 .title{color:var(--fg)} .sub{color:var(--dim);font-size:11px}
 .pill{display:inline-block;padding:1px 7px;border-radius:99px;font-size:10px;
   letter-spacing:.06em;text-transform:uppercase;border:1px solid currentColor}
 .lane{color:var(--blue)} .queued{color:var(--dim)} .claimed{color:var(--green)}
 .warn{color:var(--amber)} .alert{color:var(--red)} .blocked{color:var(--red)}
 .eff-high,.eff-xhigh,.eff-max{color:var(--red)} .eff-standard,.eff-medium{color:var(--amber)}
 .eff-low{color:var(--dim)}
 button{width:100%;text-align:left;background:#1b2130;color:var(--fg);border:1px solid var(--line);
   border-radius:6px;padding:9px 11px;margin:0 0 7px;cursor:pointer;font:inherit}
 button:hover{border-color:var(--honey);color:var(--honey)}
 .wrap{padding:12px 14px}
 .err{color:var(--red);padding:12px 14px}
 .ok{color:var(--green)} .note{color:var(--dim);font-size:11px;padding:0 14px 12px}
</style></head><body>
<header>
  <h1>Mission Control</h1>
  <span class="meta" id="stamp">loading…</span>
  <span class="meta" id="flash"></span>
</header>
<main>
  <div>
    <section><h2>Rail — queued &amp; claimed</h2>
      <div class="note" style="padding:0 0 6px">pool order — a terminal sticky on a lane may pull differently</div>
      <div id="board" class="wrap">…</div></section>
    <section style="margin-top:18px"><h2>Recent reports</h2><div id="reports" class="wrap">…</div></section>
    <!-- OPS33: the whole HONEYCOMB build, phases and steps, at the bottom. -->
    <section style="margin-top:18px"><h2>Build progress — all HONEYCOMB</h2>
      <div id="build" class="wrap">…</div></section>
  </div>
  <div>
    <section><h2>Add Claude</h2><div class="wrap" id="spawn"></div>
      <div class="note">Opens a <b>new</b> Windows Terminal window in that folder with <code>claude</code>
      running. Say <code>go</code> in the new window to claim. This page never claims for you.
      The header says <span class="ok">opened</span> only when the server confirmed a terminal
      actually appeared, and it states where the window <b>ended up</b> — Windows can refuse to hand
      focus away from the browser you clicked in, and when it does you get a flashing taskbar button
      instead of a lie.</div>
    </section>
    <section style="margin-top:18px"><h2>Backups</h2><div id="backups" class="wrap">…</div>
      <div class="note">Age of the newest <b>verified</b> backup per tier. Tier 3 is a local file
      stat; Tier 2 is the last successful Actions run (its upload step fails hard on a bad response,
      so a green run means the object landed). Amber at 8 days, red at 14 — a weekly job that has
      missed one run, then two. Both tiers failed silently before this panel existed.</div>
    </section>
    <section style="margin-top:18px"><h2>Read-only</h2>
      <div class="note" style="padding:12px 14px">This board issues <b>SELECT only</b>.
      Claiming, reporting and closing stay in the terminals, where the one-<code>go</code>-one-claim
      rule can hold. Credentials come from <code>pgpass.conf</code>; none reach this page.</div>
    </section>
  </div>
</main>
<script>
const fmtAge = m => m == null ? '' : m < 60 ? Math.round(m)+'m'
  : m < 1440 ? (m/60).toFixed(1)+'h' : (m/1440).toFixed(1)+'d';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const effOf = t => (String(t).match(/EFFORT:\\s*([A-Za-z-]+)/) || [,''])[1].toLowerCase();
const cleanTitle = t => String(t).replace(/^\\s*\\S+\\s+—\\s*/, '').replace(/EFFORT:\\s*[A-Za-z-]+\\s*—\\s*/, '');

let WARN = 45, ALERT = 90;

// OPS43: never blank all three panels at once. A panel that cannot be drawn says
// so IN PLACE and keeps its last good content; the panels that can be drawn are
// drawn. A silent empty panel reads as "queue empty", which is the one lie this
// viewer must never tell.
function panelFail(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const stale = el.dataset.lastGood;
  el.innerHTML = '<div class="err">' + esc(msg) + '</div>'
    + (stale ? '<div class="note" style="padding:4px 0">showing the last good read ' +
               esc(el.dataset.lastGoodAt || '') + ' — NOT current</div>' + stale : '');
}
function panelOk(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  el.dataset.lastGood = html;
  el.dataset.lastGoodAt = new Date().toLocaleTimeString();
}

async function tick() {
  let j;
  try {
    const r = await fetch('/api/board');
    j = await r.json();
    if (j.error) throw new Error(j.error);
  } catch (e) {
    // Transport or total failure: every panel says so, none goes silently blank.
    const msg = 'rail read failed: ' + e.message;
    ['board', 'reports', 'build'].forEach((id) => panelFail(id, msg));
    document.getElementById('stamp').textContent = 'disconnected';
    return;
  }
  WARN = j.staleWarn; ALERT = j.staleAlert;
  const b = j.board || {};
  const failed = b.failed || [];
  const bad = (name) => failed.find((f) => f.section === name);

  // Each panel independently. One throwing renderer cannot stop the next two.
  const panels = [
    ['board',   'dispatches', () => renderDispatches(b)],
    ['reports', 'reports',    () => renderReports(b)],
    ['build',   'build_steps', () => renderBuildHtml(b)],
  ];
  for (const [id, section, fn] of panels) {
    const f = bad(section);
    if (f) { panelFail(id, section + ' unavailable: ' + f.error); continue; }
    try { panelOk(id, fn()); }
    catch (e) { panelFail(id, section + ' failed to render: ' + e.message); }
  }

  const warn = failed.length
    ? ' · DEGRADED (' + failed.filter((f) => f.section !== 'combined').length + ' section(s) failed)'
    : '';
  document.getElementById('stamp').textContent =
    'rail read ' + new Date().toLocaleTimeString() + ' · '
    + (b.dispatches ? b.dispatches.length : 0) + ' open' + warn;
}

function renderDispatches(b) {
  const d = b.dispatches || [];
  return d.length === 0
    ? '<div class="note" style="padding:4px 0">queue empty</div>'
    : '<table><tr><th>pass</th><th>lane</th><th>eff</th><th>status</th><th>age</th><th>title</th></tr>'
      + d.map(row => {
        const eff = effOf(row.title);
        let st = '<span class="pill ' + row.status + '">' + row.status + '</span>';
        if (row.status === 'claimed') {
          const cm = row.claimed_min;
          if (cm >= ALERT) st += ' <span class="alert">STALE ' + fmtAge(cm) + '</span>';
          else if (cm >= WARN) st += ' <span class="warn">held ' + fmtAge(cm) + '</span>';
          else st += ' <span class="sub">' + fmtAge(cm) + '</span>';
        }
        if (row.blocked) st += ' <span class="blocked">BLOCKED after ' + esc(row.after_pass) + '</span>';
        return '<tr><td class="pass">' + esc(row.pass) + '</td>'
          + '<td><span class="lane">' + esc(row.lane ?? '—') + '</span></td>'
          + '<td class="eff-' + eff + '">' + (eff || '—') + '</td>'
          + '<td>' + st + '</td>'
          + '<td class="sub">' + fmtAge(row.age_min) + '</td>'
          + '<td class="title">' + esc(cleanTitle(row.title))
          + '<div class="sub">' + esc(row.workdir ?? '') + (row.scope ? ' · ' + esc(row.scope) : '')
          + ' · p' + row.priority + '</div></td></tr>';
      }).join('') + '</table>';
}

function renderReports(b) {
  const rs = b.reports || [];
  if (rs.length === 0) return '<div class="note" style="padding:4px 0">no reports</div>';
  return '<table>' + rs.map(r =>
      '<tr><td class="pass">' + esc(r.pass) + '</td>'
      + '<td class="sub">' + esc(r.terminal ?? '') + '</td>'
      + '<td class="sub">' + fmtAge(r.age_min) + ' ago</td>'
      + '<td class="title">' + esc(cleanTitle(r.title)) + '</td></tr>').join('') + '</table>';
}

// ── OPS33 build panel ───────────────────────────────────────────────────────
// Phases collapsible, current step highlighted, checkmarks DERIVED from the
// rail. The estimate is a RANGE with its sample size attached — a single
// invented number would be worse than no number, and the deep bucket is barely
// calibrated, so a thin bucket says so out loud instead of pretending.
const MARK = { done: '✓', in_progress: '▶', blocked: '⏸', parked: '·', not_started: '☐' };

function estText(s) {
  if (s.derived_status === 'done') return '';
  if (s.est_p25 == null || s.est_p75 == null) return '<span class="sub">no estimate</span>';
  const n = s.est_sample_n ?? 0;
  const thin = n < 5 ? ' <span class="warn">thin</span>' : '';
  return '<span class="sub">' + Math.round(s.est_p25) + '–' + Math.round(s.est_p75)
       + ' min · n=' + n + thin + '</span>';
}

function renderBuildHtml(b) {
  const steps = b.build_steps || [], roll = b.build_rollup || [], tot = b.build_total;

  if (steps.length === 0) return '<div class="note" style="padding:4px 0">no build steps seeded yet</div>';

  let html = '';
  if (tot) {
    html += '<div class="note" style="padding:2px 0 8px">HONEYCOMB · '
      + tot.done + '/' + tot.steps + ' steps done (' + tot.pct_done + '%) across '
      + tot.astras + ' astras'
      + (tot.blocked ? ' · <span class="warn">' + tot.blocked + ' blocked</span>' : '')
      + ' · <span class="sub">' + tot.remaining_minutes_low + '–' + tot.remaining_minutes_high
      + ' min of terminal time left</span></div>';
  }

  for (const r of roll) {
    // An astra with zero steps never reaches here (the rollup groups on rows
    // that exist), so the empty case is the whole-panel guard above.
    html += '<details open><summary><b>' + esc(r.astra) + '</b> — '
      + r.done + '/' + r.steps + ' (' + r.pct_done + '%)'
      + (r.blocked ? ' · <span class="warn">' + r.blocked + ' blocked</span>' : '')
      + ' <span class="sub">' + (r.remaining_minutes_low ?? 0) + '–'
      + (r.remaining_minutes_high ?? 0) + ' min left</span></summary>';

    const mine = steps.filter(s => s.astra === r.astra);
    let lastPhase = null;
    html += '<table>';
    for (const s of mine) {
      if (s.phase_no !== lastPhase) {
        lastPhase = s.phase_no;
        html += '<tr><td colspan="4" class="sub" style="padding-top:8px">'
             + s.phase_no + ' · ' + esc(s.phase) + '</td></tr>';
      }
      const cur = s.derived_status === 'in_progress' || s.derived_status === 'blocked';
      html += '<tr' + (cur ? ' style="background:rgba(255,209,102,.10)"' : '') + '>'
        + '<td class="eff-' + (s.effort || '') + '">' + (MARK[s.derived_status] || '☐') + '</td>'
        + '<td class="pass">' + esc(s.dispatch_pass || '—') + '</td>'
        + '<td class="title">' + esc(s.title)
        + (s.notes ? '<div class="sub">' + esc(s.notes) + '</div>' : '')
        + '</td>'
        + '<td>' + estText(s)
        + (s.rail_derived ? '' : ' <span class="sub">manual</span>') + '</td></tr>';
    }
    html += '</table></details>';
  }
  return html;
}

// Backup age. Refreshed on a slower beat than the rail — it moves in days, and
// the Tier 2 read shells out to gh.
const AGE_CLASS = { ok: 'ok', warn: 'warn', alert: 'alert', unknown: 'sub' };
async function tickBackups() {
  const el = document.getElementById('backups');
  try {
    const j = await (await fetch('/api/backups')).json();
    el.innerHTML = '<table>' + j.tiers.map(t => {
      if (t.error) {
        return '<tr><td class="pass">' + esc(t.tier) + '</td>'
          + '<td class="alert" colspan="2">unreadable — ' + esc(t.error) + '</td></tr>';
      }
      const d = t.ageDays;
      const age = d < 1 ? 'today' : Math.floor(d) + 'd old';
      const cls = AGE_CLASS[t.state] || 'sub';
      return '<tr><td class="pass">' + esc(t.tier) + '</td>'
        + '<td class="' + cls + '">' + esc(age) + (t.state === 'alert' ? ' ⚠ STALE' : '') + '</td>'
        + '<td class="sub">' + esc(t.label || '')
        + (t.lastRunFailed ? '<div class="alert">latest run FAILED</div>' : '') + '</td></tr>';
    }).join('') + '</table>';
  } catch (e) {
    el.innerHTML = '<div class="err">backup check failed: ' + esc(e.message) + '</div>';
  }
}

async function boot() {
  const f = await (await fetch('/api/folders')).json();
  document.getElementById('spawn').innerHTML = f.folders
    .map((x, i) => '<button onclick="spawn(' + i + ')">+ ' + esc(x.label) + '</button>').join('');
  tick(); setInterval(tick, 10000);
  tickBackups(); setInterval(tickBackups, 300000);
}
// "opened" is only ever printed for a spawn the server actually CONFIRMED — a
// launcher exit code is not evidence a window exists. Failures stay on screen
// until the next click; only a confirmed open auto-clears.
async function spawn(i) {
  const el = document.getElementById('flash');
  el.textContent = 'spawning…'; el.className = 'meta';
  let j;
  try {
    const r = await fetch('/api/spawn', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ index: i }),
    });
    j = await r.json();
  } catch (e) {
    j = { ok: false, error: 'server unreachable: ' + e.message };
  }
  // OPS32: lead with the TAG, not the folder — the tag is what is written on the
  // window, so the message and the taskbar button say the same thing. With two
  // terminals open in the same folder the folder name alone identifies neither.
  const who = j.tag || j.label;
  if (j.ok && j.verified === true) {
    // OPS22: say where the window actually ended up. "in front" is a claim the
    // server measured with GetForegroundWindow, not an assumption.
    const f = j.focus || {};
    if (f.focused) {
      el.textContent = 'opened ' + who + ' — in front, ready for go';
      el.className = 'meta ok';
      setTimeout(() => { el.textContent = ''; }, 6000);
    } else if (f.raised) {
      el.textContent = 'opened ' + who
        + ' — raised in front but Windows kept keyboard focus here; click the window'
        + (f.flashed ? ' (its taskbar button is flashing)' : '');
      el.className = 'meta warn';
    } else {
      el.textContent = 'opened ' + who + ' — BEHIND this window'
        + (f.flashed ? ', taskbar button flashing' : '')
        + (f.reason ? ' (' + esc(f.reason) + ')' : '');
      el.className = 'meta warn';
    }
  } else if (j.ok) {
    el.textContent = 'launched ' + who + ' — UNVERIFIED, check for a window';
    el.className = 'meta warn';
  } else {
    el.textContent = 'spawn failed: ' + j.error;
    el.className = 'meta alert';
  }
}
boot();
</script></body></html>`;

// ── server ──────────────────────────────────────────────────────────────────
const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    if (req.method === 'GET' && req.url === '/api/folders') {
      return json(res, 200, { folders: cfg.folders.map((f) => ({ label: f.label })) });
    }
    if (req.method === 'GET' && req.url === '/api/backups') {
      return json(res, 200, { tiers: await backupStatus() });
    }
    if (req.method === 'GET' && req.url === '/api/board') {
      const board = await readBoard();
      return json(res, 200, {
        board,
        staleWarn: cfg.staleClaimWarnMinutes,
        staleAlert: cfg.staleClaimAlertMinutes,
      });
    }
    if (req.method === 'POST' && req.url === '/api/spawn') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 1024) req.destroy(); });
      req.on('end', async () => {
        try {
          const { index } = JSON.parse(raw || '{}');
          const { label, tag, verified, focus } = await spawnTerminal(Number(index));
          json(res, 200, { ok: true, label, tag, verified, focus });
        } catch (e) {
          console.error(`[spawn] FAILED :: ${e.message}`);
          json(res, 400, { ok: false, error: e.message });
        }
      });
      return;
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

// 127.0.0.1 only. This process can spawn terminals; it must never be reachable
// from the network.
// MC_PORT lets a second instance run beside a live board for testing. It only
// moves the listen port; it cannot reach the bind address, which stays 127.0.0.1.
const PORT = Number(process.env.MC_PORT) || cfg.port;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mission Control on http://127.0.0.1:${PORT}  (read-only rail, ${cfg.folders.length} spawn targets)`);
  console.log(`  terminal : ${RESOLVED.terminal.path}   [${RESOLVED.terminal.how}]`);
  console.log(`  command  : ${RESOLVED.command
    ?? `'${cfg.terminal.command}' not found on this PATH — passing it bare, the terminal's shell must resolve it`}`);
  console.log(`  focus    : ${cfg.focus && cfg.focus.enabled === false
    ? 'disabled in config — spawned windows will open behind the browser'
    : RESOLVED.powershell
      ? `${RESOLVED.powershell} + focus-window.ps1`
      : 'UNAVAILABLE — powershell not found; windows will open behind the browser'}`);
});
