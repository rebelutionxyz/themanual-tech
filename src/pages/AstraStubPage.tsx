/* FRONT21 — the honest Astra stub.
   ORACLE_MF v1.24 ruled that every Astra lives in themanual.tech as a route.
   Most Astras have no ported code yet, so their route lands here: a real page
   that says plainly what the Astra is and that it is a stub. No dead links, no
   silent redirect to /manual (the old /:slug fallback), no fake "live" surface.
   Real trees port in follow-on passes and flip `mount` in lib/astra-catalog.ts
   from 'stub' to 'page'. */
import { ASTRA_CATEGORY_LABEL, type AstraCatalogEntry, effectiveStatus } from '@/lib/astra-catalog';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COPY: Record<string, string> = {
  live: 'Live elsewhere in the Manual',
  scaffolded: 'Scaffolded — code exists, not ported to this route yet',
  deferred: 'Deferred — named in canon, not started',
  'post-Swarm': 'Post-Swarm — after the Swarm milestone',
};

export function AstraStubPage({ entry }: { entry: AstraCatalogEntry }) {
  const status = effectiveStatus(entry);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10 md:py-16">
        <Link
          to="/constellation"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-text-muted transition-colors hover:text-text-silver"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          <ArrowLeft size={12} />
          The constellation
        </Link>

        <div className="flex items-start gap-5">
          <div
            aria-hidden
            className="mt-1.5 h-14 w-[3px] flex-shrink-0 rounded-full"
            style={{ background: entry.accent }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {ASTRA_CATEGORY_LABEL[entry.category]} · Astra
            </div>
            <h1
              className="mt-1 font-display text-4xl font-semibold tracking-wide md:text-5xl"
              style={{ color: entry.accent }}
            >
              {entry.wordmark}
            </h1>
            <p className="mt-2 text-lg leading-relaxed text-text-silver-bright">
              {entry.description}
            </p>
          </div>
        </div>

        {/* The stub marker — deliberately loud. This page is a placeholder and
            says so; nothing here pretends to be a working surface. */}
        <div
          className="mt-10 rounded-lg border border-dashed p-6"
          style={{ borderColor: `${entry.accent}66`, background: `${entry.accent}0D` }}
        >
          <div
            className="font-mono uppercase tracking-wider"
            style={{ fontSize: '11px', color: entry.accent }}
            data-size="meta"
          >
            Stub · coming to the Manual
          </div>
          <p className="mt-2 text-text-silver" style={{ fontSize: '14px' }}>
            This Astra has a home here, but no surface yet. {STATUS_COPY[status] ?? status}.
          </p>
          <p className="mt-2 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
            Everything lives in themanual.tech — one home, routes not domains.
          </p>
        </div>

        <dl className="mt-8 grid gap-x-8 gap-y-3 font-mono text-text-muted sm:grid-cols-2" style={{ fontSize: '11px' }}>
          <div>
            <dt className="uppercase tracking-wider">Route</dt>
            <dd className="mt-0.5 text-text-silver">{entry.route}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wider">Status</dt>
            <dd className="mt-0.5 text-text-silver">{status}</dd>
          </div>
          {entry.director && (
            <div>
              <dt className="uppercase tracking-wider">Director</dt>
              <dd className="mt-0.5 text-text-silver">{entry.director}</dd>
            </div>
          )}
          {entry.hosts.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="uppercase tracking-wider">Registered domains (dark)</dt>
              <dd className="mt-0.5 text-text-silver">{entry.hosts.join(' · ')}</dd>
            </div>
          )}
        </dl>

        {/* FRONT76 — THE AWAITING-CONFIRM NOTICE IS GONE. It read "awaiting owner
            confirm before it enters the canonical Astra registry", and it was
            shipped copy on /justice and /press. The owner confirmed both on
            2026-08-09 (R1, ORACLE_MF v1.26); the notice then told every visitor
            for nine days that a settled question was still open. Both rows now
            carry `derived: false`, so nothing renders here at all — the honest
            state of a confirmed Astra is silence, not a reassurance. */}
      </div>
    </div>
  );
}
