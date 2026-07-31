# OPS46 - CORRECTED CLAUDE.md DIFF: `SET LOCAL` is inert under `psql -f`

**Pass:** OPS46 - **Date:** 2026-07-31 - **ASCII only.**
**Root `CLAUDE.md` was NOT edited. Nothing under `HONEYCOMB/.claude/` was edited.** This document
parks a paste-ready block for Butch.

---

## 1. The fix, proven under the transport it will actually run on

The dispatch is right that testing this the easy way is how it shipped broken, so both halves were
run under `psql -f` - never `-c`.

### Proof A - the defect, reproduced

```
$ psql ... -f proof-A-setlocal.sql
psql:proof-A-setlocal.sql:3: WARNING:  SET LOCAL can only be used in transaction blocks
SET
                     step                      |        value
-----------------------------------------------+---------------------
 A: after SET LOCAL, read in a LATER statement | (NULL - evaporated)

                step                | pass  | status  | claimed_by
------------------------------------+-------+---------+------------
 A: claimed_by written by the claim | OPS46 | claimed | (NULL)
```

**The warning fires, the claim succeeds anyway, and `claimed_by` is written NULL.** Exactly the
live behaviour LEAD_PROTOCOL v0.8 C-1 records.

### Proof B - the corrected form, same transport

```
$ psql ... -f proof-B-set.sql
SET
                     step                      |      value
-----------------------------------------------+-----------------
 B: after plain SET, read in a LATER statement | MC9/OPS46-PROOF

                step                | pass  | status  |   claimed_by
------------------------------------+-------+---------+-----------------
 B: claimed_by written by the claim | OPS46 | claimed | MC9/OPS46-PROOF

                  step                   |      value
-----------------------------------------+-----------------
 B: session GUC still set after ROLLBACK | MC9/OPS46-PROOF

               step               | pass  |           claimed_by
----------------------------------+-------+--------------------------------
 B: rail unchanged after rollback | OPS46 | (NULL - correctly rolled back)
```

**`claimed_by` is populated.** Plain `SET` is session-scoped, so it survives across the separate
implicit transactions a `-f` run creates - which is the entire difference.

**Test posture.** The throwaway work was an `UPDATE` of `claimed_by` on **this pass's own claimed
row**, inside `BEGIN ... ROLLBACK`. **No row was inserted into `ops_dispatches`** - R7 forbids that
outright, and status-type updates on one's own claimed row are the one authorized exception. The
final query in Proof B confirms the rail is unchanged after the rollback.

---

## 2. THE PASTE-READY BLOCK

**File:** `C:\Users\Butch\Documents\HONEYCOMB\CLAUDE.md`
**Replace lines 397 through 410 inclusive** - that is the blank line after the R2 prose, the
opening ```` ```sql ```` fence, the ten SQL lines, and the closing ```` ``` ```` fence.

Line 396 (ends `...once yours are gone.`) and line 411 (blank, before `**One `go` = at most one
claim...**`) are the boundaries and are **not** part of the replacement.

Paste this in their place, unedited:

<!-- BEGIN PASTE -->

