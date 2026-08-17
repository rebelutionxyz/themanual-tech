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

## FRONT51 - MANUAL PROXY: MOUNT /fund BEHIND FUND_INTERNAL_URL, DORMANT (2026-08-17)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row; the body predeclares the
manifest as the Express serving layer plus the env-setter record, and `REPORT.md` is always in
scope (R6). Session `7519c43c` (fallback id - no `MC_SESSION` set in this window). Started on a
clean tree at `5be630f`, `origin/main..HEAD` = 0.

**Result: all done-tests green, committed, NOT pushed.** Manifest held exactly - two files
(`server/index.ts`, `REPORT.md`), no `src/` edit, no third path.

### 1. The law, and where /fund had to land

ASTRA_STANDARD v1.0 item 7, read from the rail before the file was touched:

> MOUNT ORDER LAW. The manual serves static -> /vote -> /justice -> /fund ->
> catch-all. New astras append before the catch-all, never before an existing
> astra.

Verified shape as found, not assumed - `express.static` (line 50) -> `/vote` proxy (86) ->
`/justice` proxy (139) -> SPA catch-all `app.get(/.*/)` (was 170). The `/fund` block is inserted
**between the `/justice` block and the catch-all**, which satisfies both halves of item 7 at once:
before the catch-all, after every existing astra.

After the edit, `grep -n` on the same anchors:

```
50:  express.static(DIST_DIR, {
86:      pathFilter: (pathname: string) => pathname === '/vote' || pathname.startsWith('/vote/'),
139:      pathFilter: (pathname: string) =>                       <- /justice
196:      pathFilter: (pathname: string) => pathname === '/fund' || pathname.startsWith('/fund/'),
227:app.get(/.*/, (req: Request, res: Response) => {              <- catch-all, still last
```

`git diff --stat` = `server/index.ts | 57 +++++` - **57 insertions, 0 deletions.** A pure insertion
at one point. Zero deletions is the machine-checkable form of "nothing that exists was reordered":
the `/vote` and `/justice` blocks do not appear in the diff at all, and the catch-all is unchanged
and still last.

### 2. It ships DORMANT, and dormant is a state that had to be measured

The dispatch's requirement - *absent env means the mount is inert, not broken* - is not a comment,
it is a behaviour, so it was measured on both sides rather than asserted from the `/vote` and
`/justice` precedent.

Two boots of `server/index.ts` under `tsx`, against an unroutable stand-in target `http://127.0.0.1:9`
passed in the **environment only** and never written into the repo. A connection failure to that
target is SUCCESS - it proves the request reached the proxy instead of the catch-all.

**Boot A - `FUND_INTERNAL_URL` set (the woken state):**

```
[server] VOTE_INTERNAL_URL unset - /vote is NOT proxied.
[server] JUSTICE_INTERNAL_URL unset - /justice is NOT proxied.
[server] /fund proxying to http://127.0.0.1:9
[server] TheMANUAL.tech HTML-transform server listening on 0.0.0.0:3877
[server] /fund proxy error: connect ECONNREFUSED 127.0.0.1:9   (x3)

200  /                          bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
502  /fund                      bytes=32    text/plain "The fund service is unavailable."
502  /fund/                     bytes=32    text/plain "The fund service is unavailable."
502  /fund/_next/static/x.js    bytes=32    text/plain "The fund service is unavailable."
200  /funding                   bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /vote                      bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /justice                   bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
```

Three things are proven here, not one. `/fund/_next/static/x.js` returning **502 rather than a
200 SPA shell** is the mount-order law passing its own test - had the block landed after the
catch-all, that asset request would have been answered with HTML and the proxy would never have
run. `/funding` returning 200 proves the exact-or-descendant `pathFilter` does not swallow
siblings, which a bare `startsWith('/fund')` would have. And `/` unaffected proves a dead FUND
target degrades to a plain 502 on `/fund` alone without taking the manual down.

**Boot B - `FUND_INTERNAL_URL` unset (the shipped state):**

```
[server] FUND_INTERNAL_URL unset - /fund is NOT proxied.
[server] TheMANUAL.tech HTML-transform server listening on 0.0.0.0:3878

200  /fund                      bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /fund/                     bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /fund/_next/static/x.js    bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /vote                      bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
200  /justice                   bytes=1570  text/html  title="The Manual · HONEYCOMB Knowledge Spine"
```

Warn, do not mount, do not exit - `/fund` falls through to the SPA shell exactly as it did before
this pass existed. **This is what ships.** The proxy wakes when the owner sets the variable and
redeploys, per FRONT49's dormant-proxy -> named-setter -> wake sequence.

