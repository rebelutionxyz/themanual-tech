-- ROLLBACK for 20260808194223_dingleberry_hash_verdicts_v1.sql (DB33).
--
-- Written BEFORE the forward migration was applied, per the MIGRATION AMENDMENT.
--
-- BLAST RADIUS: nil at apply time. Both tables are created by the forward
-- migration and hold zero rows until the edge function first runs. Running this
-- rollback after the function has been live loses only cached verdicts and the
-- current minute's rate counters -- the next lookup re-queries the provider and
-- refills the cache. No other object references either table.
--
-- ORDER: function first (it is the only thing that writes the usage table),
-- then the tables. No CASCADE anywhere -- if something unexpected depends on
-- these objects the DROP must fail loudly rather than take the dependent with it.

BEGIN;

DROP FUNCTION IF EXISTS public.dingleberry_hash_rate_check(uuid, integer);

DROP TABLE IF EXISTS public.dingleberry_hash_lookup_usage;

DROP TABLE IF EXISTS public.dingleberry_hash_verdicts;

COMMIT;
