/* DingleBERRY Command Center — MOCK DATA (extracted verbatim from the design).
   This is the canned data the screens render today. Swap each export for a live
   Supabase query/RPC per README-WIRING-MAP.md. Shapes are the contract (see contract.ts). */

// --- S01-InfraHealth :: SERVICES ---
export const SERVICES_S1 = [
  ['Ledger', 'Spine', 'writes/s', '4.1k', 'Supabase · pg'],
  ['Identity', 'Spine', 'p95', '22ms', 'Supabase · auth'],
  ['Canon', 'Spine', 'reads/s', '8.0k', 'Railway'],
  ['Source', 'Spine', 'lag', '0.4s', 'Railway'],
  ['Treasury', 'Spine', 'flow', 'ok', 'Supabase · pg'],
  ['BLiNG!', 'Astras', 'secured', '1.2M', 'bling'],
  ['Intel', 'Astras', 'feeds', '240', 'intel'],
  ['Unite', 'Astras', 'groups', '1.1k', 'unite'],
  ['Manual', 'Astras', 'edits', '64', 'manual'],
  ['Justice', 'Astras', 'cases', '318', 'legal'],
  ['Vault', 'Astras', 'p95', '31ms', 'secure'],
  ['Comms', 'Astras', 'msgs', '9.2k', 'comms'],
  ['Vote', 'Astras', 'tallies', 'live', 'vote'],
  ['Edge CDN', 'Mesh muscle', 'hit', '98%', '1,204 nodes'],
  ['Mesh Relay', 'Mesh muscle', 'drop', '0.3%', '988 relays'],
  ['Public-good Compute', 'Mesh muscle', 'jobs', '312', 'sandboxed'],
  ['Member Storage', 'Mesh muscle', 'proofs', '100%', '1,678 nodes'],
] as const;

// --- S01-InfraHealth :: STATE ---
export const STATE_S1 = {
  secure: { warn: [], crit: [] },
  degraded: { warn: [6, 14, 16], crit: [] },
  critical: { warn: [6, 16, 5], crit: [3, 14] },
} as const;

// --- S02-TransactionSecurity :: STREAM ---
export const STREAM_S2 = [
  {
    hash: '0x7f3a…be21',
    amt: '+12,400',
    kind: 'affiliate_distribute',
    tag: 'freed',
    from: 'Well',
    to: 'a91f',
  },
  {
    hash: '0x91c0…4d17',
    amt: '+5,000',
    kind: 'Drops / Drips',
    tag: 'freed',
    from: 'Well',
    to: '77b2',
  },
  {
    hash: '0x2ee8…a0f3',
    amt: '−820',
    kind: 'demurrage pull',
    tag: 'pull',
    from: 'c14d',
    to: 'Well',
  },
  {
    hash: '0x4b71…12cc',
    amt: '+3,200',
    kind: 'AtlasOracle credit',
    tag: 'freed',
    from: 'Well',
    to: 'e302',
  },
  {
    hash: '0xd0a4…77fe',
    amt: '1,024',
    kind: 'member transfer',
    tag: 'p2p',
    from: 'aa19',
    to: 'f8c1',
  },
  { hash: '0x8c55…3b90', amt: '+640', kind: 'HoneyPOT', tag: 'freed', from: 'Well', to: '6d7e' },
] as const;

