-- ============================================================================
-- 20260802170000_ops_build_steps_status_manual_rename.sql
--
-- OPS65. Named by the dispatch, rollback stated in the dispatch, per R7's
-- MIGRATION AMENDMENT. Pre-flight was run green under OPS62 (report section
-- O-4) inside a rolled-back transaction and is NOT redone here.
--
-- TWO CHANGES, one transaction:
--
--   1. ops_build_steps.status -> status_manual (OPS54 R12 shape). The column is
--      the HAND-SET fallback, not the board truth; the old name invited every
--      reader to treat it as authoritative. Postgres would re-point the
--      dependent view automatically on rename, but the LEAD RULING on OPS62-Q
--      sub-question 1a is an EXPLICIT view rewrite: a silent re-point achieves
--      the rename and abandons the reason for it. The view is therefore
--      rewritten by hand below so the choice is visible in the source.
--
--   2. ops_build_progress CASE ordering: 'done' is now evaluated BEFORE
--      'blocked'. The old order tested `q.asked_at IS NOT NULL -> blocked`
--      ahead of `d.status = 'done' -> done`. A `-Q` report is permanent by R4
--      design ("That row stays on the rail as the record of the ask"), so any
--      pass that filed a question, was unblocked, and completed read BLOCKED
--      FOREVER. OPS35 and OPS37 both did exactly that, pinning three finished
--      oracle steps at `blocked`. A completed pass is done regardless of
--      whether it once asked something.
--
--      GENUINE BLOCKING IS PRESERVED: the `q.asked_at` branch still fires for a
--      pass that asked and has NOT completed - it now sits below the completion
--      test instead of above it. A question with no completion still reads
--      blocked, which is the property the branch exists for.
--
-- SECURITY NOTE - the trap in this migration. ops_build_progress carries
-- reloptions {security_invoker=true}, and its base table ops_build_steps has
-- RLS enabled with policy ops_build_steps_admin_read USING (is_platform_admin()).
-- CREATE OR REPLACE VIEW does NOT preserve reloptions that are not restated.
-- Omitting `with (security_invoker = true)` below would silently flip the view
-- to definer semantics and bypass the admin-only policy, turning an admin board
-- into a read surface for every authenticated Bee. It is restated explicitly.
--
-- CREATE OR REPLACE VIEW preserves grants (authenticated: SELECT) and requires
-- an unchanged output column list, order and types - all unchanged here. Only
-- the two `s.status` references and the CASE branch order differ from the
-- definition captured verbatim before the apply.
--
-- ZERO DML. No row is read, written or backfilled. Step statuses are untouched;
-- the three phantom `blocked` rows resolve because the derivation changes, not
-- because any data does.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. The rename.
-- ---------------------------------------------------------------------------
alter table public.ops_build_steps rename column status to status_manual;

comment on column public.ops_build_steps.status_manual is
  'HAND-SET status. NOT the board truth. Read ops_build_progress.derived_status for the rail-derived value; this column is only the fallback when dispatch_pass IS NULL. Renamed from "status" (OPS65, per OPS54 R12 / OPS62-Q) so every read site chooses consciously between the manual value and the derived one.';

