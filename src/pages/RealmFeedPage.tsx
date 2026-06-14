import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, MessageSquare, Clock } from 'lucide-react';
import { listRealmFeed, relativeTime, type ForumThread } from '@/lib/intel';
import { useLensStore } from '@/stores/useLensStore';
import { RealmTreeSidebar } from '@/components/intel/RealmTreeSidebar';
import { REALM_NAMES, REALM_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

// Source chips (dispatch B3) — All + the meaningful parent_surface values.
// Labels are singular display text only; each chip keeps its parent_surface value.
const SOURCE_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'intel', label: 'Forum' },
  { value: 'unite', label: 'Group' },
  { value: 'rule', label: 'Event' },
  { value: 'comms', label: 'Comms' },
  { value: 'give', label: 'Give' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'chat', label: 'Chat' },
];

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_CHIPS.filter((c) => c.value !== 'all').map((c) => [c.value, c.label]),
);

/**
 * Cross-Astra realm lens feed (dispatch Part B).
 *
 * forum_threads narrowed by realm_path prefix (the full drilled path from the
 * toolbar lens), unioned across all parent_surface. The Source chip row filters
 * to one parent_surface on top.
 */
export function RealmFeedPage() {
  const { realmId } = useParams<{ realmId: string }>();
  const navigate = useNavigate();
  const { realmId: lensRealmId, path: lensPath, source, setSource, setLens, reset } =
    useLensStore();

  const validRealm = realmId && realmId in REALM_NAMES ? (realmId as RealmId) : null;
  const realmName = validRealm ? REALM_NAMES[validRealm] : null;

  // The drilled path narrowing the feed. Use the lens path when it matches this
  // realm (deep drill); otherwise fall back to the realm root (deep links).
  const path =
    validRealm && lensRealmId === validRealm && lensPath.length > 0
      ? lensPath
      : realmName
        ? [realmName]
        : [];

  const accent = validRealm ? REALM_COLORS[validRealm] : '#6B94C8';

  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pathKey = path.join(' / ');
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathKey is the stable serialization of `path`; including the array identity would refetch every render
  useEffect(() => {
    if (path.length === 0) {
      setThreads([]);
      return;
    }
    let cancelled = false;
    setThreads(null);
    setError(null);
    listRealmFeed(path, source)
      .then((rows) => {
        if (!cancelled) setThreads(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load feed');
          setThreads([]);
        }
      });
    return () => {
      cancelled = true;
    };
    // pathKey + source capture the meaningful inputs.
  }, [pathKey, source]);

  if (!validRealm) {
    return (
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-text-silver">Unknown realm.</p>
        <Link to="/intel" className="mt-3 inline-block text-sm" style={{ color: '#6B94C8' }}>
          Back to INTEL
        </Link>
      </div>
    );
  }

  // Persistent realm-aware left sidebar for the realm-lens feed. Mounting it
  // here gives the realm view the left rail that /intel and /manual have; the
  // container stays mounted across realm switches (same route component), only
  // the active realm + feed update.
  function handleSelectRealm(id: RealmId | null) {
    if (id) {
      setLens(id, [REALM_NAMES[id]]);
      navigate(`/realm/${id}`);
    } else {
      reset();
      navigate('/intel');
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Realm-subtree drill rail — desktop/tablet. On mobile, drill via the
          global toolbar's Realm popup. */}
      <aside className="hidden w-56 flex-shrink-0 md:block">
        <RealmTreeSidebar realmId={validRealm} onSwitchRealm={handleSelectRealm} />
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      {/* Realm path heading */}
      <div className="mb-1 font-mono uppercase tracking-widest" style={{ fontSize: '11px', color: accent, opacity: 0.75 }} data-size="meta">
        Realm lens · cross-Astra
      </div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-1.5">
        {path.map((seg, i) => {
          const deepest = i === path.length - 1;
          return (
            <span key={path.slice(0, i + 1).join('/')} className="flex items-baseline gap-x-1.5">
              {i > 0 && <ChevronRight size={16} className="relative top-[3px] text-text-muted" />}
              <span
                className="font-display tracking-wide"
                style={{
                  fontSize: deepest ? '24px' : '18px',
                  color: deepest ? accent : '#8A94A0',
                  fontWeight: deepest ? 600 : 400,
                }}
              >
                {seg}
              </span>
            </span>
          );
        })}
      </div>

      {/* Source selector chip row — one line on mobile (scrolls on ultra-narrow),
          roomier on larger screens. */}
      <div className="scrollbar-none mb-5 flex flex-nowrap items-center gap-1 overflow-x-auto sm:gap-1.5">
        {SOURCE_CHIPS.map((chip) => {
          const active = source === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setSource(chip.value)}
              className={cn(
                'flex-shrink-0 rounded-full border px-2 py-0.5 text-xs tracking-wide transition-colors sm:px-3 sm:py-1',
                active
                  ? 'text-bg'
                  : 'border-border bg-bg-elevated text-text-silver hover:border-border-bright hover:text-text',
              )}
              style={active ? { background: accent, borderColor: accent, fontWeight: 600 } : undefined}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
          <p className="text-kettle-unsourced" style={{ fontSize: '13px' }}>
            Failed to load feed: {error}
          </p>
        </div>
      )}

      {!error && threads === null && (
        <p className="font-mono text-text-muted" style={{ fontSize: '12px' }}>
          Loading…
        </p>
      )}

      {!error && threads !== null && threads.length === 0 && (
        <div
          className="rounded-lg border-2 border-dashed p-8 text-center"
          style={{ borderColor: `${accent}40`, background: `${accent}08` }}
        >
          <p className="mb-2 font-display text-text-silver-bright" style={{ fontSize: '17px', fontWeight: 500 }}>
            No threads tagged here yet
          </p>
          <p className="mx-auto max-w-md text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            {source === 'all'
              ? 'Nothing tagged to this path across the constellation yet. New posts that tag this branch will show here.'
              : `No ${SOURCE_LABEL[source] ?? source} posts tagged here. Try “All”, or pick a different source.`}
          </p>
          <Link
            to="/intel/new"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors"
            style={{ borderColor: `${accent}60`, color: accent, fontSize: '12px', fontWeight: 600 }}
          >
            Start a thread
          </Link>
        </div>
      )}

      {!error && threads !== null && threads.length > 0 && (
        <ul className="space-y-2">
          {threads.map((t) => (
            <FeedCard key={t.id} thread={t} accent={accent} />
          ))}
        </ul>
      )}
        </div>
      </div>
    </div>
  );
}

