// Canonical Astra catalog — mirrors shared/canon/astra-registry-canonical-v1.md.
// Single source of truth for HQ Astra Status section AND (since FRONT21) for the
// constellation routing in themanual.tech. When canon changes, update both files
// in parallel (no build-time derivation yet — future tooling).
//
// 40 Astras across 7 categories. Constellation hubs + director persona
// surfaces are NOT Astras and live in their own arrays below.
//
// ── FRONT21 (2026-08-04) — THE MANUAL RULING (ORACLE_MF v1.24) ──────────
// "we are all in themanual.tech only for now ... everything should be in the
// manual." Every Astra now carries a `route`: its path inside themanual.tech.
// No second deploy, no DNS. `hosts` stays as the registered-but-DARK record.
//
// The list below was DERIVED, not invented — three sources, each recorded:
//   1. the pre-existing 38-entry canon catalog (canon v1, mirrored here)
//   2. the workspace trees that exist on disk (REBELUTION.vote, REBELUTION.org,
//      freedomofthe.press, TheHoneycomb.games, REBELUTION.ing, FreedomBLiNGS.com,
//      REBELUTION.icu, AtlasORACLE.to, TheMANUAL.tech)
//   3. the rail canon doc chains in public.ops_docs (ORACLE_MF, JMF, GAMES_MF,
//      VOTE_MF, IDENTITY_MODEL, H24_GESTURES)
// Two entries are NEW vs canon v1 and are marked `derived: true` — they await
// owner confirm before canon v1 is amended: `justice` and `press`. One existing
// entry gained a host from a workspace tree: `gaming` ← TheHoneycomb.games.

import { ASTRA_REGISTRY } from '@/lib/astras/registry';

export type AstraCategory =
  | 'core'
  | 'economy'
  | 'knowledge'
  | 'connection'
  | 'do'
  | 'governance'
  | 'security';

export type AstraStatus = 'live' | 'scaffolded' | 'deferred' | 'post-Swarm';

/**
 * How the Astra's route is served inside themanual.tech today.
 *   'page'    — a dedicated route + page component is mounted in App.tsx
 *   'surface' — the /:slug catch-all renders it from lib/surfaces.ts (SurfacePage)
 *   'stub'    — FRONT21 generates the route; AstraStubPage marks it as a stub
 * Only 'stub' entries get a generated route, so a real page always wins.
 */
export type AstraMount = 'page' | 'surface' | 'stub';

export interface AstraCatalogEntry {
  slug: string;
  wordmark: string;
  category: AstraCategory;
  hosts: string[];
  status: AstraStatus;
  director?: string;
  description: string;
  /** Canonical path inside themanual.tech (ORACLE_MF v1.24 — one home). */
  route: string;
  /**
   * Extra paths that answer to the same Astra. DOCUMENTATION ONLY — these are
   * mounted by hand in App.tsx, because several of them (/bling, /waves,
   * /oracle) are real pages with their own behaviour that a generated redirect
   * would shadow. Do not derive routes from this field.
   */
  aliases?: string[];
  /** How the route is served today — see AstraMount. */
  mount: AstraMount;
  /**
   * Constellation accent. Values taken verbatim from lib/surfaces.ts or
   * lib/astras/*.ts where one already existed; the rest are PROVISIONAL —
   * per-Astra accents are an MMF §15.1 / BRANDoSOPHIC item that has not been
   * canonized. Flagged in the FRONT21 report; safe to overwrite wholesale.
   */
  accent: string;
  /** true = derived this pass from a tree/rail source, not yet in canon v1. */
  derived?: boolean;
}

export const ASTRA_CATEGORY_LABEL: Record<AstraCategory, string> = {
  core:       'Core / Substrate',
  economy:    'Economy',
  knowledge:  'Knowledge',
  connection: 'Connection',
  do:         'Do',
  governance: 'Governance',
  security:   'Security',
};

