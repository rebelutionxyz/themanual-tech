-- F3 — subscriptions: recurring fiat products (membership / AtlasOracle). Part of the Stripe fiat rail.
-- status CHECK mirrors Stripe's routed set incl. incomplete_expired; updated_at moved by trigger.
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bee_id uuid NOT NULL REFERENCES public.bees(id),
  product_type text NOT NULL CHECK (product_type IN ('membership','oracle')),
  tier text NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL CHECK (status IN ('active','past_due','canceled','incomplete','incomplete_expired','trialing','unpaid')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_owner_read ON public.subscriptions
  FOR SELECT USING ((bee_id = auth.uid()) OR (auth.role() = 'service_role'));
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX subscriptions_one_active_per_product
  ON public.subscriptions(bee_id, product_type) WHERE status = 'active';
COMMENT ON TABLE public.subscriptions IS 'Recurring fiat product subscriptions (membership=ad-relief ladder, oracle=compute plan). tier is product_type-scoped; ad-relief derives from membership.tier only. BLiNG!-free.';
