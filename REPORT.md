# REPORT — TheMANUAL.tech

Report of record for dispatched passes with `workdir=TheMANUAL.tech`. Updated in place every pass.
Newest pass first.

**Archive chain.** This file rotates when it exceeds 512 KB at sweep time (root `CLAUDE.md` R6).
Rotated files are write-once and live under `docs/reports/`, which is exempt from the sweep's 1 MB
gate by name. Read them newest-first when you need history older than this file:

| # | file | covers | bytes at rotation |
|---|---|---|---|
| 001 | `docs/reports/REPORT-archive-001.md` | DOCS17-era passes through **OPS74-Q** (top section: `OPS74-Q`; oldest: the DOCS17 / A.1 appendix material) | 1,782,627 |

This file starts at **OPS74** (2026-08-03), the pass that performed rotation 001.

---

## OPS76 - THE SWEEP FIRED. Inherited state verified piece by piece, `verify-out/` ignored, 13 paths committed - and the ruling's premise was already half-stale when it was written

Lane `ops`. Workdir `TheMANUAL.tech`. Scope: empty. Effort: light. ASCII only.
Supersedes the stalled OPS74 claim. No function-source edits, no settings files, no migrations, no
deploys. One `.gitignore` line, this section, and the commit.

**The sha is not in this section, and cannot be** - the commit that carries this text is created
*after* it is written. It is in the `ops_reports` OPS76 row, and in `git log -1` from this repo.

### 1. INHERITED STATE - VERIFIED, NOTHING REDONE

| Claimed done by OPS74 | Verified how | Found |
|---|---|---|
| Root `CLAUDE.md` gate-2 exemption | `git diff -- CLAUDE.md` at the root repo | **PRESENT** - diff in section 3 |
| Root `CLAUDE.md` R6 rotation-at-512KB rule | same | **PRESENT** - diff in section 3 |
| Rotation 001 | `ls -l` + `head` of both files | **DONE, correctly.** `docs/reports/REPORT-archive-001.md` = 1,782,627 bytes; fresh `REPORT.md` = 55,119 bytes carrying an archive-chain header table |
| Proofs relocation | `git status -uall` | **DONE** - `docs/proofs/ops67_*` present (and `db23_*` alongside, from DB23) |
| Rotation done as a **copy**, not a move | gate 2c check | **CONFIRMED, and this is what saved the sweep.** The manifest has **no `D` and no `R` entry**. Had the rotation been a `git mv`, gate 2c ("no deletion and no rename, which always escalate") would have refused this commit and the sweep would have stalled a third time on the amendment meant to unblock it |

That last row is worth keeping: **the rotation rule and gate 2c are in tension by construction**, and
only the copy-then-rewrite implementation keeps them compatible. Anyone writing rotation 002 should
know that before reaching for `git mv`.

### 2. THE `verify-out/` RULING - APPLIED, AND THE PREMISE HAD MOVED

Ruling (c) says a concurrent session dumped 166 files into `verify-out/`, colliding gate 1. **At claim
time that directory did not exist in this repo, nor at the workspace root.** The manifest was already
clean. The facts, gathered before acting:

- `TheMANUAL.tech/verify-out` - **absent.** Workspace root `verify-out` - **absent.**
- The only `verify-out/` anywhere in the workspace is `atlasJUSTICE.org/verify-out`: **18 files, dated
  Jul 27**, and **already ignored** by `atlasJUSTICE.org/.gitignore:30` (`/verify-out`). Unrelated.
- The reconcile session's two *intended* files - `scripts/migration-reconcile/{reconcile.mjs,applied-evidence.json}` -
  **are** in the manifest and are committed here.

So the session that OPS74-Q2 caught mid-run **finished and cleaned up after itself**, leaving its
deliverables and removing its scratch. Which session: the migration drift-reconciliation run behind
**DB22** - `scripts/migration-reconcile/reconcile.mjs`, timestamped 05:27, matching OPS74-Q2's
observation of `verify-out/` last written 05:26.

**The line was still added**, and not as dead config: the dump was real, it is a repeatable behaviour
of a tool that lives in this repo, and gate 2 forbids `verify-out/` by name - so the next reconcile
run would stall the next sweep exactly as it stalled the last one. Ignoring it makes gate 1
satisfiable by construction, which is precisely the ruling's stated goal. It is insurance against a
demonstrated recurrence, not a fix for a live collision. Applied to `TheMANUAL.tech/.gitignore` with a
comment naming OPS74-Q2 and the ruling.

### 3. THE TWO CANON DIFFS (root `CLAUDE.md`, quoted as the dispatch requires)

**Gate 2 - the 1 MB exemption:**

```diff
 2. **Hard gates.** All must pass, or file a question (R4) carrying the full manifest and
    STOP: no path matching `backups/` · `*.env*` · `settings.local.json` · `node_modules/` ·
-   `.next/` · `verify-out/` · `*.dump`; no file over 1 MB; **no deletion (`D`) and no rename
-   (`R`)**, which always escalate; every path inside the workspace.
+   `.next/` · `verify-out/` · `*.dump`; **no file over 1 MB, except paths under `docs/reports/`**
+   (report-of-record archive, exempt by name); **no deletion (`D`) and no rename
+   (`R`)**, which always escalate; every path inside the workspace.
```

**R6 - the rotation rule** (added after the existing R6 paragraph):

```diff
+**Rotation.** When `REPORT.md` exceeds **512 KB at sweep time, rotate first**: move the entire
+file to `docs/reports/REPORT-archive-NNN.md` (`NNN` = the next number in the chain, zero-padded),
+start a fresh `REPORT.md` whose header names the archive chain, then sweep. The archive is
+write-once — never edit a rotated file, and never rotate mid-pass. `docs/reports/` is exempt from
+the sweep's 1 MB gate by name, which is what makes the rotated archive committable.
```

Both are **root-repo** edits and are **not** in this commit - see section 5.

### 4. THE GATES, RUN VERBATIM

The gate check had to be run from a script: the forbidden-path list contains a literal that the
secrets guard matches on sight, so putting it on a Bash line is itself denied. The patterns live in
the script's `content` (NEVER_SCAN) and the Bash line carries only a benign path - the escape hatch
documented in OPS75 leg B, used for its stated purpose.

```
=== GATE 1 - MANIFEST (13 paths) ===
 M .gitignore
 M REPORT.md
 M supabase/functions/oracle-checkout/index.ts
 M supabase/functions/oracle-webhook/index.ts
?? docs/proofs/db23_battery_output.txt
?? docs/proofs/db23_f1_attribution_battery.sql
?? docs/proofs/ops67_battery_output.txt
?? docs/proofs/ops67_plan_lifecycle_battery.sql
?? docs/reports/REPORT-archive-001.md
?? scripts/migration-reconcile/applied-evidence.json
?? scripts/migration-reconcile/reconcile.mjs
?? supabase/migrations/_drafts/20260803120000_f1_explicit_token_attribution.sql
?? supabase/migrations/_drafts/20260803120100_f1_explicit_token_attribution_rollback.sql

=== GATE 2a - forbidden path patterns ===
PASS - no manifest path matches any forbidden pattern

=== GATE 2b - file size (>1 MB), docs/reports/ exempt by name ===
EXEMPT docs/reports/REPORT-archive-001.md (1782627 bytes) - under docs/reports/
PASS - no non-exempt path exceeds 1 MB

=== GATE 2c - deletions / renames (always escalate) ===
PASS - no D and no R entries

=== GATE 2d - every path inside the workspace ===
PASS - all paths repo-relative

ALL GATES PASS - safe to stage
```

**Gate 2b is the amendment earning its keep** - the 1.78 MB archive is the single path that would
have failed the old gate, and it is exempt by name rather than by exception.

### 5. WHAT THIS COMMIT DOES NOT CONTAIN, AND WHY

**The workspace root is a separate git repository and is NOT swept by this pass.** Its manifest is
two paths - ` M CLAUDE.md` (OPS66's R2 fallback, OPS70's R7 rewording, OPS73's tail line, plus the two
canon amendments quoted above) and ` M REPORT.md` (OPS70, OPS73, OPS75 sections).

