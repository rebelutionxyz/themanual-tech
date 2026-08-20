// HQ — Promotions (admin). MMF §19.7 (Component D) + §19.8.
//
// Read-only inventory of the `promotions` table: the targeting cascade rows that
// feed the top-ticker + slot promotions. Shows each row's slot, behavior, scope
// facets (the most-specific-match-wins cascade), priority, and active window.
//
// Writes are propose-first and deferred: authoring/seeding promotions runs
// through Studio, not here. This section is the operator's read of what is live.

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PromoRow {
  id: string;
  slot_key: string;
  behavior: string | null;
  astra_slug: string | null;
  realm_slug: string | null;
  branch_path: string | null;
  atom_id: string | null;
  geo_country: string | null;
  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

function scopeChips(r: PromoRow): string[] {
  const s: string[] = [];
  if (r.atom_id) s.push(`atom:${r.atom_id}`);
  if (r.branch_path) s.push(`branch:${r.branch_path}`);
  if (r.realm_slug) s.push(`realm:${r.realm_slug}`);
  if (r.astra_slug) s.push(`astra:${r.astra_slug}`);
  if (r.geo_country) s.push(`geo:${r.geo_country}`);
  if (s.length === 0) s.push('catch-all');
  return s;
}

function windowLabel(r: PromoRow): string {
  const fmt = (t: string | null) => (t ? new Date(t).toISOString().slice(0, 10) : '—');
  if (!r.starts_at && !r.ends_at) return 'always';
  return `${fmt(r.starts_at)} → ${fmt(r.ends_at)}`;
}

export function PromotionsAdmin() {
  const [rows, setRows] = useState<PromoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: e } = await supabase
        .from('promotions')
        .select(
          'id, slot_key, behavior, astra_slug, realm_slug, branch_path, atom_id, geo_country, priority, active, starts_at, ends_at',
        )
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as PromoRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveCount = rows?.filter((r) => r.active).length ?? 0;

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Promotions</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          targeting cascade · read-only · authoring lives in Studio
        </p>
      </header>

      {rows !== null && rows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Rows" value={rows.length} />
          <Stat label="Active" value={liveCount} />
          <Stat label="Inactive" value={rows.length - liveCount} />
        </div>
      )}

      {rows === null && (
        <div className="space-y-1">
          {['sk-1', 'sk-2', 'sk-3'].map((k) => (
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
            ? `Could not load promotions: ${error}`
            : 'No promotions yet — seed rows via Studio.'}
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-text-muted" style={{ fontSize: '11px' }}>
            <tr>
              <th className="pb-2 font-mono uppercase">Slot</th>
              <th className="pb-2 font-mono uppercase">Behavior</th>
              <th className="pb-2 font-mono uppercase">Scope</th>
              <th className="pb-2 font-mono uppercase">Prio</th>
              <th className="pb-2 font-mono uppercase">Window</th>
              <th className="pb-2 font-mono uppercase">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40 align-top">
                <td className="py-1.5 font-mono text-text" style={{ fontSize: '12px' }}>
                  {r.slot_key}
                </td>
                <td className="py-1.5 text-text-silver" style={{ fontSize: '12px' }}>
                  {r.behavior ?? '—'}
                </td>
                <td className="py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {scopeChips(r).map((c) => (
                      <span
                        key={c}
                        className="rounded-sm bg-text-muted/15 px-1.5 py-0.5 font-mono text-text-muted"
                        style={{ fontSize: '9px' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '12px' }}>
                  {r.priority}
                </td>
                <td className="py-1.5 font-mono text-text-muted" style={{ fontSize: '11px' }}>
                  {windowLabel(r)}
                </td>
                <td className="py-1.5">
                  <span
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 font-mono uppercase',
                      r.active
                        ? 'bg-kettle-sourced/15 text-kettle-sourced'
                        : 'bg-text-muted/15 text-text-muted',
                    )}
                    style={{ fontSize: '9px' }}
                  >
                    {r.active ? 'active' : 'off'}
                  </span>
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
