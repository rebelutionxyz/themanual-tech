-- ROLLBACK for ops_rail_readme_v1 (OPS85, 2026-08-08).
--
-- WRITTEN BEFORE THE APPLY, per the MIGRATION AMENDMENT.
--
-- Clean revert. The forward migration only ADDS one function; it rewrites no
-- rows, alters no table, and nothing else references it. Dropping it returns
-- the catalog to its pre-OPS85 state exactly.
--
-- NOT COVERED HERE, deliberately: the RAIL_BOOTSTRAP row in public.ops_docs.
-- ops_docs is append-only by convention -- latest = newest row per slug, and R8
-- says never UPDATE or DELETE a docs row. So the doc is NOT rolled back by this
-- file. To retire it, publish a superseding version; do not delete the row.
--
-- CONSEQUENCE OF RUNNING THIS: any session told to "read the rail" gets an
-- undefined-function error rather than a briefing. The pointer stanza in
-- CLAUDE.md files would then name a function that does not exist. If this
-- rollback is ever run, pull the pointer stanza in the same change.

BEGIN;

DROP FUNCTION IF EXISTS public.ops_rail_readme();

COMMIT;

-- VERIFY AFTER ROLLBACK:
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname = 'ops_rail_readme';
--   -- expected: 0
