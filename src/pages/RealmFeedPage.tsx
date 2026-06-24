import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import { relativeTime } from '@/lib/intel';
import { listThreadFeed, type FeedSort, type ThreadFeedItem } from '@/lib/forumFeed';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_NAMES, REALM_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

const SORTS: { value: FeedSort; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
];

/**
 * Realm category page (work order). forum_thread_feed narrowed by the realm_path
 * prefix (realm root, or the drilled lens path), with a Trending / Top / New
 * sort toggle. The left rail drills realm categories.
 */
export function RealmFeedPage() {
  const { realmId } = useParams<{ realmId: string }>();
  const { realmId: lensRealmId, path: lensPath } = useLensStore();

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

  const [sort, setSort] = useState<FeedSort>('trending');
  const [threads, setThreads] = useState<ThreadFeedItem[] | null>(null);
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
    listThreadFeed(path, sort)
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
  }, [pathKey, sort]);

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          <Link
            to="/intel"
            className="mb-3 inline-flex items-center gap-1 font-mono uppercase tracking-wider text-text-muted transition-colors hover:text-text-silver"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            <ArrowLeft size={11} /> INTEL
          </Link>
          {/* Realm path heading */}
          <div className="mb-1 font-mono uppercase tracking-widest" style={{ fontSize: '11px', color: accent, opacity: 0.75 }} data-size="meta">
            Realm
          </div>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-1.5">
            {path.map((seg, i) => {
              const deepest = i === path.length - 1;
              return (
                <span key={path.slice(0, i + 1).join('/')} className="flex items-baseline gap-x-1.5">
                  {i > 0 && <ChevronRight size={16} className="relative top-[3px] text-text-muted" />}
                  <span
                    className="font-display tracking-wide"
                    style={{ fontSize: deepest ? '24px' : '18px', color: deepest ? accent : '#8A94A0', fontWeight: deepest ? 600 : 400 }}
                  >
                    {seg}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Sort toggle — Trending / Top / New */}
          <div className="mb-5 inline-flex rounded-md border border-border bg-bg-elevated p-0.5">
            {SORTS.map((opt) => {
              const active = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={cn('rounded-sm px-3 py-1 font-mono transition-all', !active && 'text-text-dim hover:text-text-silver')}
                  style={{ fontSize: '12px', ...(active ? { color: accent, background: `${accent}18`, fontWeight: 600 } : {}) }}
                  data-size="meta"
                >
                  {opt.label}
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
            <div className="rounded-lg border-2 border-dashed p-8 text-center" style={{ borderColor: `${accent}40`, background: `${accent}08` }}>
              <p className="mb-2 font-display text-text-silver-bright" style={{ fontSize: '17px', fontWeight: 500 }}>
                No threads here yet
              </p>
              <p className="mx-auto max-w-md text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                Be the first to post in this realm.
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
  );
}

function FeedCard({ thread, accent }: { thread: ThreadFeedItem; accent: string }) {
  const realmName = thread.primaryRealm ? REALM_NAMES[thread.primaryRealm] : null;

  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
        style={{ borderLeft: `3px solid ${accent}80` }}
      >
        <div className="p-4">
          {realmName && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded px-1.5 py-0.5 font-mono" style={{ fontSize: '10px', color: accent, background: `${accent}15` }} data-size="meta">
                {realmName}
              </span>
            </div>
          )}

          <h3 className="font-display text-lg leading-tight text-text-silver-bright group-hover:text-text">{thread.title}</h3>
          {thread.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-text-dim" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              {thread.excerpt}
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
