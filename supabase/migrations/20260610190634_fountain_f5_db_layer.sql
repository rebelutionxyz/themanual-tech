-- F5 — THE FOUNTAIN DB LAYER (locked Jun 10 2026)
-- Crowdfunding Astra financial spine. Decisions locked:
--   * Reward: contribution$ × freeing_multiplier (89), freed from the Well to the
--     CONTRIBUTOR (drain-model, conservation-safe). Howey-safe: fiat buys nothing;
--     BLiNG! is freed as reward.
--   * Platform fee: 0% — pure pass-through. Direct charges on the manager's
--     Express Connect account; Stripe fees borne by the manager; platform holds no fiat.
--   * Affiliate: EXCLUDED (triggers remain membership/oracle recurring only).
--   * Pattern B charge-at-close: pledges = authorized PaymentIntents; captured at close.
--   * AON: capture only if raised >= goal at close, else cancel all. KWYR: capture all.
--   * Reward lots stamped origin='fountain' + DNA {campaign_id, campaign_slug, pledge_id}.

ALTER TABLE public.give_campaigns
  ADD COLUMN funding_model text CHECK (funding_model IN ('aon','kwyr')),
  ADD COLUMN goal_cents bigint CHECK (goal_cents > 0),
  ADD COLUMN currency text NOT NULL DEFAULT 'usd',
  ADD COLUMN raised_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN captured_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN manager_connect_account text,
  ADD COLUMN closed_at timestamptz;

ALTER TABLE public.give_campaigns DROP CONSTRAINT give_campaigns_status_check;

ALTER TABLE public.give_campaigns ADD CONSTRAINT give_campaigns_status_check
  CHECK (status IN ('active','fulfilled','cancelled','closing','closed_success','closed_failed'));

ALTER TABLE public.give_campaigns ADD CONSTRAINT give_campaigns_financial_complete
  CHECK (funding_model IS NULL OR (goal_cents IS NOT NULL AND manager_connect_account IS NOT NULL));

CREATE TABLE public.fountain_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.give_campaigns(id),
  bee_id uuid NOT NULL REFERENCES public.bees(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'authorized'
    CHECK (status IN ('authorized','captured','canceled','capture_failed','refunded')),
  source_ref uuid NOT NULL UNIQUE,
  reward_lot_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz
);

CREATE INDEX fountain_pledges_campaign_idx ON public.fountain_pledges (campaign_id, status);

ALTER TABLE public.fountain_pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY fountain_pledges_own_read ON public.fountain_pledges FOR SELECT
  USING (bee_id = auth.uid());

REVOKE ALL ON public.fountain_pledges FROM anon;

CREATE FUNCTION public.fountain_register_pledge(
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

CREATE FUNCTION public.fountain_begin_close(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_c record; v_success boolean; v_work jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT * INTO v_c FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_c.status = 'closing' THEN NULL;
  ELSIF v_c.status <> 'active' THEN RAISE EXCEPTION 'cannot close in status %', v_c.status;
  END IF;
  IF v_c.funding_model = 'aon' THEN v_success := v_c.raised_cents >= v_c.goal_cents;
  ELSE v_success := true; END IF;
  UPDATE public.give_campaigns SET status='closing' WHERE id=p_campaign_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'pledge_id',id,'payment_intent',stripe_payment_intent_id,'amount_cents',amount_cents)),'[]'::jsonb)
    INTO v_work FROM public.fountain_pledges
   WHERE campaign_id=p_campaign_id AND status='authorized';
  RETURN jsonb_build_object('ok',true,'verdict',CASE WHEN v_success THEN 'capture' ELSE 'cancel' END,
           'funding_model',v_c.funding_model,'raised_cents',v_c.raised_cents,'goal_cents',v_c.goal_cents,
           'pledges',v_work);
END; $$;

CREATE FUNCTION public.fountain_pledge_captured(p_pledge_id uuid)
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

CREATE FUNCTION public.fountain_pledge_canceled(p_pledge_id uuid, p_failed boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_status text;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT status INTO v_status FROM public.fountain_pledges WHERE id=p_pledge_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'pledge not found'; END IF;
  IF v_status IN ('canceled','capture_failed') THEN RETURN jsonb_build_object('ok',true,'duplicate',true); END IF;
  IF v_status <> 'authorized' THEN RAISE EXCEPTION 'cannot cancel pledge in status %', v_status; END IF;
  UPDATE public.fountain_pledges
     SET status = CASE WHEN p_failed THEN 'capture_failed' ELSE 'canceled' END WHERE id=p_pledge_id;
  RETURN jsonb_build_object('ok',true);
END; $$;

CREATE FUNCTION public.fountain_finalize_close(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_c record; v_open int; v_captured int;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role only'; END IF;
  SELECT * INTO v_c FROM public.give_campaigns WHERE id=p_campaign_id FOR UPDATE;
  IF v_c.status <> 'closing' THEN RAISE EXCEPTION 'campaign not in closing (%)', v_c.status; END IF;
  SELECT count(*) FILTER (WHERE status='authorized'),
         count(*) FILTER (WHERE status='captured')
    INTO v_open, v_captured FROM public.fountain_pledges WHERE campaign_id=p_campaign_id;
  IF v_open > 0 THEN RAISE EXCEPTION '% pledges still authorized — settle them first', v_open; END IF;
  UPDATE public.give_campaigns
     SET status = CASE WHEN v_captured > 0 THEN 'closed_success' ELSE 'closed_failed' END,
         closed_at = now()
   WHERE id=p_campaign_id;
  RETURN jsonb_build_object('ok',true,'final_status',
    CASE WHEN v_captured > 0 THEN 'closed_success' ELSE 'closed_failed' END,'captured_pledges',v_captured);
END; $$;

REVOKE EXECUTE ON FUNCTION public.fountain_register_pledge(uuid,uuid,bigint,text,text,uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_begin_close(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_pledge_captured(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_pledge_canceled(uuid,boolean) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fountain_finalize_close(uuid) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_transactions_type_check;

ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check
  CHECK (type = ANY (ARRAY['free','send_debit','send_credit','escrow_hold','escrow_release','escrow_cancel','escrow_dispute','order_reserve','order_fill_debit','order_fill_credit','order_cancel_refund','order_donation','stripe_credit','chargeback','escrow_in','escrow_unlock','newbee_bonus','atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw','atlasoracle_directive','atlasoracle_refund','competition_stake_escrow','competition_stake_refund','competition_source_reward','competition_payout','affiliate','affiliate_clawback','drops','drips','drips_royalty','splash','deficit_repayment','fountain_reward']));
