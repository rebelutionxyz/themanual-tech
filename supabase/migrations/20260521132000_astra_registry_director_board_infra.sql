-- =============================================================================
-- Migration 20260521132000 — astra_registry director/board + history (Wave 2, step 4.5)
-- =============================================================================
-- Date:        2026-05-21
-- Author:      Code 2 (Claude Opus 4.7) — supervised by Butch
-- Branch:      feat/bling-v9-ledger
-- Wave:        2. Depends on step 3 (bling_pots — not strictly required here,
--              but ordering preserved for Wave-2 sequencing).
-- Source:      shared/canon/system-funds-targets-resolution.md v0.2
--                ("5: Astra Board fund → @<astra_handle>_board Bee via
--                  astra_registry.board_bee_id"; "1: Astra Director →
--                  astra_registry.director_bee_id (NULL → Reserve)")
--              shared/canon/bee-role-hierarchy.md §rank_history (append-only pattern)
--
-- Purpose:
--   Three concrete pieces of infrastructure that the affiliate distribution
--   engine (Wave 3 G5) will read:
--
--   (1) astra_registry.director_bee_id UUID — points to the current Director
--       Bee for each Astra. NULL semantics: per system-funds-targets v0.2,
--       NULL means the 1-weight Astra Director slot routes to @combtreasury
--       reserve sub-bucket instead.
--
--   (2) astra_registry.board_bee_id UUID — points to the per-Astra Board
--       system Bee. For themanual at v1: @themanual_board, seeded here.
--       Future Astras get their own board Bee at Astra-registration time.
--
--   (3) astra_director_history table — append-only audit log of Director
--       transitions. Mirrors rank_history pattern: no UPDATE, no DELETE.
--       Tracks who set/changed/cleared the Director, when, and why.
--
-- TRIGGER-AWARE BEE INSERT (lessons from step 4):
--   The handle_new_bee() trigger on auth.users requires raw_user_meta_data
--   to contain "handle" (otherwise it derives 'bee_' + UUID-prefix, which
--   collides for system Bees starting with all zeros). This migration sets
--   "handle": "themanual_board" in raw_user_meta_data so the trigger creates
--   the bees row with the right handle automatically. Then UPDATE adds
--   name + bio.
--
-- UUID for @themanual_board:
--   00000000-0000-0000-0000-000000b0a8d1  (hex "boa8d1" → mnemonic "board1")
--
-- Idempotency:
--   - ADD COLUMN IF NOT EXISTS for both new astra_registry columns.
--   - CREATE INDEX IF NOT EXISTS for both partial indexes.
--   - INSERT auth.users + bees use ON CONFLICT DO NOTHING.
--   - Backfill UPDATE uses WHERE board_bee_id IS NULL to be safe on re-apply.
--   - CREATE TABLE IF NOT EXISTS, CREATE TRIGGER preceded by DROP IF EXISTS.
--
-- Blast radius:
--   - astra_registry: 2 nullable columns added (no existing-data disturbance).
--   - 1 new system Bee (@themanual_board) — auth.users + bees + bee_profiles rows.
--   - 1 astra_registry row UPDATE (board_bee_id backfill for themanual).
--   - 1 new table (astra_director_history), empty.
--   - 1 new function (astra_director_history_block_mutation).
--   - 2 new triggers (no-UPDATE, no-DELETE).
--   No DROPs of existing tables/functions/triggers.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm astra_registry exists + themanual seed row exists +
-- handle_new_bee trigger function present.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_astra_registry_exists boolean;
    v_themanual_row_exists  boolean;
    v_handle_trigger_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='astra_registry'
    ) INTO v_astra_registry_exists;
    IF NOT v_astra_registry_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: astra_registry table missing.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.astra_registry
         WHERE id = '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid
           AND slug = 'themanual'
    ) INTO v_themanual_row_exists;
    IF NOT v_themanual_row_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: themanual seed row missing from astra_registry.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='handle_new_bee'
    ) INTO v_handle_trigger_exists;
    IF NOT v_handle_trigger_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: handle_new_bee() function missing.';
    END IF;

    RAISE NOTICE 'Pre-flight OK.';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Block A · astra_registry columns + partial indexes
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.astra_registry
    ADD COLUMN IF NOT EXISTS director_bee_id UUID REFERENCES public.bees(id),
    ADD COLUMN IF NOT EXISTS board_bee_id    UUID REFERENCES public.bees(id);

CREATE INDEX IF NOT EXISTS astra_registry_director_bee_idx
    ON public.astra_registry(director_bee_id)
    WHERE director_bee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS astra_registry_board_bee_idx
    ON public.astra_registry(board_bee_id)
    WHERE board_bee_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Block B · @themanual_board system Bee.
-- INSERT auth.users with raw_user_meta_data.handle so trigger picks it.
-- Then UPDATE bees row to enrich with name + bio.
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000b0a8d1'::uuid,
    'authenticated', 'authenticated',
    'themanual_board@themanual.tech',
    NULL, now(),
    '{"provider": "system"}'::jsonb,
    '{"name": "TheMANUAL Board", "system": true, "handle": "themanual_board", "astra_slug": "themanual"}'::jsonb,
    now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.bees
   SET name = 'TheMANUAL Board',
       bio  = 'Astra Board fund for TheMANUAL.tech. Receives the 5-weight Astra Board slot of the 89-weight schema on revenue events tagged to this Astra.'
 WHERE id = '00000000-0000-0000-0000-000000b0a8d1'::uuid
   AND handle = 'themanual_board'
   AND (name IS NULL OR bio IS NULL);

