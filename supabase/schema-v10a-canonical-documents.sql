-- ═══════════════════════════════════════════════════════════════════════
-- schema-v10a-canonical-documents.sql
-- HoneyComb Phase 8 — canonical_documents only (file 1 of 4)
-- 2026-04-27 — split from monolithic schema-v10 due to pooler limits
--
-- Run order:  a → b → c → d
--   a (this file)     creates canonical_documents
--   b                 creates document_versions   (FK depends on a)
--   c                 creates sessions             (independent)
--   d                 creates bump_canonical_fetch_count RPC (depends on a)
--
-- Why split: Supabase's pgbouncer transaction pooler rejects multi-
-- statement prepared statements with `cannot insert multiple commands
-- into prepared statement`. Each split file is a focused logical unit;
-- if the pooler still complains on this file, run statements one at a
-- time, or switch to the session pooler / direct connection. Studio's
-- SQL editor handles multi-statement files fine.
--
-- ⚠ DESTRUCTIVE: drops canonical_documents (and via CASCADE any child
-- table that still references it — typically document_versions if a
-- prior partial-apply state exists). Safe because canonical_documents
-- is populated by a separate upload procedure, not by application code.
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Cleanup
DROP TABLE IF EXISTS public.canonical_documents CASCADE;

-- 1. Table
CREATE TABLE public.canonical_documents (
    slug              TEXT PRIMARY KEY,
    current_version   TEXT NOT NULL,
    current_url       TEXT NOT NULL,
    doc_storage_path  TEXT,                                          -- e.g. 'canonical/master-master-file-current.md'
    description       TEXT,
    tier              SMALLINT CHECK (tier BETWEEN 1 AND 6),         -- per CANONICAL_FOLDER_MAP slug registry
    fetch_count       INTEGER NOT NULL DEFAULT 0 CHECK (fetch_count >= 0),
    last_updated      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_bee    UUID REFERENCES public.bees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX canonical_docs_tier_idx
    ON public.canonical_documents(tier)
    WHERE tier IS NOT NULL;

CREATE INDEX canonical_docs_last_updated_idx
    ON public.canonical_documents(last_updated DESC);

-- 3. RLS — public SELECT only; service_role bypasses RLS for writes
ALTER TABLE public.canonical_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canonical_docs_public_read" ON public.canonical_documents;
CREATE POLICY "canonical_docs_public_read"
    ON public.canonical_documents
    FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY
--   SELECT COUNT(*) FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'canonical_documents';
--   -- expect 10
--
--   SELECT rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'canonical_documents';
--   -- expect t
-- ═══════════════════════════════════════════════════════════════════════
