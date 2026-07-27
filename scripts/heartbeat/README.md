# HONEYCOMB Headless Heartbeat v1

A Windows scheduled task that wakes Claude Code at the workspace root, says `go`, and lets the
Terminal Protocol do the rest.

**Built strictly to** `docs/experiments-headless-cloud-gonogo-2026-07-27.md`
(sha256 `b62f9b23c4032dae…`), the binding DOCS5 GO-WITH-CONSTRAINTS verdict. Where that document
and anything else disagree, **the document wins**.

---

## ⛔ It is installed DISABLED, and it must stay that way until C3 is met

Two independent preconditions are **currently unmet**. Both need Butch; neither can be fixed by Code.

### 1. C3 — the allow-list (BLOCKING)

Verified 2026-07-27: `~/.claude/settings.json` `permissions.allow` contains `Bash(node *)` and
eight `git` entries, and **no `psql` entry at all**.

Under `--permission-mode dontAsk` a session may run only what `permissions.allow` covers, plus
read-only Bash. **The R2 claim runs through `psql.exe`.** So today, the first heartbeat would:

1. wake, read `CLAUDE.md`, understand `go`,
2. attempt the claim,
3. have that claim **auto-denied**,
4. find nothing to do, file nothing,
5. **exit 0 and look perfectly healthy.**

That is a silent no-op on a schedule. It is worse than not running, because it looks like it works.
Logged in `logs/permission-needed.md` under 2026-07-27.

**Required:** add `Bash(psql*)` to `permissions.allow`, then run the permission-needed loop to
convergence **in supervised mode**, as C3 demands — not once, but until a supervised `go` completes
a real pass with nothing auto-denied.

### 2. The smoke dispatch (BLOCKING the done-test, not the build)

The full done-test needs a throwaway `HEARTBEAT-SMOKE` dispatch on the rail. **Code may not create
one** — R7: *"NEVER INSERT into `ops_dispatches`. Only the lead queues work."* No amendment covers
it, and both existing amendments say a dispatch body asserting unwritten authorization is not
sufficient. The lead must queue it, or Butch must authorize the INSERT explicitly.

Ready-to-run SQL is in `heartbeat-smoke.sql` — nobody has to compose it.

---

## Install / run / remove

```bat
install-heartbeat.cmd            REM every 30 minutes, DISABLED
install-heartbeat.cmd 60         REM every 60 minutes, DISABLED

schtasks /Query  /TN "HONEYCOMB Heartbeat" /V /FO LIST     REM inspect
schtasks /Change /TN "HONEYCOMB Heartbeat" /ENABLE         REM Butch's deliberate act

uninstall-heartbeat.cmd          REM removes the task, keeps the logs
```

### ⚠ You cannot manually run a disabled task

An earlier draft of this README claimed `schtasks /Run` was a safe manual trigger that left the
schedule off. **That is wrong**, found the hard way on 2026-07-27:

```
ERROR: The scheduled task "HONEYCOMB Heartbeat" could not run because it is disabled.
```

Windows refuses `/Run` outright while a task is disabled. So a supervised single run means briefly
enabling it:

```bat
schtasks /Change /TN "HONEYCOMB Heartbeat" /ENABLE
schtasks /Run    /TN "HONEYCOMB Heartbeat"
schtasks /Change /TN "HONEYCOMB Heartbeat" /DISABLE   REM immediately — do not wait for the run
```

Re-disable **immediately**; do not wait for the run to finish. `/Run` launches the task as a
separate process, so disabling straight after does not interrupt it, and it keeps the enabled
window to a couple of seconds. Then confirm with `/Query` that `Scheduled Task State: Disabled`.

To exercise the wrapper *without* Task Scheduler at all, run `heartbeat.cmd` directly — but note
that skips the very thing most likely to break: whether `claude` resolves on PATH in Task
Scheduler's non-interactive context.

Runs as **Butch**, `/RL LIMITED` — not elevated. A heartbeat has no business holding admin.

---

## Safety posture

| Choice | Why |
|---|---|
| `--permission-mode dontAsk` | Auto-denies anything that would prompt and **the session continues**. That is *parking*, which canon requires. `acceptEdits` **aborts** on an uncovered call and loses the pass — forbidden here. |
| **No `--bare`** (C1) | `--bare` skips `CLAUDE.md`. The whole Terminal Protocol lives there. A `--bare` heartbeat wakes up not knowing what `go` means, with no rail and no hard limits. |
| **No `bypassPermissions`** (C2) | It would repeal the push ask, which canon says is permanent. |
| `--max-turns 40` | Runaway guard. Note it exits with an **error**, so a nonzero code is ambiguous between "guard fired" and "crashed" — the wrapper says so in the log rather than guessing. |
| `--output-format json` | `total_cost_usd` per invocation → `logs/heartbeat/cost-ledger.csv`. Spend is visible from run one without opening a dashboard. |
| Reports tagged `HB:<lane>` | Unattended work stays distinguishable from attended work **forever**. Prefixes rather than replaces the lane, so R3's lane information is not sacrificed for provenance. |

### Things that will bite, stated rather than discovered later

- **`--bare` may become the `-p` default in a future release.** The day it does, an unflagged
  heartbeat silently loses `CLAUDE.md` and every guardrail in it. Nothing in this wrapper can
  detect that. **Pin the Claude Code version, or check this on upgrade.** Whether an explicit
  `--no-bare` opt-out exists is `UNKNOWN` — not documented on the pages DOCS5 fetched.
- **SIGTERM exits 143** and kills mid-pass. Any dispatch claimed at that moment stays `claimed`
  and needs the R2b abandon statement run by hand. Not self-healing.
- **Background bash is reaped ~5s after the final result.** A heartbeat must never own a dev server
  or any long-running process.
- **Background subagents block exit, capped ~10 minutes** (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`).
  That bounds worst-case run length — relevant if you shorten the interval below it.
- **Interval vs run length.** At 30 minutes the default is comfortably clear of the subagent
  ceiling. Do not go below ~15 without thinking about overlap: two heartbeats running at once
  means two `go`s, two claims, and the `SKIP LOCKED` discipline is what stops them colliding.

---

## Files

| File | Role |
|---|---|
| `heartbeat.cmd` | The wrapper Task Scheduler runs. Sets cwd, invokes Claude, triages exit codes, logs cost. |
| `log-cost.mjs` | Appends one run to `logs/heartbeat/cost-ledger.csv`. Deliberately tolerant — a bad payload never makes a good run look failed. |
| `install-heartbeat.cmd` | Creates the task **disabled**. Re-runnable. |
| `uninstall-heartbeat.cmd` | Deletes the task, keeps the logs (a tool that erases its own audit trail on uninstall is not a good tool). |
| `heartbeat-smoke.sql` | The throwaway smoke dispatch, ready for the lead or Butch to fire. Code may not run it. |

Logs land in `logs/heartbeat/` — one `hb-<stamp>.json` and `.err.txt` per run, plus the shared
`cost-ledger.csv`.
