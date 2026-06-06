-- =====================================================================
-- Migration 20260606195430 — manual_groups_revoke_public_execute_signin_only
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via MCP (Claude-chat).
-- Backfill (outcome-faithful). Sign-in-only hardening for the manual_groups RPCs.
-- NOTE: REVOKE FROM PUBLIC is a documented NO-OP here — anon reached these via a
-- DIRECT anon grant, not PUBLIC — so the effective fix is the companion
-- 20260606195452 (REVOKE FROM anon). Kept as applied for ledger fidelity.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.create_manual_group(text, text, text, text, text[], boolean, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_manual_group(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leave_manual_group(uuid) FROM PUBLIC;
