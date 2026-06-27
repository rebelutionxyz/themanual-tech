-- =====================================================================
-- Migration 20260606195452 — manual_groups_revoke_anon_direct_signin_only
-- Applied to production (anxmqiehpyznifqgskzc) 2026-06-06 via MCP (Claude-chat).
-- Backfill (outcome-faithful). The EFFECTIVE sign-in-only fix: removes the direct
-- anon EXECUTE grant on the manual_groups RPCs (authenticated retained).
-- Verified end-state: anon_exec=false, authenticated=true on all three.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.create_manual_group(text, text, text, text, text[], boolean, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_manual_group(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.leave_manual_group(uuid) FROM anon;