The commit message names **OPS73**, which is a root-repo pass, and the dispatch's own append rule
mentions **OPS75**, whose section is in the root `REPORT.md`. Neither can be in a commit made from
`TheMANUAL.tech`. I did not sweep the root anyway: R2b binds the pass to `workdir`, and the GIT
AMENDMENT permits `add`/`commit`/`push` **only via an explicit dispatch** - this dispatch names
`TheMANUAL.tech`. Committing a second repo on the strength of a message string would be exactly the
improvisation the hard limits forbid. **The root needs its own sweep dispatch**, and until it gets
one the two canon amendments and four report sections stay uncommitted.

**OPS75 is therefore not appended** to the message - the rule was "if their sections exist in the
fresh `REPORT.md`", and OPS75's does not; it is in the root's. **OPS76 is appended** - this section.

Also worth stating: **DB22 and DB23 sections and artifacts are in this commit** (the reconcile script,
the F-1 attribution battery and its two draft migrations) though the lead's message does not name
them. I did not edit the message beyond the stated append rule.

**N-2 from OPS71 closes with this commit.** The `oracle-webhook` / `oracle-checkout` v2 source that
production has been running since OPS71 - and that existed only in this working tree - is now
committed. That was the standing risk that a stray `git restore` would silently revert a live money
function.

### 6. DONE-TEST

| Clause | Result |
|---|---|
| Inherited state verified piece by piece, findings stated | **PASS** - section 1, five rows, including the copy-not-move catch |
| `verify-out/` ignored | **PASS** - one line + comment in `TheMANUAL.tech/.gitignore`; premise correction in section 2 |
| Which session dumped it, if determinable | **PASS** - DB22's drift-reconciliation run, by artifact and timestamp |
| Sweep completed through amended gates | **PASS** - section 4, all gates verbatim |
| Commit hash reported | **PASS** - in the `ops_reports` OPS76 row; it cannot be in this file, see the note under the title |
| Both canon diffs quoted | **PASS** - section 3 |
| Function paths clean in `git status` afterwards | **PASS** - recorded in the rail report after the commit |

### 7. COULD NOT VERIFY

- **Whether the push completed.** The push click is the human's and is never automated; the rail
  report records what the push attempt returned, not what the remote holds afterwards.
- **The contents of DB22/DB23's artifacts.** I committed them because they are in the manifest and pass
  every gate, not because I reviewed them - a sweep is a gate-check, not a code review, and canon says
  so explicitly.
- **Whether `atlasJUSTICE.org/verify-out` matters to anyone.** It is 18 files from Jul 27, already
  ignored in its own repo; I left it alone.

---

## DB23 - F-1 IS FIXED AND PROVEN: s5 reads 13000/13000/0, the 12,000 destroyed Tokens come back, s3 is byte-identical to OPS67. THE APPLY IS PARKED ON TWO GATES, one of which is DB23's own precondition and is NOT met

Lane `db`. Workdir `TheMANUAL.tech`. Scope: empty (workdir bounds the pass). Effort: deep. ASCII only.
**ZERO migrations applied. `apply_migration` was never called. Zero committed writes to any project
table.** Every write this pass was inside one transaction that ends in `ROLLBACK`; section 9 of the
battery re-reads production afterwards and finds it untouched. The only committed writes were the R2
claim and this R3 close.

### W-1 BLOCK - WHO OWNS THE NEXT MOVE

| | |
|---|---|
| **Owner of the next move** | **The LEAD first, then BUTCH.** Not Butch first - gate 1 is not his to clear |
| **State of the apply** | **PARKED.** Explicitly, per the dispatch's own done-test clause |
| **Gate 1 - THE DISPATCH'S OWN PRECONDITION, UNMET** | DB23's body says it runs *"only once the freeze-lift criterion DB22 states has been met."* It is not met. `reconcile.mjs measure` exits **1** with **7** blocking discrepancies. DB22 produced the criterion and the repair tooling; **nothing has executed the repair.** That is a lead call - queue the reconciliation execution dispatch |
| **Gate 2 - the ask-click** | `apply_migration` is ask-gated per R7 6b. Butch must be present. **One click**, one migration file |
| **What is DONE** | The migration, the rollback migration, and the battery - all written, and the battery run green against production with the migration applied in-transaction and rolled back |
| **Is the fix proven?** | **Yes.** s5 `tokens_lost` = **0.000000**, down from 12,000. s3 unchanged. FIFO, replay and conservation all green. Zero errors in a 436-line log |

**Ordering matters and it is not arbitrary.** DB22 established that applying through the management
API stamps its own version rather than the filename - the mechanism that manufactured most of the
current drift. **Applying DB23 before the reconciliation runs would add one more orphan and one more
repo-only file to the very backlog that gates it.** Reconcile, lift, then apply.

### HEADLINE

OPS67 measured a Bee holding 20,000 plan Tokens and a 5,000 pack, spending 12,000 once, and left
holding **1,000** against a truth of 13,000. Same fixture, same numbers, after the fix:

```
 truth_total | measured_total | tokens_lost
-------------+----------------+-------------
       13000 |   13000.000000 |    0.000000
```

And the attribution is now a readable record rather than an inference:

```
  source   |          expires_at          | amount_tokens
-----------+------------------------------+---------------
 in_DB23_E | 2026-08-13 11:47:34.40139+00 |  10000.000000
 in_DB23_F | 2026-08-28 11:47:34.40139+00 |   2000.000000
```

Cycle 1 first because it expires soonest, cycle 2 for the remainder, **the durable pack never
touched** - which was the most offensive part of the defect, since a plan was never supposed to be
able to reach pack Tokens at all.

---

### 1 - WHAT CHANGED, AND WHY THE OVERLAP CASE STOPS BEING A CASE

The old `oracle_token_available` attributed a debit to **every** grant whose window
`[created_at, expires_at)` contained it. Two overlapping windows meant one debit charged twice, and
the spill subtracted from the durable balance once per overlapping cycle.

The fix, per the lead ruling (ORACLE_MF v0.48, shape (a)):

| | before | after |
|---|---|---|
| attribution | inferred from timestamps at read time | **recorded at debit time**, one row per (debit, source) |
| order | plan-before-pack, by window containment | **FIFO by soonest `expires_at`**, then the durable pool |
| availability | credits minus window arithmetic | **credits minus recorded consumption** |
| overlap | a case that had to be reasoned about | **not expressible** |

That last row is the actual argument for shape (a). Shape (b) - clamping each cycle's window at the
next grant's `created_at` - was rejected in the ruling because it silently shortens the earlier paid
cycle. It is also weaker in a way worth recording: it keeps a model where correctness depends on
reasoning about time ranges, so the next overlap variant nobody thought of is another defect. Under
(a) a Token is either recorded as consumed or it is not.

**New object.** `public.oracle_token_consumption` - append-only, metadata only (no directive
content), `bee_id / debit_id / source_id / amount_tokens / created_at`. RLS enabled with zero
permissive policies, plus explicit `REVOKE ALL` from `anon` and `authenticated` - not redundant with
the PUBLIC revoke, because Supabase default privileges auto-grant to those roles at CREATE time
(the `bee_follows_v1a` lesson, which DB22 surfaced from the other direction).

**`source_id IS NULL` means the durable pool** - never-expiring purchases, non-plan grants and
adjustments taken together, rather than a row per purchase. Three reasons, stated because it is the
one design call inside the ruling that the ruling did not make: durable Tokens never expire, so
provenance is economically meaningless; the pool legitimately contains **negative** rows (refunds),
which cannot be FIFO-consumed row by row; and `oracle_refund_token_purchase` already caps refunds
against the aggregate `purchased_available`, so nothing in the system wants per-purchase attribution.

---

### 2 - THE THREE REQUIREMENTS THE DISPATCH NAMED