// --- S02-TransactionSecurity :: ANOMALIES ---
export const ANOMALIES_S2 = [
  {
    id: 'LDG-3391',
    sev: 'critical',
    kind: 'Fiat → BLiNG! exchange brokered on-platform',
    detail: 'an account was credited BLiNG! against an incoming fiat payment',
    entry: '0x4f2c…91ad',
    amt: '8,800',
    status: 'held',
    check: 'Path A invariant · no-exchange rule',
    oracle:
      'Under Path A the platform never sells BLiNG! — it is only ever earned and freed from the Well. A fiat-for-BLiNG! credit cannot be legitimate, so its mere appearance is the alarm. Held; nothing settled.',
  },
  {
    id: 'LDG-3390',
    sev: 'critical',
    kind: 'Unsanctioned freeing',
    detail: 'total_supply rose with no sanctioned path behind it',
    entry: '0x77be…02e1',
    amt: '50,000',
    status: 'held',
    check: 'Freeing-path attestation',
    oracle:
      'New BLiNG! appeared without a sanctioned freeing path attached. Every increase in total_supply must trace to Drops/Drips, affiliate_distribute, AtlasOracle credit or HoneyPOT. This one does not — held pending trace.',
  },
  {
    id: 'LDG-3387',
    sev: 'watch',
    kind: 'Demurrage not applied',
    detail: 'a tier-2 cohort skipped its 5% demurrage cycle',
    entry: '0x3a90…ccf2',
    amt: '—',
    status: 'review',
    check: 'Demurrage scheduler audit',
    oracle:
      'Fibonacci demurrage (8/5/3/1% by tier) should pull continuously. A tier-2 batch missed a cycle — likely a scheduler hiccup, not theft, but balances are drifting above where the model wants them.',
  },
  {
    id: 'LDG-3361',
    sev: 'watch',
    kind: 'Hard-cap proximity',
    detail: 'a queued freeing would push total_supply across the cap',
    entry: '0x0b1e…ffa7',
    amt: '120',
    status: 'held',
    check: 'Cap guard · 111,222,333,333,222,111',
    oracle:
      'A pending freeing would breach the palindrome hard cap. The cap guard held it — the Well cannot over-free. Trim the event or let demurrage make room first.',
  },
] as const;

// --- S02-TransactionSecurity :: ANOM_BY_POSTURE ---
export const ANOM_BY_POSTURE_S2 = {
  secure: [],
  degraded: ['LDG-3387', 'LDG-3361'],
  critical: ['LDG-3391', 'LDG-3390', 'LDG-3387', 'LDG-3361'],
} as const;

// --- S03-SourceVerification :: SOURCES ---
export const SOURCES_S3 = [
  {
    id: 'SRC-0412',
    handle: 'treasury-filings',
    kind: 'Primary document feed',
    status: 'sourced',
    cred: 98,
    depth: 5,
    last: '2m',
    str: { e: 5, f: 4, t: 3 },
  },
  {
    id: 'SRC-0901',
    handle: 'court-records',
    kind: 'Public record',
    status: 'sourced',
    cred: 96,
    depth: 5,
    last: '1h',
    str: { e: 5, f: 3, t: 3 },
  },
  {
    id: 'SRC-1180',
    handle: 'wire-desk',
    kind: 'News wire',
    status: 'accepted',
    cred: 88,
    depth: 4,
    last: '8m',
    str: { e: 3, f: 3, t: 2 },
  },
  {
    id: 'SRC-0733',
    handle: 'field-witness-07',
    kind: 'First-person account',
    status: 'accepted',
    cred: 81,
    depth: 3,
    last: '15m',
    str: { e: 2, f: 1, t: 4 },
  },
  {
    id: 'SRC-1902',
    handle: 'analyst-collective',
    kind: 'Pattern analysis',
    status: 'emerging',
    cred: 64,
    depth: 2,
    last: '22m',
    str: { e: 1, f: 1, t: 2 },
  },
  {
    id: 'SRC-2140',
    handle: 'masked-tipster',
    kind: 'Anonymous tip',
    status: 'fringe',
    cred: 31,
    depth: 1,
    last: 'now',
    flag: 'Chain broken at primary',
    str: { e: 1, f: 0, t: 1 },
  },
  {
    id: 'SRC-2255',
    handle: 'throwaway-9f',
    kind: 'Unverified handle',
    status: 'unsourced',
    cred: 9,
    depth: 0,
    last: '5m',
    str: { e: 0, f: 0, t: 0 },
  },
] as const;

