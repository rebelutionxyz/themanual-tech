-- ROLLBACK for auth_login_rate_v1 (DB39, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- This one is a clean revert, unlike most: the migration only ADDS a table and a
-- function that nothing else references. Dropping them returns the catalog to its
-- pre-DB39 state exactly.
--
-- ORDER: function first, then the table it writes to.
--
-- DATA LOST: every row in auth_login_attempts. That table holds only
-- (scope, sha256 key, minute bucket, count) -- no identifiers, no IPs, no emails,
-- nothing reconstructable. Losing it resets rate-limit counters, which fail OPEN
-- for one window and then rebuild. Acceptable.
--
-- IMPORTANT: if the auth-login edge function is deployed, running this rollback
-- WITHOUT also deleting that function leaves auth-login calling a missing RPC.
-- The function fails CLOSED in that case (rate_check error -> generic 401, no
-- login), so it is safe but it is a total login-by-handle outage. Delete the
-- function first:  supabase functions delete auth-login --project-ref anxmqiehpyznifqgskzc

BEGIN;

DROP FUNCTION IF EXISTS public.auth_login_rate_check(text, text, integer, integer);
DROP TABLE    IF EXISTS public.auth_login_attempts;

COMMIT;
