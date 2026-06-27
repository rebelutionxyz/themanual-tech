-- =====================================================================
-- Migration 20260606171930 — atom_canonical_link_columns
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via MCP (Claude-chat).
-- Backfill (outcome-faithful). Link-only phase: adds the canonical-source columns
-- to atoms. Both nullable text, no default.
-- =====================================================================

ALTER TABLE public.atoms
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS canonical_source text;
