-- DB28 -- JUSTICE HARDENING: remove anon write grants from the nine justice
-- views, and finish DB11's atoms half.
--
-- WHY (OPS82, 2026-08-03, verified against the live catalog):
--   All nine justice views carry security_invoker=true -- good -- but anon still
--   holds INSERT/UPDATE/DELETE on every one of them. They are inert on ONE
--   reloption. A CREATE OR REPLACE VIEW that omits the option, or an ALTER that
--   clears it, converts this into the incident class DB11 proved in July:
--   a non-invoker + auto-updatable + granted view resolves its base table as its
--   owner (postgres, rolbypassrls=t), bypassing RLS with no error and no log line.
--   justice_dockets_public is auto-updatable TODAY (is_updatable = YES).
--
--   DB11's atoms remediation was applied in half: the REVOKE landed (anon and
--   authenticated hold no write grant on trivia_topic_candidates), but the
--   root-cause ALTER VIEW never ran -- reloptions is still empty. LEG 2 finishes it.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260804090000_justice_public_views_revoke_anon_writes_rollback.sql
--           (restores the worse state; exists for protocol completeness only)
--
-- SCOPE: three write privileges on nine views, plus one reloption. No SELECT
-- grant is touched, no RLS policy is edited, no other object is referenced.
-- service_role and postgres grants are deliberately untouched -- the only
-- workspace consumer of trivia_topic_candidates reads it with the service-role
-- key and issues SELECT only (DB11).

BEGIN;

-- LEG 1 -- the nine justice views.
-- NOTE: two of the nine do NOT match the 'justice_%_public' pattern. They are
-- named explicitly here for that reason; a pattern-matched migration would
-- silently skip justice_claims_unsourced_report and justice_karma_totals_recomputed.
REVOKE INSERT, UPDATE, DELETE ON public.justice_claims_public           FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_claims_unsourced_report FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_docket_events_public    FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_dockets_public          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_exhibits_public         FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_filings_public          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_karma_totals_recomputed FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_outcomes_public         FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.justice_timeline_public         FROM anon;

-- LEG 2 -- finish DB11 on the atoms view. The revoke half is already in place;
-- this closes the root cause so a future re-grant cannot reopen the hole.
ALTER VIEW public.trivia_topic_candidates SET (security_invoker = true);

COMMIT;
