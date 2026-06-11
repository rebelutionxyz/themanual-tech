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
export type Tone    = 'secure' | 'watch' | 'critical' | 'info' | 'idle';

/* ---- S02 · TransactionSecurity ----  LIVE-WIRABLE TODAY
   Source: bling_system_state (reserve/treasury/total_supply/hard_cap),
   bling_transactions (stream), economy_integrity_check() + economy_integrity_log
   (anomalies / conservation verdict). This screen is a UI over the drain-model
   + conservation invariant shipped 2026-06-10. */
export interface LedgerEntry {
  hash: string;            // tx hash / id  → bling_transactions.id
  amt: string;             // signed, formatted  → amount (numeric(24,6))
  kind: string;            // tx type  → bling_transactions.type (affiliate_distribute, …)
  tag: 'freed' | 'pull' | string;  // freed = drains well; pull = refills
  from: string;            // 'Well' | bee short-id
  to: string;
}
export interface LedgerAnomaly {
  id: string;              // e.g. LDG-3391
  sev: 'critical' | 'warn' | string;
  kind: string;            // human label, e.g. "Fiat → BLiNG! exchange brokered on-platform"
  detail: string;
}
export interface TransactionSecurityData {
  conservationOk: boolean;     // economy_integrity_check().ok
  reserve: string;             // bling_system_state.hard_cap-anchored well balance
  treasury: string;
  totalSupply: string;
  hardCap: string;             // 111,222,333,333,222,111
  stream: LedgerEntry[];       // recent bling_transactions
  anomalies: LedgerAnomaly[];  // open integrity flags
  anomByPosture: Record<Posture, string[]>; // which anomaly ids show per posture
}

/* ---- S03 · SourceVerification ----  PARTIAL backend
   Source: TheMANUAL sources + source-quality / chain-of-verification (CoV).
   "cred" = CoV score; "status" maps to the Discovery Ladder. */
export interface IntelSource {
  id: string;              // SRC-0412
  handle: string;          // 'treasury-filings'
  kind: string;            // 'Primary document feed' | 'News wire' | 'Anonymous tip' …
  status: 'sourced' | 'accepted' | 'emerging' | 'fringe' | 'unsourced';
  cred: number;            // 0-100 CoV credibility
  depth: number;           // verification chain depth
  last: string;            // relative time
  flag?: string;           // 'Chain broken at primary'
  str: { e: number; f: number; t: number }; // evidence/firstparty/temporal strength
}
export interface SourceVerificationData { sources: IntelSource[] }

/* ---- ShillDetection ----  PARTIAL backend
   Source: bee_affiliate_chain + the five-layer anti-gaming stack.
   A "ring" is a detected coordinated cluster. */
export interface ShillRing {
  id: string;              // AFFIL-0050
  sev: 'critical' | 'warn' | string;
  name: string;
  actors: number;         // accounts in the ring
  sim: number;            // 0-1 similarity / coordination score
  astra: number;          // # Astra the ring spans
  status: 'frozen' | 'throttled' | 'flagged' | 'cleared' | string;
}
export interface ShillDetectionData { rings: ShillRing[] }

/* ---- S01 · InfraHealth + MemberMesh ----  MOCK-ONLY until Phase-2 device-sharing builds
   Honest placeholders. Keep on mock; do not fake a backend. */
export interface ServiceRow { name: string; tier: string; metricLabel: string; metric: string; backend: string }
export interface InfraHealthData { posture: Posture; services: ServiceRow[] }

export interface MeshNode { id: string; score: number; st: Tone; region: string; note: string }
export interface MeshLayer { key: string; name: string; icon: string; watch: string; heaviest?: boolean }
export interface MemberMeshData { layers: MeshLayer[]; nodes: Record<string, MeshNode[]> }

/* ---- ThreatInterception ----  external feed (no DB table; ingest source TBD) */
export interface Threat {
  id: string; name: string; kind: string; sev: string;
  status: 'intercepted' | 'quarantined' | 'open' | string;
  members?: number;
}
export interface ThreatInterceptionData { threats: Threat[] }

/* ---- DispatchAuth ----  ACTION SURFACE — wire LAST (post security audit)
   Each dispatch is a rank-gated enforcement action. Reads first; writes behind
   the existing auth.uid()/service-role RPC pattern. */
export interface Dispatch {
  id: string; action: string; kind: string; actor: string;
  disc: string;            // discipline (security/monitoring)
  rankReq?: string; verdict?: 'verified' | 'insufficient' | string;
}
export interface DispatchAuthData { dispatches: Dispatch[] }

/* ---- KarmaCredit ----  reputation/standing (ties to MiNUTEMEN Good Standing) */
export interface KarmaSignal { key: string; label: string; w: number; hint: string }
export interface KarmaActor { id: string; rank: string; joined: string; v: Record<string, number> }
export interface KarmaCreditData { signals: KarmaSignal[]; actors: KarmaActor[] }

/* ---- AtlasOracle ----  incident copilot (binds to AtlasOracle Astra) */
export interface OracleQueueItem { surface: string; tag: string; tone: Tone; title: string; sub: string }
export interface AtlasOracleData { queue: OracleQueueItem[] }

/* ---- JusticeHandoff ----  the class-action LAUNCHER: packages evidence → forms a Manual
   Group in TheMANUAL's Justice *realm* (atom taxonomy, orthogonal to Astra). Legal Astra =
   AtlasADVOCATE. DingleBERRY launches + hands off; it never runs the group. */
export interface EvidenceItem { icon: string; label: string; v: string; note: string }
export interface JusticeHandoffData { evidence: EvidenceItem[] }

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
}
