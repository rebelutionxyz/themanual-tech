-- ============================================================================
-- OPS33 — ops_build_steps v1: rail-wide build progress model
--
-- Butch ruling 2026-07-30: "I saw phases steps of the whole trivia build - it
-- should be across all honeycomb/ builds." So this table carries EVERY
-- HONEYCOMB build, not just TheTRIVIA. `astra` is NOT NULL with NO DEFAULT:
-- a step with no astra is a bug, not a default.
--
-- ADDITIVE ONLY. This migration creates new objects and touches nothing that
-- existed before it. No pre-existing ops_ table, column, constraint, grant or
-- policy is altered, renamed or dropped — those are shared rail schema owned by
-- other astras' leads.
--
-- Model provenance: OPS33-Q (half 1) drafted and scratch-verified the table and
-- the three views below. This migration adopts that work with the ruling's
-- amendments (astra NOT NULL without default; oracle seeded; rollup views).
-- ============================================================================

-- ─────────────────────────────────────────────────────── the model
CREATE TABLE public.ops_build_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  astra         text NOT NULL,                       -- NO DEFAULT, by ruling
  phase_no      integer NOT NULL,
  phase         text NOT NULL,
  step_no       integer NOT NULL,
  title         text NOT NULL,
  -- MANUAL status. Only consulted for steps with no dispatch_pass: where a pass
  -- exists the rail already knows the answer and ops_build_progress derives it.
  status        text NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','blocked','done','parked')),
  dispatch_pass text,            -- by-convention link to ops_dispatches.pass
  effort        text CHECK (effort IN ('light','standard','deep')),
  est_minutes   integer,         -- manual override; normally left NULL
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  done_at       timestamptz,
  CONSTRAINT ops_build_steps_astra_shape CHECK (astra ~ '^[a-z][a-z0-9_]{1,23}$'),
  UNIQUE (astra, phase_no, step_no)
);

CREATE INDEX ops_build_steps_pass_idx ON public.ops_build_steps (dispatch_pass)
  WHERE dispatch_pass IS NOT NULL;
CREATE INDEX ops_build_steps_astra_idx ON public.ops_build_steps (astra, phase_no, step_no);

-- Grant x policy audit. Default privileges auto-grant every verb on new public
-- tables to anon/authenticated, so the REVOKE is required — RLS would otherwise
-- be the only guard on internal build planning.
ALTER TABLE public.ops_build_steps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ops_build_steps FROM anon, authenticated;
GRANT SELECT ON public.ops_build_steps TO authenticated;

CREATE POLICY ops_build_steps_admin_read ON public.ops_build_steps
  FOR SELECT TO authenticated USING (public.is_platform_admin());
-- No anon access at all. No INSERT/UPDATE/DELETE policy: the rail owns this
-- content and it changes by migration or by postgres over psql.

-- ─────────────────────────────────────── measurement (the ONLY estimate source)
-- One row per pass that has both a claim and a report. Nothing here is a guess.
CREATE OR REPLACE VIEW public.ops_pass_durations AS
WITH first_report AS (
  SELECT regexp_replace(pass, '-Q$', '') AS base_pass,
         min(created_at) AS first_report_at,
         bool_or(pass LIKE '%-Q')        AS question_filed
    FROM public.ops_reports
   GROUP BY 1
)
SELECT d.pass,
       d.lane,
       lower(coalesce(substring(d.title FROM 'EFFORT:\s*([A-Za-z]+)'), 'untagged')) AS effort,
       d.claimed_at,
       f.first_report_at,
       round(extract(epoch FROM (f.first_report_at - d.claimed_at)) / 60.0, 1) AS minutes,
       f.question_filed,
       -- A pass whose claim was reset by a re-queue reads WRONG LOW and the rail
       -- cannot tell (ops_dispatches has no claim history). This flags what it
       -- CAN see; the honest fix is seeded as a step, not done here.
       (f.question_filed OR extract(epoch FROM (f.first_report_at - d.claimed_at)) < 120)
         AS suspect
  FROM public.ops_dispatches d
  JOIN first_report f ON f.base_pass = d.pass
 WHERE d.claimed_at IS NOT NULL
   AND f.first_report_at > d.claimed_at;

CREATE OR REPLACE VIEW public.ops_effort_stats AS
SELECT effort,
       count(*)                                                                 AS n,
       count(*) FILTER (WHERE NOT suspect)                                      AS n_clean,
       round(percentile_cont(0.25) WITHIN GROUP (ORDER BY minutes)::numeric, 1) AS p25,
       round(percentile_cont(0.50) WITHIN GROUP (ORDER BY minutes)::numeric, 1) AS median,
       round(percentile_cont(0.75) WITHIN GROUP (ORDER BY minutes)::numeric, 1) AS p75,
       round(min(minutes)::numeric, 1)                                          AS min_minutes,
       round(max(minutes)::numeric, 1)                                          AS max_minutes
  FROM public.ops_pass_durations
 GROUP BY effort;

