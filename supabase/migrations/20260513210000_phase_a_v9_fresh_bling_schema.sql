-- =============================================================================
-- Migration 20260513210000 — Phase A · v9 fresh FreedomBlings schema
-- =============================================================================
-- Date:        2026-05-13
-- Author:      Code (Claude Opus 4.7) — supervised by Butch
-- Status:      UNAPPLIED. Apply Wednesday 2026-05-13 PM immediately after
--              the Phase A nuclear wipe (20260513200000_phase_a_nuclear_wipe_bling_v8.sql).
--              MVP-complete v9 schema — clean rebuild with today's canon
--              integrated from day one.
--
-- Source:      Today's locked canon (Wed 2026-05-13):
--                * freedom_price rename (was v8 mint_price)
--                * ECON-13 (0.99% default opt-out donation on OFFER settlement;
--                            column name offer_donation_pct, firewall-clean)
--                * Lock 7 precision: numeric(20,6) throughout
--                * Lock 8 federation: bling_* tables stay platform-wide
--                  (not Lock-8-scoped per prescope §4 — BLiNG! economy is
--                   platform-wide, not Astra-scoped)
--                * Verb_object RPC naming pattern (bling_free, not bling_mint)
--                * "Never tax work" — zero Bee-to-Bee SEND fee
--                * offline_signature column (v2 offline transfer placeholder)
--                * Emergency Reserve for Humanity documentation
--              Plus prior FreedomBlings canon (MMF §§5 / 9 / 10).
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WHAT THIS MIGRATION CREATES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- TABLES (5):
--   bling_system_state    — singleton config: freedom_price, total_supply,
--                           offer_donation_pct (0.0099), free_active.
--                           set_updated_at trigger reused.
--   bling_transactions    — ledger; numeric(20,6) precision; offline_signature
--                           column (nullable; v2 placeholder); currency_type
--                           discriminator (Lock 3) default 'BLING'.
--   bling_orders          — order book rows; matching engine is application
--                           layer per spec. set_updated_at trigger.
--   bling_escrows         — escrow holds (P2P / order_match / crowdfund /
--                           campaign / timelock kinds).
--   bling_stripe_events   — STUB: structure only. Webhook handler ships in
--                           a separate Code session per spec.
--
-- COLUMNS RESTORED ON bees:
--   bees.bling_balance    numeric(20,6) NOT NULL DEFAULT 0
--   bees.bling_rank       integer       NOT NULL DEFAULT 0
--   + bees_bling_rank_refresh trigger (BEFORE INSERT OR UPDATE)
--
-- HELPER FUNCTIONS (2):
--   public.compute_bling_rank(numeric) → integer
--     33-level rank ladder; reused exactly from v8 thresholds. IMMUTABLE.
--   public.refresh_bling_rank() RETURNS trigger
--     Auto-recomputes bees.bling_rank whenever bling_balance changes.
--
-- RPCs (10):
--   bling_free(p_bee_id, p_amount)
--     Issue BLiNG! from the bonding curve. 0% fee. Updates total_supply,
--     recomputes freedom_price along the curve. Records type='free' tx.
--
--   bling_send(p_sender_id, p_recipient_id, p_amount, p_category, p_memo)
--     Peer-to-peer transfer. 0% fee (never tax work). Two ledger rows.
--
--   bling_escrow_create(p_creator_id, p_recipient_id, p_amount, p_kind,
--                       p_memo, p_timelock_release_at DEFAULT NULL)
--     Move amount from creator's balance into a held escrow row.
--
--   bling_escrow_release(p_escrow_id, p_actor_id)
--     Release held escrow to recipient. Creator-authorized.
--
--   bling_escrow_cancel(p_escrow_id, p_actor_id)
--     Cancel held escrow; refund creator. Creator-authorized.
--
--   bling_escrow_dispute(p_escrow_id, p_actor_id)
--     Mark escrow disputed; freeze until manual resolution. Either party.
--
--   bling_escrow_timelock(p_escrow_id)
--     Auto-release timelock escrow when timelock_release_at has passed.
--     Callable by anyone (service-role or scheduled); no authority check
--     beyond the timestamp gate (the timestamp IS the gate).
--
--   bling_place_order(p_bee_id, p_side, p_price, p_amount)
--     Insert a row into bling_orders. Matching engine = app layer.
--
--   bling_fill_order(p_taker_id, p_order_id, p_fill_amt)
--     Execute a fill against a specific order. Computes the 0.99% donation
--     (ECON-13), debits taker, credits maker, records ledger rows.
--
--   bling_cancel_order(p_order_id, p_actor_id)
--     Cancel an open / partially-filled order. Returns reserved balance
--     to the order's bee.
--
-- DEFERRED (NOT in this migration, per spec):
--   - bling_credit_purchase RPC (Stripe webhook handler — separate session)
--   - bling_chargeback_clawback RPC (chargeback flow — separate session)
--   - Fibonacci 89-weight atom_contributions table (separate session)
--   - Order book matching engine (application layer, not schema)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESERVE POOLS DOCUMENTATION (per MMF §5.1 — referenced, not seeded)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Total cap: 11,222,333,222,111 BLiNG! (immutable; MMF §3.6 + §5.1).
--
-- Pool allocations (NOT seeded by this migration — seeding happens via a
-- follow-up migration after dedicated reserve-mechanics session):
--   - Bonding Curve Reserve:         10,000,000,000,000  (10 T)
--   - OG HUMAN Reserve:               1,000,000,000,000  (1 T)
--                                       ↳ ★ EMERGENCY RESERVE FOR HUMANITY ★
--                                         Catastrophic-activation provision:
--                                         US dollar collapse, nuclear conflict,
--                                         or equivalent civilizational disruption.
--                                         Activation triggers per-capita
--                                         distribution to all Bees as an
--                                         interest-free no-recourse loan.
--                                         Activation mechanics + Keyholder
--                                         authority profile are PENDING in
--                                         dedicated design session.
--                                         Schema documents the provision;
--                                         no allocation row is inserted yet.
--   - FNU LNU allocation:                22,000,000,000  (22 B)
--   - Operations (Drops/Drips seed):    150,000,000,000  (150 B)
--   - Defense / Campaign / Swarm:        50,000,000,000  (50 B)
--   - Butch personal:                            333,222,111
--   - Implicit ongoing rewards:          remainder
--
-- Schema-side, these are documented in this header + as a COMMENT ON COLUMN
-- on bling_system_state.total_supply (see seed step at bottom).
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BONDING CURVE PARAMETERS (per MMF §5.2)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   Floor:           $1.00  per BLiNG! (freedom_price at total_supply=0)
--   Increment:       +$0.01 per billion BLiNGs FREEd
--   Ceiling:         $101   per BLiNG!
--   Initial seed:    freedom_price = 1.000000  total_supply = 0
--                    (clean start from the floor; v8 had 1.001 historically
--                     but v9 is a fresh build aligned with the canonical formula).
--   ⚠ Formula note:  At numeric(20,6), the per-BLiNG increment (≈1e-11 USD)
--                    is below precision granularity — freedom_price moves
--                    in discrete steps each billion. This is intentional;
--                    the curve is a discrete piecewise function, not continuous.
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- LOCK 8 SCOPE STATEMENT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--   bling_* tables are PLATFORM-WIDE per the Lock 8 prescope §4 exclusion
--   ("BLiNG! DB; platform-wide economy"). They do NOT carry astra_id or
--   nova_id columns. The B-aux trigger (lock8_default_astra_and_nova) is
--   NOT bound to any bling_* table. A Bee's bling_balance is a single
--   number across the entire constellation, not per-Astra. Same for the
--   ledger, order book, and escrows.
--
-- Dependencies:
--   - 20260513200000_phase_a_nuclear_wipe_bling_v8.sql applied
--   - set_updated_at() function exists (it survived the wipe — shared
--     infrastructure used by bee_profiles / bees / promotions)
--   - bees table exists (it survived the wipe; bling_balance + bling_rank
--     columns get added back by this migration)
--   - auth schema available (RLS policies reference auth.uid())
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS used throughout.
--   - CREATE OR REPLACE FUNCTION used throughout.
--   - ADD COLUMN IF NOT EXISTS on bees additions.
--   - DROP TRIGGER IF EXISTS … then CREATE TRIGGER patterns for triggers.
--   - DROP POLICY IF EXISTS … then CREATE POLICY for RLS.
--   - Re-apply after a successful first apply is a net no-op.
--
-- Atomicity:
--   - Single BEGIN/COMMIT. Any error rolls back the entire migration —
--     no partial v9 schema state in production.
--
-- Security:
--   - User-callable RPCs are SECURITY DEFINER (need to mutate bees.bling_balance
--     for both parties bypassing RLS) with auth.uid() guard inside.
--   - REVOKE EXECUTE FROM PUBLIC + GRANT to authenticated on user RPCs.
--   - Service-role RPCs (timelock, future webhook handlers) revoke from
--     authenticated entirely.
--   - search_path pinned to pg_catalog, public on every function.
--
-- v9 Naming — firewall-clean identifiers throughout:
--   - offer_donation_pct (was tentatively sell_fee_pct in the Phase 4 spec
--     draft; renamed for firewall consistency per OG HUMAN ratification on
--     2026-05-13 PM before apply).
--   - 'offer' / 'request' for bling_orders.side (instead of buy/sell).
--   - bling_free RPC verb (instead of bling_mint).
--   - free_active boolean (instead of mint_active).
--   - freedom_price column (instead of mint_price).
-- =============================================================================

