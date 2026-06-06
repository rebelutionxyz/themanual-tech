-- =====================================================================
-- Migration 20260606150332 — consolidation_4_color_singular_dup
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via apply_migration.
-- Verbatim body (DELETE migration). Removes the singular 'Color' duplicate
-- under Physics concepts.
-- =====================================================================

DELETE FROM public.atoms WHERE id = 'science-physics-physics-concepts-color';
