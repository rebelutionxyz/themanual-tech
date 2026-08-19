-- DB75 INTERNAL-CALLER PATH — schema half, RE-TARGETED to h24_directives.
-- ROLLBACK: _drafts/20260819130546_db75_internal_caller_columns_h24_v1_rollback.sql (authored first).
--
-- WHY THIS EXISTS (production outage remediation, found during ROUTEREPOINT1):
-- DB75's edge code was deployed ~2026-08-01 and inserts caller_kind/caller_astra
-- into the directives table and expects bee_id nullable, but DB75's schema half
-- was left in supabase/migrations/_drafts/ and NEVER applied. Worse, the draft
-- still targeted the pre-rename table name `atlasoracle_directives` (DBCODE1
-- renamed it to h24_directives). Result: EVERY directive INSERT has 500'd with
-- "Could not find the 'caller_astra' column ... in the schema cache" since the
-- DB75 code shipped — h24_directives has had zero rows since 2026-08-01. This
-- migration is the missing schema half, re-targeted to the current table name.
--
-- This is NOT a ROUTEREPOINT1 regression: the committed pre-ROUTEREPOINT1 code
-- carries the identical insert, so the outage predates ROUTEREPOINT1 and a
-- rollback would not have fixed it. Confirmed 2026-08-19.
--
-- APPLIED SCOPE (owner, 2026-08-19, Studio): the STRICTLY-ADDITIVE SUBSET only —
-- ADD COLUMN + CREATE INDEX. The DB75 draft's `bee_id DROP NOT NULL` was
-- DEFERRED: the user path always sets bee_id, so it is not needed to fix the
-- outage or run the billing proof; it belongs to the internal-caller path, a
-- separate DB75 follow-up. This file matches exactly what was applied.
--
-- WHY THIS IS SAFE, and additive:
--   * caller_kind lands with DEFAULT 'user', so every existing row reads 'user'
--     with no backfill — they ARE user directives, retroactively true.
--   * caller_astra is nullable and null on every existing row — unknown-not-zero.
--   * RLS is UNTOUCHED and stays correct: the select-own policy is
--     auth.uid() = bee_id; users only ever see their own rows.

BEGIN;

-- Who the caller is. 'user' is the retroactive truth for every existing row.
ALTER TABLE public.h24_directives
  ADD COLUMN IF NOT EXISTS caller_kind text NOT NULL DEFAULT 'user'
  CHECK (caller_kind IN ('user', 'internal'));

-- The true caller label for an internal call ('generate-questions',
-- 'trivia-host'). NULL for user directives. Metadata, not an FK.
ALTER TABLE public.h24_directives ADD COLUMN IF NOT EXISTS caller_astra text;

-- A partial index so a spend audit can pull internal traffic cheaply.
CREATE INDEX IF NOT EXISTS h24_directives_internal_idx
  ON public.h24_directives (caller_astra, created_at)
  WHERE caller_kind = 'internal';

COMMENT ON COLUMN public.h24_directives.caller_kind IS
  'user | internal. internal = an astra-to-engine call routed through the one metered door (DB75/ORACLE_MF v1.51); bee_id is NULL and no ledger debit is written.';
COMMENT ON COLUMN public.h24_directives.caller_astra IS
  'For caller_kind=internal: the true caller label (generate-questions, trivia-host). NULL for user directives. Metadata, not an FK.';

COMMIT;
