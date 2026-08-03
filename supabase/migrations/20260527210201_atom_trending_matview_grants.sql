-- =============================================================================
-- Migration 20260527220000 — atom_trending_* matview SELECT grants
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  TrendingAtoms component dispatch (Bee-facing component reads matview
--          directly via anon-key supabase-js, per amendment §2.5).
--
-- Materialized views don't have RLS — access is grant-based. Default privileges
-- did not include anon / authenticated; this grants public SELECT so the
-- Bee-facing TrendingAtoms component can query without a service-role round-trip.
-- atoms table is already public-read via atoms_read_all policy.
-- =============================================================================

BEGIN;
GRANT SELECT ON public.atom_trending_24h TO anon, authenticated;
GRANT SELECT ON public.atom_trending_7d  TO anon, authenticated;
GRANT SELECT ON public.atom_trending_30d TO anon, authenticated;
COMMIT;