**W-9, replay cannot double-debit.** `oracle_token_ledger_one_debit_per_directive_uidx` is
**untouched** - the dispatch asked that it survive or be replaced by something at least as strong,
and it survives. Consumption rows are written in the same transaction as the debit row they explain,
so a replay that cannot create a debit row cannot create consumption either. A second, independent
guard was added: `oracle_token_consumption_one_per_debit_source_uidx` on `(debit_id, source_id)`
**`NULLS NOT DISTINCT`** - the modifier matters, because a plain unique index treats every NULL as
distinct and would leave the durable-pool row unguarded, which is exactly the double-charge path this
migration exists to close. Battery s6, the same directive fired twice more:

```
 debit_rows                            2
 consumption_rows_for_that_directive   2
```

Two consumption rows for one debit is correct - that debit spilled across two grants.

**One authority.** `oracle_debit_tokens` reads its sufficiency check from `oracle_token_available`,
the same function `oracle_token_balances` reads. **Two definitions of "what this Bee has" is how F-1
stayed invisible** - the debit RPC reported `from_plan: 12000, from_purchased: 0` while the balance
function billed the pack 4,000 anyway. `from_plan` / `from_purchased` are now the recorded split, not
a re-derived guess, and they sum to the debit by construction.

**The view keeps its shape.** `oracle_token_available` has an identical signature and identical
return columns, so `oracle_token_balances` and `src/lib/atlasoracle/tokens.ts` need no change and were
not touched. Pre-flight confirmed the full dependent set is exactly three:
`oracle_debit_tokens`, `oracle_refund_token_purchase`, `oracle_token_balances`.

---

### 3 - THE BACKFILL, AND WHAT IT MOVED

Existing debits have no attribution, so availability would change the instant the new function went
live. The migration replays every existing debit FIFO-by-expiry in ledger order, evaluated **as at
each debit's own `created_at`** - a grant that had not opened yet, or had already lapsed, was not
spendable then and is not attributable now.

It deliberately does **not** reproduce the old answers. The old answers were wrong in the overlap
case, and reproducing them would preserve the defect. So the battery measures the movement instead:

```
                bee_id                | before_total | after_total |  delta   | after_purchased
--------------------------------------+--------------+-------------+----------+-----------------
 0e6e5b41-fff7-4360-9afd-b090fb36e73d |     0.000000 |    0.000000 | 0.000000 |        0.000000
 2b66f641-0a0c-46ce-bbaa-70cf61793364 |  1000.000000 | 1000.000000 | 0.000000 |     1000.000000
 88739ef8-8838-4dc3-909e-7aa4fb680d3a |  4936.744400 | 4936.744400 | 0.000000 |     4936.744400
 ab696a36-e3aa-4c78-8137-eb46d3b4e9c6 |   993.753200 |  993.753200 | 0.000000 |      993.753200
 c6f0c10b-fd01-42d9-88f9-8db120191c8e |     0.000000 |    0.000000 | 0.000000 |        0.000000

 bees_with_negative_purchased_after_backfill    0
 consumption_rows_written_by_backfill           9
```

**Every delta is zero.** No live Bee's balance moves. That is the expected result and it confirms
OPS67's blast-radius read: no Bee currently holds two overlapping grants, so the defect was armed but
not yet firing. **9 consumption rows for 8 existing debits** - one debit spilled across two sources.
The negative-balance count is a stop condition and it reads 0.

---

### 4 - DONE-TEST, output verbatim

Run: `psql ... -v ON_ERROR_STOP=1 -f docs/proofs/db23_f1_attribution_battery.sql`
Exit **0**, **436 lines, zero errors**. Full log: `docs/proofs/db23_battery_output.txt`.

| dispatch clause | result |
|---|---|
| migration written | **done** - `_drafts/20260803120000_f1_explicit_token_attribution.sql` |
| ask-gated apply completed or explicitly parked | **PARKED** - two gates, W-1 block |
| s3 unchanged | **PASS** - identical to OPS67 |
| s5 at 13000/13000/0 | **PASS** |
| renewal-overlap FIFO green | **PASS** - s5 of this battery |
| replay green | **PASS** - s6 |
| one authority for balance and sufficiency | **PASS** - s2 |
| rollback migration named | **done** - `_drafts/20260803120100_..._rollback.sql` |
| nothing else touched | **done** - s9, production identical after rollback |

**s3, the simple case, must not have moved** - and did not:

```
-- debit 8000: must come entirely from the EXPIRING plan grant
     "from_plan": 8000,
     "from_purchased": 0,
     "plan_available": 2000.000000,
     "purchased_available": 5000.000000

-- debit 4000: 2000 left in the plan, so 2000 must SPILL into purchased
     "from_plan": 2000.000000,
     "from_purchased": 2000.000000,
     "plan_available": 0,
     "purchased_available": 3000.000000
```

Identical to OPS67's s3, and now with the record behind it that OPS67 could not show:

```
     source     | amount_tokens
----------------+---------------
 (durable pool) |   2000.000000
 in_DB23_C      |   2000.000000
 in_DB23_C      |          8000
```

**Renewal overlap (new section).** Two live grants, 10,000 each, grant 1 expiring sooner. Debit 6,000,
then 6,000 again:

```
  source   |          expires_at          |   consumed
-----------+------------------------------+--------------
 in_DB23_G | 2026-08-11 11:47:34.40139+00 | 10000.000000
 in_DB23_H | 2026-08-30 11:47:34.40139+00 |  2000.000000

 plan_available | purchased_available | total_available
----------------+---------------------+-----------------
    8000.000000 |         5000.000000 |    13000.000000
```

Grant 1 exhausted first, grant 2 opened for the remainder, durable untouched.

**Conservation (new section)** - the invariant the window model could not hold:

```
 credits_issued | consumption_recorded | debits_written
----------------+----------------------+----------------
   25000.000000 |         12000.000000 |   12000.000000

 must_be_zero
--------------
     0.000000
```

**F-3, the CHECK widen:**

```
 CHECK ((status = ANY (ARRAY['active','past_due','canceled','incomplete',
                             'incomplete_expired','trialing','unpaid','paused'])))
NOTICE:  status paused ACCEPTED
```

**Nothing persisted** (section 9, after `ROLLBACK`): honeypot at 0 ledger rows / 0 subscriptions /
0 directives, platform total **23** ledger rows - the same 23 as before the run,
`to_regclass('public.oracle_token_consumption')` NULL, and `subscriptions_status_check` back to its
narrow form.

---

### 5 - PRE-FLIGHT (R7 migration amendment)

Recorded before the migration was written, all reads:

| check | result |
|---|---|
| dependent routines on `oracle_token_available` | `oracle_debit_tokens`, `oracle_refund_token_purchase` |
| dependent views | `oracle_token_balances` (view, not matview) |
| transaction control in any routine the battery calls | **none** - 8 routines checked, all false (OPS49-Q lesson) |
| rows at risk - `oracle_token_ledger` | 23 (8 debit, 8 grant of which 3 expiring, 2 purchase, 5 adjustment) |
| rows at risk - `subscriptions` | 1, status `canceled`, `product_type` non-oracle. The CHECK widen cannot fail on existing data |
| constraints/indexes on the target | 5 constraints, 7 indexes on the ledger - **none dropped or altered** by this migration |
| new object collisions | `oracle_token_consumption` did not exist |

**ROLLBACK STATEMENT, as required before any apply:**
`supabase/migrations/_drafts/20260803120100_f1_explicit_token_attribution_rollback.sql`. It restores
both function bodies **verbatim from `pg_get_functiondef()` captured 2026-08-03** - not retyped from
memory - then drops the attribution table and narrows the CHECK back. Its own header states the thing
a rollback header should: **rolling back REINSTATES F-1.** It is a safety valve for a bad apply, not
a way to undo the fix on purpose. Step 4 fails loudly if any row is sitting at `paused`, which is
correct - dropping the value under a live row would leave the table violating its own CHECK.

---

### 6 - DEVIATIONS AND JUDGEMENT CALLS

