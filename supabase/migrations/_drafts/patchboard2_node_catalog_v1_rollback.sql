-- ============================================================================
-- PATCHBOARD2 - node catalog ROLLBACK (authored first, rollback-first discipline)
-- Reverses patchboard2_node_catalog_v1.sql + patchboard2_node_seed_v1.sql.
-- Additive layer is a leaf (no core object depends on it) -> clean drop.
-- ============================================================================
BEGIN;
DROP FUNCTION IF EXISTS public.patchboard_set_node_value(text, uuid, text);
DROP FUNCTION IF EXISTS public.patchboard_resolve_value(text, uuid, uuid);
DROP TABLE IF EXISTS public.patchboard_node_values;   -- seed rows cascade with the table
DROP TABLE IF EXISTS public.patchboard_nodes;
COMMIT;
