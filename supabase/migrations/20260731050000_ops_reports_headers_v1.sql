-- DB13 / DB12 design: reports must declare what they need.
--
-- WHY: seven dispatches sat claimed with reports already filed, four waiting on a
-- human who did not know. OPS22 waited 63 hours for thirty seconds of attention.
-- There is no way to ask the rail what is waiting on a person. LEAD_PROTOCOL v0.9
-- enforces it by discipline and says plainly discipline will fail. This is the
-- structure that replaces it.
--
-- ADDITIVE ONLY. Six new NULLABLE columns on ops_reports. Nothing existing is
-- altered, nothing dropped, no NOT NULL, no DEFAULT that rewrites the table
-- (a DEFAULT on ADD COLUMN would be a table rewrite on 149 rows - cheap here, but
-- the rule is additive-means-additive, so there are none).
--
-- NO BACKFILL. Historic reports stay NULL. DB12 was explicit that machine-guessing
-- an outcome from prose is wrong, and DB13 proved it: a regex owner-guess over the
-- four live rows got THREE OF FOUR wrong. Hand-populate or leave null.
--
-- outcome is text + CHECK, NOT an enum, matching ops_dispatches.status and
-- trivia_sessions.phase. An enum needs ALTER TYPE on production every time the rail
-- learns a shape.
--
-- NO ASCII CHECK on any of these columns, deliberately: 98 of 145 existing report
-- titles contain non-ASCII, so an ASCII constraint would be unsatisfiable. OPS43's
-- rule is about CODE crossing the shell boundary, not content.
--
-- ROLLBACK is at the foot of this file.
--
-- APPLY WITH:  psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>
-- This file carries NO BEGIN/COMMIT of its own, on purpose. LEAD_PROTOCOL v0.7 R-B
-- and this pass's dispatch both mandate --single-transaction, and nesting the two
-- makes psql emit "there is already a transaction in progress" and "there is no
-- transaction in progress" - benign warnings that train a reader to skim past the
-- line where a real one would appear.

ALTER TABLE public.ops_reports
  -- One line a human reads first. Not a summary of the body - a statement of what
  -- happened. Deliberately no `summary` column: that would invite thinning the prose.
  ADD COLUMN headline text,

  -- Did this pass change a live system? Two clarifications the protocol must state
  -- or two passes will answer differently:
  --   * uncommitted files in a tree are NOT applied (a proposal is not a change)
  --   * closing your own dispatch row does NOT count, or applied is true for every
  --     report and carries no information
  ADD COLUMN applied boolean,

  -- What a human must decide before this can move. NULL = nothing is waiting.
  ADD COLUMN decisions_required text,

  -- WHO owns that decision. Separate from the sentence above because you cannot
  -- filter a sentence: a lead who can ask "what is waiting on ME vs on Butch" has a
  -- materially better board. NULL unless decisions_required is set.
  ADD COLUMN decisions_owner text,

  -- What this pass is blocked behind, when it is not a decision (a gate, an apply,
  -- another pass, a credential).
  ADD COLUMN blocked_on text,

  ADD COLUMN outcome text;

ALTER TABLE public.ops_reports
  ADD CONSTRAINT ops_reports_outcome_chk
    CHECK (outcome IS NULL OR outcome IN
      ('done','blocked','question','design','held','superseded')),
  ADD CONSTRAINT ops_reports_decisions_owner_chk
    CHECK (decisions_owner IS NULL OR decisions_owner IN
      ('butch','lead','counsel','external'));

COMMENT ON COLUMN public.ops_reports.decisions_owner IS
  'butch | lead | counsel | external. Set ONLY by hand, never inferred from prose - DB13 measured a regex guess at 3/4 wrong.';

-- ---------------------------------------------------------------------------
-- ROLLBACK, exact. Captured from the measured pre-state BEFORE the apply:
-- ops_reports had exactly six columns (id, terminal, pass, title, body,
-- created_at) and four CHECK constraints (body/pass/terminal/title length) plus
-- its primary key. Nothing else existed to restore.
--
-- BEGIN;
-- ALTER TABLE public.ops_reports
--   DROP CONSTRAINT IF EXISTS ops_reports_outcome_chk,
--   DROP CONSTRAINT IF EXISTS ops_reports_decisions_owner_chk;
-- ALTER TABLE public.ops_reports
--   DROP COLUMN IF EXISTS headline,
--   DROP COLUMN IF EXISTS applied,
--   DROP COLUMN IF EXISTS decisions_required,
--   DROP COLUMN IF EXISTS decisions_owner,
--   DROP COLUMN IF EXISTS blocked_on,
--   DROP COLUMN IF EXISTS outcome;
-- COMMIT;
--
-- The rollback DROPs columns that carry data if anything has been written to them
-- between apply and rollback. That is acceptable ONLY because this migration ships
-- with no backfill: at apply time all six are NULL in all 149 rows, and a rollback
-- immediately after loses nothing. Once passes start populating them, rolling back
-- destroys real content - at which point the rollback is no longer free and the
-- lead should be told so.
-- ---------------------------------------------------------------------------