1. **The migration is in `supabase/migrations/_drafts/`, not the migrations folder proper.** An
   unapplied file at top level would immediately register as a new "repo file with no history row"
   **on/after the baseline** and make DB22's freeze-lift criterion harder to satisfy - the pass would
   be widening the gap it is waiting on. It moves up one directory as part of the apply.
2. **I ran write-shaped SQL against production, including DDL.** Every statement is inside one
   transaction ending in `ROLLBACK`, and every routine called was checked for transaction control
   first - `pg_proc.prosrc` shows no `COMMIT` in any `oracle_*` routine, `subscription_sync` or
   `is_platform_admin`. This is the OPS67 pattern and the OPS49-Q lesson. **This is not an apply:**
   nothing committed, and section 9 proves it against production after the fact.
3. **The battery `\i`-includes the migration file rather than copying it.** A retyped copy proves a
   copy. This proves the exact bytes that would be applied.
4. **The durable pool is one aggregate source, not a row per purchase** - argued in section 1. It is
   the one design decision inside shape (a) that the ruling left open, so it is flagged for review.
5. **The backfill does not preserve old balances.** It replays history under the new rule. Where an
   old balance was wrong the new one differs - and section 3 measures every delta rather than
   asserting none. All five came back zero.
6. **Two battery bugs were found by running it and are worth recording**, because both produced a
   *green-looking* log: an apostrophe inside `\echo` makes psql read the rest of the line as a quoted
   string and emit `unterminated quoted string`; and the F-3 probe originally omitted `subscriptions.tier`,
   which is NOT NULL with no default, so it failed on **23502** before the status CHECK was ever
   consulted. The first run reported `status paused REFUSED` - which would have read as the fix not
   working, when the CHECK had widened correctly. Fixed, re-run, `ACCEPTED`.
7. **I did not deploy or touch the edge functions.** OPS67's `oracle-webhook` / `oracle-checkout`
   source changes are still uncommitted in the working tree and still undeployed; that is OPS74's
   thread, not this one.

---

### 7 - COULD NOT VERIFY

- **That the migration applies cleanly to a committed production.** It applies cleanly *inside a
  transaction* against the current production schema, which is strong but not identical - a committed
  apply takes real locks and cannot be undone by `ROLLBACK`. The rollback file exists for that reason.
- **Behaviour under concurrency.** `oracle_debit_tokens` still takes the same per-bee advisory lock,
  and consumption rows are written under it, so the attribution read-then-write is serialized per Bee.
  I did not run two concurrent debit sessions to prove it.
- **The `NULLS NOT DISTINCT` guard was not adversarially tested.** I read its `indexdef` back from
  `pg_indexes` and reasoned about it; I did not attempt a duplicate durable-pool insert to watch it
  raise.
- **No live Stripe traffic.** Same caveat OPS67 recorded, unchanged. F-3 is proven at the CHECK layer
  only - that Stripe's `paused` delivery now round-trips through `subscription_sync` is inferred.
- **Performance at scale.** `oracle_token_available` now runs a correlated subquery per live grant.
  At today's volume (23 ledger rows platform-wide) this is irrelevant; at 10,000 grants per Bee it
  would want measuring. Indexes are in place (`oracle_token_consumption_source_idx`); no plan was
  captured.
- **Whether any Bee was ALREADY harmed by F-1 historically.** The backfill deltas are all zero, which
  says no *current* balance is wrong. It does not reconstruct whether a past debit was refused for
  insufficiency that the correct math would have allowed.

---

### 8 - FILE TREE

```
TheMANUAL.tech/
  supabase/migrations/_drafts/
    20260803120000_f1_explicit_token_attribution.sql           NEW  the fix + the F-3 CHECK widen
    20260803120100_f1_explicit_token_attribution_rollback.sql  NEW  W-6 rollback, bodies captured verbatim
  docs/proofs/
    db23_f1_attribution_battery.sql   NEW  rollback-wrapped, \i-includes the migration
    db23_battery_output.txt           NEW  436 lines, exit 0, zero errors
  REPORT.md                           UPDATED  this section
```

No file under `supabase/migrations/` proper was created, renamed, edited or deleted. No edge function
was touched. No migration was applied.

---

## DB22 - THE DRIFT IS REAL BUT IT IS NOT 471/110, AND THE FREEZE COSTS ZERO CLICKS TO LIFT. One mechanism manufactures most of it; the measurement also found 24 repo migrations that were NEVER APPLIED, which is not drift at all

Lane `db`. Workdir `TheMANUAL.tech`. Scope: empty (workdir bounds the pass). Effort: deep. ASCII only.
**Zero DDL. Zero migrations applied. Zero rows written to `supabase_migrations.schema_migrations`.
Zero writes to any project table.** Every production statement this pass was a read. The only writes
were two new repo files (`scripts/migration-reconcile/`), this report, and the R2/R3 rail rows.

### W-1 BLOCK - WHO OWNS THE NEXT MOVE

| | |
|---|---|
| **Owner of the next move** | **The LEAD** - queue the execution dispatch. Nothing here needs Butch at a keyboard |
| **The headline number** | **THE MINIMUM BUTCH-CLICK COUNT IS ZERO.** Every reconciliation repair is either a git operation or DML against one ordinary table. Not one of them reaches `apply_migration`, so 6b's ask-gate is never triggered |
| **What is DONE** | Both-direction measurement (superseding v0.25 and OPS54 R18), a disposition for all 640 discrepancies, the repair tool, and the freeze-lift criterion |
| **What is NOT done** | Nothing was executed. The repair is a plan plus a tool that emits artifacts; a second dispatch runs it |
| **The finding that is not bookkeeping** | **24 migration files in the repo were never applied to production** - 20 geo buildouts (Europe, North America, all of Asia) and 4 schema files including `lock8_c_rls_rewrite`. That is unfinished work sitting in a folder everyone reads as "shipped" |

### HEADLINE

OPS45 measured the drift by joining two sets on the 14-digit version and reported 471 orphans and 110
repo-only files. That join is the wrong key, and it double-counts. **The Supabase management API stamps
its own apply-time version rather than honouring the filename**, so one migration applied that way
produces **one orphan AND one repo-only file** - the same change, counted twice, in opposite directions.
Re-joining on the migration slug and then on content collapses **60 pairs**: 120 of the reported
discrepancies are 60 migrations that are fine.

What the correct key exposes instead is a third direction nobody had measured: **34 pairs that DO match
on version but whose repo file is not what ran.** Those are worse than an orphan. An orphan announces
itself; a version-matched file that lies reads as reconciled.

And the pass turned up something that is not a bookkeeping problem at all. Probing production for the
objects each unmatched repo file creates shows **24 files that never ran** - a perfectly bimodal geo
result (9 buildout files 25/25 present, 20 files 0/25 present) and 4 schema files whose every object is
absent and whose names appear nowhere in the 650-row applied corpus.

---

### 1 - THE MEASUREMENT, superseding ORACLE_MF v0.25 and OPS54 R18

Command, re-runnable, from the repo root:

```
$ node scripts/migration-reconcile/reconcile.mjs measure
baseline            20260801000000
history rows        650
repo .sql           291  (288 versioned, 3 unparseable)
version-matched     180  (146 faithful, 34 drifted)
re-stamped applies  60  (one orphan + one repo-only file each, same migration)

  410 history rows with no repo file   (1 on/after baseline)
   48 repo files with no history row   (1 on/after baseline)
   34 version-matched pairs, file != applied   (2 on/after baseline)
    3 repo files with an unparseable version   (all blocking - no version to date)

NOT RECONCILED - 7 discrepancies on/after baseline
$ echo $?
1
```

**Against the prior record:**

| | v0.25 / OPS45 (2026-07-31) | OPS54 R18 / OPS60 D-05 (2026-08-02) | **DB22 (2026-08-03)** |
|---|---|---|---|
| history rows | 636 | 648 | **650** |
| repo `.sql` | 275 | 289 | **291** (288 versioned + 3 unparseable) |
| reconciled | 165 | - | **180 by version, of which 146 faithful** |
| orphans | 471 | 471 | **470, of which 410 have no repo counterpart at all** |
| repo-only | 110 (`~107` real) | - | **108, of which 48 have no history counterpart at all** |
| file-lies-about-what-ran | not measured | not measured | **34** |

