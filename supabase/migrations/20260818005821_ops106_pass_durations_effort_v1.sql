-- OPS106 — apply the OPS104 proposal.
-- OWNER RULED "104" on 2026-08-17. OPS104 measured and proposed; this applies it.
-- ROLLBACK: supabase/migrations/_drafts/ops106_pass_durations_effort_rollback.sql
--
-- DEFECT 1. ops_pass_durations.suspect was
--   question_filed OR <under 120 seconds>
-- Measured across 256 passes: 41 suspect, 40 of them flagged SOLELY for having
-- filed a question — a 97.6 percent false positive rate on a flag that fires when
-- a terminal does the one thing RAIL_BOOTSTRAP most insists on. question_filed
-- comes OUT of the expression and STAYS as its own column. The 120-SECOND
-- duration half is UNCHANGED and correct; the one true positive in the whole
-- history (TRIV5, 85 seconds) still flags after this change.
--
-- Also adds `bounced` — the narrow signal the broad flag was standing in for:
-- a FIRST report that is a -Q filed inside 120 seconds, i.e. a terminal bouncing
-- without reading. It is appended LAST so ops_effort_stats, which reads effort /
-- minutes / suspect, is undisturbed. It currently fires ZERO times in 256 passes;
-- it goes in prophylactically and that is recorded rather than glossed.
CREATE OR REPLACE VIEW public.ops_pass_durations AS
 WITH first_report AS (
         SELECT regexp_replace(ops_reports.pass, '-Q$'::text, ''::text) AS base_pass,
            min(ops_reports.created_at) AS first_report_at,
            bool_or(ops_reports.pass ~~ '%-Q'::text) AS question_filed,
            ((array_agg(ops_reports.pass ORDER BY ops_reports.created_at))[1] ~~ '%-Q'::text) AS first_was_question
           FROM ops_reports
          GROUP BY (regexp_replace(ops_reports.pass, '-Q$'::text, ''::text))
        )
 SELECT d.pass,
    d.lane,
    lower(COALESCE("substring"(d.title, 'EFFORT:\s*([A-Za-z]+)'::text), 'untagged'::text)) AS effort,
    d.claimed_at,
    f.first_report_at,
    round(EXTRACT(epoch FROM f.first_report_at - d.claimed_at) / 60.0, 1) AS minutes,
    f.question_filed,
    EXTRACT(epoch FROM f.first_report_at - d.claimed_at) < 120::numeric AS suspect,
    f.first_was_question AND EXTRACT(epoch FROM f.first_report_at - d.claimed_at) < 120::numeric AS bounced
   FROM ops_dispatches d
     JOIN first_report f ON f.base_pass = d.pass
  WHERE d.claimed_at IS NOT NULL AND f.first_report_at > d.claimed_at;

-- DEFECT 2. The EFFORT tag is read by the view and documented nowhere, so the
-- lead queued twenty dispatches without knowing it existed. It is not an unknown
-- convention but a LAPSED one: 186 of 281 dispatches carry it, it ran on
-- essentially every dispatch from 2026-07-28 and stopped on 2026-08-09. The
-- measured vocabulary is LIGHT / STANDARD / DEEP (173 of 186), so that is what
-- gets documented — minting SMALL/MEDIUM/LARGE would orphan every tagged row.
--
-- THIS BLOCK REWRITES ops_rail_readme BY ASSERTION, NOT BY RETYPING IT. The
-- function body is 14,279 characters; pasting it would risk a silent transcription
-- error in canon that nothing would catch. Instead the transform is applied here
-- and BOTH hashes are asserted — the input must be exactly what OPS104 measured
-- and the output exactly what OPS106 built and reviewed offline. Any drift raises
-- and the migration aborts having changed nothing.
DO $ops106$
DECLARE
  v_src text;
  v_new text;
  v_anchor constant text := '|| E''ONBOARDING A NEW PROJECT -- two steps, and it is on the rail\n''';
  v_block  constant text := '|| E''QUEUEING WORK -- THE EFFORT TAG\n''
|| E''\n''
|| E''  Put EFFORT: LIGHT | STANDARD | DEEP in the dispatch TITLE. It is read by\n''
|| E''  ops_pass_durations and bucketed by ops_effort_stats; an untagged pass\n''
|| E''  lands in the untagged bucket and makes the percentiles meaningless.\n''
|| E''\n''
|| E''    LIGHT     one object, one file, an obvious change. Minutes.\n''
|| E''    STANDARD  the default. A pass with a done-test and a report.\n''
|| E''    DEEP      discovery, a migration, or work spanning several files.\n''
|| E''\n''
|| E''  These three are the MEASURED convention -- 173 of 186 tagged dispatches\n''
|| E''  used them. The tag ran on essentially every dispatch from 2026-07-28 and\n''
|| E''  lapsed on 2026-08-09. Do not mint new words: a fourth spelling for one\n''
|| E''  idea is how the vocabulary rotted the first time.\n''
|| E''\n''
';
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'ops_rail_readme';

  IF md5(v_src) <> 'a37f9665ae7f4ed2a512622c0b0e294b' THEN
    RAISE EXCEPTION 'ops_rail_readme is not the body OPS104 measured (md5 %) - refusing to rewrite it', md5(v_src);
  END IF;

  v_new := replace(v_src, v_anchor, v_block || v_anchor);
  v_new := replace(v_new, 'RAIL_README v1.1', 'RAIL_README v1.2');

  IF md5(v_new) <> '15f3add3ac8a7dccccd74d31fb61b0d7' THEN
    RAISE EXCEPTION 'transform produced an unexpected body (md5 %) - refusing to install it', md5(v_new);
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.ops_rail_readme() RETURNS text '
    'LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''pg_catalog'', ''public'' AS %L',
    v_new);
END
$ops106$;
