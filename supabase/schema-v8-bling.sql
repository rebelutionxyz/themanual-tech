-- ═══════════════════════════════════════════════════════════════════════
-- TheManual.tech · Schema v8 — BLiNG! economy integration
-- April 25, 2026
--
-- Imports the FreedomBLiNGs economy into themanual.tech's Supabase.
-- Wipe-and-import philosophy — no data preservation needed (single test bee).
--
-- Source of truth: FreedomBLiNGs/server.js (no SQL files in that repo).
-- Schema reconstructed from server.js reads/writes against the live FB DB.
--
-- ECONOMY IS DB-AUTHORITATIVE:
--   * All balance/supply/fee math runs in PL/pgSQL (impossible to bypass)
--   * All tunable economic parameters live in bling_system_state
--   * UI reads from these or from src/lib/bling/constants.ts (display only)
--
-- What this does:
--   1. ALTER bees: rename hive_actions→action_count; widen bling_balance to
--      numeric(20,3) NOT NULL; ADD missing bling_rank, honeycomb_ring columns.
--      Verified live-DB shape 2026-04-25 (id, bee_id, email, bling_balance,
--      hive_actions, created_at). Aspirational schema.sql had drifted.
--   2. CREATE @combtreasury system bee — collects bee-to-bee fees.
--      bees.id DOES have a FK → auth.users.id (confirmed empirically on
--      first migration attempt; the information_schema query missed it
--      because cross-schema FKs surface unreliably there — pg_constraint
--      is the authoritative source going forward). We insert into
--      auth.users first (minimum viable shape, empty password = no login),
--      then into public.bees. Treasury never logs in; addressed only by
--      id in RPCs. Distribution policy lands in v9; v8 just collects.
--   3. CREATE bling_transactions, bling_orders, bling_escrows,
--      bling_system_state (columnar single-row config), bling_stripe_events
--      (webhook idempotency).
--   4. SEED bling_system_state with locked-spec defaults.
--   5. INSTALL compute_bling_rank() + trigger on bees.bling_rank (added in §1).
--   6. INSTALL atomic SECURITY DEFINER RPCs that read fees/state from
--      bling_system_state (not hardcoded). Honors mint_active emergency
--      pause and the kindness/productivity/learning fee carve-outs.
--      Bee-to-bee fees credit @combtreasury (no burn, total_supply unchanged).
--   7. RLS policies (read-where-appropriate; writes via service role only).
--   8. Indexes for leaderboard, order book, escrow lookups.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 1. ALTER bees — bring schema in line with v8 expectations.
-- Live-DB shape verified 2026-04-25:
--   id uuid NOT NULL, bee_id text NOT NULL, email text NOT NULL,
--   bling_balance numeric (NULLABLE, default 0),
--   hive_actions integer (default 0),
--   created_at timestamptz (default utc now()).
-- We need to:
--   • RENAME hive_actions → action_count (consistent comb-naming;
--     "hive → comb" sweep happens later, this column rides ahead).
--   • TIGHTEN bling_balance: numeric → numeric(20,3), NOT NULL, default 0.
--   • ADD bling_rank, honeycomb_ring (referenced by trigger + UI).
-- Single test bee = safe to do all of this in one transaction.
-- ───────────────────────────────────────────────────────────────────────

-- 1a. Rename the actions counter to match comb-naming.
ALTER TABLE public.bees RENAME COLUMN hive_actions TO action_count;

-- 1b. Coalesce any NULL balance values to 0 BEFORE tightening NOT NULL.
UPDATE public.bees SET bling_balance = 0 WHERE bling_balance IS NULL;

-- 1c. Widen precision and tighten constraints on bling_balance.
ALTER TABLE public.bees ALTER COLUMN bling_balance TYPE numeric(20, 3);
ALTER TABLE public.bees ALTER COLUMN bling_balance SET NOT NULL;
ALTER TABLE public.bees ALTER COLUMN bling_balance SET DEFAULT 0;

