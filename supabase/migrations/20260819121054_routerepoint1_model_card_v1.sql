-- ROUTEREPOINT1 — the dispatch+billing CARD.
-- ROLLBACK: 20260819120932_routerepoint1_model_card_v1_rollback.sql (authored first).
-- Owner rulings 2026-08-19: model-selection ships band-drives-tier (full); cache_write = option (a).
--
-- WHY THIS FUNCTION EXISTS
-- h24-route bills in h24 (Oracle) tokens; the `models` catalog stores raw
-- PROVIDER USD. The conversion is the DB79 anchor h24_tokens_per_mtok(usd, band)
-- — "1000 h24 tokens = $1; margin 3x standard / 2.5x frontier / free=0", and the
-- anchor "lives nowhere else". So the route must NOT read price_in and re-derive
-- the margin in TypeScript — that would duplicate the anchor. This function does
-- the JOIN and calls the anchor in SQL, returning one row the worker bills from
-- directly. One round-trip, anchor in one place.
--
-- THE cache_write GAP (ROUTEREPOINT1 canon a/b/c): `models` has no cache-WRITE
-- column, only price_cached (cache READ). RESOLUTION = option (a): cache_write is
-- DERIVED as h24_tokens_per_mtok(price_in * 1.25, band). This is not an invented
-- number — DB79's own header states "cache_write = 1.25x input", and the derived
-- values reproduce the live legacy h24_model_rates EXACTLY:
--   opus-5   frontier  cache_write 15625  = h24_tokens_per_mtok(5.0 * 1.25, frontier)
--   sonnet-5 standard  cache_write 11250  = h24_tokens_per_mtok(3.0 * 1.25, standard)
-- Verified for every active legacy row before this file was authored.
--
-- FAIL-CLOSED: an unknown/ inactive model, or an inactive provider, returns ZERO
-- rows. The worker treats no-row as a 503 (pricing/dispatch not configured),
-- never a guessed rate — the same posture the legacy lookup already held.
--
-- SECURITY: STABLE, SECURITY INVOKER, pinned search_path. Read-only over two
-- tables the route already reads as the service role. price_cached may be NULL
-- (Mistral has no published cache read rate); the anchor returns NULL for it and
-- the worker falls back to the full input rate inside calculateCostTokens
-- (over-charge visibly, the DB27 rule) — cache_write likewise.

BEGIN;

CREATE OR REPLACE FUNCTION public.h24_route_model_card(p_model text)
RETURNS TABLE (
  model_string     text,
  provider_name    text,
  band             text,
  dialect          text,
  base_url         text,
  auth_secret_name text,
  input_per_m      numeric,
  output_per_m     numeric,
  cacheread_per_m  numeric,
  cachewrite_per_m numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
  SELECT
    m.model_string,
    p.name,
    m.band,
    p.dialect,
    p.base_url,
    p.auth_secret_name,
    public.h24_tokens_per_mtok(m.price_in,          m.band) AS input_per_m,
    public.h24_tokens_per_mtok(m.price_out,         m.band) AS output_per_m,
    public.h24_tokens_per_mtok(m.price_cached,      m.band) AS cacheread_per_m,
    public.h24_tokens_per_mtok(m.price_in * 1.25,   m.band) AS cachewrite_per_m
  FROM public.models m
  JOIN public.providers p ON p.id = m.provider_id
  WHERE m.model_string = p_model
    AND m.active = true
    AND p.active = true
  LIMIT 1
$fn$;

COMMENT ON FUNCTION public.h24_route_model_card(text) IS
  'ROUTEREPOINT1: dispatch+billing card for one active model. Returns the provider dialect/base_url/secret_name for dispatch and the four h24-token rates DERIVED via the DB79 anchor h24_tokens_per_mtok (cache_write = 1.25x input). Zero rows = unknown/inactive model => the route fails closed (503). Read-only.';

-- The route reads this as the service role (RLS-bypassing), but grant execute to
-- authenticated too so a future in-DB caller can price without the service key.
GRANT EXECUTE ON FUNCTION public.h24_route_model_card(text) TO authenticated, service_role;

COMMIT;
