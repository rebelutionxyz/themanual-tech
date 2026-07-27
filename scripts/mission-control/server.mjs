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
// RUN:  node scripts/mission-control/server.mjs
//       then open http://127.0.0.1:7317

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
function spawnTerminal(index) {
  const folder = cfg.folders[index];
  if (!folder) throw new Error('unknown folder index');           // validated, not trusted
  if (!existsSync(folder.path)) throw new Error(`folder missing on disk: ${folder.path}`);
  const args = ['-d', folder.path, ...cfg.terminal.shellArgs];
  const child = execFile(cfg.terminal.exe, args, { windowsHide: false }, () => {});
  child.unref();
  return folder.label;
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
      <div class="note">Opens Windows Terminal in that folder with <code>claude</code> running.
      Say <code>go</code> in the new window to claim. This page never claims for you.</div>
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
async function spawn(i) {
  const el = document.getElementById('flash');
  el.textContent = 'spawning…'; el.className = 'meta';
  const r = await fetch('/api/spawn', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ index: i }),
  });
  const j = await r.json();
  el.textContent = j.ok ? ('opened ' + j.label) : ('spawn failed: ' + j.error);
  el.className = 'meta ' + (j.ok ? 'ok' : 'err');
  setTimeout(() => { el.textContent = ''; }, 6000);
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
      req.on('end', () => {
        try {
          const { index } = JSON.parse(raw || '{}');
          const label = spawnTerminal(Number(index));
          json(res, 200, { ok: true, label });
        } catch (e) { json(res, 400, { ok: false, error: e.message }); }
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
server.listen(cfg.port, '127.0.0.1', () => {
  console.log(`Mission Control on http://127.0.0.1:${cfg.port}  (read-only rail, ${cfg.folders.length} spawn targets)`);
});
