-- ═══════════════════════════════════════════════════════════════════════
-- schema-v10b-document-versions.sql
-- HoneyComb Phase 8 — document_versions only (file 2 of 4)
-- 2026-04-27 — split from monolithic schema-v10 due to pooler limits
--
-- Run order:  a → b → c → d
--   a                 canonical_documents (must run before this)
--   b (this file)     document_versions   (FK on canonical_documents.slug)
--   c                 sessions
--   d                 RPC
--
-- ⚠ Prerequisite: schema-v10a must have already run successfully —
-- the FK on doc_slug → canonical_documents(slug) requires the parent
-- table to exist.
--
-- ⚠ DESTRUCTIVE: drops document_versions (CASCADE not needed; nothing
-- depends on it). Safe because document_versions is append-only history
-- populated by the upload procedure, not application code.
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Cleanup
DROP TABLE IF EXISTS public.document_versions CASCADE;

-- 1. Table — append-only history of every version published
CREATE TABLE public.document_versions (
    doc_slug            TEXT NOT NULL
                        REFERENCES public.canonical_documents(slug)
                        ON DELETE RESTRICT ON UPDATE CASCADE,
    version             TEXT NOT NULL,
    url                 TEXT NOT NULL,
    content_hash        TEXT,                                         -- sha256 hex preferred
    content_size_bytes  BIGINT CHECK (content_size_bytes IS NULL OR content_size_bytes >= 0),
    created_by_bee      UUID REFERENCES public.bees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (doc_slug, version)
);

-- 2. Indexes
CREATE INDEX document_versions_history_idx
    ON public.document_versions(doc_slug, created_at DESC);

CREATE INDEX document_versions_hash_idx
    ON public.document_versions(content_hash)
    WHERE content_hash IS NOT NULL;

-- 3. RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_versions_public_read" ON public.document_versions;
CREATE POLICY "document_versions_public_read"
    ON public.document_versions
    FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY
--   SELECT COUNT(*) FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'document_versions';
--   -- expect 7
--
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'public.document_versions'::regclass
--     AND contype = 'f';
--   -- expect at least: doc_slug → canonical_documents(slug)
--                       created_by_bee → bees(id)
-- ═══════════════════════════════════════════════════════════════════════
