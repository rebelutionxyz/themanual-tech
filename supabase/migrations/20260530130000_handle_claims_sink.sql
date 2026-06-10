-- =============================================================================
-- Migration 20260530130000 — Premium handle claims (SINK 1)
-- =============================================================================
-- Date:    2026-05-30
-- Author:  Code (Claude Opus 4.8) — supervised by Butch (OG HUMAN)
-- Source:  SINK 1 dispatch — Premium Handle Claims.
-- Depends: 20260530120000_source_pool_infrastructure.sql (increment_source_pool).
--
-- Closed loop: a Bee GIVES BLiNG! to claim a premium (1–4 char) handle; the
-- BLiNG! is debited from the Bee and returned to The Source pool. The claim
-- is recorded as a reservation; it does NOT mutate bees.handle (no handle-
-- change flow exists yet — applying a reserved handle as the active login
-- handle is a separate, auth-touching flow, deferred).
--
-- Status:  UNAPPLIED. Butch reviews + applies. DO NOT auto-apply.
--
-- Hardening beyond the raw dispatch spec:
--   * claim_premium_handle pins SET search_path (SECURITY DEFINER).
--   * unique_violation guard on the handle PK so a concurrent double-claim
--     rolls the debit + Source-refill back atomically (returns already_claimed).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. handle_reservations — one row per claimed handle (handle is the PK).
-- ---------------------------------------------------------------------------
CREATE TABLE public.handle_reservations (
    handle           text PRIMARY KEY,
    reserved_by      uuid NOT NULL REFERENCES public.bees(id),
    reserved_at      timestamptz DEFAULT now(),
    price_paid_bling numeric(28,8) NOT NULL,
    tier             text NOT NULL,
    is_active        boolean DEFAULT true
);

-- ---------------------------------------------------------------------------
-- 2. handle_pricing_tiers — tier → base amount (BLiNG!).
-- ---------------------------------------------------------------------------
CREATE TABLE public.handle_pricing_tiers (
    tier_name        text PRIMARY KEY,
    base_price_bling numeric(28,8) NOT NULL,
    description      text
);

INSERT INTO public.handle_pricing_tiers (tier_name, base_price_bling, description) VALUES
    ('legendary', 1000000, '1-letter handles, top 100 brands'),
    ('rare',       100000, '2-letter handles, country names, short common words'),
    ('premium',     10000, '3-4 letter handles, popular first names')
ON CONFLICT (tier_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS — handles + tiers are public read (social proof, availability,
--    pricing display). Writes happen only through the SECURITY DEFINER RPC.
-- ---------------------------------------------------------------------------
ALTER TABLE public.handle_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY handle_reservations_select ON public.handle_reservations
    FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.handle_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY handle_pricing_tiers_select ON public.handle_pricing_tiers
    FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 4. classify_handle_tier() — pure tier classifier by length.
--    Returns NULL for handles that are not premium (length 5+).
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.classify_handle_tier(p_handle text)
    RETURNS text
    LANGUAGE plpgsql
    IMMUTABLE
AS $function$
BEGIN
    IF length(p_handle) = 1 THEN RETURN 'legendary'; END IF;
    IF length(p_handle) = 2 THEN RETURN 'rare'; END IF;
    IF length(p_handle) BETWEEN 3 AND 4 THEN RETURN 'premium'; END IF;
    -- Extendable later with curated lists (country names, top brands, ...).
    RETURN NULL;
END
$function$;

GRANT EXECUTE ON FUNCTION public.classify_handle_tier(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. claim_premium_handle() — the sink. Debits the caller, refills The Source,
--    records the reservation. Atomic; SECURITY DEFINER (bypasses bees RLS).
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.claim_premium_handle(p_handle text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
AS $function$
DECLARE
    v_tier    text;
    v_price   numeric(28,8);
    v_balance numeric(28,8);
    v_bee_id  uuid := auth.uid();
BEGIN
    IF v_bee_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
    END IF;

    v_tier := classify_handle_tier(p_handle);
    IF v_tier IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'handle_not_premium');
    END IF;

    SELECT base_price_bling INTO v_price
      FROM handle_pricing_tiers WHERE tier_name = v_tier;

    -- Lock the Bee row to serialize concurrent claims by the same Bee.
    SELECT bling_balance INTO v_balance
      FROM bees WHERE id = v_bee_id FOR UPDATE;

    IF v_balance < v_price THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_bling');
    END IF;

    IF EXISTS (SELECT 1 FROM handle_reservations
               WHERE handle = p_handle AND is_active = true) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
    END IF;

    -- Atomic: debit Bee, refill Source, record reservation.
    UPDATE bees SET bling_balance = bling_balance - v_price WHERE id = v_bee_id;

    PERFORM increment_source_pool(
        v_price, 'handle_claim_sink', v_bee_id,
        jsonb_build_object('handle', p_handle, 'tier', v_tier)
    );

    INSERT INTO handle_reservations (handle, reserved_by, price_paid_bling, tier)
        VALUES (p_handle, v_bee_id, v_price, v_tier);

    RETURN jsonb_build_object('ok', true, 'tier', v_tier, 'price', v_price);

EXCEPTION
    -- Lost the race on the handle PK after the EXISTS check: roll the whole
    -- function back (debit + Source refill undone) and report it cleanly.
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
END
$function$;

GRANT EXECUTE ON FUNCTION public.claim_premium_handle(text) TO authenticated;

COMMIT;

-- =============================================================================
-- SMOKE TESTS (run AFTER apply; the claim block is rolled back so it persists
-- nothing — uses a real Bee id you supply for :bee).
-- =============================================================================
-- -- 6a. classifier:
-- SELECT classify_handle_tier('x'), classify_handle_tier('ab'),
--        classify_handle_tier('abcd'), classify_handle_tier('toolong');
-- --   expect: legendary, rare, premium, NULL
--
-- -- 6b. full claim round-trip (rolled back). Run as the target Bee via the
-- --     API (auth.uid() set), OR simulate by temporarily substituting v_bee_id.
-- --     Pre-checks: ensure the Bee has >= 10000 BLiNG! for a 'premium' handle.
-- BEGIN;
--   -- (as authenticated bee) SELECT claim_premium_handle('cat');
--   --   expect {"ok":true,"tier":"premium","price":10000}
--   -- SELECT bling_balance FROM bees WHERE id = auth.uid();   -- down 10000
--   -- SELECT get_source_pool_balance();                       -- up 10000
--   -- SELECT * FROM handle_reservations WHERE handle='cat';
--   -- repeat claim -> {"ok":false,"error":"already_claimed"}
-- ROLLBACK;
-- =============================================================================
