-- DB79 — THE PROVIDER CATALOG. PROPOSAL — NOT APPLIED.
-- ROLLBACK: _drafts/20260818215307_db79_provider_catalog_v1_rollback.sql (authored first).
-- (Filename stamped 20260818215307 by apply_migration; drafted unversioned as db79_provider_catalog_v1.)
--
-- ORACLE_MF v1.47: pricing lives in a CATALOG, never in code — a price change
-- must be a row update with a date, not a deploy. This migration is the catalog:
-- providers, models, the margin function, RLS, and a seed band-map PROPOSAL.
--
-- APPLY NOTHING is the pass's rule. This file is presented for the owner's one
-- ask; the bands and the non-Anthropic prices are proposals for single-word
-- rulings, not decisions this pass may make.
--
-- ── THE ANCHOR, IN EXACTLY ONE PLACE ────────────────────────────────────────
-- 1,000 h24 tokens = $1. Margin: 3x standard, 2.5x frontier, free routes free.
-- `h24_tokens_per_mtok(usd, band)` is the ONLY place that number lives; the
-- ledger and the composer's model picker both read THIS function, so a margin
-- or anchor change is a one-line edit here, never a hunt through code.
--
-- VERIFIED against the live oracle_model_rates it must reproduce:
--   sonnet-5 standard  $3 in  → 3 * 3   * 1000 = 9000   (matches input_tokens_per_m 9000)
--   opus-5   frontier  $5 in  → 5 * 2.5 * 1000 = 12500  (matches 12500)
--   cached read = 0.1x input, cache_write = 1.25x input, both fall out of the
--   same multiply — so this function is the existing rate card, re-derived from
--   its source numbers rather than copied.

BEGIN;

-- ── providers ───────────────────────────────────────────────────────────────
CREATE TABLE public.providers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL UNIQUE,
  base_url         text        NOT NULL,
  -- The NAME of the secret that holds the key, never the key. The route reads
  -- Deno.env.get(auth_secret_name) at call time (DB77/DB78).
  auth_secret_name text        NOT NULL,
  dialect          text        NOT NULL CHECK (dialect IN ('openai_compat','anthropic','gemini','groq_compat')),
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── models ───────────────────────────────────────────────────────────────────
CREATE TABLE public.models (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  model_string text        NOT NULL,
  -- NULLABLE until the owner rules the band. Bands are the owner's taste.
  band         text        CHECK (band IN ('free','standard','frontier')),
  -- The PROVIDER's USD price per 1,000,000 tokens. NULL = not yet verified.
  -- Billing in h24 tokens is DERIVED via h24_tokens_per_mtok(price, band); these
  -- columns are the source-of-truth USD, converted at read time so the anchor
  -- stays in one place.
  price_in     numeric,
  price_out    numeric,
  price_cached numeric,   -- USD per MTok for a CACHE READ (the discounted input)
  -- The drift-honesty column: the date this price was last verified against the
  -- provider. NULL = never verified. A price with a stale checked_at is a flag,
  -- not a silent lie.
  checked_at   timestamptz,
  active       boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, model_string)
);

-- ── the margin function — the ONE anchor ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.h24_tokens_per_mtok(p_usd_per_mtok numeric, p_band text)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT CASE p_band
    WHEN 'free'     THEN 0::numeric
    WHEN 'standard' THEN round(p_usd_per_mtok * 3     * 1000, 6)
    WHEN 'frontier' THEN round(p_usd_per_mtok * 2.5   * 1000, 6)
    ELSE NULL   -- an unbanded model is unpriced until the owner rules it
  END
$fn$;
COMMENT ON FUNCTION public.h24_tokens_per_mtok(numeric, text) IS
  'The pricing anchor, DB79. 1000 h24 tokens = $1; margin 3x standard / 2.5x frontier / free=0. Converts a provider USD-per-MTok price to h24 tokens per MTok. The ledger and the composer picker both read THIS — the anchor lives nowhere else.';

