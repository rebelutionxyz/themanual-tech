-- Replace oracle elemental tiers (earth..ether) with the ruled names (ORACLE_MF v0.26): scout/oracle/sovereign.
-- Safe now: 0 oracle subs, 0 functions reference elemental names, 0 oracle Stripe objects (design-only).
-- membership + venue tiers unchanged.
alter table public.subscriptions drop constraint subscriptions_tier_valid;
alter table public.subscriptions add constraint subscriptions_tier_valid check (
  ((product_type = 'membership') and (tier = any (array['drone','worker','guardian','queen']))) or
  ((product_type = 'oracle')     and (tier = any (array['scout','oracle','sovereign']))) or
  ((product_type = 'venue')      and (tier = any (array['founding','standard'])))
);
