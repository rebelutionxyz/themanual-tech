-- =============================================================================
-- Migration 20260527181500 — AtlasOracle v1 escrow infrastructure
-- =============================================================================
-- Date:        2026-05-27
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED at file commit; applied to production via Supabase
--              MCP apply_migration in same session.
-- Source:      shared/canon/atlasoracle-v1-final-scope.md §2.1
--              AtlasORACLE.to/master_plan/bling-ledger-interface.md §3, §12
--              shared/canon/og-human-v1-authority-canon.md §3
--
-- Purpose:
--   Lands AtlasOracle's escrow billing surface on top of the existing
--   purpose-locked-pot architecture (bling_pots). Five RPCs implement the
--   five interface functions from bling-ledger-interface.md §3:
--     atlasoracle_get_escrow_balance   — public read of pot balance
--     atlasoracle_deposit_to_escrow    — Bee-auth: main wallet → escrow pot
--     atlasoracle_withdraw_from_escrow — Bee-auth: escrow pot → main wallet
--     atlasoracle_debit                — service-role: escrow pot → @combtreasury
--     atlasoracle_credit               — service-role: @combtreasury → escrow pot (refund)
--
-- Path chosen: PATH A.
--   bling_pots already exists in production with shape
--   (id uuid PK, bee_id uuid, purpose text, balance numeric, created_at, updated_at)
--   and UNIQUE(bee_id, purpose). No CHECK constraint on `purpose`, so the
--   new value 'atlasoracle' lands without DDL on bling_pots. No CREATE TABLE
--   needed. Existing RLS policies (bling_pots_owner_read, bling_pots_service_write)
--   correctly cover the new purpose without modification.
--
-- Schema modifications (only to bling_transactions, additive):
--   1. Extend bling_transactions_type_check to accept four new `type` values:
--        'atlasoracle_escrow_deposit', 'atlasoracle_escrow_withdraw',
--        'atlasoracle_directive', 'atlasoracle_refund'.
--      Dispatch asked these go on `source_type`, but `source_type` is
--      unconstrained text — anything can land there already. The actually-
--      constrained categorical column is `type` (CHECK-bound to a 17-value
--      enum-by-text). Adding the 4 new values to `type` is what the dispatch
--      intent (don't break existing values, match the pattern) actually
--      requires. `source_type` is *also* populated with the same string for
--      consistent audit-log query patterns per bling-ledger-interface §11.
--   2. Two partial UNIQUE indexes on bling_transactions(source_ref) — one
--      WHERE source_type='atlasoracle_directive', one WHERE
--      source_type='atlasoracle_refund'. These enforce ledger-level
--      idempotency: re-calling atlasoracle_debit() or atlasoracle_credit()
--      with the same source_ref returns the existing row without re-debiting
--      or re-crediting.
--
-- RPC naming:
--   atlasoracle_* prefix used. Zero collisions found on either the prefixed
--   or unprefixed forms (debit, credit, get_escrow_balance,
--   deposit_to_escrow, withdraw_from_escrow). Prefix kept because the
--   canon (bling-ledger-interface §12) envisions the same five-function
--   surface eventually generalizing to atlasADs / Crowdfunding / prediction
--   markets — when that lands, the prefixed names leave room for a future
--   generic `escrow_debit(purpose, ...)` layer without rename.
--
-- Authority posture (per og-human-v1-authority-canon.md §3):
--   No Director / Treasury Council gates. Bee-auth RPCs use auth.uid()
--   identity check only. Service-role RPCs use service_role privilege
--   only. OG HUMAN's is_admin status is irrelevant to escrow flows —
--   the escrow is the Bee's property under their own auth.
--
-- Deviation from dispatch literal signature:
--   atlasoracle_credit's p_original_debit param is typed `bigint`, not
--   `uuid`. The canon's TypeScript-flavored signature said uuid, but
--   bling_transactions.id is bigint (sequence-backed) in production.
--   The canonical lookup happens by source_ref+source_type anyway; this
--   param exists for FK-like cross-reference. Keeping it bigint matches
--   actual schema.
--
-- Idempotency for re-apply:
--   - ALTER ... DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is safe.
--   - CREATE UNIQUE INDEX IF NOT EXISTS is safe.
--   - CREATE OR REPLACE FUNCTION is safe.
--   - GRANT / REVOKE are idempotent.
--   Re-apply after a successful first apply is a no-op.
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: confirm bling_pots, bees.bling_balance, @combtreasury exist.
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bling_pots_exists      boolean;
    v_bees_balance_exists    boolean;
    v_treasury_exists        boolean;
    v_type_check_exists      boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='bling_pots')
      INTO v_bling_pots_exists;
    IF NOT v_bling_pots_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bling_pots table absent.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='bees'
                      AND column_name='bling_balance')
      INTO v_bees_balance_exists;
    IF NOT v_bees_balance_exists THEN
        RAISE EXCEPTION 'Pre-flight failed: bees.bling_balance column absent.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.bees
                    WHERE id = '00000000-0000-0000-0000-000000000bee'::uuid)
      INTO v_treasury_exists;
    IF NOT v_treasury_exists THEN
        RAISE EXCEPTION
          'Pre-flight failed: @combtreasury bee (00000000-0000-0000-0000-000000000bee) absent.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname='bling_transactions_type_check'
                      AND conrelid='public.bling_transactions'::regclass)
      INTO v_type_check_exists;
    IF NOT v_type_check_exists THEN
        RAISE NOTICE 'bling_transactions_type_check absent — will create rather than replace.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: bling_pots, bees.bling_balance, @combtreasury present.';
