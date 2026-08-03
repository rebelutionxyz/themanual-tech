-- =============================================================================
-- Migration 20260527190000 — atlasoracle_check_rate_caps RPC
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch
-- Source:  rate-cap-pricing.md §5.1 (per-Bee caps)
--          atlasoracle-route v1 completion dispatch, 2026-05-27
--
-- Purpose:
--   Server-side rate-cap check for atlasoracle-route. Returns whether a
--   Bee is currently allowed to fire a directive at the requested tier,
--   given per-minute / per-hour / per-day caps for that tier AND combined
--   caps across all tiers. Hardcoded thresholds per rate-cap-pricing.md
--   §5.1 (Patchboard runtime tuning deferred post-Swarm per
--   atlasoracle-v1-final-scope.md §2.8).
--
-- Caps (hardcoded):
--   free      per_min  2  per_hour 10  per_day 50
--   standard  per_min  3  per_hour 30  per_day 200
--   frontier  per_min  1  per_hour  5  per_day 20
--   combined  per_min  5  per_hour 40  per_day 250
--
-- Counted rows: ALL atlasoracle_directives rows for the Bee in each window
-- (pending + success + failed). Failed directives represent attempt
-- activity and count toward abuse-prevention budgets. Rate-capped
-- *denials* never produce a row (the route function returns 429 without
-- inserting), so cap counts can't snowball from prior cap hits.
--
-- retry_after_seconds: coarse upper bound — 60 for minute cap, 3600 for
-- hour cap, 86400 for day cap. A precise computation (time-until-oldest-
-- counted-directive-ages-out) is a v1.1 refinement.
--
-- caps_hit: array of strings naming each cap that was violated. The route
-- function passes this through verbatim in the 429 response body so the
-- wallet badge UI can render a specific message.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.atlasoracle_check_rate_caps(
    p_bee_id uuid,
    p_tier   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_now timestamptz := now();

    -- Tier-specific window counts.
    v_t_min  integer;
    v_t_hour integer;
    v_t_day  integer;

    -- Combined (all-tier) window counts.
    v_c_min  integer;
    v_c_hour integer;
    v_c_day  integer;

    -- Tier-specific thresholds.
    v_tier_per_min  integer;
    v_tier_per_hour integer;
    v_tier_per_day  integer;

    -- Combined thresholds (same for all tier inputs).
    v_combined_per_min  constant integer := 5;
    v_combined_per_hour constant integer := 40;
    v_combined_per_day  constant integer := 250;

    v_caps_hit       text[] := ARRAY[]::text[];
    v_retry_seconds  integer := 0;
BEGIN
    IF p_tier NOT IN ('free', 'standard', 'frontier') THEN
        RAISE EXCEPTION 'invalid tier: %', p_tier;
    END IF;

    IF p_tier = 'free' THEN
        v_tier_per_min := 2; v_tier_per_hour := 10; v_tier_per_day := 50;
    ELSIF p_tier = 'standard' THEN
        v_tier_per_min := 3; v_tier_per_hour := 30; v_tier_per_day := 200;
    ELSE  -- frontier
        v_tier_per_min := 1; v_tier_per_hour := 5;  v_tier_per_day := 20;
    END IF;

    -- Tier-specific counts.
    SELECT
        count(*) FILTER (WHERE created_at >= v_now - interval '1 minute'),
        count(*) FILTER (WHERE created_at >= v_now - interval '1 hour'),
        count(*) FILTER (WHERE created_at >= v_now - interval '1 day')
      INTO v_t_min, v_t_hour, v_t_day
      FROM public.atlasoracle_directives
     WHERE bee_id = p_bee_id
       AND tier   = p_tier;

    -- Combined counts.
    SELECT
        count(*) FILTER (WHERE created_at >= v_now - interval '1 minute'),
        count(*) FILTER (WHERE created_at >= v_now - interval '1 hour'),
        count(*) FILTER (WHERE created_at >= v_now - interval '1 day')
      INTO v_c_min, v_c_hour, v_c_day
      FROM public.atlasoracle_directives
     WHERE bee_id = p_bee_id;

    IF v_t_min >= v_tier_per_min THEN
        v_caps_hit := array_append(v_caps_hit, 'tier_per_minute');
        v_retry_seconds := greatest(v_retry_seconds, 60);
    END IF;
    IF v_t_hour >= v_tier_per_hour THEN
        v_caps_hit := array_append(v_caps_hit, 'tier_per_hour');
        v_retry_seconds := greatest(v_retry_seconds, 3600);
    END IF;
    IF v_t_day >= v_tier_per_day THEN
        v_caps_hit := array_append(v_caps_hit, 'tier_per_day');
        v_retry_seconds := greatest(v_retry_seconds, 86400);
    END IF;
    IF v_c_min >= v_combined_per_min THEN
        v_caps_hit := array_append(v_caps_hit, 'combined_per_minute');
        v_retry_seconds := greatest(v_retry_seconds, 60);
    END IF;
    IF v_c_hour >= v_combined_per_hour THEN
        v_caps_hit := array_append(v_caps_hit, 'combined_per_hour');
        v_retry_seconds := greatest(v_retry_seconds, 3600);
    END IF;
    IF v_c_day >= v_combined_per_day THEN
        v_caps_hit := array_append(v_caps_hit, 'combined_per_day');
        v_retry_seconds := greatest(v_retry_seconds, 86400);
    END IF;

    RETURN jsonb_build_object(
        'allowed',              array_length(v_caps_hit, 1) IS NULL,
        'retry_after_seconds',  v_retry_seconds,
        'caps_hit',             to_jsonb(v_caps_hit),
        'counts', jsonb_build_object(
            'tier_per_minute',     v_t_min,
            'tier_per_hour',       v_t_hour,
            'tier_per_day',        v_t_day,
            'combined_per_minute', v_c_min,
            'combined_per_hour',   v_c_hour,
            'combined_per_day',    v_c_day
        ),
        'thresholds', jsonb_build_object(
            'tier_per_minute',     v_tier_per_min,
            'tier_per_hour',       v_tier_per_hour,
            'tier_per_day',        v_tier_per_day,
            'combined_per_minute', v_combined_per_min,
            'combined_per_hour',   v_combined_per_hour,
            'combined_per_day',    v_combined_per_day
        )
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.atlasoracle_check_rate_caps(uuid, text)
    TO authenticated, service_role;

COMMIT;