// --- ThreatInterception :: THREATS ---
export const THREATS_ThreatInterception = [
  {
    id: 'THR-0884',
    name: 'Crypto-miner injected in shared CDN dependency',
    kind: 'malware',
    sev: 'critical',
    status: 'intercepted',
    target: 'member surface · @driftwood-bee',
    origin: 'supply chain — compromised dependency (mesh-utils@4.2.1)',
    affected: 1204,
    sample: ['a9', '3e', '7f', 'c1'],
    plain:
      'A package thousands of member surfaces depend on was hijacked. The update silently mines in every visitor’s browser — stealing their CPU and battery, and risking a browser-store flag.',
    fix: 'Pin mesh-utils to 4.1.9, purge the poisoned build, add a Content-Security-Policy that blocks the miner pool.',
    justice: true,
  },
  {
    id: 'THR-0911',
    name: 'Zero-click surveillance implant',
    kind: 'surveillance',
    sev: 'critical',
    status: 'quarantined',
    target: 'member device · @larkspur-bee',
    origin: 'zero-click — malicious dispatch link',
    affected: 3,
    sample: ['b2', 'd4', '8a'],
    plain:
      'A no-interaction spyware implant that reads messages, location and the mic. DingleBERRY caught its outbound beacon and isolated the device before exfiltration completed.',
    fix: 'Force-revoke the implant’s tokens, rebuild the device from a clean image, rotate the member’s credentials.',
    justice: true,
  },
  {
    id: 'THR-0852',
    name: 'Stalkerware masquerading as a battery optimizer',
    kind: 'stalkerware',
    sev: 'critical',
    status: 'quarantined',
    target: 'member device · @ledger-bee',
    origin: 'sideloaded package from a lookalike store',
    affected: 27,
    sample: ['e3', '1c', 'f7'],
    plain:
      'An app posing as a battery optimizer that silently tracks location and reads messages. Signature-matched to a known stalkerware family; 27 members have it installed.',
    fix: 'Walk each member through safe removal, block the publisher signature mesh-wide.',
    justice: true,
  },
  {
    id: 'THR-0790',
    name: 'Credential-stealer browser extension',
    kind: 'spyware',
    sev: 'watch',
    status: 'intercepted',
    target: 'member browser',
    origin: 'malicious extension update',
    affected: 42,
    sample: ['7b', '2d'],
    plain:
      'A once-clean extension pushed an update that scrapes form fields and session tokens. Caught on first exfil attempt.',
    fix: 'Auto-disable the extension for affected members, invalidate captured sessions.',
    justice: false,
  },
  {
    id: 'THR-0741',
    name: 'Sandbox-escape attempt on compute node',
    kind: 'malware',
    sev: 'watch',
    status: 'blocked',
    target: 'mesh · public-good compute',
    origin: 'hijacked charitable job payload',
    affected: 0,
    sample: [],
    plain:
      'A borrowed-compute job tried to break its sandbox to join a botnet. Contained instantly — results are charitable and never touch platform ops, so no comb impact.',
    fix: 'Kill the job, flag the submitting node, tighten the seccomp profile.',
    justice: false,
  },
  {
    id: 'THR-0688',
    name: 'Phishing kit cloning the BLiNG! sign-in',
    kind: 'phishing',
    sev: 'watch',
    status: 'taken down',
    target: 'members',
    origin: 'lookalike domain (bl1ng-pay.example)',
    affected: 18,
    sample: ['9f', 'a0'],
    plain:
      'A pixel-perfect clone of the BLiNG! login harvesting credentials. DingleBERRY flagged the domain and triggered takedown.',
    fix: 'Blocklist the domain mesh-wide, warn the 18 members who clicked, force a credential reset.',
    justice: true,
  },
] as const;