One difference from `/justice` worth stating rather than leaving to be discovered: `/justice` has
an astra-catalog stub page behind it (`src/lib/astra-catalog.ts`, `route: '/justice'`,
`mount: 'stub'`), so its unset fall-through renders a real page. **`grep -rn "/fund" src/` returns
zero matches** - there is no `/fund` catalog entry, so the dormant fall-through is the SPA's own
unknown-route handling, not a stub. That is inert, which is what the dispatch asked for. Adding a
catalog entry was NOT done: it is outside this pass's declared manifest.

### 3. The named setter - FUND_INTERNAL_URL

Per ASTRA_STANDARD v1.0 item 8 and the VOTE_INTERNAL_URL lesson (FRONT49), every new env var gets
a named setter and **no value is ever written into a file or a report**.

| variable | service | setter | when |
|---|---|---|---|
| `FUND_INTERNAL_URL` | the **MANUAL** service | **owner**, at the Railway dashboard | after a FUND private service exists; requires a MANUAL redeploy to take effect |

Same shape as the existing `VOTE_INTERNAL_URL` and `JUSTICE_INTERNAL_URL` - the FUND service's
private internal host. The value appears in no file, no commit, and no report. It is the owner's
hand at the dashboard, and until that hand moves the mount stays dormant, which is the correct and
expected state today.

Two dependencies recorded because they are the failure mode that makes a correct mount look broken,
and both belong to the FUND service's own build rather than to this pass:

- FUND must be built with `NEXT_PUBLIC_BASE_PATH=/fund` (ASTRA_STANDARD item 2). This proxy
  **preserves the `/fund` prefix and does not strip it** - `pathFilter` is used rather than
  `app.use('/fund', …)` precisely because Express strips a mount path from `req.url`. A FUND build
  without that variable roots at `/` and every `/fund/_next/...` asset resolves outside the proxy.
- `NEXT_PUBLIC_*` variables bake at **build** time (DEPLOY_AMENDMENT v2 term 3), so they must exist
  before the FUND service's first successful build, not after.

### 4. Done-tests, run, verbatim

```
npm run build          BUILD_EXIT=0     tsc -b && vite build, "built in 15.12s"
```

No new warnings. The pre-existing `>500 kB chunk` notice is unchanged. `tsc -b` covers this file -
`tsconfig` `"include": ["src", "server"]` - so the build is a real type-check of the edit, not just
a bundle of `src/`.

### 5. Deviations, judgement calls, and one method error worth recording

- **No `src/` edit, no catalog entry, no FUND service files.** FRONT52's files are explicitly
  disclaimed: nothing in this pass touches, creates, or depends on them. The manifest is
  `server/index.ts` + `REPORT.md`.
- **The named setter is recorded here rather than inserted as a dispatch row.** The dispatch says
  "add a NAMED SETTER ... in the deploy env dispatch"; R7 forbids INSERTing into `ops_dispatches`
  from a terminal absolutely. Recording it in the report of record and the R3 report is the same
  resolution FRONT49 reached ("this report is the named-setter record"). Flagged rather than
  silently reinterpreted.
- **A method error, caught and fixed rather than reported as a result.** The first probe run
  spawned the server with `shell: true`, so `child.kill()` killed the shell and not the node
  grandchild; a stale listener from an earlier session was already holding the reused port, and the
  probe measured *that* process. The tell was a self-contradicting transcript - the server log said
  `/fund proxying` and `VOTE unset`, while the probes returned 502 on `/vote` and 200 on `/fund`.
  The rewrite spawns without a shell, **asserts the port is free before boot and that the listening
  PID belongs to this child's own tree after boot** (`FOREIGN: none` in both boots above), and
  kills with `taskkill /T /F`, confirming `listeners after kill: none`. Both boots above are from
  the corrected harness. Recorded because an unverified port is exactly how a probe reports a
  neighbour's behaviour as your own.

### 6. Could not verify

- **Anything behind a real FUND service.** No FUND service exists yet, so the woken path is proven
  only against an unroutable stand-in - it proves the request reaches the proxy and that failure
  degrades correctly, not that FUND renders. The end-to-end smoke of record (ASTRA_STANDARD item 10)
  belongs to the pass that ships FUND.
- **Production behaviour of the dormant mount.** Measured locally only. It cannot be smoke-tested
  from a laptop: the manual's Railway service is where it runs, and this pass is NOT PUSHED.

### 7. Manifest and commit

Manifest, `git status --porcelain=v1 -uall` before staging:

```
 M REPORT.md
 M server/index.ts
```

Danger scan against the SWEEP gates: zero paths matching `backups/`, `*.env*`, `settings.local.json`,
`node_modules/`, `.next/`, `verify-out/`, `*.dump`; no file over 1 MB; no deletion, no rename. Two
paths, both inside the workspace, both declared.

