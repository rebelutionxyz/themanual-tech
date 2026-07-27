-- =============================================================================
-- DB8 — Oracle Token ledger v1
-- =============================================================================
-- Date:    2026-07-27
-- Author:  Code (Claude Opus 5) — pass DB8, lane db, scope oracle
--
-- =============================================================================
-- STATUS: **APPLIED to production 2026-07-27** — pass DB8, under the MIGRATION
--         AMENDMENT (Butch, 2026-07-27) written into CLAUDE.md R7 that day.
--         Rollback approved in-session by Butch before the apply ran, as the
--         amendment requires; it is restated below and was not needed.
-- =============================================================================
--
-- Applied via the pgpass psql path. Result: BEGIN / … / COMMIT, exit 0.
-- Post-apply battery (see REPORT.md, pass DB8 §4): 4 seed rows accepted;
-- balance view returned 122.000000 against a hand-sum of 122.000000; 9 negative
-- tests all denied as expected, including service_role UPDATE and DELETE;
-- resulting grants are authenticated=SELECT, service_role=INSERT,SELECT, anon
-- nothing. Schema fingerprint over every bling_* / atlasoracle_* relation,
-- column, type and routine definition was IDENTICAL before and after
-- (b15717428b25c687ae94ee07bfc7940b, 182 objects) — zero escrow drift.
-- Test rows were zeroed with a reversing adjustment entry, never deleted.
--
-- NOT registered in supabase_migrations.schema_migrations — this repo has no
-- config.toml and migrations here are applied by psql. Known drift, flagged in
-- REPORT.md pass DB8 §9.
--
-- Per Butch ruling 2026-07-27: AtlasORACLE runs on ORACLE TOKENS, not BLiNG! /
-- escrow. This migration creates the token ledger, its balance view, and a
-- rates-as-data table. It is PURELY ADDITIVE.
--
-- EXPLICITLY NOT TOUCHED (dispatch DB8, hard requirement):
--   bling_pots, bling_transactions, any other bling_* object,
--   atlasoracle_deposit_to_escrow / _withdraw_from_escrow / _get_escrow_balance
--   / _debit / _credit / _check_rate_caps.
-- Legacy escrow stays dormant and untouched pending Butch's disposition ruling.
-- There is not one ALTER, DROP, GRANT or REVOKE against any of them below.
--
-- APPEND-ONLY is enforced two independent ways, because RLS alone is not enough:
--   1. GRANTs — UPDATE / DELETE / TRUNCATE revoked from anon, authenticated and
--      service_role. Note service_role BYPASSES RLS but does NOT bypass grants,
--      so this is the control that actually binds the Edge Functions.
--   2. RLS — no UPDATE or DELETE policy exists, and RLS is default-deny.
-- Corrections are made with reversing entries (entry_type='adjustment'),
-- never by mutating history.
--
-- ROLLBACK (single statement, safe while the table holds no production rows):
--   DROP VIEW IF EXISTS public.oracle_token_balances;
--   DROP TABLE IF EXISTS public.oracle_token_ledger;
--   DROP TABLE IF EXISTS public.oracle_model_rates;
--
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE VIEW / DROP POLICY
-- IF EXISTS before CREATE POLICY. Safe to re-run.
-- =============================================================================

BEGIN;

