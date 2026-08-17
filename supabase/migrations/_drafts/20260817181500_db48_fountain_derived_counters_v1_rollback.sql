-- ROLLBACK for 20260817181500_db48_fountain_derived_counters_v1.sql
-- DB48, 2026-08-17. WRITTEN BEFORE THE FORWARD MIGRATION, per the MIGRATION
-- AMENDMENT (root CLAUDE.md R7): the rollback statement is stated in full before
-- any apply is proposed.
--
-- WHAT RUNNING THIS RESTORES: defect D-2, exactly as FUND_MF v0.1 describes it.
-- give_campaigns.raised_cents goes back to being a plain bigint incremented at
-- AUTHORIZATION and never decremented, so an expired card auth (Stripe voids
-- uncaptured PaymentIntents after ~7 days) leaves the counter reading money that
-- no longer exists, and fountain_begin_close can hand down a 'capture' verdict on
-- an AON campaign that never actually met its goal.
--
-- IT MOVES NO MONEY AND DELETES NO PLEDGE. The forward migration writes no new
-- financial facts — it only stops two RPCs from hand-incrementing two counters
-- and derives those counters from fountain_pledges instead. Rolling back leaves
-- give_campaigns.raised_cents / captured_cents holding whatever the derivation
-- last wrote; from that moment they are hand-maintained again.
--
-- ONE THING IS NOT SYMMETRIC, AND IT IS DELIBERATE: step 4 DELETEs the
-- stripe_events rows this feature wrote (product_type = 'fund'). It has to —
-- the narrow CHECK cannot be restored while rows violating it exist. Those rows
-- are a webhook audit trail, not money. If they matter, copy them out first:
--   CREATE TABLE public.stripe_events_fund_backup AS
--     SELECT * FROM public.stripe_events WHERE product_type = 'fund';
--
-- It exists for protocol completeness, not as a maintenance procedure.

-- 1. Stop the derivation. Triggers first, then the functions they call.

drop trigger if exists give_campaigns_derive_counters on public.give_campaigns;

drop trigger if exists fountain_pledges_sync_counters on public.fountain_pledges;

drop function if exists public.give_campaigns_derive_counters();

drop function if exists public.fountain_pledges_sync_counters();

drop function if exists public.fountain_recount(uuid);

drop function if exists public.fountain_counters(uuid);

-- 2. Restore fountain_register_pledge WITH the raised_cents increment.
--    Body quoted verbatim from 20260610190634_fountain_f5_db_layer.sql, which was
--    verified byte-identical to the live pg_get_functiondef() output on 2026-08-17.

CREATE OR REPLACE FUNCTION public.fountain_register_pledge(
  p_campaign_id uuid, p_bee_id uuid, p_amount_cents bigint, p_currency text,
  p_payment_intent_id text, p_source_ref uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_status text; v_model text; v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT status, funding_model INTO v_status, v_model FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'campaign not active (%)', v_status; END IF;
  IF v_model IS NULL THEN RAISE EXCEPTION 'campaign has no funding model'; END IF;
  INSERT INTO public.fountain_pledges (campaign_id,bee_id,amount_cents,currency,stripe_payment_intent_id,source_ref)
  VALUES (p_campaign_id,p_bee_id,p_amount_cents,p_currency,p_payment_intent_id,p_source_ref)
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  UPDATE public.give_campaigns SET raised_cents = raised_cents + p_amount_cents WHERE id=p_campaign_id;
  RETURN jsonb_build_object('ok',true,'pledge_id',v_id);
END; $$;

-- 3. Restore fountain_pledge_captured WITH the captured_cents increment.

CREATE OR REPLACE FUNCTION public.fountain_pledge_captured(p_pledge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_p record; v_c record; v_mult numeric; v_reserve numeric; v_reward numeric; v_lot bigint;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT * INTO v_p FROM public.fountain_pledges WHERE id=p_pledge_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'pledge not found'; END IF;
  IF v_p.status = 'captured' THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  IF v_p.status <> 'authorized' THEN RAISE EXCEPTION 'cannot capture pledge in status %', v_p.status; END IF;
  SELECT id, slug INTO v_c FROM public.give_campaigns WHERE id=v_p.campaign_id;
  SELECT freeing_multiplier, reserve INTO v_mult, v_reserve
    FROM public.bling_system_state WHERE id=1 FOR UPDATE;
  v_reward := round((v_p.amount_cents::numeric/100) * v_mult, 6);
  IF v_reward > v_reserve THEN RAISE EXCEPTION 'reward would exceed reserve'; END IF;
  UPDATE public.bling_system_state
     SET total_supply = total_supply + v_reward, reserve = reserve - v_reward WHERE id=1;
  v_lot := public.lot_credit(v_p.bee_id, v_reward, 'fountain',
            jsonb_build_object('campaign_id',v_c.id,'campaign_slug',v_c.slug,'pledge_id',v_p.id));
  INSERT INTO public.bling_transactions (bee_id,type,amount,balance_after,category,source_type,source_ref,memo)
  VALUES (v_p.bee_id,'fountain_reward',v_reward,
          (SELECT bling_balance FROM public.bees WHERE id=v_p.bee_id),
          'fountain','fountain',v_p.source_ref,'Fountain reward ×'||v_mult||' for campaign '||v_c.slug);
  UPDATE public.fountain_pledges SET status='captured', captured_at=now(), reward_lot_id=v_lot WHERE id=p_pledge_id;
  UPDATE public.give_campaigns SET captured_cents = captured_cents + v_p.amount_cents WHERE id=v_p.campaign_id;
  RETURN jsonb_build_object('ok',true,'reward_freed',v_reward,'lot_id',v_lot);
END; $$;

-- 4. Narrow stripe_events.product_type back. Destructive by necessity — see header.

delete from public.stripe_events where product_type = 'fund';

alter table public.stripe_events drop constraint stripe_events_product_type_check;

alter table public.stripe_events add constraint stripe_events_product_type_check
  check (product_type = any (array['membership'::text, 'oracle'::text, 'ad_slot'::text, 'venue'::text]));