export const ASTRA_STATUS_COLOR: Record<AstraStatus, { bg: string; text: string }> = {
  live:        { bg: '#16a34a', text: '#ffffff' }, // green-600
  scaffolded:  { bg: '#eab308', text: '#000000' }, // yellow-500
  deferred:    { bg: '#9ca3af', text: '#000000' }, // gray-400
  'post-Swarm':{ bg: '#4b5563', text: '#ffffff' }, // gray-600
};

// 40 Astras. Status field reflects canon-stated status; runtime
// cross-reference with ASTRA_REGISTRY upgrades to 'live' when hosts intersect.
export const ASTRA_CATALOG: AstraCatalogEntry[] = [
  // ─── Core (3) ───────────────────────────────────────────────────────
  { slug: 'atlasoracle',   wordmark: 'here24',          category: 'core', hosts: ['AtlasOracle.to', 'here24.tech', 'h24.tech'], status: 'scaffolded', director: 'Ryan Matta', description: 'AI router/dispatcher — every Astra calls here24 for AI features.', route: '/h24', aliases: ['/here24', '/oracle'], mount: 'page', accent: '#8B7FD4' },
  { slug: 'exchange',      wordmark: 'The Exchange',    category: 'core', hosts: ['freedomplatform.app'],                status: 'deferred',                              description: 'Cross-spine timeslot coordination — OFFER and GET time.', route: '/exchange', mount: 'stub', accent: '#4A6E96' },
  { slug: 'fnulnu',        wordmark: 'fnulnu',          category: 'core', hosts: ['fnulnu.store'],                       status: 'deferred',  director: 'FNU LNU (Butch)',description: 'Identity / Bee atomic substrate.', route: '/fnulnu', mount: 'stub', accent: '#E8B86E' },

  // ─── Economy (9) ────────────────────────────────────────────────────
  { slug: 'freedomblings', wordmark: 'FreedomBLiNGs',   category: 'economy', hosts: ['FreedomBLiNGs.com'],                                       status: 'scaffolded', director: 'Owen Benjamin', description: 'BLiNG! ledger + bonding curve + sovereign wallet.', route: '/freedomblings', aliases: ['/bling'], mount: 'page', accent: '#FAD15E' },
  { slug: 'waggles',       wordmark: 'Waggles',         category: 'economy', hosts: ['Waggles.app'],                                             status: 'scaffolded',                            description: 'Peer-to-peer BLiNG! transfer surface.', route: '/waggles', mount: 'stub', accent: '#F2B705' },
  { slug: 'bazaar',        wordmark: 'Bazaar',          category: 'economy', hosts: ['rebelution.store', 'Entertheprize.com'],                   status: 'scaffolded',                            description: 'Where Bees OFFER and GET Bee-listed goods.', route: '/bazaar', mount: 'page', accent: '#7F1D1D' },
  { slug: 'crowdfunding',  wordmark: 'Crowdfunding',    category: 'economy', hosts: ['rebelution.ing', 'Fountainheadcafe.com'],                  status: 'scaffolded',                            description: 'Campaign funding via BLiNG! pledges.', route: '/fund', mount: 'page', accent: '#16A34A' },
  { slug: 'proservices',   wordmark: 'Pro Services',    category: 'economy', hosts: ['rebelution.pro', 'AtlasINDUSTRY.com'],                     status: 'scaffolded',                            description: 'Professional services directory — OFFER and GET skilled work.', route: '/proservices', mount: 'stub', accent: '#8A94A0' },
  { slug: 'realestatetrust', wordmark: 'Real Estate Trust', category: 'economy', hosts: ['newrebelution.dev', 'atlasRESIDENTIAL.com'],            status: 'deferred',                              description: 'Real-estate-backed trust instruments.', route: '/realestate', mount: 'stub', accent: '#6B8E6B' },
  { slug: 'advertising',   wordmark: 'atlasADs',        category: 'economy', hosts: ['newrebelution.biz', 'atlasADs.biz'],                       status: 'deferred',                              description: 'Astra-aware advertising network.', route: '/promotion', mount: 'page', accent: '#E8A838' },
  { slug: 'honeypot',      wordmark: 'HoneyPOT',        category: 'economy', hosts: ['newHoneyPOT.fund'],                                        status: 'deferred',                              description: 'Threat-detection bounty pool funding.', route: '/honeypot', mount: 'stub', accent: '#D98E04' },
  { slug: 'beehold',       wordmark: 'BeeHold',         category: 'economy', hosts: [],                                                          status: 'post-Swarm',                            description: 'Bee life-insurance instrument.', route: '/beehold', mount: 'stub', accent: '#8A94A0' },

  // ─── Knowledge (6) ──────────────────────────────────────────────────
  { slug: 'themanual',     wordmark: 'The Manual',      category: 'knowledge', hosts: ['TheMANUAL.tech'],                                        status: 'live',       director: 'Harrison Smith',  description: 'Knowledge spine + Discovery Ladder.', route: '/manual', mount: 'page', accent: '#C8D1DA' },
  { slug: 'forum',         wordmark: 'Forum',           category: 'knowledge', hosts: ['rebelution.fyi', 'atlasINTEL.fyi'],                      status: 'scaffolded', director: 'Edward Snowden',  description: 'Threaded discussion + INTEL surface.', route: '/intel', mount: 'page', accent: '#1D9BF0' },
  { slug: 'learning',      wordmark: 'Learning',        category: 'knowledge', hosts: ['rebelution.you', 'atlasENLIGHTENED.com'],                status: 'scaffolded',                              description: 'Course + curriculum surface.', route: '/learning', mount: 'stub', accent: '#E88938' },
  { slug: 'memories',      wordmark: 'Memories',        category: 'knowledge', hosts: [],                                                        status: 'deferred',                                description: 'Long-form Bee memoirs + family archive.', route: '/memories', mount: 'stub', accent: '#B08968' },
  { slug: 'aitours',       wordmark: 'AI Tours',        category: 'knowledge', hosts: ['FredomRINGs.online'],                                    status: 'scaffolded', director: 'Ryan Dawson',     description: 'Pre-launch AI-curated tour engine.', route: '/tours', mount: 'stub', accent: '#57B17C' },
  // DERIVED — workspace tree freedomofthe.press (Next.js /press flyer-ad
  // storefront, live Supabase reads, multi-domain middleware). Not in canon v1.
  { slug: 'press',         wordmark: 'Freedom of the Press', category: 'knowledge', hosts: ['freedomofthe.press', '406flyer.com'],               status: 'scaffolded',                              description: 'Regional flyer-ad editions — the /press storefront.', route: '/press', mount: 'stub', accent: '#2F4858', derived: true },

  // ─── Connection (12) ────────────────────────────────────────────────
  { slug: 'groups',        wordmark: 'Groups',          category: 'connection', hosts: ['rebelution.org', 'atlasnation.com'],                    status: 'scaffolded',                              description: 'Manual Groups browser + Group pages.', route: '/unite', mount: 'page', accent: '#7C3AED' },
  { slug: 'events',        wordmark: 'Events',          category: 'connection', hosts: ['rebelution.xyz', 'atlasUNITED.fyi'],                    status: 'scaffolded',                              description: 'Event listings + RSVP + check-in.', route: '/rule', mount: 'page', accent: '#F97316' },
  { slug: 'comms',         wordmark: 'Comms',           category: 'connection', hosts: ['rebelution.tech', 'atlasCOMMS.live'],                   status: 'scaffolded',                              description: 'DMs + Patchboard CHAT.', route: '/comms', mount: 'page', accent: '#9B7FC8' },
  { slug: 'feed',          wordmark: 'Feed',            category: 'connection', hosts: [],                                                       status: 'deferred',                                description: 'Per-Bee timeline aggregator.', route: '/feed', mount: 'stub', accent: '#5DA9E9' },
  { slug: 'pulse',         wordmark: 'Pulse',           category: 'connection', hosts: ['ThePulse'],                                             status: 'deferred',                                description: 'All-Astra activity feed.', route: '/pulse', mount: 'page', accent: '#DC2626' },
  { slug: 'dating',        wordmark: 'Dating',          category: 'connection', hosts: ['rebelution.love'],                                      status: 'deferred',                                description: 'Bee matchmaking surface.', route: '/dating', mount: 'stub', accent: '#E86A9B' },
  { slug: 'vr',            wordmark: 'VR / Metaverse',  category: 'connection', hosts: [],                                                       status: 'post-Swarm',                              description: 'Immersive metaverse hub.', route: '/vr', mount: 'stub', accent: '#7D5FFF' },
  { slug: 'gaming',        wordmark: 'Gaming',          category: 'connection', hosts: ['Blingster.org', 'TheHoneycomb.games'],                  status: 'scaffolded',                              description: 'BLiNG!-stakable games — TheTRIVIA and the arena.', route: '/gaming', mount: 'stub', accent: '#A855F7' },
  { slug: 'livevideo',     wordmark: 'Live Video Chat', category: 'connection', hosts: ['rebelution.icu', 'atlasLOUNGE.com'],                    status: 'deferred',                                description: 'Live streaming + lounge.', route: '/chat', mount: 'surface', accent: '#E88AB8' },
  { slug: 'freedomnetwork',wordmark: 'Freedom Network', category: 'connection', hosts: ['freedomnetwork.app'],                                   status: 'deferred',                                description: 'Live-news channel.', route: '/freedomnetwork', mount: 'stub', accent: '#C1440E' },
  { slug: 'genealogy',     wordmark: 'Genealogy',       category: 'connection', hosts: ['BeeGenie.family'],                                      status: 'deferred',                                description: 'Family tree + ancestry surface.', route: '/genealogy', mount: 'stub', accent: '#87A96B' },
  { slug: 'theranking',    wordmark: 'TheRanking',      category: 'connection', hosts: ['TheRanking.app'],                                       status: 'deferred',                                description: 'Hot-or-Not 2.0 (Bee-vetted lists).', route: '/theranking', mount: 'stub', accent: '#D4AF37' },

  // ─── Do (4) ─────────────────────────────────────────────────────────
  { slug: 'miniwaves',     wordmark: 'Tasks',           category: 'do', hosts: ['MiniWAVES.app'],                                                status: 'live',                                    description: 'Mode of Operations — task manager (live).', route: '/miniwaves', aliases: ['/waves'], mount: 'page', accent: '#0EA5E9' },
  { slug: 'production',    wordmark: 'Production',      category: 'do', hosts: [],                                                               status: 'deferred',                                description: 'Long-form production pipeline.', route: '/production', mount: 'surface', accent: '#8A94A0' },
  { slug: 'brandosophic',  wordmark: 'BRANDoSOPHIC',    category: 'do', hosts: ['BRANDoSOPHIC.com', 'rebelution.site'],                          status: 'scaffolded',                              description: 'Brand-design + identity surface.', route: '/brand', mount: 'page', accent: '#6E1423' },
  { slug: 'safetycheck',   wordmark: 'Safety Check',    category: 'do', hosts: ['Takefiveforsafety.com', 'Safetymeeting.tech', 'Safetymeeting.ai'], status: 'deferred',                            description: 'Partner co-brand safety meetings.', route: '/safetycheck', mount: 'stub', accent: '#6FCF8F' },

  // ─── Governance (5) ─────────────────────────────────────────────────
  { slug: 'voting',        wordmark: 'Voting',          category: 'governance', hosts: ['rebelution.online', 'atlasVOTE.org'],                   status: 'scaffolded',                              description: 'On-platform Bee voting.', route: '/vote', mount: 'surface', accent: '#FAD15E' },
  { slug: 'therank',       wordmark: 'TheRANK',         category: 'governance', hosts: ['TheRank.site'],                                         status: 'scaffolded',                              description: '33-rank engine + identity reputation.', route: '/therank', mount: 'stub', accent: '#F2C14E' },
  { slug: 'legalservices', wordmark: 'Legal Services',  category: 'governance', hosts: ['rebelution.info', 'AtlasADVOCATE.com'],                 status: 'deferred',                                description: 'Legal services directory for Bees.', route: '/legal', mount: 'surface', accent: '#C94C4C' },
  { slug: 'willtestament', wordmark: 'Will & Testament',category: 'governance', hosts: ['FinalWaggle.com'],                                      status: 'deferred',                                description: 'Estate + final-wishes management.', route: '/willtestament', mount: 'stub', accent: '#7A6C5D' },
  // DERIVED — workspace tree REBELUTION.org + rail canon JMF v0.3–v0.5
  // ("justice_* LIVE", commit 08074d0). Not in canon v1.
  // JMF v0.8 (owner, 2026-08-13): the project is Justice; the old name is retired
  // and NO Justice URL exists or may be written — hence `hosts: []`, not a domain.
  { slug: 'justice',       wordmark: 'Justice',         category: 'governance', hosts: [],                                                       status: 'scaffolded',                              description: 'Case record + accountability spine (justice_* tables live).', route: '/justice', mount: 'stub', accent: '#B23A48', derived: true },

  // ─── Security (1) ───────────────────────────────────────────────────
  { slug: 'dingleberry',   wordmark: 'Security',          category: 'security', hosts: ['DingleBERRY.tech', 'beeSECURE.dev', 'beeSafe.dev', 'DiEphone.app', 'SoSphone.app', 'MAYDAYphone.app', 'Minutemen.app'], status: 'post-Swarm', description: 'Consolidated surveillance + safety tools.', route: '/dingleberry', mount: 'page', accent: '#DC2626' },
];

