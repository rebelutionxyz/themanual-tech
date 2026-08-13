# REPORT — TheMANUAL.tech

Report of record for dispatched passes with `workdir=TheMANUAL.tech`. Updated in place every pass.
Newest pass first.

**Archive chain.** This file rotates when it exceeds 512 KB at sweep time (root `CLAUDE.md` R6).
Rotated files are write-once and live under `docs/reports/`, which is exempt from the sweep's 1 MB
gate by name. Read them newest-first when you need history older than this file:

| # | file | covers | bytes at rotation |
|---|---|---|---|
| 002 | `docs/reports/REPORT-archive-002.md` | **OPS74** (2026-08-03) through **DB43** (2026-08-08). Top section: `DB42`. See the ordering note below. | 676,177 |
| 001 | `docs/reports/REPORT-archive-001.md` | DOCS17-era passes through **OPS74-Q** (top section: `OPS74-Q`; oldest: the DOCS17 / A.1 appendix material) | 1,782,627 |

This file starts at **SWEEP1** (2026-08-08), the pass that performed rotation 002.

**Ordering note, recorded honestly.** Archive 002 is *mostly* newest-first but not strictly. The last
three passes written into it — `FRONT32`, `FRONT34`, `DB43`, all 2026-08-08 — were **appended at the
end of the file rather than inserted at the top**, against the "Newest pass first" convention stated
above. That was this session's error, caught during rotation 002 and recorded rather than quietly
tidied, since the archive is write-once. When searching archive 002, search by pass id and do not
trust position. Passes from this file forward go at the top, under the header.

---

## SWEEP1 - ORGANISE AND COMMIT THE TREE (2026-08-08)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row. Effort: light. ASCII only.

**Outcome in one line:** board was quiet, all gates passed, **32 manifest paths committed in 11
commits**, tree now clean, build green, origin was unmoved at push time.

### 1. THE GATE - PASSED

```sql
select pass, status from public.ops_dispatches where status='claimed' and pass <> 'SWEEP1';
-- 0 rows
```

Zero other passes claimed. Two prior claimants filed `SWEEP1-Q` on this gate (four passes claimed at
21:05, then one at 00:06) and re-queued rather than weakening it. Both were right, and their
attribution work is reused below rather than re-derived.

### 2. HARD GATES - ALL PASSED

| gate | result |
|---|---|
| forbidden paths (`backups/`, env files, `settings.local.json`, `node_modules/`, `.next/`, `verify-out/`, `*.dump`) | **NONE** |
| any file > 1 MB outside `docs/reports/` | **NONE** (`REPORT.md` was 676,177 B = 660 KB) |
| deletions (`D`) | **none survive** - see below |
| renames (`R`) with either end outside `supabase/migrations/` | **NONE** |

**The two apparent deletions were renames, and git said so, not me.** The manifest showed
`D supabase/migrations/20260804120000_db29_consumption_select_own.sql` and its `_drafts` rollback as
bare deletions, because their replacements were untracked. The gate escalates deletions *without
exception* but sanctions renames wholly inside `supabase/migrations/`, so the distinction had to be
settled on evidence. Both pairs were confirmed byte-identical, then staged together, at which point
`git diff --cached -M --name-status` reported:

```
R100  supabase/migrations/20260804120000_db29_consumption_select_own.sql
   -> supabase/migrations/20260809010241_db29_consumption_select_own.sql
R100  supabase/migrations/_drafts/20260804120000_db29_consumption_select_own_rollback.sql
   -> supabase/migrations/_drafts/20260809010241_db29_consumption_select_own_rollback.sql
```

100% similarity, both ends inside `supabase/migrations/`. That is DB22 class A1a - the repo filename
moved to the version `apply_migration` actually stamped. Gate satisfied on git's own classification.

**The deletion the addendum pre-authorised was NOT in this manifest.**
`supabase/migrations/20260804090000_justice_public_views_revoke_anon_writes.sql`, moved to `_drafts/`
by DB34, was already committed by the previous sweep (`35c8684`). The escalation is answered on the
record: nothing was pending, and no ruling was needed.

