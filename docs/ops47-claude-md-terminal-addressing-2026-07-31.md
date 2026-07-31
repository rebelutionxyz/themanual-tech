# OPS47 - CLAUDE.md DIFF: terminal addressing, agendas, and the header

**Pass:** OPS47 - **Date:** 2026-07-31 - **ASCII only.**
**Root `CLAUDE.md` was NOT edited.** This parks a paste-ready block for Butch.

---

## 0. READ THIS FIRST - it supersedes OPS46's block, and contains it

OPS46 parked a block for `CLAUDE.md` lines 397-410 fixing `SET LOCAL` -> `SET`. OPS47 changes
**the same region**. Two separate pastes would depend on paste order and on nobody re-wrapping
the region in between.

**So this block CONTAINS OPS46's fix verbatim.** Paste this one and OPS46's is satisfied.
If OPS46's has already been pasted, this still replaces the same region cleanly - it is a
superset, not a conflict.

**Verified against OPS46's parked text**: plain `SET` (not `SET LOCAL`), the announce line,
`claimed_by = nullif(current_setting('ops.session', true), '')`, full SQL with no ellipsis,
ASCII throughout. All carried through unchanged. OPS46-CORRECTION does not alter the block.

**File:** `C:\Users\Butch\Documents\HONEYCOMB\CLAUDE.md`
**Replace lines 397 through 410 inclusive.** Line 396 (`...once yours are gone.`) and line 411
(blank) are the boundaries and stay.

---

## 1. THE PASTE-READY BLOCK

<!-- BEGIN PASTE -->

Pass ids are UNIQUE and the schema enforces it (`ops_dispatches_pass_uidx`), which is what
makes `after_pass` name-matching safe: exactly one row can satisfy a gate.

The claim ALWAYS prints one line - `[CLAIMED]`, or `[NO WORK]` when nothing is claimable.
A terminal that says nothing is a bug. Set `ops.session` from the spawner's `MC_SESSION`
so the rail records which terminal holds the pass; omit it and the claim still succeeds.

Use plain `SET`, not `SET LOCAL`. Under `psql -f` every statement is its own transaction,
so `SET LOCAL` evaporates before the claim runs and `claimed_by` is written NULL with only
a warning. Plain `SET` is session-scoped and survives.

`go <terminal>` works a terminal's agenda - `go a`, `go b`. It composes with the lane form:
`go a db`. ADDRESSING IS NOT OWNERSHIP: the terminal filter is SOFT and always includes
`terminal='ANY'`, so a named terminal with an empty agenda takes pool work instead of
starving. The lane filter stays HARD. Never make `terminal` a required field, and never let
an unclaimed agenda block the pool - pinning was tried on 2026-07-26, mis-assigned 3 of 11,
and was abandoned that evening. R5 already says ownership follows the lane, not the window.

An agenda is ordered by `priority` WITHIN the terminal - no new column. Convention: agenda
items take 40/41/42..., below urgent (10) and above pool (100). Note the ORDER BY puts the
agenda's own priority AHEAD of lane-stickiness for the named terminal only: an agenda is an
explicit human ordering and must run in the order written, while stickiness is a heuristic.
Measured without that term, an agenda of 40/41/42 ran 40, 42, 41.

```sql
SET ops.session = '<MC_SESSION, or omit this line entirely>';
WITH claimed AS (
  UPDATE public.ops_dispatches SET status='claimed', claimed_at=now(),
         claimed_by = nullif(current_setting('ops.session', true), '')
   WHERE id = (SELECT d.id FROM public.ops_dispatches d
                WHERE d.author='LEAD' AND d.status='queued'
                  AND d.terminal IN ('<TERMINAL>','ANY')
                  AND (d.after_pass IS NULL
                       OR EXISTS (SELECT 1 FROM public.ops_dispatches p
                                   WHERE p.pass = d.after_pass AND p.status='done'))
                ORDER BY (d.terminal = '<TERMINAL>') DESC,
                         CASE WHEN d.terminal = '<TERMINAL>' THEN d.priority END ASC NULLS LAST,
                         (d.lane = ANY(ARRAY['<lanes finished this session>'])) DESC NULLS LAST,
                         d.priority ASC, d.created_at ASC
                LIMIT 1 FOR UPDATE SKIP LOCKED)
     AND status='queued'
  RETURNING id, lane, pass, title, workdir, scope, body, claimed_by
)
SELECT '[CLAIMED] ' || pass || ' | ' || coalesce(lane,'-') || ' | ' || coalesce(workdir,'-')
       || ' | ' || coalesce(claimed_by,'(no session id)') || ' | ' || left(title,60) AS announce,
       id, lane, pass, title, workdir, scope, claimed_by, body
  FROM claimed;
```

For a plain `go` with no terminal named, drop the `AND d.terminal IN (...)` line and both
`<TERMINAL>` ORDER BY terms; the remaining statement is exactly the pool claim. For `go a db`
add `AND d.lane='db'`.

<!-- END PASTE -->

---

## 2. The header query - for mission control, not for CLAUDE.md

Not part of the paste. Included so the panel pass has it.

```sql
SELECT t.terminal, cur.pass AS current_pass,
       CASE WHEN t.agenda_total = 0 THEN NULL
            ELSE t.agenda_done || '/' || t.agenda_total END AS counter
  FROM (SELECT terminal,
               count(*) FILTER (WHERE terminal <> 'ANY')                     AS agenda_total,
               count(*) FILTER (WHERE terminal <> 'ANY' AND status = 'done') AS agenda_done
          FROM public.ops_dispatches WHERE terminal <> 'ANY' GROUP BY terminal) t
  LEFT JOIN LATERAL (
    SELECT pass, lane, workdir FROM public.ops_dispatches c
     WHERE c.status = 'claimed' AND c.terminal = t.terminal
     ORDER BY c.claimed_at DESC LIMIT 1) cur ON true
 ORDER BY t.terminal;
```

The counter EXCLUDES `terminal='ANY'` in both numerator and denominator - pool work a terminal
happens to pick up is not part of its agenda and must not inflate the denominator. A terminal
with no agenda produces no counter, never `1/1`.

**Known limit, stated rather than guessed around:** the `cur` lookup matches the terminal
EXACTLY. It cannot show a current pass for a terminal working only pool rows, because an `ANY`
row carries no terminal and `claimed_by` records a session id, not a terminal letter - there is
no mapping to join on. A first draft matched `IN (terminal,'ANY')` and showed terminal B working
a row terminal A had claimed. Guessing attribution is precisely the mis-assignment that killed
pinning; showing nothing is the honest failure. Closing this needs `MC_SESSION` to encode the
terminal letter, which is a spawner change and its own pass.
