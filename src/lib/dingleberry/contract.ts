/* ============================================================
   DingleBERRY Command Center — DATA CONTRACT
   ------------------------------------------------------------
   THE SEAM. Each screen consumes exactly one of these shapes and
   knows nothing about where the data came from. Today the shapes
   are filled by mock-data.ts; at wire-time you swap the provider
   in useDingleberryData.ts for live Supabase queries/RPCs — the
   screens never change because they only ever see these types.

   Wire order (see README-WIRING-MAP.md): S02 first (live backend
   exists), then S03 + Shill, then the mesh screens last.
   ============================================================ */

export type Posture = 'secure' | 'degraded' | 'critical';
export type Tone = 'secure' | 'watch' | 'critical' | 'info' | 'idle';

/* ---- S02 · TransactionSecurity ----  LIVE-WIRABLE TODAY
   Source: bling_system_state (reserve/treasury/total_supply/hard_cap),
   bling_transactions (stream), economy_integrity_check() + economy_integrity_log
   (anomalies / conservation verdict). This screen is a UI over the drain-model
   + conservation invariant shipped 2026-06-10. */
export interface LedgerEntry {
  hash: string; // tx hash / id  → bling_transactions.id
  amt: string; // signed, formatted  → amount (numeric(24,6))
  kind: string; // tx type  → bling_transactions.type (affiliate_distribute, …)
  tag: 'freed' | 'pull' | string; // freed = drains well; pull = refills
  from: string; // 'Well' | bee short-id
  to: string;
}
export interface LedgerAnomaly {
  id: string; // e.g. LDG-3391
  sev: 'critical' | 'warn' | string;
  kind: string; // human label, e.g. "Fiat → BLiNG! exchange brokered on-platform"
  detail: string;
  // S02 detail-panel fields — live: economy_integrity_log via the snapshot RPC;
  // mock: design data. Widened Step-3 so the page reads LedgerAnomaly directly
  // (the in-page S2Anomaly cast is retired).
  entry?: string; // offending ledger entry id / hash
  amt?: string; // formatted amount (STRING — never Number())
  status: 'held' | 'review' | string; // disposition
  check?: string; // which invariant caught it
  oracle?: string; // AtlasOracle assessment
  at?: string; // timestamp
}
export interface TransactionSecurityData {
  conservationOk: boolean; // economy_integrity_check().ok
  reserve: string; // bling_system_state.hard_cap-anchored well balance
  treasury: string;
  totalSupply: string;
  hardCap: string; // 111,222,333,333,222,111
  stream: LedgerEntry[]; // recent bling_transactions
  anomalies: LedgerAnomaly[]; // open integrity flags
  anomByPosture: Record<Posture, string[]>; // which anomaly ids show per posture
}

/* ---- S02 LIVE (Step-3) — dingleberry_s02_snapshot() RPC (SECURITY DEFINER,
   admin-gated, read-only). Carried on the DingleBERRY context, NOT the shared
   mock snapshot: S02 follows its own DERIVED posture (§6.6.4) + a live/error
   status, while the global mock PostureSwitcher keeps driving the other screens.
   CRITICAL: totalSupply / hardCap / amounts are STRINGS (the Sacred Sum exceeds
   JS safe integers) — display verbatim, never Number() them. pct is numeric. */
export interface S02Live {
  status: 'loading' | 'live' | 'unavailable';
  errorCode?: string; // postgrest code, e.g. '42501' (operator role required)
  errorMessage?: string;
  posture: Posture; // DERIVED: any critical → critical · any watch → degraded · else secure
  securedToday: string;
  demurrage24h: string;
  well: { totalSupply: string; hardCap: string; pct: number };
  stream: LedgerEntry[];
  anomalies: LedgerAnomaly[];
  lastCheck: string; // economy_integrity_check timestamp
  integrityOk: boolean;
}

/* ---- S03 · SourceVerification ----  PARTIAL backend
   Source: TheMANUAL sources + source-quality / chain-of-verification (CoV).
   "cred" = CoV score; "status" maps to the Discovery Ladder. */