// --- ShillDetection :: RINGS ---
export const RINGS_ShillDetection = [
  {
    id: 'AFFIL-0050',
    sev: 'critical',
    name: 'Affiliate fraud ring',
    actors: 22,
    sim: 0.93,
    astra: 2,
    status: 'frozen',
    target: 'inflating an upline’s 5/3/2/1/1 cascade with fake signups + bot engagement',
    justice: false,
    payout: true,
    signals: [
      ['Referral-chain shape anomaly', 0.95],
      ['Signup-velocity burst', 0.9],
      ['Engagement is synthetic (bot)', 0.88],
      ['Device / fingerprint overlap', 0.83],
      ['Shared funding path', 0.7],
    ],
    oracle:
      'A manufactured downline — 22 fake Bees funnelling affiliate weight to one upline. DingleBERRY froze the chain BEFORE affiliate_distribute could free a pool from the Well, so no fraudulent BLiNG! was minted. There’s no standing gate; this freeze is the affiliate-integrity mechanism.',
  },
  {
    id: 'SHILL-0042',
    sev: 'critical',
    name: 'Coordinated boost ring',
    actors: 18,
    sim: 0.91,
    astra: 3,
    status: 'throttled',
    target: 'amplifying a single accountability case to fake momentum',
    justice: true,
    signals: [
      ['Post-timing correlation', 0.94],
      ['Phrasing similarity (cosine)', 0.91],
      ['Shared funding path', 0.88],
      ['Account-age clustering', 0.82],
      ['Device / fingerprint overlap', 0.6],
    ],
    oracle:
      '18 accounts across 3 Astra are boosting one case in lockstep — same phrasing, same 4-second windows, funded from one treasury path. Throttled their reach; the case’s real signal is preserved.',
  },
  {
    id: 'SHILL-0039',
    sev: 'watch',
    name: 'Sockpuppet cluster',
    actors: 9,
    sim: 0.84,
    astra: 2,
    status: 'flagged',
    target: 'astroturfing a product narrative',
    justice: false,
    signals: [
      ['Phrasing similarity (cosine)', 0.84],
      ['Account-age clustering', 0.79],
      ['Shared IP block', 0.71],
      ['Post-timing correlation', 0.55],
    ],
    oracle:
      'Nine puppets with near-identical bios pushing the same narrative. Medium confidence — flagged for review before any throttle.',
  },
  {
    id: 'SHILL-0035',
    sev: 'watch',
    name: 'Review brigade',
    actors: 24,
    sim: 0.78,
    astra: 1,
    status: 'flagged',
    target: 'mass-downvoting a named entity',
    justice: true,
    signals: [
      ['Action-timing correlation', 0.86],
      ['Account-age clustering', 0.74],
      ['Phrasing similarity (cosine)', 0.62],
    ],
    oracle:
      '24 accounts piling negative actions onto one entity in a burst. Looks coordinated; held for a human call given the entity is a named party.',
  },
  {
    id: 'SHILL-0028',
    sev: 'watch',
    name: 'Wash-trading ring',
    actors: 6,
    sim: 0.88,
    astra: 1,
    status: 'flagged',
    target: 'cycling BLiNG! between own accounts to fake volume',
    justice: false,
    signals: [
      ['Transaction-graph cycles', 0.93],
      ['Shared funding path', 0.9],
      ['Account-age clustering', 0.7],
    ],
    oracle:
      'Six accounts passing the same value in a closed loop to inflate apparent volume. Cross-checked with the ledger watch — referred to Transaction security.',
  },
  {
    id: 'SHILL-0011',
    sev: 'info',
    name: 'Bot amplification',
    actors: 140,
    sim: 0.69,
    astra: 4,
    status: 'watching',
    target: 'low-effort engagement padding',
    justice: false,
    signals: [
      ['Post-timing correlation', 0.72],
      ['Device / fingerprint overlap', 0.66],
      ['Phrasing similarity (cosine)', 0.61],
    ],
    oracle:
      'A large but low-confidence amplification swarm. Watching — not enough signal to act without catching real users.',
  },
] as const;

