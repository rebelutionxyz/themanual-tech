/* FRONT21 — /constellation. The full derived Astra set, every one of them a
   reachable route inside themanual.tech (ORACLE_MF v1.24: one home, routes not
   domains). Grouped by the canon categories; each card is honest about whether
   the Astra has a real surface, rides the generic surface renderer, or is a
   stub awaiting its port. The right-rail ConstellationRail is the compact
   always-present twin of this page. */
import {
  ASTRA_CATEGORY_LABEL,
  type AstraCatalogEntry,
  CONSTELLATION_HUBS,
  effectiveStatus,
  groupByCategory,
} from '@/lib/astra-catalog';
import { Link } from 'react-router-dom';

const MOUNT_LABEL: Record<AstraCatalogEntry['mount'], string> = {
  page: 'Surface',
  surface: 'Landing',
  stub: 'Stub',
};

function AstraCard({ entry }: { entry: AstraCatalogEntry }) {
  const status = effectiveStatus(entry);
  return (
    <Link
      to={entry.route}
      className="group flex items-start gap-3 rounded-md border border-border bg-bg-elevated/40 p-3 transition-colors hover:border-border-bright hover:bg-bg-elevated"
    >
      <span
        aria-hidden
        className="mt-1 h-8 w-[3px] flex-shrink-0 rounded-full"
        style={{ background: entry.accent }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className="truncate font-medium text-text-silver group-hover:text-text"
            style={{ fontSize: '13px' }}
          >
            {entry.wordmark}
          </span>
          <span
            className="flex-shrink-0 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {MOUNT_LABEL[entry.mount]}
          </span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          {entry.route} · {status}
        </span>
      </span>
    </Link>
  );
}

export function ConstellationPage() {
  const groups = groupByCategory();
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-16">
        <div
          className="font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          The constellation
        </div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-wide text-text-silver-bright md:text-5xl">
          The constellation
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-text-silver">
          {total} Astras. Every one of them lives here, in the Manual — as a route, not a
          separate address. Some have surfaces. Some are stubs waiting on their port. None
          of them is a dead link.
        </p>

        {groups.map((g) => (
          <section key={g.category} className="mt-10">
            <div
              className="mb-3 font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {ASTRA_CATEGORY_LABEL[g.category]} · {g.entries.length}
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {g.entries.map((e) => (
                <AstraCard key={e.slug} entry={e} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12">
          <div
            className="mb-3 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Constellation hubs · not Astras
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {CONSTELLATION_HUBS.map((h) => (
              <div
                key={h.constellation}
                className="rounded-md border border-border bg-bg-elevated/20 p-3"
              >
                <div className="font-medium text-text-silver" style={{ fontSize: '13px' }}>
                  {h.wordmark}
                </div>
                <div
                  className="mt-0.5 font-mono text-text-muted"
                  style={{ fontSize: '11px' }}
                  data-size="meta"
                >
                  {h.hub_domain}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