### 3. BUILD - GREEN, BEFORE ANYTHING WAS STAGED

`npm run build` -> `built in 12.36s`, exit 0, no TypeScript errors. Run before the first `git add`.

### 4. THE COMMITS

Eleven, staged **by explicit path** every time - never `git add -A`, never `git add .` - with
`git diff --cached --name-only` checked against the intended set before each commit.

| # | sha | pass | files |
|---|---|---|---|
| 1 | `4ff2456` | rotation | `REPORT.md`, `docs/reports/REPORT-archive-002.md` |
| 2 | `1f05b7f` | FRONT31 | `useIsAdmin.ts` (new), `PlatformLayout.tsx`, `ConstellationPage.tsx`, `HQControlRoom.tsx` |
| 3 | `fe5937b` | FRONT30 + FRONT33 | `urlCheck.ts` (new), `folderScan.ts`, `SecurityPage.tsx` |
| 4 | `2f9c464` | DB39 | `functions/auth-login/index.ts` (new), `20260808221735` + rollback |
| 5 | `e8a21d5` | DB40 | `20260808231555`, `20260808232043` + both rollbacks |
| 6 | `2aa68b2` | DB41 | `20260809002940`, `20260809003654` + both rollbacks |
| 7 | `98b809f` | DB42 | `reconcile.mjs`, `20260808170527` + rollback, the two R100 renames |
| 8 | `6118658` | FRONT32 | `auth.tsx`, `LoginPage.tsx`, `HandleSettingsPage.tsx` |
| 9 | `6203864` | FRONT34 | `MissionControlPage.tsx` |
| 10 | `b4e5c9a` | DB43 | `20260809014029` + rollback |
| 11 | (this section) | SWEEP1 | `REPORT.md` |

**TWO FILES CARRY TWO PASSES EACH, named in their commit messages as the dispatch requires:**

- `src/pages/SecurityPage.tsx` - FRONT30 (URL check surface) and FRONT33 (two-stage permission).
  Not separable; committed once in `fe5937b` naming both.
- `src/pages/MissionControlPage.tsx` - FRONT34 (~143 lines) and FRONT31 (two Gate copy strings).
  Committed in `6203864` with FRONT34, which dominates it; `1f05b7f` says where the rest of FRONT31 is.

### 5. ATTRIBUTION - nothing guessed, nothing left behind

Every one of the 32 paths was attributed before staging. Sources: the `ops_reports` rail matched by
filename, the two `SWEEP1-Q` reports, and for `reconcile.mjs` the change is self-labelled
`(DB42, 2026-08-09)` in its own diff. **Zero unattributable paths, so nothing was left uncommitted.**
The working tree is now empty: `git status --porcelain -uall` returns nothing.

### 6. THE ROTATION (commit 1, deliberately its own)

`REPORT.md` hit 676,177 bytes, past R6's 512 KB gate. Rotated to
`docs/reports/REPORT-archive-002.md` following the convention set by rotation 001 - archive is
write-once and byte-identical to the outgoing file (verified by buffer compare), fresh `REPORT.md`
carries the header plus an archive-chain table naming both 001 and 002. A 660 KB move was kept out of
every code commit.

Checked before rotating: **nothing references `REPORT.md` as a resolvable path.** Every hit across the
repo is prose inside comments and docs, so no tooling breaks.

**Recorded in the new header rather than quietly fixed:** the last three sections of archive 002
(`FRONT32`, `FRONT34`, `DB43`) were appended at the *end* of the file, against its stated "Newest pass
first" convention. That was this session's error. The archive is write-once, so it is declared, and
searching archive 002 should be by pass id rather than position.

### 7. PUSH

Origin checked immediately before pushing: `git fetch`, then `main..origin/main = 0` and
`origin/main..main = 10`. **Origin had not moved** - a clean fast-forward, no reconciliation needed
(and none would have been attempted; `pull`/`rebase`/`merge`/`reset`/`checkout`/`restore` are all
denied here by design).

