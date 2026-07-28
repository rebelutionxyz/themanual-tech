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
// RUN:  node scripts/mission-control/server.mjs
//       then open http://127.0.0.1:7317

import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
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
    SELECT json_agg(row_to_json(d) ORDER BY d.status, d.priority, d.created_at)
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
  ), '[]'::json)
) AS board;`;

function readBoard() {
  return new Promise((resolve, reject) => {
    execFile(
      cfg.psql,
      ['-h', cfg.db.host, '-p', cfg.db.port, '-U', cfg.db.user, '-d', cfg.db.name,
       '-w', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', BOARD_SQL],
      { maxBuffer: 1024 * 1024 * 8, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).trim()));
        try { resolve(JSON.parse(stdout.trim())); }
        catch { reject(new Error('rail returned unparseable JSON')); }
      },
    );
  });
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

const RESOLVED = {
  terminal: resolveTerminal(),
  // Bare 'claude' is a usable last resort: cmd.exe resolves it from the child's
  // own PATH. Recorded as unresolved so startup says so out loud.
  command: resolveExe(cfg.terminal.command),
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

async function waitForNewHost(before, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    await sleep(250);
    const now = consoleHostPids();
    if (!now) return null;
    for (const pid of now) if (!before.has(pid)) return true;
  }
  return false;
}

// Run the launcher and actually LISTEN to it. Never resolves to success on a
// non-zero exit or a spawn error the way the old no-op callback did.
function runLauncher(exe, args) {
  return new Promise((resolve) => {
    const child = execFile(exe, args, { windowsHide: false }, (err, stdout, stderr) => {
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

function wtArgv(folder) {
  return [
    ...(cfg.terminal.newWindowArgs || []),   // `-w new nt` — a dedicated window, whatever the WT settings say
    '--title', `MC ${folder.label}`,
    '-d', folder.path,
    ...(cfg.terminal.shellArgs || []),
    COMMAND(),
  ];
}

// Windows-Terminal-free fallback: `start` gives the console its own window, /D
// sets the working directory, and /k holds it open so an error stays readable.
function cmdArgv(folder) {
  return ['/c', 'start', `MC ${folder.label}`, '/D', folder.path, 'cmd', '/k', COMMAND()];
}

async function attempt(exe, args, label, t0) {
  const before = consoleHostPids();
  console.log(`[spawn] ${label} :: ${exe} ${args.join(' ')}`);
  const r = await runLauncher(exe, args);
  if (r.error) return { ok: false, reason: r.error, hard: true };
  if (r.code !== 0) {
    return { ok: false, reason: `${basename(exe)} exited ${r.code}${r.stderr ? ` — ${r.stderr}` : ''}` };
  }
  const verified = before ? await waitForNewHost(before, Number(cfg.spawnVerifyMs) || 3000) : null;
  console.log(
    `[spawn] ${label} :: launcher exit 0 in ${Date.now() - t0}ms, terminal ` +
    (verified === true ? 'CONFIRMED' : verified === false ? 'NOT CONFIRMED' : 'unverified (tasklist unavailable)') +
    (r.stderr ? ` :: stderr ${r.stderr}` : ''),
  );
  if (verified === false) {
    return { ok: false, reason: `${basename(exe)} exited 0 but no terminal appeared` };
  }
  return { ok: true, verified };
}

async function spawnTerminal(index) {
  const folder = cfg.folders[index];
  if (!folder) throw new Error('unknown folder index');           // validated, not trusted
  if (!existsSync(folder.path)) throw new Error(`folder missing on disk: ${folder.path}`);

  const t0 = Date.now();
  let r;
  if (RESOLVED.terminal.kind === 'wt') {
    r = await attempt(RESOLVED.terminal.path, wtArgv(folder), folder.label, t0);
    if (r.ok) return { label: folder.label, verified: r.verified };
    // wt.exe genuinely absent — drop to a plain console rather than leave the
    // button dead. Anything else (non-zero exit, nothing opened) is a real
    // failure and is reported as one.
    if (!r.hard) throw new Error(r.reason);
    console.error(`[spawn] ${folder.label} :: wt unusable (${r.reason}) — falling back to cmd.exe`);
  }
  r = await attempt(SYSTEM_CMD, cmdArgv(folder), folder.label, t0);
  if (!r.ok) throw new Error(r.reason);
  return { label: folder.label, verified: r.verified };
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
    <section><h2>Rail — queued &amp; claimed</h2><div id="board" class="wrap">…</div></section>
    <section style="margin-top:18px"><h2>Recent reports</h2><div id="reports" class="wrap">…</div></section>
  </div>
  <div>
    <section><h2>Add Claude</h2><div class="wrap" id="spawn"></div>
      <div class="note">Opens a <b>new</b> Windows Terminal window in that folder with <code>claude</code>
      running. Say <code>go</code> in the new window to claim. This page never claims for you.
      The header says <span class="ok">opened</span> only when the server confirmed a terminal
      actually appeared.</div>
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

async function tick() {
  try {
    const r = await fetch('/api/board');
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    WARN = j.staleWarn; ALERT = j.staleAlert;
    render(j.board);
    document.getElementById('stamp').textContent =
      'rail read ' + new Date().toLocaleTimeString() + ' · ' + j.board.dispatches.length + ' open';
  } catch (e) {
    document.getElementById('board').innerHTML = '<div class="err">rail read failed: ' + esc(e.message) + '</div>';
    document.getElementById('stamp').textContent = 'disconnected';
  }
}

function render(b) {
  const d = b.dispatches;
  document.getElementById('board').innerHTML = d.length === 0
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

  document.getElementById('reports').innerHTML =
    '<table>' + b.reports.map(r =>
      '<tr><td class="pass">' + esc(r.pass) + '</td>'
      + '<td class="sub">' + esc(r.terminal ?? '') + '</td>'
      + '<td class="sub">' + fmtAge(r.age_min) + ' ago</td>'
      + '<td class="title">' + esc(cleanTitle(r.title)) + '</td></tr>').join('') + '</table>';
}

async function boot() {
  const f = await (await fetch('/api/folders')).json();
  document.getElementById('spawn').innerHTML = f.folders
    .map((x, i) => '<button onclick="spawn(' + i + ')">+ ' + esc(x.label) + '</button>').join('');
  tick(); setInterval(tick, 10000);
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
  if (j.ok && j.verified === true) {
    el.textContent = 'opened ' + j.label;
    el.className = 'meta ok';
    setTimeout(() => { el.textContent = ''; }, 6000);
  } else if (j.ok) {
    el.textContent = 'launched ' + j.label + ' — UNVERIFIED, check for a window';
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
          const { label, verified } = await spawnTerminal(Number(index));
          json(res, 200, { ok: true, label, verified });
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
});
