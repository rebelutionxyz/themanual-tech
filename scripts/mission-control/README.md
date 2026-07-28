# Mission Control v1

Hands and eyes on the ops rail. **Two independent halves** — either works without the other.

| Half | What it needs | What it gives |
|---|---|---|
| **Board** (`server.mjs` + `focus-window.ps1`) | Node + psql + `pgpass.conf` | Live rail render **and** spawn buttons |
| **Palette** (`mission-control.ahk`) | AutoHotkey v2 only | Spawn buttons + global hotkeys |

The palette is the tier-1 fallback: no server, no database, no network, no credentials. If the
board is down, wedged, or you just don't want a process running, the palette still adds Claudes.

---

## Board

```
node scripts/mission-control/server.mjs
```

Then open <http://127.0.0.1:7317>. Auto-refreshes every 10s.

Shows queued + claimed dispatches with lane, EFFORT (parsed from the title), age, priority, workdir
and scope; flags stale claims and `after_pass`-blocked rows; lists recent report headlines.

**Three properties that are deliberate, not incidental:**

1. **Zero rail writes.** It issues `SELECT` only. Claiming stays in the terminals, because
   Terminal Protocol R2 guarantees one `go` = at most one claim, *provably* — a button that claimed
   work would quietly break that guarantee. This board is an instrument panel, not a second brain.
2. **No credentials anywhere.** Every query shells out to `psql -w`; the password comes from
   `%APPDATA%\postgresql\pgpass.conf` and is never read, held, or rendered. The config file holds
   only host/port/user/db, which are already public in `CLAUDE.md`.
3. **`127.0.0.1` only.** This process can spawn terminals. It must never be reachable from the
   network. Do not change the bind address.

**Spawn safety:** the browser sends an *index* into the configured folder list, never a path. The
server validates the index and calls `execFile` with an argv array — no shell. There is no string a
page can send that becomes a command. Extra fields in the request body are ignored.

**Spawn honesty (OPS20).** The header says `opened <folder>` **only** when the server watched a new
console-host process appear. Everything else is reported as a failure or as `UNVERIFIED`, and
failures stay on screen instead of auto-clearing.

That check exists because an exit code proves nothing here: `wt.exe` is a launcher stub that exits 0
in ~100 ms whatever happens downstream. v1 also passed a no-op callback to `execFile`, so when
`wt.exe` was not on the server's `PATH` the resulting `ENOENT` went nowhere and the page announced
`opened` over a spawn that never occurred. Both halves are fixed: the launcher's result is awaited
*and* a spawn must be observed.

`wt.exe` and `claude` are resolved to absolute paths **once, at startup**, and both are printed in
the startup banner — check there first if a button misbehaves. Resolution uses `where.exe`, not the
filesystem: `wt.exe` is an AppExecLink reparse point in `%LOCALAPPDATA%\Microsoft\WindowsApps`, and
Node's `stat` *and* `lstat` both return `ENOENT` on that tag, so `existsSync` reports it missing on a
machine where it runs fine. If `PATH` has no `wt.exe`, the server falls back to that WindowsApps
path, and under that to a plain `cmd.exe` console window — a thin `PATH` degrades instead of
producing a dead button.

`newWindowArgs` (`-w new nt`) pins each session to its own window. Note this was **not** the cause of
the v1 bug — measured, `-d` alone already opens a real window rather than a tab (10 → 11 top-level
windows). It is kept so a later `windowingBehavior` setting cannot quietly turn these into background
tabs.

**Window focus (OPS22).** A spawned terminal now comes to the **front** of the browser you clicked
in. It did not before, and that was never a spawn fault — it is Windows' foreground lock working as
documented: `SetForegroundWindow` refuses a process that did not receive the last input event. The
click landed in the browser, so the browser owned foreground; the server did not get that input and
neither did the terminal it launched, so the window opened behind with only a flashing taskbar
button.

