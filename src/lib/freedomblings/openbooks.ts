import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — The Open Books (Slice 3) · PUBLIC, LIVE.
   ----------------------------------------------------------------------------
   The genesis-truth economy dashboard. PUBLIC: reads bling_system_state through
   its public-read RLS (USING true) — no auth gate, renders for signed-out
   visitors too. Verify-from-prod (the README's locked method): we read the
   actual row and display only what is truly there.

   Prod row (verified 2026-06-12, project anxmqiehpyznifqgskzc):
     total_supply        = 0.000000                      (genesis — nothing FREE'd)
     hard_cap            = 111222333333222111.000000     (the Sacred Sum)
     reserve             = 111222000000000000.000000      (the freeing well — DRAINS)
     treasury            = 333333222111.000000            (Operations Buckets carve-out)
     offer_donation_pct  = 0.000000                       (NOT yet the canonical 0.99)
   DRAIN MODEL (2026-06-10): freeing does total_supply += x AND reserve -= x, so
   `reserve` is the LIVE unfreed well and the three slices are DISJOINT and
   conserved: reserve + treasury + total_supply = hard_cap (the old static
   reserve+treasury=hard_cap CHECK was dropped when the drain model landed). We
   verify that invariant on every read — if it fails, the books are out of
   balance and we say so rather than render wrong slices. STRING DISCIPLINE:
   every amount is summed/subtracted in BigInt micro-units — never Number()'d.
   ============================================================================ */
import { useEffect, useState } from 'react';
import { fmtBling, toMicros } from './ledger';

const CANON_TITHE = 0.99; // Comb Tithe — canonical, opt-out

export interface OpenBooks {
  status: 'loading' | 'live' | 'unavailable';
  sacredSum: string; // hard_cap, the palindrome
  freedPct: number; // total_supply / hard_cap * 100
  freedPctLabel: string;
  totalSupply: string; // FREE'd / In hands
  well: string; // reserve (the live draining well)
  opsBuckets: string; // treasury (live)
  combTithe: string; // '0.99%'
  titheIllustrative: boolean; // true when the live column ≠ canon (footnote)
  balanced: boolean; // reserve + treasury + total_supply === hard_cap
}

const OB_INITIAL: OpenBooks = {
  status: 'loading',
  sacredSum: '111,222,333,333,222,111',
  freedPct: 0,
  freedPctLabel: '0',
  totalSupply: '0',
  well: '—',
  opsBuckets: '333,333,222,111',
  combTithe: '0.99%',
  titheIllustrative: true,
  balanced: true,
};

function pctLabel(p: number): string {
  if (p === 0) return '0';
  // trim trailing zeros from up to 4 decimals
  return String(Number(p.toFixed(4)));
}

export function useOpenBooks(): OpenBooks {
  const [state, setState] = useState<OpenBooks>(OB_INITIAL);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setState({ ...OB_INITIAL, status: 'unavailable' });
      return;
    }
    const client = supabase;
    async function load() {
      const { data, error } = await client
        .from('bling_system_state')
        // Cast numeric(24,6) → text at the wire: PostgREST emits numerics as JSON
        // numbers, so anything past 2^53 is corrupted by JSON.parse BEFORE our
        // String() runs. ::text keeps the column name as the key.
        .select(
          'total_supply::text, hard_cap::text, reserve::text, treasury::text, offer_donation_pct::text',
        )
        .eq('id', 1)
        .maybeSingle();
      if (!alive) return;
      if (error || !data) {
        setState({ ...OB_INITIAL, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB row → narrowed below
      const r = data as any;
      const totalMicros = toMicros(String(r.total_supply ?? '0'));
      const capMicros = toMicros(String(r.hard_cap ?? '0'));
      const reserveMicros = toMicros(String(r.reserve ?? '0'));
      const treasuryMicros = toMicros(String(r.treasury ?? '0'));

      // Arithmetic-honesty check: the three disjoint slices must sum to the cap.
      const balanced = reserveMicros + treasuryMicros + totalMicros === capMicros;

      const pct = capMicros > 0n ? Number((totalMicros * 1_000_000n) / capMicros) / 10_000 : 0;

      // Comb Tithe: only treat the live column as authoritative when it matches
      // the canonical 0.99; prod currently holds 0 → fall back to canon + footnote.
      const odp = Number(r.offer_donation_pct ?? 0);
      const titheLive = Math.abs(odp - CANON_TITHE) < 1e-6;

      setState({
        status: 'live',
        sacredSum: fmtBling(capMicros),
        freedPct: pct,
        freedPctLabel: pctLabel(pct),
        totalSupply: fmtBling(totalMicros),
        well: fmtBling(reserveMicros),
        opsBuckets: fmtBling(treasuryMicros),
        combTithe: '0.99%',
        titheIllustrative: !titheLive,
        balanced,
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
