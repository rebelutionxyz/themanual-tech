import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — Lineage / affiliate chain (Slice #3) · LIVE own-data, read.
   ----------------------------------------------------------------------------
   Reads the owner-scoped RPC affiliate_lineage() (SECURITY DEFINER, auth-pinned
   — no args). The chain table is owner-read only, so the downline keeper-counts
   come back through the RPC's reverse-lookup. Returns the caller's per-level
   downline counts, own upline handles, total lineage size, and affiliate BLiNG!
   FREE'd (held + matured).

   STRING DISCIPLINE: freed_total is economy numeric and arrives as a STRING
   (::text at the wire) — kept as a string here and handed to fmtBling for
   display; never Number()'d. Genesis truth: size 0, freed "0.000000", every
   level downline 0 / upline null — rendered honestly.
   ============================================================================ */
import { useEffect, useState } from 'react';

export interface LineageLevel {
  level: number; // 1..5
  downline: number; // keeper count at this ring
  uplineHandle: string | null; // the Bee above you at this level, if any
}

export interface LineageState {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  lineageSize: number;
  freedTotal: string; // raw numeric string — fmtBling for display
  levels: LineageLevel[]; // always 5 (L1..L5)
}

const ZERO = '0.000000';

/** Always five levels, even when the RPC payload is sparse (genesis). */
function emptyLevels(): LineageLevel[] {
  return [1, 2, 3, 4, 5].map((level) => ({ level, downline: 0, uplineHandle: null }));
}

const EMPTY: LineageState = {
  status: 'loading',
  lineageSize: 0,
  freedTotal: ZERO,
  levels: emptyLevels(),
};

export function useLineage(): LineageState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LineageState>(EMPTY);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const { data, error } = await client.rpc('affiliate_lineage');
      if (!alive) return;
      if (error || !data) {
        setState({ ...EMPTY, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: jsonb payload → narrowed below
      const r = data as any;

      // Normalise to exactly five levels, indexed by `level`.
      const byLevel = new Map<number, LineageLevel>();
      if (Array.isArray(r.levels)) {
        for (const row of r.levels) {
          const level = Number(row?.level);
          if (!Number.isFinite(level)) continue;
          byLevel.set(level, {
            level,
            downline: Number(row?.downline ?? 0) || 0,
            uplineHandle: row?.upline_handle ? String(row.upline_handle) : null,
          });
        }
      }
      const levels = emptyLevels().map((l) => byLevel.get(l.level) ?? l);

      setState({
        status: 'live',
        lineageSize: Number(r.lineage_size ?? 0) || 0,
        freedTotal: r.freed_total != null ? String(r.freed_total) : ZERO,
        levels,
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  return state;
}
