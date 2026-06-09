// HQ §5 — Recent Kettle Votes
// Last 100 atom_kettle_votes JOIN atoms (name, realm) JOIN bees (handle).
// All three tables are public-read, so a direct anon-keyed query works.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DiscoveryTierChip } from '@/components/ui/DiscoveryTierChip';
import type { DiscoveryTier } from '@/lib/discovery-ladder/colors';

interface Row {
  id: number;
  created_at: string;
  weight: number;
  kettle: DiscoveryTier;
  atom_id: string;
  bee_id: string;
  atom_name: string;
  atom_realm: string;
  bee_handle: string;
}

type Range = '24h' | '7d' | '30d' | 'all';
const RANGES: Range[] = ['24h', '7d', '30d', 'all'];

function rangeToCutoff(r: Range): Date | null {
  if (r === 'all') return null;
  const ms = r === '24h' ? 86400e3 : r === '7d' ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(Date.now() - ms);
}

interface RawRow {
  id: number;
  created_at: string;
  weight: number;
  kettle: string;
  atom_id: string;
  bee_id: string;
  atoms: { name: string; realm_id: string } | { name: string; realm_id: string }[] | null;
  bees: { handle: string } | { handle: string }[] | null;
}

export function RecentKettleVotes() {
  const [range, setRange] = useState<Range>('24h');
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
      let q = supabase
        .from('atom_kettle_votes')
        .select('id, created_at, weight, kettle, atom_id, bee_id, atoms!inner(name, realm_id), bees(handle)')
        .order('created_at', { ascending: false })
        .limit(100);
      const cutoff = rangeToCutoff(range);
      if (cutoff) q = q.gte('created_at', cutoff.toISOString());
      const { data, error: e } = await q;
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        return;
      }
      const flat: Row[] = ((data ?? []) as unknown as RawRow[])
        .map((r) => {
          const atom = Array.isArray(r.atoms) ? (r.atoms[0] ?? null) : r.atoms;
          const bee  = Array.isArray(r.bees)  ? (r.bees[0]  ?? null) : r.bees;
          if (!atom) return null;
          return {
            id: r.id,
            created_at: r.created_at,
            weight: r.weight,
            kettle: r.kettle as DiscoveryTier,
            atom_id: r.atom_id,
            bee_id: r.bee_id,
            atom_name: atom.name,
            atom_realm: atom.realm_id,
            bee_handle: bee?.handle ?? '(deleted)',
          };
        })
        .filter((x): x is Row => x !== null);
      setRows(flat);
    })();
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Recent Kettle Votes</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          from atom_kettle_votes · last 100 in range
        </p>
      </header>

      <label className="inline-flex items-center gap-2 text-sm text-text-silver">
        <span className="font-mono uppercase text-text-muted" style={{ fontSize: '11px' }}>range:</span>
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
          {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((k) => (
            <div key={k} className="h-6 animate-pulse-slow rounded bg-bg-elevated/40" />
          ))}
        </div>
      )}
      {rows !== null && rows.length === 0 && (
        <div className="mt-4 rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
          {error ? `Could not load kettle votes: ${error}` : 'No kettle votes yet — first votes pending.'}
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Time</th>
              <th className="pb-2 font-mono uppercase">Bee</th>
              <th className="pb-2 font-mono uppercase">Atom</th>
              <th className="pb-2 font-mono uppercase">Realm</th>
              <th className="pb-2 font-mono uppercase">Tier voted</th>
              <th className="pb-2 font-mono uppercase">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-1.5 text-text">@{r.bee_handle}</td>
                <td className="py-1.5 text-text-silver">{r.atom_name}</td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {r.atom_realm}
                </td>
                <td className="py-1.5">
                  <DiscoveryTierChip tier={r.kettle} compact />
                </td>
                <td className="py-1.5 font-mono text-text" style={{ fontSize: '12px' }}>
                  {r.weight.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
