-- DB35 -- close the question bank bulk read. Owner ruling on DB31-Q, 2026-08-08.
--
-- WHY: public.question_bank_public granted SELECT to anon AND authenticated and
--   exposed 3,246 rows (10 live + 3,236 validated) in bulk through PostgREST,
--   unpaginated and unrate-limited. Anyone could download the entire question
--   bank before play.
--
--   The answer key is NOT in the projection - the view exposes only
--   (id, realm, prompt, choices, difficulty, answer_format, time_frame, status,
--   created_at), so correct_idx and accepted_answers were never reachable. This
--   is a COMPETITIVE-INTEGRITY hole, not a data breach. It matters more once
--   BLiNG! or prizes ride on the game.
--
--   The bulk read buys nothing. Anonymous play does not go through this view:
--   questions reach players through SECURITY DEFINER RPCs that anon may execute
--   (trivia_channel_tick, trivia_night_tick, trivia_reveal, trivia_submit_answer
--   and 14 others), and those decide what is revealed and when. Verified before
--   this apply: no routine body in any non-system schema references the view,
--   no other view or rule depends on it, and no repo consumer reads it.
--
-- WHAT THIS DOES NOT DO, on purpose:
--   - The view STAYS SECURITY DEFINER. DB31-Q option A stands: it is a redaction
--     boundary, and flipping it to security_invoker would break the redaction.
--     Once no public role can reach it, the DEFINER property is inert.
--   - postgres and service_role grants are untouched - admin and server paths
--     still read it.
--   - The view definition and the base table are untouched.
--
-- ROLLBACK: supabase/migrations/_drafts/
--           20260808204743_question_bank_public_revoke_public_read_v1_rollback.sql
--           (one line: GRANT SELECT ... TO anon, authenticated. Written first and
--           stated in the dispatch body.)
--
-- SCOPE: one privilege, one view, two roles. Zero rows at risk.

BEGIN;

REVOKE SELECT ON public.question_bank_public FROM anon, authenticated;

COMMIT;