-- ---------------------------------------------------------------------------
-- 2. The view, rewritten by hand. Differences from the captured definition are
--    marked <<-- ; everything else is byte-for-byte what pg_get_viewdef
--    returned before the apply.
-- ---------------------------------------------------------------------------
create or replace view public.ops_build_progress
  with (security_invoker = true) as
 WITH done_rep AS (
         SELECT ops_reports.pass,
            min(ops_reports.created_at) AS first_report_at
           FROM ops_reports
          WHERE ops_reports.pass !~~ '%-Q'::text
          GROUP BY ops_reports.pass
        ), q_rep AS (
         SELECT regexp_replace(ops_reports.pass, '-Q$'::text, ''::text) AS base_pass,
            min(ops_reports.created_at) AS asked_at
           FROM ops_reports
          WHERE ops_reports.pass ~~ '%-Q'::text
          GROUP BY (regexp_replace(ops_reports.pass, '-Q$'::text, ''::text))
        )
 SELECT s.id,
    s.astra,
    s.phase_no,
    s.phase,
    s.step_no,
    s.title,
    s.dispatch_pass,
    s.effort,
    s.notes,
        CASE
            WHEN s.dispatch_pass IS NULL THEN s.status_manual          -- <<-- renamed column
            WHEN r.first_report_at IS NOT NULL THEN 'done'::text
            WHEN d.status = 'done'::text THEN 'done'::text             -- <<-- MOVED UP, above the -Q test
            WHEN q.asked_at IS NOT NULL THEN 'blocked'::text           -- <<-- now only fires when NOT complete
            WHEN d.status = 'claimed'::text THEN 'in_progress'::text
            WHEN d.status = 'queued'::text THEN 'not_started'::text
            ELSE s.status_manual                                       -- <<-- renamed column
        END AS derived_status,
    s.dispatch_pass IS NOT NULL AS rail_derived,
    COALESCE(s.done_at, r.first_report_at) AS done_at,
    q.asked_at AS blocked_since,
    d.status AS dispatch_status,
    COALESCE(s.est_minutes::numeric, e.median, a.median) AS est_median,
    COALESCE(e.p25, a.p25) AS est_p25,
    COALESCE(e.p75, a.p75) AS est_p75,
    COALESCE(e.n_clean, 0::bigint) AS est_sample_n
   FROM ops_build_steps s
     LEFT JOIN ops_dispatches d ON d.pass = s.dispatch_pass
     LEFT JOIN done_rep r ON r.pass = s.dispatch_pass
     LEFT JOIN q_rep q ON q.base_pass = s.dispatch_pass
     LEFT JOIN ops_effort_stats e ON e.effort = s.effort
     LEFT JOIN LATERAL ( SELECT round(percentile_cont(0.25::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS p25,
            round(percentile_cont(0.50::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS median,
            round(percentile_cont(0.75::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS p75
           FROM ops_pass_durations
          WHERE NOT ops_pass_durations.suspect) a ON true;

commit;

-- ============================================================================
-- ROLLBACK - exact, as stated in the OPS65 dispatch. Run the whole block.
-- Statement 1 is the view definition captured VERBATIM from pg_get_viewdef
-- before this migration was applied (2367 bytes, md5 de0fa5dfa4713af01d7371560d449aaf),
-- not reconstructed from memory. security_invoker is restated for the same
-- reason it is restated above.
-- ============================================================================
--
-- begin;
--
-- create or replace view public.ops_build_progress
--   with (security_invoker = true) as
--  WITH done_rep AS (
--          SELECT ops_reports.pass,
--             min(ops_reports.created_at) AS first_report_at
--            FROM ops_reports
--           WHERE ops_reports.pass !~~ '%-Q'::text
--           GROUP BY ops_reports.pass
--         ), q_rep AS (
--          SELECT regexp_replace(ops_reports.pass, '-Q$'::text, ''::text) AS base_pass,
--             min(ops_reports.created_at) AS asked_at
--            FROM ops_reports
--           WHERE ops_reports.pass ~~ '%-Q'::text
--           GROUP BY (regexp_replace(ops_reports.pass, '-Q$'::text, ''::text))
--         )
--  SELECT s.id,
--     s.astra,
--     s.phase_no,
--     s.phase,
--     s.step_no,
--     s.title,
--     s.dispatch_pass,
--     s.effort,
--     s.notes,
--         CASE
--             WHEN s.dispatch_pass IS NULL THEN s.status
--             WHEN r.first_report_at IS NOT NULL THEN 'done'::text
--             WHEN q.asked_at IS NOT NULL THEN 'blocked'::text
--             WHEN d.status = 'claimed'::text THEN 'in_progress'::text
--             WHEN d.status = 'queued'::text THEN 'not_started'::text
--             WHEN d.status = 'done'::text THEN 'done'::text
--             ELSE s.status
--         END AS derived_status,
--     s.dispatch_pass IS NOT NULL AS rail_derived,
--     COALESCE(s.done_at, r.first_report_at) AS done_at,
--     q.asked_at AS blocked_since,
--     d.status AS dispatch_status,
--     COALESCE(s.est_minutes::numeric, e.median, a.median) AS est_median,
--     COALESCE(e.p25, a.p25) AS est_p25,
--     COALESCE(e.p75, a.p75) AS est_p75,
--     COALESCE(e.n_clean, 0::bigint) AS est_sample_n
--    FROM ops_build_steps s
--      LEFT JOIN ops_dispatches d ON d.pass = s.dispatch_pass
--      LEFT JOIN done_rep r ON r.pass = s.dispatch_pass
--      LEFT JOIN q_rep q ON q.base_pass = s.dispatch_pass
--      LEFT JOIN ops_effort_stats e ON e.effort = s.effort
--      LEFT JOIN LATERAL ( SELECT round(percentile_cont(0.25::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS p25,
--             round(percentile_cont(0.50::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS median,
--             round(percentile_cont(0.75::double precision) WITHIN GROUP (ORDER BY (ops_pass_durations.minutes::double precision))::numeric, 1) AS p75
--            FROM ops_pass_durations
--           WHERE NOT ops_pass_durations.suspect) a ON true;
--
-- alter table public.ops_build_steps rename column status_manual to status;
-- comment on column public.ops_build_steps.status is null;
--
-- commit;
--
-- NOTE: the view must be restored BEFORE the column is renamed back, because
-- the replaced view references status_manual. Renaming the column first would
-- re-point the new view's text to `status` automatically and leave the
-- corrected CASE ordering in place - a silent partial rollback. Order matters.
-- ============================================================================
