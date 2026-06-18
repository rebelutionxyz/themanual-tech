-- F2 — stripe_events: fiat-IN event log (BLiNG!-free). Port-adapted from retired bling_stripe_events.
-- Part of the Stripe fiat rail. Idempotency on event_id. amount_cents nullable for lifecycle events.
CREATE TABLE public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('membership','oracle','ad_slot')),
  bee_id uuid REFERENCES public.bees(id),
  amount_cents bigint,
  currency text NOT NULL DEFAULT 'usd',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_charge_id text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed','reversed')),
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY stripe_events_owner_read ON public.stripe_events
  FOR SELECT USING ((bee_id = auth.uid()) OR (auth.role() = 'service_role'));
CREATE INDEX stripe_events_subscription_idx ON public.stripe_events(stripe_subscription_id);
CREATE INDEX stripe_events_bee_idx ON public.stripe_events(bee_id);
COMMENT ON TABLE public.stripe_events IS 'Fiat-IN event log for the Stripe rail (memberships, AtlasOracle, commercial ad_slot). BLiNG!-free; fiat never touches the BLiNG! ledger. event_id = idempotency key; amount_cents NULL for lifecycle events.';