**Where the commit hash lives.** Not here, same as FRONT41 / FRONT40 and for the same reason: this
section is *inside* the commit it describes, so it cannot name its own hash without an amend. The
hash is in the FRONT51 rail report (`ops_reports`, filed after the commit) and in `git log -1`.

**NOT PUSHED.** The push is the owner's click.

---

## FRONT49 - MANUAL PROXY: MOUNT /justice BEHIND JUSTICE_INTERNAL_URL (2026-08-14)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row; the body predeclares the
manifest as `server/index.ts` plus `REPORT.md` (R6). Session `e088479e` (fallback id - no
`MC_SESSION` set in this window). Started on a clean tree at `4021c0f`, `origin/main..HEAD` = 0.

**Result: all done-tests green, committed, NOT pushed.** Manifest held exactly - two files, no
`src/` edit, no third path.

### The law, quoted before the file was touched

From the existing `/vote` block, `server/index.ts:64-68`:

> MOUNT ORDER IS LOAD-BEARING and this position is the whole point: AFTER
> express.static, BEFORE the SPA catch-all below. Mounted after the catch-all
> instead, every /vote request would return the manual's SPA shell with a 200
> and this proxy would silently never run - a failure that reads as a bug in
> VOTE rather than a mount-order bug here. (OPS88 finding, FRONT37.)

Verified shape, not assumed: `express.static` (line 49) -> `/vote` proxy (81) -> SPA catch-all
(`app.get(/.*/)`, was 116). The `/justice` block is inserted between the `/vote` block and the
catch-all, so the order is now static -> /vote -> /justice -> catch-all. The law is preserved for
both mounts.

### The diff

`git diff --stat` = `server/index.ts | 54 ++++++` - **54 insertions, 0 deletions**. It is a pure
insertion at one point in the file: the `/vote` block is byte-unchanged (it does not appear in the
diff at all), and the catch-all is unchanged and still last. The inserted block is a
line-for-line replica of the `/vote` block with the astra name and variable swapped.

### Prefix preserved, and this is evidenced rather than copied

`pathFilter` is used, not `app.use('/justice', ...)`, because Express strips a mount path from
`req.url`. The filter is the same exact-or-descendant test the `/vote` block uses:
`p === '/justice' || p.startsWith('/justice/')`, so a sibling like `/justiceleague` is NOT captured.

Confirmed against the source rather than inferred from VOTE: `Justice/next.config.mjs` documents
`NEXT_PUBLIC_BASE_PATH=/justice` for the proxied world and warns that a build without it "roots at
/ and breaks behind the proxy - the document would be served but every /_next/... asset would
resolve outside the proxy and be answered by the host's catch-all with HTML instead of JS." So the
prefix MUST be preserved on this side, and the Justice service MUST be built with that variable
set. That build-time requirement is the Justice service's half, not this pass's.

### Unset-variable behaviour matches VOTE exactly

Read from the `/vote` block, replicated, and then measured on both sides: NOT FATAL. The server
warns, does not mount, and `/justice` falls through to the SPA shell - i.e. the astra-catalog stub
page, exactly as before this pass. No `src/` edit was needed or made: while the variable IS set the
proxy answers first and the stub is simply unreachable, which is the ruled replacement.

### Done-tests - run, verbatim

Build: `npm run build` (tsc -b && vite build) exit 0, `built in 15.40s`, no new warnings (the
pre-existing >500 kB chunk-size notice is unchanged).

Two boots of `npx tsx server/index.ts` against an unroutable stand-in target
(`http://127.0.0.1:9` - passed in the environment only, never written into the repo). A connection
failure to that target is SUCCESS: it proves the request was routed to the proxy.

Boot 1 - `JUSTICE_INTERNAL_URL` set, `VOTE_INTERNAL_URL` unset:

    [server] VOTE_INTERNAL_URL unset - /vote is NOT proxied.
    [server] /justice proxying to http://127.0.0.1:9
    [server] TheMANUAL.tech HTML-transform server listening on 0.0.0.0:3111
    [server] /justice proxy error: connect ECONNREFUSED 127.0.0.1:9   (x3)

    /justice                     status=502 bytes=35 type=text/plain  "The justice service is unavailable."
    /justice/                    status=502 bytes=35 type=text/plain  "The justice service is unavailable."
    /justice/_next/static/x.js   status=502 bytes=35 type=text/plain  "The justice service is unavailable."
    /vote                        status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /vote/_next/static/x.js      status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /justiceleague               status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /manual                      status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /favicon.svg                 status=200 bytes=992  image/svg+xml

