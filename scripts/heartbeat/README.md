# HONEYCOMB Headless Heartbeat v1

A Windows scheduled task that wakes Claude Code at the workspace root, says `go`, and lets the
Terminal Protocol do the rest.

**Built strictly to** `docs/experiments-headless-cloud-gonogo-2026-07-27.md`
(sha256 `b62f9b23c4032dae…`), the binding DOCS5 GO-WITH-CONSTRAINTS verdict. Where that document
and anything else disagree, **the document wins**.

---

## ⛔ It is installed DISABLED, and it must stay that way until C3 is met

Two independent preconditions are **currently unmet**. Both need Butch; neither can be fixed by Code.

### 1. C3 — the allow-list (BLOCKING) — *superseded twice, read to the end*

Under `--permission-mode dontAsk` a session may run only what `permissions.allow` covers, plus
read-only Bash. **The R2 claim runs through `psql.exe`.** A heartbeat that cannot claim wakes, finds
nothing to do, files nothing, and **exits 0 looking perfectly healthy** — a silent no-op on a
schedule, worse than not running.

**First state (OPS18):** no `psql` entry existed at all. Butch added `Bash(psql*)`.

**Second state (HEARTBEAT-SMOKE, 2026-07-27):** that was not enough, and the reason generalises.
**Allow-list matching is a prefix on the command string.** The canonical transport is invoked as
`"/c/Program Files/PostgreSQL/17/bin/psql.exe" …`, which begins with a quote — it does not match
`Bash(psql*)` and is auto-denied. Bare `psql` matches the rule but is not on PATH (**exit 127**).
So psql was *allowed by name and unreachable by path*, and every heartbeat would still have died at
the claim.

**Third state (OPS19) — the fix, pending one line from Butch.** `claim.cmd` + `claim.sql` in this
folder are a wrapper that performs exactly the R2 claim and nothing else. Allow it by name:

```json
"Bash(TheMANUAL.tech/scripts/heartbeat/claim.cmd*)"
```

and — recommended in the same edit — **delete `"Bash(psql*)"`**, which authorizes only a command
form that exits 127 here, and so grants nothing that works while widening `dontAsk` to any statement
psql can carry. R3 FINISH and R4 QUESTION stay reachable through the Node shim under `Bash(node *)`.

The path is root-relative on purpose: the R2 claim always runs **before** the R2b `cd`, and
`heartbeat.cmd` sets the cwd to `HONEYCOMB\`, so that is the exact string a heartbeat types.

**Still required after the edit:** one supervised run in which the claim goes through the wrapper
with nothing auto-denied. Allowed-in-settings and allowed-in-fact are different claims, and only an
unattended run can distinguish them. See `../../REPORT.md` § OPS19.

#### `claim.cmd` usage

```bat
claim.cmd                     REM bare `go` - no lane filter, no sticky lanes
claim.cmd ops                 REM `go ops` - hard lane filter
claim.cmd "" ops,docs         REM bare `go`, sticky-first on ops then docs
claim.cmd ops ops,docs        REM both
```

Arg 1 is `:lane`, arg 2 is `:lanes` (the R2 sticky-first array, comma-separated). Both are
interpolated by psql's `:'name'` literal quoting, so neither can inject SQL. Arg 1 is additionally
rejected unless it is one of `front`/`db`/`docs`/`ops` — a typo'd lane would otherwise return
`UPDATE 0`, which R2 reads as "queue empty", and a wrong stop that looks like a right one is the
failure mode this whole file exists to prevent. Exit 0 with `UPDATE 0` means the queue is empty;
nonzero means the transport failed and **nothing was claimed**.

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
| `claim.cmd` | **(OPS19)** The R2 claim transport, and nothing else — see below. |
| `claim.sql` | **(OPS19)** The one statement `claim.cmd` can run. Checked in so the grant is auditable. |

Logs land in `logs/heartbeat/` — one `hb-<stamp>.json` and `.err.txt` per run, plus the shared
`cost-ledger.csv`.