// --- DispatchAuth :: DISPATCHES ---
export const DISPATCHES_DispatchAuth = [
  {
    id: 'WAG-91c0',
    action: 'Reverse ledger entry LDG-3387',
    kind: 'ledger',
    actor: '@ledger-warden',
    disc: 'security',
    ar: 2,
    rr: 4,
    ring: 3,
    bling: '#1,204',
    ok: false,
    hash: '0x91c0…4d17',
    t: '2m',
    oracle:
      'A Security Scout (L2) tried to reverse a ledger write that needs a Sentinel (L4). Held — discipline rank gates it; standing alone can’t carry it.',
  },
  {
    id: 'WAG-d0a4',
    action: 'Treasury disbursement ◇ 50,000',
    kind: 'treasury',
    actor: '@combkeeper',
    disc: 'security',
    ar: 4,
    rr: 5,
    ring: 2,
    bling: '#88',
    ok: false,
    hash: '0xd0a4…77fe',
    t: '12m',
    oracle:
      'A Security Sentinel (L4) attempting a Guardian-level (L5) + admin treasury move — blocked one level short. Ring 2 standing is high, but rank gates the action.',
  },
  {
    id: 'WAG-7f3a',
    action: 'Quarantine node mq-7f3a',
    kind: 'mesh control',
    actor: '@nightwatch',
    disc: 'monitoring',
    ar: 4,
    rr: 4,
    ring: 2,
    bling: '#140',
    ok: true,
    hash: '0x7f3a…be21',
    t: 'now',
    oracle:
      'A monitoring Keeper (L4) issuing a quarantine — exactly the Keeper gate. Verified against bee_ranks, hash-chained, executed.',
  },
  {
    id: 'WAG-2ee8',
    action: 'Declare Go Dark (mesh blackout)',
    kind: 'emergency',
    actor: '@sentinel-prime',
    disc: 'monitoring',
    ar: 5,
    rr: 5,
    ring: 1,
    bling: '#12',
    ok: true,
    hash: '0x2ee8…a0f3',
    t: '4m',
    oracle:
      'A monitoring Steward (L5) + admin declaring Go Dark — the top gate. Authority provable; broadcast signed and logged as a hard action.',
  },
  {
    id: 'WAG-4b71',
    action: 'Grant Forager rank to a bee',
    kind: 'governance',
    actor: '@comb-steward',
    disc: 'security',
    ar: 5,
    rr: 4,
    ring: 1,
    bling: '#9',
    ok: true,
    hash: '0x4b71…12cc',
    t: '9m',
    oracle:
      'A Security Guardian (L5) performing a rank grant that needs Sentinel. Clean — logged to the grantee’s bee_ranks row.',
  },
  {
    id: 'WAG-8c55',
    action: 'Mute actor across 3 Astra',
    kind: 'moderation',
    actor: '@meshwarden',
    disc: 'monitoring',
    ar: 3,
    rr: 3,
    ring: 3,
    bling: '#420',
    ok: true,
    hash: '0x8c55…3b90',
    t: '18m',
    oracle: 'A monitoring Forager (L3) routine moderation within authority. Verified.',
  },
] as const;

// --- KarmaCredit :: SIGNALS ---
export const SIGNALS_KarmaCredit = [
  {
    key: 'standing',
    label: 'Earned standing',
    w: 0.24,
    hint: 'credibility the member has earned on the record',
  },
  {
    key: 'conduct',
    label: 'On-record conduct',
    w: 0.2,
    hint: 'history of filings, testimony, accepted evidence',
  },
  {
    key: 'shill',
    label: 'Distance from shill rings',
    w: 0.22,
    hint: 'graph distance to known coordinated clusters',
  },
  {
    key: 'ledger',
    label: 'Ledger integrity',
    w: 0.16,
    hint: 'clean BLiNG! flow — no wash loops or velocity bursts',
  },
  {
    key: 'maturity',
    label: 'Account maturity',
    w: 0.1,
    hint: 'age + sustained, non-bursty activity',
  },
  {
    key: 'dispatch',
    label: 'Dispatch authority record',
    w: 0.08,
    hint: 'rank-verified actions vs. failed rank checks',
  },
] as const;

// --- KarmaCredit :: ACTORS ---
export const ACTORS_KarmaCredit = [
  {
    id: '@comb-steward',
    rank: 'Security Guardian · L5',
    joined: '2y 4m',
    v: { standing: 0.95, conduct: 0.92, shill: 0.98, ledger: 0.9, maturity: 0.95, dispatch: 0.9 },
    note: 'Long-standing L5 with a clean record across every surface.',
  },
  {
    id: '@meshwarden',
    rank: 'Monitoring Forager · L3',
    joined: '11m',
    v: { standing: 0.8, conduct: 0.82, shill: 0.9, ledger: 0.78, maturity: 0.7, dispatch: 0.85 },
    note: 'Active monitor, strong record, mid-tenure.',
  },
  {
    id: '@forager-7f3a',
    rank: 'Forager · L1',
    joined: '6 days',
    v: { standing: 0.5, conduct: 0.6, shill: 0.85, ledger: 0.55, maturity: 0.15, dispatch: 0.3 },
    note: 'New account, thin record — nothing adverse, just unproven.',
  },
  {
    id: '@upline-0050',
    rank: 'Bee · unranked',
    joined: '3w',
    v: { standing: 0.35, conduct: 0.3, shill: 0.12, ledger: 0.2, maturity: 0.6, dispatch: 0.25 },
    note: 'Sits one hop from affiliate-fraud ring AFFIL-0050.',
  },
] as const;

