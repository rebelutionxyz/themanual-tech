-- =============================================================================
-- Migration 20260602182958 — competition_engine_v1_fix_join_code
-- =============================================================================
-- APPLIED to production (anxmqiehpyznifqgskzc) 2026-06-02 as version 20260602182958.
-- Backfill (outcome-faithful): companion fix to 20260602182706_competition_engine_v1.
-- The first applied comp_create_room (at 182706) omitted join_code from its INSERT,
-- which violates the competitions.join_code NOT NULL constraint at call time. This
-- migration replaced the function body to generate a unique join_code and include it
-- in the INSERT. Body below is the verbatim live production definition
-- (pg_get_functiondef, 2026-06-06) — authoritative reconstruction of the prod fix DDL.
-- Idempotent (CREATE OR REPLACE).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.comp_create_room(p_game text DEFAULT 'brains'::text, p_mode text DEFAULT 'casual'::text, p_realm text DEFAULT NULL::text, p_stake numeric DEFAULT 0, p_settings jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_caller   uuid := auth.uid();
    v_code     text;
    v_id       uuid;
    v_attempts int := 0;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF p_mode NOT IN ('practice','casual','stake','tournament') THEN
        RAISE EXCEPTION 'invalid mode %', p_mode;
    END IF;
    IF p_mode IN ('stake','tournament') AND (p_stake IS NULL OR p_stake <= 0) THEN
        RAISE EXCEPTION 'stake modes require a positive stake_amount';
    END IF;

    LOOP
        v_attempts := v_attempts + 1;
        v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.competitions WHERE join_code = v_code);
        IF v_attempts > 25 THEN RAISE EXCEPTION 'could not generate a unique join code'; END IF;
    END LOOP;

    INSERT INTO public.competitions (kind, game, host_bee_id, mode, status, realm, stake_amount, join_code, settings)
    VALUES ('live_room', COALESCE(p_game,'brains'), v_caller, p_mode, 'lobby',
            p_realm, COALESCE(p_stake,0), v_code, COALESCE(p_settings,'{}'::jsonb))
    RETURNING id INTO v_id;

    IF p_mode IN ('practice','casual') THEN
        INSERT INTO public.competition_participants (competition_id, bee_id)
        VALUES (v_id, v_caller);
    END IF;

    RETURN jsonb_build_object('ok', true, 'competition_id', v_id,
                              'join_code', v_code, 'mode', p_mode, 'status', 'lobby');
END;
$function$;