-- ─────────────────────────────────────────────────── the panel view
-- Status is DERIVED wherever a pass exists. A human never ticks a box the rail
-- already knows the answer to; the stored column is the fallback for future work
-- that has not been dispatched yet. A '-Q'-only pass derives 'blocked', never
-- 'done' — showing a green check on work that is stopped and waiting on Butch
-- would be a lie the rail can disprove.
CREATE OR REPLACE VIEW public.ops_build_progress AS
WITH done_rep AS (   -- a REAL report: exact pass, never the '-Q'
  SELECT pass, min(created_at) AS first_report_at
    FROM public.ops_reports WHERE pass NOT LIKE '%-Q' GROUP BY pass
), q_rep AS (        -- a question was filed and not yet answered
  SELECT regexp_replace(pass, '-Q$', '') AS base_pass, min(created_at) AS asked_at
    FROM public.ops_reports WHERE pass LIKE '%-Q' GROUP BY 1
)
SELECT s.id, s.astra, s.phase_no, s.phase, s.step_no, s.title, s.dispatch_pass,
       s.effort, s.notes,
       CASE
         WHEN s.dispatch_pass IS NULL       THEN s.status
         WHEN r.first_report_at IS NOT NULL THEN 'done'
         WHEN q.asked_at IS NOT NULL        THEN 'blocked'
         WHEN d.status = 'claimed'          THEN 'in_progress'
         WHEN d.status = 'queued'           THEN 'not_started'
         WHEN d.status = 'done'             THEN 'done'
         ELSE s.status
       END                                    AS derived_status,
       (s.dispatch_pass IS NOT NULL)          AS rail_derived,
       coalesce(s.done_at, r.first_report_at) AS done_at,
       q.asked_at                             AS blocked_since,
       d.status                               AS dispatch_status,
       coalesce(s.est_minutes, e.median, a.median) AS est_median,
       coalesce(e.p25, a.p25)                      AS est_p25,
       coalesce(e.p75, a.p75)                      AS est_p75,
       coalesce(e.n_clean, 0)                      AS est_sample_n
  FROM public.ops_build_steps s
  LEFT JOIN public.ops_dispatches d ON d.pass = s.dispatch_pass
  LEFT JOIN done_rep r ON r.pass = s.dispatch_pass
  LEFT JOIN q_rep    q ON q.base_pass = s.dispatch_pass
  LEFT JOIN public.ops_effort_stats e ON e.effort = s.effort
  LEFT JOIN LATERAL (
    SELECT round(percentile_cont(0.25) WITHIN GROUP (ORDER BY minutes)::numeric,1) AS p25,
           round(percentile_cont(0.50) WITHIN GROUP (ORDER BY minutes)::numeric,1) AS median,
           round(percentile_cont(0.75) WITHIN GROUP (ORDER BY minutes)::numeric,1) AS p75
      FROM public.ops_pass_durations WHERE NOT suspect) a ON true;

-- ─────────────────────────────────────────── cross-astra rollup (the ruling)
-- Per-astra progress. `remaining_minutes_*` is a RANGE built from the measured
-- middle half, never a single invented number.
CREATE OR REPLACE VIEW public.ops_build_rollup AS
SELECT astra,
       count(*)                                                   AS steps,
       count(*) FILTER (WHERE derived_status = 'done')            AS done,
       count(*) FILTER (WHERE derived_status = 'in_progress')     AS in_progress,
       count(*) FILTER (WHERE derived_status = 'blocked')         AS blocked,
       count(*) FILTER (WHERE derived_status = 'parked')          AS parked,
       count(*) FILTER (WHERE derived_status = 'not_started')     AS not_started,
       round(100.0 * count(*) FILTER (WHERE derived_status = 'done') / nullif(count(*),0), 0)
                                                                  AS pct_done,
       round(sum(est_p25) FILTER (WHERE derived_status <> 'done'), 0) AS remaining_minutes_low,
       round(sum(est_p75) FILTER (WHERE derived_status <> 'done'), 0) AS remaining_minutes_high,
       max(est_sample_n)                                          AS est_sample_n
  FROM public.ops_build_progress
 GROUP BY astra;

-- The whole honeycomb at a glance. One row.
CREATE OR REPLACE VIEW public.ops_build_honeycomb AS
SELECT count(DISTINCT astra)                                      AS astras,
       sum(steps)                                                 AS steps,
       sum(done)                                                  AS done,
       sum(in_progress)                                           AS in_progress,
       sum(blocked)                                               AS blocked,
       round(100.0 * sum(done) / nullif(sum(steps),0), 0)         AS pct_done,
       sum(remaining_minutes_low)                                 AS remaining_minutes_low,
       sum(remaining_minutes_high)                                AS remaining_minutes_high
  FROM public.ops_build_rollup;
