-- ROLLBACK for 20260818005500_ops106_pass_durations_effort_v1.sql
-- OPS106, 2026-08-18. WRITTEN BEFORE THE APPLY per the MIGRATION AMENDMENT.
--
-- WHAT RUNNING THIS RESTORES: a metric that marks a pass suspect for filing a
-- question -- 41 of 256 flagged, 40 of them for that reason alone -- and a rail
-- readme that documents the EFFORT tag nowhere. It touches no data; both objects
-- are derived or textual.
--
-- The `bounced` column disappears with the view definition. Nothing reads it.

-- 1. The view, restored to the definition OPS104 recorded verbatim
--    (md5 4c5599b63731e084e79e853b833a5e39, length 882).
CREATE OR REPLACE VIEW public.ops_pass_durations AS
 WITH first_report AS (
         SELECT regexp_replace(ops_reports.pass, '-Q$'::text, ''::text) AS base_pass,
            min(ops_reports.created_at) AS first_report_at,
            bool_or(ops_reports.pass ~~ '%-Q'::text) AS question_filed
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
    f.question_filed OR EXTRACT(epoch FROM f.first_report_at - d.claimed_at) < 120::numeric AS suspect
   FROM ops_dispatches d
     JOIN first_report f ON f.base_pass = d.pass
  WHERE d.claimed_at IS NOT NULL AND f.first_report_at > d.claimed_at;

-- 2. The readme, reversed by the same assertion technique the forward migration
--    used: it must currently be the body OPS106 installed, and it must transform
--    back to exactly the body OPS104 measured, or this aborts having done nothing.
DO $ops106rb$
DECLARE v_src text; v_new text;
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'ops_rail_readme';

  IF md5(v_src) <> '15f3add3ac8a7dccccd74d31fb61b0d7' THEN
    RAISE EXCEPTION 'ops_rail_readme is not the body OPS106 installed (md5 %) - refusing to revert it', md5(v_src);
  END IF;

  v_new := regexp_replace(v_src, '\|\| E''QUEUEING WORK.*?\n(?=\|\| E''ONBOARDING)', '', 'ns');
  v_new := replace(v_new, 'RAIL_README v1.2', 'RAIL_README v1.1');

  IF md5(v_new) <> 'a37f9665ae7f4ed2a512622c0b0e294b' THEN
    RAISE EXCEPTION 'reverse transform did not reproduce the OPS104 body (md5 %) - refusing to install it', md5(v_new);
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.ops_rail_readme() RETURNS text '
    'LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''pg_catalog'', ''public'' AS %L',
    v_new);
END
$ops106rb$;
