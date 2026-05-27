-- =============================================================================
-- Migration 20260527250000 — Treasury pot seed: NewBEE + HoneyPOT
-- =============================================================================
-- Date:    2026-05-27
-- Author:  Code (Claude Opus 4.7) — supervised by Butch (OG HUMAN)
-- Source:  Path B cleanup dispatch + manual-spine-api-v1-amendment-1.md
--          (7-pot OPS umbrella canon).
--
-- Production state pre-migration: @combtreasury owns 5 bling_pots rows
-- (campaign, defense, operational, promotions, reserve) — all 0.000000.
-- Canon defines a 7-pot umbrella; the missing 2 (newbee, honeypot) are
-- structural placeholders seeded at 0 here. Their actual funding happens
-- at a separate pre-launch ceremony (red-zone, dedicated dispatch).
--
-- Idempotent: ON CONFLICT (bee_id, purpose) DO NOTHING means re-apply
-- against a state where the rows already exist is a no-op.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_pre_count integer;
BEGIN
    SELECT count(*) INTO v_pre_count
      FROM public.bling_pots
     WHERE bee_id = '00000000-0000-0000-0000-000000000bee'::uuid
       AND purpose IN ('newbee', 'honeypot');
    RAISE NOTICE 'Pre-flight: % of 2 target pots already exist.', v_pre_count;
END
$$;

INSERT INTO public.bling_pots (bee_id, purpose, balance)
VALUES
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'newbee',   0),
    ('00000000-0000-0000-0000-000000000bee'::uuid, 'honeypot', 0)
ON CONFLICT (bee_id, purpose) DO NOTHING;

COMMIT;
