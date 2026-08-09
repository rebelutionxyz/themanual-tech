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
import { useIsAdmin } from '@/lib/useIsAdmin';
import { ShieldAlert } from 'lucide-react';
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

/* FRONT31 — the not-authorised state. Deliberately the same shape and the same
   behaviour /hq gives a non-admin: a plain in-place panel, NOT a redirect. No
   teaser, no partial list, no "sign in to see" — per the owner ruling a
   non-admin sees nothing of the catalogue at all. Markup mirrors
   HQControlRoom's local Gate; that component is not exported, and exporting it
   would mean editing a working admin gate from a presentation pass. */
function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg rounded-lg border border-border bg-bg-elevated p-8 text-center">
        <ShieldAlert size={28} className="mx-auto mb-4 text-text-silver/60" aria-hidden />
        <h1 className="font-display text-xl font-semibold text-text-silver-bright">{title}</h1>
        <p className="mt-3 text-text-dim" style={{ fontSize: '13px' }}>
          {body}
        </p>
      </div>
    </div>
  );
}

export function ConstellationPage() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const groups = groupByCategory();
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  // Hold the surface until access resolves — no flash of the catalogue, which
  // is the entire thing this pass exists to stop.
  if (adminLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Gate
        title="The constellation is an admin tool"
        body="This page lists the platform's Astra catalogue and its build states. Access is restricted to admin accounts."
      />
    );
  }

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
