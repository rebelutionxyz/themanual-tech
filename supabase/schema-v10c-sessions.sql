-- ═══════════════════════════════════════════════════════════════════════
-- schema-v10c-sessions.sql
-- HoneyComb Phase 8 — sessions only (file 3 of 4)
-- 2026-04-27 — split from monolithic schema-v10 due to pooler limits
--
-- Run order:  a → b → c → d
--   a, b              canonical_documents + document_versions
--   c (this file)     sessions             (independent — no FK to a/b)
--   d                 RPC
--
-- ⚠ DESTRUCTIVE: drops sessions. If you have already extracted session
-- logs into the database, this will lose them. The user reports
-- sessions was created in a prior partial-apply run; if the data
-- there matters, dump it first:
--
--   COPY (SELECT * FROM public.sessions) TO STDOUT WITH CSV HEADER;
--
-- and re-INSERT after the recreate.
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Cleanup
DROP TABLE IF EXISTS public.sessions CASCADE;

-- 1. Table — registry of session-log directories (Tool #0 output)
--    One row per session-log directory in themanual-canonical/session-logs/.
--    Each directory contains the canonical 5-file structure.
--    No MMF spec — designed from scratch for this migration.
CREATE TABLE public.sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT NOT NULL UNIQUE,                          -- '2026-04-24-honeycomb-og-foundation-build'
    topic              TEXT NOT NULL,                                  -- human-readable
    date_start         DATE NOT NULL,
    date_end           DATE,                                           -- null for single-day sessions
    participants       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    tags               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    decision_count     INTEGER NOT NULL DEFAULT 0 CHECK (decision_count >= 0),
    open_thread_count  INTEGER NOT NULL DEFAULT 0 CHECK (open_thread_count >= 0),
    source_file        TEXT,                                           -- original transcript filename
    source_lines       INTEGER CHECK (source_lines IS NULL OR source_lines >= 0),
    source_characters  BIGINT  CHECK (source_characters IS NULL OR source_characters >= 0),
    storage_path       TEXT,                                           -- e.g. 'session-logs/2026-04-24-…/'
    extracted_by       TEXT,                                           -- agent identifier/version e.g. 'session-log-extractor@v1.0'
    extracted_by_bee   UUID REFERENCES public.bees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    extracted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ,                                    -- soft delete per project convention
    CHECK (date_end IS NULL OR date_end >= date_start)
);

-- 2. Indexes
CREATE INDEX sessions_date_start_idx
    ON public.sessions(date_start DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX sessions_tags_gin_idx
    ON public.sessions USING GIN (tags);

CREATE INDEX sessions_participants_gin_idx
    ON public.sessions USING GIN (participants);

CREATE INDEX sessions_extracted_at_idx
    ON public.sessions(extracted_at DESC);

-- 3. RLS — public SELECT (excluding soft-deleted rows)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_public_read" ON public.sessions;
CREATE POLICY "sessions_public_read"
    ON public.sessions
    FOR SELECT USING (deleted_at IS NULL);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY
--   SELECT COUNT(*) FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'sessions';
--   -- expect 17
--
--   SELECT rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'sessions';
--   -- expect t
-- ═══════════════════════════════════════════════════════════════════════
