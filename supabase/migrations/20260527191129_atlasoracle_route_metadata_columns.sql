-- =============================================================================
-- Migration 20260527185000 — AtlasOracle route metadata columns
-- =============================================================================
-- Date:        2026-05-27
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED at file commit; applied to production via Supabase
--              MCP apply_migration in same session.
-- Source:      atlasoracle-route Edge Function dispatch, 2026-05-27
--              shared/canon/atlasoracle-v1-final-scope.md §2.2
--
-- Purpose:
--   Adds 6 metadata columns to atlasoracle_directives so the route Edge
--   Function can record per-directive billing + observability data:
--
--     status          — pending | success | failed   (tristate lifecycle)
--     error_message   — sanitized system-level error text on failure
--     input_tokens    — prompt-side token count from provider
--     output_tokens   — completion-side token count from provider
--     cached_tokens   — cache-hit input tokens (Anthropic prompt caching)
--     completed_at    — terminal timestamp; null while status='pending'
--
-- Content-leak posture (preserved from 20260520120000 header):
--   This migration adds METADATA ONLY. No directive_text or response_text
--   columns. The route function returns the response in the HTTP body and
--   never persists it. error_message is for SYSTEM errors only (e.g.
--   "Anthropic 502", "insufficient escrow" race) — never for content of
--   the directive or response.
--
-- Idempotency:
--   - All ADD COLUMN clauses use IF NOT EXISTS.
--   - CHECK constraint on status uses DROP-then-ADD for refresh-on-rerun.
--   Re-apply after a successful first apply is a no-op.
-- =============================================================================

BEGIN;

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS status        text        NOT NULL DEFAULT 'pending';

ALTER TABLE public.atlasoracle_directives
    DROP CONSTRAINT IF EXISTS atlasoracle_directives_status_chk;
ALTER TABLE public.atlasoracle_directives
    ADD  CONSTRAINT atlasoracle_directives_status_chk
        CHECK (status IN ('pending', 'success', 'failed'));

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS input_tokens  integer;

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS output_tokens integer;

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS cached_tokens integer;

ALTER TABLE public.atlasoracle_directives
    ADD COLUMN IF NOT EXISTS completed_at  timestamptz;

COMMIT;