```
Pass ids are UNIQUE and the schema enforces it (`ops_dispatches_pass_uidx`), which is what
makes `after_pass` name-matching safe: exactly one row can satisfy a gate.

The claim ALWAYS prints one line - `[CLAIMED]`, or `[NO WORK]` when nothing is claimable.
A terminal that says nothing is a bug. Set `ops.session` from the spawner's `MC_SESSION`
so the rail records which terminal holds the pass; omit it and the claim still succeeds.

Use plain `SET`, not `SET LOCAL`. Under `psql -f` every statement is its own transaction,
so `SET LOCAL` evaporates before the claim runs and `claimed_by` is written NULL with only
a warning. Plain `SET` is session-scoped and survives.

```sql
SET ops.session = '<MC_SESSION, or omit this line entirely>';
WITH claimed AS (
  UPDATE public.ops_dispatches SET status='claimed', claimed_at=now(),
         claimed_by = nullif(current_setting('ops.session', true), '')
   WHERE id = (SELECT d.id FROM public.ops_dispatches d
                WHERE d.author='LEAD' AND d.status='queued'
                  AND (d.after_pass IS NULL
                       OR EXISTS (SELECT 1 FROM public.ops_dispatches p
                                   WHERE p.pass = d.after_pass AND p.status='done'))
                ORDER BY (d.lane = ANY(ARRAY['<lanes finished this session>'])) DESC NULLS LAST,
                         d.priority ASC, d.created_at ASC
                LIMIT 1 FOR UPDATE SKIP LOCKED)
     AND status='queued'
  RETURNING id, lane, pass, title, workdir, scope, body, claimed_by
)
SELECT '[CLAIMED] ' || pass || ' | ' || coalesce(lane,'-') || ' | ' || coalesce(workdir,'-')
       || ' | ' || coalesce(claimed_by,'(no session id)') || ' | ' || left(title,60) AS announce,
       id, lane, pass, title, workdir, scope, claimed_by, body
  FROM claimed
UNION ALL
SELECT '[NO WORK] queue empty - nothing claimable for these lanes',
       NULL::uuid, NULL, NULL, NULL, NULL, NULL, NULL, NULL
 WHERE NOT EXISTS (SELECT 1 FROM claimed);
```
```

<!-- END PASTE -->

### 2.1 What changed against OPS41's parked version

1. **`SET LOCAL` -> `SET`.** The one word. This is the fix.
2. **The SQL is written out in full.** OPS41's diff carried
   `... (WHERE clause and FOR UPDATE SKIP LOCKED unchanged)` as an ellipsis, which is fine in a
   diff and **not pasteable**. The block above is complete, so it can go in without editing -
   which the dispatch asked for explicitly.
3. **A three-line prose note was added** explaining why it is plain `SET`. Without it the next pass
   to tidy this file will "helpfully" restore `SET LOCAL`, since that is the more careful-looking
   form. **The comment is the guard against a well-intentioned regression.**
4. **ASCII throughout** - the em dashes in OPS41's prose are replaced with hyphens. Per OPS43 a
   single U+2014 on the argv path becomes CP1252 0x97 and the server rejects the entire query.
   This block is destined for exactly that path.

**Not changed:** the WHERE clause, `FOR UPDATE SKIP LOCKED`, the outer `AND status='queued'`
re-check, `LIMIT 1`, and the lanes-array placeholder. The claim's semantics are untouched; only its
transport and its announce line differ.

---

## 3. Other `SET LOCAL` occurrences - reported, NOT fixed

Swept `*.sql`, `*.mjs`, `*.js`, `*.ts`, `*.md`, `*.ps1`, `*.cmd`, `*.json` across the workspace,
plus `HONEYCOMB/.claude/`, both `scripts/` trees, and `TheMANUAL.tech/supabase/`.

**Nothing else is a live `-f` defect.** Every hit is either inside a SQL comment or is prose.
Reported per the dispatch, fixed by nobody in this pass.

