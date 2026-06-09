-- =============================================================================
-- Migration 20260602201522 — Economy v3: cap + precision + faucet + safe drops
-- =============================================================================
-- APPLIED to production (anxmqiehpyznifqgskzc) 2026-06-02 as version 20260602201522
-- (OG HUMAN's explicit GO gate cleared). File renamed from the draft stamp
-- 20260602130000 to the real prod version for repo==prod ledger parity (2026-06-06).
-- Dry-run verified rollback-wrapped against production 2026-06-02 (no branch, no
-- persistence) before the real apply. Author: Code (Claude Opus 4.8). RED-ZONE.
-- Plan: shared/canon/economy-v3-migration-plan.md
-- Gate ratified (Butch, 2026-06-02): remainder well · hard_cap config · NO seed ·
--   DROP deprecated (verify-no-dependency) · demurrage deferred.
--
-- SCOPE THIS PASS:
--   1. hard_cap config field on bling_system_state = 111,222,333,333,222,111.
--   2. Widen 19 surviving money columns (20,6) -> (24,6).
--   3. Repoint surviving cap-bearing fns (bling_free, comp_settle) to read hard_cap.
--   4. DROP (dependency-verified): order book (bling_orders + place/fill/cancel),
--      bling_curve_integral_cost, bling_credit_purchase.  [Path A enforced.]
--   5. NO L2 seed — cap sits unfreed in the well; total_supply stays 0.
--
-- DEFERRED (live dependency found — item-4 STOP, NOT dropped here):
--   * freedom_price column — read by src/components/hq/sections/AdminActions.tsx
--     and EconomySnapshot.tsx (.select('total_supply, freedom_price')). Drop only
--     after those HQ panels stop selecting it. Kept + widened + frozen (bling_free
--     no longer escalates it).
--   * operations_funds table — debited by live public.issue_newbee_bonus(uuid)
--     ('newbee' fund). Drop only after issue_newbee_bonus is reworked to FREE the
--     newbee bonus from the well. Kept + widened.
--
-- Well model: REMAINDER — well = hard_cap - total_supply. No literal RJT account.
-- =============================================================================

BEGIN;

-- 1 · Clean-slate pre-flight. ABORT if any BLiNG! is circulating.
DO $$
DECLARE v_supply numeric; v_bees numeric; v_pots numeric;
BEGIN
    SELECT total_supply INTO v_supply FROM public.bling_system_state WHERE id=1;
    SELECT COALESCE(sum(bling_balance),0) INTO v_bees FROM public.bees;
    SELECT COALESCE(sum(balance),0) INTO v_pots FROM public.bling_pots;
    IF v_supply <> 0 OR v_bees <> 0 OR v_pots <> 0 THEN
        RAISE EXCEPTION 'Clean-slate precondition failed (supply=%, bees=%, pots=%). Re-plan with reconciliation.',
            v_supply, v_bees, v_pots;
    END IF;
    RAISE NOTICE 'Pre-flight OK: genesis clean slate.';
END $$;

-- 2 · Cap as single source of truth.
ALTER TABLE public.bling_system_state ADD COLUMN IF NOT EXISTS hard_cap numeric(24,6);
UPDATE public.bling_system_state SET hard_cap = 111222333333222111 WHERE id = 1;
ALTER TABLE public.bling_system_state ALTER COLUMN hard_cap SET NOT NULL;

-- 3 · Repoint bling_free — flat faucet from Source, reads hard_cap, curve retired.
CREATE OR REPLACE FUNCTION public.bling_free(p_bee_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_free_active boolean; v_total_supply numeric; v_hard_cap numeric;
    v_new_total numeric; v_balance_after numeric; v_tx_id bigint;
BEGIN
    IF v_caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF v_caller <> p_bee_id THEN RAISE EXCEPTION 'caller % may not FREE BLiNG! into bee %', v_caller, p_bee_id; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
    SELECT free_active, total_supply, hard_cap INTO v_free_active, v_total_supply, v_hard_cap
      FROM public.bling_system_state WHERE id=1 FOR UPDATE;
    IF NOT v_free_active THEN RAISE EXCEPTION 'FREE issuance paused (free_active=false)'; END IF;
    v_new_total := v_total_supply + p_amount;
    IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'would exceed hard cap (% > %)', v_new_total, v_hard_cap; END IF;
    UPDATE public.bling_system_state SET total_supply = v_new_total WHERE id=1;  -- v3: freedom_price frozen (curve retired)
    UPDATE public.bees SET bling_balance = bling_balance + p_amount WHERE id=p_bee_id RETURNING bling_balance INTO v_balance_after;
    IF v_balance_after IS NULL THEN RAISE EXCEPTION 'bee % not found', p_bee_id; END IF;
    INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, memo)
    VALUES (p_bee_id, 'free', p_amount, v_balance_after, 'FREE from Source (Economy v3 flat faucet)')
    RETURNING id INTO v_tx_id;
    RETURN jsonb_build_object('ok',true,'tx_id',v_tx_id,'balance_after',v_balance_after,
        'new_total_supply',v_new_total,'well_remaining', v_hard_cap - v_new_total);
END; $function$;

-- 4 · Repoint comp_settle — reads hard_cap; supply vars widened to bare numeric.
CREATE OR REPLACE FUNCTION public.comp_settle(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
    v_caller uuid := auth.uid();
    v_is_service boolean := (auth.role() = 'service_role');
    v_comp public.competitions%ROWTYPE; v_rec record;
    v_pot numeric(24,6); v_skim numeric(24,6) := 0; v_distributable numeric(24,6) := 0;
    v_source_in numeric(24,6) := 0; v_sum_weights numeric(24,6) := 0; v_allocated numeric(24,6) := 0;
    v_pay numeric(24,6); v_balance_after numeric(24,6);
    v_total_supply numeric; v_new_total numeric; v_hard_cap numeric;
    v_top_bee uuid := NULL;
BEGIN
    SELECT * INTO v_comp FROM public.competitions WHERE id = p_competition_id FOR UPDATE;
    IF v_comp.id IS NULL THEN RAISE EXCEPTION 'competition % not found', p_competition_id; END IF;
    IF NOT v_is_service AND v_caller IS DISTINCT FROM v_comp.host_bee_id THEN
        RAISE EXCEPTION 'only the host or engine may settle'; END IF;
    IF v_comp.status = 'complete' THEN RAISE EXCEPTION 'competition % already settled', p_competition_id; END IF;
    IF v_comp.status NOT IN ('active','settling') THEN RAISE EXCEPTION 'cannot settle in status %', v_comp.status; END IF;

    UPDATE public.competitions SET status = 'settling' WHERE id = p_competition_id;
    FOR v_rec IN SELECT * FROM public.comp_leaderboard(p_competition_id) LOOP
        UPDATE public.competition_participants SET final_rank = v_rec.final_rank
         WHERE competition_id = p_competition_id AND bee_id = v_rec.bee_id;
    END LOOP;

    IF v_comp.mode IN ('practice','casual') THEN
        SELECT total_supply, hard_cap INTO v_total_supply, v_hard_cap FROM public.bling_system_state WHERE id = 1 FOR UPDATE;
        FOR v_rec IN
            SELECT p.bee_id, COALESCE(sum(a.awarded),0)::numeric(24,6) AS due
              FROM public.competition_participants p
              LEFT JOIN public.competition_answers a
                ON a.competition_id=p.competition_id AND a.bee_id=p.bee_id AND a.is_correct=true AND a.forfeit_reason IS NULL
             WHERE p.competition_id=p_competition_id GROUP BY p.bee_id
        LOOP
            IF v_rec.due > 0 THEN
                v_new_total := v_total_supply + v_rec.due;
                IF v_new_total > v_hard_cap THEN RAISE EXCEPTION 'Source payout would exceed hard cap'; END IF;
                v_total_supply := v_new_total;
                UPDATE public.bees SET bling_balance = bling_balance + v_rec.due WHERE id=v_rec.bee_id RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout=v_rec.due WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES (v_rec.bee_id,'competition_source_reward',v_rec.due,v_balance_after,'competition_source_reward',p_competition_id,'Bee Games reward (Source-funded)');
                v_source_in := v_source_in + v_rec.due;
            END IF;
        END LOOP;
        UPDATE public.bling_system_state SET total_supply = v_total_supply WHERE id=1;
        v_pot := 0;
    ELSE
        v_pot := v_comp.prize_pool; v_skim := round(v_pot*0.05,6); v_distributable := v_pot - v_skim;
        SELECT COALESCE(sum(public.fib_speed_multiplier(final_rank)),0) INTO v_sum_weights
          FROM public.competition_participants WHERE competition_id=p_competition_id AND forfeited=false AND final_rank IS NOT NULL;
        IF v_sum_weights > 0 AND v_distributable > 0 THEN
            FOR v_rec IN SELECT bee_id, final_rank FROM public.competition_participants
                 WHERE competition_id=p_competition_id AND forfeited=false AND final_rank IS NOT NULL ORDER BY final_rank ASC
            LOOP
                v_pay := round(v_distributable * public.fib_speed_multiplier(v_rec.final_rank) / v_sum_weights, 6);
                v_allocated := v_allocated + v_pay;
                IF v_top_bee IS NULL THEN v_top_bee := v_rec.bee_id; END IF;
                UPDATE public.bees SET bling_balance = bling_balance + v_pay WHERE id=v_rec.bee_id RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout=v_pay WHERE competition_id=p_competition_id AND bee_id=v_rec.bee_id;
                INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES (v_rec.bee_id,'competition_payout',v_pay,v_balance_after,'competition_payout',p_competition_id,'Bee Games prize-pool award');
            END LOOP;
            IF v_allocated <> v_distributable AND v_top_bee IS NOT NULL THEN
                v_pay := v_distributable - v_allocated;
                UPDATE public.bees SET bling_balance = bling_balance + v_pay WHERE id=v_top_bee RETURNING bling_balance INTO v_balance_after;
                UPDATE public.competition_participants SET payout = payout + v_pay WHERE competition_id=p_competition_id AND bee_id=v_top_bee;
                INSERT INTO public.bling_transactions (bee_id, type, amount, balance_after, source_type, source_ref, memo)
                VALUES (v_top_bee,'competition_payout',v_pay,v_balance_after,'competition_payout',p_competition_id,'Bee Games prize-pool award (rounding remainder)');
                v_allocated := v_distributable;
            END IF;
        ELSE
            v_skim := v_pot; v_distributable := 0;
        END IF;
        IF v_skim > 0 THEN
            UPDATE public.bling_system_state SET total_supply = greatest(total_supply - v_skim, 0) WHERE id=1;  -- skim returns to Source
        END IF;
    END IF;

    INSERT INTO public.competition_settlements (competition_id, source_in, pot_total, sink_to_source)
    VALUES (p_competition_id, v_source_in, v_pot, v_skim)
    ON CONFLICT (competition_id) DO UPDATE SET source_in=EXCLUDED.source_in, pot_total=EXCLUDED.pot_total, sink_to_source=EXCLUDED.sink_to_source, settled_at=now();
    UPDATE public.competitions SET status='complete', ended_at=now() WHERE id=p_competition_id;
    RETURN jsonb_build_object('ok',true,'competition_id',p_competition_id,'mode',v_comp.mode,
        'source_in',v_source_in,'pot_total',v_pot,'sink_to_source',v_skim,'distributed',v_allocated);
END; $function$;

-- 5 · Drop deprecated artifacts (dependency-verified 2026-06-02).
-- 5a · order book — drop inbound FK first, then RPCs, then table.
ALTER TABLE public.bling_transactions DROP CONSTRAINT IF EXISTS bling_tx_ref_order_fk;  -- keep ref_order_id as historical bigint
DROP FUNCTION IF EXISTS public.bling_place_order(uuid, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.bling_fill_order(uuid, bigint, numeric);
DROP FUNCTION IF EXISTS public.bling_cancel_order(bigint, uuid);
DROP TABLE    IF EXISTS public.bling_orders;
-- 5b · bonding curve helper (bling_free no longer calls it; bling_credit_purchase dropped below).
DROP FUNCTION IF EXISTS public.bling_curve_integral_cost(numeric, numeric);
-- 5c · fiat->BLiNG credit purchase (Path A: platform never sells BLiNG!).
DROP FUNCTION IF EXISTS public.bling_credit_purchase(uuid, numeric);

-- 6 · Widen 19 surviving money columns (20,6) -> (24,6). Metadata-only.
--     (bling_orders columns excluded — table dropped above. freedom_price &
--      operations_funds kept + widened: their drops are DEFERRED per header.)
DROP TRIGGER IF EXISTS bees_bling_rank_refresh ON public.bees;  -- defensive; verified absent 2026-06-02
ALTER TABLE public.bees                       ALTER COLUMN bling_balance  TYPE numeric(24,6);
ALTER TABLE public.bling_pots                 ALTER COLUMN balance        TYPE numeric(24,6);
ALTER TABLE public.bling_transactions         ALTER COLUMN amount         TYPE numeric(24,6),
                                              ALTER COLUMN balance_after  TYPE numeric(24,6);
ALTER TABLE public.bling_system_state         ALTER COLUMN total_supply   TYPE numeric(24,6),
                                              ALTER COLUMN freedom_price   TYPE numeric(24,6);
ALTER TABLE public.bling_escrows              ALTER COLUMN amount         TYPE numeric(24,6);
ALTER TABLE public.bling_stripe_events        ALTER COLUMN amount_bling   TYPE numeric(24,6);
ALTER TABLE public.bling_retirement_escrows   ALTER COLUMN total_accrued  TYPE numeric(24,6),
                                              ALTER COLUMN total_unlocked  TYPE numeric(24,6),
                                              ALTER COLUMN total_forfeited TYPE numeric(24,6),
                                              ALTER COLUMN total_disbursed TYPE numeric(24,6);
ALTER TABLE public.bling_emergency_fund_escrows ALTER COLUMN total_accrued  TYPE numeric(24,6),
                                              ALTER COLUMN total_unlocked  TYPE numeric(24,6),
                                              ALTER COLUMN total_forfeited TYPE numeric(24,6),
                                              ALTER COLUMN total_disbursed TYPE numeric(24,6);
ALTER TABLE public.operations_funds           ALTER COLUMN genesis_balance TYPE numeric(24,6),
                                              ALTER COLUMN current_balance  TYPE numeric(24,6);
ALTER TABLE public.atlasoracle_directives     ALTER COLUMN cost_bling      TYPE numeric(24,6);

COMMIT;

-- =============================================================================
-- VERIFICATION (run AFTER commit)
-- =============================================================================
-- SELECT hard_cap FROM bling_system_state WHERE id=1;            -- 111222333333222111
-- SELECT total_supply FROM bling_system_state WHERE id=1;        -- 0  (well = full cap)
-- SELECT numeric_precision, numeric_scale FROM information_schema.columns
--   WHERE table_name='bees' AND column_name='bling_balance';     -- 24, 6
-- SELECT to_regclass('public.bling_orders');                     -- NULL
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('bling_place_order','bling_fill_order','bling_cancel_order',
--    'bling_credit_purchase','bling_curve_integral_cost');       -- 0 rows
--
-- =============================================================================
-- ROLLBACK (emergency only; precision narrowing destructive off the clean slate)
-- =============================================================================
-- Restore dropped objects from git history (this migration's predecessors:
--   bling_orders + RPCs: 23_v9_0_security.sql / lock_cr5 migrations;
--   bling_curve_integral_cost + bling_credit_purchase: live-catalog capture;
--   bling_free curve form: 20260511100000 / live catalog).
-- Then: ALTER ... TYPE numeric(20,6) for the 19 columns (gated on magnitude check);
--       ALTER TABLE bling_system_state DROP COLUMN hard_cap.
-- =============================================================================
