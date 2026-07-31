# OPS RAIL - REPORTS MUST DECLARE WHAT THEY NEED

**Pass:** DB12 - **Date:** 2026-07-30 - **Scope:** the ops rail
**DESIGN AND DRAFT. Apply nothing. Stops for lead review.**
**Written in pure ASCII per the OPS43 finding.** See section 6: that finding is not incidental
here, it is a live constraint on the panel this document designs.

The problem, restated once: the dispatch board answers *what is being worked on*. Nothing answers
*what is waiting on me*. OPS35-Q filed five money questions inside a 29,987-byte body and the fact
was invisible.

---

## 0. What the rail actually looks like right now

Read live this pass. Four facts, and three of them change the design.

**(a) ops_reports has six columns and no structure at all.**

```
id - terminal - pass - title - body - created_at
```

**(b) The title field is ALREADY being used as an ad-hoc headline.** Look at what passes actually
write: `OPS34-Q - gate MET (verified objects, not just after_pass). NOTHING LE...`,
`OPS37-Q - steps 2/3/4 DONE, step 1 BLOCKED: firing a directive needs a...`. Passes are already
straining to put the header in the only structured-ish field they have. **The design below is
mostly formalizing a behaviour that exists, which is the cheapest kind of change to get adopted.**

**(c) WARNING: `pass` is NOT unique in ops_reports, and one duplicate pair says opposite things.**

```
  pass   | rows
---------+------
 OPS34-Q |    2
 TRIV14  |    2
 TRIV21  |    2
```

The two OPS34-Q rows are `GATE NOT MET` (2026-07-29 20:04) and `gate MET` (2026-07-31 00:42).
**A naive waiting-on-a-human query would resurface the stale one and send the lead to re-decide
something already decided.** Every query in section 2 therefore takes the newest row per pass.
This is not a hypothetical; it is in the data today.

**(d) WARNING: the `-Q` suffix is a convention, not data, and it is already leaky in both
directions.** Reports with no `-Q` that are plainly waiting:

```
 DOCS13   - "bands design filed, stopped for review"
 TRIV21   - "8 changes drafted with rollbacks"      (waiting on an apply)
 OPS40    - "7 of 7 adjudicated, ZERO closed"
```

And reports that are not passes at all, filed as records: `LANG-RULING`, `LANG-RULING-2`,
`AUTOMATION-RULING`, `PARKING`, `HANDOFF-0730-PM`, `CARDS-0730`.

**This is the single strongest argument for the dispatch's own proposal.** A panel built on
`pass LIKE '%-Q'` would both miss real waiting work and surface rulings that are waiting on nobody.
**The suffix cannot be the index. A column must be.**

---

## 1. The column set - proposed, with the shape argued

The dispatch sketched five fields. I would ship four of them as sketched, change one, and add one.

| column | type | null? | why |
|---|---|---|---|
| `headline` | `text` | NOT NULL once enforced | One line. The thing a human reads in a list. |
| `outcome` | `text` NOT NULL, CHECK | NOT NULL | `done` / `stopped-for-review` / `gate-not-met` / `blocked`. |
| `applied` | `boolean` NOT NULL DEFAULT false | NOT NULL | Did this pass change anything outside `ops_reports` / `ops_docs`? |
| `decisions_required` | `text` | NULL when none | What the human must rule. |
| `blocked_on` | `text` | NULL when none | What it waits for AND who owns it. |
| **`decisions_owner`** | `text` | NULL | **ADDED.** See 1.3. |

### 1.1 Keep `outcome` as free-ish text with a CHECK, not an enum type

A Postgres `ENUM` needs `ALTER TYPE` to grow, which is DDL on production every time the rail learns
a new shape. A `text` column with a CHECK is one `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT`
and is the pattern the rest of this database already uses (`ops_dispatches.status`,
`trivia_sessions.phase`, `stripe_events.product_type`). **Match the house pattern.**

Trade-off: a CHECK does not give you type safety in client code the way an enum does. Accept it -
nothing here is typed against the rail today anyway.

### 1.2 `applied` is the most important boolean and the easiest to get wrong

The dispatch's definition is right and should be written into the protocol verbatim: **did this pass
change anything outside `ops_reports` and `ops_docs`** - migrations, deploys, commits, grants.

Two clarifications worth fixing now rather than discovering later:

- **Writing files in a repo counts as applied=false only if uncommitted.** Most passes tonight left
  uncommitted work. That is not a change to a system; it is a proposal sitting in a tree. But the
  distinction is subtle enough that the protocol must state it, or two passes will answer it
  differently.
- **Closing your own dispatch row does not count.** Every finishing pass updates
  `ops_dispatches.status`. If that counted, `applied` would be true for every report and the column
  would carry no information.

