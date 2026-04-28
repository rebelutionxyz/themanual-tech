-- ═══════════════════════════════════════════════════════════════════════
-- schema-v10d-rpc-and-indexes.sql
-- HoneyComb Phase 8 — RPC + grants (file 4 of 4)
-- 2026-04-27 — split from monolithic schema-v10 due to pooler limits
--
-- Run order:  a → b → c → d
--   a, b, c           tables
--   d (this file)     bump_canonical_fetch_count RPC + grants
--
-- ⚠ Prerequisite: schema-v10a must have already run successfully —
-- the RPC issues an UPDATE on public.canonical_documents.
--
-- The "and-indexes" in the filename is a placeholder for any future
-- cross-cutting indexes that span tables. v10 didn't define any —
-- all indexes live with their tables in v10a/v10b/v10c. If a future
-- index spans tables (e.g., a view's materialized index), it lands
-- here.
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Cleanup
DROP FUNCTION IF EXISTS public.bump_canonical_fetch_count(TEXT);

-- 1. Function — concurrency-safe atomic increment for fetch_count.
--    Granted to anon + authenticated so /api/canonical/:slug can call
--    without service-role secrets in front-end code paths.
--    Single-statement UPDATE — no read-modify-write race.
CREATE OR REPLACE FUNCTION public.bump_canonical_fetch_count(p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.canonical_documents
    SET    fetch_count = fetch_count + 1
    WHERE  slug = p_slug;
END;
$$;

-- 2. Grants
GRANT EXECUTE ON FUNCTION public.bump_canonical_fetch_count(TEXT)
    TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY
--   SELECT proname, prosecdef
--   FROM pg_proc
--   WHERE proname = 'bump_canonical_fetch_count';
--   -- expect 1 row, prosecdef = t (SECURITY DEFINER)
--
--   SELECT has_function_privilege('anon',
--          'public.bump_canonical_fetch_count(TEXT)', 'EXECUTE');
--   -- expect t
--
-- SMOKE TEST (run only after a row exists in canonical_documents):
--   SELECT public.bump_canonical_fetch_count('master-master-file');
--   SELECT slug, fetch_count
--   FROM public.canonical_documents
--   WHERE slug = 'master-master-file';
--   -- expect fetch_count incremented by 1
-- ═══════════════════════════════════════════════════════════════════════