// --- MemberMesh :: LAYERS ---
export const LAYERS_MemberMesh = [
  {
    key: 'storage',
    name: 'Member storage',
    icon: 'server',
    watch: 'proof-of-storage · heartbeat hash',
    heaviest: true,
  },
  {
    key: 'relay',
    name: 'Mesh relay',
    icon: 'network',
    watch: 'drop rate · latency · routing',
    goDark: true,
  },
  { key: 'cdn', name: 'Edge CDN', icon: 'globe', watch: 'served bytes vs. content hash' },
  { key: 'compute', name: 'Public-good compute', icon: 'cpu', watch: 'sandbox escape · hijack' },
] as const;

// --- MemberMesh :: NODES ---
export const NODES_MemberMesh = {
  storage: [
    {
      id: 'mq-7f3a',
      score: 11,
      st: 'critical',
      region: 'eu-west',
      note: 'withholding · self-heal rebuilding',
    },
    { id: 'st-3b1c', score: 99, st: 'secure', region: 'eu-west', note: 'all challenges passed' },
    { id: 'st-9f04', score: 97, st: 'secure', region: 'us-east', note: 'all challenges passed' },
    { id: 'st-2e8f', score: 78, st: 'watch', region: 'us-west', note: '1 slow proof response' },
    { id: 'st-7a21', score: 94, st: 'secure', region: 'ap-south', note: 'all challenges passed' },
  ],
  relay: [
    { id: 'rl-3e91', score: 88, st: 'watch', region: 'eu-west', note: 'drop rate elevated' },
    { id: 'rl-1c2d', score: 98, st: 'secure', region: 'us-east', note: 'routing nominal' },
    { id: 'rl-8b40', score: 96, st: 'secure', region: 'ap-south', note: 'routing nominal' },
    { id: 'rl-6f17', score: 95, st: 'secure', region: 'us-west', note: 'routing nominal' },
  ],
  cdn: [
    {
      id: 'cdn-5c1',
      score: 91,
      st: 'watch',
      region: 'eu-west',
      note: '1 tampered copy quarantined',
    },
    { id: 'cdn-9a4', score: 99, st: 'secure', region: 'us-east', note: 'hashes match' },
    { id: 'cdn-2b7', score: 98, st: 'secure', region: 'ap-south', note: 'hashes match' },
  ],
  compute: [
    { id: 'cmp-4a9', score: 84, st: 'watch', region: 'us-east', note: 'escape attempt blocked' },
    { id: 'cmp-7d2', score: 97, st: 'secure', region: 'eu-west', note: 'sandbox intact' },
    { id: 'cmp-1f6', score: 99, st: 'secure', region: 'us-west', note: 'sandbox intact' },
  ],
} as const;

// --- AtlasOracle :: QUEUE ---
export const QUEUE_AtlasOracle = [
  {
    surface: 'threat',
    tag: 'Threat',
    tone: 'critical',
    title: 'Crypto-miner in shared CDN dependency',
    sub: '1,204 members · supply chain',
  },
  {
    surface: 'shill',
    tag: 'Shill',
    tone: 'critical',
    title: 'Affiliate fraud ring — frozen',
    sub: 'before affiliate_distribute',
  },
  {
    surface: 'source',
    tag: 'Source',
    tone: 'watch',
    title: 'Source #2140 chain broken',
    sub: 're-rank required',
  },
  {
    surface: 'txn',
    tag: 'Ledger',
    tone: 'watch',
    title: 'Velocity spike held',
    sub: '40× baseline · review',
  },
] as const;

