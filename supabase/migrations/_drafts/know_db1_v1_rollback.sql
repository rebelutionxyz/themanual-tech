-- ============================================================================
-- ROLLBACK for know_db1_v1.sql
-- ============================================================================
-- Reverse order of the forward file. Written BEFORE apply per the MIGRATION
-- AMENDMENT (rollback stated in the dispatch before the apply runs).
--
-- SAFE AT OR NEAR APPLY TIME: at apply, justice_watches / justice_collections
-- / justice_collection_members / justice_boosts are all empty (new tables),
-- so DROP TABLE loses nothing. victim_crime and contribution_premium_multiplier
-- are new columns with no dependent data at apply time either. If this rolls
-- back LONG after apply, once real rows/values exist, DROP TABLE and
-- DROP COLUMN below are destructive on whatever accumulated since - pg_dump
-- the four tables and the two columns first in that case, same caveat the
-- justice v1 schema draft states for its own rollback.
-- ============================================================================

BEGIN;

-- --- Section 7 (RLS) — dropped implicitly by DROP TABLE below, listed for
-- clarity / in case only the policy layer needs reverting independently.
DROP POLICY IF EXISTS justice_boosts_admin_read ON public.justice_boosts;
DROP POLICY IF EXISTS justice_boosts_public_read ON public.justice_boosts;
DROP POLICY IF EXISTS justice_collection_members_admin_all ON public.justice_collection_members;
DROP POLICY IF EXISTS justice_collection_members_public_read ON public.justice_collection_members;
DROP POLICY IF EXISTS justice_collections_admin_all ON public.justice_collections;
DROP POLICY IF EXISTS justice_collections_public_read ON public.justice_collections;
DROP POLICY IF EXISTS justice_watches_own ON public.justice_watches;

-- --- Section 6 — premium rung config column ---------------------------------
ALTER TABLE public.justice_settings
    DROP COLUMN IF EXISTS contribution_premium_multiplier;

-- --- Section 5 — boost margin config row ------------------------------------
DELETE FROM public.fee_schedule
 WHERE fee_key = 'know_boost' AND astra_ref IS NULL AND bee_ref IS NULL;

-- --- Section 4 — justice_boosts + its gate trigger/function -----------------
DROP TRIGGER IF EXISTS justice_boosts_victim_crime_gate_trg ON public.justice_boosts;
DROP FUNCTION IF EXISTS public.justice_boosts_victim_crime_gate();
DROP TABLE IF EXISTS public.justice_boosts;

-- --- Section 3 — victim_crime column ----------------------------------------
ALTER TABLE public.justice_dockets
    DROP COLUMN IF EXISTS victim_crime;

-- --- Section 2 — collections ------------------------------------------------
DROP TRIGGER IF EXISTS justice_collections_touch ON public.justice_collections;
DROP TABLE IF EXISTS public.justice_collection_members;
DROP TABLE IF EXISTS public.justice_collections;

-- --- Section 1 — watches -----------------------------------------------------
DROP TABLE IF EXISTS public.justice_watches;

COMMIT;

-- ============================================================================
-- VERIFICATION AFTER ROLLBACK
-- ============================================================================
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema='public' AND table_name IN
--      ('justice_watches','justice_collections','justice_collection_members','justice_boosts');
--   -- expect: 0 rows.
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='justice_dockets' AND column_name='victim_crime';
--   -- expect: 0 rows.
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='justice_settings'
--      AND column_name='contribution_premium_multiplier';
--   -- expect: 0 rows.
--
--   SELECT 1 FROM public.fee_schedule WHERE fee_key='know_boost';
--   -- expect: 0 rows.
-- ============================================================================