Boot 2 - `JUSTICE_INTERNAL_URL` unset, `VOTE_INTERNAL_URL` set (the mirror, so the two mounts are
compared under identical conditions):

    [server] /vote proxying to http://127.0.0.1:9
    [server] JUSTICE_INTERNAL_URL unset - /justice is NOT proxied.
    [server] TheMANUAL.tech HTML-transform server listening on 0.0.0.0:3112
    [server] /vote proxy error: connect ECONNREFUSED 127.0.0.1:9   (x2)

    /justice                     status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /justice/                    status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /justice/_next/static/x.js   status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /vote                        status=502 bytes=32 type=text/plain  "The vote service is unavailable."
    /vote/_next/static/x.js      status=502 bytes=32 type=text/plain  "The vote service is unavailable."
    /justiceleague               status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /manual                      status=200 bytes=1570 text/html      title="The Manual - HONEYCOMB Knowledge Spine"
    /favicon.svg                 status=200 bytes=992  image/svg+xml

The two tables are exact mirrors of one another. That symmetry IS the "matches VOTE exactly"
claim, measured rather than asserted: set -> 502 on that prefix and its descendants only; unset ->
SPA shell on that prefix; the other mount, the sibling path, the catch-all and static are
untouched in both directions.

Greps: `atlasjustice` (case-insensitive) in `server/` = **0 matches**. Zero new host or URL
literals introduced - the only new string literals in the diff are the env var NAME
`JUSTICE_INTERNAL_URL`, two log lines, and the 502 body `The justice service is unavailable.`
The URL VALUE exists nowhere in this repo, as ruled.

### Deviation, recorded

**The inserted comment block is not pure ASCII, against the dispatch's "ASCII only".** It carries
the same `// ---` box rule (U+2500) and em dashes the `/vote` block above it uses. The dispatch
also names that block "the living template", and `server/index.ts` is already a non-ASCII file
throughout; an ASCII-only insert would have made the two adjacent proxy sections visibly
inconsistent and dropped the divider that marks a proxy section in this file. Consistency with the
named template was taken as the stronger instruction. `REPORT.md` itself is ASCII-only as asked.
Build and both boots are green with the characters present. Flagging it rather than burying it - if
the lead wants the block transliterated it is a one-line change.

### Could not verify

- **Anything against the real Justice service.** The target is private by design and unreachable
  from a laptop; nothing here was smoke-tested end to end. What can only be proven in production:
  that Justice answers under `/justice`, and that its assets resolve under `/justice/_next/`.
- **That the Justice service is built with `NEXT_PUBLIC_BASE_PATH=/justice`.** Read from its
  config as the requirement; not observed on a deployed artifact. If it is deployed without that
  variable the document will serve and every asset will 404 - the failure `Justice/next.config.mjs`
  warns about. That is the other half of the public moment, not this pass.
- **The dashboard value.** Not set, not read, not written by this pass. `/justice` stays on the
  stub until the owner sets `JUSTICE_INTERNAL_URL` on the MANUAL service.

### Git

`origin/main..HEAD` = **0 before**, **1 after**. One commit, tip of `main`, subject exactly as
dispatched with no trailer (matching this repo's convention - the first attempt added a
`Co-Authored-By` trailer from the harness default and was amended off while still unpushed, so the
message is byte-exact to the dispatch). The SHA is recorded in the FRONT49 `ops_reports` row rather
than here: a commit cannot contain its own hash, and this report is inside it.

Danger scan on the staged index: zero - two tracked text files, both `M`, no `backups/`, no
`.env*`, no `settings.local.json`, no `node_modules/`, no deletions, no renames, nothing over 1 MB.
Staged set verified equal to the manifest before committing.

**NOT PUSHED** - the owner's push auto-deploys this repo (OPS89 wiring) and that moment is his.

---

## FRONT41 - MISSION CONTROL: RETARGET THE DEAD atlasJUSTICE.org LAUNCHER PATH (2026-08-14)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row; the body scopes this to
the two Mission Control launcher files plus `REPORT.md` (R6). Gated `after FRONT40` - verified
`done` on the rail before starting, and the checkout was on the committed tree (`4c4137c`), not on
a staged one. ASCII only.

**Outcome in one line:** the dead launcher entry now points at `Justice`, the done-test grep
returns zero, and the two files plus `REPORT.md` are committed - **nothing pushed**.

**Where the commit hash lives.** Not here, same as FRONT40 and for the same reason: this section is
*inside* the commit it describes. The hash is in the FRONT41 rail report (`ops_reports`, filed
after the commit) and in `git log -1`.

### 1. Arrival state

    $ git rev-parse --show-toplevel
    C:/Users/Butch/Documents/HONEYCOMB/TheMANUAL.tech
    $ git log --oneline -2
    4c4137c Retire atlasJUSTICE from /justice stub; hosts emptied per no-URL ruling JMF v0.8 [FRONT39/FRONT40]
    37ae1a5 FRONT37: mount the /vote proxy between static and the SPA catch-all
    $ git status --porcelain=v1 -uall
     M REPORT.md

