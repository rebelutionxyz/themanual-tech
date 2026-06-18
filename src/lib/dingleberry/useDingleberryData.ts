import { supabase } from '@/lib/supabase';
/* ============================================================
   useDingleberryData() — THE PROVIDER (the only file that touches data)
   ------------------------------------------------------------
   Today: returns mock data (renders identically to the artifact).
   Wiring: replace each section's mock with a live Supabase call,
   ONE screen at a time. Screens import nothing from here except the
   typed result — so a swap never touches a screen file.

   Pattern for every swap:
     1. keep the return shape identical to contract.ts
     2. reads first (SELECT / RPC with no mutation)
     3. actions (DispatchAuth) wire LAST, post security audit,
        behind the existing auth.uid()/service-role RPC pattern
   ============================================================ */
import { useEffect, useState } from 'react';
import type { DingleberrySnapshot, LedgerAnomaly, LedgerEntry, Posture, S02Live } from './contract';
import * as M from './mock-data';

const USE_LIVE = false; // flip per-screen as each section is wired (or split into per-screen flags)

/** Format an integrity-check timestamp (ISO) → 'YYYY-MM-DD HH:mm UTC'. */
function fmtCheckTs(at: unknown): string {
  if (typeof at !== 'string' || !at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at; // unparseable → show raw
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

const S02_INITIAL: S02Live = {
  status: 'loading',
  posture: 'secure',
  securedToday: '—',
  demurrage24h: '—',
  well: { totalSupply: '0', hardCap: '', pct: 0 },
  stream: [],
  anomalies: [],
  lastCheck: '',
  integrityOk: true,
};

export function useDingleberryData() {
  const [data, setData] = useState<DingleberrySnapshot | null>(null);
  const [posture, setPosture] = useState<Posture>('secure');
  const [s02, setS02] = useState<S02Live>(S02_INITIAL);

  // ----- S02 LIVE (Step-3): dingleberry_s02_snapshot() — read-only, admin-gated.
  // Runs once on mount, independent of the mock posture. On RPC error (42501 or
  // any failure) we surface an inline "unavailable" state — NEVER a silent mock
  // fallback. Genesis prod legitimately reads 0 secured / 0 anomalies / Secure. */
  useEffect(() => {
    let alive = true;
    async function loadS02() {
      if (!supabase) {
        if (alive)
          setS02((s) => ({ ...s, status: 'unavailable', errorMessage: 'Supabase not configured' }));
        return;
      }
      const { data: snap, error } = await supabase.rpc('dingleberry_s02_snapshot');
      if (!alive) return;
      if (error || snap == null) {
        setS02((s) => ({
          ...s,
          status: 'unavailable',
          errorCode: error?.code,
          errorMessage: error?.message ?? 'no snapshot returned',
        }));
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: RPC JSON → typed S02Live mapping at the seam
      const r = snap as any;
      const anomalies = (Array.isArray(r.anomalies) ? r.anomalies : []) as LedgerAnomaly[];
      const sev = anomalies.map((a) => a.sev);
      // DERIVE posture from live anomaly severities (§6.6.4).
      const derived: Posture = sev.includes('critical')
        ? 'critical'
        : sev.includes('watch')
          ? 'degraded'
          : 'secure';
      setS02({
        status: 'live',
        posture: derived,
        securedToday: String(r.securedToday ?? '0'),
        demurrage24h: String(r.demurrage24h ?? '0'),
        well: {
          // STRINGS — the Sacred Sum exceeds JS safe integers; never Number() these.
          totalSupply: String(r.well?.totalSupply ?? '0'),
          hardCap: String(r.well?.hardCap ?? ''),
          pct: Number(r.well?.pct ?? 0), // pct is numeric and safe
        },
        stream: (Array.isArray(r.stream) ? r.stream : []) as LedgerEntry[],
        anomalies,
        // RPC returns lastCheck as { at, ok } — pull the timestamp, format readable.
        lastCheck: fmtCheckTs(r.lastCheck?.at),
        integrityOk: Boolean(r.lastCheck?.ok ?? true),
      });
    }
    loadS02();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      // ----- MOCK (current) -----------------------------------------
      const snapshot: DingleberrySnapshot = {
        posture,
        transactionSecurity: {
          conservationOk: true,
          reserve: '111,222,000,000,000,000',
          treasury: '0',
          totalSupply: '0',
          hardCap: '111,222,333,333,222,111',
          // biome-ignore lint/suspicious/noExplicitAny: mock carries extra demo fields beyond the contract; the contract is the only shape screens read
          stream: M.STREAM_S2 as any,
          // biome-ignore lint/suspicious/noExplicitAny: same — verbatim design mock, contract-typed at the seam
          anomalies: M.ANOMALIES_S2 as any,
          // biome-ignore lint/suspicious/noExplicitAny: readonly literal → mutable contract shape
          anomByPosture: M.ANOM_BY_POSTURE_S2 as any,
        },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        sourceVerification: { sources: M.SOURCES_S3 as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        shillDetection: { rings: M.RINGS_ShillDetection as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        infraHealth: { posture, services: M.SERVICES_S1 as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        memberMesh: { layers: M.LAYERS_MemberMesh as any, nodes: M.NODES_MemberMesh as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        threatInterception: { threats: M.THREATS_ThreatInterception as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        dispatchAuth: { dispatches: M.DISPATCHES_DispatchAuth as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        karmaCredit: { signals: M.SIGNALS_KarmaCredit as any, actors: M.ACTORS_KarmaCredit as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        atlasOracle: { queue: M.QUEUE_AtlasOracle as any },
        // biome-ignore lint/suspicious/noExplicitAny: mock → contract seam
        justiceHandoff: { evidence: M.EVIDENCE_JusticeHandoff as any },
        // biome-ignore lint/suspicious/noExplicitAny: AUTHORED mock (no artifact) → contract seam; posture-keyed live telemetry + static history/ceremony
        goDark: M.GODARK_GoDark as any,
      };

      // ----- LIVE (wire here, screen by screen) ---------------------
      if (USE_LIVE) {
        // S02 — FIRST. Backend exists today.
        //   const { data: state } = await supabase.from('bling_system_state').select('reserve,treasury,total_supply,hard_cap').single();
        //   const { data: integrity } = await supabase.rpc('economy_integrity_check');   // { ok: boolean, ... }
        //   const { data: stream } = await supabase.from('bling_transactions')
        //         .select('id,amount,type,...').order('created_at',{ascending:false}).limit(40);
        //   const { data: flags } = await supabase.from('economy_integrity_log').select('*').eq('ok',false)...;
        //   snapshot.transactionSecurity = mapTxSecurity(state, integrity, stream, flags);
        //
        // S03 — sources + CoV (TheMANUAL source-quality). Partial.
        // Shill — bee_affiliate_chain + anti-gaming stack. Partial.
        // Threat — external ingest source TBD.
        // Infra / MemberMesh — Phase-2 device-sharing: KEEP MOCK until built.
        // DispatchAuth — ACTIONS LAST, post security audit.
      }

      if (alive) setData(snapshot);
    }

    load();
    return () => {
      alive = false;
    };
  }, [posture]);

  return { data, posture, setPosture, s02 };
}
