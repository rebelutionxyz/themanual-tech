-- Delete pure-framing stubs ("X as Y"). Their real subjects (AI, Robotics, Digital ID, Deep State...)
-- get clean atoms in Pass 2. Keep the NWO node as the seed for the New World Order atom.
delete from atoms where id in (
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-ai-as-censorship-and-replacement-tool',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-big-tech-government-merger-fascism-critique',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-climate-policy-as-agenda-vehicle',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-digital-id-as-totalitarian-infrastructure',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-civil-war',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-famine-as-control-tactic',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-mass-migration-as-demographic-warfare',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-unemployment',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-forever-wars-as-petrodollar-banking-enforcement',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-globalist-coordination-thesis-umbrella',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-lockdowns-as-evidence-of-design',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-narrative-control-as-orchestrated',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-ngo-network-as-deep-state-extension',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-puppet-leaders',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-robotics-as-labor-replacement-weapon',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-transgenderism-as-identity-manipulation',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-civil-war-domestic-destabilization',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-puppet-leaders-installed-politicians',
  'justice-investigations-contested-narratives-nwo-and-global-agenda-critiques-engineered-unemployment-jobs-displacement',
  'justice-investigations-contested-narratives-engineered-migration-claims',
  'justice-investigations-contested-narratives-fringe-claims-category-nephilim-parallel-transhumanism'
);
-- NWO node now empty -> mark leaf; it becomes the New World Order atom seed in Pass 2
update atoms set is_leaf=true where id='justice-investigations-contested-narratives-nwo-and-global-agenda-critiques';

update realms r set atom_count=(select count(*) from atoms a where a.realm_id=r.id);