-- 1d. ADD the columns the rest of v8 references.
ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS bling_rank integer NOT NULL DEFAULT 0
        CHECK (bling_rank BETWEEN 0 AND 32);

ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS honeycomb_ring integer NOT NULL DEFAULT 0
        CHECK (honeycomb_ring BETWEEN 0 AND 8);

-- ───────────────────────────────────────────────────────────────────────
-- 2. @combtreasury system bee — collects bee-to-bee fees
-- ───────────────────────────────────────────────────────────────────────
-- UUID is reserved/recognizable: 8 zero blocks + 'bee'.
-- bees.id → auth.users.id FK is enforced, so we MUST insert into
-- auth.users first. Empty encrypted_password = cannot log in (no plaintext
-- bcrypt-hashes to ''). email_confirmed_at=now() marks the row "active"
-- so Supabase auth doesn't treat it as pending.
--
-- Column set is the minimum viable for live-DB shape (verified
-- 2026-04-25 against information_schema): id (NOT NULL), is_sso_user and
-- is_anonymous (NOT NULL with false default), plus the conventional auth
-- fields (aud/role/email/timestamps/metadata). All other columns omitted
-- → take their declared NULL defaults.

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
) VALUES (
    '00000000-0000-0000-0000-000000000bee'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'treasury@themanual.tech',
    '',
    now(),
    '{"provider":"system"}'::jsonb,
    '{"name":"Comb Treasury","system":true}'::jsonb,
    now(),
    now(),
    false,
    false
)
ON CONFLICT (id) DO NOTHING;

-- bees insert — uses live-DB column names (bee_id, action_count).
-- bling_rank, honeycomb_ring added in §1d with NOT NULL DEFAULT 0,
-- so they don't need to be specified here.
INSERT INTO public.bees (id, bee_id, email, bling_balance, action_count)
VALUES (
    '00000000-0000-0000-0000-000000000bee'::uuid,
    'combtreasury',
    'treasury@themanual.tech',
    0,
    0
)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- 3. bling_system_state — columnar single-row config
-- Singleton enforced via PRIMARY KEY DEFAULT 1 + CHECK (id = 1).
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_system_state (
    id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- runtime state
    mint_price          NUMERIC(30, 6) NOT NULL DEFAULT 1.001,
    total_supply        NUMERIC(30, 6) NOT NULL DEFAULT 0,
    -- tunable fees (decimal fractions; 0.01 = 1%)
    sell_fee_pct        NUMERIC(6, 4)  NOT NULL DEFAULT 0.01    CHECK (sell_fee_pct        >= 0 AND sell_fee_pct        < 1),
    bee_to_bee_fee_pct  NUMERIC(6, 4)  NOT NULL DEFAULT 0.001   CHECK (bee_to_bee_fee_pct  >= 0 AND bee_to_bee_fee_pct  < 1),
    -- emergency pause (false = no new mints from curve)
    mint_active         BOOLEAN        NOT NULL DEFAULT true,
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Seed the singleton row (default values fill the rest)
INSERT INTO public.bling_system_state (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────
-- 4. bling_transactions — every BLiNG! event for a bee
-- category drives bee-to-bee fee carve-outs (kindness/productivity/learning
-- are fee-free per locked spec).
-- 'fee' = sender-side row when fee charged.
-- 'fee_received' = treasury-side row when fee credited. (Filter both with
-- type LIKE 'fee%' to see all fee activity in audit queries.)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_transactions (
    id            BIGSERIAL PRIMARY KEY,
    bee_id        UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN (
                    'sent','received','bought','sold','minted','fee','fee_received',
                    'escrow_created','escrow_released','escrow_disputed','escrow_cancelled'
                  )),
    category      TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
                    'general','kindness','productivity','learning'
                  )),
    amount        NUMERIC(20, 3) NOT NULL,
    counterparty  TEXT,                       -- bee_id of the other party (nullable)
    memo          TEXT,
    ref_order_id  BIGINT,                     -- FK wired below after orders exists
    ref_escrow_id BIGINT,                     -- FK wired below
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bling_tx_bee_idx     ON public.bling_transactions(bee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bling_tx_type_idx    ON public.bling_transactions(type);
CREATE INDEX IF NOT EXISTS bling_tx_created_idx ON public.bling_transactions(created_at DESC);

-- ───────────────────────────────────────────────────────────────────────
-- 5. bling_orders — buy/sell book
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_orders (
    id          BIGSERIAL PRIMARY KEY,
    bee_id      UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    side        TEXT NOT NULL CHECK (side IN ('buy','sell')),
    price       NUMERIC(10, 3) NOT NULL CHECK (price > 0),
    amount      NUMERIC(20, 3) NOT NULL CHECK (amount >= 0.001),
    filled      NUMERIC(20, 3) NOT NULL DEFAULT 0 CHECK (filled >= 0),
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bling_orders_bee_idx     ON public.bling_orders(bee_id);
CREATE INDEX IF NOT EXISTS bling_orders_book_idx    ON public.bling_orders(side, status, price);
CREATE INDEX IF NOT EXISTS bling_orders_created_idx ON public.bling_orders(created_at DESC);

-- ───────────────────────────────────────────────────────────────────────
-- 6. bling_escrows
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_escrows (
    id            BIGSERIAL PRIMARY KEY,
    creator_id    UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES public.bees(id) ON DELETE CASCADE,
    amount        NUMERIC(20, 3) NOT NULL CHECK (amount > 0),
    kind          TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN (
                    'waggle_gig','gate_triggered','milestone','time_locked','manual'
                  )),
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                    'open','released','disputed','cancelled'
                  )),
    memo          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bling_escrows_creator_idx   ON public.bling_escrows(creator_id);
