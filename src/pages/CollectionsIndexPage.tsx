import { fetchCollections } from '@/lib/collections';
import type { AtomCollection } from '@/types/manual';
import { ArrowRight, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Collections index — lists every live cross-cutting collection. Read-only;
 * Chat/MCP seeds the rows. Empty until seeded → shows an empty state.
 */
export function CollectionsIndexPage() {
  const [state, setState] = useState<{
    loaded: boolean;
    error: string | null;
    collections: AtomCollection[];
  }>({ loaded: false, error: null, collections: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const collections = await fetchCollections();
        if (!cancelled) setState({ loaded: true, error: null, collections });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setState({ loaded: true, error: msg, collections: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-16">
        <div className="mb-10 flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-bg-elevated/40">
            <Layers size={32} className="text-text-silver" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              The Manual · Collections
            </div>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-wide text-text md:text-5xl">
              Collections
            </h1>
            <p className="mt-1 font-mono text-text-silver" style={{ fontSize: '13px' }}>
              Cross-cutting gatherings of atoms from across the 14 realms.
            </p>
          </div>
        </div>

        {state.error && (
          <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
            <p className="text-kettle-unsourced">Failed to load collections.</p>
            <p
              className="mt-2 font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {state.error}
            </p>
          </div>
        )}

        {!state.error && !state.loaded && (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="inline-block h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
          </div>
        )}

        {!state.error && state.loaded && state.collections.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-text-silver/40" />
            <p className="text-text-silver" style={{ fontSize: '14px' }}>
              No collections yet
            </p>
            <p
              className="mt-2 font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              The first cross-cutting gatherings will appear here once curated.
            </p>
          </div>
        )}

        {!state.error && state.loaded && state.collections.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {state.collections.map((c) => (
              <Link
                key={c.id}
                to={`/collection/${c.slug}`}
                className="group flex items-center gap-3 rounded-md border border-border bg-bg-elevated/40 p-4 transition-colors hover:border-border-bright hover:bg-bg-elevated"
              >
                <Layers
                  size={16}
                  className="flex-shrink-0 text-text-muted opacity-70 group-hover:opacity-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text-silver group-hover:text-text">{c.name}</div>
                  {c.description && (
                    <div
                      className="mt-0.5 truncate font-mono text-text-muted"
                      style={{ fontSize: '11px' }}
                      data-size="meta"
                    >
                      {c.description}
                    </div>
                  )}
                </div>
                <ArrowRight
                  size={14}
                  className="ml-auto flex-shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
