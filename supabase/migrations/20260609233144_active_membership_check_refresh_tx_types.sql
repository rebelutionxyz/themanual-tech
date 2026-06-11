-- Refresh active_membership_check to count CURRENT economy activity. The prior list referenced retired
-- order-book types (order_fill_*, order_reserve, order_cancel_refund, order_donation) and the retired
-- BLiNG!-Stripe rail (stripe_credit, chargeback) — none can fire post-retirement — while counting none of
-- the live economy, so active members were silently registering 0 events and getting wrongly blocked from
-- emergency/retirement escrow unlocks. Activity-based intent and the >=10 threshold preserved.
CREATE OR REPLACE FUNCTION public.active_membership_check(p_bee_id uuid, p_lookback_days integer DEFAULT 365)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE v_since TIMESTAMPTZ; v_events_count INT;
BEGIN
  v_since := now() - make_interval(days => p_lookback_days);
  SELECT count(*) INTO v_events_count FROM public.bling_transactions
   WHERE bee_id = p_bee_id AND created_at >= v_since
     AND type IN ('free','newbee_bonus','drops','drips','drips_royalty','send_debit','send_credit',
       'escrow_hold','escrow_release','escrow_cancel','escrow_unlock',
       'competition_stake_escrow','competition_source_reward','competition_payout',
       'affiliate','affiliate_clawback','atlasoracle_escrow_deposit','atlasoracle_escrow_withdraw');
  RETURN v_events_count >= 10;
END; $function$;
