// HQ §8 — Astra Status (INFRA STATUS SLIDER)
//
// Panel A: 38-Astra catalog from astra-registry-canonical-v1.md, grouped by
//   category, with runtime cross-reference against ASTRA_REGISTRY for live
//   status. Filterable by free-text search across slug/wordmark/host.
// Panel B: infrastructure layer status cards (hardcoded "operational" for
//   v1; live API polling pending env-token config in a follow-up dispatch).
//
// Per shared/canon/manual-spine-api-v1.md §4.5 + master-master-file.md §19.3
// INFRA STATUS SLIDER.

import { useMemo, useState } from 'react';
import { Search, Globe } from 'lucide-react';
import {
  ASTRA_CATALOG,
  ASTRA_CATEGORY_LABEL,
  ASTRA_STATUS_COLOR,
  CONSTELLATION_HUBS,
  effectiveStatus,
  groupByCategory,
  type AstraCatalogEntry,
} from '@/lib/astra-catalog';
import { cn } from '@/lib/utils';

interface InfraLayer {
  name: string;
  identifier: string;
  status: 'operational' | 'degraded' | 'down';
  last_verified: string;
  note: string;
}

const INFRA_LAYERS: InfraLayer[] = [
  {
    name: 'Railway',
    identifier: 'deployment platform · auto-deploy on push to main',
    status: 'operational',
    last_verified: '2026-05-27',
    note: 'Live status polling pending — v1 shows operator-set status.',
  },
  {
    name: 'GitHub',
    identifier: 'github.com/rebelutionxyz/themanual-tech',
    status: 'operational',
    last_verified: '2026-05-27',
    note: 'Active branches: main, feat/atlasoracle-v1, feat/manual-spine-v1.',
  },
  {
    name: 'Supabase',
    identifier: 'anxmqiehpyznifqgskzc · Pro plan',
    status: 'operational',
    last_verified: '2026-05-27',
    note: 'Production project — RLS + matviews + Edge Functions all healthy at last check.',
  },
  {
    name: 'Anthropic API',
    identifier: 'AtlasORACLE provider · Sonnet 4.6 / Opus 4.7 / Haiku 4.5',
    status: 'operational',
    last_verified: '2026-05-27',
    note: 'Monthly cap usage tracking pending FE instrumentation.',
  },
];

const STATUS_INDICATOR_COLOR: Record<InfraLayer['status'], string> = {
  operational: '#16a34a',
  degraded:    '#eab308',
  down:        '#dc2626',
};