END
$$;


-- =============================================================================
-- BLOCK A — Extend bling_transactions.type CHECK constraint.
-- =============================================================================
-- Preserves the 17 existing allowed values exactly; appends 4 new AtlasOracle
-- values. Drop-then-add is safe because (a) no rows exist yet with the new
-- values, (b) all 17 existing values are preserved verbatim.
-- =============================================================================

ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_transactions_type_check;

ALTER TABLE public.bling_transactions
    ADD  CONSTRAINT bling_transactions_type_check
    CHECK (type IN (
        -- Pre-existing 17 values (must not break):
        'free','send_debit','send_credit',
        'escrow_hold','escrow_release','escrow_cancel','escrow_dispute',
        'order_reserve','order_fill_debit','order_fill_credit',
        'order_cancel_refund','order_donation',
        'stripe_credit','chargeback',
        'escrow_in','escrow_unlock','newbee_bonus',
        -- New AtlasOracle values:
        'atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw',
        'atlasoracle_directive','atlasoracle_refund'
    ));


-- =============================================================================
-- BLOCK B — Idempotency indexes on bling_transactions(source_ref).
-- =============================================================================
-- One partial UNIQUE index per AtlasOracle source_type that needs replay
-- protection. Directives and refunds get one row each per directive UUID;
-- deposits/withdrawals are Bee-initiated and have no replay semantics.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS bling_transactions_atlasoracle_directive_uidx
    ON public.bling_transactions (source_ref)
    WHERE source_type = 'atlasoracle_directive';

CREATE UNIQUE INDEX IF NOT EXISTS bling_transactions_atlasoracle_refund_uidx
    ON public.bling_transactions (source_ref)
    WHERE source_type = 'atlasoracle_refund';


