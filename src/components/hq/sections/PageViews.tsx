// HQ §2 — Page Views
// Reads page_view_events (admin-only RLS). Last N events with time-range
// filter. Aggregated (per-page-path GROUP BY) view deferred to follow-up
// dispatch + an RPC — the table is empty in production (FE instrumentation
// pending), so v1 ships the raw-events view.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Row {
  id: number;
  bee_id: string | null;
  astra_slug: string;
  page_path: string;
  viewed_at: string;
  referrer: string | null;
}

type Range = '24h' | '7d' | '30d';
const RANGES: Range[] = ['24h', '7d', '30d'];

function rangeToCutoff(r: Range): Date {
  const ms = r === '24h' ? 86400e3 : r === '7d' ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(Date.now() - ms);
}

export function PageViews() {
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
      const cutoff = rangeToCutoff(range);
      const { data, error: e } = await supabase
        .from('page_view_events')
        .select('id, bee_id, astra_slug, page_path, viewed_at, referrer')
        .gte('viewed_at', cutoff.toISOString())
        .order('viewed_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Page Views</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          from page_view_events · last 50 events
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
          {error
            ? `Could not load page views: ${error}`
            : 'No page views logged yet. (Page view tracking pending integration with frontend.)'}
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Time</th>
              <th className="pb-2 font-mono uppercase">Astra</th>
              <th className="pb-2 font-mono uppercase">Page</th>
              <th className="pb-2 font-mono uppercase">Bee</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(r.viewed_at).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-1.5 text-text">{r.astra_slug}</td>
                <td className="py-1.5 font-mono text-text-silver" style={{ fontSize: '12px' }}>
                  {r.page_path}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {r.bee_id ? r.bee_id.slice(0, 8) : 'anon'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