// ─── Constellation hubs (NOT Astras) ─────────────────────────────────
export interface ConstellationHub {
  constellation: string;
  hub_domain: string;
  wordmark: string;
  director?: string;
}

export const CONSTELLATION_HUBS: ConstellationHub[] = [
  { constellation: 'HONEYCOMB',   hub_domain: 'HoneyComb.global',         wordmark: 'HoneyComb',   director: 'Whitney Web' },
  { constellation: 'Rebelution',  hub_domain: 'rebelution.app',           wordmark: 'Rebelution' },
  { constellation: 'AtlasNation', hub_domain: 'CivilizationUniverse.com', wordmark: 'AtlasNation' },
];

// ─── Lookups + routing helpers (FRONT21) ─────────────────────────────

export const ASTRA_BY_SLUG = new Map(ASTRA_CATALOG.map((a) => [a.slug, a]));
export const ASTRA_BY_ROUTE = new Map(ASTRA_CATALOG.map((a) => [a.route, a]));

/**
 * Entries whose route FRONT21 generates. 'page' and 'surface' entries already
 * resolve — generating a stub for them would shadow the real thing, so they
 * are excluded here rather than filtered at the router.
 */
export const ASTRA_STUB_ENTRIES: AstraCatalogEntry[] = ASTRA_CATALOG.filter(
  (a) => a.mount === 'stub',
);

// ─── Runtime effective status ────────────────────────────────────────
// Cross-references the canon-stated status with ASTRA_REGISTRY: if any
// host in ASTRA_REGISTRY's configs matches any host on this Astra, mark
// it 'live' regardless of canon status (AstraConfig present = renderable).
export function effectiveStatus(entry: AstraCatalogEntry): AstraStatus {
  if (entry.status === 'live') return 'live';
  const liveHosts = new Set(
    ASTRA_REGISTRY.flatMap((p) => p.hosts.map((h) => h.toLowerCase())),
  );
  const intersects = entry.hosts.some((h) => liveHosts.has(h.toLowerCase()));
  return intersects ? 'live' : entry.status;
}

export function groupByCategory(): Array<{ category: AstraCategory; entries: AstraCatalogEntry[] }> {
  const order: AstraCategory[] = ['core', 'knowledge', 'economy', 'connection', 'do', 'governance', 'security'];
  return order.map((cat) => ({
    category: cat,
    entries: ASTRA_CATALOG.filter((e) => e.category === cat),
  }));
}