export interface IntelSource {
  id: string; // SRC-0412
  handle: string; // 'treasury-filings'
  kind: string; // 'Primary document feed' | 'News wire' | 'Anonymous tip' …
  status: 'sourced' | 'accepted' | 'emerging' | 'fringe' | 'unsourced';
  cred: number; // 0-100 CoV credibility
  depth: number; // verification chain depth
  last: string; // relative time
  flag?: string; // 'Chain broken at primary'
  str: { e: number; f: number; t: number }; // evidence/firstparty/temporal strength
}
export interface SourceVerificationData {
  sources: IntelSource[];
}

/* ---- ShillDetection ----  PARTIAL backend
   Source: bee_affiliate_chain + the five-layer anti-gaming stack.
   A "ring" is a detected coordinated cluster. */
export interface ShillRing {
  id: string; // AFFIL-0050
  sev: 'critical' | 'warn' | string;
  name: string;
  actors: number; // accounts in the ring
  sim: number; // 0-1 similarity / coordination score
  astra: number; // # Astra the ring spans
  status: 'frozen' | 'throttled' | 'flagged' | 'cleared' | string;
}
export interface ShillDetectionData {
  rings: ShillRing[];
}

/* ---- S01 · InfraHealth + MemberMesh ----  MOCK-ONLY until Phase-2 device-sharing builds
   Honest placeholders. Keep on mock; do not fake a backend. */
export interface ServiceRow {
  name: string;
  tier: string;
  metricLabel: string;
  metric: string;
  backend: string;
}
export interface InfraHealthData {
  posture: Posture;
  services: ServiceRow[];
}

export interface MeshNode {
  id: string;
  score: number;
  st: Tone;
  region: string;
  note: string;
}
export interface MeshLayer {
  key: string;
  name: string;
  icon: string;
  watch: string;
  heaviest?: boolean;
}
export interface MemberMeshData {
  layers: MeshLayer[];
  nodes: Record<string, MeshNode[]>;
}

/* ---- ThreatInterception ----  external feed (no DB table; ingest source TBD) */
export interface Threat {
  id: string;
  name: string;
  kind: string;
  sev: string;
  status: 'intercepted' | 'quarantined' | 'open' | string;
  members?: number;
}
export interface ThreatInterceptionData {
  threats: Threat[];
}

/* ---- DispatchAuth ----  ACTION SURFACE — wire LAST (post security audit)
   Each dispatch is a rank-gated enforcement action. Reads first; writes behind
   the existing auth.uid()/service-role RPC pattern. */
export interface Dispatch {
  id: string;
  action: string;
  kind: string;
  actor: string;
  disc: string; // discipline (security/monitoring)
  rankReq?: string;
  verdict?: 'verified' | 'insufficient' | string;
}
export interface DispatchAuthData {
  dispatches: Dispatch[];
}

/* ---- KarmaCredit ----  reputation/standing (ties to MiNUTEMEN Good Standing) */
export interface KarmaSignal {
  key: string;
  label: string;
  w: number;
  hint: string;
}
export interface KarmaActor {
  id: string;
  rank: string;
  joined: string;
  v: Record<string, number>;
}
export interface KarmaCreditData {
  signals: KarmaSignal[];
  actors: KarmaActor[];
}

/* ---- AtlasOracle ----  incident copilot (binds to AtlasOracle Astra) */
export interface OracleQueueItem {
  surface: string;
  tag: string;
  tone: Tone;
  title: string;
  sub: string;
}
export interface AtlasOracleData {
  queue: OracleQueueItem[];
}

/* ---- JusticeHandoff ----  the class-action LAUNCHER: packages evidence → forms a Manual
   Group in TheMANUAL's Justice *realm* (atom taxonomy, orthogonal to Astra). Legal Astra =
   AtlasADVOCATE. DingleBERRY launches + hands off; it never runs the group. */
export interface EvidenceItem {
  icon: string;
  label: string;
  v: string;
  note: string;
}
export interface JusticeHandoffData {
  evidence: EvidenceItem[];
}

/* ---- GoDark ----  MOCK-ONLY (the blackout-protocol monitor; Phase-2 spine +
   mesh telemetry). Go Dark = "alive, not transacting": when the spine (central
   coordination + the BLiNG! ledger) goes unreachable, the member mesh keeps
   serving, every ledger-touching write becomes a queued intent, and on the
   spine's return the queue reconciles EXACTLY ONCE (canon §6.6.5). This shape
   feeds the six monitor panels. Honest mock — no live spine telemetry exists
   yet; do not fake a backend.

   AUTHORED here (not cast): unlike the ported screens, Go Dark has no artifact —
   this contract is designed from §6.6.5, and the page is built to it. The
   live-telemetry panels (state header, heartbeat, queue, reconcile console) vary
   with platform health, so they are keyed by Posture (secure/degraded/critical);
   dark history + the commanded-ceremony config are posture-invariant. */