function FeedCard({ thread, accent }: { thread: ForumThread; accent: string }) {
  const realmName = thread.primaryRealm ? REALM_NAMES[thread.primaryRealm] : null;
  const sourceLabel = thread.parentSurface ? SOURCE_LABEL[thread.parentSurface] ?? thread.parentSurface : null;

  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
        style={{ borderLeft: `3px solid ${accent}80` }}
      >
        <div className="p-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {realmName && (
              <span className="rounded px-1.5 py-0.5 font-mono" style={{ fontSize: '10px', color: accent, background: `${accent}15` }} data-size="meta">
                {realmName}
              </span>
            )}
            {/* Source badge — derived from parent_surface */}
            <span
              className="rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
              style={{ fontSize: '9.5px', color: '#C8D1DA', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              data-size="meta"
            >
              {sourceLabel ?? 'Forums'}
            </span>
          </div>

          <h3 className="font-display text-lg leading-tight text-text-silver-bright group-hover:text-text">
            {thread.title}
          </h3>
          {thread.body && (
            <p className="mt-1.5 line-clamp-2 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              {thread.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
            <span className="inline-flex items-center gap-1 font-mono" style={{ fontSize: '11px' }} data-size="meta">
              <MessageSquare size={11} />
              {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <span className="inline-flex items-center gap-1 font-mono" style={{ fontSize: '11px' }} data-size="meta">
              <Clock size={11} />
              {relativeTime(thread.lastActivityAt)}
            </span>
            {thread.authorHandle && (
              <span className="font-mono text-text-silver" style={{ fontSize: '11px' }} data-size="meta">
                @{thread.authorHandle}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
