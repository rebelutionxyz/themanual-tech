-- ROLLBACK for 20260804090000_justice_public_views_revoke_anon_writes.sql
-- DB28, 2026-08-04. Written BEFORE the forward migration, per the dispatch.
--
-- WARNING, READ BEFORE RUNNING: this restores the WORSE state. It re-grants
-- INSERT/UPDATE/DELETE on nine justice views to anon, and clears security_invoker
-- on trivia_topic_candidates -- which is the exact configuration DB11 proved
-- lets an unauthenticated caller DELETE rows in public.atoms.
--
-- It exists for protocol completeness (R7 requires a stated rollback before an
-- apply). It is not a maintenance procedure. If the forward migration ever needs
-- reverting, prefer reverting only the ONE object that caused the problem rather
-- than running this file whole.

BEGIN;

-- LEG 1 inverse -- re-grant anon writes on the nine justice views.
GRANT INSERT, UPDATE, DELETE ON public.justice_claims_public           TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_claims_unsourced_report TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_docket_events_public    TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_dockets_public          TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_exhibits_public         TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_filings_public          TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_karma_totals_recomputed TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_outcomes_public         TO anon;
GRANT INSERT, UPDATE, DELETE ON public.justice_timeline_public         TO anon;

-- LEG 2 inverse -- reopen the DB11 root cause on the atoms view.
ALTER VIEW public.trivia_topic_candidates SET (security_invoker = false);

COMMIT;
