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
// import { createClient } from '@supabase/supabase-js';  // use the repo's existing client
import type { DingleberrySnapshot, Posture } from './contract';
import * as M from './mock-data';

const USE_LIVE = false; // flip per-screen as each section is wired (or split into per-screen flags)

export function useDingleberryData() {
  const [data, setData] = useState<DingleberrySnapshot | null>(null);
  const [posture, setPosture] = useState<Posture>('secure');

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
          stream: M.STREAM_S2 as any,
          anomalies: M.ANOMALIES_S2 as any,
          anomByPosture: M.ANOM_BY_POSTURE_S2 as any,
        },
        sourceVerification: { sources: M.SOURCES_S3 as any },
        shillDetection:     { rings: M.RINGS_ShillDetection as any },
        infraHealth:        { posture, services: M.SERVICES_S1 as any },
        memberMesh:         { layers: M.LAYERS_MemberMesh as any, nodes: M.NODES_MemberMesh as any },
        threatInterception: { threats: M.THREATS_ThreatInterception as any },
        dispatchAuth:       { dispatches: M.DISPATCHES_DispatchAuth as any },
        karmaCredit:        { signals: M.SIGNALS_KarmaCredit as any, actors: M.ACTORS_KarmaCredit as any },
        atlasOracle:        { queue: M.QUEUE_AtlasOracle as any },
        justiceHandoff:     { evidence: M.EVIDENCE_JusticeHandoff as any },
      };

      // ----- LIVE (wire here, screen by screen) ---------------------
      if (USE_LIVE) {
        // S02 — FIRST. Backend exists today.
        //   const { data: state } = await sb.from('bling_system_state').select('reserve,treasury,total_supply,hard_cap').single();
        //   const { data: integrity } = await sb.rpc('economy_integrity_check');   // { ok: boolean, ... }
        //   const { data: stream } = await sb.from('bling_transactions')
        //         .select('id,amount,type,...').order('created_at',{ascending:false}).limit(40);
        //   const { data: flags } = await sb.from('economy_integrity_log').select('*').eq('ok',false)...;
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
    return () => { alive = false; };
  }, [posture]);

  return { data, posture, setPosture };
}