-- =============================================================================
-- BLOCK C — RPC 1/5: atlasoracle_get_escrow_balance
-- =============================================================================
-- Public read of the (bee_id, 'atlasoracle') pot balance. Returns 0 if the
-- pot row does not exist (Bee never funded escrow). Callable by any
-- authenticated session and by service-role. Does NOT enforce auth.uid() ==
-- p_bee_id because the wallet badge can display other Bees' balances in
-- some surfaces (and there's no PII in a balance scalar); RLS on bling_pots
-- is the binding gate for direct reads.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atlasoracle_get_escrow_balance(p_bee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_balance numeric(20,6);
BEGIN
    SELECT balance INTO v_balance
      FROM public.bling_pots
     WHERE bee_id = p_bee_id AND purpose = 'atlasoracle';

    IF v_balance IS NULL THEN
        v_balance := 0;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'bee_id', p_bee_id,
        'balance', v_balance,
        'as_of', now()
    );
END;
$function$;


-- =============================================================================
-- BLOCK D — RPC 2/5: atlasoracle_deposit_to_escrow
-- =============================================================================
-- Bee-auth via auth.uid(). Moves BLiNG! from main wallet (bees.bling_balance)
-- into the (caller, 'atlasoracle') pot. Creates the pot row on first deposit.
-- Atomic: main decrement, pot increment, two transaction rows in one txn.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atlasoracle_deposit_to_escrow(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_caller                uuid := auth.uid();
    v_main_balance          numeric(20,6);
    v_main_balance_after    numeric(20,6);
    v_escrow_balance_after  numeric(20,6);
    v_min_amount  constant  numeric(20,6) := 0.1;
    v_debit_tx_id           bigint;
    v_credit_tx_id          bigint;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_amount IS NULL OR p_amount < v_min_amount THEN
        RAISE EXCEPTION 'minimum deposit is % BLiNG!', v_min_amount;
    END IF;

    SELECT bling_balance INTO v_main_balance
      FROM public.bees WHERE id = v_caller FOR UPDATE;
    IF v_main_balance IS NULL THEN
        RAISE EXCEPTION 'caller bee % not found', v_caller;
    END IF;
    IF v_main_balance < p_amount THEN
        RAISE EXCEPTION 'insufficient main balance (% < %)', v_main_balance, p_amount;
    END IF;

    UPDATE public.bees
       SET bling_balance = bling_balance - p_amount
     WHERE id = v_caller
     RETURNING bling_balance INTO v_main_balance_after;

    INSERT INTO public.bling_pots (bee_id, purpose, balance)
    VALUES (v_caller, 'atlasoracle', p_amount)
    ON CONFLICT (bee_id, purpose)
    DO UPDATE SET balance = public.bling_pots.balance + EXCLUDED.balance,
                  updated_at = now()
    RETURNING balance INTO v_escrow_balance_after;

    -- Main-wallet leg (negative): visible in main wallet history.
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, source_type, memo)
    VALUES
        (v_caller, 'atlasoracle_escrow_deposit', -p_amount, v_main_balance_after,
         'atlasoracle_escrow_deposit', 'AtlasOracle escrow funded')
    RETURNING id INTO v_debit_tx_id;

    -- Escrow-pot leg (positive): visible in AtlasOracle history surface.
    -- balance_after here records the escrow pot's new balance (not main).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, source_type, memo)
    VALUES
        (v_caller, 'atlasoracle_escrow_deposit', p_amount, v_escrow_balance_after,
         'atlasoracle_escrow_deposit', 'AtlasOracle escrow funded (pot leg)')
    RETURNING id INTO v_credit_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'transaction_id', v_debit_tx_id,
        'pot_transaction_id', v_credit_tx_id,
        'main_balance_after', v_main_balance_after,
        'escrow_balance_after', v_escrow_balance_after
    );
END;
$function$;


