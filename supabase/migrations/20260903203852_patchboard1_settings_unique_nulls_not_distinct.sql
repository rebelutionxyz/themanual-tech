-- ============================================================================
-- PATCHBOARD1 correctness fix — applied 2026-09-03, stamped 20260903203852.
-- Flagged by the PATCHBOARD_DB2 holder during its pre-flight. Pass PATCHBOARD_DB2.
-- ----------------------------------------------------------------------------
-- THE BUG: patchboard_settings carried a flat UNIQUE (switch_key, bee_id, astra_id).
-- NULLs never collide in a unique constraint, and the whole Patchboard scope
-- encoding RELIES on NULLs — (NULL,NULL) is Master, (NULL,astra) is Astra-default,
-- (bee,NULL) is Bee-platform. So the constraint only ever protected Bee-per-Astra.
--   * patchboard_set_master_switch does ON CONFLICT (...) DO UPDATE — with NULLs
--     that conflict never fires, so every master write INSERTED A NEW ROW.
--   * get_effective_switch_state reads LIMIT 1 with no ORDER BY, so which of the
--     duplicates "won" was arbitrary.
-- Net effect: an HQ toggle flips on the first click and behaves unpredictably
-- after — exactly the "does anything here work?" symptom the owner reported.
--
-- THE FIX: PostgreSQL 15+ UNIQUE NULLS NOT DISTINCT (server is 17.6). The
-- existing ON CONFLICT (switch_key, bee_id, astra_id) clauses in all four write
-- RPCs infer this constraint unchanged, so NO RPC body changes — they simply
-- start working for every scope.
--
-- SAFE: 0 rows and 0 duplicate scopes at apply time, verified immediately before.
-- Had duplicates existed they would need resolving (keep newest set_at) first.
--
-- patchboard_values (20260903203925) was designed with four partial unique
-- indexes from the start and does not need this.
-- ============================================================================

ALTER TABLE public.patchboard_settings
  DROP CONSTRAINT IF EXISTS patchboard_settings_switch_key_bee_id_astra_id_key;

ALTER TABLE public.patchboard_settings
  ADD CONSTRAINT patchboard_settings_scope_uq
  UNIQUE NULLS NOT DISTINCT (switch_key, bee_id, astra_id);

COMMENT ON CONSTRAINT patchboard_settings_scope_uq ON public.patchboard_settings IS
  'One row per (switch_key, scope). NULLS NOT DISTINCT because NULL bee_id / astra_id ENCODE a scope (Master, Astra-default, Bee-platform) and must collide. Without it, master and astra writes duplicate instead of upserting.';
