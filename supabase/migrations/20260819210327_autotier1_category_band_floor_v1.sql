-- AUTOTIER1 — the capability FLOOR per directive category, as DATA.
-- APPLIED 2026-08-19 via ask-gated apply_migration (owner-authorized in-session);
-- apply_migration stamped version 20260819210327 (this filename matches it).
-- ROLLBACK: _drafts/20260819210327_autotier1_category_band_floor_v1_rollback.sql (authored first).
--
-- WHY THIS TABLE EXISTS
-- The AUTO tier must start each directive at the band where a COMPETENT answer is
-- EXPECTED for that KIND of work, then escalate UP on a real quality check. That
-- floor is the honesty anchor of guardrail (3): start below it to shave margin and
-- the "auto" tier becomes cheapest-in-disguise. Holding the floor in a TABLE (not
-- in TypeScript) means re-tuning capability↔band is a row UPDATE, never an edge
-- deploy — the same "config, not code" posture ROUTEREPOINT1 gave the rates.
--
-- The route carries a COMPILED fallback (autotier.ts COMPILED_FLOOR_FALLBACK) that
-- MUST match the seed below. If the table read fails at runtime the route uses the
-- compiled map and never fails cheap (unknown category => 'standard', never 'free').
--
-- SECURITY: read-only lookup, no user data. RLS enabled with NO anon/authenticated
-- policy (deny by default, house rule); the route reads it as the service role,
-- which bypasses RLS. The reader function is STABLE / SECURITY INVOKER / pinned
-- search_path, mirroring h24_route_model_card.

-- Band validity is a CHECK, not an FK: this schema has no bands lookup table
-- (models.band is itself CHECK-guarded), so a CHECK keeps the same guarantee
-- without inventing a new dependency.
CREATE TABLE IF NOT EXISTS public.h24_category_band_floor (
  category    text PRIMARY KEY,
  floor_band  text NOT NULL CHECK (floor_band IN ('free', 'standard', 'frontier')),
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.h24_category_band_floor IS
  'AUTOTIER1: capability floor band per directive category for the auto tier. '
  'Row update re-tunes; must stay in sync with autotier.ts COMPILED_FLOOR_FALLBACK.';

-- Seed = autotier.ts COMPILED_FLOOR_FALLBACK verbatim. Keep the two identical.
INSERT INTO public.h24_category_band_floor (category, floor_band, note) VALUES
  ('classify',  'free',     'bounded label task; small model capable, escalation catches the hard case'),
  ('translate', 'free',     'short-form; small model capable, escalation catches the hard case'),
  ('suggest',   'standard', 'real generation; free under-matched'),
  ('estimate',  'standard', 'multi-step reasoning; free under-matched'),
  ('correlate', 'standard', 'cross-reference reasoning; free under-matched'),
  ('draft',     'standard', 'substantive generation; free under-matched'),
  ('scaffold',  'standard', 'structured generation; free under-matched'),
  ('analyze',   'standard', 'analysis; standard capable, escalates to frontier when thin/truncated'),
  ('integrate', 'frontier', 'deep reasoning over existing structure; start trustworthy'),
  ('refactor',  'frontier', 'high-stakes reasoning over existing structure; start trustworthy')
ON CONFLICT (category) DO NOTHING;

ALTER TABLE public.h24_category_band_floor ENABLE ROW LEVEL SECURITY;
-- No policy = deny by default for anon/authenticated. Service role bypasses RLS.

-- Reader: the whole map, one row per category. The route loads it once per auto
-- directive and passes it to categoryFloor(). Zero rows (e.g. table empty) => the
-- route falls back to the compiled map. Fail-safe, never fail-cheap.
CREATE OR REPLACE FUNCTION public.h24_auto_category_floors()
  RETURNS TABLE(category text, floor_band text)
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
AS $function$
  SELECT category, floor_band FROM public.h24_category_band_floor
$function$;

REVOKE ALL ON FUNCTION public.h24_auto_category_floors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.h24_auto_category_floors() TO service_role;

-- ─── AUTO ATTRIBUTION ON THE DIRECTIVE ROW ───
--
-- h24_directives.tier is CHECK-constrained to ('free','standard','frontier'), so an
-- auto directive records the SERVED band in `tier` (what actually answered — the
-- honest value) and marks its auto-ness here instead. Both columns are additive:
--   auto_routed  NOT NULL DEFAULT false  — the non-auto path writes nothing and is
--                                          unaffected; a fast default, no table rewrite.
--   auto_trail   jsonb NULL              — the per-hop legibility record (guardrail 2),
--                                          made DURABLE, not only returned in the response.
--                                          Metadata only — model/band/reason/cost/latency,
--                                          NEVER response text (content-leak posture holds).
ALTER TABLE public.h24_directives
  ADD COLUMN IF NOT EXISTS auto_routed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_trail  jsonb;

COMMENT ON COLUMN public.h24_directives.auto_routed IS
  'AUTOTIER1: true when this directive was routed by the auto tier. tier holds the SERVED band.';
COMMENT ON COLUMN public.h24_directives.auto_trail IS
  'AUTOTIER1: per-hop cascade record (model/band/reason/cost_tokens/latency/billed). Metadata only, no response text.';
