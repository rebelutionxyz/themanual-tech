-- LEAD RULING 2026-07-31: pass ids are PERMANENT identifiers, not recyclable.
-- OPS41 correctly flagged that WHERE status <> 'cancelled' is inert: the status CHECK
-- permits only queued/claimed/done/superseded, so the predicate matched every row.
-- Recycling a pass id was the wrong goal anyway - after_pass gates, report matching on
-- pass and pass||'-Q', and canon citations ("per OPS30-Q section 4") all reference pass
-- ids historically. Reuse would reintroduce the exact ambiguity the OPS9 collision caused.
-- Replaced with a full-coverage unique index. Rollback is the DROP plus the old CREATE.
BEGIN;
DROP INDEX IF EXISTS public.ops_dispatches_pass_uidx;
CREATE UNIQUE INDEX ops_dispatches_pass_uidx ON public.ops_dispatches (pass);
COMMENT ON INDEX public.ops_dispatches_pass_uidx IS
  'Pass ids are permanent and unique rail-wide. Full coverage, no predicate: after_pass gates match by name, ops_reports match on pass and pass-Q, and canon cites pass ids historically, so recycling an id reintroduces the OPS9 collision class. Superseding a dispatch reuses the ROW, never a second row with the same pass. Set by LEAD ruling 2026-07-31 after OPS41 proved the prior predicate inert.';
COMMIT;