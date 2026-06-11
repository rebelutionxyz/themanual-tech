-- Tier taxonomy locked Jun 10 2026:
--   membership ∈ drone | worker | guardian | queen   (bee ladder)
--   oracle     ∈ earth | water | wind | fire | ether (classical-elements ladder, dense → subtle)
-- Per-product CHECK: a membership tier is invalid on an oracle row and vice versa.
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_tier_valid CHECK (
  (product_type = 'membership' AND tier IN ('drone','worker','guardian','queen'))
  OR
  (product_type = 'oracle' AND tier IN ('earth','water','wind','fire','ether'))
);
