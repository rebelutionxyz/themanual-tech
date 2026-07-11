// Canonical Astra catalog — mirrors shared/canon/astra-registry-canonical-v1.md.
// Single source of truth for HQ Astra Status section. When canon changes,
// update both files in parallel (no build-time derivation yet — future tooling).
//
// 38 Astras across 7 categories. Constellation hubs + director persona
// surfaces are NOT Astras and live in their own arrays below.

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

export interface AstraCatalogEntry {
  slug: string;
  wordmark: string;
  category: AstraCategory;
  hosts: string[];
  status: AstraStatus;
  director?: string;
  description: string;
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

// 38 Astras per canon v1. Status field reflects canon-stated status; runtime
// cross-reference with ASTRA_REGISTRY upgrades to 'live' when hosts intersect.
export const ASTRA_CATALOG: AstraCatalogEntry[] = [
  // ─── Core (3) ───────────────────────────────────────────────────────
  { slug: 'atlasoracle',   wordmark: 'AtlasORACLE',     category: 'core', hosts: ['AtlasOracle.to'],                     status: 'scaffolded', director: 'Ryan Matta',     description: 'AI router/dispatcher — every Astra calls AtlasORACLE for AI features.' },
  { slug: 'exchange',      wordmark: 'The Exchange',    category: 'core', hosts: ['freedomplatform.app'],                status: 'deferred',                              description: 'Cross-spine timeslot marketplace.' },
  { slug: 'fnulnu',        wordmark: 'fnulnu',          category: 'core', hosts: ['fnulnu.store'],                       status: 'deferred',  director: 'FNU LNU (Butch)',description: 'Identity / Bee atomic substrate.' },

  // ─── Economy (9) ────────────────────────────────────────────────────
  { slug: 'freedomblings', wordmark: 'FreedomBLiNGs',   category: 'economy', hosts: ['FreedomBLiNGs.com'],                                       status: 'scaffolded', director: 'Owen Benjamin', description: 'BLiNG! ledger + bonding curve + sovereign wallet.' },
  { slug: 'waggles',       wordmark: 'Waggles',         category: 'economy', hosts: ['Waggles.app'],                                             status: 'scaffolded',                            description: 'Peer-to-peer BLiNG! transfer surface.' },
  { slug: 'bazaar',        wordmark: 'Bazaar',          category: 'economy', hosts: ['rebelution.store', 'Entertheprize.com'],                   status: 'scaffolded',                            description: 'Marketplace for Bee-listed items.' },
  { slug: 'crowdfunding',  wordmark: 'Crowdfunding',    category: 'economy', hosts: ['rebelution.ing', 'Fountainheadcafe.com'],                  status: 'scaffolded',                            description: 'Campaign funding via BLiNG! pledges.' },
  { slug: 'proservices',   wordmark: 'Pro Services',    category: 'economy', hosts: ['rebelution.pro', 'AtlasINDUSTRY.com'],                     status: 'scaffolded',                            description: 'Professional services marketplace.' },
  { slug: 'realestatetrust', wordmark: 'Real Estate Trust', category: 'economy', hosts: ['newrebelution.dev', 'atlasRESIDENTIAL.com'],            status: 'deferred',                              description: 'Real-estate-backed trust instruments.' },
  { slug: 'advertising',   wordmark: 'atlasADs',        category: 'economy', hosts: ['newrebelution.biz', 'atlasADs.biz'],                       status: 'deferred',                              description: 'Astra-aware advertising network.' },
  { slug: 'honeypot',      wordmark: 'HoneyPOT',        category: 'economy', hosts: ['newHoneyPOT.fund'],                                        status: 'deferred',                              description: 'Threat-detection bounty pool funding.' },
  { slug: 'beehold',       wordmark: 'BeeHold',         category: 'economy', hosts: [],                                                          status: 'post-Swarm',                            description: 'Bee life-insurance instrument.' },

  // ─── Knowledge (5) ──────────────────────────────────────────────────
  { slug: 'themanual',     wordmark: 'The Manual',      category: 'knowledge', hosts: ['TheMANUAL.tech'],                                        status: 'live',       director: 'Harrison Smith',  description: 'Knowledge spine + Discovery Ladder.' },
  { slug: 'forum',         wordmark: 'Forum',           category: 'knowledge', hosts: ['rebelution.fyi', 'atlasINTEL.fyi'],                      status: 'scaffolded', director: 'Edward Snowden',  description: 'Threaded discussion + INTEL surface.' },
  { slug: 'learning',      wordmark: 'Learning',        category: 'knowledge', hosts: ['rebelution.you', 'atlasENLIGHTENED.com'],                status: 'scaffolded',                              description: 'Course + curriculum surface.' },
  { slug: 'memories',      wordmark: 'Memories',        category: 'knowledge', hosts: [],                                                        status: 'deferred',                                description: 'Long-form Bee memoirs + family archive.' },
  { slug: 'aitours',       wordmark: 'AI Tours',        category: 'knowledge', hosts: ['FredomRINGs.online'],                                    status: 'scaffolded', director: 'Ryan Dawson',     description: 'Pre-launch AI-curated tour engine.' },

  // ─── Connection (12) ────────────────────────────────────────────────
  { slug: 'groups',        wordmark: 'Groups',          category: 'connection', hosts: ['rebelution.org', 'atlasnation.com'],                    status: 'scaffolded',                              description: 'Manual Groups browser + Group pages.' },
  { slug: 'events',        wordmark: 'Events',          category: 'connection', hosts: ['rebelution.xyz', 'atlasUNITED.fyi'],                    status: 'scaffolded',                              description: 'Event listings + RSVP + check-in.' },
  { slug: 'comms',         wordmark: 'Comms',           category: 'connection', hosts: ['rebelution.tech', 'atlasCOMMS.live'],                   status: 'scaffolded',                              description: 'DMs + Patchboard CHAT.' },
  { slug: 'feed',          wordmark: 'Feed',            category: 'connection', hosts: [],                                                       status: 'deferred',                                description: 'Per-Bee timeline aggregator.' },
  { slug: 'pulse',         wordmark: 'Pulse',           category: 'connection', hosts: ['ThePulse'],                                             status: 'deferred',                                description: 'All-Astra activity feed.' },
  { slug: 'dating',        wordmark: 'Dating',          category: 'connection', hosts: ['rebelution.love'],                                      status: 'deferred',                                description: 'Bee matchmaking surface.' },
  { slug: 'vr',            wordmark: 'VR / Metaverse',  category: 'connection', hosts: [],                                                       status: 'post-Swarm',                              description: 'Immersive metaverse hub.' },
  { slug: 'gaming',        wordmark: 'Gaming',          category: 'connection', hosts: ['Blingster.org'],                                        status: 'scaffolded',                              description: 'BLiNG!-stakable games.' },
  { slug: 'livevideo',     wordmark: 'Live Video Chat', category: 'connection', hosts: ['rebelution.icu', 'atlasLOUNGE.com'],                    status: 'deferred',                                description: 'Live streaming + lounge.' },
  { slug: 'freedomnetwork',wordmark: 'Freedom Network', category: 'connection', hosts: ['freedomnetwork.app'],                                   status: 'deferred',                                description: 'Live-news channel.' },
  { slug: 'genealogy',     wordmark: 'Genealogy',       category: 'connection', hosts: ['BeeGenie.family'],                                      status: 'deferred',                                description: 'Family tree + ancestry surface.' },
  { slug: 'theranking',    wordmark: 'TheRanking',      category: 'connection', hosts: ['TheRanking.app'],                                       status: 'deferred',                                description: 'Hot-or-Not 2.0 (Bee-vetted lists).' },

  // ─── Do (4) ─────────────────────────────────────────────────────────
  { slug: 'miniwaves',     wordmark: 'MiNiWaVeS',       category: 'do', hosts: ['MiniWaves.app'],                                                status: 'live',                                    description: 'Mode of Operations — task manager (live).' },
  { slug: 'production',    wordmark: 'Production',      category: 'do', hosts: [],                                                               status: 'deferred',                                description: 'Long-form production pipeline.' },
  { slug: 'brandosophic',  wordmark: 'BRANDoSOPHIC',    category: 'do', hosts: ['BRANDoSOPHIC.com', 'rebelution.site'],                          status: 'scaffolded',                              description: 'Brand-design + identity surface.' },
  { slug: 'safetycheck',   wordmark: 'Safety Check',    category: 'do', hosts: ['Takefiveforsafety.com', 'Safetymeeting.tech', 'Safetymeeting.ai'], status: 'deferred',                            description: 'Partner co-brand safety meetings.' },

  // ─── Governance (4) ─────────────────────────────────────────────────
  { slug: 'voting',        wordmark: 'Voting',          category: 'governance', hosts: ['rebelution.online', 'atlasVOTE.org'],                   status: 'scaffolded',                              description: 'On-platform Bee voting.' },
  { slug: 'therank',       wordmark: 'TheRANK',         category: 'governance', hosts: ['TheRank.site'],                                         status: 'scaffolded',                              description: '33-rank engine + identity reputation.' },
  { slug: 'legalservices', wordmark: 'Legal Services',  category: 'governance', hosts: ['rebelution.info', 'AtlasADVOCATE.com'],                 status: 'deferred',                                description: 'Legal services marketplace.' },
  { slug: 'willtestament', wordmark: 'Will & Testament',category: 'governance', hosts: ['FinalWaggle.com'],                                      status: 'deferred',                                description: 'Estate + final-wishes management.' },

  // ─── Security (1) ───────────────────────────────────────────────────
  { slug: 'dingleberry',   wordmark: 'DingleBERRY',     category: 'security', hosts: ['DingleBERRY.tech', 'beeSECURE.dev', 'beeSafe.dev', 'DiEphone.app', 'SoSphone.app', 'MAYDAYphone.app', 'Minutemen.app'], status: 'post-Swarm', description: 'Consolidated surveillance + safety tools.' },
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
