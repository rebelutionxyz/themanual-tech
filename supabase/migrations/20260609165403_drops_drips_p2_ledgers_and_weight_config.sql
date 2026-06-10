-- Drops/Drips piece 2 — ledgers + weight config.
-- §2 action weights + §3 signal weights as tunable config (never hardcoded). Per-Bee per-day share
-- ledgers with snapshotted weight/rank-multiplier(/legitimacy), a single dedup_key UNIQUE (record fns
-- key it per the signal's dedup_scope), status pending->converted/withheld, owner-read RLS.

-- ── §2 action weights (config) ──
CREATE TABLE public.drops_action_weight (
  action text PRIMARY KEY,
  weight numeric(8,2) NOT NULL CHECK (weight >= 0),
  rank_gated boolean NOT NULL DEFAULT false,
  is_floor boolean NOT NULL DEFAULT false,   -- floor actions get per-Bee daily caps (piece 3); cap value tunable
  note text
);
INSERT INTO public.drops_action_weight (action,weight,rank_gated,is_floor,note) VALUES
 ('course_create',25,true,false,'Create a Manual course (Creator+)'),
 ('course_complete',10,false,false,'Complete a Manual course / cert'),
 ('thread_original',5,false,false,'Post original thread / substantive content'),
 ('source_submit',3,false,false,'Submit a source to an atom'),
 ('atom_merge_cosign',2,true,false,'Co-sign an atom merge (Guardian+)'),
 ('bazaar_offer',2,false,false,'Post an OFFER to the Bazaar'),
 ('escrow_complete',2,false,false,'Successful escrow completion'),
 ('reply_substantive',1,false,false,'Substantive reply'),
 ('gov_vote',1,false,false,'Canonicalization / governance vote'),
 ('atom_curate',0.5,false,true,'Curate an atom subtree (per atom)'),
 ('source_quality_vote',0.5,false,true,'Vote on source quality'),
 ('report_valid',0.5,false,true,'Report a flagged item (valid only)');
ALTER TABLE public.drops_action_weight ENABLE ROW LEVEL SECURITY;
CREATE POLICY drops_action_weight_read ON public.drops_action_weight FOR SELECT USING (true);

-- ── §3 signal weights (config) ──
CREATE TABLE public.drips_signal_weight (
  signal text PRIMARY KEY,
  weight numeric(8,2) NOT NULL CHECK (weight >= 0),
  dedup_scope text NOT NULL CHECK (dedup_scope IN ('permanent','daily','per_24h')),
  note text
);
INSERT INTO public.drips_signal_weight (signal,weight,dedup_scope,note) VALUES
 ('follower',500,'permanent','Follower gained (once per follower-creator, no re-earn on un/refollow)'),
 ('shapes_canon',200,'permanent','Your source shapes canon (survives review)'),
 ('saved',100,'permanent','Content saved / bookmarked'),
 ('promotion_targets_atom',100,'daily','A promotion targets your atom (once per promoter/atom/day)'),
 ('reply_received',50,'permanent','Substantive reply received (once per engager-content)'),
 ('cited',50,'permanent','Your content cited in another post / atom'),
 ('emoji_react',1,'permanent','Emoji react received (once per engager-content)'),
 ('page_view',1,'per_24h','Page view of your content (1 per viewer per 24h)'),
 ('profile_visit',1,'per_24h','Curator / profile page visited (1 per viewer per 24h)');
ALTER TABLE public.drips_signal_weight ENABLE ROW LEVEL SECURITY;
CREATE POLICY drips_signal_weight_read ON public.drips_signal_weight FOR SELECT USING (true);

-- ── Drops ledger (the doer) ──
CREATE TABLE public.drops_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bee_id uuid NOT NULL REFERENCES public.bees(id),
  action text NOT NULL REFERENCES public.drops_action_weight(action),
  source_ref uuid,
  weight numeric(8,2) NOT NULL,
  rank_multiplier numeric(6,4) NOT NULL,
  weighted_share numeric(16,4) NOT NULL CHECK (weighted_share >= 0),
  earned_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','converted','withheld')),
  dedup_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drops_ledger_due ON public.drops_ledger (earned_on) WHERE status='pending';
CREATE INDEX drops_ledger_bee ON public.drops_ledger (bee_id);
ALTER TABLE public.drops_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY drops_ledger_owner_read ON public.drops_ledger FOR SELECT
  USING ((bee_id = auth.uid()) OR (auth.role() = 'service_role'));

-- ── Drips ledger (the creator) ──
CREATE TABLE public.drips_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creator_bee_id uuid NOT NULL REFERENCES public.bees(id),
  signal text NOT NULL REFERENCES public.drips_signal_weight(signal),
  engager_bee_id uuid REFERENCES public.bees(id),
  source_ref uuid,
  weight numeric(8,2) NOT NULL,
  rank_multiplier numeric(6,4) NOT NULL,
  legitimacy_factor numeric(5,4) NOT NULL DEFAULT 1.0 CHECK (legitimacy_factor >= 0 AND legitimacy_factor <= 1),
  weighted_share numeric(16,4) NOT NULL CHECK (weighted_share >= 0),
  earned_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','converted','withheld')),
  dedup_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drips_ledger_due ON public.drips_ledger (earned_on) WHERE status='pending';
CREATE INDEX drips_ledger_creator ON public.drips_ledger (creator_bee_id);
CREATE INDEX drips_ledger_engager_day ON public.drips_ledger (engager_bee_id, earned_on);
ALTER TABLE public.drips_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY drips_ledger_owner_read ON public.drips_ledger FOR SELECT
  USING ((creator_bee_id = auth.uid()) OR (auth.role() = 'service_role'));