-- =============================================================================
-- BLOCK E — RPC 3/5: atlasoracle_withdraw_from_escrow
-- =============================================================================
-- Bee-auth via auth.uid(). Reverse of deposit. No cool-down per canon §3.3.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atlasoracle_withdraw_from_escrow(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_caller                uuid := auth.uid();
    v_escrow_balance        numeric(20,6);
    v_escrow_balance_after  numeric(20,6);
    v_main_balance_after    numeric(20,6);
    v_min_amount  constant  numeric(20,6) := 0.1;
    v_debit_tx_id           bigint;
    v_credit_tx_id          bigint;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_amount IS NULL OR p_amount < v_min_amount THEN
        RAISE EXCEPTION 'minimum withdrawal is % BLiNG!', v_min_amount;
    END IF;

    SELECT balance INTO v_escrow_balance
      FROM public.bling_pots
     WHERE bee_id = v_caller AND purpose = 'atlasoracle'
     FOR UPDATE;
    IF v_escrow_balance IS NULL THEN
        RAISE EXCEPTION 'no atlasoracle escrow pot for bee %', v_caller;
    END IF;
    IF v_escrow_balance < p_amount THEN
        RAISE EXCEPTION 'insufficient escrow balance (% < %)', v_escrow_balance, p_amount;
    END IF;

    UPDATE public.bling_pots
       SET balance = balance - p_amount, updated_at = now()
     WHERE bee_id = v_caller AND purpose = 'atlasoracle'
     RETURNING balance INTO v_escrow_balance_after;

    UPDATE public.bees
       SET bling_balance = bling_balance + p_amount
     WHERE id = v_caller
     RETURNING bling_balance INTO v_main_balance_after;

    -- Pot leg (negative).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, source_type, memo)
    VALUES
        (v_caller, 'atlasoracle_escrow_withdraw', -p_amount, v_escrow_balance_after,
         'atlasoracle_escrow_withdraw', 'Withdrawn from AtlasOracle escrow (pot leg)')
    RETURNING id INTO v_debit_tx_id;

    -- Main leg (positive).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, source_type, memo)
    VALUES
        (v_caller, 'atlasoracle_escrow_withdraw', p_amount, v_main_balance_after,
         'atlasoracle_escrow_withdraw', 'Withdrawn from AtlasOracle escrow')
    RETURNING id INTO v_credit_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'transaction_id', v_credit_tx_id,
        'pot_transaction_id', v_debit_tx_id,
        'main_balance_after', v_main_balance_after,
        'escrow_balance_after', v_escrow_balance_after
    );
END;
$function$;


