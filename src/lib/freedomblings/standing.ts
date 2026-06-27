import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
/* ============================================================================
   FreedomBLiNGS — Standing & identity (Slice #2) · LIVE own-data, read-only.
   ----------------------------------------------------------------------------
   Owner-read of the signed-in Bee's own row (same auth/RLS pattern as
   ledger.ts) plus the public rank_multiplier ladder. DISPLAY ONLY — no writes
   this slice (Guardians + consent management arrive with the Guardians slice).

   Rank + Ring live directly on the bees row:
     · bling_rank      → 1..33  (the earning Rank; default 1)
     · honeycomb_ring  → 1..9   (lifetime prestige; default 1)
   The current Rank's earning multiplier is read from rank_multiplier (33 rows,
   1.0×→10.0×). That table is public-read and was authored out-of-repo; we query
   it defensively — if it's unreachable the identity + ladders still render, just
   without the multiplier line. inGoodComb = bling_deficit nets to zero.

   STRING DISCIPLINE: bling_deficit can grow large, so it crosses the wire as
   ::text and is compared in BigInt micro-units (never Number()'d). The
   multiplier is a tiny bounded display value (≤ 10.0) — safe to Number() for
   formatting only.
   ============================================================================ */
import { useEffect, useState } from 'react';
import { toMicros } from './ledger';

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function joinedLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Tiny bounded multiplier string → trimmed display ('2.550000' → '2.55'). */
function fmtMultiplier(raw: string | number | null | undefined): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '1';
  return String(Number(n.toFixed(2)));
}

function clamp(v: number | null | undefined, lo: number, hi: number): number {
  const n = Number(v ?? lo);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export interface RankRung {
  level: number; // 1..33
  multiplier: string; // display string
}

export interface StandingState {
  status: 'loading' | 'signed-out' | 'live' | 'unavailable';
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  joinedAt: string; // formatted 'Month YYYY'
  blingRank: number; // 1..33
  honeycombRing: number; // 1..9
  actionCount: number;
  inGoodComb: boolean;
  rankLadder: RankRung[]; // 33 rungs; empty when the ladder is unavailable
  currentMultiplier: string | null; // multiplier at blingRank, display string
}

const EMPTY: StandingState = {
  status: 'loading',
  name: '',
  handle: '',
  avatarUrl: null,
  bio: null,
  joinedAt: '',
  blingRank: 1,
  honeycombRing: 1,
  actionCount: 0,
  inGoodComb: true,
  rankLadder: [],
  currentMultiplier: null,
};

export function useStanding(): StandingState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<StandingState>(EMPTY);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) {
      setState({ ...EMPTY, status: 'signed-out' });
      return;
    }
    let alive = true;
    const client = supabase;
    async function load() {
      const [beeRes, ladderRes] = await Promise.all([
        client
          .from('bees')
          // ::text on bling_deficit — it can exceed 2^53; everything else is small.
          .select(
            'name, handle, avatar_url, bio, created_at, bling_rank, honeycomb_ring, action_count, bling_deficit::text',
          )
          .eq('id', user!.id)
          .maybeSingle(),
        // Public rank ladder — defensive: a failure here must not blank the page.
        client
          .from('rank_multiplier')
          .select('rank_level, multiplier::text'),
      ]);
      if (!alive) return;
      if (beeRes.error || !beeRes.data) {
        setState({ ...EMPTY, status: 'unavailable' });
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: untyped DB row → narrowed below
      const b = beeRes.data as any;

      const blingRank = clamp(b.bling_rank, 1, 33);
      const honeycombRing = clamp(b.honeycomb_ring, 1, 9);
      const deficitMicros = toMicros(String(b.bling_deficit ?? '0'));

      // Ladder (graceful) — sort + dedupe to the 33 rungs by level.
      const rankLadder: RankRung[] = [];
      let currentMultiplier: string | null = null;
      if (!ladderRes.error && Array.isArray(ladderRes.data)) {
        // biome-ignore lint/suspicious/noExplicitAny: untyped DB rows → narrowed below
        const rows = (ladderRes.data as any[])
          .map((r) => ({ level: Number(r.rank_level), multiplier: fmtMultiplier(r.multiplier) }))
          .filter((r) => Number.isFinite(r.level))
          .sort((a, b2) => a.level - b2.level);
        rankLadder.push(...rows);
        currentMultiplier = rows.find((r) => r.level === blingRank)?.multiplier ?? null;
      }

      setState({
        status: 'live',
        name: (b.name as string | null)?.trim() || `@${b.handle}`,
        handle: String(b.handle ?? ''),
        avatarUrl: (b.avatar_url as string | null) || null,
        bio: (b.bio as string | null) || null,
        joinedAt: joinedLabel(b.created_at ?? null),
        blingRank,
        honeycombRing,
        actionCount: clamp(b.action_count, 0, Number.MAX_SAFE_INTEGER),
        inGoodComb: deficitMicros === 0n,
        rankLadder,
        currentMultiplier,
      });
    }
    load();
    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  return state;
}
