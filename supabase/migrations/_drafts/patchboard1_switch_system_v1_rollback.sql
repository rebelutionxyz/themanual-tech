-- ============================================================================
-- PATCHBOARD1 — ROLLBACK for patchboard1_switch_system_v1  (DRAFT, propose-first)
-- ----------------------------------------------------------------------------
-- Authored FIRST, per the house migration discipline. Drops everything the
-- forward migration creates, in reverse dependency order. Idempotent: every
-- DROP uses IF EXISTS so a partial-apply can still be unwound cleanly.
--
-- This is a DRAFT under supabase/migrations/_drafts/ — it has NOT been applied.
-- The db lane owns the real apply (named dispatch, recorded pre-flight, ask-gated
-- click). See REPORT.md "PATCHBOARD1 — schema proposal for the db lane".
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.patchboard_disconnect(text);
DROP FUNCTION IF EXISTS public.patchboard_connect_begin(text);
DROP FUNCTION IF EXISTS public.patchboard_set_use(text, uuid, boolean);
DROP FUNCTION IF EXISTS public.patchboard_set_master_switch(text, boolean);
DROP FUNCTION IF EXISTS public.patchboard_set_bee_switch(text, uuid, boolean);
DROP FUNCTION IF EXISTS public.get_effective_switch_state(uuid, uuid, text);

DROP TABLE IF EXISTS public.connected_accounts;
DROP TABLE IF EXISTS public.patchboard_settings;
DROP TABLE IF EXISTS public.patchboard_providers;
DROP TABLE IF EXISTS public.patchboard_switches;

COMMIT;