| Location | What it is | Risk if someone runs it |
|---|---|---|
| `shared/notes/audits/v9-security-production-verification-2026-05-06.md:119, 211` | `SET LOCAL ROLE anon;` in an RLS verification transcript | **The highest-consequence one in the list.** Copied into a `-f` file, the role switch silently does not happen and the checks run as the connecting superuser. The audit would report "RLS holds" **having never tested it as anon.** Not a defect today because it is a document, but it is a loaded footgun for the next person who re-runs that audit |
| `TheMANUAL.tech/supabase/migrations/20260513120000_lock8_c_rls_rewrite.sql:91, 93, 101, 693, 705` | Commented-out `SET LOCAL request.astra_id ...` - lines 693/705 are worked verification steps | Inert as committed. Lines 693/705 are written to be copied by a human, and would hit this exact bug under `-f` |
| `TheMANUAL.tech/supabase/migrations/20260513115000_lock8_b_insert_default_trigger.sql:429` | Commented example | Inert |
| `TheMANUAL.tech/supabase/migrations/24_v9_0_security_tightening.sql:111` | Double-commented `-- -- SET LOCAL ROLE anon;` | Inert |
| `shared/canon/lock-8-c-disposition-research.md:24, 364, 377` | Prose about a future `set_astra_context` RPC | **Already correctly hedged.** Line 377 reads: *"Postgres `LOCAL` is transaction-scoped, and Edge Functions may not preserve a transaction across the GUC-set and the subsequent query. Worth validating in a smoke test before counting on the pattern."* That is the same insight OPS46 just proved for psql, written down months earlier and never acted on |
| `.claude/settings.local.json:552, 556` | Two permission-allowlist entries recording `psql -c "SET LOCAL ops.session = ...; SELECT ..."` | **Not a defect.** Both are `-c` invocations, and `-c` sends the batch as one string - the transport where `SET LOCAL` genuinely works. They are OPS41's own test commands, frozen in the allowlist. **Worth knowing they exist**, because they are the exact evidence that the original test was run on `-c` |
| `backups/post-justice-v1_1-20260726-211018.sql:11250, 11275`, `backups/pre-session-20260726-130618.sql:10548, 10573` | `EXECUTE format('SET LOCAL realtime.topic TO %L', topic)` inside Supabase `realtime` PL/pgSQL function bodies, in database dumps | **Not a defect and not ours.** A function body always runs inside a transaction, so `SET LOCAL` is the correct choice there. Listed only for completeness |

**Neither `scripts/` tree has any matches.**

> ### CORRECTION - this table was wrong when first filed
> The first version of this document said **"`HONEYCOMB/.claude/`: no matches"**. That was false.
> The sweep that produced it used a search tool that **respects `.gitignore`**, and both
> `.claude/settings.local.json` and `backups/` are gitignored - so the tool reported clean on files
> it could not see. A second sweep with a plain recursive `grep` found the six rows added above.
>
> **The conclusion is unchanged - there is still no second live `-f` defect** - but the stated
> fact was wrong and is corrected here rather than quietly amended. Filed to the rail as
> `OPS46-CORRECTION`.
>
> **The transferable lesson:** a gitignore-respecting search is the wrong instrument for a
> "does this pattern exist anywhere" sweep. `.claude/`, `backups/` and every other ignored path are
> exactly where operational commands and dumps live.

**One observation worth a line.** The Lock-8-C note above predicted this class of bug in a different
transport and asked for a smoke test that was never run. The pattern is not "someone was careless" -
it is that **`SET LOCAL`'s scope depends on the transport, and every transport in this stack has to
be tested separately.** If the `set_astra_context` RPC is ever authored, that smoke test is still
owed.

---

## 4. Done-test

| Requirement | Status |
|---|---|
| Corrected diff as one paste-ready block, file and line range named | **Met** - section 2, `CLAUDE.md` lines **397-410**, complete SQL with no ellipsis |
| Fix proven under `-f` specifically | **Met** - section 1, both halves run under `-f`; A shows the WARNING and NULL, B shows `claimed_by = MC9/OPS46-PROOF` |
| `claimed_by` shown populated | **Met** - Proof B, and the rail confirmed unchanged after rollback |
| Other `SET LOCAL` occurrences reported or none found | **Met, after a correction** - section 3, fifteen occurrences across nine files. The first sweep missed six because it respected `.gitignore`; corrected in place and filed as `OPS46-CORRECTION`. None fixed, none live |
| Zero protocol files edited | **Met** - root `CLAUDE.md` untouched, `.claude/` untouched |

**No row was inserted into `ops_dispatches`. The only write was a rolled-back `UPDATE` of this
pass's own claimed row.**
