-- Drops/Drips piece 1 — config & contracts.
-- (a) admit drops/drips/drips_royalty ledger types; (b) thermostat_config + swappable accessor
-- (interim home for daily pool sizes — the real 5-zone Thermostat computes these later, same interface;
--  writes service-role-locked, a governed dial not a patchboard switch); (c) rank->multiplier ladder
-- (config, never hardcoded; interim geometric 1.0x->10.0x over 33 levels, overwritable with zero downstream impact).
-- NOTE: drip_award_stub retirement deferred — it has a live caller (question_bank_promote); retire when
-- record_drip replaces that call.

ALTER TABLE public.bling_transactions DROP CONSTRAINT bling_transactions_type_check;
ALTER TABLE public.bling_transactions ADD CONSTRAINT bling_transactions_type_check
  CHECK (type = ANY (ARRAY['free','send_debit','send_credit','escrow_hold','escrow_release','escrow_cancel',
    'escrow_dispute','order_reserve','order_fill_debit','order_fill_credit','order_cancel_refund','order_donation',
    'stripe_credit','chargeback','escrow_in','escrow_unlock','newbee_bonus','atlasoracle_escrow_deposit',
    'atlasoracle_escrow_withdraw','atlasoracle_directive','atlasoracle_refund','competition_stake_escrow',
    'competition_stake_refund','competition_source_reward','competition_payout','affiliate','affiliate_clawback',
    'drops','drips','drips_royalty']));

CREATE TABLE public.thermostat_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_drops_pool numeric(24,6) NOT NULL DEFAULT 0,   -- BLiNG! freed to the Drops pool per close
  daily_drips_pool numeric(24,6) NOT NULL DEFAULT 0,   -- BLiNG! freed to the Drips pool per close
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.thermostat_config (id) VALUES (1);
ALTER TABLE public.thermostat_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY thermostat_config_read ON public.thermostat_config FOR SELECT USING (true);

CREATE FUNCTION public.thermostat_daily_pools()
 RETURNS TABLE(drops_pool numeric, drips_pool numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$ SELECT daily_drops_pool, daily_drips_pool FROM public.thermostat_config WHERE id = 1; $$;
REVOKE EXECUTE ON FUNCTION public.thermostat_daily_pools() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.thermostat_daily_pools() TO service_role, authenticated;

CREATE TABLE public.rank_multiplier (
  rank_level smallint PRIMARY KEY CHECK (rank_level BETWEEN 1 AND 33),
  multiplier numeric(6,4) NOT NULL CHECK (multiplier > 0)
);
INSERT INTO public.rank_multiplier (rank_level, multiplier)
SELECT g, round((10.0 ^ ((g - 1) / 32.0))::numeric, 4) FROM generate_series(1, 33) g;
ALTER TABLE public.rank_multiplier ENABLE ROW LEVEL SECURITY;
CREATE POLICY rank_multiplier_read ON public.rank_multiplier FOR SELECT USING (true);