The single pre-existing `M REPORT.md` is **FRONT40's deliberately-uncommitted correction** (the
"exactly ONE unpushed commit, not two" paragraph), which FRONT40 left with the note *"The next
sweep picks this up."* This pass is that sweep for it: `REPORT.md` is one of the three predeclared
manifest paths, so the correction rides along in this commit. Flagged rather than left silent -
a reader of the commit will find one paragraph in it that FRONT41 did not author.

### 2. The two edits - and a done-test that could not be satisfied by the letter of step 1

The dispatch's step 1 says to change **the path segment**. Its step 2 requires
`git grep -in "atlasjustice" -- scripts/mission-control` to return **ZERO**. Measured, those two
instructions conflict: each line carries the old name **twice** - once as the path, once as the
button **label**:

    scripts/mission-control/mission-control.ahk:29:    ["atlasJUSTICE.org",  ROOT "\atlasJUSTICE.org"],
    scripts/mission-control/mission-control.config.json:40:    { "label": "atlasJUSTICE.org", "path": "C:\\Users\\Butch\\Documents\\HONEYCOMB\\atlasJUSTICE.org" },

The dispatch's premise - *"FRONT39's checkout-wide grep showed exactly one hit in each file - there
are no other occurrences hiding in labels"* - is true as a count of grep **lines** and false as a
count of **occurrences**. Path-only edits would have left both labels reading `atlasJUSTICE.org`
and the step-2 grep returning 2.

**Judgement call, declared:** I changed the label as well as the path. JMF v0.8 retires the
atlasJUSTICE brand outright, so a button still labelled `atlasJUSTICE.org` would be wrong on the
ruling's own terms even if the grep had not forced it - and the alternative (path-only) fails the
pass's stated done-test. Filing a question over this would have stalled a two-line pass on a
conflict that resolves one way only.

Applied line-scoped under OPS90 discipline: the script asserts the **exact expected line text at
the exact expected line number**, and on mismatch aborts and re-locates the expected text by
content so a wrong line number is reported rather than guessed past. Neither file drifted - both
matched on the first try, at the line numbers the dispatch named.

    ok  mission-control.ahk:29  (line ending: LF)
        OLD      ["atlasJUSTICE.org",  ROOT "\atlasJUSTICE.org"],
        NEW      ["Justice",           ROOT "\Justice"],
    ok  mission-control.config.json:40  (line ending: LF)
        OLD      { "label": "atlasJUSTICE.org", "path": "C:\\Users\\Butch\\Documents\\HONEYCOMB\\atlasJUSTICE.org" },
        NEW      { "label": "Justice",          "path": "C:\\Users\\Butch\\Documents\\HONEYCOMB\\Justice" },

Old and new line numbers are the same - 29 and 40. Both files are column-aligned lists, so the
padding was re-cut to keep the `ROOT` / `"path"` columns lined up rather than leaving a ragged row.

### 3. Done-test

    $ git grep -in "atlasjustice" -- scripts/mission-control
    ZERO HITS

Verbatim: the command produced **no output** and the shell branch printed `ZERO HITS`.

Two checks beyond what was asked, because a launcher that parses is not the same as a launcher
that points somewhere real:

    $ node -e "require('./scripts/mission-control/mission-control.config.json') ... "
    TheMANUAL.tech -> C:\Users\Butch\Documents\HONEYCOMB\TheMANUAL.tech
    HONEYCOMB (root) -> C:\Users\Butch\Documents\HONEYCOMB
    Justice -> C:\Users\Butch\Documents\HONEYCOMB\Justice
    AtlasORACLE.to -> C:\Users\Butch\Documents\HONEYCOMB\AtlasORACLE.to
    TheWORKSHOP.to -> C:\Users\Butch\Documents\HONEYCOMB\TheWORKSHOP.to
    AtlasVOTE.org -> C:\Users\Butch\Documents\HONEYCOMB\AtlasVOTE.org
    DingleBERRY.tech -> C:\Users\Butch\Documents\HONEYCOMB\DingleBERRY.tech
    FreedomBLiNGS.com -> C:\Users\Butch\Documents\HONEYCOMB\FreedomBLiNGS.com
    folders=8

The JSON still parses, all 8 entries survive, and the entry sits in its original third position.

Step 3, existence check (launched nothing):

    $ ls -d /c/Users/Butch/Documents/HONEYCOMB/Justice
    /c/Users/Butch/Documents/HONEYCOMB/Justice/          <- EXISTS
    $ ls -d /c/Users/Butch/Documents/HONEYCOMB/atlasJUSTICE.org
    No such file or directory                            <- gone, as OPS90 left it

**Could not verify:** that the AutoHotkey script actually spawns the window. That needs a real
click on a real hotkey, and this pass launches nothing. What is verified is that the target path
resolves to a directory that exists and that the `.ahk` edit is a same-shape substitution inside an
existing working row.

