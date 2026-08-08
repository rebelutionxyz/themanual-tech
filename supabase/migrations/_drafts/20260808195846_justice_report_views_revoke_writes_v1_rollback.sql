-- ROLLBACK for justice_report_views_revoke_writes_v1 (DB34, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY. Stated verbatim in the DB34 dispatch body, per the
-- MIGRATION AMENDMENT.
--
-- WARNING: this restores the WORSE state -- it re-grants INSERT/UPDATE/DELETE on
-- two public read views to anon and authenticated. It exists because the
-- amendment requires a stated rollback, not because it is a maintenance
-- procedure.
--
-- Inverse of the forward file, measured against the DB34 pre-flight:
--   12 write-privilege rows = 2 views x 2 roles x 3 privileges.
--   No SELECT grant is touched in either direction.

BEGIN;

GRANT INSERT, UPDATE, DELETE ON public.justice_claims_unsourced_report TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.justice_karma_totals_recomputed TO anon, authenticated;

COMMIT;
