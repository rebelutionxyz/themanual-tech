// HQ §3 — Trending Atoms (admin variant)
// 3 tabs over atom_trending_24h / _7d / _30d. Richer display than the
// Bee-facing TrendingAtoms — rank, vote count, total weight, full realm,
// current_tier chip.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DiscoveryTierChip } from '@/components/ui/DiscoveryTierChip';
import type { DiscoveryTier } from '@/lib/discovery-ladder/colors';
import { cn } from '@/lib/utils';

type Tab = '24h' | '7d' | '30d';
const TABS: Tab[] = ['24h', '7d', '30d'];

interface Row {
  atom_id: string;
  vote_count: number;
  total_weight: number | null;
  name: string;
  realm_id: string;
  kettle: DiscoveryTier;
}

interface RawRel {
  name: string;
  realm_id: string;
  kettle: string;
}

interface RawRow {
  atom_id: string;
  atoms: RawRel | RawRel[] | null;
  // count + weight columns differ per matview:
  vote_count_24h?: number;
  vote_count_7d?: number;
  vote_count_30d?: number;
  total_weight_24h?: number | null;
  total_weight_7d?: number | null;
  total_weight_30d?: number | null;
}

function viewName(t: Tab): string {
  return `atom_trending_${t}`;
}

function countColumn(t: Tab): keyof RawRow {
  return `vote_count_${t}` as keyof RawRow;
}

function weightColumn(t: Tab): keyof RawRow {
  return `total_weight_${t}` as keyof RawRow;
}

export function TrendingAtomsAdmin() {
  const [tab, setTab] = useState<Tab>('24h');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRows(null);
      const view = viewName(tab);
      const cnt = countColumn(tab);
      const { data, error: e } = await supabase
        .from(view)
        .select(`atom_id, ${cnt}, ${weightColumn(tab)}, atoms!inner(name, realm_id, kettle)`)
        .order(cnt as string, { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        return;
      }
      const flat: Row[] = ((data ?? []) as unknown as RawRow[])
        .map((r) => {
          const atom: RawRel | null = Array.isArray(r.atoms) ? (r.atoms[0] ?? null) : r.atoms;
          if (!atom) return null;
          return {
            atom_id: r.atom_id,
            vote_count: (r[cnt] as number) ?? 0,
            total_weight: (r[weightColumn(tab)] as number | null) ?? null,
            name: atom.name,
            realm_id: atom.realm_id,
            kettle: atom.kettle as DiscoveryTier,
          };
        })
        .filter((x): x is Row => x !== null);
      setRows(flat);
    })();
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Trending Atoms</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          from atom_trending_{tab} · top 20 by vote count
        </p>
      </header>

      <nav className="flex gap-1" aria-label="Trending window">
        {TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md border px-3 py-1 text-sm font-mono uppercase tracking-wider transition-colors',
              tab === t
                ? 'border-text-silver/50 bg-bg-elevated text-text-silver-bright'
                : 'border-border bg-bg text-text-muted hover:text-text-silver',
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      {rows === null && (
        <div className="mt-4 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse-slow rounded bg-bg-elevated/40" />
          ))}
        </div>
      )}
      {rows !== null && rows.length === 0 && (
        <div className="mt-4 rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
          {error
            ? `Could not load trending atoms: ${error}`
            : 'No trending atoms yet — first kettle votes pending.'}
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 pr-2 font-mono uppercase">#</th>
              <th className="pb-2 font-mono uppercase">Atom</th>
              <th className="pb-2 font-mono uppercase">Realm</th>
              <th className="pb-2 font-mono uppercase">Tier</th>
              <th className="pb-2 font-mono uppercase">Votes</th>
              <th className="pb-2 font-mono uppercase">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.atom_id} className="border-t border-border/40">
                <td className="py-1.5 pr-2 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {i + 1}
                </td>
                <td className="py-1.5 text-text">{r.name}</td>
                <td className="py-1.5 font-mono text-text-silver" style={{ fontSize: '12px' }}>
                  {r.realm_id}
                </td>
                <td className="py-1.5">
                  <DiscoveryTierChip tier={r.kettle} compact />
                </td>
                <td className="py-1.5 font-mono text-text" style={{ fontSize: '12px' }}>
                  {r.vote_count}
                </td>
                <td className="py-1.5 font-mono text-text-silver" style={{ fontSize: '12px' }}>
                  {r.total_weight !== null ? r.total_weight.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