### 4. Manifest, danger scan, commit

```
$ git diff --cached --name-status
M	REPORT.md
M	scripts/mission-control/mission-control.ahk
M	scripts/mission-control/mission-control.config.json

$ git diff --cached --stat
 REPORT.md                                          | 155 ++++++++++++++++++++-
 scripts/mission-control/mission-control.ahk        |   2 +-
 .../mission-control/mission-control.config.json    |   2 +-
 3 files changed, 154 insertions(+), 5 deletions(-)
```

Danger scan over the staged set - forbidden-path hits: **ZERO**; files over 1 MB: **ZERO**; `D` or `A` entries: **ZERO**. `git diff --name-only` (unstaged) is empty and there are no untracked files.

The staged path-set is **exactly the three predeclared paths and no others** - the predeclaration
is the authorization boundary, so anything beyond it would have meant stage-only and a report
instead of a commit. Danger scan over the staged set: no path matching `backups/`, env files,
`settings.local.json`, `node_modules/`, `.next/`, `verify-out/`, `*.dump`; nothing over 1 MB; no
`D` and no `A` entries - all **ZERO**.

Committed the index only - no `-a`, nothing added after the scan. Message exactly as dispatched:

    Mission Control: retarget dead atlasJUSTICE.org launcher path to Justice [FRONT41]

**Deviation, declared (same as OPS91):** the harness default appends a `Co-Authored-By:` trailer.
Not appended - the dispatch said the message exactly, and this repo's commit subjects are ASCII-plain.

**NOT PUSHED.** No `git push` was run.

### 5. Not done, deliberately

- **`scripts/mission-control/` beyond the two named files** - not searched for other stale HONEYCOMB
  paths. Out of scope; the dispatch named two lines.
- **The `.ahk` was not run.** See the could-not-verify note above.
- **Nothing pushed, nothing amended, nothing rebased.** `4c4137c` and `37ae1a5` untouched.

---

## FRONT40 - COMMIT THE FRONT39 STAGED TREE (2026-08-13)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row; the dispatch body scopes
this to committing the already-staged FRONT39 index. **Owner word received in lead chat 2026-08-13;
the lead reviewed the FRONT39 manifest and danger scan.** Commit only - **NO PUSH, human-forever**.
ASCII only.

**Outcome in one line:** the two staged FRONT39 paths were re-verified, danger-scanned clean, and
committed; the checkout now carries **two** unpushed commits, which is the expected state -
**nothing was pushed**.

**Where the commit hash lives.** Not here. This section is *inside* the commit it describes, so the
hash cannot be written into it without inventing a value before it exists. The hash and the
`git log --oneline -3` output are recorded in the **rail report for FRONT40** (`ops_reports`, filed
after the commit), which is the one place they can be stated as fact.

### Step 2 - staged-set verification, verbatim (before this section was written)

    $ git diff --cached --name-only
    REPORT.md
    src/lib/astra-catalog.ts

    $ git diff --cached --name-status
    M	REPORT.md
    M	src/lib/astra-catalog.ts

    $ git status --porcelain=v1 -uall
    M  REPORT.md
    M  src/lib/astra-catalog.ts

Exactly the two expected paths, and **no unstaged change sitting on `src/lib/astra-catalog.ts`** -
the porcelain lines read `M ` (staged column set, worktree column blank), not `MM`. The stop
condition in step 2 did not fire.

### Step 3 - danger scan on the staged set, all ZERO

| check | result |
|---|---|
| `backups/` | 0 |
| `*.env*` | 0 |
| `settings.local.json` | 0 |
| `node_modules/` | 0 |
| `.next/` | 0 |
| `verify-out/` | 0 |
| `*.dump` | 0 |
| over 1 MB | 0 - `REPORT.md` 18,791 B, `src/lib/astra-catalog.ts` 20,508 B |
| deletions (`D`) | 0 - both entries are `M` |
| renames (`R`) | 0 |
| outside the workspace | 0 |

`dist/` is gitignored and did not enter the index. REPORT.md is far below the 512 KB rotation gate,
so no rotation was performed this pass either.

### Step 4/5 - the commit

This section was appended to `REPORT.md` per R6, `REPORT.md` re-staged, and the path-set re-checked
as still exactly the two before committing. The index alone was committed - message exactly as the
dispatch specified:

    Retire atlasJUSTICE from /justice stub; hosts emptied per no-URL ruling JMF v0.8 [FRONT39/FRONT40]

### Step 6 - known state, left alone

