-- Affiliate hold layer, piece 1: hold lot table + cached held balance.
-- 60-day maturation. Freed-but-locked BLiNG! lives here until it matures into bling_balance,
-- or is returned to the Well on clawback. Held counts toward Rank, never spendable.

CREATE TABLE public.affiliate_holds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bee_id      uuid NOT NULL REFERENCES public.bees(id),
  amount      numeric(24,6) NOT NULL CHECK (amount > 0),
  tier        text NOT NULL CHECK (tier IN ('l1','l2','l3','l4','l5','treasury')),
  trigger     text,
  source_ref  uuid NOT NULL,
  freed_at    timestamptz NOT NULL DEFAULT now(),
  releases_at timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','clawed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY affiliate_holds_owner_read ON public.affiliate_holds
  FOR SELECT USING ((bee_id = auth.uid()) OR (auth.role() = 'service_role'));
CREATE INDEX affiliate_holds_due_idx    ON public.affiliate_holds(releases_at) WHERE status = 'held';
CREATE INDEX affiliate_holds_source_idx ON public.affiliate_holds(source_ref);
CREATE INDEX affiliate_holds_bee_idx    ON public.affiliate_holds(bee_id);
COMMENT ON TABLE public.affiliate_holds IS
  'Held affiliate BLiNG! lots (60-day maturation). Source of truth for held balance; bees.bling_held is the cache. Freed from the Well at distribute (locked, not spendable), moved to bling_balance at maturation, returned to the Well on clawback. status: held|released|clawed.';

ALTER TABLE public.bees ADD COLUMN bling_held numeric(24,6) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.bees.bling_held IS
  'Cached sum of held (unmatured) affiliate BLiNG! from affiliate_holds. Counts toward Rank; NOT spendable. Moves into bling_balance at 60-day maturation.';