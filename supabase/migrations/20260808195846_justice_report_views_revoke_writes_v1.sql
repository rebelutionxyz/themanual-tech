-- DB34 -- THE TWO JUSTICE VIEWS THE PATTERN MISSED
--
-- justice_claims_unsourced_report and justice_karma_totals_recomputed carry the
-- identical defect DB31 closed on the seven justice_*_public views: INSERT,
-- UPDATE and DELETE granted to BOTH anon and authenticated on a public read
-- view. 12 grants that should not exist.
--
-- They were missed because the DB31 dispatch list came from a
-- LIKE 'justice\_%\_public' pattern and neither name matches it. DB28 warned
-- about exactly this in writing (see supabase/migrations/_drafts/
-- 20260804090000_justice_public_views_revoke_anon_writes.sql) and was right.
-- DB32's posture scanner is the permanent fix for the pattern-matching failure;
-- this file is the one-time cleanup.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808200000_justice_report_views_revoke_writes_v1_rollback.sql
--           Written first, and stated verbatim in the DB34 dispatch body.
--
-- PRE-FLIGHT (read off production before the apply):
--   Both objects are relkind='v', owner postgres, reloptions security_invoker=true.
--   information_schema.views: is_updatable NO, is_insertable_into NO, and all
--   three is_trigger_* NO -- so no INSTEAD OF trigger exists and the grants are
--   inert TODAY. They are one CREATE OR REPLACE or one trigger away from live,
--   which is the entire lesson of the DB11 incident class.
--   anon and authenticated each hold SELECT on both views. PRESERVED -- these are
--   public read surfaces. postgres and service_role grants are untouched.
--   Rows at risk: 0. No DML is issued.
--
-- REHEARSED against production inside BEGIN ... ROLLBACK. Verbatim output in
-- REPORT.md, DB34 section.

BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.justice_claims_unsourced_report FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.justice_karma_totals_recomputed FROM anon, authenticated;

COMMIT;