-- =============================================================================
-- BLOCK A — TABLE oracle_token_ledger
-- =============================================================================
-- Append-only. One row per movement of Oracle Tokens.
--
-- Sign convention: amount_tokens is SIGNED, so balance is a plain SUM.
--   purchase   > 0   Bee acquired tokens
--   grant      > 0   platform issued tokens (promo, restitution, free-tier top-up)
--   debit      < 0   tokens consumed by a directive
--   adjustment <> 0  correction in either direction (the reversing-entry path)
-- The CHECK constraint enforces this, so a wrong-signed row cannot be inserted.
--
-- payment_ref / payment_method are PAYMENT-AGNOSTIC free text. No processor is
-- assumed or referenced. Purchase implementation is a later, separately-ruled
-- pass; these columns exist so that pass does not need a migration to record
-- provenance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.oracle_token_ledger (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bee_id         uuid NOT NULL REFERENCES public.bees(id),
    entry_type     text NOT NULL,
    amount_tokens  numeric(20,6) NOT NULL,
    directive_id   uuid REFERENCES public.atlasoracle_directives(id),
    payment_ref    text,
    payment_method text,
    memo           text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_token_ledger
    DROP CONSTRAINT IF EXISTS oracle_token_ledger_entry_type_chk;
ALTER TABLE public.oracle_token_ledger
    ADD  CONSTRAINT oracle_token_ledger_entry_type_chk
        CHECK (entry_type IN ('purchase','debit','adjustment','grant'));

-- Sign discipline, per entry_type. This is what makes SUM() trustworthy.
ALTER TABLE public.oracle_token_ledger
    DROP CONSTRAINT IF EXISTS oracle_token_ledger_amount_sign_chk;
ALTER TABLE public.oracle_token_ledger
    ADD  CONSTRAINT oracle_token_ledger_amount_sign_chk
        CHECK (
            (entry_type IN ('purchase','grant') AND amount_tokens > 0)
         OR (entry_type = 'debit'               AND amount_tokens < 0)
         OR (entry_type = 'adjustment'          AND amount_tokens <> 0)
        );

-- Balance lookups are per-bee, newest-first; directive lookups join back.
CREATE INDEX IF NOT EXISTS oracle_token_ledger_bee_created_idx
    ON public.oracle_token_ledger (bee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS oracle_token_ledger_directive_idx
    ON public.oracle_token_ledger (directive_id)
    WHERE directive_id IS NOT NULL;

-- One ledger row per directive debit — idempotency guard for the router.
-- Partial + unique: a directive may carry at most one 'debit'. Adjustments
-- against the same directive stay legal, which is the whole point of the
-- reversing-entry model.
CREATE UNIQUE INDEX IF NOT EXISTS oracle_token_ledger_one_debit_per_directive_uidx
    ON public.oracle_token_ledger (directive_id)
    WHERE entry_type = 'debit' AND directive_id IS NOT NULL;

-- =============================================================================
-- BLOCK B — append-only enforcement (grants)
-- =============================================================================
-- Supabase issues blanket table grants to anon/authenticated/service_role by
-- default (verified on atlasoracle_directives during the DB8 pre-flight:
-- DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE to all four roles).
-- Leaving that in place would make "append-only" a claim rather than a fact,
-- because service_role bypasses RLS. Revoke first, then grant back only what
-- each role legitimately needs.
-- =============================================================================

REVOKE ALL ON public.oracle_token_ledger FROM anon, authenticated, service_role;

-- Bees read their own ledger (RLS narrows to auth.uid() = bee_id).
GRANT SELECT ON public.oracle_token_ledger TO authenticated;
-- Edge Functions append and read. No UPDATE, no DELETE, no TRUNCATE.
GRANT SELECT, INSERT ON public.oracle_token_ledger TO service_role;
-- anon gets nothing.

ALTER TABLE public.oracle_token_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oracle_token_ledger_select_own ON public.oracle_token_ledger;
CREATE POLICY oracle_token_ledger_select_own
    ON public.oracle_token_ledger
    FOR SELECT TO authenticated
    USING (auth.uid() = bee_id);

-- Deliberately absent: INSERT / UPDATE / DELETE policies. RLS is default-deny,
-- so authenticated cannot write at all, and the revoked grants stop service_role
-- from mutating even though it bypasses RLS.

-- =============================================================================
-- BLOCK C — VIEW oracle_token_balances
-- =============================================================================
-- balance = SUM(amount_tokens) per bee. security_invoker=true so the view
-- evaluates RLS as the CALLER, not the view owner — without it a Bee could read
-- every Bee's balance through the view despite the table policy.
-- =============================================================================

DROP VIEW IF EXISTS public.oracle_token_balances;
CREATE VIEW public.oracle_token_balances
    WITH (security_invoker = true) AS
SELECT
    bee_id,
    SUM(amount_tokens)                                        AS balance_tokens,
    SUM(amount_tokens) FILTER (WHERE entry_type = 'purchase') AS purchased_tokens,
    SUM(amount_tokens) FILTER (WHERE entry_type = 'grant')    AS granted_tokens,
    -SUM(amount_tokens) FILTER (WHERE entry_type = 'debit')   AS spent_tokens,
    count(*)                                                  AS entry_count,
    max(created_at)                                           AS last_entry_at
FROM public.oracle_token_ledger
GROUP BY bee_id;

REVOKE ALL ON public.oracle_token_balances FROM anon, authenticated, service_role;
GRANT SELECT ON public.oracle_token_balances TO authenticated, service_role;

-- =============================================================================
-- BLOCK D — TABLE oracle_model_rates (rates as DATA, not code)
-- =============================================================================
-- What a directive costs in Oracle Tokens, per provider model, per 1M provider
-- tokens. Rate history is preserved: rows are versioned by effective_from and
-- the current rate is the newest active row per model. Nothing is overwritten,
-- so a debit can always be re-derived against the rate that was live when it
-- happened.
--
-- This is a NEW table rather than columns bolted onto atlasoracle_provider_pool
-- (the dispatch allowed either). Reasons: provider_pool is about SELECTION
-- (weight, drift, active) and carries exactly one row per provider, so it cannot
-- hold rate history without changing its grain; and it is currently inert
-- (nothing reads it — OPS10 finding 4), so extending it would put live pricing
-- into a dead table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.oracle_model_rates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name          text NOT NULL,
    tier                text,
    input_tokens_per_m  numeric(20,6) NOT NULL,
    output_tokens_per_m numeric(20,6) NOT NULL,
    cached_input_per_m  numeric(20,6),
    effective_from      timestamptz NOT NULL DEFAULT now(),
    active              boolean NOT NULL DEFAULT true,
    source_note         text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_model_rates
    DROP CONSTRAINT IF EXISTS oracle_model_rates_nonneg_chk;
ALTER TABLE public.oracle_model_rates
    ADD  CONSTRAINT oracle_model_rates_nonneg_chk
        CHECK (input_tokens_per_m >= 0 AND output_tokens_per_m >= 0
               AND (cached_input_per_m IS NULL OR cached_input_per_m >= 0));

CREATE UNIQUE INDEX IF NOT EXISTS oracle_model_rates_model_effective_uidx
    ON public.oracle_model_rates (model_name, effective_from);
CREATE INDEX IF NOT EXISTS oracle_model_rates_active_idx
    ON public.oracle_model_rates (model_name, effective_from DESC)
    WHERE active;

REVOKE ALL ON public.oracle_model_rates FROM anon, authenticated, service_role;
GRANT SELECT ON public.oracle_model_rates TO authenticated, service_role;

ALTER TABLE public.oracle_model_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oracle_model_rates_select_authenticated ON public.oracle_model_rates;
CREATE POLICY oracle_model_rates_select_authenticated
    ON public.oracle_model_rates
    FOR SELECT TO authenticated
    USING (true);

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION (run separately — do not uncomment into the apply)
-- =============================================================================
-- -- objects exist
-- SELECT table_name, table_type FROM information_schema.tables
--  WHERE table_schema='public' AND table_name LIKE 'oracle\_%' ORDER BY 1;
--
-- -- append-only: expect NO update/delete/truncate rows for anon/authenticated/service_role
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--  WHERE table_schema='public' AND table_name='oracle_token_ledger'
--    AND grantee IN ('anon','authenticated','service_role')
--  ORDER BY grantee, privilege_type;
--
-- -- view runs as invoker
-- SELECT c.relname, c.reloptions FROM pg_class c
--   JOIN pg_namespace n ON n.oid=c.relnamespace
--  WHERE n.nspname='public' AND c.relname='oracle_token_balances';
-- =============================================================================
