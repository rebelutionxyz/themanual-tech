import { fetchCollectionBySlug } from '@/lib/collections';
import { KETTLE_COLORS } from '@/lib/constants';
import { useManualStore } from '@/stores/useManualStore';
import type { AtomCollection, AtomCollectionEntry } from '@/types/manual';
import { ArrowLeft, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface PageState {
  loaded: boolean;
  error: string | null;
  notFound: boolean;
  collection: AtomCollection | null;
  entries: AtomCollectionEntry[];
}

const INITIAL: PageState = {
  loaded: false,
  error: null,
  notFound: false,
  collection: null,
  entries: [],
};

/**
 * Single collection — gathered atoms ordered by ordinal. Read-only; Chat/MCP
 * seeds the rows. Clicking an atom opens it in the Manual detail panel.
 */
export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const selectAtom = useManualStore((s) => s.selectAtom);
  const [state, setState] = useState<PageState>(INITIAL);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState(INITIAL);
    (async () => {
      try {
        const res = await fetchCollectionBySlug(slug);
        if (cancelled) return;
        if (!res) {
          setState({ ...INITIAL, loaded: true, notFound: true });
          return;
        }
        setState({
          loaded: true,
          error: null,
          notFound: false,
          collection: res.collection,
          entries: res.entries,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({ ...INITIAL, loaded: true, error: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const openAtom = (id: string) => {
    selectAtom(id);
    navigate('/manual');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-16">
        <Link
          to="/collections"
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-text-muted hover:text-text-silver"
          style={{ fontSize: '12px' }}
        >
          <ArrowLeft size={13} /> All collections
        </Link>

        {state.error && (
          <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
            <p className="text-kettle-unsourced">Failed to load this collection.</p>
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

        {!state.error && state.loaded && state.notFound && (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-text-silver/40" />
            <p className="text-text-silver" style={{ fontSize: '14px' }}>
              Collection not found
            </p>
            <p
              className="mt-2 font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              No collection lives at <span className="text-text-silver">{slug}</span>.
            </p>
          </div>
        )}

        {!state.error && state.loaded && state.collection && (
          <>
            <div className="mb-8 flex items-start gap-5">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-bg-elevated/40">
                <Layers size={32} className="text-text-silver" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="font-mono uppercase tracking-wider text-text-muted"
                  style={{ fontSize: '11px' }}
                  data-size="meta"
                >
                  Collection · {state.entries.length}{' '}
                  {state.entries.length === 1 ? 'atom' : 'atoms'}
                </div>
                <h1 className="mt-1 font-display text-4xl font-semibold tracking-wide text-text md:text-5xl">
                  {state.collection.name}
                </h1>
                {state.collection.description && (
                  <p className="mt-2 text-text-silver-bright" style={{ fontSize: '15px' }}>
                    {state.collection.description}
                  </p>
                )}
              </div>
            </div>

            {state.entries.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-text-silver/40" />
                <p className="text-text-silver" style={{ fontSize: '14px' }}>
                  No atoms gathered here yet
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {state.entries.map((entry) => (
                  <CollectionAtomRow key={entry.atom.id} entry={entry} onOpen={openAtom} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CollectionAtomRow({
  entry,
  onOpen,
}: {
  entry: AtomCollectionEntry;
  onOpen: (id: string) => void;
}) {
  const { atom, note } = entry;
  const subPath = atom.pathParts.slice(1, -1).join(' / ');
  return (
    <button
      type="button"
      onClick={() => onOpen(atom.id)}
      className="group flex w-full items-center gap-3 rounded-md border border-border bg-bg-elevated/30 px-3 py-2.5 text-left transition-colors hover:border-border-bright hover:bg-bg-elevated"
    >
      <span className="w-3 flex-shrink-0 text-center">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: KETTLE_COLORS[atom.kettle] }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-silver group-hover:text-text">{atom.name}</div>
        {note && (
          <div className="mt-0.5 truncate text-text-muted" style={{ fontSize: '12px' }}>
            {note}
          </div>
        )}
      </div>
      <span
        className="ml-auto flex-shrink-0 truncate font-mono text-text-muted"
        style={{ fontSize: '11px', maxWidth: '220px' }}
        data-size="meta"
      >
        {atom.realmName}
        {subPath && ` · ${subPath}`}
      </span>
    </button>
  );
}
