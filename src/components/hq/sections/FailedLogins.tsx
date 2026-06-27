// HQ §1 — Failed Logins
// Reads failed_login_events (admin-only RLS). Time-range filter via dropdown.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Row {
  id: string;
  attempted_at: string;
  email_attempted: string | null;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
}

type Range = '24h' | '7d' | '30d' | 'all';
const RANGES: Range[] = ['24h', '7d', '30d', 'all'];

function rangeToCutoff(r: Range): Date | null {
  if (r === 'all') return null;
  const now = Date.now();
  const ms = r === '24h' ? 86400e3 : r === '7d' ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(now - ms);
}

export function FailedLogins() {
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
      let q = supabase
        .from('failed_login_events')
        .select('id, attempted_at, email_attempted, ip_address, user_agent, failure_reason')
        .order('attempted_at', { ascending: false })
        .limit(100);
      const cutoff = rangeToCutoff(range);
      if (cutoff) q = q.gte('attempted_at', cutoff.toISOString());
      const { data, error: e } = await q;
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
    <Section title="Failed Logins" subtitle="from failed_login_events">
      <RangeDropdown value={range} onChange={setRange} />
      {rows === null && <LoadingRows />}
      {rows !== null && rows.length === 0 && (
        <Empty>
          {error
            ? `Could not load failed logins: ${error}`
            : 'No failed login attempts in this range.'}
        </Empty>
      )}
      {rows !== null && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Time</th>
              <th className="pb-2 font-mono uppercase">Email attempted</th>
              <th className="pb-2 font-mono uppercase">IP</th>
              <th className="pb-2 font-mono uppercase">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {new Date(r.attempted_at).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="py-1.5 text-text">{r.email_attempted ?? '—'}</td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {r.ip_address ?? '—'}
                </td>
                <td className="py-1.5 text-text-silver">{r.failure_reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">{title}</h2>
        {subtitle && (
          <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>{subtitle}</p>
        )}
      </header>
      {children}
    </div>
  );
}

function RangeDropdown({ value, onChange }: { value: Range; onChange: (v: Range) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text-silver">
      <span className="font-mono uppercase text-text-muted" style={{ fontSize: '11px' }}>range:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Range)}
        className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:border-text-silver/50 focus:outline-none"
      >
        {RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </label>
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 space-y-1">
      {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((k) => (
        <div key={k} className="h-6 animate-pulse-slow rounded bg-bg-elevated/40" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
      {children}
    </div>
  );
}