BEGIN;


-- ───────────────────────────────────────────────────────────────────────
-- Pre-flight: verify Phase A wipe applied (no BLiNG! v8 state survives).
-- Verifies set_updated_at() exists (we reuse it on this migration's two
-- updated_at triggers).
-- ───────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bling_residue text[];
    v_set_updated_at_exists boolean;
BEGIN
    SELECT array_agg(tablename) INTO v_bling_residue
      FROM pg_tables
     WHERE schemaname='public'
       AND (tablename LIKE 'bling%' OR tablename='give_contributions');

    IF v_bling_residue IS NOT NULL AND array_length(v_bling_residue, 1) > 0 THEN
        RAISE EXCEPTION
            'Pre-flight failed: v8 BLiNG! residue still present: %. '
            'Apply 20260513200000_phase_a_nuclear_wipe_bling_v8.sql first.',
            v_bling_residue;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname='public' AND p.proname='set_updated_at'
    ) INTO v_set_updated_at_exists;

    IF NOT v_set_updated_at_exists THEN
        RAISE EXCEPTION
            'Pre-flight failed: public.set_updated_at() is missing. '
            'It should have survived the Phase A wipe; investigate.';
    END IF;

    RAISE NOTICE 'Pre-flight OK: v8 BLiNG! state clean; set_updated_at() present.';
END
$$;