The log below is the state **on arrival**, before this pass committed anything; the post-commit
`git log --oneline -3` is in the rail report for the reason given above.

    $ git log --oneline -3
    37ae1a5 FRONT37: mount the /vote proxy between static and the SPA catch-all
    683115e DB45: elections_v1c migration pair saved under stamp 20260809171412
    7e4f38d OPS85: ops_rail_readme() - the rail explains itself from a cold start

`37ae1a5` (FRONT37, the `/vote` proxy) was not touched, not amended, not rebased.

**CORRECTION, appended after the commit (uncommitted at the time of writing).** The dispatch's
step 6 states that `37ae1a5` is unpushed and that this pass would leave **two** unpushed commits.
**Measured, that is not the case - there is exactly ONE.** `37ae1a5` is already on the remote:

    $ git rev-parse origin/main
    37ae1a588a208235aaf95aa6c7a08647ee951e17          <- origin/main IS FRONT37

    $ git merge-base --is-ancestor 37ae1a5 origin/main
    YES - 37ae1a5 is already on origin/main

    $ git log --oneline origin/main..HEAD
    <this pass's commit only>                          <- ONE unpushed commit, not two

The remote-tracking ref is not stale in the direction that matters: `.git/refs/remotes/origin/main`
and `.git/FETCH_HEAD` were both written **2026-08-13 18:23 local**, and the ref already contains
FRONT37, so the owner's push of FRONT37 landed before this pass began. Nothing was done about it -
the dispatch said "DO NOT FIX", and there was nothing to fix; only the expectation was wrong.

This correction sits **uncommitted** on purpose: the paragraph it corrects is inside the commit this
pass just made, and the dispatch authorized a commit of a specific reviewed two-path index and
nothing further. Amending would rewrite a commit the lead cleared. The next sweep picks this up.

### Not done, deliberately

- **NO PUSH.** The push click is the human's, forever.
- No deploy started or triggered.
- No fix attempted on the pre-existing unpushed FRONT37 commit.
- The two Mission Control launcher paths FRONT39 flagged (`scripts/mission-control/*` still pointing
  at the folder OPS90 renamed) remain **unfixed and out of scope** here, as they were there.

### Could not verify

- **Nothing on the remote.** This pass ends at a local commit by design, so no assertion is made
  about `origin/main`.

---

## FRONT39 - RETIRE THE OLD NAME FROM THE /justice STUB COPY (2026-08-13)

Lane `front`. Workdir `TheMANUAL.tech`. Scope: NULL in the dispatch row; the dispatch body scopes
the work to "the TheMANUAL.tech checkout only", copy-only, on the `/justice` route/stub. ASCII only.
Ruling driving it: **JMF v0.8 (owner, 2026-08-13)** - the project is Justice, atlasJUSTICE is
retired, and **NO Justice URL exists or may be written**.

**Outcome in one line:** one tracked file changed (`src/lib/astra-catalog.ts`), the `/justice` stub
now reads **Justice** with no domain row at all, `src/` greps zero for the old name, build green,
**nothing committed** - staged and stopped, per the dispatch.

### Step 1 - the grep, verbatim

`git grep -in "atlasjustice"` (tracked files only; no env or secret file was content-read) on a
clean tree at `37ae1a5`. **Not zero.** 52 hits across 7 files. Grouped by file:

    20  docs/reports/REPORT-archive-002.md
    19  docs/reports/REPORT-archive-001.md
     8  supabase/migrations/20260809014029_ops_workdirs_registry_v1.sql
     2  supabase/migrations/_drafts/20260809014029_ops_workdirs_registry_v1_rollback.sql
     1  scripts/mission-control/mission-control.config.json
     1  scripts/mission-control/mission-control.ahk
     1  docs/OPS54.md
     4  src/lib/astra-catalog.ts        <- the only in-scope file
     0  server/index.ts                 <- proxy mount logic never matched; not opened, not touched

### Step 2 - the change (one file, copy and comments only)

`src/lib/astra-catalog.ts`, the `justice` catalog entry and its comments. That entry is the
**sole source** of what `/justice` renders: `AstraStubPage.tsx` reads `wordmark`, `description`
and `hosts` straight off it, and `/constellation` + the HQ `AstraStatus` section read the same row.

| line | before | after |
|---|---|---|
| 16 | `the workspace trees that exist on disk (AtlasVOTE.org, atlasJUSTICE.org,` | `... (AtlasVOTE.org, Justice,` |
| 148 | `// DERIVED - workspace tree atlasJUSTICE.org + rail canon JMF v0.3-v0.5` | `// DERIVED - workspace tree Justice + ...` |
| 150 | `wordmark: 'atlasJUSTICE'` | `wordmark: 'Justice'` |
| 150 | `hosts: ['atlasJUSTICE.org']` | `hosts: []` |

Two comment lines were added above the entry recording JMF v0.8 as the reason `hosts` is empty, so
the next reader does not "helpfully" restore a domain.

