-- ROLLBACK for 20260903203852_patchboard1_settings_unique_nulls_not_distinct.sql
-- Restores the original flat UNIQUE. Only meaningful alongside a rollback of the
-- whole PATCHBOARD1 set; on its own it re-introduces the duplicate-row bug.
-- Will FAIL if duplicate NULL-scope rows exist at that point — that is the bug
-- this migration exists to prevent, so resolve them first rather than forcing.
ALTER TABLE public.patchboard_settings
  DROP CONSTRAINT IF EXISTS patchboard_settings_scope_uq;
ALTER TABLE public.patchboard_settings
  ADD CONSTRAINT patchboard_settings_switch_key_bee_id_astra_id_key
  UNIQUE (switch_key, bee_id, astra_id);
