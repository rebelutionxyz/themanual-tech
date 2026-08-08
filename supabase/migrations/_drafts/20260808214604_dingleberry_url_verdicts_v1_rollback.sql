-- ROLLBACK for 20260808213000_dingleberry_url_verdicts_v1.sql  (DB38)
--
-- Written FIRST, before the migration was authored, per the MIGRATION AMENDMENT.
--
-- The DB38 dispatch stated the rollback as "drop the new table and function".
-- The migration creates THREE objects, not two: the verdict cache, a per-Bee
-- usage table, and the rate-check function. The usage table exists because the
-- dispatch asked for a per-Bee rate limit reusing the DB33 pattern, and that
-- pattern is two objects (counters table + atomic check function), not one.
--
-- The pass is ADDITIVE ONLY. No existing object is altered, dropped or
-- re-granted; in particular DB33's dingleberry_hash_* objects are untouched.
-- Executing this file returns the database to its exact pre-DB38 state, losing
-- nothing but cached URL verdicts and the current minute's rate counters.

BEGIN;

DROP FUNCTION IF EXISTS public.dingleberry_url_rate_check(uuid, integer);
DROP TABLE IF EXISTS public.dingleberry_url_lookup_usage;
DROP TABLE IF EXISTS public.dingleberry_url_verdicts;

COMMIT;