-- =============================================================================
-- BLOCK F — RPC 4/5: atlasoracle_debit
-- =============================================================================
-- Service-role only. Moves BLiNG! from (p_bee_id, 'atlasoracle') pot to
-- (@combtreasury, 'operational') pot. Idempotent by p_source_ref.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atlasoracle_debit(
    p_bee_id     uuid,
    p_amount     numeric,
    p_source_ref uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_treasury_id constant uuid := '00000000-0000-0000-0000-000000000bee'::uuid;
    v_existing_tx_id       bigint;
    v_escrow_balance       numeric(20,6);
    v_escrow_balance_after numeric(20,6);
    v_treasury_balance_after numeric(20,6);
    v_pot_tx_id            bigint;
    v_treasury_tx_id       bigint;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'unauthorized: service_role required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'amount must be > 0';
    END IF;
    IF p_source_ref IS NULL THEN
        RAISE EXCEPTION 'source_ref required for idempotency';
    END IF;

    -- Idempotency check: if a debit for this source_ref already exists,
    -- return it unchanged. The partial unique index is the race-safety net.
    SELECT id, balance_after INTO v_existing_tx_id, v_escrow_balance_after
      FROM public.bling_transactions
     WHERE source_type = 'atlasoracle_directive'
       AND source_ref  = p_source_ref
     ORDER BY id ASC
     LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'transaction_id', v_existing_tx_id,
            'escrow_balance_after', v_escrow_balance_after
        );
    END IF;

    -- Lock escrow pot row.
    SELECT balance INTO v_escrow_balance
      FROM public.bling_pots
     WHERE bee_id = p_bee_id AND purpose = 'atlasoracle'
     FOR UPDATE;
    IF v_escrow_balance IS NULL THEN
        RAISE EXCEPTION 'no atlasoracle escrow pot for bee %', p_bee_id;
    END IF;
    IF v_escrow_balance < p_amount THEN
        RAISE EXCEPTION 'insufficient escrow balance (% < %)', v_escrow_balance, p_amount;
    END IF;

    -- Debit Bee's escrow pot.
    UPDATE public.bling_pots
       SET balance = balance - p_amount, updated_at = now()
     WHERE bee_id = p_bee_id AND purpose = 'atlasoracle'
     RETURNING balance INTO v_escrow_balance_after;

    -- Credit @combtreasury operational pot (upsert in case row absent).
    INSERT INTO public.bling_pots (bee_id, purpose, balance)
    VALUES (v_treasury_id, 'operational', p_amount)
    ON CONFLICT (bee_id, purpose)
    DO UPDATE SET balance = public.bling_pots.balance + EXCLUDED.balance,
                  updated_at = now()
    RETURNING balance INTO v_treasury_balance_after;

    -- Bee-side transaction row (the one that gates idempotency).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, counterparty_bee_id,
         source_type, source_ref, memo)
    VALUES
        (p_bee_id, 'atlasoracle_directive', -p_amount, v_escrow_balance_after,
         v_treasury_id,
         'atlasoracle_directive', p_source_ref, 'AtlasOracle directive')
    RETURNING id INTO v_pot_tx_id;

    -- Treasury-side transaction row (audit trail).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, counterparty_bee_id,
         source_type, source_ref, memo)
    VALUES
        (v_treasury_id, 'atlasoracle_directive', p_amount, v_treasury_balance_after,
         p_bee_id,
         'atlasoracle_directive', p_source_ref, 'AtlasOracle directive (treasury leg)')
    RETURNING id INTO v_treasury_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'transaction_id', v_pot_tx_id,
        'treasury_transaction_id', v_treasury_tx_id,
        'escrow_balance_after', v_escrow_balance_after,
        'treasury_credited', true
    );
END;
$function$;