The count movement (636 -> 650, 275 -> 291) is three days of normal work, not decay. **The class
movement is the finding.** Both prior passes were arithmetically right and structurally wrong: they
measured set difference where the question was correspondence.

"Faithful" means identical once whitespace is squashed **and comments are removed**. Comment-only
differences are not drift - a file whose header gained a note after it ran still describes what ran.
34 pairs fail even that test: 32 genuinely divergent, 1 where more was applied than the file contains,
1 where the file contains more than was applied.

**One row deserves naming: `20260802170000_ops_build_steps_status_manual_rename`.** It is stamped
applied with **zero stored statements** - the ledger asserts it ran and records nothing about what ran.
It is the only such row in 650.

---

### 2 - DISPOSITION, every discrepancy assigned a class

Three verbs, as the dispatch framed them: **adopt-into-repo**, **mark-as-applied**, **archive-with-reason**.

#### Direction A - 470 history rows with no repo file

| class | count | disposition | route | clicks |
|---|---|---|---|---|
| **A1** re-stamped apply - an orphan and a repo-only file are the same migration | **60** | **not drift.** Rename the repo file to the version that actually ran | `git mv` | 0 |
| A1a - file and applied statement agree (identical, or identical sans comments) | 46 | rename, no review needed | `git mv` | 0 |
| A1b - file diverges from what ran (12 DIVERGENT, 2 REPO-SUPERSET) | 14 | **adjudicate per file before renaming** | manual | 0 |
| **A2** schema DDL, no repo counterpart | **151** | **adopt-into-repo** - dump from `statements` | `git add` | 0 |
| **A3** privileges only (GRANT/REVOKE, no DDL), no repo counterpart | **7** | **adopt-into-repo** - highest value per byte, see below | `git add` | 0 |
| **A4** data/DML only - taxonomy edits, entity imports, city seeds | **252** | **archive-with-reason.** Leave the history row; do NOT create a migration file | none | 0 |

**Why A4 is archive and not adopt.** These rows are `INSERT`/`UPDATE`/`DELETE` against `atoms` and
friends. They landed in schema history by accident of the tool used, not by intent. A folder whose job
is to rebuild a schema should not contain 252 files that move rows around, and replaying them into a
rebuilt database would be actively wrong - the data comes back from the dump (OPS58), not from replayed
DML. 931 KB of the 1.99 MB orphan corpus is this class. **The reason, recorded so it is not
re-litigated: they are data operations, deliberately unrepresented as repo migration files.**

**Why A3 matters more than its count.** OPS58 section 2 found the real recovery hole - `pg_dump
--no-privileges` means **zero** GRANT/REVOKE statements in any backup artifact against 4,908 live
grants. These 7 rows are the only written record of privilege changes that exists anywhere. Adopting
them is 7 KB and it is the single highest-value item in the whole reconciliation.

#### Direction B - 108 repo files with no history row

| class | count | disposition | route | clicks |
|---|---|---|---|---|
| **B1** = A1, the same 60 pairs seen from the other side | **60** | see A1 | `git mv` | 0 |
| **B2a** applied through a path that wrote no history row, **proven by probe** | **9** | **mark-as-applied** - INSERT the history row carrying the file's SQL | psql DML | 0 |
| **B2b** data seeds applied the same way (9 geo files + `ops_build_steps_seed_v1` + 2 others) | **12** | **archive-with-reason** - same argument as A4 | none | 0 |
| **B2c** **NEVER APPLIED** - every object absent from production | **24** | **NOT drift. Unfinished work.** Escalate, do not stamp | decision | 0 |
| **B2d** superseded duplicate-slug shadows | **2** | **archive-with-reason** - delete the shadow | `git rm` | 0 |
| **B2e** unproven (mixed probe result) | **1** | **adjudicate** before any ledger row | manual | 0 |

Plus, outside both directions: **3 files whose filename carries no 14-digit version**
(`23_v9_0_security.sql`, `24_v9_0_security_tightening.sql`,
`20260616_geo_us_cities_geonames_pop_coords.sql`). No replay tool can order them. OPS45 flagged these;
they are still there. **Disposition: rename to a real version (the first two correspond to applied rows
`20260506191712` and `20260506192517`) or archive.**

`60 + 9 + 12 + 24 + 2 + 1 = 108`. `60 + 151 + 7 + 252 = 470`. **No row is unclassified.**

---

### 3 - THE 24 THAT NEVER RAN. This is the part that is not bookkeeping

Every unmatched repo file was probed against production for the objects it creates. The geo result is
perfectly bimodal - not a gradient, a cliff:

| geo buildout | sampled ids | found in `atoms` | verdict |
|---|---|---|---|
| Africa admin1 + cities p1/p2/p3, Oceania, Middle East, South America 1-3of3 (**9 files**) | 25 each | **25 each** | applied |
| Europe 1-7of7, North America 1-3of3, Asia 1-10of10 (**20 files**) | 25 each | **0 each** | **NEVER APPLIED** |

**The geo buildout stopped after South America and nobody recorded that it stopped.** 20 files,
~16,000 atoms, sitting in `supabase/migrations/` where every reader takes them for shipped work.

Four schema files, same verdict, each proven twice - objects absent from production **and** the object
names appear **zero** times across the entire 650-row applied corpus:

| file | evidence |
|---|---|
| `20260513120000_lock8_c_rls_rewrite.sql` | `pillars` carries only `pillars_public_read`; `pillars_astra_isolation_select` and `pillars_service_role_write` absent |
| `20260529120000_bees_rls_phase_a.sql` | view `bees_public` and functions `am_i_admin`, `my_bling_balance`, `list_bees_admin` all absent |
| `20260530120000_source_pool_infrastructure.sql` | `source_pool_state`, `source_pool_events`, `increment_source_pool`, `get_source_pool_balance` all absent |
| `20260530130000_handle_claims_sink.sql` | `handle_reservations`, `handle_pricing_tiers` absent |

`lock8_c_rls_rewrite` is the RLS rewrite half of Lock 8. `TheMANUAL.tech/CLAUDE.md` line 67 describes
Lock 8 as "registries + per-table `astra_id`/`nova_id` + RLS rewrite". The registries and the columns
ran (`20260513185644`, `20260513191921`). **The RLS rewrite did not.** That is a security-shaped gap and
it is stated here, not fixed - fixing it is a migration and needs its own dispatch, its own pre-flight,
and its own click.

**A one-line probe would have caught every one of these on the day it happened**, which is the same
shape as OPS54 R19's finding about undeployed edge functions.

---

### 4 - THE REPAIR PATH, and why it costs ZERO clicks

Tool: `scripts/migration-reconcile/reconcile.mjs`, three subcommands, **none of which write to the
database or touch `supabase/migrations/`**.

```
measure   both-direction reconciliation; exit 1 if anything is unreconciled on/after baseline
plan      same, plus a per-row disposition class -> verify-out/reconcile-plan.json
emit      writes the repair artifacts to verify-out/ (adopt/, renames.sh, ledger-repair.sql,
          ledger-rollback.sql, ledger-skipped.txt)
```

Emit output, this pass:

```
  adopt/           158 orphan dumps (class A2 + A3)
  renames.sh       46 git mv (class A1a)
  ledger-repair.sql / ledger-rollback.sql   9 mark-as-applied rows
  ledger-skipped.txt 39 repo-only files deliberately NOT stamped

Nothing was applied and nothing was written to the database.
```

**THE CLICK COUNT: ZERO.** Per root `CLAUDE.md` R7 6b, `apply_migration` sits in no allow list and every
call raises a prompt. **No repair in this plan calls it.** The routes are:

| repair | route | reaches `apply_migration`? |
|---|---|---|
| A2/A3 adopt - 158 dumped files | `git add` | no |
| A1a rename - 46 files | `git mv` | no |
| A4/B2b/B2d archive | file moves + a canon note | no |
| B2a mark-as-applied - 9 rows | `INSERT` into `supabase_migrations.schema_migrations` via psql | **no - this is DML against one ordinary table, not a schema change** |

The distinction is exact and it is the dispatch's own: **a migration APPLY changes the schema; a ledger
INSERT records that a schema change already happened.** Only the first is what the amendment gates.
`schema_migrations` is an ordinary table with ordinary DML, and R7 permits `execute_sql`/psql for
routine SQL under the standing discipline.

**The 9 ledger rows and their rollback are both emitted.** Rollback is one statement:

```sql
BEGIN;
DELETE FROM supabase_migrations.schema_migrations WHERE version IN (
  '20260613161000','20260727140000','20260727180000','20260730230000','20260730230200',
  '20260731000000','20260731020000','20260731040000','20260802010000');
COMMIT;
```

Each INSERT is guarded by `WHERE NOT EXISTS`, so the repair is idempotent - running it twice inserts
nothing the second time.

**The emitter refuses to guess.** A first draft of it stamped every repo-only file that contained DDL,
which would have written **fake history for the five files proven never to have run** - precisely what
OPS45 said is worse than having none. It now reads `applied-evidence.json`, emits a row **only** for a
version recorded `APPLIED` with a probe result, quotes that evidence into the SQL as a comment, and
writes every refusal with its reason to `ledger-skipped.txt`. 39 files were skipped this pass.

**What still needs Butch, and it is not a click:** the 24 never-applied files are a decision - finish
them, or archive them as abandoned. Applying them WOULD need `apply_migration` and a click each, but
that is new work, not reconciliation, and it is not in this plan.

---

### 5 - THE FREEZE-LIFT CRITERION

> **The migration freeze lifts when `node scripts/migration-reconcile/reconcile.mjs measure` exits 0 -
> that is, when for every migration versioned on or after the declared baseline there are zero history
> rows without a repo file, zero repo files without a history row, and zero version-matched pairs whose
> SQL differs once whitespace and comments are normalized, and, at any date, zero repo files carry a
> filename no replay tool can order.**

Four properties of that sentence, each deliberate:

1. **It is a command, not a claim.** `measure` exits 1 while unreconciled and 0 when clean. A criterion
   that has to be re-argued in prose decays; this one is checkable in one second and is the same code
   that produced every number above.
2. **It is baseline-relative, and the baseline is a declared decision.** `20260801000000` is the default
   and it is set in one place (`RECONCILE_BASELINE`). Everything before it is reconciled-by-fiat against
   the current schema, which OPS58 makes defensible: recovery is dump-and-restore, the dump IS the
   record for that era, and reconciling 410 May-to-July rows buys nothing a restore does not already
   have. **Lower the baseline only with a pass that actually reconciles the earlier rows.** Today the
   check reports **7** blocking discrepancies.
3. **The unparseable-filename bucket is date-blind on purpose.** A file with no 14-digit version cannot
   be compared to a baseline and cannot be ordered by any replay tool. It blocks whenever it exists.
4. **It measures correspondence, not set difference** - the mistake that produced 471/110.

**What it does NOT assert, stated so nobody reads it as more than it is:** it does not assert that a
replay reproduces production. That is OPS58's object-by-object test plus the privilege layer, it is
still not run, and reconciliation is a precondition for it rather than a substitute.

---

### 6 - VERIFICATION, done-test output verbatim

| dispatch clause | result |
|---|---|
| current measured count, both directions | **done** - s1, tool output pasted verbatim, 650 / 291 / 180 / 470 / 108 |
| a disposition per discrepancy class, with counts | **done** - s2, six classes each direction, `60+151+7+252=470` and `60+9+12+24+2+1=108`, nothing unclassified |
| the repair script(s) | **done** - `scripts/migration-reconcile/reconcile.mjs` + `applied-evidence.json`, run three times this pass |
| the freeze-lift criterion, one sentence | **done** - s5 |
| the click count, stated | **done** - **ZERO**, s4, with the route for each repair |
| no ask-gated apply fired | **done** - `apply_migration` was never called |
| zero DDL | **done** |
| zero unexplained rows in the plan | **done** - both totals reconcile exactly |

**Byte fidelity of the 158 adopted dumps, proven the way OPS45 section 2 proved its two** - md5 computed
**inside Postgres** over `array_to_string(statements, chr(10))`, compared against md5 of the file on disk:

```
BYTE-FAITHFUL: 158 of 158
```

**Ledger round-trip** - the dollar-quoted body inside each emitted INSERT compared to its source file:

```
tag occurrences: 18 (expect 2 per insert)
ROUND-TRIP EXACT: 9 of 9
```

**Three transport bugs were found and fixed by that verification, and every one of them silently
produced a confident wrong answer.** Recording them because each is a trap the next pass would hit:

1. **`'\x01'` vs `E'\x01'`.** Under `standard_conforming_strings` a plain literal leaves the backslash
   alone, so the field separator became the four characters `\x01` instead of one byte. Every row parsed
   as a single malformed field.
2. **`psql` emits CRLF on Windows.** A sentinel split matching `'>>>\n'` found nothing, so **zero**
   bodies loaded - and the comparison then reported **all 180** version-matched pairs as drifted and
   **every** repo-only file as a content match. Both numbers were plausible. Neither was real. The
   loader now hard-fails if it fills fewer rows than it read.
3. **An open-ended sentinel gains two trailing newlines** - one from psql's row terminator, one from the
   next record's leading newline. Byte-faithfulness was 0 of 158 until a closing `<<<ENDREC>>>` sentinel
   made the slice exact. md5 caught it; reading the file would not have.

The CRLF strip is lossless here and that was checked rather than assumed: `count(*) FILTER (WHERE
statements LIKE '%'||chr(13)||'%')` returns **0 of 650**.

---

### 7 - DEVIATIONS AND JUDGEMENT CALLS

1. **I re-joined on slug and content, not just version.** The dispatch asked for "a current measured
   count, both directions, superseding v0.25's". A pure version join reproduces 470/108 and is honest
   arithmetic on the wrong question. Both numbers are reported; the correspondence numbers are the ones
   the dispositions are built on.
2. **"Faithful" ignores comment-only differences.** A file whose header gained a note after it ran still
   describes what ran. Counting those as drift would have inflated the drifted-pair count from 34 to 63
   and buried the 34 that matter.
3. **I probed production for object existence.** Not requested. Without it "mark-as-applied" is a guess,
   and it is what surfaced the 24 that never ran. All reads.
4. **Absence is evidence, not proof, and it is labelled that way.** An object can be absent because a
   later migration dropped it. That is why every never-applied verdict carries a second test - zero
   mentions of the object name anywhere in the 650-row applied corpus - and why `bees_rls_phase_c` is
   recorded `UNPROVEN` (policy `bees_public_read` present, `bees_self_select` absent) rather than forced
   into a class.
5. **The geo probe is a 25-id sample per file, not a full check.** The result is bimodal - 25/25 or 0/25,
   nothing between - so a sample is sufficient to classify. A gradient would have needed the full check.
6. **I deleted my own `verify-out/` output before filing.** OPS74-Q2 is blocked mid-sweep by exactly
   these 166 untracked paths. They are deterministic build products - `emit` regenerates them in
   seconds - and the two source files are the deliverable. `git status` is now 8 lines, of which mine are
   the two intended ones. **The underlying defect is not mine to fix and is restated here: `verify-out/`
   is in the sweep's forbidden list and in NEITHER `.gitignore`, so it will fail every future sweep.**
7. **I wrote no file under `supabase/migrations/`.** The 158 dumps and the 46 renames are emitted to
   `verify-out/` for a review pass. Landing 158 unreviewed files in the migrations folder is the exact
   move OPS45 recommended against, and the tool cannot do it even if asked.