// --- JusticeHandoff :: EVIDENCE ---
export const EVIDENCE_JusticeHandoff = [
  {
    icon: 'ban',
    label: 'Malware payload',
    v: 'crypto-miner · hash 0x4f2c…91ad',
    note: 'isolated sample',
  },
  {
    icon: 'gitBranch',
    label: 'Origin chain',
    v: 'mesh-utils@4.2.1 · maintainer account hijacked',
    note: 'provenance traced',
  },
  {
    icon: 'users',
    label: 'Affected members',
    v: '1,204 member sites served the payload',
    note: 'the eligible class',
  },
  {
    icon: 'clock',
    label: 'Timeline',
    v: 'injected 6d ago · detected + blocked today',
    note: 'with timestamps',
  },
] as const;

// --- GoDark :: the blackout-protocol monitor (six panels) ---
// Posture-keyed live telemetry per §3 mapping: secure→Secure · degraded→Degraded
// (brownout, queue holding) · critical→Dark (blackout, drain live). Episodes +
// ceremony are posture-invariant.
export const GODARK_GoDark = {
  byPosture: {
    // ---- SECURE — spine reachable, nothing queued, console idle ----
    secure: {
      state: 'secure',
      depth: null,
      entryMode: null,
      timeInState: '—',
      heartbeat: {
        spineReachable: true,
        missedBeats: 0,
        threshold: 5,
        windowSec: 10,
        consensusNodes: 4182,
        consensusPct: 99,
        beat: 'steady',
      },
      queue: {
        depth: 0,
        byType: [],
        oldestIntentAge: '—',
        replicationFactor: 3,
        replicationPct: 100,
      },
      reconcile: {
        mode: 'idle',
        lastSummary:
          '3,418 intents applied · 11 rejected · DROPS ◇1,240 paid · economy_integrity_check() PASSED',
        lastWhen: 'last episode GD-2026-0531 · 11 days ago',
        progress: 100,
        applied: 0,
        rejected: 0,
        rejections: [],
        integrityCheck: 'idle',
        drops: '◇0',
      },
    },
    // ---- DEGRADED — spine flaky, brownout, intents accumulating, drain on standby ----
    degraded: {
      state: 'degraded',
      depth: 'brownout',
      entryMode: 'derived',
      timeInState: 'live · 02:18',
      heartbeat: {
        spineReachable: true,
        missedBeats: 2,
        threshold: 5,
        windowSec: 10,
        consensusNodes: 4182,
        consensusPct: 71,
        beat: 'jittery',
      },
      queue: {
        depth: 1847,
        byType: [
          { type: 'member transfer', count: 902 },
          { type: 'Drops / Drips claim', count: 411 },
          { type: 'affiliate_distribute', count: 238 },
          { type: 'escrow open / release', count: 174 },
          { type: 'order-book offer', count: 122 },
        ],
        oldestIntentAge: '02:08',
        replicationFactor: 3,
        replicationPct: 96,
      },
      reconcile: {
        mode: 'holding',
        lastSummary:
          '3,418 intents applied · 11 rejected · DROPS ◇1,240 paid · economy_integrity_check() PASSED',
        lastWhen: 'last episode GD-2026-0531 · 11 days ago',
        progress: 0,
        applied: 0,
        rejected: 0,
        rejections: [],
        integrityCheck: 'pending',
        drops: '◇— (metering)',
      },
    },
    // ---- CRITICAL — spine RETURNED after a blackout: the drain is LIVE (the
    // dangerous moment). Drain == Reconciling (spec §5) — it cannot run while the
    // spine is gone, so this slice is reconciling-after-blackout, not pure Dark.
    // Pure Dark stays taught via Degraded's holding posture + the history episodes.
    critical: {
      state: 'reconciling',
      depth: 'blackout',
      entryMode: 'derived',
      timeInState: 'live · 02:12',
      heartbeat: {
        spineReachable: true,
        missedBeats: 0,
        threshold: 5,
        windowSec: 10,
        consensusNodes: 4182,
        consensusPct: 87,
        beat: 'jittery',
      },
      queue: {
        depth: 17842,
        byType: [
          { type: 'member transfer', count: 8021 },
          { type: 'Drops / Drips claim', count: 4198 },
          { type: 'affiliate_distribute', count: 2390 },
          { type: 'escrow open / release', count: 1844 },
          { type: 'order-book offer', count: 1389 },
        ],
        oldestIntentAge: '09:53',
        replicationFactor: 3,
        replicationPct: 92,
      },
      reconcile: {
        mode: 'draining',
        lastSummary:
          '3,418 intents applied · 11 rejected · DROPS ◇1,240 paid · economy_integrity_check() PASSED',
        lastWhen: 'last episode GD-2026-0531 · 11 days ago',
        progress: 63,
        applied: 30368,
        rejected: 412,
        rejections: [
          { reason: 'Insufficient last-confirmed balance', count: 198 },
          { reason: 'Nonce out of sequence (superseded)', count: 121 },
          { reason: 'Rank gate failed at apply-time', count: 54 },
          { reason: 'Sanctioned path / geo-block', count: 31 },
          { reason: 'Duplicate intent-id (peer replica)', count: 8 },
        ],
        integrityCheck: 'pending',
        drops: '◇18,402 (peer-attested)',
      },
    },
  },

  // ---- (5) dark history — attested post-mortems ----
  episodes: [
    // one suffered / Brownout
    {
      id: 'GD-2026-0531',
      onset: '2026-05-31 14:02 UTC',
      depth: 'brownout',
      entryMode: 'derived',
      duration: '11m 04s',
      trigger: 'Spine outage — Supabase primary region failover (ledger writes unreachable)',
      queuedIntents: 3429,
      applied: 3418,
      rejected: 11,
      rejectionDetail: '8 insufficient last-confirmed balance · 3 nonce-superseded',
      dropsPaid: '◇1,240',
      integrityResult: 'passed',
      consensusOnset: 'gossip consensus · 4,061 / 4,182 nodes within 9s',
      attestation: 'attested record GD-2026-0531 · signed by @sentinel-prime + 2 keyholders',
      notes:
        'App shell served throughout (brownout). Drain clean; conservation invariant held on exit.',
    },
    // one commanded
    {
      id: 'GD-2026-0419',
      onset: '2026-04-19 03:30 UTC',
      depth: 'brownout',
      entryMode: 'commanded',
      duration: '42m 11s',
      trigger: 'Commanded — emergency spine migration window (keyholder-armed defensive darken)',
      queuedIntents: 12880,
      applied: 12871,
      rejected: 9,
      rejectionDetail: '6 rank-gate failed at apply · 3 sanctioned-path',
      dropsPaid: '◇5,902',
      integrityResult: 'passed',
      consensusOnset: 'commanded entry — Waggle dispatch WAG-2ee8, 3 / 5 keyholders signed',
      attestation:
        'attested record GD-2026-0419 · Patchboard master switch · 3 keyholder sign-offs',
      notes:
        'Deliberate darken under master switch. Members saw the dark banner; migration completed; reconcile exact-once.',
    },
    // one suffered / Blackout
    {
      id: 'GD-2026-0212',
      onset: '2026-02-12 22:47 UTC',
      depth: 'blackout',
      entryMode: 'derived',
      duration: '1h 18m',
      trigger:
        'Hostile infrastructure event — upstream DNS + origin takedown attempt (center fully gone)',
      queuedIntents: 64402,
      applied: 63981,
      rejected: 421,
      rejectionDetail:
        '203 insufficient balance · 142 nonce-superseded · 58 rank-gate · 18 sanctioned-path',
      dropsPaid: '◇28,140',
      integrityResult: 'passed',
      consensusOnset: 'gossip consensus · 3,902 / 4,071 nodes within 14s',
      attestation:
        'attested record GD-2026-0212 · mesh-CDN served the app shell from member devices',
      notes:
        'Full blackout: the mesh served the app shell itself. Largest drain to date; exact-once held, zero double-spend.',
    },
  ],

  // ---- (6) commanded Go Dark — ceremony config (inert) ----
  ceremony: {
    masterSwitch: 'Patchboard · master Go-Dark switch',
    dispatch: 'Waggle dispatch → commanded Go Dark',
    rankGate: 'Monitoring Steward · L5 (+admin)',
    keyholdersRequired: 3,
    keyholdersTotal: 5,
    keyholdersLabel: '3 of 5 keyholders must sign',
    scenarios: [
      'Legal seizure attempt',
      'Hostile infrastructure event',
      'Emergency spine migration',
    ],
  },
} as const;