### 8. DEPLOY

Railway auto-deploys `main` on push. **The deploy outcome is not in this file** - it is recorded in the
`ops_reports` rail entry for SWEEP1, which is filed after the deploy is observed. This section is
committed before the push by necessity, since the dispatch requires exactly one push.

### 9. NOT DONE

- **No pass's work was modified.** The sweep committed what other passes left; it fixed nothing and
  tidied nothing in their code, per the dispatch.
- **No lint run.** The dispatch requires `npm run build`, which passed. The repo carries 23
  pre-existing lint errors (measured in FRONT32) that this sweep did not touch.

## DB45 - elections_v1c saved under its stamped version (repo files only, no DDL)

Stamp `20260809171412` (the version `apply_migration` wrote, not a provisional name) -
`supabase/migrations/20260809171412_elections_v1c_public_positions.sql` (3,522 bytes) and
`supabase/migrations/_drafts/20260809171412_elections_v1c_public_positions_rollback.sql`
(471 bytes); reconcile MEASURE EXIT=0, the pair version-matched and faithful.

## FRONT37 - /vote proxy mounted between static and the SPA catch-all

`tsc --noEmit` clean, `npm run build` exit 0. Committed; NOT pushed.

Dependency added: **http-proxy-middleware 3.0.7** (v3 required - v2 targets Express 4 and
this server runs Express 5.2.1).

### Mount order - the thing this pass exists to get right

    app.use(express.static(DIST_DIR, ...))    // assets
    app.use(createProxyMiddleware({ ... }))   // <- /vote, HERE
    app.get(/.*/, ...)                        // SPA shell catch-all

Mounted after the catch-all instead, every `/vote` request returns the manual's SPA shell
with a 200 and the proxy silently never runs - a failure that reads as a bug in VOTE rather
than a mount-order bug here.

`pathFilter` is used rather than `app.use('/vote', ...)` because Express strips a mount path
from `req.url`, and VOTE is built with `NEXT_PUBLIC_BASE_PATH=/vote` - it expects to own that
prefix and emits its assets under `/vote/_next/`. The filter is an exact-or-descendant test,
`p === '/vote' || p.startsWith('/vote/')`, so a sibling path like `/voters` is NOT captured.

Target comes from `VOTE_INTERNAL_URL` - a SERVER-side variable, not `VITE_`/`NEXT_PUBLIC_`,
so it is never bundled to the browser. Set it in the Railway dashboard to the private
hostname; OPS88 recorded it as `http://vote.railway.internal:8080`.

### Verified locally against a stand-in target

The real target is private by design and unreachable from any laptop, so production smoke
waits for OPS89 + the owner pushes (FRONT37-B). What COULD be proven here was proven, using
a stub server that echoes the path it receives:

    200  /vote                      -> proxy, saw /vote
    200  /vote/                     -> proxy, saw /vote/
    200  /vote/ledger               -> proxy, saw /vote/ledger
    200  /vote/_next/static/x.css   -> proxy, saw /vote/_next/static/x.css
    200  /voters                    -> manual SPA shell   (sibling NOT captured)
    200  /                          -> manual SPA shell
    200  /atoms/justice             -> manual SPA shell

The prefix is preserved end to end, the browser's Host is passed through unchanged, and
`X-Forwarded-For` is set.

### Both failure modes exercised, because /vote must never take the manual down

    VOTE_INTERNAL_URL unset   -> warns, does not mount, /vote falls through to the SPA
                                 shell exactly as before. Manual serves normally.
    target dead (ECONNREFUSED) -> 502 "The vote service is unavailable." on /vote ONLY.
                                 / and /atoms/justice still 200. No crash.

### Not done

No push - the owner pushes, and per the sequence of truth that push happens only AFTER
OPS89 reports the VOTE service serving under the new `/vote` base. Pushing this first would
point the proxy at a service that still roots at `/`, and every asset would 404.
