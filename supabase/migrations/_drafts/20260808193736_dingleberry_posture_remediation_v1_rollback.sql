-- ROLLBACK for dingleberry_posture_remediation_v1 (DB31, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- WARNING: this restores the WORSE state. It re-grants INSERT/UPDATE/DELETE on
-- seven public read views to anon and authenticated, and re-opens the DB11 root
-- cause on trivia_topic_candidates. It exists because the amendment requires a
-- stated rollback, not because it is a maintenance procedure. If a revert is
-- ever genuinely needed, revert the ONE object that caused the problem -- do not
-- run this file whole.
--
-- Every statement below is the exact inverse of the forward migration, measured
-- against the pre-apply catalog state recorded in REPORT.md (DB31 pre-flight):
--   - 42 write-privilege rows across 7 views x 2 roles x 3 privileges
--   - trivia_topic_candidates reloptions: (none)
--   - all 8 functions proconfig: NULL

BEGIN;

-- LEG 1 inverse
GRANT INSERT, UPDATE, DELETE ON public.justice_claims_public        TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_dockets_public       TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_docket_events_public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_exhibits_public      TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_filings_public       TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_outcomes_public      TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_timeline_public      TO anon, authenticated;

-- LEG 2 inverse
ALTER VIEW public.trivia_topic_candidates RESET (security_invoker);

-- LEG 3 inverse -- RESET returns proconfig to NULL, which is the measured
-- pre-apply state for all eight.
ALTER FUNCTION public.bee_handle_skeleton(text)                RESET search_path;
ALTER FUNCTION public.get_atom_level(text)                     RESET search_path;
ALTER FUNCTION public.realm_path_match(text[], jsonb, text[])  RESET search_path;
ALTER FUNCTION public.press_fill_stats(uuid)                   RESET search_path;
ALTER FUNCTION public.press_slot_map(uuid)                     RESET search_path;
ALTER FUNCTION public.press_slot_price_cents(uuid, uuid)       RESET search_path;
ALTER FUNCTION public.press_touch_updated_at()                 RESET search_path;
ALTER FUNCTION elections_private.counted_options(uuid[], text) RESET search_path;

COMMIT;