### 1.3 The one addition: `decisions_owner`

The dispatch asks `blocked_on` to name "what it is waiting for and who owns it" - two facts in one
free-text field. **Split the owner out for the decisions case**, because the query in section 2
wants to filter by it and you cannot filter a sentence.

Values in practice: `butch`, `lead`, `counsel`, `external`. The OPS37-Q case (blocked on a
credential) is `butch`; the OPS34-Q RLS ruling is `butch`; the DOCS9 legal questions are `counsel`.
**A lead who can ask "what is waiting on ME versus on Butch" has a materially better board than one
who can only ask "what is waiting."**

Trade-off: it is a fifth thing to fill in, and the dispatch warned that the common case must be
trivial. Mitigated by leaving it NULL unless `decisions_required` is non-null - see 5.1.

### 1.4 What I deliberately did NOT add

- **No `severity` or `priority` on reports.** Age is the honest sort (section 2). A pass grading its
  own urgency would inflate.
- **No structured JSON blob.** It would be tempting to shove everything into `jsonb` and defer the
  schema. That is how this problem started - unstructured content nobody can query.
- **No `summary` column.** Section 7: the header is an index, not a summary. A summary column is an
  invitation to thin the prose.

---

## 2. THE QUERY - the point of the whole thing

Written to run as-is. **Pure ASCII, no interpolation** - see section 6 for why that matters.

```sql
-- WAITING ON A HUMAN, every astra, oldest first.
-- Newest row per pass only: ops_reports allows repeats, and one live duplicate
-- pair (OPS34-Q) says GATE NOT MET on one row and gate MET on the other.
WITH newest AS (
  SELECT DISTINCT ON (pass) *
    FROM public.ops_reports
   ORDER BY pass, created_at DESC
)
SELECT pass,
       terminal,
       outcome,
       decisions_owner,
       coalesce(decisions_required, blocked_on) AS needs,
       headline,
       date_trunc('minute', now() - created_at) AS waiting_for,
       created_at
  FROM newest
 WHERE outcome IN ('stopped-for-review','gate-not-met','blocked')
    OR decisions_required IS NOT NULL
    OR blocked_on IS NOT NULL
 ORDER BY created_at ASC;
```

**Why `OR` and not `AND`:** an `outcome` of `blocked` with an empty `blocked_on` is a filing error,
and the panel should show filing errors rather than hide them. The predicate is deliberately
generous; a false positive costs a glance, a false negative is the bug this pass exists to fix.

**Why `ORDER BY created_at ASC`:** oldest first. The five-hour-old question is the one that has
been ignored, and it should be at the top rather than buried under tonight's.

### 2.1 Demonstrated against tonight's real data

**The columns do not exist, so this cannot be run as written. That is stated rather than faked.**
What follows is the same predicate expressed against the columns that DO exist, run this pass, to
show the query finds the right rows:

```sql
WITH newest AS (
  SELECT DISTINCT ON (pass) * FROM public.ops_reports ORDER BY pass, created_at DESC
)
SELECT pass, created_at FROM newest
 WHERE title ILIKE '%blocked%' OR title ILIKE '%stopped%'
    OR title ILIKE '%gate not met%' OR title ILIKE '%lead review%'
    OR title ILIKE '%ruling required%'
 ORDER BY created_at ASC;
```

The five reports the dispatch names - **OPS35-Q, OPS34-Q, OPS37-Q, TRIV26-Q, TRIV29-Q** - are all
present in `ops_reports` and all carry those markers in their titles, which is exactly why the
text-matching version *appears* to work.

