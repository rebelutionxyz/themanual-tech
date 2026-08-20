// HQ — Atoms (admin directory). MMF §19.8.
//
// The taxonomy directory: total atom count + search by title across realms, with
// the discovery tier (kettle) on each row. Read-only — atom edits, merges, and
// re-disposition are their own gated actions (see Admin Actions › Force
// Re-Disposition) and land in later slices. Complements Trending Atoms, which
// ranks by kettle votes; this is the flat directory.

import { DiscoveryTierChip } from '@/components/ui/DiscoveryTierChip';
import type { DiscoveryTier } from '@/lib/discovery-ladder/colors';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AtomRow {
  id: string;
  name: string;
  realm_id: string;
  kettle: DiscoveryTier;
  created_at: string;
}

export function AtomsAdmin() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AtomRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase.from('atoms').select('id', { head: true, count: 'exact' });
      if (!cancelled) setTotal(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setRows([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      let cancelled = false;
      (async () => {
        setRows(null);
        if (!supabase) return;
        let q = supabase
          .from('atoms')
          .select('id, name, realm_id, kettle, created_at')
          .order('created_at', { ascending: false })
          .limit(25);
        const term = query.trim();
        if (term) q = q.ilike('name', `%${term}%`);
        const { data, error: e } = await q;
        if (cancelled) return;
        if (e) {
          setError(e.message);
          setRows([]);
          return;
        }
        setError(null);
        setRows((data ?? []) as AtomRow[]);
      })();
      return () => {
        cancelled = true;
      };
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Atoms</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          taxonomy directory · read-only{total !== null ? ` · ${total.toLocaleString()} atoms` : ''}
        </p>
      </header>

      <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 focus-within:border-text-silver/50">
        <Search size={15} className="text-text-muted" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search atom title…"
          className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
      </label>

      {rows === null && (
        <div className="space-y-1">
          {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((k) => (
            <div key={k} className="h-6 animate-pulse-slow rounded bg-bg-elevated/40" />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div
          className="rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim"
          style={{ fontSize: '13px' }}
        >
          {error
            ? `Could not load atoms: ${error}`
            : query.trim()
              ? `No atoms match “${query.trim()}”.`
              : 'No atoms yet.'}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Atom</th>
              <th className="pb-2 font-mono uppercase">Slug</th>
              <th className="pb-2 font-mono uppercase">Realm</th>
              <th className="pb-2 font-mono uppercase">Tier</th>
              <th className="pb-2 font-mono uppercase">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border/40">
                <td className="py-1.5 text-text">{a.name}</td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {a.id}
                </td>
                <td className="py-1.5 font-mono text-text-silver" style={{ fontSize: '12px' }}>
                  {a.realm_id}
                </td>
                <td className="py-1.5">
                  <DiscoveryTierChip tier={a.kettle} compact />
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(a.created_at).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
