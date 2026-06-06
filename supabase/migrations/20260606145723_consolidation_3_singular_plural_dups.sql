-- =====================================================================
-- Migration 20260606145723 — consolidation_3_singular_plural_dups
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Verbatim body (DELETE migration). Removes singular duplicates
-- (Angel/Demon/Patriarch) where a plural canonical node is kept.
-- =====================================================================

DELETE FROM public.atoms
WHERE id IN (
  'religion-beings-angel',
  'religion-beings-demon',
  'religion-religious-roles-patriarch'
);