-- =============================================================================
-- BLOCK G — RPC 5/5: atlasoracle_credit
-- =============================================================================
-- Service-role only. Reverses a prior atlasoracle_debit: moves BLiNG! from
-- (@combtreasury, 'operational') pot back to (p_bee_id, 'atlasoracle') pot.
-- Idempotent by p_source_ref. p_original_debit references the original
-- debit row (bigint, matches bling_transactions.id schema; deviates from
-- canon's uuid signature).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atlasoracle_credit(
    p_bee_id          uuid,
    p_amount          numeric,
    p_source_ref      uuid,
    p_original_debit  bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_treasury_id constant uuid := '00000000-0000-0000-0000-000000000bee'::uuid;
    v_existing_tx_id         bigint;
    v_original_exists        boolean;
    v_treasury_balance       numeric(20,6);
    v_escrow_balance_after   numeric(20,6);
    v_treasury_balance_after numeric(20,6);
    v_pot_tx_id              bigint;
    v_treasury_tx_id         bigint;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'unauthorized: service_role required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'amount must be > 0';
    END IF;
    IF p_source_ref IS NULL OR p_original_debit IS NULL THEN
        RAISE EXCEPTION 'source_ref and original_debit required';
    END IF;

    -- Idempotency check.
    SELECT id, balance_after INTO v_existing_tx_id, v_escrow_balance_after
      FROM public.bling_transactions
     WHERE source_type = 'atlasoracle_refund'
       AND source_ref  = p_source_ref
     ORDER BY id ASC
     LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'transaction_id', v_existing_tx_id,
            'escrow_balance_after', v_escrow_balance_after
        );
    END IF;

    -- Verify the original debit exists.
    SELECT EXISTS (
        SELECT 1 FROM public.bling_transactions
         WHERE id = p_original_debit
           AND source_type = 'atlasoracle_directive'
           AND source_ref  = p_source_ref
    ) INTO v_original_exists;
    IF NOT v_original_exists THEN
        RAISE EXCEPTION
          'original debit % (source_ref %) not found', p_original_debit, p_source_ref;
    END IF;

    -- Lock treasury operational pot row.
    SELECT balance INTO v_treasury_balance
      FROM public.bling_pots
     WHERE bee_id = v_treasury_id AND purpose = 'operational'
     FOR UPDATE;
    IF v_treasury_balance IS NULL THEN
        RAISE EXCEPTION '@combtreasury operational pot row missing';
    END IF;
    IF v_treasury_balance < p_amount THEN
        RAISE EXCEPTION 'treasury operational balance % < refund %',
                        v_treasury_balance, p_amount;
    END IF;

    -- Decrement treasury.
    UPDATE public.bling_pots
       SET balance = balance - p_amount, updated_at = now()
     WHERE bee_id = v_treasury_id AND purpose = 'operational'
     RETURNING balance INTO v_treasury_balance_after;

    -- Credit Bee escrow pot (upsert in case it was withdrawn down to 0
    -- between the debit and the refund; rare but possible).
    INSERT INTO public.bling_pots (bee_id, purpose, balance)
    VALUES (p_bee_id, 'atlasoracle', p_amount)
    ON CONFLICT (bee_id, purpose)
    DO UPDATE SET balance = public.bling_pots.balance + EXCLUDED.balance,
                  updated_at = now()
    RETURNING balance INTO v_escrow_balance_after;

    -- Bee-side refund row (gates idempotency).
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, counterparty_bee_id,
         source_type, source_ref, memo)
    VALUES
        (p_bee_id, 'atlasoracle_refund', p_amount, v_escrow_balance_after,
         v_treasury_id,
         'atlasoracle_refund', p_source_ref, 'AtlasOracle refund')
    RETURNING id INTO v_pot_tx_id;

    -- Treasury-side row.
    INSERT INTO public.bling_transactions
        (bee_id, type, amount, balance_after, counterparty_bee_id,
         source_type, source_ref, memo)
    VALUES
        (v_treasury_id, 'atlasoracle_refund', -p_amount, v_treasury_balance_after,
         p_bee_id,
         'atlasoracle_refund', p_source_ref, 'AtlasOracle refund (treasury leg)')
    RETURNING id INTO v_treasury_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'transaction_id', v_pot_tx_id,
        'treasury_transaction_id', v_treasury_tx_id,
        'escrow_balance_after', v_escrow_balance_after
    );
END;
$function$;


-- =============================================================================
-- BLOCK H — Grants
-- =============================================================================
-- Bee-callable RPCs: deposit, withdraw, get_balance (read).
-- Service-role-only: debit, credit.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.atlasoracle_get_escrow_balance(uuid)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atlasoracle_deposit_to_escrow(numeric)
    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.atlasoracle_withdraw_from_escrow(numeric)
    TO authenticated, service_role;

-- Note: REVOKE FROM PUBLIC is not sufficient under Supabase defaults — anon and
-- authenticated each carry independent EXECUTE grants installed by Supabase's
-- default-privilege setup. Both must be revoked explicitly so the runtime
-- auth.role() guard inside the function is not the *only* gate.
REVOKE EXECUTE ON FUNCTION public.atlasoracle_debit(uuid, numeric, uuid)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_debit(uuid, numeric, uuid)
    FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_debit(uuid, numeric, uuid)
    FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.atlasoracle_debit(uuid, numeric, uuid)
    TO service_role;

REVOKE EXECUTE ON FUNCTION public.atlasoracle_credit(uuid, numeric, uuid, bigint)
    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_credit(uuid, numeric, uuid, bigint)
    FROM anon;
REVOKE EXECUTE ON FUNCTION public.atlasoracle_credit(uuid, numeric, uuid, bigint)
    FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.atlasoracle_credit(uuid, numeric, uuid, bigint)
    TO service_role;

COMMIT;
