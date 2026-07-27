# Experiments 1 + 2 — GO / NO-GO

**Pass:** DOCS5 · **Date:** 2026-07-27 · **Scope:** oracle
**Purpose:** the "verify before building" clause on Experiments-bucket items 1 and 2. OPS18+ will be written from these verdicts and **must not proceed past a NO-GO.**

All sources are first-party Anthropic documentation fetched **2026-07-27**. Anything not confirmed there is marked `UNKNOWN` with the blocker named. Zero claims from model memory.

---

## Verdicts at a glance

| # | Experiment | Verdict |
|---|---|---|
| 1 | **Headless heartbeat** — Windows scheduled task firing `go` at workspace root every N minutes | **GO WITH CONSTRAINTS** — the mechanics are fully documented and the park-don't-hang behaviour canon requires exists as a named mode. Three constraints are load-bearing; ignoring any one breaks canon. |
| 2 | **Cloud lanes** — a claude.ai/code session claiming and running rail work with no local machine | **NO-GO as specified.** A cloud session cannot execute the standard claim. Two independent blockers, one of which no configuration can remove. A narrower version is reachable but it is a **build**, not a setting — see §2.5. |

---

## 1. HEADLESS HEARTBEAT — **GO WITH CONSTRAINTS**

### 1.1 Invocation mechanics (all first-party, fetched 2026-07-27)

