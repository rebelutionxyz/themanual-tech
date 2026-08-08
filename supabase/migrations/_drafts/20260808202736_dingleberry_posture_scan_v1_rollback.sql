-- ROLLBACK for 20260808210000_dingleberry_posture_scan_v1.sql  (DB32)
--
-- Written FIRST, before the migration was authored, per the MIGRATION AMENDMENT
-- (root CLAUDE.md, Operational Rules / R7).
--
-- The DB32 dispatch stated the rollback as five DROPs. The migration ships TWO
-- MORE objects than the dispatch enumerated -- dingleberry_astra_of (the
-- immutable astra-attribution helper the dispatch itself asked for in section 2)
-- and dingleberry_posture_checks (the set-returning check catalog, so the check
-- SQL is defined once and consumed twice by the scan RPC instead of being
-- pasted). Both are dropped here. Drop order is dependency order:
-- view -> RPCs -> check catalog -> helper -> findings -> runs (FK).
--
-- The pass is ADDITIVE ONLY. It creates no columns on existing tables, alters
-- no existing object, and issues no DML against any pre-existing table.
-- Executing this file returns the database to its exact pre-DB32 state, minus
-- the posture history the scanner itself recorded.

BEGIN;

DROP VIEW IF EXISTS public.dingleberry_posture_by_astra;

DROP FUNCTION IF EXISTS public.dingleberry_posture_accept(uuid, text);
DROP FUNCTION IF EXISTS public.dingleberry_posture_scan();
DROP FUNCTION IF EXISTS public.dingleberry_posture_checks();
DROP FUNCTION IF EXISTS public.dingleberry_astra_of(text);

DROP TABLE IF EXISTS public.dingleberry_posture_findings;
DROP TABLE IF EXISTS public.dingleberry_posture_runs;

COMMIT;
