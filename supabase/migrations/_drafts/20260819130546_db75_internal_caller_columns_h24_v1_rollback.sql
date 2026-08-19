-- ROLLBACK for 20260819130546_db75_internal_caller_columns_h24_v1.sql.
-- Matches the STRICTLY-ADDITIVE SUBSET that was applied: drop the index and the
-- two added columns. bee_id was never dropped-to-nullable in the applied scope,
-- so there is nothing to re-tighten here.
BEGIN;
DROP INDEX IF EXISTS public.h24_directives_internal_idx;
ALTER TABLE public.h24_directives DROP COLUMN IF EXISTS caller_astra;
ALTER TABLE public.h24_directives DROP COLUMN IF EXISTS caller_kind;
COMMIT;
