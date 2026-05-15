BEGIN;

UPDATE public.operations_funds
   SET genesis_balance = 15000000000,
       current_balance = LEAST(current_balance, 15000000000),
       updated_at      = now()
 WHERE fund_name = 'campaign';

INSERT INTO public.operations_funds (fund_name, genesis_balance, current_balance)
VALUES ('real_estate', 20000000000, 20000000000)
ON CONFLICT (fund_name) DO NOTHING;

DO $$
DECLARE
  v_count          INT;
  v_sum_genesis    NUMERIC(20,6);
  v_campaign_gen   NUMERIC(20,6);
  v_realestate_gen NUMERIC(20,6);
BEGIN
  SELECT count(*) INTO v_count FROM public.operations_funds;
  ASSERT v_count = 7, format('operations_funds row count = %s (expected 7)', v_count);

  SELECT sum(genesis_balance) INTO v_sum_genesis FROM public.operations_funds;
  ASSERT v_sum_genesis = 200000000000::numeric,
    format('SUM(genesis_balance) = %s (expected 200,000,000,000)', v_sum_genesis);

  SELECT genesis_balance INTO v_campaign_gen FROM public.operations_funds WHERE fund_name = 'campaign';
  ASSERT v_campaign_gen = 15000000000::numeric,
    format('campaign genesis = %s (expected 15,000,000,000)', v_campaign_gen);

  SELECT genesis_balance INTO v_realestate_gen FROM public.operations_funds WHERE fund_name = 'real_estate';
  ASSERT v_realestate_gen = 20000000000::numeric,
    format('real_estate genesis = %s (expected 20,000,000,000)', v_realestate_gen);

  RAISE NOTICE 'Migration 20260515020000 OK: operations_funds amendment verified.';
END $$;

COMMIT;