export function AstraStatus() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return groupByCategory();
    const q = query.toLowerCase();
    return groupByCategory().map((g) => ({
      ...g,
      entries: g.entries.filter((e) =>
        e.slug.toLowerCase().includes(q)
        || e.wordmark.toLowerCase().includes(q)
        || e.hosts.some((h) => h.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.entries.length > 0);
  }, [query]);

  const liveCount = ASTRA_CATALOG.filter((e) => effectiveStatus(e) === 'live').length;
  const scaffoldedCount = ASTRA_CATALOG.filter((e) => effectiveStatus(e) === 'scaffolded').length;
  const deferredCount = ASTRA_CATALOG.filter((e) => effectiveStatus(e) === 'deferred').length;
  const postSwarmCount = ASTRA_CATALOG.filter((e) => effectiveStatus(e) === 'post-Swarm').length;

  return (
    <div className="space-y-8">
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Astra Status</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          INFRA STATUS SLIDER · 38 Astras across 7 categories · 3 constellation hubs
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Live"        value={liveCount}        color="#16a34a" />
        <Stat label="Scaffolded"  value={scaffoldedCount}  color="#eab308" />
        <Stat label="Deferred"    value={deferredCount}    color="#9ca3af" />
        <Stat label="Post-Swarm"  value={postSwarmCount}   color="#4b5563" />
      </div>

      {/* Panel B — Infrastructure layers */}
      <section>
        <h3 className="font-display text-lg font-semibold text-text-silver-bright">Infrastructure layers</h3>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          live status polling pending — v1 shows operator-set status
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {INFRA_LAYERS.map((l) => (
            <div
              key={l.name}
              className="flex items-start gap-3 rounded-md border border-border bg-bg-elevated/30 px-4 py-3"
            >
              <span
                aria-hidden
                className="mt-1.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: STATUS_INDICATOR_COLOR[l.status] }}
                title={l.status}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-semibold text-text-silver-bright">{l.name}</span>
                  <span
                    className="font-mono uppercase text-text-muted"
                    style={{ fontSize: '10px' }}
                  >
                    {l.status}
                  </span>
                </div>
                <div
                  className="mt-0.5 font-mono text-text-muted"
                  style={{ fontSize: '11px' }}
                >
                  {l.identifier}
                </div>
                <div className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>{l.note}</div>
                <div
                  className="mt-1 font-mono text-text-muted"
                  style={{ fontSize: '10px' }}
                >
                  last verified: {l.last_verified}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Panel A — Astra catalog */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-text-silver-bright">Astra catalog</h3>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="filter slug / wordmark / host"
              className={cn(
                'w-64 rounded-md border border-border bg-bg py-1 pl-8 pr-3 text-sm',
                'text-text placeholder:text-text-muted',
                'focus:border-text-silver/50 focus:outline-none',
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((g) => (
            <CategoryGroup key={g.category} category={g.category} entries={g.entries} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
              No Astras match "{query}".
            </div>
          )}
        </div>
      </section>

      {/* Constellation hubs */}
      <section>
        <h3 className="font-display text-lg font-semibold text-text-silver-bright">Constellation hubs</h3>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          navigation surfaces · not Astras
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {CONSTELLATION_HUBS.map((h) => (
            <div
              key={h.constellation}
              className="rounded-md border border-border bg-bg-elevated/30 px-4 py-3"
            >
              <div className="font-display font-semibold text-text-silver-bright">{h.wordmark}</div>
              <div
                className="mt-0.5 font-mono text-text-muted"
                style={{ fontSize: '11px' }}
              >
                {h.hub_domain}
              </div>
              <div className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
                {h.constellation} {h.director ? `· Director: ${h.director}` : ''}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-2">
      <div
        className="flex items-center gap-1.5 font-mono uppercase text-text-muted"
        style={{ fontSize: '10px', letterSpacing: '0.08em' }}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: color }}
        />
        {label}
      </div>
      <div className="font-display text-2xl font-semibold text-text-silver-bright">
        {value}
      </div>
    </div>
  );
}

function CategoryGroup({ category, entries }: { category: AstraCatalogEntry['category']; entries: AstraCatalogEntry[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-md border border-border bg-bg-elevated/20">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold text-text-silver-bright">
            {ASTRA_CATEGORY_LABEL[category]}
          </span>
          <span className="font-mono text-text-muted" style={{ fontSize: '11px' }}>
            {entries.length}
          </span>
        </div>
        <span className="font-mono text-text-muted" style={{ fontSize: '11px' }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && (
        <ul className="border-t border-border/60">
          {entries.map((e) => {
            const status = effectiveStatus(e);
            const style = ASTRA_STATUS_COLOR[status];
            return (
              <li key={e.slug} className="border-b border-border/40 px-4 py-2 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
                    style={{ background: style.bg, color: style.text, fontSize: '10px' }}
                    data-size="meta"
                  >
                    {status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-semibold text-text-silver-bright">{e.wordmark}</span>
                      <span
                        className="font-mono text-text-muted"
                        style={{ fontSize: '11px' }}
                      >
                        {e.slug}
                      </span>
                    </div>
                    <div className="mt-0.5 text-text-dim" style={{ fontSize: '12px' }}>
                      {e.description}
                    </div>
                    {e.hosts.length > 0 && (
                      <div
                        className="mt-1 flex flex-wrap items-center gap-1 font-mono text-text-muted"
                        style={{ fontSize: '10px' }}
                      >
                        <Globe size={10} aria-hidden />
                        {e.hosts.map((h, i) => (
                          <span key={h}>
                            {h}{i < e.hosts.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {e.director && (
                      <div
                        className="mt-0.5 font-mono text-text-muted"
                        style={{ fontSize: '10px' }}
                      >
                        Director: {e.director}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
