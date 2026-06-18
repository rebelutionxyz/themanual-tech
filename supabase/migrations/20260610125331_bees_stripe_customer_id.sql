-- F6 prerequisite — persisted Stripe customer → Bee reverse lookup.
--
-- Source of truth for the mapping remains the Stripe customer/subscription
-- metadata (bee_id), set at checkout. This column is the cache populated on
-- first contact so later events (invoice.paid, subscription.updated) resolve
-- the Bee WITHOUT a Stripe API round-trip and regardless of event ordering.
--
-- Firewall note: this stores only an opaque Stripe customer id. No fiat,
-- no balance, no PAN — services-only firewall is unaffected.

alter table public.bees
  add column if not exists stripe_customer_id text;

-- One Stripe customer pins to at most one Bee (non-null only).
create unique index if not exists bees_stripe_customer_uk
  on public.bees (stripe_customer_id)
  where stripe_customer_id is not null;