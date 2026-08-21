BEGIN;
-- ============================================================================
-- 20260820170500_depth_rails1_e1_money_engines
-- DEPTH E1 money engines: RAIL A (BLiNG) + RAIL B (USD, services-only) + config.
-- Authored propose-first by DEPTH_RAILS1; APPLIED under SQL_AUTONOMY v1 by DEPTH_RAILS2
-- (2026-08-20). ADDITIVE ONLY - built bling_* untouched (wrapped, never altered).
-- Combines verify-out/depth-rails/01_depth_rail_config + 02_depth_bling_rpcs +
-- 03_depth_usd_rpcs, byte-faithful. Rollback: verify-out/depth-rails/99_rollback.sql.
-- ============================================================================

-- ============================================================================
-- DEPTH RAILS E1 - 01 config: companion index + currency toggle + resolver
-- Pass DEPTH_RAILS1 | PROPOSE-FIRST, NOT APPLIED. Owner reviews + applies.
-- ADDITIVE ONLY. Touches no bling_* table, constraint, RPC, or trigger.
-- Idempotent (IF NOT EXISTS / CREATE OR REPLACE). ASCII only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- depth_rail_entries : the astra-facing "entry type" ledger index.
-- Money movement stays in the core (bling_transactions / bling_escrows / Stripe).
-- This row is the SEMANTIC record a D-mount reads, linked to the core tx ids.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.depth_rail_entries (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rail               text NOT NULL CHECK (rail IN ('bling','usd')),
    astra              text NOT NULL,
    kind               text NOT NULL CHECK (kind IN (
                          -- bling rail
                          'tip','bid','ticket','job_pay','pot_buyin','raffle_share',
                          'spot_fund','ad_spend','give','order_bling',
                          -- usd rail
                          'membership','trivia_venue','trivia_play','pod_order',
                          'print_order','crowdfund_usd','order_usd','payout',
                          'refund','clawback')),
    currency           text NOT NULL CHECK (currency IN ('BLING','USD')),
    payer_bee          uuid REFERENCES public.bees(id),
    payee_bee          uuid REFERENCES public.bees(id),
    amount             numeric(20,6),           -- BLiNG amount (rail=bling)
    amount_cents       bigint,                  -- USD cents   (rail=usd)
    fee_key            text,
    platform_cut       numeric(20,6),           -- BLiNG cut actually moved to treasury
    platform_cut_deferred numeric(20,6) NOT NULL DEFAULT 0,  -- sub-min cut not moved
    object_type        text,
    object_ref         uuid,
    bling_debit_tx_id  bigint,                  -- soft link -> bling_transactions.id
    bling_credit_tx_id bigint,
    escrow_id          bigint,                  -- soft link -> bling_escrows.id
    stripe_payment_ref text,
    stripe_event_id    text,
    status             text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','settled','released',
                                           'refunded','disputed','cancelled')),
    idempotency_key    text NOT NULL,
    result_json        jsonb,                   -- stored RPC result for replay (W-8)
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT depth_rail_entries_rail_currency CHECK (
        (rail='bling' AND currency='BLING') OR (rail='usd' AND currency='USD')),
    CONSTRAINT depth_rail_entries_idem_uniq UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS depth_rail_entries_payer_idx ON public.depth_rail_entries(payer_bee, created_at DESC);