-- ── RLS from birth ───────────────────────────────────────────────────────────
-- Active rows are PUBLIC product surface (the model picker). Writes are
-- service-role only: no INSERT/UPDATE/DELETE policy exists, so anon and
-- authenticated are denied by default; the service role bypasses RLS.
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models    ENABLE ROW LEVEL SECURITY;
CREATE POLICY providers_public_read ON public.providers FOR SELECT USING (active = true);
CREATE POLICY models_public_read    ON public.models    FOR SELECT USING (active = true);

-- ── seed: providers (all seven wired dialects) ───────────────────────────────
INSERT INTO public.providers (name, base_url, auth_secret_name, dialect) VALUES
  ('anthropic', 'https://api.anthropic.com/v1/messages',                    'ANTHROPIC_API_KEY', 'anthropic'),
  ('groq',      'https://api.groq.com/openai/v1/chat/completions',          'GROQ_API_KEY',      'groq_compat'),
  ('openai',    'https://api.openai.com/v1/chat/completions',               'OPENAI_API_KEY',    'openai_compat'),
  ('deepseek',  'https://api.deepseek.com/v1/chat/completions',             'DEEPSEEK_API_KEY',  'openai_compat'),
  ('mistral',   'https://api.mistral.ai/v1/chat/completions',               'MISTRAL_API_KEY',   'openai_compat'),
  ('xai',       'https://api.x.ai/v1/chat/completions',                     'XAI_API_KEY',       'openai_compat'),
  ('gemini',    'https://generativelanguage.googleapis.com/v1beta/models',  'GEMINI_API_KEY',    'gemini');

-- ── seed: VERIFIED models (anthropic + groq), ACTIVE ─────────────────────────
-- USD prices re-verified 2026-07-27 (Anthropic) / 2026-07-28 (Groq); they
-- reproduce the live oracle_model_rates exactly through h24_tokens_per_mtok.
INSERT INTO public.models (provider_id, model_string, band, price_in, price_out, price_cached, checked_at, active)
SELECT p.id, m.model_string, m.band, m.price_in, m.price_out, m.price_cached, m.checked_at, m.active
FROM (VALUES
  ('anthropic', 'claude-opus-5',        'frontier', 5.0,  25.0, 0.50, TIMESTAMPTZ '2026-07-27', true),
  ('anthropic', 'claude-sonnet-5',      'standard', 3.0,  15.0, 0.30, TIMESTAMPTZ '2026-07-27', true),
  ('anthropic', 'claude-haiku-4-5',     'free',     1.0,  5.0,  0.10, TIMESTAMPTZ '2026-07-27', true),
  ('groq',      'llama-3.1-8b-instant', 'free',     0.05, 0.08, NULL, TIMESTAMPTZ '2026-07-28', true)
) AS m(provider_name, model_string, band, price_in, price_out, price_cached, checked_at, active)
JOIN public.providers p ON p.name = m.provider_name;

-- ── seed: the DEFAULT BAND MAP proposal (openai / deepseek / mistral / xai /
--    gemini). PROPOSALS ONLY: prices NULL (UNVERIFIED), checked_at NULL, and
--    active = FALSE so the public picker never shows an unpriced model. The
--    model ids and the band placements are PROPOSED — the DB79 report carries
--    the one-line reasoning for each. The owner rules the bands (single words)
--    and supplies verified prices; a follow-up flips these active. ──────────────
INSERT INTO public.models (provider_id, model_string, band, price_in, price_out, price_cached, checked_at, active)
SELECT p.id, m.model_string, m.band, NULL, NULL, NULL, NULL, false
FROM (VALUES
  ('openai',   'gpt-5',                'frontier'),  -- flagship
  ('openai',   'gpt-5-mini',           'standard'),  -- value
  ('deepseek', 'deepseek-reasoner',    'frontier'),  -- flagship reasoning
  ('deepseek', 'deepseek-chat',        'standard'),  -- value workhorse
  ('mistral',  'mistral-large-latest', 'frontier'),  -- flagship
  ('mistral',  'mistral-small-latest', 'standard'),  -- value
  ('xai',      'grok-4',               'frontier'),  -- flagship
  ('gemini',   'gemini-2.5-pro',       'frontier'),  -- flagship
  ('gemini',   'gemini-2.5-flash',     'standard')   -- value
) AS m(provider_name, model_string, band)
JOIN public.providers p ON p.name = m.provider_name;

COMMIT;
