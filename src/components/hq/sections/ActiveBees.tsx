// HQ §4 — Active Bees
// Activity signal: bees.updated_at (no last_login column exists; updated_at
// flips on any bee row mutation — bling balance changes, profile edits,
// etc.) — best available proxy until a dedicated last_active column ships.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BeeRow {
  id: string;
  handle: string;
  name: string | null;
  bling_rank: number;
  action_count: number;
  created_at: string;
  updated_at: string;
}

interface Counts {
  total: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
}

type Range = '24h' | '7d' | '30d';
const RANGES: Range[] = ['24h', '7d', '30d'];
const MS = { '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 } as const;

export function ActiveBees() {
  const [range, setRange] = useState<Range>('24h');
  const [rows, setRows] = useState<BeeRow[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setRows([]);
      setCounts({ total: 0, active_24h: 0, active_7d: 0, active_30d: 0 });
      return;
    }
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const cutoffs = {
        '24h': new Date(now - MS['24h']).toISOString(),
        '7d':  new Date(now - MS['7d']).toISOString(),
        '30d': new Date(now - MS['30d']).toISOString(),
      };

      const [totalRes, a24Res, a7Res, a30Res] = await Promise.all([
        supabase.from('bees').select('id', { head: true, count: 'exact' }),
        supabase.from('bees').select('id', { head: true, count: 'exact' }).gte('updated_at', cutoffs['24h']),
        supabase.from('bees').select('id', { head: true, count: 'exact' }).gte('updated_at', cutoffs['7d']),
        supabase.from('bees').select('id', { head: true, count: 'exact' }).gte('updated_at', cutoffs['30d']),
      ]);
      if (cancelled) return;
      setCounts({
        total: totalRes.count ?? 0,
        active_24h: a24Res.count ?? 0,
        active_7d: a7Res.count ?? 0,
        active_30d: a30Res.count ?? 0,
      });

      const cutoff = cutoffs[range];
      const { data, error: e } = await supabase
        .from('bees')
        .select('id, handle, name, bling_rank, action_count, created_at, updated_at')
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as BeeRow[]);
    })();
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Active Bees</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          activity signal: bees.updated_at (proxy until last_active ships)
        </p>
      </header>

      {/* Summary cards */}
      {counts && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total Bees" value={counts.total} />
          <Stat label="Active 24h" value={counts.active_24h} />
          <Stat label="Active 7d" value={counts.active_7d} />
          <Stat label="Active 30d" value={counts.active_30d} />
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-sm text-text-silver">
        <span className="font-mono uppercase text-text-muted" style={{ fontSize: '11px' }}>recent in:</span>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:border-text-silver/50 focus:outline-none"
        >
          {RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      {rows === null && (
        <div className="mt-4 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse-slow rounded bg-bg-elevated/40" />
          ))}
        </div>
      )}
      {rows !== null && rows.length === 0 && (
        <div className="mt-4 rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
          {error ? `Could not load Bees: ${error}` : `No Bees active in last ${range}.`}
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Handle</th>
              <th className="pb-2 font-mono uppercase">Name</th>
              <th className="pb-2 font-mono uppercase">Rank</th>
              <th className="pb-2 font-mono uppercase">Actions</th>
              <th className="pb-2 font-mono uppercase">Last activity</th>
              <th className="pb-2 font-mono uppercase">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-border/40">
                <td className="py-1.5 text-text">@{b.handle}</td>
                <td className="py-1.5 text-text-silver">{b.name ?? '—'}</td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {b.bling_rank}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {b.action_count}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(b.updated_at).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(b.created_at).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-2">
      <div
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: '10px', letterSpacing: '0.08em' }}
      >
        {label}
      </div>
      <div className="font-display text-2xl font-semibold text-text-silver-bright">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