CREATE INDEX IF NOT EXISTS depth_rail_entries_payee_idx ON public.depth_rail_entries(payee_bee, created_at DESC);
CREATE INDEX IF NOT EXISTS depth_rail_entries_astra_idx ON public.depth_rail_entries(astra, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS depth_rail_entries_object_idx ON public.depth_rail_entries(object_type, object_ref);

ALTER TABLE public.depth_rail_entries ENABLE ROW LEVEL SECURITY;
-- Reads: a bee sees entries it paid or was paid. Writes: SECDEF RPCs only (owner-run,
-- bypass RLS); there is deliberately NO insert/update policy for anon/authenticated.
DROP POLICY IF EXISTS depth_rail_entries_read_own ON public.depth_rail_entries;
CREATE POLICY depth_rail_entries_read_own ON public.depth_rail_entries
    FOR SELECT USING (payer_bee = auth.uid() OR payee_bee = auth.uid());

-- ---------------------------------------------------------------------------
-- depth_rail_toggle : currency switch (DEPTH_SLATE v1.3), Master->Astra->Bee
-- cascade, mirroring the fee_schedule shape. NULL astra_ref/bee_ref = master default.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.depth_rail_toggle (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    context     text NOT NULL,                 -- 'trivia','raffle','bingo','arcade', or '*'
    astra_ref   text,
    bee_ref     uuid REFERENCES public.bees(id),
    rail        text NOT NULL CHECK (rail IN ('BLING','USD')),
    active      boolean NOT NULL DEFAULT true,
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS depth_rail_toggle_lookup_idx
    ON public.depth_rail_toggle(context, astra_ref, bee_ref) WHERE active;

ALTER TABLE public.depth_rail_toggle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS depth_rail_toggle_read_all ON public.depth_rail_toggle;
CREATE POLICY depth_rail_toggle_read_all ON public.depth_rail_toggle
    FOR SELECT USING (true);   -- config is world-readable; writes are admin/service only

-- ---------------------------------------------------------------------------
-- depth_rail_resolve : most-specific active toggle wins; else v1.3 default
-- (trivia -> USD, everything else -> BLING).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_rail_resolve(
    p_context text, p_astra text DEFAULT NULL, p_bee uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT t.rail FROM public.depth_rail_toggle t
      WHERE t.active AND t.context = p_context
        AND (t.astra_ref IS NULL OR t.astra_ref = p_astra)
        AND (t.bee_ref   IS NULL OR t.bee_ref   = p_bee)
      ORDER BY (CASE WHEN t.bee_ref   IS NOT NULL THEN 2 ELSE 0 END)
             + (CASE WHEN t.astra_ref IS NOT NULL THEN 1 ELSE 0 END) DESC
      LIMIT 1),
    CASE WHEN p_context = 'trivia' THEN 'USD' ELSE 'BLING' END);
$$;

REVOKE ALL ON FUNCTION public.depth_rail_resolve(text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.depth_rail_resolve(text,text,uuid) TO authenticated, service_role;

-- ============================================================================
-- DEPTH RAILS E1 - 02 BLiNG rail RPCs (RAIL A)
-- Pass DEPTH_RAILS1 | PROPOSE-FIRST, NOT APPLIED. Owner reviews + applies.
-- Wrap the EXISTING core (bling_send / bling_escrow_*) unchanged; caller is payer.
-- Fees via fee_resolve. Idempotent on p_idempotency_key. ASCII only.
-- Treasury bee (fee sink): 00000000-0000-0000-0000-000000000bee (combtreasury).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- depth_charge_bling : generic payer-initiated BLiNG charge (tip/bid/ticket/
-- job_pay/pot_buyin/raffle_share/spot_fund/ad_spend/give/order_bling).
-- Moves NET to payee and the platform CUT to treasury, both via core bling_send.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_charge_bling(
    p_payer_id        uuid,
    p_payee_id        uuid,
    p_amount          numeric,
    p_astra           text,
    p_kind            text,
    p_fee_key         text            DEFAULT NULL,
    p_object_type     text            DEFAULT NULL,
    p_object_ref      uuid            DEFAULT NULL,
    p_idempotency_key text            DEFAULT NULL,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
    v_caller   uuid := auth.uid();
    v_treasury constant uuid := '00000000-0000-0000-0000-000000000bee';
    v_min      constant numeric(20,6) := 0.1;
    v_fee      public.fee_schedule;
    v_cut      numeric(20,6) := 0;
    v_cut_moved numeric(20,6) := 0;
    v_cut_deferred numeric(20,6) := 0;
    v_net      numeric(20,6);
    v_send     jsonb;
    v_feesend  jsonb := NULL;
    v_entry_id uuid;
    v_existing public.depth_rail_entries;
BEGIN
    IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'idempotency_key required'; END IF;
    -- replay: return stored result, do not move money again (W-8)
    SELECT * INTO v_existing FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_existing.result_json; END IF;

    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_payer_id THEN RAISE EXCEPTION 'caller % may not act for bee %', v_caller, p_payer_id; END IF;
    IF p_amount < v_min THEN RAISE EXCEPTION 'minimum SEND is % BLiNG!', v_min; END IF;

    -- resolve platform cut (percent). BLiNG cut uses platform_pct only; USD-cent
    -- caps (min/max_fee_cents) are ignored on this rail (economy morning refines).
    IF p_fee_key IS NOT NULL THEN
        v_fee := public.fee_resolve(p_fee_key, p_astra, p_payer_id);
        IF v_fee.fee_key IS NOT NULL AND v_fee.platform_pct IS NOT NULL THEN
            v_cut := round(p_amount * v_fee.platform_pct / 100.0, 6);
        END IF;
    END IF;

    v_net := p_amount - v_cut;
    IF v_net < v_min THEN
        RAISE EXCEPTION 'net to payee % below minimum % after fee', v_net, v_min;
    END IF;

    -- 1) net to payee
    v_send := public.bling_send(p_payer_id, p_payee_id, v_net, p_astra||':'||p_kind, p_memo);

    -- 2) platform cut to treasury (only if >= core min send; sub-min cut is recorded, not moved)
    IF v_cut >= v_min THEN
        v_feesend := public.bling_send(p_payer_id, v_treasury, v_cut, 'fee:'||p_fee_key, p_memo);
        v_cut_moved := v_cut;
    ELSE
        v_cut_deferred := v_cut;
    END IF;

    INSERT INTO public.depth_rail_entries (
        rail, astra, kind, currency, payer_bee, payee_bee, amount, fee_key,
        platform_cut, platform_cut_deferred, object_type, object_ref,
        bling_debit_tx_id, bling_credit_tx_id, status, idempotency_key, metadata)
    VALUES (
        'bling', p_astra, p_kind, 'BLING', p_payer_id, p_payee_id, p_amount, p_fee_key,
        v_cut_moved, v_cut_deferred, p_object_type, p_object_ref,
        (v_send->>'debit_tx_id')::bigint, (v_send->>'credit_tx_id')::bigint,
        'settled', p_idempotency_key,
        jsonb_build_object('net', v_net, 'fee_send', v_feesend))
    RETURNING id INTO v_entry_id;

    UPDATE public.depth_rail_entries
       SET result_json = jsonb_build_object(
           'ok', true, 'entry_id', v_entry_id,
           'debit_tx_id', (v_send->>'debit_tx_id')::bigint,
           'credit_tx_id', (v_send->>'credit_tx_id')::bigint,
           'amount', p_amount, 'platform_cut', v_cut_moved,
           'platform_cut_deferred', v_cut_deferred, 'net_to_payee', v_net)
     WHERE id = v_entry_id
    RETURNING result_json INTO v_send;
    RETURN v_send;
END; $$;

-- ---------------------------------------------------------------------------
-- depth_escrow_open : payer-initiated BLiNG escrow (Pros job, Bazaar order, ...)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_escrow_open(
    p_payer_id        uuid,
    p_payee_id        uuid,
    p_amount          numeric,
    p_astra           text,
    p_kind            text,
    p_core_kind       text            DEFAULT 'p2p',   -- bling_escrows.kind CHECK set
    p_object_type     text            DEFAULT NULL,
    p_object_ref      uuid            DEFAULT NULL,
    p_idempotency_key text            DEFAULT NULL,
    p_timelock_release_at timestamptz DEFAULT NULL,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_esc    jsonb;
    v_escrow_id bigint;
    v_entry_id uuid;
    v_existing public.depth_rail_entries;
BEGIN
    IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'idempotency_key required'; END IF;
    SELECT * INTO v_existing FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_existing.result_json; END IF;

    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_payer_id THEN RAISE EXCEPTION 'caller % may not act for bee %', v_caller, p_payer_id; END IF;

    v_esc := public.bling_escrow_create(p_payer_id, p_payee_id, p_amount, p_core_kind, p_memo, p_timelock_release_at);
    v_escrow_id := (v_esc->>'escrow_id')::bigint;

    INSERT INTO public.depth_rail_entries (
        rail, astra, kind, currency, payer_bee, payee_bee, amount,
        object_type, object_ref, escrow_id, status, idempotency_key)
    VALUES ('bling', p_astra, p_kind, 'BLING', p_payer_id, p_payee_id, p_amount,
        p_object_type, p_object_ref, v_escrow_id, 'pending', p_idempotency_key)
    RETURNING id INTO v_entry_id;

    UPDATE public.depth_rail_entries
       SET result_json = jsonb_build_object('ok',true,'entry_id',v_entry_id,'escrow_id',v_escrow_id)
     WHERE id = v_entry_id RETURNING result_json INTO v_esc;
    RETURN v_esc;
END; $$;

-- ---------------------------------------------------------------------------
-- depth_escrow_release / cancel / dispute : thin wrappers keyed by entry id.
-- Actor must be the escrow creator (core enforces). Updates entry status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_escrow_release(p_entry_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries; v_r jsonb;
BEGIN
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth entry %', p_entry_id; END IF;
    IF v_e.escrow_id IS NULL THEN RAISE EXCEPTION 'entry % has no escrow', p_entry_id; END IF;
    v_r := public.bling_escrow_release(v_e.escrow_id, p_actor_id);
    UPDATE public.depth_rail_entries SET status='released', updated_at=now() WHERE id = p_entry_id;
    RETURN jsonb_build_object('ok',true,'escrow_id',v_e.escrow_id,'status','released','core',v_r);
END; $$;

CREATE OR REPLACE FUNCTION public.depth_escrow_cancel(p_entry_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries; v_r jsonb;
BEGIN
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth entry %', p_entry_id; END IF;
    IF v_e.escrow_id IS NULL THEN RAISE EXCEPTION 'entry % has no escrow', p_entry_id; END IF;
    v_r := public.bling_escrow_cancel(v_e.escrow_id, p_actor_id);
    UPDATE public.depth_rail_entries SET status='cancelled', updated_at=now() WHERE id = p_entry_id;
    RETURN jsonb_build_object('ok',true,'escrow_id',v_e.escrow_id,'status','cancelled','core',v_r);
END; $$;

CREATE OR REPLACE FUNCTION public.depth_escrow_dispute(p_entry_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries; v_r jsonb;
BEGIN
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth entry %', p_entry_id; END IF;
    IF v_e.escrow_id IS NULL THEN RAISE EXCEPTION 'entry % has no escrow', p_entry_id; END IF;
    v_r := public.bling_escrow_dispute(v_e.escrow_id, p_actor_id);
    UPDATE public.depth_rail_entries SET status='disputed', updated_at=now() WHERE id = p_entry_id;
    RETURN jsonb_build_object('ok',true,'escrow_id',v_e.escrow_id,'status','disputed','core',v_r);
END; $$;

-- ---------------------------------------------------------------------------
-- depth_wallet : read-only combined view (balance + open escrows + recent entries)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_wallet(p_bee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_caller uuid := auth.uid(); v_bal numeric(20,6); v_esc jsonb; v_ent jsonb;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller may not read wallet of bee %', p_bee_id; END IF;
    SELECT bling_balance INTO v_bal FROM public.bees WHERE id = p_bee_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'escrow_id', e.id, 'amount', e.amount, 'kind', e.kind,
             'role', CASE WHEN e.creator_id = p_bee_id THEN 'creator' ELSE 'recipient' END,
             'counterparty', CASE WHEN e.creator_id = p_bee_id THEN e.recipient_id ELSE e.creator_id END,
             'created_at', e.created_at) ORDER BY e.created_at DESC), '[]'::jsonb)
      INTO v_esc FROM public.bling_escrows e
     WHERE e.status='held' AND (e.creator_id = p_bee_id OR e.recipient_id = p_bee_id);

    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_ent FROM (
        SELECT jsonb_build_object('entry_id',d.id,'rail',d.rail,'astra',d.astra,
                 'kind',d.kind,'amount',d.amount,'amount_cents',d.amount_cents,
                 'currency',d.currency,'status',d.status,'created_at',d.created_at) AS x
          FROM public.depth_rail_entries d
         WHERE d.payer_bee = p_bee_id OR d.payee_bee = p_bee_id
         ORDER BY d.created_at DESC LIMIT 50) s;

    RETURN jsonb_build_object('ok',true,'bling_balance',v_bal,'open_escrows',v_esc,'recent_entries',v_ent);
END; $$;

REVOKE ALL ON FUNCTION public.depth_charge_bling(uuid,uuid,numeric,text,text,text,text,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_escrow_open(uuid,uuid,numeric,text,text,text,text,uuid,text,timestamptz,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_escrow_release(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_escrow_cancel(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_escrow_dispute(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.depth_charge_bling(uuid,uuid,numeric,text,text,text,text,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depth_escrow_open(uuid,uuid,numeric,text,text,text,text,uuid,text,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depth_escrow_release(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depth_escrow_cancel(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depth_escrow_dispute(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.depth_wallet(uuid) TO authenticated;

-- ============================================================================
-- DEPTH RAILS E1 - 03 STRIPE/USD rail RPCs (RAIL B) - SERVICES-ONLY
-- Pass DEPTH_RAILS1 | PROPOSE-FIRST, NOT APPLIED. Owner reviews + applies.
-- FIREWALL (MMF s5.13): USD buys a good/service; NONE of these touch bling_balance
-- or the BLiNG ledger. Idempotency lives on depth_rail_entries (NOT the core
-- stripe_events table, whose product_type/status CHECKs the existing webhook owns).
-- Amounts are integer cents. ASCII only.
-- ============================================================================

-- one Stripe event settles at most one depth entry
CREATE UNIQUE INDEX IF NOT EXISTS depth_rail_entries_stripe_event_uniq
    ON public.depth_rail_entries(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- depth_invoice_usd : create a pending USD entry to hand to Stripe checkout.
-- NO ledger, NO BLiNG. Caller may be the buyer or a service.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_invoice_usd(
    p_buyer_id        uuid,
    p_astra           text,
    p_kind            text,
    p_amount_cents    bigint,
    p_object_type     text            DEFAULT NULL,
    p_object_ref      uuid            DEFAULT NULL,
    p_fee_key         text            DEFAULT NULL,
    p_idempotency_key text            DEFAULT NULL,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_entry_id uuid; v_existing public.depth_rail_entries;
BEGIN
    IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'idempotency_key required'; END IF;
    IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount_cents must be positive'; END IF;
    SELECT * INTO v_existing FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_existing.result_json; END IF;

    INSERT INTO public.depth_rail_entries (
        rail, astra, kind, currency, payer_bee, amount_cents, fee_key,
        object_type, object_ref, status, idempotency_key, metadata)
    VALUES ('usd', p_astra, p_kind, 'USD', p_buyer_id, p_amount_cents, p_fee_key,
        p_object_type, p_object_ref, 'pending', p_idempotency_key,
        jsonb_build_object('memo', p_memo))
    RETURNING id INTO v_entry_id;

    UPDATE public.depth_rail_entries
       SET result_json = jsonb_build_object('ok',true,'entry_id',v_entry_id,
             'amount_cents',p_amount_cents,'status','pending')
     WHERE id = v_entry_id;
    RETURN (SELECT result_json FROM public.depth_rail_entries WHERE id = v_entry_id);
END; $$;

-- ---------------------------------------------------------------------------
-- depth_settle_usd : mark a USD invoice settled on Stripe webhook success.
-- SERVICE-ROLE. Idempotent on p_stripe_event_id. Structurally cannot credit
-- BLiNG (it writes only to depth_rail_entries). Service credit (e.g. h24 tokens)
-- is the SERVICE's own RPC (h24_credit_token_purchase) - NOT done here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_settle_usd(
    p_idempotency_key text,
    p_stripe_event_id text,
    p_payment_ref     text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries;
BEGIN
    -- replay: already settled by this event
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE stripe_event_id = p_stripe_event_id;
    IF FOUND THEN RETURN jsonb_build_object('ok',true,'entry_id',v_e.id,'status',v_e.status,'replay',true); END IF;

    SELECT * INTO v_e FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth invoice %', p_idempotency_key; END IF;
    IF v_e.rail <> 'usd' THEN RAISE EXCEPTION 'entry % is not a USD invoice', v_e.id; END IF;
    IF v_e.status <> 'pending' THEN RAISE EXCEPTION 'invoice % status is %, cannot settle', v_e.id, v_e.status; END IF;

    UPDATE public.depth_rail_entries
       SET status='settled', stripe_event_id=p_stripe_event_id,
           stripe_payment_ref=COALESCE(p_payment_ref, stripe_payment_ref), updated_at=now()
     WHERE id = v_e.id;
    RETURN jsonb_build_object('ok',true,'entry_id',v_e.id,'status','settled');
END; $$;

-- ---------------------------------------------------------------------------
-- depth_payout_usd : record a platform->vendor/creator USD payout (money moves
-- off-platform via Stripe transfer/Connect; this row is the reconciliation record).
-- SERVICE-ROLE / ADMIN.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_payout_usd(
    p_payee_id        uuid,
    p_astra           text,
    p_amount_cents    bigint,
    p_kind            text            DEFAULT 'payout',
    p_object_ref      uuid            DEFAULT NULL,
    p_payment_ref     text            DEFAULT NULL,
    p_idempotency_key text            DEFAULT NULL,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_entry_id uuid; v_existing public.depth_rail_entries;
BEGIN
    IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'idempotency_key required'; END IF;
    IF p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount_cents must be positive'; END IF;
    SELECT * INTO v_existing FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_existing.result_json; END IF;

    INSERT INTO public.depth_rail_entries (
        rail, astra, kind, currency, payee_bee, amount_cents, object_ref,
        stripe_payment_ref, status, idempotency_key, metadata)
    VALUES ('usd', p_astra, p_kind, 'USD', p_payee_id, p_amount_cents, p_object_ref,
        p_payment_ref, 'settled', p_idempotency_key, jsonb_build_object('memo',p_memo))
    RETURNING id INTO v_entry_id;

    UPDATE public.depth_rail_entries
       SET result_json = jsonb_build_object('ok',true,'entry_id',v_entry_id,'status','settled')
     WHERE id = v_entry_id;
    RETURN (SELECT result_json FROM public.depth_rail_entries WHERE id = v_entry_id);
END; $$;

-- ---------------------------------------------------------------------------
-- depth_refund_usd / depth_chargeback_usd : reverse a settled USD entry.
-- SERVICE-ROLE / ADMIN. No BLiNG touch. Mirrors h24_refund_token_purchase intent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.depth_refund_usd(
    p_idempotency_key text,
    p_refund_ref      text,
    p_amount_cents    bigint          DEFAULT NULL,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries;
BEGIN
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth entry %', p_idempotency_key; END IF;
    IF v_e.rail <> 'usd' THEN RAISE EXCEPTION 'entry % is not USD', v_e.id; END IF;
    UPDATE public.depth_rail_entries
       SET status='refunded', updated_at=now(),
           metadata = v_e.metadata || jsonb_build_object(
             'refund_ref', p_refund_ref, 'refund_cents', COALESCE(p_amount_cents, v_e.amount_cents),
             'refund_memo', p_memo)
     WHERE id = v_e.id;
    RETURN jsonb_build_object('ok',true,'entry_id',v_e.id,'status','refunded');
END; $$;

CREATE OR REPLACE FUNCTION public.depth_chargeback_usd(
    p_idempotency_key text,
    p_dispute_ref     text,
    p_memo            text            DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_e public.depth_rail_entries;
BEGIN
    SELECT * INTO v_e FROM public.depth_rail_entries WHERE idempotency_key = p_idempotency_key FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown depth entry %', p_idempotency_key; END IF;
    IF v_e.rail <> 'usd' THEN RAISE EXCEPTION 'entry % is not USD', v_e.id; END IF;
    UPDATE public.depth_rail_entries
       SET status='disputed', updated_at=now(),
           metadata = v_e.metadata || jsonb_build_object('dispute_ref', p_dispute_ref, 'dispute_memo', p_memo)
     WHERE id = v_e.id;
    RETURN jsonb_build_object('ok',true,'entry_id',v_e.id,'status','disputed');
END; $$;

-- Grants: invoice is user-or-service; settle/payout/refund/chargeback are service-role only.
REVOKE ALL ON FUNCTION public.depth_invoice_usd(uuid,text,text,bigint,text,uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_settle_usd(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_payout_usd(uuid,text,bigint,text,uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_refund_usd(text,text,bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.depth_chargeback_usd(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.depth_invoice_usd(uuid,text,text,bigint,text,uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.depth_settle_usd(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.depth_payout_usd(uuid,text,bigint,text,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.depth_refund_usd(text,text,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.depth_chargeback_usd(text,text,text) TO service_role;

COMMIT;