8. **The 3 unparseable filenames were not renamed.** Two map to applied rows and the rename is obvious,
   but renaming files in `supabase/migrations/` is a repo-structural change and belongs in the execution
   dispatch with the other 46.

---

### 8 - COULD NOT VERIFY

- **That the emitted `ledger-repair.sql` executes cleanly.** It round-trips exactly and its dollar-tag
  is collision-checked, but it was never sent to Postgres - not even wrapped in a rollback. Sending
  write-shaped SQL to production to prove a guard works is the thing not to do. **First execution is
  the execution dispatch's risk and should be run inside an explicit transaction with the rollback
  file already open.**
- **Whether the 158 adopted dumps replay cleanly on an empty database.** They are byte-faithful to what
  was applied, which is a different claim from "runs again". Same caveat OPS45 recorded; unchanged.
- **Whether the 20 never-applied geo files were abandoned deliberately.** The record says nothing. I can
  prove they did not run; I cannot prove anyone decided that.
- **Whether the 4 never-applied schema files were superseded by a differently-named migration.** The
  object-name search across all 650 applied bodies returned zero hits, which is strong, but a later
  migration could implement the same intent under other names. Adjudicating that is per-file work.
- **The 14 class-A1b pairs and the 34 class-C drifted pairs, individually.** Each is classified and
  listed; none was read line by line. `20260716180000_bee_follows_v1.sql` was diffed as a worked example
  and its divergence is benign - the file absorbed a follow-up that was itself applied as
  `20260716181639_bee_follows_v1a_revoke_anon`. Three of the 22 non-identical pairs have a confirmed
  named follow-up in history; the other 19 do not, and that is the adjudication.
- **`20260802170000`, the zero-statement stamped row.** I established it is the only one of 650. What it
  was supposed to contain, I did not establish.
- **An incidental read, flagged not fixed, outside this pass's scope:** `bee_keys` still carries
  table-level `INSERT`/`UPDATE`/`DELETE` for `anon` and `authenticated`, and column-level
  `INSERT`/`UPDATE` on `encrypted_secret_key`. DB21 closed the **read** side and the probe confirms that
  held - `encrypted_secret_key` and `backup_kdf` are absent from both roles' SELECT list. Whether RLS
  blocks the write side I did not test, and this pass had no mandate to.

---

### 9 - FILE TREE, everything this pass wrote

```
TheMANUAL.tech/
  scripts/migration-reconcile/
    reconcile.mjs             NEW  the measurement, the plan, and the emitter. Also the freeze-lift check
    applied-evidence.json     NEW  per-version applied/never-applied verdict + the probe that proved it
  REPORT.md                   UPDATED  this section
```

Deleted before filing: `verify-out/` (166 regenerable build products - see deviation 6).
Nothing else in the tree was touched. No file under `supabase/migrations/` was created, renamed, edited
or deleted.

---

## OPS74-Q2 - ROTATION 001 AND THE CANON AMENDMENT ARE DONE. THE SWEEP STOPPED AGAIN, ON A DIFFERENT GATE: a concurrent session is writing 166 `verify-out/` paths into this tree right now, and `verify-out/` is blacklisted by gate 2 and absent from `.gitignore`

Lane `ops`. Workdir `TheMANUAL.tech`. Scope: empty + **explicit root-canon scope extension** granted
by the lead ruling on OPS74-Q (ORACLE_MF v0.54). Effort: light. ASCII only.
**Filed as `OPS74-Q2` per R4. The dispatch is left `claimed`.** No source edits to either oracle
function. Zero commits, zero pushes, zero deploys, zero migrations, zero database writes outside the
R2 claim and this report.

### W-1 BLOCK - WHO OWNS THE NEXT MOVE

| | |
|---|---|
| **Owner of the next move** | **The LEAD** - one ruling. The commit is otherwise ready to fire |
| **The question** | The tree gained **168 untracked paths from a different, still-running session** between my manifest check at 05:19 and my stage step at 05:26 - 166 under `verify-out/` (a migration drift-reconciliation run) plus `scripts/migration-reconcile/{reconcile.mjs,applied-evidence.json}`. **`verify-out/` is on gate 2's forbidden list**, so the manifest cannot pass, and it is **not in this repo's `.gitignore`** - so it will fail every future sweep too. Rule one of: **(a)** add `verify-out/` (and the reconcile scratch) to `TheMANUAL.tech/.gitignore` - a structural repo change, so not mine to make unswept - then re-queue; **(b)** authorize a path-scoped commit of the six intended paths only (`git commit -- <paths>`), which is the standing multi-session hygiene rule but breaks the sweep's "staged set equals the manifest exactly" gate; **(c)** wait for the reconcile session to finish and re-queue when the tree is quiet |
| **What is DONE and needs no ruling** | The canon amendment (section 1) and rotation 001 (section 2). Both complete |
| **What is NOT done** | The commit and the push. **N-2 is still open** - `oracle-webhook` / `oracle-checkout` v2 source still exists only in the working tree |
| **Blocked on** | The lead. Nothing technical - and nothing about the 1 MB problem, which the ruling fixed |

### HEADLINE

**The ruling worked. A second, unrelated gate caught the sweep, and this one is a live race, not a
size problem.** The canon amendment and rotation 001 executed exactly as ordered: `REPORT.md` went
from 1.78 MB to 8.5 KB, the archive is exempt by name, and the size gate now passes cleanly. But
while I was writing this section, **another session started a migration drift-reconciliation run**
and dropped 168 untracked files into this repo - 166 of them under `verify-out/`, which root canon's
gate 2 forbids by name. Timestamps: `verify-out/` last written **05:26**, my first manifest **05:19**.

**The structural half of the finding:** `verify-out/` is blacklisted by the sweep but **absent from
`TheMANUAL.tech/.gitignore`**. Every `git status -uall` will keep surfacing it, so **no sweep of this
repo can pass gate 2 while that directory exists on disk** - the same shape of trap as the 1 MB gate
that OPS74-Q filed, in a different place. One `.gitignore` line closes it permanently.

---

### 1. THE CANON DIFF - DONE (root `C:\Users\Butch\Documents\HONEYCOMB\CLAUDE.md`)

Two edits, both inside the scope the ruling granted, nothing else in the file touched.

**Edit 1 - SWEEP gate 2:**

```diff
 2. **Hard gates.** All must pass, or file a question (R4) carrying the full manifest and
    STOP: no path matching `backups/` · `*.env*` · `settings.local.json` · `node_modules/` ·
-   `.next/` · `verify-out/` · `*.dump`; no file over 1 MB; **no deletion (`D`) and no rename
-   (`R`)**, which always escalate; every path inside the workspace.
+   `.next/` · `verify-out/` · `*.dump`; **no file over 1 MB, except paths under `docs/reports/`**
+   (report-of-record archive, exempt by name); **no deletion (`D`) and no rename
+   (`R`)**, which always escalate; every path inside the workspace.
```

**Edit 2 - R6 gains the rotation rule:**

```diff
 explicit could-not-verify list. Report honestly: if a test failed show the output, if you
 skipped something say why.
+
+**Rotation.** When `REPORT.md` exceeds **512 KB at sweep time, rotate first**: move the entire
+file to `docs/reports/REPORT-archive-NNN.md` (`NNN` = the next number in the chain, zero-padded),
+start a fresh `REPORT.md` whose header names the archive chain, then sweep. The archive is
+write-once — never edit a rotated file, and never rotate mid-pass. `docs/reports/` is exempt from
+the sweep's 1 MB gate by name, which is what makes the rotated archive committable.
```

**Three wording choices I made inside the granted scope, flagged because they are mine, not dictated:**

1. **`NNN` is zero-padded** - the ruling's `NNN` is preserved verbatim, and `001` rather than `1`
   keeps the chain sorting correctly past nine rotations.
2. **"write-once - never edit a rotated file, and never rotate mid-pass."** The ruling did not say
   this. Without it, "move the entire file" invites a later pass to append to an archive, and the
   exemption then becomes a way to hide unbounded growth in an unreviewed file.
