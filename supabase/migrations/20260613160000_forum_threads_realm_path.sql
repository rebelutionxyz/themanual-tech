-- =============================================================================
-- Migration 20260613160000 — forum_threads.realm_path (full-depth realm lens)
-- =============================================================================
-- Status:  APPLIED to production 2026-06-13. This file is a PARITY BACKFILL —
--          reproduces the applied change for repo parity and fresh-DB rebuilds.
--          Idempotent; re-applying is a no-op.
--
-- Purpose:
--   A thread's category = its realm_path: the full taxonomy path it's tagged to,
--   mirroring atoms.path_parts (display names, e.g. ['Justice','Courts','Appeals']).
--   The realm tree (atoms.path_parts) is the single source for BOTH the toolbar
--   Realms drill and thread tagging, so keys match.
--
--   The cross-Astra realm-lens feed narrows by PREFIX: given a drilled path P
--   (text[] of display names, length N), a thread matches when
--   realm_path[1:N] = P (the thread sits at P or anywhere below it). realm_path[1]
--   is the realm display name (maps to realms.name); primary_realm still holds
--   the realm slug for back-compat. GIN index supports the @>-based pre-filter.
--
--   Existing threads have realm_path = NULL until tagged; new posts set it via
--   the composer. (Pre-launch data is negligible; a later pass can backfill
--   realm_path from primary_realm/primary_l2.)
-- =============================================================================

BEGIN;

ALTER TABLE public.forum_threads
    ADD COLUMN IF NOT EXISTS realm_path text[];

COMMENT ON COLUMN public.forum_threads.realm_path IS
    'Full taxonomy path the thread is tagged to, mirroring atoms.path_parts '
    '(display names, e.g. ARRAY[''Justice'',''Courts'',''Appeals'']). The '
    'realm-lens feed narrows by prefix: a thread matches a drilled path P when '
    'realm_path[1:cardinality(P)] = P. realm_path[1] is the realm display name '
    '(maps to realms.name); primary_realm still holds the realm slug for back-compat.';

CREATE INDEX IF NOT EXISTS forum_threads_realm_path_gin
    ON public.forum_threads USING gin (realm_path);

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER COMMIT)
-- =============================================================================
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='forum_threads' AND column_name='realm_path';   -- 1 row
--   SELECT indexname FROM pg_indexes WHERE indexname='forum_threads_realm_path_gin';
--
-- ROLLBACK (reference only):
--   DROP INDEX IF EXISTS public.forum_threads_realm_path_gin;
--   ALTER TABLE public.forum_threads DROP COLUMN IF EXISTS realm_path;