**JUDGEMENT CALL - `hosts: []` rather than a substitution.** The dispatch says "replace the old name
with Justice". Applied literally to `hosts` that yields `hosts: ['Justice']`, which is not a domain
and would render as one; and any real substitution (`justice.org` or similar) is exactly the Justice
URL the ruling forbids writing. Emptying the array is the only reading that satisfies the ruling.

**Proved non-structural before making it.** Two consumers of `hosts` could in principle change
behaviour, and neither does:
- `AstraStubPage.tsx:97` and `AstraStatus.tsx:294` both already guard `entry.hosts.length > 0`, so
  the "Registered domains (dark)" row simply does not render. No new branch, no component edit.
- `effectiveStatus()` (astra-catalog.ts:188) upgrades an Astra to `live` when a host intersects
  `ASTRA_REGISTRY`. `git grep -in "justice" -- src/lib/astras/registry.ts` returns **zero**, so the
  intersection was already false. Status stays `scaffolded` before and after.

Line 16 was edited as well as the entry: it is a present-tense claim about "trees that exist on
disk", and after OPS90 renamed that folder to `Justice/` the old spelling was simply wrong.

### Deviation - the done-test as written cannot be met, and should not be

The dispatch's done-test reads "re-run of the step-1 grep returns zero hits". Taken literally over
the whole checkout that is **unachievable without breaking three other standing rules**, so it was
not attempted. The 48 out-of-scope hits, and why each stays:

| file(s) | hits | why untouched |
|---|---|---|
| `docs/reports/REPORT-archive-001.md`, `-002.md` | 39 | **Write-once by R6.** "never edit a rotated file". They are historical record of passes that ran when the name was current. |
| `supabase/migrations/20260809014029_*.sql` (+ its `_drafts` rollback) | 10 | **Applied-migration prose.** The comments explain a workdir-string reconciliation that actually ran; rewriting them falsifies the audit trail. |
| `docs/OPS54.md` | 1 | Historical pass write-up, same class as the archives. |
| `scripts/mission-control/mission-control.{ahk,config.json}` | 2 | **Structural, not copy** - see the finding below. |

Nothing here is a copy string on the `/justice` route/stub, which is what step 2 scopes. The
in-scope grep is clean: `git grep -in "atlasjustice" -- src` returns **zero hits**.

### Finding for the lead - a launcher path that is now broken (NOT fixed here)

`scripts/mission-control/mission-control.ahk:29` and `mission-control.config.json:40` both point at
`C:\Users\Butch\Documents\HONEYCOMB\atlasJUSTICE.org`. **OPS90 renamed that folder to `Justice/` on
2026-08-13**, so those two entries now reference a path that does not exist - the Mission Control
button for that tree is dead. It is a real bug and it lives in this checkout, but it is a filesystem
path (behaviour), not `/justice` stub copy, and the dispatch explicitly says this pass is
"independent of the OPS90 folder rename". Fixing it here would be a structural change outside the
stated scope. **Flagged, not touched - it wants its own dispatch.**

### Done-test output, verbatim

    $ npm run build
    ... vite build ...
    (!) Some chunks are larger than 500 kB after minification.   <- pre-existing, unrelated
    built in 18.21s                                              <- GREEN

    $ npx biome lint src/lib/astra-catalog.ts
    Checked 1 file in 8ms. No fixes applied.                     <- clean

    $ git grep -in "atlasjustice" -- src
    (no output)                                                  <- ZERO, the in-scope done-test

    $ git status --porcelain=v1 -uall        (before staging REPORT.md)
     M src/lib/astra-catalog.ts

### Manifest + danger scan

Manifest, exactly two paths, both already tracked, both modifications:

     M src/lib/astra-catalog.ts
     M REPORT.md                              (this file; R6 - always in scope)

Danger scan, all zero: no path matching `backups/` - `*.env*` - `settings.local.json` -
`node_modules/` - `.next/` - `verify-out/` - `*.dump`; **no file over 1 MB** (largest staged path is
this REPORT.md, well under); **no deletions (`D`)**; **no renames (`R`)**; every path inside the
workspace. `dist/` was regenerated by the build and is gitignored - it does not appear in the
manifest. REPORT.md was 11,426 bytes before this section, far below the 512 KB rotation gate, so
**no rotation** was performed.

### Not done, deliberately

- **No commit and no push.** Staged and stopped. The commit word and the push click are the
  human's, per canon.
- **No deploy started or triggered.**
- `server/index.ts` was neither opened nor edited - the grep never matched it, so the mount-order
  comment was left entirely alone.

### Could not verify

- **The rendered `/justice` page was not loaded in a browser.** The change is proven at the source
  and by a green build; the visual confirmation that the domain row is gone and the title reads
  "Justice" waits for whoever next has the app running.

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