CREATE INDEX IF NOT EXISTS bling_escrows_recipient_idx ON public.bling_escrows(recipient_id);
CREATE INDEX IF NOT EXISTS bling_escrows_status_idx    ON public.bling_escrows(status);

-- Wire deferred FKs
ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_tx_ref_order_fk,
    ADD  CONSTRAINT bling_tx_ref_order_fk
         FOREIGN KEY (ref_order_id) REFERENCES public.bling_orders(id) ON DELETE SET NULL;

ALTER TABLE public.bling_transactions
    DROP CONSTRAINT IF EXISTS bling_tx_ref_escrow_fk,
    ADD  CONSTRAINT bling_tx_ref_escrow_fk
         FOREIGN KEY (ref_escrow_id) REFERENCES public.bling_escrows(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────────────
-- 7. bling_stripe_events — webhook idempotency
-- Stripe retries on 5xx; without this dedupe table, a retried
-- checkout.session.completed event would double-credit the bee.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bling_stripe_events (
    event_id      TEXT PRIMARY KEY,             -- Stripe's event id (evt_...)
    event_type    TEXT NOT NULL,                -- e.g. 'checkout.session.completed'
    bee_id        UUID REFERENCES public.bees(id) ON DELETE SET NULL,
    bling_amount  NUMERIC(20, 3),               -- for audit / reconciliation
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bling_stripe_events_bee_idx ON public.bling_stripe_events(bee_id);

-- ───────────────────────────────────────────────────────────────────────
-- 8. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────
-- Defensive: ensure set_updated_at() exists on this DB. CREATE OR REPLACE
-- is idempotent — no-op if the function already existed from schema.sql.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bling_orders_updated_at ON public.bling_orders;
CREATE TRIGGER bling_orders_updated_at
    BEFORE UPDATE ON public.bling_orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bling_system_state_updated_at ON public.bling_system_state;
CREATE TRIGGER bling_system_state_updated_at
    BEFORE UPDATE ON public.bling_system_state
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- 9. Bling rank computation (pure, deterministic) + trigger
-- ───────────────────────────────────────────────────────────────────────
-- 0-indexed. bees.bling_rank column added in §1d with CHECK 0..32.
-- Rank 0 = New Bee (0 BLiNG!), Rank 32 = God (≥500M BLiNG! banked).
-- Thresholds locked from FreedomBLiNGs server.js RANKS_THRESHOLDS.
CREATE OR REPLACE FUNCTION public.compute_bling_rank(balance numeric)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN balance >= 500000000 THEN 32
        WHEN balance >= 250000000 THEN 31
        WHEN balance >= 200000000 THEN 30
        WHEN balance >= 165000000 THEN 29
        WHEN balance >= 133000000 THEN 28
        WHEN balance >= 107000000 THEN 27
        WHEN balance >=  85000000 THEN 26
        WHEN balance >=  67000000 THEN 25
        WHEN balance >=  52000000 THEN 24
        WHEN balance >=  40000000 THEN 23
        WHEN balance >=  30000000 THEN 22
        WHEN balance >=  23000000 THEN 21
        WHEN balance >=  17000000 THEN 20
        WHEN balance >=  12500000 THEN 19
        WHEN balance >=   9000000 THEN 18
        WHEN balance >=   6500000 THEN 17
        WHEN balance >=   4500000 THEN 16
        WHEN balance >=   3000000 THEN 15
        WHEN balance >=   2000000 THEN 14
        WHEN balance >=   1250000 THEN 13
        WHEN balance >=    750000 THEN 12
        WHEN balance >=    400000 THEN 11
        WHEN balance >=    200000 THEN 10
        WHEN balance >=    100000 THEN  9
        WHEN balance >=     50000 THEN  8
        WHEN balance >=     25000 THEN  7
        WHEN balance >=     12000 THEN  6
        WHEN balance >=      6000 THEN  5
        WHEN balance >=      3000 THEN  4
        WHEN balance >=      1500 THEN  3
        WHEN balance >=       500 THEN  2
        WHEN balance >=       100 THEN  1
        ELSE 0
    END
$$;

CREATE OR REPLACE FUNCTION public.refresh_bling_rank()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.bling_balance IS DISTINCT FROM OLD.bling_balance THEN
        NEW.bling_rank := public.compute_bling_rank(NEW.bling_balance);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bees_bling_rank_refresh ON public.bees;
CREATE TRIGGER bees_bling_rank_refresh
    BEFORE INSERT OR UPDATE OF bling_balance ON public.bees
    FOR EACH ROW
    EXECUTE FUNCTION public.refresh_bling_rank();

-- One-time backfill (test bee → rank 0)
UPDATE public.bees
SET bling_rank = public.compute_bling_rank(bling_balance);

-- ═══════════════════════════════════════════════════════════════════════
-- 10. ATOMIC RPC HELPERS — called by Edge Functions
-- All marked SECURITY DEFINER. Edge Functions handle auth + input validation
-- BEFORE calling these. Fees + economy state read from bling_system_state.
-- ═══════════════════════════════════════════════════════════════════════

-- ── bling_send: atomic debit/credit + 2 transaction rows + optional fee ──
-- p_category drives fee carve-outs (locked spec):
--   'kindness'     → bee-to-bee tips / appreciation
--   'productivity' → Drops payouts (productive-action rewards)
--   'learning'     → course-completion payouts
--   'general'      → everything else; charges bee_to_bee_fee_pct
-- Fee disposition: 100% credited to @combtreasury (system bee).
-- total_supply unchanged. Distribution policy lands in v9.
-- Audit trail: sender gets 'fee' row, treasury gets 'fee_received' row.
CREATE OR REPLACE FUNCTION public.bling_send(
    p_sender_id    uuid,
    p_recipient_id uuid,
    p_amount       numeric,
    p_category     text  DEFAULT 'general',
    p_memo         text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_balance   numeric;
    v_sender_bee_id    text;
    v_recipient_bee_id text;
    v_fee_pct          numeric;
    v_fee              numeric := 0;
    v_total_debit      numeric;
    v_treasury_id      constant uuid := '00000000-0000-0000-0000-000000000bee'::uuid;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    IF p_sender_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot send to yourself';
    END IF;
    IF p_category NOT IN ('general','kindness','productivity','learning') THEN
        RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;

    -- Read fee config (only general category pays)
    IF p_category = 'general' THEN
        SELECT bee_to_bee_fee_pct INTO v_fee_pct FROM public.bling_system_state WHERE id = 1;
        v_fee := round(p_amount * v_fee_pct, 3);
    END IF;

    v_total_debit := p_amount + v_fee;

    -- Lock sender, check balance covers amount + fee
    SELECT bling_balance, bee_id INTO v_sender_balance, v_sender_bee_id
        FROM public.bees WHERE id = p_sender_id FOR UPDATE;
    IF v_sender_balance IS NULL THEN
        RAISE EXCEPTION 'Sender not found';
    END IF;
    IF v_sender_balance < v_total_debit THEN
        RAISE EXCEPTION 'Insufficient balance (need % including % fee)', v_total_debit, v_fee;
    END IF;

    SELECT bee_id INTO v_recipient_bee_id
        FROM public.bees WHERE id = p_recipient_id FOR UPDATE;
    IF v_recipient_bee_id IS NULL THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;

    -- Atomic balance updates
    UPDATE public.bees SET bling_balance = bling_balance - v_total_debit WHERE id = p_sender_id;
    UPDATE public.bees SET bling_balance = bling_balance + p_amount      WHERE id = p_recipient_id;

    -- Transactions
    INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
        VALUES
            (p_sender_id,    'sent',     p_category, p_amount, v_recipient_bee_id, p_memo),
            (p_recipient_id, 'received', p_category, p_amount, v_sender_bee_id,    p_memo);

    -- Fee: lock treasury row, credit it, record both sides
    IF v_fee > 0 THEN
        PERFORM 1 FROM public.bees WHERE id = v_treasury_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Treasury bee not found (expected id %)', v_treasury_id;
        END IF;
        UPDATE public.bees SET bling_balance = bling_balance + v_fee WHERE id = v_treasury_id;

        INSERT INTO public.bling_transactions (bee_id, type, category, amount, counterparty, memo)
            VALUES
                (p_sender_id,  'fee',          p_category, v_fee, 'combtreasury',
                 format('%.1f%% bee-to-bee fee on send to @%s', v_fee_pct * 100, v_recipient_bee_id)),
                (v_treasury_id,'fee_received', p_category, v_fee, v_sender_bee_id,
                 format('Fee from @%s on send to @%s', v_sender_bee_id, v_recipient_bee_id));
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'fee',     v_fee,
        'category', p_category
    );
END;
$$;

-- ── bling_mint: atomic supply++, balance++, system_state update ────────
-- Honors mint_active emergency pause flag.
CREATE OR REPLACE FUNCTION public.bling_mint(
    p_bee_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_state       public.bling_system_state%ROWTYPE;
    v_new_supply  numeric;
    v_new_price   numeric;
    v_hard_cap    constant numeric := 11222333222111;
    v_curve_inc   constant numeric := 0.01;
    v_curve_ceil  constant numeric := 101;
BEGIN
    IF p_amount < 0.001 THEN
        RAISE EXCEPTION 'Mint below minimum unit';
    END IF;

    SELECT * INTO v_state FROM public.bling_system_state WHERE id = 1 FOR UPDATE;

    IF NOT v_state.mint_active THEN
        RAISE EXCEPTION 'Minting is paused (mint_active=false)';
    END IF;

    v_new_supply := v_state.total_supply + p_amount;
    IF v_new_supply > v_hard_cap THEN
        RAISE EXCEPTION 'BLiNG! hard cap reached';
    END IF;

    v_new_price := least(v_curve_ceil, 1 + v_curve_inc * floor(v_new_supply / 1e9));

    UPDATE public.bling_system_state
        SET total_supply = v_new_supply,
            mint_price   = v_new_price
        WHERE id = 1;

    UPDATE public.bees SET bling_balance = bling_balance + p_amount WHERE id = p_bee_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, memo)
        VALUES (p_bee_id, 'minted', p_amount,
                format('Minted %s BLiNG! @ %s ⬡ · supply: %s',
                       p_amount, v_state.mint_price, v_new_supply));

    RETURN jsonb_build_object(
        'success', true,
        'new_supply', v_new_supply,
        'new_mint_price', v_new_price
    );
END;
$$;

-- ── bling_fill_order: atomic fill (sell_fee_pct from system_state) ─────
-- Order book denomination follows FreedomBLiNGs server.js: BLiNG! priced
-- in BLiNG! (a sell at price 0.95 means: trade 100 BLiNG! to anyone who
-- pays 95 BLiNG!). Only economic for prices ≠ 1.000 — preserved as-is.
CREATE OR REPLACE FUNCTION public.bling_fill_order(
    p_taker_id uuid,
    p_order_id bigint,
    p_fill_amt numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order         public.bling_orders%ROWTYPE;
    v_maker_bee_id  text;
    v_taker_bee_id  text;
    v_remaining     numeric;
    v_cost          numeric;
    v_sell_fee_pct  numeric;
    v_fee           numeric;
    v_net_to_seller numeric;
BEGIN
    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.status <> 'open' THEN
        RAISE EXCEPTION 'Order not open';
    END IF;

    v_remaining := v_order.amount - v_order.filled;
    IF p_fill_amt > v_remaining OR p_fill_amt < 0.001 THEN
        RAISE EXCEPTION 'Bad fill amount';
    END IF;

    SELECT bee_id INTO v_maker_bee_id FROM public.bees WHERE id = v_order.bee_id FOR UPDATE;
    SELECT bee_id INTO v_taker_bee_id FROM public.bees WHERE id = p_taker_id     FOR UPDATE;

    SELECT sell_fee_pct INTO v_sell_fee_pct FROM public.bling_system_state WHERE id = 1;

    v_cost          := p_fill_amt * v_order.price;
    v_fee           := v_cost * v_sell_fee_pct;
    v_net_to_seller := v_cost - v_fee;

    IF v_order.side = 'sell' THEN
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = p_taker_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = v_order.bee_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (p_taker_id,     'bought', p_fill_amt,      v_maker_bee_id, p_order_id),
                   (v_order.bee_id, 'sold',   v_net_to_seller, v_taker_bee_id, p_order_id);
    ELSE
        UPDATE public.bees SET bling_balance = bling_balance - v_cost + p_fill_amt
            WHERE id = v_order.bee_id;
        UPDATE public.bees SET bling_balance = bling_balance + v_net_to_seller - p_fill_amt
            WHERE id = p_taker_id;
        INSERT INTO public.bling_transactions (bee_id, type, amount, counterparty, ref_order_id)
            VALUES (v_order.bee_id, 'bought', p_fill_amt,      v_taker_bee_id, p_order_id),
                   (p_taker_id,     'sold',   v_net_to_seller, v_maker_bee_id, p_order_id);
    END IF;

    UPDATE public.bling_orders
        SET filled = filled + p_fill_amt,
            status = CASE WHEN filled + p_fill_amt >= amount THEN 'filled' ELSE 'open' END
        WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'filled',  p_fill_amt,
        'fee',     v_fee
    );
END;
$$;

-- ── bling_place_order: write order row (no fill — Edge Function matches) ──
-- NOTE: Inherited from server.js: does NOT pre-debit/lock balance on place.
-- v9 hardening: add locked_balance column + pre-debit / refund-on-cancel.
CREATE OR REPLACE FUNCTION public.bling_place_order(
    p_bee_id uuid,
    p_side   text,
    p_price  numeric,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance numeric;
    v_id      bigint;
BEGIN
    IF p_side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'Invalid side'; END IF;
    IF p_price <= 0 OR p_amount < 0.001 THEN RAISE EXCEPTION 'Bad price/amount'; END IF;

    SELECT bling_balance INTO v_balance FROM public.bees WHERE id = p_bee_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Bee not found'; END IF;
    IF p_side = 'sell' AND v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance to place sell';
    END IF;
    IF p_side = 'buy' AND v_balance < (p_price * p_amount) THEN
        RAISE EXCEPTION 'Insufficient balance to place buy';
    END IF;

    INSERT INTO public.bling_orders (bee_id, side, price, amount)
        VALUES (p_bee_id, p_side, p_price, p_amount)
        RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'order_id', v_id);
END;
$$;

-- ── bling_credit_purchase: Stripe webhook entry point ──────────────────
-- Fills as much as possible from existing sell orders ≤ mint_price,
-- mints the rest from the bonding curve. Atomic.
CREATE OR REPLACE FUNCTION public.bling_credit_purchase(
    p_bee_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mint_price numeric;
    v_remaining  numeric := p_amount;
    v_filled     numeric := 0;
    v_fill_amt   numeric;
    v_order      record;
BEGIN
    SELECT mint_price INTO v_mint_price
        FROM public.bling_system_state WHERE id = 1 FOR UPDATE;

    FOR v_order IN
        SELECT id, amount, filled
        FROM public.bling_orders
        WHERE side = 'sell' AND status = 'open' AND price <= v_mint_price
        ORDER BY price ASC, created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining <= 0;
        v_fill_amt := least(v_remaining, v_order.amount - v_order.filled);
        PERFORM public.bling_fill_order(p_bee_id, v_order.id, v_fill_amt);
        v_filled    := v_filled    + v_fill_amt;
        v_remaining := v_remaining - v_fill_amt;
    END LOOP;

    -- Mint the rest. If mint_active=false this raises and the whole tx rolls back,
    -- which is correct: Stripe webhook returns 5xx, Stripe retries, idempotency
    -- table prevents double-credit, and the operator can flip mint_active back on.
    IF v_remaining > 0 THEN
        PERFORM public.bling_mint(p_bee_id, v_remaining);
        v_filled := v_filled + v_remaining;
    END IF;

    RETURN jsonb_build_object('success', true, 'filled', v_filled);
END;
$$;

-- ── Escrow RPCs ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bling_create_escrow(
    p_creator_id   uuid,
    p_recipient_id uuid,
    p_amount       numeric,
    p_kind         text DEFAULT 'manual',
    p_memo         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance   numeric;
    v_escrow_id bigint;
BEGIN
    IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
    IF p_creator_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot escrow to yourself';
    END IF;

    SELECT bling_balance INTO v_balance FROM public.bees WHERE id = p_creator_id FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Creator not found'; END IF;
    IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    PERFORM 1 FROM public.bees WHERE id = p_recipient_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recipient not found'; END IF;

    UPDATE public.bees SET bling_balance = bling_balance - p_amount WHERE id = p_creator_id;

    INSERT INTO public.bling_escrows (creator_id, recipient_id, amount, kind, memo)
        VALUES (p_creator_id, p_recipient_id, p_amount, p_kind, p_memo)
        RETURNING id INTO v_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (p_creator_id, 'escrow_created', p_amount, v_escrow_id, p_memo);

    RETURN jsonb_build_object('success', true, 'escrow_id', v_escrow_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.bling_release_escrow(
    p_escrow_id bigint,
    p_actor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF v_escrow.creator_id <> p_actor_id THEN
        RAISE EXCEPTION 'Only creator can release';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
        WHERE id = v_escrow.recipient_id;

    UPDATE public.bling_escrows
        SET status = 'released', resolved_at = now()
        WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (v_escrow.recipient_id, 'escrow_released',
                v_escrow.amount, p_escrow_id, v_escrow.memo);

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.bling_cancel_escrow(
    p_escrow_id bigint,
    p_actor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF v_escrow.creator_id <> p_actor_id THEN
        RAISE EXCEPTION 'Only creator can cancel';
    END IF;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
        WHERE id = v_escrow.creator_id;
    UPDATE public.bling_escrows
        SET status = 'cancelled', resolved_at = now()
        WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (v_escrow.creator_id, 'escrow_cancelled',
                v_escrow.amount, p_escrow_id, 'Escrow cancelled · BLiNG! refunded');

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.bling_dispute_escrow(
    p_escrow_id bigint,
    p_actor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_escrow public.bling_escrows%ROWTYPE;
BEGIN
    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'open' THEN
        RAISE EXCEPTION 'Escrow not open';
    END IF;
    IF p_actor_id NOT IN (v_escrow.creator_id, v_escrow.recipient_id) THEN
        RAISE EXCEPTION 'Only escrow parties can dispute';
    END IF;

    UPDATE public.bling_escrows SET status = 'disputed' WHERE id = p_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, ref_escrow_id, memo)
        VALUES (p_actor_id, 'escrow_disputed', v_escrow.amount, p_escrow_id, 'Escrow disputed');

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 11. ROW LEVEL SECURITY
-- Reads: appropriate per-table. Writes: NONE — service_role only (Edge Funcs).
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.bling_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_escrows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_system_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_stripe_events ENABLE ROW LEVEL SECURITY;

-- Transactions: only owner can read their own (privacy)
DROP POLICY IF EXISTS "bling_tx_owner_read" ON public.bling_transactions;
CREATE POLICY "bling_tx_owner_read" ON public.bling_transactions
    FOR SELECT USING (auth.uid() = bee_id);

-- Orders: public read (this IS the order book)
DROP POLICY IF EXISTS "bling_orders_public_read" ON public.bling_orders;
CREATE POLICY "bling_orders_public_read" ON public.bling_orders
    FOR SELECT USING (true);

-- Escrows: only creator or recipient can read
DROP POLICY IF EXISTS "bling_escrows_party_read" ON public.bling_escrows;
CREATE POLICY "bling_escrows_party_read" ON public.bling_escrows
    FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

-- System state: public read (mint price, total supply, fees, mint_active are public)
DROP POLICY IF EXISTS "bling_system_public_read" ON public.bling_system_state;
CREATE POLICY "bling_system_public_read" ON public.bling_system_state
    FOR SELECT USING (true);

-- Stripe events: NO public read. service_role only (no SELECT policy = deny all clients).
-- (No policies created → RLS denies everything except service_role bypass.)

-- No INSERT/UPDATE/DELETE policies anywhere → all writes via SECURITY DEFINER RPCs
-- called from Edge Functions using the service_role key (RLS-bypass).

COMMIT;

-- ───────────────────────────────────────────────────────────────────────
-- Sanity (run AFTER the migration to verify):
--
-- 1. Singleton system_state row with correct defaults:
--      SELECT * FROM public.bling_system_state;
--      -> id=1, mint_price=1.001, total_supply=0,
--         sell_fee_pct=0.0100, bee_to_bee_fee_pct=0.0010, mint_active=t
--
-- 2. Test bee + @combtreasury both present:
--      SELECT id, bee_id, bling_balance, bling_rank, action_count FROM public.bees ORDER BY bee_id;
--      -> 2 rows: combtreasury (id ends ...bee), and your test bee.
--         Both balance=0.000, rank=0.
--
-- 3. Treasury auth.users + bees rows linked:
--      SELECT u.id, u.email, b.bee_id, b.bling_balance
--      FROM auth.users u JOIN public.bees b ON b.id = u.id
--      WHERE u.id = '00000000-0000-0000-0000-000000000bee'::uuid;
--      -> 1 row: id ends ...bee, email=treasury@themanual.tech,
--         bee_id=combtreasury, bling_balance=0.000
--
-- 4. All 9 RPCs created:
--      SELECT proname FROM pg_proc WHERE proname LIKE 'bling_%' ORDER BY 1;
--      -> bling_cancel_escrow, bling_create_escrow, bling_credit_purchase,
--         bling_dispute_escrow, bling_fill_order, bling_mint, bling_place_order,
--         bling_release_escrow, bling_send
--
-- 5. compute_bling_rank thresholds:
--      SELECT compute_bling_rank(0), compute_bling_rank(100),
--             compute_bling_rank(500000000);
--      -> 0, 1, 32
--
-- 6. Idempotency table empty and ready:
--      SELECT count(*) FROM public.bling_stripe_events;  -> 0
-- ───────────────────────────────────────────────────────────────────────
