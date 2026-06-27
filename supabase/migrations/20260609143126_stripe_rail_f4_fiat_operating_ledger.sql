-- F4 — fiat_operating_ledger: FIAT house/ad-revenue ledger. USD cents only — NEVER BLiNG!.
-- Deliberately distinct from BLiNG!-denominated Operations sub-funds (operations_funds, bling_pots):
-- no name collision, no implied coupling. Fountain escrow is NOT here (deferred with Stripe Connect).
CREATE TABLE public.fiat_operating_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out','reversal')),
  source text NOT NULL CHECK (source IN ('ad_slot','house')),
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  stripe_event_id text REFERENCES public.stripe_events(event_id),
  promotion_id uuid,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiat_operating_ledger ENABLE ROW LEVEL SECURITY;
-- Internal ledger: deny-all for users by design (no policy); service_role bypasses RLS.
COMMENT ON TABLE public.fiat_operating_ledger IS 'FIAT house/ad-revenue ledger (USD cents, NEVER BLiNG!). source: ad_slot=commercial fiat ad revenue, house=manual entries. Subscription fiat lives in stripe_events, not double-booked here. Service-only; deny-all RLS by design.';