-- ───────────────────────────────────────────────────────────────────────
-- Block C · Backfill astra_registry.board_bee_id for the themanual row.
-- ───────────────────────────────────────────────────────────────────────
UPDATE public.astra_registry
   SET board_bee_id = '00000000-0000-0000-0000-000000b0a8d1'::uuid
 WHERE id = '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid
   AND board_bee_id IS NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Block D · astra_director_history table
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.astra_director_history (
    id              BIGSERIAL PRIMARY KEY,
    astra_id        UUID NOT NULL REFERENCES public.astra_registry(id),
    director_bee_id UUID REFERENCES public.bees(id),   -- nullable: NULL = Director slot cleared
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by      UUID REFERENCES public.bees(id),   -- who made the change (may be system)
    reason          TEXT
);

CREATE INDEX IF NOT EXISTS astra_director_history_astra_id_idx
    ON public.astra_director_history(astra_id);
CREATE INDEX IF NOT EXISTS astra_director_history_changed_at_idx
    ON public.astra_director_history(changed_at DESC);

-- ───────────────────────────────────────────────────────────────────────
-- Block E · Append-only triggers (mirror rank_history pattern)
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.astra_director_history_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    RAISE EXCEPTION
        'astra_director_history is append-only — % rejected. '
        'Insert a new row to record a Director change.',
        TG_OP;
END;
$function$;

DROP TRIGGER IF EXISTS astra_director_history_no_update ON public.astra_director_history;
DROP TRIGGER IF EXISTS astra_director_history_no_delete ON public.astra_director_history;

CREATE TRIGGER astra_director_history_no_update
    BEFORE UPDATE ON public.astra_director_history
    FOR EACH ROW EXECUTE FUNCTION public.astra_director_history_block_mutation();

CREATE TRIGGER astra_director_history_no_delete
    BEFORE DELETE ON public.astra_director_history
    FOR EACH ROW EXECUTE FUNCTION public.astra_director_history_block_mutation();

-- ───────────────────────────────────────────────────────────────────────
-- Block F · RLS on astra_director_history (public read for transparency,
-- service-role write only)
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.astra_director_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS astra_director_history_public_read   ON public.astra_director_history;
DROP POLICY IF EXISTS astra_director_history_service_write ON public.astra_director_history;

CREATE POLICY astra_director_history_public_read ON public.astra_director_history
    FOR SELECT
    USING (true);

CREATE POLICY astra_director_history_service_write ON public.astra_director_history
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
-- UPDATE / DELETE blocked by the append-only triggers regardless of policy.

COMMIT;

-- =============================================================================
-- VERIFICATION (post-COMMIT — run separately, NOT inside the transaction)
-- =============================================================================
--
-- (1) astra_registry has both new columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='astra_registry'
--    AND column_name IN ('director_bee_id','board_bee_id')
--  ORDER BY column_name;
-- → 2 rows, both uuid, both YES (nullable).
--
-- (2) Partial indexes exist on both new columns:
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND tablename='astra_registry'
--    AND indexname IN ('astra_registry_director_bee_idx','astra_registry_board_bee_idx')
--  ORDER BY indexname;
-- → 2 rows, both with WHERE clauses on IS NOT NULL.
--
-- (3) @themanual_board Bee present:
-- SELECT handle, email, name FROM public.bees WHERE handle='themanual_board';
-- → 1 row, name='TheMANUAL Board'.
--
-- (4) themanual seed row has board_bee_id backfilled, director_bee_id NULL:
-- SELECT slug, director_bee_id, board_bee_id FROM public.astra_registry
--  WHERE id='16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid;
-- → director_bee_id=NULL, board_bee_id=00000000-0000-0000-0000-000000b0a8d1.
--
-- (5) astra_director_history table + triggers + RLS present:
-- SELECT relname, relrowsecurity FROM pg_class
--  WHERE relname='astra_director_history' AND relnamespace='public'::regnamespace;
-- → relrowsecurity=t.
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid='public.astra_director_history'::regclass AND NOT tgisinternal
--  ORDER BY tgname;
-- → 2 rows: astra_director_history_no_delete, astra_director_history_no_update.
--
-- (6) Append-only behavior smoke (skip in prod; this would actually RAISE):
-- -- INSERT a test row, then try to UPDATE / DELETE — both should raise.
-- -- Skipped in verification because it leaves state to clean up.

-- =============================================================================
-- ROLLBACK (commented — only if reverting intentionally)
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.astra_director_history CASCADE;
-- DROP FUNCTION IF EXISTS public.astra_director_history_block_mutation();
-- UPDATE public.astra_registry
--    SET board_bee_id = NULL
--  WHERE id = '16c5f71e-8a5d-49e7-86c7-4ff64c4590ac'::uuid;
-- DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000b0a8d1'::uuid;
-- ALTER TABLE public.astra_registry
--     DROP COLUMN IF EXISTS director_bee_id,
--     DROP COLUMN IF EXISTS board_bee_id;
-- COMMIT;
