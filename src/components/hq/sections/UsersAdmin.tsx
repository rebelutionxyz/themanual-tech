// HQ — Users (admin directory). MMF §19.8.
//
// The user directory: search by handle or name, see rank / action count / admin
// flag / join date. Lexicon is USER here (the HQ operator's frame), though the
// underlying table is `bees`. Read-only — role and balance mutations are their
// own gated, propose-first actions and land in later slices.

import { supabase } from '@/lib/supabase';
import { Search, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface UserRow {
  id: string;
  handle: string;
  name: string | null;
  bling_rank: number;
  action_count: number;
  is_admin: boolean;
  created_at: string;
}

export function UsersAdmin() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Total user count — one load.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase.from('bees').select('id', { head: true, count: 'exact' });
      if (!cancelled) setTotal(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Directory list — recent by default, or matched on a debounced query.
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
          .from('bees')
          .select('id, handle, name, bling_rank, action_count, is_admin, created_at')
          .order('created_at', { ascending: false })
          .limit(25);
        const term = query.trim();
        if (term) q = q.or(`handle.ilike.%${term}%,name.ilike.%${term}%`);
        const { data, error: e } = await q;
        if (cancelled) return;
        if (e) {
          setError(e.message);
          setRows([]);
          return;
        }
        setError(null);
        setRows((data ?? []) as UserRow[]);
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
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Users</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          directory · read-only{total !== null ? ` · ${total.toLocaleString()} total` : ''}
        </p>
      </header>

      <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 focus-within:border-text-silver/50">
        <Search size={15} className="text-text-muted" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search handle or name…"
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
            ? `Could not load users: ${error}`
            : query.trim()
              ? `No users match “${query.trim()}”.`
              : 'No users yet.'}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Handle</th>
              <th className="pb-2 font-mono uppercase">Name</th>
              <th className="pb-2 font-mono uppercase">Rank</th>
              <th className="pb-2 font-mono uppercase">Actions</th>
              <th className="pb-2 font-mono uppercase">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="py-1.5 text-text">
                  @{u.handle}
                  {u.is_admin && (
                    <span
                      className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-text-silver-bright"
                      title="admin"
                    >
                      <ShieldCheck size={12} aria-hidden />
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-text-silver">{u.name ?? '—'}</td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {u.bling_rank}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {u.action_count}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(u.created_at).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
