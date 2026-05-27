// TrendingAtoms — Bee-facing sidebar component.
// Reads top 10 atoms from atom_trending_24h matview, joins with atoms for
// display fields, renders with DiscoveryTierChip per amendment §2.5.
//
// Refresh cadence per spec §4.4: every 15 min via cron once pg_cron lands.
// Until then, refresh is manual via SELECT public.refresh_atom_trending()
// from a service-role context.

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DiscoveryTierChip } from '@/components/ui/DiscoveryTierChip';
import type { DiscoveryTier } from '@/lib/discovery-ladder/colors';
import { useManualStore } from '@/stores/useManualStore';
import { cn } from '@/lib/utils';

interface TrendingRow {
  atom_id: string;
  vote_count_24h: number;
  total_weight_24h: number | null;
  name: string;
  realm_id: string;
  kettle: DiscoveryTier;
  path: string;
}

const LIMIT = 10;

export function TrendingAtoms() {
  const [rows, setRows] = useState<TrendingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectAtom = useManualStore((s) => s.selectAtom);

  useEffect(() => {
    if (!supabase) {
      setError('Trending unavailable in read-only mode');
      setRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from('atom_trending_24h')
        .select('atom_id, vote_count_24h, total_weight_24h, atoms!inner(name, realm_id, kettle, path)')
        .order('vote_count_24h', { ascending: false })
        .limit(LIMIT);
      if (cancelled) return;
      if (fetchErr) {
        console.warn('TrendingAtoms fetch failed', fetchErr.message);
        setError('Could not load trending atoms');
        setRows([]);
        return;
      }
      // supabase-js infers the joined `atoms` relation as either a scalar
      // object or an array depending on FK detection. Cast through unknown
      // and normalize at runtime — works regardless of which shape the
      // generated types use.
      type AtomRel = { name: string; realm_id: string; kettle: string; path: string };
      type RawRow = {
        atom_id: string;
        vote_count_24h: number;
        total_weight_24h: number | null;
        atoms: AtomRel | AtomRel[] | null;
      };
      const flat: TrendingRow[] = ((data ?? []) as unknown as RawRow[])
        .map((r) => {
          const atom: AtomRel | null = Array.isArray(r.atoms)
            ? (r.atoms[0] ?? null)
            : r.atoms;
          if (!atom) return null;
          return {
            atom_id: r.atom_id,
            vote_count_24h: r.vote_count_24h,
            total_weight_24h: r.total_weight_24h,
            name: atom.name,
            realm_id: atom.realm_id,
            kettle: atom.kettle as DiscoveryTier,
            path: atom.path,
          };
        })
        .filter((x): x is TrendingRow => x !== null);
      setRows(flat);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3" aria-labelledby="trending-atoms-heading">
      <header className="flex items-center gap-2">
        <TrendingUp size={14} className="text-text-silver-bright" aria-hidden />
        <h2
          id="trending-atoms-heading"
          className="font-display text-lg font-semibold text-text-silver-bright"
        >
          Trending in The Manual
        </h2>
      </header>
      <p
        className="font-mono text-text-muted"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        last 24 h · top {LIMIT} by vote activity
      </p>

      {rows === null && (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse-slow rounded-md border border-border bg-bg-elevated/40"
            />
          ))}
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-4 text-center">
          <p className="text-text-dim" style={{ fontSize: '13px' }}>
            {error ?? 'No trending atoms yet — be the first to vote!'}
          </p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.atom_id}>
              <button
                type="button"
                onClick={() => selectAtom(r.atom_id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border border-transparent',
                  'px-2 py-1.5 text-left transition-colors',
                  'hover:border-border hover:bg-bg-elevated',
                )}
              >
                <span
                  className="flex-shrink-0 font-mono uppercase text-text-muted"
                  style={{ fontSize: '10px', minWidth: '2.5em' }}
                  data-size="meta"
                  title={`${r.vote_count_24h} votes in last 24h`}
                >
                  {r.vote_count_24h}×
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-text" style={{ fontSize: '13px' }}>
                    {r.name}
                  </div>
                  <div
                    className="truncate font-mono text-text-muted"
                    style={{ fontSize: '10px' }}
                    data-size="meta"
                  >
                    {r.realm_id}
                  </div>
                </div>
                <DiscoveryTierChip tier={r.kettle} compact className="flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        className="border-t border-border pt-2 font-mono text-text-muted"
        style={{ fontSize: '10px' }}
        data-size="meta"
        title="Materialized view refreshes every 15 min (cron pending)"
      >
        refreshed every 15 min
      </p>
    </section>
  );
}
