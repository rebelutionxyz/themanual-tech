-- =============================================================================
-- Migration 20260613161000 — astra_registry anon SELECT policy
-- =============================================================================
-- Status:  APPLIED to production 2026-06-13 (via MCP). This file is a PARITY
--          BACKFILL — reproduces the applied policy for repo parity and fresh-DB
--          rebuilds. Idempotent (DROP IF EXISTS + CREATE); re-applying is safe.
--
-- Purpose:
--   Opens astra_registry SELECT to the anon role so the INTEL Astra grid renders
--   for logged-out Bees (the registry is the durable grid source; the rows are
--   public Astra identity, not operator-private data). The existing
--   authenticated SELECT policy stays; writes remain service-role only.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "astra_registry_select_anon" ON public.astra_registry;
CREATE POLICY "astra_registry_select_anon"
    ON public.astra_registry
    FOR SELECT
    TO anon
    USING (true);

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
--   SELECT polname FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
--   WHERE c.relname='astra_registry';
--   -- expect: astra_registry_select_anon + astra_registry_select_authenticated
--
-- ROLLBACK (reference only):
--   DROP POLICY IF EXISTS "astra_registry_select_anon" ON public.astra_registry;