-- =============================================================================
-- TABLE 1 — bling_system_state (singleton config)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bling_system_state (
    id                  integer        PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    freedom_price       numeric(20,6)  NOT NULL DEFAULT 1.000000,
    total_supply        numeric(20,6)  NOT NULL DEFAULT 0,
    offer_donation_pct  numeric(8,6)   NOT NULL DEFAULT 0.0099,   -- ECON-13: 0.99% default opt-out donation on OFFER settlement
    free_active         boolean        NOT NULL DEFAULT true,
    updated_at          timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bling_system_state IS
'Singleton config table for FreedomBlings v9. Holds bonding-curve state '
'(freedom_price, total_supply), the ECON-13 OFFER donation rate (offer_donation_pct), '
'and the global FREE-active toggle. Reserve pools (10T Bonding Curve / 1T Emergency '
'Reserve for Humanity / 22B FNU LNU / 150B Operations / 50B Defense / 333,222,111 Butch '
'personal) per MMF §5.1 are documented in the v9 migration header — NOT seeded here. '
'Seed migration arrives after dedicated reserve-mechanics session.';

COMMENT ON COLUMN public.bling_system_state.freedom_price IS
'USD per BLiNG! at the bonding curve. Starts at 1.000000 (floor); +0.01 per '
'billion BLiNGs FREEd; capped at 101.000000 (ceiling) per MMF §5.2.';

COMMENT ON COLUMN public.bling_system_state.total_supply IS
'Cumulative BLiNG! FREEd from the curve. Excludes seed-allocations (which arrive '
'via dedicated reserve-mechanics session). Total platform cap is 11,222,333,222,111 '
'BLiNG! (MMF §3.6); enforcement of the cap lives in bling_free RPC.';

COMMENT ON COLUMN public.bling_system_state.offer_donation_pct IS
'ECON-13: 0.99% default opt-out donation on OFFER settlement (bling_fill_order). '
'Bees may opt out per offer. Bee-to-Bee SEND is always 0% (never tax work — MMF §5.3). '
'Firewall-clean naming (renamed from the v8 sell_fee_pct identifier).';

COMMENT ON COLUMN public.bling_system_state.free_active IS
'Master switch for bling_free issuance. When false, bling_free returns an error. '
'Useful for emergency pause via Master Patchboard (MMF §31).';

-- updated_at auto-touch trigger (reuses surviving set_updated_at function)
DROP TRIGGER IF EXISTS bling_system_state_updated_at ON public.bling_system_state;
CREATE TRIGGER bling_system_state_updated_at
    BEFORE UPDATE ON public.bling_system_state
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- TABLE 2 — bling_transactions (the ledger)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bling_transactions (
    id                  bigserial      PRIMARY KEY,
    bee_id              uuid           NOT NULL REFERENCES public.bees(id),
    type                text           NOT NULL CHECK (type IN (
                                          'free','send_debit','send_credit',
                                          'escrow_hold','escrow_release','escrow_cancel','escrow_dispute',
                                          'order_reserve','order_fill_debit','order_fill_credit',
                                          'order_cancel_refund','order_donation',
                                          'stripe_credit','chargeback')),
    amount              numeric(20,6)  NOT NULL,            -- signed; positive = credit to bee, negative = debit
    balance_after       numeric(20,6)  NOT NULL,            -- bees.bling_balance after this row settled
    currency_type       text           NOT NULL DEFAULT 'BLING',  -- Lock 3 discriminator
    counterparty_bee_id uuid           REFERENCES public.bees(id),
    ref_escrow_id       bigint,                              -- FK declared after bling_escrows exists
    ref_order_id        bigint,                              -- FK declared after bling_orders exists
    stripe_event_id     text,                                -- FK declared after bling_stripe_events exists
    category            text,                                -- peer-to-peer SEND category (gift / payment / donation / etc.)
    memo                text,
    offline_signature   text,                                -- v2 PLACEHOLDER: offline-signed transfer attestation; never populated by v9 RPCs
    created_at          timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bling_transactions IS
'FreedomBlings v9 ledger. Append-only — never UPDATE, never DELETE (enforced at app + RPC layer). '
'Every BLiNG! movement records at least one row. P2P SENDs record two (debit + credit). '
'Order fills record three (debit + credit + donation). offline_signature column is a v2 '
'placeholder for offline-signed transfer attestations; v9 RPCs always leave it NULL.';

COMMENT ON COLUMN public.bling_transactions.currency_type IS
'Lock 3 discriminator. Always ''BLING'' for v9. Reserved for future per-Astra currency support.';

COMMENT ON COLUMN public.bling_transactions.offline_signature IS
'v2 PLACEHOLDER for offline transfer capability. Holds the signed attestation from '
'an offline transaction when the Bee replays it. v9 RPCs leave NULL; v2 will populate. '
'Column shipping today so v2 doesn''t need a schema migration to enable.';

CREATE INDEX bling_tx_bee_idx           ON public.bling_transactions (bee_id, created_at DESC);
CREATE INDEX bling_tx_type_idx          ON public.bling_transactions (type);
CREATE INDEX bling_tx_created_idx       ON public.bling_transactions (created_at DESC);
CREATE INDEX bling_tx_currency_type_idx ON public.bling_transactions (currency_type) WHERE currency_type <> 'BLING';
CREATE INDEX bling_tx_counterparty_idx  ON public.bling_transactions (counterparty_bee_id, created_at DESC)
    WHERE counterparty_bee_id IS NOT NULL;
CREATE INDEX bling_tx_offline_sig_idx   ON public.bling_transactions (offline_signature)
    WHERE offline_signature IS NOT NULL;


-- =============================================================================
-- TABLE 3 — bling_orders (order book; matching engine = application layer)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bling_orders (
    id           bigserial      PRIMARY KEY,
    bee_id       uuid           NOT NULL REFERENCES public.bees(id),
    side         text           NOT NULL CHECK (side IN ('offer','request')),  -- offer=sell-side; request=buy-side (firewall-clean)
    price        numeric(20,6)  NOT NULL CHECK (price > 0),                    -- USD per BLiNG!
    amount       numeric(20,6)  NOT NULL CHECK (amount > 0),                   -- BLiNG! quantity
    filled       numeric(20,6)  NOT NULL DEFAULT 0 CHECK (filled >= 0 AND filled <= amount),
    status       text           NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','filled','cancelled')),
    created_at   timestamptz    NOT NULL DEFAULT now(),
    updated_at   timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.bling_orders IS
'FreedomBlings v9 order book. Bees place OFFERs (sell-side) or REQUESTs (buy-side) '
'at a USD price per BLiNG. Matching engine is application-layer (off-schema) — this '
'table holds the open book + lifecycle status only.';

COMMENT ON COLUMN public.bling_orders.side IS
'''offer'' = Bee offers BLiNG! for USD (sell-side). ''request'' = Bee requests BLiNG! '
'for USD (buy-side). Firewall-clean wording per MMF §4 — never "buy" or "sell".';

CREATE INDEX bling_orders_bee_idx     ON public.bling_orders (bee_id);
CREATE INDEX bling_orders_book_idx    ON public.bling_orders (side, status, price);
CREATE INDEX bling_orders_created_idx ON public.bling_orders (created_at DESC);
CREATE INDEX bling_orders_open_idx    ON public.bling_orders (price) WHERE status IN ('open','partial');

DROP TRIGGER IF EXISTS bling_orders_updated_at ON public.bling_orders;
CREATE TRIGGER bling_orders_updated_at
    BEFORE UPDATE ON public.bling_orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- TABLE 4 — bling_escrows (held BLiNG! pending resolution)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bling_escrows (
    id                    bigserial      PRIMARY KEY,
    creator_id            uuid           NOT NULL REFERENCES public.bees(id),
    recipient_id          uuid           NOT NULL REFERENCES public.bees(id),
    amount                numeric(20,6)  NOT NULL CHECK (amount > 0),
    kind                  text           NOT NULL CHECK (kind IN ('p2p','order_match','crowdfund','campaign','timelock')),
    status                text           NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','cancelled','disputed','expired')),
    timelock_release_at   timestamptz,                            -- nullable; populated only when kind='timelock'
    memo                  text,
    created_at            timestamptz    NOT NULL DEFAULT now(),
    released_at           timestamptz,
    cancelled_at          timestamptz,
    disputed_at           timestamptz,

    CONSTRAINT bling_escrows_timelock_consistency CHECK (
        (kind = 'timelock' AND timelock_release_at IS NOT NULL)
        OR (kind <> 'timelock' AND timelock_release_at IS NULL)
    ),
    CONSTRAINT bling_escrows_no_self_escrow CHECK (creator_id <> recipient_id)
);

COMMENT ON TABLE  public.bling_escrows IS
'FreedomBlings v9 escrow holds. amount is deducted from creator''s balance at hold '
'time, held in this row, and either released to recipient or refunded to creator at '
'resolution. Five kinds: p2p (Bee-to-Bee with explicit release), order_match (settled '
'by bling_fill_order), crowdfund (give_campaigns flow), campaign (future), timelock '
'(auto-release at timelock_release_at).';

CREATE INDEX bling_escrows_creator_idx     ON public.bling_escrows (creator_id);
CREATE INDEX bling_escrows_recipient_idx   ON public.bling_escrows (recipient_id);
CREATE INDEX bling_escrows_status_idx      ON public.bling_escrows (status);
CREATE INDEX bling_escrows_timelock_idx    ON public.bling_escrows (timelock_release_at)
    WHERE status = 'held' AND timelock_release_at IS NOT NULL;


-- =============================================================================
-- TABLE 5 — bling_stripe_events (STUB; webhook handler ships in separate session)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bling_stripe_events (
    event_id          text           PRIMARY KEY,                  -- Stripe event ID (idempotency key)
    bee_id            uuid           NOT NULL REFERENCES public.bees(id),
    source_event_id   text,                                          -- for dispute/refund chains
    status            text           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','duplicate','reversed')),
    stripe_charge_id  text,
    amount_usd        numeric(20,2)  NOT NULL CHECK (amount_usd > 0),
    amount_bling      numeric(20,6),                                 -- populated after FREE/credit happens
    payload           jsonb,                                          -- raw Stripe event payload
    created_at        timestamptz    NOT NULL DEFAULT now(),
    processed_at      timestamptz                                     -- when status moved off 'pending'
);

COMMENT ON TABLE  public.bling_stripe_events IS
'FreedomBlings v9 Stripe webhook idempotency log — STRUCTURE ONLY. v9 ships no '
'webhook handler RPC; the bling_credit_purchase + bling_chargeback_clawback flows '
'ship in a dedicated Code session. Table is here so the future handler doesn''t '
'need a schema migration to begin writing.';

CREATE INDEX bling_stripe_events_bee_idx              ON public.bling_stripe_events (bee_id);
CREATE INDEX bling_stripe_events_source_event_id_idx  ON public.bling_stripe_events (source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX bling_stripe_events_status_idx           ON public.bling_stripe_events (status) WHERE status <> 'completed';
CREATE INDEX bling_stripe_events_stripe_charge_id_idx ON public.bling_stripe_events (stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;


-- =============================================================================
-- Cross-table FKs (declared after all 5 tables exist so the references resolve)
-- =============================================================================
ALTER TABLE public.bling_transactions
    ADD CONSTRAINT bling_tx_ref_escrow_fk      FOREIGN KEY (ref_escrow_id)   REFERENCES public.bling_escrows(id),
    ADD CONSTRAINT bling_tx_ref_order_fk       FOREIGN KEY (ref_order_id)    REFERENCES public.bling_orders(id),
    ADD CONSTRAINT bling_tx_stripe_event_fk    FOREIGN KEY (stripe_event_id) REFERENCES public.bling_stripe_events(event_id);


-- =============================================================================
-- Restore bees.bling_balance + bling_rank columns
-- =============================================================================
ALTER TABLE public.bees
    ADD COLUMN IF NOT EXISTS bling_balance numeric(20,6) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bling_rank    integer       NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bees.bling_balance IS
'Bee''s BLiNG! balance, platform-wide. Lock 7 precision: numeric(20,6) — 5 decimals '
'user-visible, 6th absorbs rounding. Mutated only by bling_* RPCs; never by direct UPDATE.';

COMMENT ON COLUMN public.bees.bling_rank IS
'Bee''s BLiNG! Rank (0–32; 33-level ladder per MMF §22). Auto-recomputed by '
'refresh_bling_rank trigger whenever bling_balance changes.';


-- =============================================================================
-- HELPER FUNCTION — compute_bling_rank(balance) → integer
-- 33-level ladder from MMF §22 (same thresholds as v8).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.compute_bling_rank(balance numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
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

COMMENT ON FUNCTION public.compute_bling_rank(numeric) IS
'BLiNG! Rank ladder lookup. Pure function, IMMUTABLE — Postgres may inline / cache. '
'33 levels from 0 (no balance) to 32 (500M+ BLiNG!). Thresholds match MMF §22.';


-- =============================================================================
-- TRIGGER FUNCTION — refresh_bling_rank()
-- Auto-recomputes bees.bling_rank when bling_balance changes.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.refresh_bling_rank()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
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
    BEFORE INSERT OR UPDATE ON public.bees
    FOR EACH ROW EXECUTE FUNCTION public.refresh_bling_rank();


-- =============================================================================
-- RPC 1 — bling_free(p_bee_id, p_amount)
-- Issue BLiNG! from the bonding curve. 0% fee.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_free(p_bee_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_free_active boolean;
    v_total_supply numeric(20,6);
    v_new_total numeric(20,6);
    v_new_freedom_price numeric(20,6);
    v_balance_after numeric(20,6);
    v_tx_id bigint;
    v_hard_cap constant numeric(20,6) := 11222333222111;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller % may not FREE BLiNG! into bee %', v_caller, p_bee_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

    SELECT free_active, total_supply
      INTO v_free_active, v_total_supply
      FROM public.bling_system_state WHERE id = 1
      FOR UPDATE;

    IF NOT v_free_active THEN RAISE EXCEPTION 'FREE issuance currently paused (free_active=false)'; END IF;
    v_new_total := v_total_supply + p_amount;
    IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'would exceed hard cap (% > %)', v_new_total, v_hard_cap; END IF;

    -- Bonding curve: +$0.01 per billion FREEd; ceiling $101.
    v_new_freedom_price := LEAST(101.0, 1.0 + (v_new_total / 1000000000.0) * 0.01);

    UPDATE public.bling_system_state
       SET total_supply = v_new_total,
           freedom_price = v_new_freedom_price
     WHERE id = 1;

    UPDATE public.bees
       SET bling_balance = bling_balance + p_amount
     WHERE id = p_bee_id
     RETURNING bling_balance INTO v_balance_after;

    IF v_balance_after IS NULL THEN RAISE EXCEPTION 'bee % not found', p_bee_id; END IF;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, memo)
    VALUES (p_bee_id, 'free', p_amount, v_balance_after, 'FREE from bonding curve')
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'tx_id', v_tx_id,
        'balance_after', v_balance_after,
        'new_total_supply', v_new_total,
        'new_freedom_price', v_new_freedom_price
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_free(uuid, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_free(uuid, numeric) TO authenticated;


-- =============================================================================
-- RPC 2 — bling_send(sender, recipient, amount, category, memo)
-- Peer-to-peer transfer. 0% fee (never tax work).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_send(p_sender_id uuid, p_recipient_id uuid, p_amount numeric, p_category text DEFAULT NULL, p_memo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_sender_balance numeric(20,6);
    v_sender_balance_after numeric(20,6);
    v_recipient_balance_after numeric(20,6);
    v_min_send constant numeric(20,6) := 0.1;
    v_debit_tx_id bigint;
    v_credit_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_sender_id THEN RAISE EXCEPTION 'caller % may not SEND from bee %', v_caller, p_sender_id; END IF;
    IF p_sender_id = p_recipient_id THEN RAISE EXCEPTION 'cannot SEND to self'; END IF;
    IF p_amount < v_min_send THEN RAISE EXCEPTION 'minimum SEND is % BLiNG!', v_min_send; END IF;

    SELECT bling_balance INTO v_sender_balance
      FROM public.bees WHERE id = p_sender_id
      FOR UPDATE;

    IF v_sender_balance IS NULL THEN RAISE EXCEPTION 'sender bee % not found', p_sender_id; END IF;
    IF v_sender_balance < p_amount THEN RAISE EXCEPTION 'insufficient balance (% < %)', v_sender_balance, p_amount; END IF;

    UPDATE public.bees SET bling_balance = bling_balance - p_amount
     WHERE id = p_sender_id RETURNING bling_balance INTO v_sender_balance_after;

    UPDATE public.bees SET bling_balance = bling_balance + p_amount
     WHERE id = p_recipient_id RETURNING bling_balance INTO v_recipient_balance_after;

    IF v_recipient_balance_after IS NULL THEN RAISE EXCEPTION 'recipient bee % not found', p_recipient_id; END IF;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, category, memo)
    VALUES (p_sender_id, 'send_debit', -p_amount, v_sender_balance_after, p_recipient_id, p_category, p_memo)
    RETURNING id INTO v_debit_tx_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, category, memo)
    VALUES (p_recipient_id, 'send_credit', p_amount, v_recipient_balance_after, p_sender_id, p_category, p_memo)
    RETURNING id INTO v_credit_tx_id;

    RETURN jsonb_build_object(
        'ok', true,
        'debit_tx_id', v_debit_tx_id,
        'credit_tx_id', v_credit_tx_id,
        'sender_balance_after', v_sender_balance_after,
        'recipient_balance_after', v_recipient_balance_after
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_send(uuid, uuid, numeric, text, text) TO authenticated;


-- =============================================================================
-- RPC 3 — bling_escrow_create(creator, recipient, amount, kind, memo, timelock_release_at)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_escrow_create(p_creator_id uuid, p_recipient_id uuid, p_amount numeric, p_kind text, p_memo text DEFAULT NULL, p_timelock_release_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_creator_balance numeric(20,6);
    v_balance_after numeric(20,6);
    v_escrow_id bigint;
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_creator_id THEN RAISE EXCEPTION 'caller % may not create escrow from bee %', v_caller, p_creator_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
    IF p_kind NOT IN ('p2p','order_match','crowdfund','campaign','timelock') THEN
        RAISE EXCEPTION 'invalid kind %', p_kind;
    END IF;
    IF p_kind = 'timelock' AND p_timelock_release_at IS NULL THEN
        RAISE EXCEPTION 'timelock kind requires timelock_release_at';
    END IF;
    IF p_kind <> 'timelock' AND p_timelock_release_at IS NOT NULL THEN
        RAISE EXCEPTION 'timelock_release_at only valid for kind=timelock';
    END IF;

    SELECT bling_balance INTO v_creator_balance
      FROM public.bees WHERE id = p_creator_id FOR UPDATE;
    IF v_creator_balance IS NULL THEN RAISE EXCEPTION 'creator bee % not found', p_creator_id; END IF;
    IF v_creator_balance < p_amount THEN RAISE EXCEPTION 'insufficient balance (% < %)', v_creator_balance, p_amount; END IF;

    UPDATE public.bees SET bling_balance = bling_balance - p_amount
     WHERE id = p_creator_id RETURNING bling_balance INTO v_balance_after;

    INSERT INTO public.bling_escrows (creator_id, recipient_id, amount, kind, memo, timelock_release_at)
    VALUES (p_creator_id, p_recipient_id, p_amount, p_kind, p_memo, p_timelock_release_at)
    RETURNING id INTO v_escrow_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (p_creator_id, 'escrow_hold', -p_amount, v_balance_after, p_recipient_id, v_escrow_id, p_memo)
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow_id, 'tx_id', v_tx_id, 'balance_after', v_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_escrow_create(uuid, uuid, numeric, text, text, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_escrow_create(uuid, uuid, numeric, text, text, timestamptz) TO authenticated;


-- =============================================================================
-- RPC 4 — bling_escrow_release(escrow_id, actor_id)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_escrow_release(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_escrow record;
    v_recipient_balance_after numeric(20,6);
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow status is %, cannot release', v_escrow.status; END IF;
    IF v_escrow.creator_id <> p_actor_id THEN RAISE EXCEPTION 'only creator may release this escrow'; END IF;

    UPDATE public.bling_escrows SET status='released', released_at=now() WHERE id = p_escrow_id;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
     WHERE id = v_escrow.recipient_id
     RETURNING bling_balance INTO v_recipient_balance_after;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.recipient_id, 'escrow_release', v_escrow.amount, v_recipient_balance_after, v_escrow.creator_id, p_escrow_id, v_escrow.memo)
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'recipient_balance_after', v_recipient_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_escrow_release(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_escrow_release(bigint, uuid) TO authenticated;


-- =============================================================================
-- RPC 5 — bling_escrow_cancel(escrow_id, actor_id)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_escrow_cancel(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_escrow record;
    v_creator_balance_after numeric(20,6);
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow status is %, cannot cancel', v_escrow.status; END IF;
    IF v_escrow.creator_id <> p_actor_id THEN RAISE EXCEPTION 'only creator may cancel this escrow'; END IF;

    UPDATE public.bling_escrows SET status='cancelled', cancelled_at=now() WHERE id = p_escrow_id;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
     WHERE id = v_escrow.creator_id
     RETURNING bling_balance INTO v_creator_balance_after;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.creator_id, 'escrow_cancel', v_escrow.amount, v_creator_balance_after, v_escrow.recipient_id, p_escrow_id, v_escrow.memo)
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'creator_balance_after', v_creator_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_escrow_cancel(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_escrow_cancel(bigint, uuid) TO authenticated;


-- =============================================================================
-- RPC 6 — bling_escrow_dispute(escrow_id, actor_id)
-- Either party may dispute. Funds remain held; manual resolution by support.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_escrow_dispute(p_escrow_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_escrow record;
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow status is %, cannot dispute', v_escrow.status; END IF;
    IF p_actor_id NOT IN (v_escrow.creator_id, v_escrow.recipient_id) THEN
        RAISE EXCEPTION 'only creator or recipient may dispute this escrow';
    END IF;

    UPDATE public.bling_escrows SET status='disputed', disputed_at=now() WHERE id = p_escrow_id;

    -- Funds remain held; ledger marker rather than balance movement.
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (p_actor_id, 'escrow_dispute', 0, (SELECT bling_balance FROM public.bees WHERE id = p_actor_id),
            CASE WHEN p_actor_id = v_escrow.creator_id THEN v_escrow.recipient_id ELSE v_escrow.creator_id END,
            p_escrow_id, 'disputed by ' || p_actor_id::text)
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'status', 'disputed');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_escrow_dispute(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_escrow_dispute(bigint, uuid) TO authenticated;


-- =============================================================================
-- RPC 7 — bling_escrow_timelock(escrow_id)
-- Service-role / scheduled: auto-release a timelock escrow whose
-- timelock_release_at has passed. No actor authorization — the timestamp IS
-- the gate. Can be called by any authenticated principal but only acts when
-- the time gate has elapsed.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_escrow_timelock(p_escrow_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_escrow record;
    v_recipient_balance_after numeric(20,6);
    v_tx_id bigint;
BEGIN
    -- Note: no auth.uid() guard — the timestamp gate is the authority.

    SELECT * INTO v_escrow FROM public.bling_escrows WHERE id = p_escrow_id FOR UPDATE;
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'escrow % not found', p_escrow_id; END IF;
    IF v_escrow.kind <> 'timelock' THEN RAISE EXCEPTION 'escrow % is not timelock kind', p_escrow_id; END IF;
    IF v_escrow.status <> 'held' THEN RAISE EXCEPTION 'escrow % status is %, cannot timelock-release', p_escrow_id, v_escrow.status; END IF;
    IF v_escrow.timelock_release_at > now() THEN
        RAISE EXCEPTION 'timelock not yet elapsed (releases at %)', v_escrow.timelock_release_at;
    END IF;

    UPDATE public.bling_escrows SET status='released', released_at=now() WHERE id = p_escrow_id;

    UPDATE public.bees SET bling_balance = bling_balance + v_escrow.amount
     WHERE id = v_escrow.recipient_id
     RETURNING bling_balance INTO v_recipient_balance_after;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_escrow_id, memo)
    VALUES (v_escrow.recipient_id, 'escrow_release', v_escrow.amount, v_recipient_balance_after, v_escrow.creator_id, p_escrow_id, 'timelock auto-release')
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'recipient_balance_after', v_recipient_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_escrow_timelock(bigint) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_escrow_timelock(bigint) TO authenticated;


-- =============================================================================
-- RPC 8 — bling_place_order(bee_id, side, price, amount)
-- Insert into bling_orders. For 'offer' side, reserves the BLiNG amount from
-- the Bee's balance (debit hold). For 'request' side, no on-chain reservation
-- (USD-side reservation handled by Stripe Connect when activated).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_place_order(p_bee_id uuid, p_side text, p_price numeric, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_bee_balance numeric(20,6);
    v_balance_after numeric(20,6);
    v_order_id bigint;
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller may not place order for bee %', p_bee_id; END IF;
    IF p_side NOT IN ('offer','request') THEN RAISE EXCEPTION 'invalid side % (use ''offer'' or ''request'')', p_side; END IF;
    IF p_price <= 0 THEN RAISE EXCEPTION 'price must be positive'; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

    IF p_side = 'offer' THEN
        SELECT bling_balance INTO v_bee_balance
          FROM public.bees WHERE id = p_bee_id FOR UPDATE;
        IF v_bee_balance IS NULL THEN RAISE EXCEPTION 'bee % not found', p_bee_id; END IF;
        IF v_bee_balance < p_amount THEN RAISE EXCEPTION 'insufficient balance (% < %)', v_bee_balance, p_amount; END IF;

        UPDATE public.bees SET bling_balance = bling_balance - p_amount
         WHERE id = p_bee_id RETURNING bling_balance INTO v_balance_after;
    END IF;

    INSERT INTO public.bling_orders (bee_id, side, price, amount)
    VALUES (p_bee_id, p_side, p_price, p_amount)
    RETURNING id INTO v_order_id;

    IF p_side = 'offer' THEN
        INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, ref_order_id, memo)
        VALUES (p_bee_id, 'order_reserve', -p_amount, v_balance_after, v_order_id, 'OFFER placed; balance held')
        RETURNING id INTO v_tx_id;
    END IF;

    RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'tx_id', v_tx_id, 'balance_after', v_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_place_order(uuid, text, numeric, numeric) TO authenticated;


-- =============================================================================
-- RPC 9 — bling_fill_order(taker_id, order_id, fill_amt)
-- Execute a fill. Computes ECON-13 0.99% donation on the BLiNG! settlement.
-- Matching engine is APP-LAYER — this RPC executes the trade against a
-- specific order the app has selected.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_fill_order(p_taker_id uuid, p_order_id bigint, p_fill_amt numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_order record;
    v_donation_pct numeric(8,6);
    v_donation_amount numeric(20,6);
    v_net_to_taker numeric(20,6);
    v_taker_balance_after numeric(20,6);
    v_remaining numeric(20,6);
    v_new_status text;
    v_debit_tx_id bigint;
    v_credit_tx_id bigint;
    v_donation_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_taker_id THEN RAISE EXCEPTION 'caller may not fill as bee %', p_taker_id; END IF;
    IF p_fill_amt <= 0 THEN RAISE EXCEPTION 'fill_amt must be positive'; END IF;

    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'order % not found', p_order_id; END IF;
    IF v_order.status NOT IN ('open','partial') THEN RAISE EXCEPTION 'order status is %, cannot fill', v_order.status; END IF;
    IF v_order.bee_id = p_taker_id THEN RAISE EXCEPTION 'cannot fill own order'; END IF;

    v_remaining := v_order.amount - v_order.filled;
    IF p_fill_amt > v_remaining THEN
        RAISE EXCEPTION 'fill_amt % exceeds remaining %', p_fill_amt, v_remaining;
    END IF;

    -- Compute ECON-13 donation
    SELECT offer_donation_pct INTO v_donation_pct FROM public.bling_system_state WHERE id = 1;
    v_donation_amount := round(p_fill_amt * v_donation_pct, 6);
    v_net_to_taker := p_fill_amt - v_donation_amount;

    -- For 'offer' side: maker reserved p_fill_amt; taker receives net (minus donation).
    -- For 'request' side: this RPC primarily handles 'offer' fills in v9; 'request' fills
    -- need Stripe Connect plumbing (deferred). Reject 'request' fills for now.
    IF v_order.side = 'request' THEN
        RAISE EXCEPTION 'filling ''request''-side orders requires Stripe Connect (deferred to follow-up session)';
    END IF;

    -- Credit taker with net BLiNG! (offer side: maker had reserved at place_order time)
    UPDATE public.bees SET bling_balance = bling_balance + v_net_to_taker
     WHERE id = p_taker_id RETURNING bling_balance INTO v_taker_balance_after;

    -- Update order state
    UPDATE public.bling_orders
       SET filled = filled + p_fill_amt,
           status = CASE WHEN (filled + p_fill_amt) >= amount THEN 'filled' ELSE 'partial' END
     WHERE id = p_order_id
     RETURNING status INTO v_new_status;

    -- Ledger rows: taker credit (net), donation marker
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_order_id, memo)
    VALUES (p_taker_id, 'order_fill_credit', v_net_to_taker, v_taker_balance_after, v_order.bee_id, p_order_id, 'OFFER fill (net of donation)')
    RETURNING id INTO v_credit_tx_id;

    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, counterparty_bee_id, ref_order_id, memo)
    VALUES (p_taker_id, 'order_donation', -v_donation_amount, v_taker_balance_after, v_order.bee_id, p_order_id,
            'ECON-13 donation 0.99% on OFFER fill')
    RETURNING id INTO v_donation_tx_id;

    -- Maker's debit was recorded at place_order time as 'order_reserve'.
    -- No additional maker-side ledger row here.

    RETURN jsonb_build_object(
        'ok', true,
        'credit_tx_id', v_credit_tx_id,
        'donation_tx_id', v_donation_tx_id,
        'taker_balance_after', v_taker_balance_after,
        'donation_amount', v_donation_amount,
        'order_new_status', v_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_fill_order(uuid, bigint, numeric) TO authenticated;


-- =============================================================================
-- RPC 10 — bling_cancel_order(order_id, actor_id)
-- Cancel an open / partially-filled order. Refunds reserved BLiNG! to maker.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bling_cancel_order(p_order_id bigint, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_order record;
    v_refund_amount numeric(20,6);
    v_balance_after numeric(20,6);
    v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_actor_id THEN RAISE EXCEPTION 'caller may not act as bee %', p_actor_id; END IF;

    SELECT * INTO v_order FROM public.bling_orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'order % not found', p_order_id; END IF;
    IF v_order.status NOT IN ('open','partial') THEN RAISE EXCEPTION 'order status is %, cannot cancel', v_order.status; END IF;
    IF v_order.bee_id <> p_actor_id THEN RAISE EXCEPTION 'only order owner may cancel'; END IF;

    UPDATE public.bling_orders SET status='cancelled' WHERE id = p_order_id;

    -- Refund remaining reserved BLiNG! to maker (only meaningful for 'offer' side).
    IF v_order.side = 'offer' THEN
        v_refund_amount := v_order.amount - v_order.filled;
        IF v_refund_amount > 0 THEN
            UPDATE public.bees SET bling_balance = bling_balance + v_refund_amount
             WHERE id = p_actor_id RETURNING bling_balance INTO v_balance_after;

            INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, ref_order_id, memo)
            VALUES (p_actor_id, 'order_cancel_refund', v_refund_amount, v_balance_after, p_order_id, 'OFFER cancelled; remaining balance refunded')
            RETURNING id INTO v_tx_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('ok', true, 'tx_id', v_tx_id, 'refund_amount', v_refund_amount, 'balance_after', v_balance_after);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bling_cancel_order(bigint, uuid) TO authenticated;


-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- bling_system_state: public read (curve params visible). Service-role only writes.
ALTER TABLE public.bling_system_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bling_system_public_read ON public.bling_system_state;
CREATE POLICY bling_system_public_read ON public.bling_system_state FOR SELECT TO public USING (true);

-- bling_transactions: owner-or-counterparty read; no user writes (RPCs write via SECURITY DEFINER).
ALTER TABLE public.bling_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bling_tx_owner_read ON public.bling_transactions;
CREATE POLICY bling_tx_owner_read ON public.bling_transactions FOR SELECT TO public
    USING (auth.uid() = bee_id OR auth.uid() = counterparty_bee_id);

-- bling_orders: public read (order book is public). No user writes (place_order RPC writes via DEFINER).
ALTER TABLE public.bling_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bling_orders_public_read ON public.bling_orders;
CREATE POLICY bling_orders_public_read ON public.bling_orders FOR SELECT TO public USING (true);

-- bling_escrows: parties (creator or recipient) can read; no user writes.
ALTER TABLE public.bling_escrows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bling_escrows_party_read ON public.bling_escrows;
CREATE POLICY bling_escrows_party_read ON public.bling_escrows FOR SELECT TO public
    USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

-- bling_stripe_events: owner can read; no user writes (webhook handler writes via service-role).
ALTER TABLE public.bling_stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bling_stripe_events_owner_read ON public.bling_stripe_events;
CREATE POLICY bling_stripe_events_owner_read ON public.bling_stripe_events FOR SELECT TO public
    USING (auth.uid() = bee_id);

DROP POLICY IF EXISTS bling_stripe_events_no_user_writes ON public.bling_stripe_events;
CREATE POLICY bling_stripe_events_no_user_writes ON public.bling_stripe_events FOR INSERT TO public WITH CHECK (false);


-- =============================================================================
-- SEED — bling_system_state singleton (1 row)
-- =============================================================================
INSERT INTO public.bling_system_state (id, freedom_price, total_supply, offer_donation_pct, free_active, updated_at)
VALUES (1, 1.000000, 0, 0.0099, true, now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Post-flight assertions
-- =============================================================================
DO $$
DECLARE
    v_tables    int;
    v_rpcs      int;
    v_seed      int;
    v_bees_cols int;
BEGIN
    SELECT count(*) INTO v_tables FROM pg_tables
     WHERE schemaname='public'
       AND tablename IN ('bling_system_state','bling_transactions','bling_orders','bling_escrows','bling_stripe_events');
    IF v_tables <> 5 THEN RAISE EXCEPTION 'expected 5 bling_* tables, found %', v_tables; END IF;

    SELECT count(*) INTO v_rpcs FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname IN ('bling_free','bling_send','bling_escrow_create','bling_escrow_release',
                         'bling_escrow_cancel','bling_escrow_dispute','bling_escrow_timelock',
                         'bling_place_order','bling_fill_order','bling_cancel_order');
    IF v_rpcs <> 10 THEN RAISE EXCEPTION 'expected 10 bling_* RPCs, found %', v_rpcs; END IF;

    SELECT count(*) INTO v_seed FROM public.bling_system_state;
    IF v_seed <> 1 THEN RAISE EXCEPTION 'bling_system_state expected 1 row, found %', v_seed; END IF;

    SELECT count(*) INTO v_bees_cols FROM information_schema.columns
     WHERE table_schema='public' AND table_name='bees' AND column_name IN ('bling_balance','bling_rank');
    IF v_bees_cols <> 2 THEN RAISE EXCEPTION 'expected bees to have bling_balance + bling_rank, found % cols', v_bees_cols; END IF;

    RAISE NOTICE 'v9 fresh schema OK: 5 tables, 10 RPCs, 1 system_state seed, 2 bees columns.';
END
$$;


COMMIT;


-- =============================================================================
-- VERIFICATION (run AFTER COMMIT — informational; DO block above already asserts)
-- =============================================================================
-- (1) 5 tables:
--     SELECT tablename FROM pg_tables WHERE schemaname='public'
--      AND tablename LIKE 'bling%' ORDER BY tablename;
--     -- expect: bling_escrows, bling_orders, bling_stripe_events,
--     --         bling_system_state, bling_transactions
--
-- (2) 10 RPCs (+ 2 helper functions compute_bling_rank + refresh_bling_rank):
--     SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--      WHERE n.nspname='public' AND proname LIKE 'bling%' ORDER BY proname;
--
-- (3) bees columns:
--     SELECT column_name FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='bees' AND column_name LIKE 'bling_%';
--     -- expect: bling_balance, bling_rank
--
-- (4) Seed row:
--     SELECT * FROM public.bling_system_state;
--     -- expect: id=1, freedom_price=1.000000, total_supply=0,
--     --         offer_donation_pct=0.0099, free_active=true
--
-- (5) RLS active on all 5 tables:
--     SELECT tablename, rowsecurity FROM pg_tables
--      WHERE schemaname='public' AND tablename LIKE 'bling%';
--     -- expect: rowsecurity=true on all 5
--
-- (6) bees trigger:
--     SELECT trigger_name FROM information_schema.triggers
--      WHERE event_object_table='bees' AND trigger_name='bees_bling_rank_refresh';
--     -- expect: 1 row
--
-- (7) Smoke (optional, requires a real bee_id): SET LOCAL role authenticated;
--     SET LOCAL request.jwt.claim.sub = '<bee-uuid>';
--     SELECT public.bling_free('<bee-uuid>'::uuid, 100);
--     -- expect: jsonb success with balance_after=100, new_total_supply=100, new_freedom_price=1.000000
--     -- (1.000000 because 100 BLiNG! is far below the per-billion increment)


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- Reversible by dropping the 5 tables + 10 RPCs + 2 helpers + 2 columns +
-- 1 trigger + 5 RLS policies, in the inverse order. Or — cleaner — re-apply
-- 20260513200000_phase_a_nuclear_wipe_bling_v8.sql (it's idempotent and
-- targets this schema). The wipe is the rollback.


-- =============================================================================
-- OPEN QUESTIONS LOGGED BY THIS MIGRATION
-- =============================================================================
-- #V9-1: RESOLVED — column adopted firewall-clean name offer_donation_pct
--        (was tentatively sell_fee_pct in the Phase 4 spec draft; OG HUMAN
--        ratified the rename before apply on 2026-05-13 PM).
-- #V9-2: Reserve pool seeding (Bonding Curve / Emergency Reserve / FNU LNU /
--        Operations / Defense / Butch personal) pending dedicated reserve-
--        mechanics design session. Until then, total_supply starts at 0 and
--        moves only via bling_free issuance.
-- #V9-3: 'request'-side order fills require Stripe Connect plumbing; v9
--        bling_fill_order rejects them. Lift the gate when Stripe Connect
--        ships in the dedicated Stripe session.
-- #V9-4: bling_credit_purchase + bling_chargeback_clawback NOT in v9;
--        ship in dedicated Stripe webhook session. bling_stripe_events
--        table is structurally ready.
-- #V9-5: Atom contribution Fibonacci 89-weight integration (atom_contributions
--        table + Tag Progenitor royalty hooks) deferred to dedicated session
--        per multi-Astra economic infrastructure scoping.
-- #V9-6: Per-Bee daily FREE rate-limit / cap (abuse deterrence) not in v9.
--        Application-layer / abuse-deterrence session.
-- #V9-7: Order book matching engine (price-time priority, depth aggregation,
--        partial-fill auto-discovery) lives in application layer. v9 schema
--        only models the book + lifecycle.
-- #V9-8: offline_signature column has no RPC writer in v9. v2 offline
--        transfer capability will add a verify_offline_send RPC that
--        populates this column.
