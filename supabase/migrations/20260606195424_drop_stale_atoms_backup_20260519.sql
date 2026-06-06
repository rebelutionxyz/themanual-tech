-- =====================================================================
-- Migration 20260606195424 — drop_stale_atoms_backup_20260519
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via MCP (Claude-chat).
-- Backfill: drops the stale 5,011-row, no-RLS snapshot table atoms_backup_2026_05_19.
-- Verified before drop: zero references (no inbound FK, no function bodies, no views).
-- IF EXISTS for replay safety (the table was created out-of-band on 2026-05-19).
-- =====================================================================

DROP TABLE IF EXISTS public.atoms_backup_2026_05_19;