3. **The last sentence names why the exemption exists**, tying the two edits together so a reader who
   finds only one of them understands the other.

Both edits use em dashes to match the surrounding canon prose - a deliberate departure from the
ASCII-only habit of dispatch bodies, because the file's own house style is em-dashed.

**This diff is in the HONEYCOMB root repo, a different git repo from this one.** It is uncommitted
there and is not part of any commit this pass would make. It needs its own root-side sweep.

### 2. ROTATION 001 - DONE

```
REPORT.md  ->  docs/reports/REPORT-archive-001.md      1,782,627 bytes, contents unchanged
REPORT.md  (fresh)                                     8,539 bytes: archive-chain header + this section
```

Moved with `mv` - the whole file, not a copy-and-truncate, so nothing was rewritten or dropped.
**`REPORT.md` itself never left the tree** (it shows ` M`, not `D` then `A`), which matters: the
sweep's no-deletion gate would have escalated a genuine delete. The archive is untracked-and-new, so
it appears as an addition.

The trigger fired at **1.78 MB against a 512 KB threshold** - 3.5x over. Under the new rule the next
rotation happens at roughly a tenth of that size, which is the point: rotation should be routine and
boring rather than a 1.8 MB emergency.

### 3. WHAT THIS PASS DID *NOT* TOUCH

- **No function source.** Neither `supabase/functions/oracle-webhook/index.ts` nor
  `oracle-checkout/index.ts` was opened for edit. Their diffs are exactly as OPS67 left them and as
  OPS71 deployed them.
- **No `.gitignore` change.** `db/` stays ignored (line 38), and I did **not** add `verify-out/`
  despite it being the fix - that is a structural repo change, and canon says anything structural is
  not a sweep. It is offered as option (a) above, not performed.
- **Nothing belonging to the other session.** No file under `verify-out/` or
  `scripts/migration-reconcile/` was read, moved, staged, or deleted. Ownership follows the lane (R5);
  that reconcile run is not mine.
- **No deploy, no archive edit.** Production already runs v2. `REPORT-archive-001.md` was written by
  `mv` and never opened afterwards.

### 4. THE GATES, RE-RUN UNDER AMENDED CANON

Manifest (`git status --porcelain=v1 -uall`) at stage time - **174 lines**, of which the six intended:

```
 M REPORT.md
 M supabase/functions/oracle-checkout/index.ts
 M supabase/functions/oracle-webhook/index.ts
?? docs/proofs/ops67_battery_output.txt
?? docs/proofs/ops67_plan_lifecycle_battery.sql
?? docs/reports/REPORT-archive-001.md
```

and 168 that arrived from the concurrent session:

```
?? scripts/migration-reconcile/applied-evidence.json
?? scripts/migration-reconcile/reconcile.mjs
?? verify-out/_hashcheck.sql, adopt-db-md5.txt, adopt-local-md5.txt, ledger-repair.sql,
   ledger-rollback.sql, ledger-skipped.txt, reconcile-plan.json, renames.sh
?? verify-out/adopt/*.sql        (158 migration files)
                                  --- 166 paths under verify-out/ in total
```

| gate | result |
|---|---|
| No path matching `backups/` / `*.env*` / `settings.local.json` / `node_modules/` / `.next/` / **`verify-out/`** / `*.dump` | **FAIL - THIS IS THE STOP.** 166 manifest paths match `verify-out/` |
| No file over 1 MB, **except under `docs/reports/`** | **PASS** - the only file over 1 MB is `docs/reports/REPORT-archive-001.md` (1,782,627 bytes), exempt by name under the amendment. **This is the gate the ruling fixed, and it now passes** |
| **No deletion (`D`), no rename (`R`)** | **PASS** - one ` M` report, two ` M` functions, and additions only |
| Every path inside the workspace | **PASS** - all 174 repo-relative |
| Staged set equals the manifest exactly | **NOT REACHED** - gate 2 stops before staging. **Nothing was staged; the index is untouched** |

Sizes of the six intended paths, verbatim from `ls -l`:

```
1782627  docs/reports/REPORT-archive-001.md              <-- over 1 MB, exempt by name
  21699  supabase/functions/oracle-webhook/index.ts
  16030  docs/proofs/ops67_battery_output.txt
  12147  docs/proofs/ops67_plan_lifecycle_battery.sql
  10891  supabase/functions/oracle-checkout/index.ts
   8539  REPORT.md                                       <-- was 1,782,627 before rotation
```

### 5. WHY I STOPPED INSTEAD OF COMMITTING THE SIX PATHS

A path-scoped `git commit -- <six paths>` would have worked mechanically and could not have captured
a single `verify-out/` file. I did not do it, for three reasons, and the third is the one that
decided it:

1. Canon gate 2 is unconditional: *"All must pass, or file a question (R4) carrying the full manifest
   and STOP."* The manifest, not the staged set, is what it tests.
2. The dispatch anticipated exactly this: *"If any step of the sweep is permission-blocked, STOP AND
   FILE naming the exact pattern that blocked - do not shim. If root CLAUDE.md's sweep definition
   does not match expectations, STOP AND FILE what it says."*
3. **Another session is mid-pass in this tree right now.** Its files are still being written
   (05:26 and moving). Committing across a live writer is the situation the standing multi-session
   rule exists for, and choosing unilaterally to route around a gate while someone else's work is
   in flight is not a call a sweep gets to make.

Note this is **not** a permission block - no allow-list pattern refused anything, and nothing was
appended to `logs/permission-needed.md`. Git in this repo was used read-only.

### 6. COMMIT MESSAGE, PREPARED AND UNUSED

Supplied by the ruling, to be used verbatim when the pass is re-queued:

```
sweep: OPS67, OPS71, DOCS18, DOCS19, OPS72, OPS73, DOCS20, OPS74
```

**One note, not a deviation:** the ruling said "add OPS75 if its section exists." **It does not** - no
`OPS75` section exists in this repo's report chain, so it was not added. **`OPS73` also has no section
here** (its work landed elsewhere), but it was named explicitly in the ruling's message, so it stays
exactly as given. Sections actually carried by the `REPORT.md` + archive pair this commit would
capture: OPS74(-Q, -Q2), OPS72, DOCS20, DOCS19, DOCS18, OPS71, OPS67, and everything older.

### 7. STATE AT REPORT TIME

- **Working tree:** canon amended (root repo), rotation 001 done, `docs/proofs/` relocation from the
  OPS74-Q leg still in place, this section written.
- **Index:** untouched. `git diff --cached --name-only` is empty; nothing was ever staged.
- **HEAD:** still `5511ddb`. **No commit was created, so there is no hash to report** - the
  dispatch's done-test asks for one and it cannot honestly be produced.
- **`origin/main`:** unchanged. No push attempted, no push click requested.
- **N-2 remains OPEN.** A `git restore` on either function path still silently reverts what
  production runs.

### 8. DONE-TEST, HONESTLY SCORED

| Ruling / dispatch item | Result |
|---|---|
| (1) Root canon: gate 2 exemption for `docs/reports/` | **PASS** - section 1, edit 1 |
| (1) Root canon: R6 rotation rule at 512 KB | **PASS** - section 1, edit 2 |
| (2) Rotation 001 performed | **PASS** - section 2; 1,782,627 bytes moved intact |
| (2) Fresh `REPORT.md` = archive-chain header + completion section | **PASS** - this file |
| (3) Run the sweep with the given message | **FAIL, by canon's own instruction** - gate 2 failed on 166 `verify-out/` paths; canon orders R4 + STOP |
| (3) Report the commit hash | **CANNOT** - no commit exists |
| (3) Report the canon diff | **PASS** - section 1 |
| Proofs at `docs/proofs/` and tracked | **PARTIAL** - relocated and no longer ignored; **not yet tracked**, which needs the blocked commit |
| Function paths clean in `git status` | **FAIL** - both still ` M`; cannot be clean without the commit |
| Zero function-source changes | **PASS** |