| Flag | Documented behaviour | Source |
|---|---|---|
| `-p`, `--print` | *"Print response without interactive mode."* Default is interactive. | [cli-reference](https://code.claude.com/docs/en/cli-reference) |
| `--permission-mode` | *"Begin in a specified permission mode. Accepts `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`, or `manual`."* Default `default`. | cli-reference |
| `--allowedTools` | *"Tools that execute without prompting for permission."* Permission-rule syntax, e.g. `Bash(git log *)`. | cli-reference |
| `--disallowedTools` | *"Deny rules. A bare tool name removes matching tools; scoped rules deny only matching calls."* | cli-reference |
| `--max-turns` | *"Limit the number of agentic turns (print mode only). Exits with an error when the limit is reached. No limit by default."* | cli-reference |
| `--output-format` | `text` (default), `json`, `stream-json`. With `json` the payload *"includes `total_cost_usd` and a per-model cost breakdown, so scripted callers can track spend per invocation."* | [headless](https://code.claude.com/docs/en/headless) |
| `--session-id` | *"Use a specific session ID for the conversation (must be a valid UUID)."* | cli-reference |
| `--continue` / `--resume` | Continue most recent conversation in the current directory / resume a specific session. Session-ID lookup is *"scoped to the current project directory and its git worktrees."* | cli-reference, headless |
| `--add-dir` | *"Add additional working directories."* | cli-reference |
| `--bare` | Skips *"auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md."* | headless |

### 1.2 The question that decides it — what happens at an interactive gate?

Canon requires that an unattended run hitting a gate **PARKS**, never hangs and never bulldozes. The documentation names a mode that does exactly this:

> **`dontAsk`**: *"Claude Code auto-denies every tool call that would otherwise prompt you. Claude runs only actions matching your `permissions.allow` rules, read-only Bash commands, and calls approved by a PreToolUse hook. Use this mode for CI pipelines or restricted environments where you pre-define exactly what Claude may do; **the session never waits for input.**"*
> — [permission-modes](https://code.claude.com/docs/en/permission-modes)

And specifically on the gates this workspace cares about:

> *"Claude Code denies calls matching your explicit `ask` rules rather than prompting. It also denies the built-in `AskUserQuestion` tool … **even if your allow rules match them.**"*

**Mapped onto our canon:**

| Gate | Behaviour under `dontAsk` | Canon requirement | Match? |
|---|---|---|---|
| `git push` (user-layer `ask` rule; push ask is canon and permanent) | denied, not prompted; session continues | must never push unwatched | **YES** |
| `git commit` / `git add` (`ask`) | denied; continues | only via cleared manifest dispatch | **YES** |
| An amendment confirm (would need `AskUserQuestion`) | denied outright | park and file a question | **YES** |
| Anything outside `permissions.allow` | auto-denied, run continues | park, log to `logs/permission-needed.md`, carry on | **YES** |

**This is the finding that makes experiment 1 a GO.** The parking behaviour is not something we have to build or emulate — it is a documented mode, and it denies rather than aborts, so the session keeps working and can file its question through the rail before exiting.

Contrast, for the record: `acceptEdits` **aborts** on an uncovered call — *"Other shell commands and network requests still need an `--allowedTools` entry or a `permissions.allow` rule, otherwise **the run aborts** when one is attempted"* (headless). Abort loses the pass. `dontAsk` does not.

### 1.3 The three load-bearing constraints

> #### ⚠ C1 — DO NOT use `--bare`. It would delete the protocol.
> `--bare` skips *"auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and **CLAUDE.md**"*. The entire Terminal Protocol — R1 through R8, the claim SQL, the lane rules, the GIT/DEPLOY/MIGRATION amendments — lives in `CLAUDE.md`. A `--bare` heartbeat would wake up with no idea what `go` means, no rail, no hard limits, and no report-of-record rule.
> The docs recommend `--bare` for scripted calls *"so they don't pick up whatever happens to be configured locally"* — and note it *"will become the default for `-p` in a future release"*. **That future default is a scheduled hazard for this workspace: the day it lands, an unflagged heartbeat silently loses its instructions.** Whoever builds OPS18 should pass the non-bare behaviour explicitly if a flag exists for it, and pin the Claude Code version. `UNKNOWN`: whether an explicit `--no-bare` opt-out exists — not documented on the pages fetched.

> #### ⚠ C2 — DO NOT use `bypassPermissions` / `--dangerously-skip-permissions`.
> It *"disables permission prompts and safety checks so tool calls execute immediately, including writes to protected paths"*. Under it the push ask stops being a wall. Canon says the push click is permanent; bypass mode is the one setting that would quietly repeal it. The docs themselves scope it to *"isolated environments like containers, VMs, or dev containers without internet access"* — which a heartbeat on Butch's workstation is not.
> (Narrow mercy, noted not relied on: explicit `ask` rules *"still force a prompt in this mode"* — so the user-layer push ask would still prompt, and in a headless run a prompt no one answers is a hang. Bypass mode buys nothing here and costs the guardrails.)

> #### ⚠ C3 — The allow-list must be pre-loaded, or every heartbeat is a no-op.
> Under `dontAsk` the session can only do what `permissions.allow` already covers, plus read-only Bash. Today the rail claim runs through `psql.exe` and the report transport runs through `node` + `psql`. If those exact invocations are not in `~/.claude/settings.json`, the very first heartbeat auto-denies its own claim and reports nothing. **The existing `logs/permission-needed.md` loop is the right instrument, and it must be run to convergence in supervised mode BEFORE the first unattended fire.** Canon already says this ("During a supervised pre-flight, list every command/tool the upcoming batch will need"); it is now a hard precondition rather than good practice.

### 1.4 Operational details a scheduled task must handle

- **Exit on SIGTERM is 143.** *"Claude Code aborts the in-progress turn, terminates the process tree of any running Bash command, runs `SessionEnd` hooks, and exits with code 143."* A Task Scheduler kill-on-timeout is therefore survivable and detectable — but it kills mid-pass, so the dispatch stays `claimed` and needs manual release (`R2b`'s abandon statement).
- **Background bash is reaped ~5 s after the result.** A dev server started inside a heartbeat *"is terminated about five seconds after Claude has returned its final result"*. Heartbeats must not own long-running processes.
- **Background subagents block the exit, capped at 10 minutes** by default (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`). Bounds the worst-case run length.
- **Cost is machine-readable per invocation** via `--output-format json` → `total_cost_usd`. A heartbeat can log its own spend without touching the usage dashboard — worth wiring from run one.
- **`--max-turns` exits with an error at the limit** — a real runaway guard, but note it is an *error* exit, so the wrapper must distinguish it from a crash.
- **Skills work in `-p`**: *"include `/skill-name` in the prompt string"*. Terminal-only commands like `/login` do not.

### 1.5 Verdict

**GO WITH CONSTRAINTS.** Everything the design needs is documented, and the park-don't-hang requirement is satisfied by `--permission-mode dontAsk` rather than by anything we have to invent. A heartbeat is buildable as:

```
claude -p "go" --permission-mode dontAsk --output-format json --max-turns <N>
```

…fired from Task Scheduler at the workspace root, **without `--bare`**, **never** with bypass, and **only after** the allow-list has been driven to convergence in supervised mode.

`UNKNOWN`, named rather than papered over: Windows Task Scheduler specifics (working directory, shell, whether `claude` resolves on PATH under a non-interactive service account) are not in Anthropic's docs and were not tested this pass. That is an OPS18 pre-flight item, not a research gap.

---

## 2. CLOUD LANES — **NO-GO as specified**

### 2.1 What the product is

> *"Claude Code on the web runs tasks on Anthropic-managed cloud infrastructure at claude.ai/code. Sessions persist even if you close your browser."*
> *"Claude Code on the web is in **research preview** for Pro, Max, and Team users, and for Enterprise users with premium seats or Chat + Claude Code seats."*
> — [claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)

Plan requirement: Pro / Max / Team / qualifying Enterprise. Repository: GitHub for clone-and-push; non-GitHub repos can be sent as a local bundle but *"the session can't push results back to the remote"*.

### 2.2 Blocker A — the network path to the rail

> *"Environments run behind an **HTTP/HTTPS network proxy** for security and abuse prevention purposes. **All outbound internet traffic passes through this proxy.**"*

Access levels: **None** (no egress), **Trusted** (default — allowlisted domains only), **Full** (any domain), **Custom** (own allowlist).

Our rail claim runs over `psql` to `aws-1-us-east-1.pooler.supabase.com:5432` — the **PostgreSQL wire protocol on a raw TCP socket**, not HTTP. An HTTP/HTTPS proxy carrying *all* outbound traffic does not forward arbitrary TCP, and the allowlist is expressed as **domains**, not host:port pairs.

**Assessment:** raw `psql` from a cloud session is **blocked**, and `Full` network access does not obviously fix it, because the constraint is the *protocol*, not the *destination*. Marked **`SEARCH-DERIVED`/inference** rather than `VERIFIED`: the docs state the proxy carries all outbound traffic and describe it as HTTP/HTTPS, but **do not explicitly say non-HTTP TCP is dropped.** That single sentence is the whole question, and it is not written down. **Anyone who wants a cloud lane should test exactly this before designing anything.**

### 2.3 Blocker B — the claim cannot be expressed over the surviving channel

Even granting a working HTTPS path (Supabase PostgREST at `https://<ref>.supabase.co/...` is ordinary HTTPS and *is* allowlistable via **Custom**), the claim itself does not survive the translation. R2's claim is:

```sql
UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) AND status='queued' RETURNING ...
```

`FOR UPDATE SKIP LOCKED` inside a correlated sub-select is **not expressible in PostgREST**. It is precisely the concurrency-safety machinery R2 exists to provide — the thing that makes "one `go` = at most one claim, provably" true. Losing it does not degrade the claim; it removes the guarantee.

The Supabase **MCP connector** is not a way around this either: MCP traffic *"is routed through Anthropic's servers"* so it needs no allowlist entry — but the connector available in this workspace is **read-only** (`list_tables`, `get_logs`, `get_advisors`, `get_edge_function` and similar; **no `execute_sql`, no `apply_migration`**). A read-only connector cannot perform an `UPDATE`. So it can *read* the board and never *claim* from it.

### 2.4 Blocker C — cloud sessions ignore the mode that makes unattended safe

> *"Cloud sessions on Claude Code on the web **ignore `defaultMode: "dontAsk"`**."*
> *"Claude Code on the web does not honor `defaultMode: "bypassPermissions"` or `"dontAsk"` from your settings files, so a repository's checked-in settings cannot start a cloud session in bypass-permissions mode. **The setting is ignored silently** and the session starts in the mode shown in the mode dropdown instead."*

The park-don't-hang property that made experiment 1 a GO **is unavailable in cloud sessions via settings**, and the docs say it fails *silently*. Whatever safety a cloud lane has must come from the mode dropdown, per session — which is a human action, which defeats "zero local machine, runs unattended."

### 2.5 What IS reachable — and why it is a build, not a config

A cloud lane becomes possible if, and only if, someone builds:

1. **A `SECURITY DEFINER` claim RPC** in Postgres wrapping R2's exact statement — `FOR UPDATE SKIP LOCKED` and all — callable as a single PostgREST `POST /rpc/...`. This preserves the concurrency guarantee **on the server**, where it belongs, instead of relying on the client to spell it correctly. A matching finish RPC would be needed for R3.
2. **A Custom network-access environment** allowlisting `<ref>.supabase.co`.
3. **Credentials inside the sandbox** — and this is the part that deserves a hard look before anyone gets excited. The service-role key is RED ZONE under this workspace's Secrets rule and lives only in Railway and the Supabase dashboard. Putting it into a cloud sandbox environment is a credential-placement decision for Butch, not a technical detail. An anon-key + Bee-JWT path would be safer but cannot claim, because the board is lead-authored and not Bee-readable.

Items 1 and 2 are ordinary work. Item 3 is a canon question. **None of it is "turn on a setting."**

Worth noting the adjacent product: **Routines** (`/docs/en/routines`) run cloud agents *"on a schedule, via API call, or in response to GitHub events"* and share the same environment and network-access model — so they inherit every blocker above. A routine is not a way around this; it is the same sandbox on a timer.

### 2.6 Verdict

**NO-GO as specified.** A cloud session cannot *"claim via the standard SQL"* — Blocker B is not a configuration problem and does not go away with a Full-access environment. Blocker C removes the unattended-safety property independently. Blocker A is probably fatal to `psql` specifically and is the one worth a five-minute empirical test.

**Downgraded restatement, for the lead to accept or reject:** *GO-WITH-CONSTRAINTS is available for a **docs/research-only cloud lane** that reads the rail through the read-only MCP connector, does its work in a GitHub repo, and **hands its report back through a human or a local session** rather than writing to `ops_reports` itself.* That is genuinely useful — DOCS4-shaped research needs no rail write until the finish — but it is **not** the autonomous lane the experiment proposed, and it should not be described as one.

---

## 3. Could not verify

| Item | Status | Blocker |
|---|---|---|
| Whether non-HTTP TCP (postgres :5432) survives the cloud security proxy | **`UNKNOWN` — inference only** | Docs say the proxy is HTTP/HTTPS and carries all outbound traffic, but never state that raw TCP is dropped. **The single highest-value empirical test in this document.** |
| Whether an explicit `--no-bare` opt-out exists ahead of `--bare` becoming the `-p` default | `UNKNOWN` | not on cli-reference or headless as fetched |
| Windows Task Scheduler mechanics (cwd, PATH, service-account shell) | `UNKNOWN` | outside Anthropic's docs; OPS18 pre-flight item |
| Whether cloud sessions can be started with `--permission-mode dontAsk` as a **flag** rather than a settings default | `UNKNOWN` | docs only rule out the *settings-file* route; the dropdown is described but the flag path for cloud is not |
| Exact Supabase MCP connector tool list under a *different* auth (i.e. whether a writable connector exists on another plan) | `UNKNOWN` | this session's connector is read-only; not generalizable |
| Rate-limit headroom for a heartbeat every N minutes | `UNKNOWN` | *"Claude Code on the web shares rate limits with all other Claude and Claude Code usage within your account"* — stated for cloud; no published figure for local headless |

## 4. Source index

All fetched **2026-07-27**, all first-party:

- <https://code.claude.com/docs/en/cli-reference>
- <https://code.claude.com/docs/en/headless>
- <https://code.claude.com/docs/en/permission-modes>
- <https://code.claude.com/docs/en/claude-code-on-the-web>

Note: `docs.claude.com/en/docs/claude-code/*` now **301-redirects** to `code.claude.com/docs/en/*`. Any canon or script still pointing at the old host should be updated.

## 5. Done-test

| Requirement | Result |
|---|---|
| Every capability claim carries a first-party citation-with-date or is marked UNKNOWN with the blocker named | **PASS** — four first-party sources, all 2026-07-27; six `UNKNOWN` rows in §3, each with its blocker. The one inference in the document (§2.2) is labelled as inference in place, not presented as fact. |
| Explicit GO / NO-GO / GO-WITH-CONSTRAINTS verdict per experiment | **PASS** — §1.5 GO WITH CONSTRAINTS (three named constraints); §2.6 NO-GO as specified, with a downgraded alternative stated separately so it cannot be mistaken for the original proposal. |
