-- DB75 — THE INTERNAL-CALLER PATH (schema half). PROPOSAL — NOT APPLIED.
-- ROLLBACK: _drafts/db75_internal_caller_path_v1_rollback.sql
--
-- ORACLE_MF v1.51 RULED DB75-Q: there is ONE metered door — atlasoracle-route —
-- and internal astra-to-engine calls (generate-questions building the question
-- bank, trivia-host during a B Battles night) traverse it exactly as a user
-- directive does. Today they bypass it: each holds its own ANTHROPIC_API_KEY and
-- calls the provider directly, unmetered by oracle_token_ledger and invisible to
-- atlasoracle_directives (DOCS31 F1 / item 95).
--
-- The route cannot record an internal call today because atlasoracle_directives
-- demands a Bee: `bee_id NOT NULL`, and the only system Bees are economy
-- accounts. This migration makes an internal directive expressible — no Bee, a
-- caller label instead — which is the schema half of the reroute. The route
-- changes and the two function reroutes are the code half (same pass, supabase/).
--
-- WHY THIS IS SAFE, and additive:
--   * bee_id DROP NOT NULL only LOOSENS the column. Every existing row keeps its
--     Bee; nothing is rewritten.
--   * caller_kind lands with DEFAULT 'user', so every existing row reads 'user'
--     with no backfill — they ARE user directives, retroactively true.
--   * caller_astra is nullable and null on every existing row — unknown-not-zero,
--     the same discipline the rest of this table follows.
--   * RLS is UNTOUCHED and stays correct by construction: the select-own policy
--     is `auth.uid() = bee_id`. An internal row has bee_id IS NULL, which never
--     equals any auth.uid(), so users never see internal rows — exactly right,
--     they are platform rows. Service-role / admin readers see them as before.
--
-- METERED, NOT BILLED: the route records an internal directive's token counts and
-- provider (visibility — "the platform sees every token", v1.51) and writes NO
-- oracle_token_ledger debit (an internal caller is not billed a user's way). No
-- ledger change is needed here; the debit skip lives in the route.

-- 1. An internal directive has no Bee.
ALTER TABLE public.atlasoracle_directives ALTER COLUMN bee_id DROP NOT NULL;

-- 2. Who the caller is. 'user' is the retroactive truth for every existing row.
ALTER TABLE public.atlasoracle_directives
  ADD COLUMN caller_kind text NOT NULL DEFAULT 'user'
  CHECK (caller_kind IN ('user', 'internal'));

-- 3. The true caller label for an internal call ('generate-questions',
--    'trivia-host'). NULL for user directives. This is metadata, not an FK — the
--    row's astra_id still points at a real astra_registry row (themanual, the
--    platform), because there is no 'trivia'/'games' registry slug and minting
--    one is DB73's job, not this pass's. The caller_astra text is where the
--    honest attribution lives until (if ever) a registry row exists.
ALTER TABLE public.atlasoracle_directives ADD COLUMN caller_astra text;

-- A partial index so a spend audit can pull internal traffic without scanning
-- the whole table. Internal rows are the minority; the WHERE keeps the index tiny.
CREATE INDEX IF NOT EXISTS atlasoracle_directives_internal_idx
  ON public.atlasoracle_directives (caller_astra, created_at)
  WHERE caller_kind = 'internal';

COMMENT ON COLUMN public.atlasoracle_directives.caller_kind IS
  'user | internal. internal = an astra-to-engine call routed through the one metered door (DB75/ORACLE_MF v1.51); bee_id is NULL and no ledger debit is written.';
COMMENT ON COLUMN public.atlasoracle_directives.caller_astra IS
  'For caller_kind=internal: the true caller label (generate-questions, trivia-host). NULL for user directives. Metadata, not an FK.';
