-- =============================================================================
-- Migration 20260508120100 — Phase C B-4: bling_mint -> bling_free rename
-- =============================================================================
-- Date:        2026-05-08
-- Author:      schema-architect (Claude) — supervised by Butch
-- Status:      UNAPPLIED at file write; applied via Supabase MCP same session.
-- Source:      MMF §19.7 (Phase C) — language firewall hygiene
--              shared/notes/audits/code-21-schema-drift-audit-2026-05-08.md
--
-- Purpose:
--   Renames public.bling_mint(uuid, numeric) -> public.bling_free(uuid, numeric)
--   per the project language firewall (never use the M-word in user-facing
--   surfaces). Originally bundled into 20260508120000_phase_c_schema_foundations
--   as block B-4, then stripped under the (incorrect) assumption that the
--   rename had already been applied in a prior session. Post-apply verification
--   on 2026-05-08 found bling_mint still in place and bling_free absent —
--   this micro-migration closes that gap.
--
-- Approach:
--   ALTER FUNCTION ... RENAME TO ... — atomic, preserves the body, preserves
--   grants/revokes (PUBLIC + anon + authenticated revoked per migration 23 C.8
--   / migration 24 Block 1), preserves SECURITY DEFINER, preserves search_path.
--   Service-role retains implicit access — Stripe webhook path keeps working.
--
-- Idempotency:
--   pg_proc lookup with four explicit branches (rename / no-op / refuse-both /
--   refuse-neither). A second run after a successful first apply finds
--   bling_free in place and bling_mint gone, and no-ops with a NOTICE.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_mint_oid oid;
    v_free_oid oid;
BEGIN
    SELECT p.oid INTO v_mint_oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_mint'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric';

    SELECT p.oid INTO v_free_oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_free'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric';

    IF v_mint_oid IS NOT NULL AND v_free_oid IS NULL THEN
        ALTER FUNCTION public.bling_mint(uuid, numeric) RENAME TO bling_free;
        RAISE NOTICE 'Renamed public.bling_mint(uuid, numeric) -> public.bling_free(uuid, numeric)';
    ELSIF v_mint_oid IS NULL AND v_free_oid IS NOT NULL THEN
        RAISE NOTICE 'public.bling_free already exists and bling_mint is gone — no-op';
    ELSIF v_mint_oid IS NOT NULL AND v_free_oid IS NOT NULL THEN
        RAISE EXCEPTION 'Both bling_mint and bling_free exist — refusing to rename. Resolve manually.';
    ELSE
        RAISE EXCEPTION 'Neither bling_mint nor bling_free found — DB is missing the BLiNG! v8 RPC. Apply schema-v8-bling.sql first.';
    END IF;
END
$$;

-- Update function comment to language-firewall-safe vocabulary.
-- Guarded so it only runs if bling_free exists (it should after the rename).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'bling_free'
          AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric'
    ) THEN
        EXECUTE $cmt$
            COMMENT ON FUNCTION public.bling_free(uuid, numeric) IS
            'FREE BLiNGs from the 10T reserve via the bonding curve. Atomic supply++, balance++, system_state update. Service-role only (Stripe webhook path). Renamed from bling_mint on 2026-05-08 to honor the language firewall — never use the M-word in user-facing surfaces.'
        $cmt$;
    END IF;
END
$$;

COMMIT;


-- =============================================================================
-- VERIFICATION (post-COMMIT)
-- =============================================================================
-- SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname IN ('bling_mint','bling_free')
-- ORDER BY proname;
-- -- Expected: bling_free only.
--
-- SELECT obj_description(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname='bling_free';
-- -- Expected: comment string with FREE / 10T reserve / bonding curve.


-- =============================================================================
-- ROLLBACK (commented out — rename back to bling_mint)
-- =============================================================================
-- BEGIN;
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--                WHERE n.nspname='public' AND p.proname='bling_free'
--                  AND pg_get_function_identity_arguments(p.oid) = 'p_bee_id uuid, p_amount numeric')
--     THEN
--         ALTER FUNCTION public.bling_free(uuid, numeric) RENAME TO bling_mint;
--     END IF;
-- END $$;
-- COMMIT;
