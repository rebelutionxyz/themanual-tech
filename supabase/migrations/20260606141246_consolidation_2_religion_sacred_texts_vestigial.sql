-- =====================================================================
-- Migration 20260606141246 — consolidation_2_religion_sacred_texts_vestigial
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Verbatim body (DELETE migration). Removes the vestigial duplicate
-- 'Religion / Sacred texts' branch (5 empty nodes) superseded by the
-- under-tradition text shelf.
-- =====================================================================

DELETE FROM public.atoms
WHERE id IN (
  'religion-sacred-texts-bible-names',
  'religion-sacred-texts-bible-stories',
  'religion-sacred-texts-bible-unnamed-figures',
  'religion-sacred-texts-bible',
  'religion-sacred-texts'
);