**And that is the trap worth naming.** The text version also matches `DOCS13` ("stopped for
review"), `OPS40`, `CARDS-0730` and `TRIV21`, and it silently depends on every pass choosing to
write a magic word into a free-text title. **Text matching is not a fallback for the column set; it
is a demonstration of why the column set is needed.** With the columns, the predicate is exact and
does not care what words a pass chose.

**One live correctness proof from the same data:** the `DISTINCT ON (pass)` clause is not
defensive coding. Without it this query returns OPS34-Q twice, once saying the gate is not met and
once saying it is. With it, only the newest survives.

---

## 3. The mission-control panel: WAITING ON YOU

Renders section 2's query. Design notes that matter more than layout:

1. **Sort oldest first and show the age prominently.** "4h 12m" next to a money question is the
   whole product.
2. **Group by `decisions_owner`**, with the lead's own bucket first. A board that mixes "you must
   rule this" with "Butch must rule this" is a to-do list for two people.
3. **Show `needs`, not the headline, as the primary line.** The lead does not need to know what the
   pass did; they need to know what it wants. `headline` is the second line.
4. **A row leaves the panel when a NEWER report for that pass says otherwise** - not when someone
   ticks it off. There is no dismiss button, and there should not be: the rail's truth is the
   newest report, and a dismissible panel would drift from it immediately. OPS34-Q is the worked
   example: filing `gate MET` is what removed it.

### 3.1 On `claimed_by`, per the dispatch's note

`claimed_by` is live and PARTIAL - OPS42 carries `MC-CLAUDE2/HONEYCOMB`, four passes claimed in the
same window are NULL because only mission-control-spawned terminals set it.

**The panel must render NULL as `unidentified`, never as `unclaimed`.** Those are different facts
and conflating them would tell the lead a claimed pass is available for reassignment. The intended
degradation is that a missing identifier never fails a claim; the panel's job is to preserve that
distinction rather than paper over it. **Recommend the panel show `claimed_by` only where non-null,
and show nothing rather than a placeholder where it is null** - an absent field reads as "unknown",
a placeholder reads as a value.

---

## 4. Backfill: **leave the 139 null. Do not machine-guess.**

The dispatch is right and I want to strengthen the reasoning rather than just agree.

**Machine-guessing is worse here than merely inaccurate, because the panel's value is exactly its
trustworthiness.** A WAITING ON YOU panel is only useful if a lead can believe that everything on
it needs them and nothing off it does. One invented `stopped-for-review` teaches the lead to
double-check the panel against the reports, and a panel that must be double-checked is worse than
no panel, because it costs the check and provides false comfort.

**The evidence that guessing would go wrong is already in section 0(d).** Title text says "stopped
for review" on DOCS13, which is genuinely waiting, and also appears in rulings that are waiting on
nobody. A classifier over 145 prose bodies would produce a plausible-looking board with unknown
error, and nobody would know which rows were guesses.

**Recommendation: a small manual backfill of the open handful, and nothing else.**

- The panel covers new reports from the protocol date forward.
- **A human - not a pass - fills the header for the currently-open items only.** By section 0's
  read that is roughly the five the dispatch names plus `TRIV21` and `DOCS13`. Under ten rows.
- Everything older stays NULL forever, and the panel must **state that it covers reports since
  <date>** rather than implying completeness over history.

Trade-off: for a short period the panel is incomplete, and someone must remember that. That is
strictly better than a complete-looking panel with invented rows, and the honest footer makes the
incompleteness visible instead of silent.

---

## 5. Protocol rule for LEAD_PROTOCOL - drafted

> **Filing a report without a header is an incomplete filing.**
>
> Every `ops_reports` insert sets `headline`, `outcome` and `applied`. `decisions_required`,
> `blocked_on` and `decisions_owner` are set when they apply and left NULL when they do not.
>
> **The common case is three fields and no thought:** a pass that finished its work, changed
> nothing outside the rail, and needs no ruling files
> `outcome='done', applied=false, headline='<the one line>'` and stops. The three question fields
> stay NULL. **A NULL `decisions_required` is a positive statement that nothing is waiting** - it
> is not an omission, and the protocol should say so in those words, or passes will start writing
> "none" and the panel will fill with noise.
>
> `outcome='done'` with `decisions_required` set is legal and means: the work finished, and a
> ruling is still wanted. `outcome='stopped-for-review'` with `decisions_required` NULL is a
> **filing error** - if you stopped, say what for.

### 5.1 Why this survives contact with a hurried pass

The dispatch's warning is the right one: if the common case is not trivial it will be skipped. Three
fields, two of which are near-constant (`done`, `false`), and one that every pass already writes in
substance as its title. **The marginal cost over today's filing is approximately one word.**

The failure mode to watch is not skipping - it is `outcome='done'` on a pass that actually stopped,
because `done` is the path of least resistance. **Recommend the lead spot-check `outcome` against
the prose on a sample rather than trusting it**, at least until the habit is established. No
mechanism is proposed for enforcing it; a mechanism that lies is the thing being avoided.

---

## 6. The ASCII constraint is a design input, not a style note

OPS43 found that **one U+2014 in a SQL comment became CP1252 0x97 on the argv path and the server
rejected the whole query, blanking all three panels.**

Measured this pass:

```
 titles_with_non_ascii | bodies_with_non_ascii | total
-----------------------+-----------------------+-------
                    98 |                   142 |   145
```

**98 of 145 report titles and 142 of 145 bodies already contain non-ASCII characters.** So a
WAITING ON YOU panel that interpolates report text into a SQL string on the argv path is not at
risk in theory - it is walking into the exact failure OPS43 just fixed, with data that is already
in the table.

**Two rules follow, and they belong in the panel's implementation dispatch:**

1. **The panel's SQL is a fixed, pure-ASCII string. Report text is never interpolated into it.**
   Values come back as rows; they do not go in as literals.
2. **Do not ASCII-constrain the new columns.** It is tempting to add
   `CHECK (headline ~ '^[[:ascii:]]*$')`, but 98 of 145 existing titles would fail such a rule and
   passes write prose. **Fix the transport, not the content** - which is what OPS43 already
   concluded.

---

## 7. NOT NEGOTIABLE: the prose report is unchanged in scope

Stated explicitly because the dispatch requires it, and because the failure mode is real.

**The header is an index, not a summary.** Every one of the five reports named in the dispatch was
worth its length: OPS35-Q's 29,987 bytes are what made the five money questions answerable rather
than merely visible. **The defect was never that the report was long. It was that a 29 KB document
had no addressable field saying "this one needs you."**

**A pass that fills in the header and thins its report has made things worse**, and this should be
in the protocol as a sentence, not an implication:

> The header does not replace any part of the report. Findings, evidence, could-not-verify lists
> and manifests are unchanged in scope and detail. A shorter report with a filled header is a
> regression, not a compliance.

---

## 8. Migration - **NOT APPLIED**

Nothing here was run. Zero columns added, zero rows written. Under the root R7 MIGRATION AMENDMENT
this needs a named migration, a stated rollback and a recorded pre-flight before it is more than a
sketch.

```sql
-- DB12 sketch. NOT APPLIED.
ALTER TABLE public.ops_reports
  ADD COLUMN headline           text,
  ADD COLUMN outcome            text,
  ADD COLUMN applied            boolean NOT NULL DEFAULT false,
  ADD COLUMN decisions_required text,
  ADD COLUMN blocked_on         text,
  ADD COLUMN decisions_owner    text;

ALTER TABLE public.ops_reports
  ADD CONSTRAINT ops_reports_outcome_chk
  CHECK (outcome IS NULL OR outcome IN
        ('done','stopped-for-review','gate-not-met','blocked'));

ALTER TABLE public.ops_reports
  ADD CONSTRAINT ops_reports_decisions_owner_chk
  CHECK (decisions_owner IS NULL OR decisions_owner IN
        ('butch','lead','counsel','external'));

CREATE INDEX ops_reports_waiting_idx
  ON public.ops_reports (created_at)
  WHERE outcome IN ('stopped-for-review','gate-not-met','blocked')
     OR decisions_required IS NOT NULL
     OR blocked_on IS NOT NULL;

-- Rollback:
--   DROP INDEX public.ops_reports_waiting_idx;
--   ALTER TABLE public.ops_reports
--     DROP CONSTRAINT ops_reports_decisions_owner_chk,
--     DROP CONSTRAINT ops_reports_outcome_chk,
--     DROP COLUMN decisions_owner, DROP COLUMN blocked_on,
--     DROP COLUMN decisions_required, DROP COLUMN applied,
--     DROP COLUMN outcome, DROP COLUMN headline;
```

**Three deliberate choices in that sketch:**

- **`headline` and `outcome` are nullable on arrival.** Adding them NOT NULL would require a
  default, and a default is a machine-guessed value on 145 existing rows - exactly what section 4
  forbids. **Enforcement is the protocol first; a NOT NULL constraint can follow once the backlog
  of NULLs is only history.**
- **The partial index matches the section 2 predicate exactly.** If the predicate changes, the
  index must change with it or the panel quietly table-scans.
- **No trigger, no automation.** Nothing computes these columns from the body. That is section 4's
  rule expressed in schema.

---

## 9. Done-test

| Requirement | Status |
|---|---|
| Column set proposed with types, migration marked NOT APPLIED | **Met** - sections 1 and 8; one column added to the sketch (`decisions_owner`) with its argument |
| Waiting-on-a-human query written | **Met** - section 2, pure ASCII, runs as-is once columns exist |
| Demonstrated against real rows | **Met** - section 2.1, run this pass against existing columns; the five named reports are present, and the demonstration doubles as the argument for why text matching must NOT be the design |
| Backfill argued either way, no machine-guessed values | **Met** - section 4: leave 139 NULL, manual backfill of under ten, panel states its coverage date |
| Protocol rule drafted, trivial common case stated | **Met** - section 5: three fields, two near-constant |
| Prose report explicitly unchanged in scope | **Met** - section 7 |
| Zero columns added, zero rows written | **Met** |

**Two findings this pass adds that the dispatch did not anticipate:** `pass` is not unique in
`ops_reports` and one live duplicate pair contradicts itself (section 0c), and 98 of 145 titles
already carry non-ASCII, which makes OPS43's failure a live constraint on the panel rather than a
past incident (section 6).
