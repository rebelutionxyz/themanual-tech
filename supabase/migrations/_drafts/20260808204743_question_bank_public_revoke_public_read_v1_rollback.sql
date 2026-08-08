-- ROLLBACK for 20260808204743_question_bank_public_revoke_public_read_v1.sql (DB35).
--
-- Written BEFORE the forward migration was applied, and stated verbatim in the
-- DB35 dispatch body, per the MIGRATION AMENDMENT.
--
-- WHEN TO RUN IT: the dispatch names one condition explicitly - if any trivia
-- path breaks, roll back immediately. A locked-down question bank is not worth
-- a broken game. The other condition is the residual risk: an out-of-repo
-- consumer (a partner integration, an old client build) that reads this view
-- would start failing with "permission denied for view question_bank_public".
--
-- BLAST RADIUS: one privilege on one view, for two roles. No rows, no DDL, no
-- change to the view definition or the base table. Restores exactly the grant
-- state recorded in REPORT.md section 1 of the DB35 entry.

BEGIN;

GRANT SELECT ON public.question_bank_public TO anon, authenticated;

COMMIT;