After a confirmed spawn the server hands the window to `focus-window.ps1`, which walks a ladder and
reports **which rung won**, so the page states where the window actually ended up instead of
assuming:

| Rung | Technique | Outcome |
|---|---|---|
| `attach` | `AttachThreadInput` to the foreground thread, then `SetForegroundWindow` | in front **and** focused — the normal path |
| `raise` | topmost flip (`HWND_TOPMOST` → `HWND_NOTOPMOST`) | in front, focus may not follow |
| `restore` | minimize then restore | works where the others lose, but the window visibly flickers — last resort |
| `raise+flash` | `FlashWindowEx(FLASHW_ALL │ FLASHW_TIMERNOFG)` | could not take focus; taskbar button flashes until you click it |

Two things here cost real time to find and are worth not rediscovering:

- **The window is not owned by the process that just appeared.** Windows Terminal is a multi-window,
  single-process app: `wt -w new` creates a new *window* inside the `WindowsTerminal.exe` that is
  **already running**. Measured — a spawn produced three fresh pids (an `OpenConsole` pty host and
  the shell), none of which owned a window, while the window belonged to a `WindowsTerminal.exe`
  that predated the click by hours. So the window is identified by **diffing window handles** across
  the spawn, not by pid. That also survives the `cmd.exe`/`conhost` fallback and whatever ships next.
  The pid and the `MC <folder>` title are kept only as tie-break hints for when two windows appear in
  the same second — and the title genuinely does drift: Claude Code rewrites it to `✳ Claude Code`
  within a second or two of launch.
- **`AttachThreadInput` fails unless both threads have a message queue,** and a console PowerShell
  thread has none until something forces one. Without the `PeekMessage` primer in the helper, rung 1
  failed *every* time and the ladder fell through to the flickery minimize/restore. With it, rung 1
  wins.

The helper **synthesises no input** — no key or click injection, which is the line between activating
a window and a focus-stealing hack. It changes no system-wide setting (notably it does not touch
`SPI_SETFOREGROUNDLOCKTIMEOUT`, which if left at 0 by a crashed script would let *any* app on the
machine steal focus). It runs only in response to a deliberate button click and exits.

Set `focus.enabled: false` in the config to revert to the old behaviour; the startup banner then says
so out loud. Failure to focus is never promoted to a spawn failure — the terminal is open either way.

*The palette never had this problem: a hotkey means AutoHotkey received the last input event, so its
spawns get foreground legitimately without any of the above.*

`MC_PORT` overrides the listen port for a second instance beside a live board. It cannot move the
bind address, which is always `127.0.0.1`.

**After editing `server.mjs`, restart the board** — it is a long-lived process and holds the old code
until you do.

## Palette

```
"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" scripts\mission-control\mission-control.ahk
```

| Key | Action |
|---|---|
| `Ctrl+Alt+G` | show / hide the palette |
| `Ctrl+Alt+1`–`8` | spawn that folder directly, palette open or not |
| `Esc` | hide the palette (while focused) |

Falls back to a plain `cmd` window if Windows Terminal is missing.

## Config

`mission-control.config.json` — port, psql path, DB coordinates, stale thresholds, folder list, and
the `focus` block (`enabled`, `timeoutMs`, `flashFallback`).

The palette's folder list is **duplicated by hand** in the `.ahk` rather than parsed from the JSON.
That is on purpose: a fallback that needs a JSON parser to start is not a fallback. Keep the two in
sync manually; the JSON is the source of truth for the board.

### Stale-claim thresholds

`staleClaimWarnMinutes: 45` / `staleClaimAlertMinutes: 90`.

**These are chosen, not canon.** The Terminal Protocol defines no stale-claim threshold, so these
are a starting point for eyeballing a board, not a rule anyone is bound by. Tune them in the config;
nothing downstream depends on the values.

## Stopping it

The board is a plain Node process — `Ctrl+C` in its window, or kill the `node.exe` running
`server.mjs`. The palette exits from its tray icon.