export type GoDarkState = 'secure' | 'degraded' | 'dark' | 'reconciling';
export type GoDarkDepth = 'brownout' | 'blackout';
export type GoDarkEntryMode = 'derived' | 'commanded';

/** (2) spine heartbeat + gossip consensus */
export interface GoDarkHeartbeat {
  spineReachable: boolean;
  missedBeats: number; // current missed heartbeats
  threshold: number; // N — beats missed before a node enters dark behavior
  windowSec: number; // T — over how many seconds
  consensusNodes: number; // mesh nodes participating in the dark gossip
  consensusPct: number; // % of them reporting the spine REACHABLE
  beat: 'steady' | 'jittery' | 'flatline' | string;
}

/** (3) queued-intent backlog */
export interface QueueTypeRow {
  type: string;
  count: number;
}
export interface GoDarkQueue {
  depth: number; // global queued-intent count
  byType: QueueTypeRow[]; // per-type breakdown
  oldestIntentAge: string; // age of the oldest unsettled intent, or '—'
  replicationFactor: number; // e.g. 3 (replicated to relay peers)
  replicationPct: number; // % of intents at full replication
}

/** (4) reconcile (the drain) console */
export interface RejectionRow {
  reason: string;
  count: number;
}
export interface GoDarkReconcile {
  mode: 'idle' | 'holding' | 'draining';
  lastSummary: string; // shown when idle (Secure)
  lastWhen: string;
  progress: number; // 0-100, live drain
  applied: number;
  rejected: number;
  rejections: RejectionRow[]; // reasons, metered
  integrityCheck: 'idle' | 'pending' | 'running' | 'passed' | 'failed' | string;
  drops: string; // dark-service DROPS tally
}

/** one live-telemetry slice (header + panels 2-4), selected by Posture */
export interface GoDarkLive {
  state: GoDarkState;
  depth: GoDarkDepth | null; // null at Secure
  entryMode: GoDarkEntryMode | null;
  timeInState: string; // 'live · 07:41' | '—'
  heartbeat: GoDarkHeartbeat;
  queue: GoDarkQueue;
  reconcile: GoDarkReconcile;
}

/** (5) dark history — each episode auto-files an attested post-mortem */
export interface DarkEpisode {
  id: string; // GD-2026-0419
  onset: string; // onset per gossip consensus
  depth: GoDarkDepth;
  entryMode: GoDarkEntryMode; // derived (suffered) | commanded
  duration: string;
  trigger: string; // human cause
  queuedIntents: number;
  applied: number;
  rejected: number;
  rejectionDetail: string;
  dropsPaid: string;
  integrityResult: 'passed' | 'failed' | string;
  consensusOnset: string; // 'gossip consensus · 4,061 / 4,182 nodes'
  attestation: string; // signed record id
  notes: string;
}

/** (6) commanded Go Dark — the highest-ceremony control's config (inert) */
export interface CommandedCeremony {
  masterSwitch: string; // Patchboard master switch label
  dispatch: string; // Waggle dispatch route
  rankGate: string; // discipline-rank gate
  keyholdersRequired: number; // sign-off count
  keyholdersTotal: number;
  keyholdersLabel: string;
  scenarios: string[]; // legal seizure, hostile infra, emergency migration
}

export interface GoDarkData {
  byPosture: Record<Posture, GoDarkLive>;
  episodes: DarkEpisode[];
  ceremony: CommandedCeremony;
}

/* ---- top-level snapshot the shell consumes ---- */
export interface DingleberrySnapshot {
  posture: Posture;
  transactionSecurity: TransactionSecurityData;
  sourceVerification: SourceVerificationData;
  shillDetection: ShillDetectionData;
  infraHealth: InfraHealthData;
  memberMesh: MemberMeshData;
  threatInterception: ThreatInterceptionData;
  dispatchAuth: DispatchAuthData;
  karmaCredit: KarmaCreditData;
  atlasOracle: AtlasOracleData;
  justiceHandoff: JusticeHandoffData;
  goDark: GoDarkData;
}
