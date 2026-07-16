import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Clock, Bookmark, BookmarkCheck, Share2, Check, X } from 'lucide-react';
import { listFollowedBeeIds } from '@/lib/follows';
import { listThreads, listThreadsByIds, listThreadIdsByAuthor, listThreadIdsByAuthors, relativeTime, type ForumThread } from '@/lib/intel';
import { forumSearch, listThreadFeed, type FeedSort, type ThreadFeedItem } from '@/lib/forumFeed';
import { timeAfterISO } from '@/lib/timePresets';
import {
  listSavedThreadIds,
  toggleSave,
  isSavedBatch,
  getReactionsBatch,
  createShareLink,
  type ReactionSummary,
} from '@/lib/reactions';
import { ReactionBar } from '@/components/intel/ReactionBar';
import { useManualData } from '@/lib/useManualData';
import { useLensStore } from '@/stores/useLensStore';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { FeedInlineSlot } from '@/components/promotions/FeedInlineSlot';
import { usePromotionSlot } from '@/lib/promotions/usePromotionSlot';
import {
  KETTLE_COLORS,
  REALM_COLORS,
  REALM_NAMES,
  REALM_ID_BY_NAME,
  BEE_COLOR,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CARD_INK, cardChipStyle, realmCardStyle } from '@/lib/realmCardStyle';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import type { RealmId } from '@/types/manual';

interface ThreadListProps {
  /** Facet-lens prefix (display-name segments on realm_path). [] = all threads. */
  prefix: string[];
  sortBy?: 'hot' | 'new' | 'top';
  timeWindowHours?: number;
  /**
   * When set, the list is sourced from forum_thread_feed(prefix, feedSort)
   * (ranked trending/top/new feed) instead of the legacy listThreads path.
   */
  feedSort?: FeedSort;
  /** When true, list only threads this Bee has saved. Ignores the prefix. */
  savedMode?: boolean;
  /** When true, list only threads authored by this Bee, newest first. Ignores the prefix. */
  myThreadsMode?: boolean;
  /** When true, list only threads authored by Bees this Bee follows. Ignores the prefix. */
  followingMode?: boolean;
}

/** forum_thread_feed row → the ForumThread shape the cards render. */
function feedItemToThread(f: ThreadFeedItem): ForumThread {
  return {
    id: f.id,
    title: f.title,
    body: f.excerpt,
    createdBy: f.authorBeeId,
    parentSurface: 'intel',
    parentId: null,
    primaryRealm: f.primaryRealm,
    primaryL2: f.realmPath[1] ?? null,
    replyCount: f.replyCount,
    lastActivityAt: f.lastActivityAt,
    isLocked: f.isLocked,
    createdAt: f.createdAt,
    authorHandle: f.authorHandle ?? undefined,
  };
}

export function ThreadList({
  prefix,
  sortBy = 'hot',
  timeWindowHours = 0,
  feedSort,
  savedMode = false,
  myThreadsMode = false,
  followingMode = false,
}: ThreadListProps) {
  const { atoms } = useManualData();
  const { bee } = useAuth();

  // Realm slug for promo targeting + accent color, derived from the prefix root.
  const selectedRealmId: RealmId | null = prefix[0]
    ? (REALM_ID_BY_NAME[prefix[0]] ?? null)
    : null;

  const personalSortKey = savedMode
    ? 'intel-sort-saved'
    : myThreadsMode
      ? 'intel-sort-mythreads'
      : followingMode
        ? 'intel-sort-following'
        : null;
  const [personalSortMode, setPersonalSortModeState] = useState<'newest' | 'active'>(() => {
    if (!personalSortKey) return 'newest';
    try {
      const stored = localStorage.getItem(personalSortKey);
      if (stored === 'active') return 'active';
    } catch {
      // localStorage may throw in private browsing modes — fall through
    }
    return 'newest';
  });
  function setPersonalSortMode(next: 'newest' | 'active') {
    setPersonalSortModeState(next);
    if (personalSortKey) {
      try {
        localStorage.setItem(personalSortKey, next);
      } catch {
        // Non-fatal
      }
    }
  }

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function handleToggleSave(threadId: string) {
    if (!bee?.id) return;
    const currentlySaved = savedIds.has(threadId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
    try {
      await toggleSave('intel', threadId, bee.id);
      window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
    } catch (err) {
      console.warn('toggleSave failed:', err);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(threadId);
        else next.delete(threadId);
        return next;
      });
    }
  }
  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable serialization of the prefix for effect deps (segments are plain text).
  const prefixKey = prefix.join(' ');

  // Multi-select realm filter (the chip set) → OR-filtered feed. realmKey is the
  // stable effect dep so the feed re-fetches when ANY selected realm changes —
  // not just the first one (which `prefix` tracks).
  const selectedRealms = useLensStore((s) => s.selectedRealms);
  const realmPrefixes = selectedRealms.map((r) => r.pathParts);
  const realmKey = selectedRealms.map((r) => r.key).join('|');

  // Astra-local search (cross-realm). ≥2 chars → results REPLACE the feed.
  const searchTerm = useLensStore((s) => s.searchTerm);
  const clearSearch = useLensStore((s) => s.clearSearch);
  const searching = searchTerm.trim().length >= 2;

  // Time-window lens → p_after (computed at fetch time inside the effect).
  const timePreset = useLensStore((s) => s.timePreset);

  const atomById = useMemo(() => {
    const m = new Map(atoms.map((a) => [a.id, a]));
    return m;
  }, [atoms]);

  const [threadAtomLinks, setThreadAtomLinks] = useState<Map<string, string[]>>(new Map());
  const [threadCategoryLinks, setThreadCategoryLinks] = useState<Map<string, string[]>>(new Map());
  const [reactionSummaries, setReactionSummaries] = useState<Map<string, ReactionSummary>>(new Map());

  // biome-ignore lint/correctness/useExhaustiveDependencies: prefixKey + realmKey are the stable serializations of `prefix` / `realmPrefixes`; depending on the array identities would refetch every render
  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);
    setThreadAtomLinks(new Map());
    setThreadCategoryLinks(new Map());
    setSavedIds(new Set());
    setReactionSummaries(new Map());

    const after = timeAfterISO(timePreset);
    const threadPromise: Promise<ForumThread[]> = searching
      ? forumSearch(searchTerm, 30, after).then((items) => items.map(feedItemToThread))
      : savedMode
        ? bee?.id
          ? (async () => {
              const ids = await listSavedThreadIds(bee.id, personalSortMode);
              return listThreadsByIds(ids);
            })()
          : Promise.resolve([] as ForumThread[])
        : myThreadsMode
          ? bee?.id
            ? (async () => {
                const ids = await listThreadIdsByAuthor(bee.id, personalSortMode);
                return listThreadsByIds(ids);
              })()
            : Promise.resolve([] as ForumThread[])
          : followingMode
            ? bee?.id
              ? (async () => {
                  const followed = await listFollowedBeeIds(bee.id);
                  if (followed.length === 0) return [] as ForumThread[];
                  const ids = await listThreadIdsByAuthors(followed, personalSortMode);
                  return listThreadsByIds(ids);
                })()
              : Promise.resolve([] as ForumThread[])
            : feedSort
              ? listThreadFeed(realmPrefixes, feedSort, 20, 0, after).then((items) =>
                  items.map(feedItemToThread),
                )
              : listThreads({
                  prefix,
                  sortBy,
                  timeWindowHours,
                });

    threadPromise
      .then(async (result) => {
        if (cancelled) return;
        setThreads(result);

        if (result.length > 0 && supabase) {
          const ids = result.map((t) => t.id);
          try {
            const { data } = await supabase
              .from('entity_atom_links')
              .select('entity_id, atom_id')
              .eq('entity_type', 'forum_thread')
              .in('entity_id', ids);
            if (cancelled || !data) return;
            const map = new Map<string, string[]>();
            for (const link of data) {
              const sid = String(link.entity_id);
              const arr = map.get(sid) ?? [];
              arr.push(String(link.atom_id));
              map.set(sid, arr);
            }
            setThreadAtomLinks(map);
          } catch {
            // non-fatal
          }
          try {
            const { data: catData } = await supabase
              .from('entity_category_links')
              .select('entity_id, category_key')
              .eq('entity_type', 'forum_thread')
              .in('entity_id', ids);
            if (cancelled || !catData) return;
            const catMap = new Map<string, string[]>();
            for (const link of catData) {
              const sid = String(link.entity_id);
              const arr = catMap.get(sid) ?? [];
              arr.push(String(link.category_key));
              catMap.set(sid, arr);
            }
            setThreadCategoryLinks(catMap);
          } catch {
            // non-fatal
          }
          if (!savedMode && bee?.id) {
            try {
              const saved = await isSavedBatch(ids, bee.id);
              if (!cancelled) setSavedIds(saved);
            } catch {
              // non-fatal
            }
          } else if (savedMode) {
            setSavedIds(new Set(ids));
          }

          try {
            const reactions = await getReactionsBatch(ids, bee?.id ?? null);
            if (!cancelled) setReactionSummaries(reactions);
          } catch {
            // non-fatal
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load threads');
          setThreads([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [prefixKey, realmKey, searchTerm, timePreset, sortBy, timeWindowHours, feedSort, savedMode, myThreadsMode, followingMode, personalSortMode, bee?.id]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600" style={{ fontSize: '13px' }}>
          Failed to load threads: {error}
        </p>
      </div>
    );
  }

  const searchHeader = searching ? (
    <SearchResultsHeader term={searchTerm.trim()} onClear={clearSearch} />
  ) : null;

  if (threads === null)
    return (
      <>
        {searchHeader}
        <ThreadListSkeleton
          realmId={selectedRealmId}
          savedMode={savedMode}
          myThreadsMode={myThreadsMode}
        />
      </>
    );
  if (threads.length === 0)
    return searching ? (
      <>
        {searchHeader}
        <p
          className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-zinc-500"
          style={{ fontSize: '13px' }}
        >
          No results for “{searchTerm.trim()}”.
        </p>
      </>
    ) : (
      <EmptyThreads
        realmId={selectedRealmId}
        l2={prefix[1] ?? null}
        l3={prefix[2] ?? null}
        savedMode={savedMode}
        myThreadsMode={myThreadsMode}
        followingMode={followingMode}
        signedIn={Boolean(bee?.id)}
      />
    );

  const showPersonalSortToggle =
    (savedMode || myThreadsMode || followingMode) && threads.length > 0;

  return (
    <>
      {searchHeader}
      {showPersonalSortToggle && (
        <PersonalSortToggle
          mode={personalSortMode}
          onChange={setPersonalSortMode}
          accentColor={savedMode ? '#FAD15E' : followingMode ? '#1D9BF0' : BEE_COLOR}
        />
      )}
      <ul className="space-y-2">
        <ThreadListWithInlinePromo
          threads={threads}
          atomIds={threadAtomLinks}
          categoryPaths={threadCategoryLinks}
          atomById={atomById}
          savedIds={savedIds}
          canSave={Boolean(bee?.id)}
          onToggleSave={handleToggleSave}
          reactionSummaries={reactionSummaries}
          realmSlug={selectedRealmId ?? null}
        />
      </ul>
    </>
  );
}

/**
 * Renders thread cards with a single feed-inline promotion injected after
 * the configured Nth card. When no promotion matches and no astra fallback
 * exists, the slot is omitted entirely — feed cards continue without a gap
 * (MMF §19.7 D-4).
 */
function ThreadListWithInlinePromo({
  threads,
  atomIds,
  categoryPaths,
  atomById,
  savedIds,
  canSave,
  onToggleSave,
  reactionSummaries,
  realmSlug,
}: {
  threads: ForumThread[];
  atomIds: Map<string, string[]>;
  categoryPaths: Map<string, string[]>;
  atomById: Map<string, ReturnType<Map<string, unknown>['get']>>;
  savedIds: Set<string>;
  canSave: boolean;
  onToggleSave: (id: string) => void;
  reactionSummaries: Map<string, ReactionSummary>;
  realmSlug: string | null;
}) {
  const slot = usePromotionSlot({
    slotKey: 'feed-inline',
    realmSlug,
  });
  const position = slot.feedInlinePosition ?? 10;

  return (
    <>
      {threads.map((t, i) => (
        <Fragment key={t.id}>
          <ThreadCard
            thread={t}
            atomIds={atomIds.get(t.id) ?? []}
            categoryPaths={categoryPaths.get(t.id) ?? []}
            atomById={atomById}
            saved={savedIds.has(t.id)}
            canSave={canSave}
            onToggleSave={() => onToggleSave(t.id)}
            reactionSummary={reactionSummaries.get(t.id)}
          />
          {i + 1 === position && (
            <li>
              <FeedInlineSlot realmSlug={realmSlug} />
            </li>
          )}
        </Fragment>
      ))}
    </>
  );
}

type AtomShape = {
  id: string;
  name: string;
  kettle: string;
  realmId: RealmId;
  realmName: string;
  pathParts: string[];
};

function ThreadCard({
  thread,
  atomIds,
  categoryPaths,
  atomById,
  saved,
  canSave,
  onToggleSave,
  reactionSummary,
}: {
  thread: ForumThread;
  atomIds: string[];
  categoryPaths: string[];
  atomById: Map<string, ReturnType<Map<string, unknown>['get']>>;
  saved: boolean;
  canSave: boolean;
  onToggleSave: () => void;
  reactionSummary?: ReactionSummary;
}) {
  const setPrefix = useLensStore((s) => s.setPrefix);
  const realmColors = useRealmColors((s) => s.colors);

  const linkedAtoms = atomIds
    .map((id) => atomById.get(id) as AtomShape | undefined)
    .filter((a): a is AtomShape => !!a)
    .slice(0, 4);

  // Card outline + badge are the THREAD'S REALM color (realms.color, fallback
  // map) — NOT the INTEL astra blue. So a Culture thread reads pink, etc.
  const accentColor =
    (thread.primaryRealm && realmColors[thread.primaryRealm]) || REALM_COLOR_FALLBACK;

  const primaryRealmName = thread.primaryRealm ? REALM_NAMES[thread.primaryRealm] : null;
  const primarySet = new Set(
    [primaryRealmName, thread.primaryL2].filter(Boolean).map((s) => String(s)),
  );
  const categoryChips = categoryPaths
    .filter((path) => {
      const leaf = path.split(' / ').pop() ?? path;
      return !primarySet.has(leaf);
    })
    .slice(0, 3);

  function handleAtomClick(e: React.MouseEvent, atom: AtomShape) {
    e.preventDefault();
    e.stopPropagation();
    // Filter to the atom's realm branch (realm › L2 › L3) — a realm_path prefix.
    setPrefix(atom.pathParts.slice(0, 3).filter(Boolean));
  }

  function handleCategoryClick(e: React.MouseEvent, path: string) {
    e.preventDefault();
    e.stopPropagation();
    const parts = path.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0 || !REALM_ID_BY_NAME[parts[0]]) return;
    setPrefix(parts);
  }

  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block overflow-hidden rounded-lg transition-shadow hover:shadow-md"
        style={realmCardStyle(accentColor)}
      >
        <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {primaryRealmName && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 font-mono"
                  style={{ fontSize: '10px', ...cardChipStyle }}
                  data-size="meta"
                >
                  {primaryRealmName}
                </span>
                {thread.primaryL2 && (
                  <span
                    className="rounded px-1.5 py-0.5 font-mono"
                    style={{ fontSize: '10px', ...cardChipStyle }}
                    data-size="meta"
                  >
                    {thread.primaryL2}
                  </span>
                )}
              </div>
            )}

            <h3
              className={cn('font-display text-lg leading-tight', thread.isLocked && 'opacity-70')}
              style={{ color: CARD_INK.title }}
            >
              {thread.title}
            </h3>

            {thread.body && (
              <p
                className="mt-1.5 line-clamp-2"
                style={{ fontSize: '13px', lineHeight: '1.5', color: CARD_INK.body }}
              >
                {thread.body}
              </p>
            )}

            {linkedAtoms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {linkedAtoms.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={(e) => handleAtomClick(e, a)}
                    className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-white/85 transition-colors hover:bg-white/20 hover:text-white"
                    style={{ fontSize: '10.5px' }}
                    title={`Filter by ${a.realmName}${a.pathParts[1] ? ` · ${a.pathParts[1]}` : ''}${a.pathParts[2] ? ` · ${a.pathParts[2]}` : ''}`}
                  >
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{
                        background:
                          KETTLE_COLORS[a.kettle as keyof typeof KETTLE_COLORS] ?? '#C8D1DA',
                      }}
                    />
                    {a.name}
                  </button>
                ))}
                {atomIds.length > 4 && (
                  <span
                    className="font-mono text-white/60"
                    style={{ fontSize: '10.5px' }}
                    data-size="meta"
                  >
                    +{atomIds.length - 4}
                  </span>
                )}
              </div>
            )}

            {categoryChips.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {categoryChips.map((path) => {
                  const leaf = path.split(' / ').pop() ?? path;
                  return (
                    <button
                      type="button"
                      key={path}
                      onClick={(e) => handleCategoryClick(e, path)}
                      className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                      style={{ fontSize: '10px' }}
                      title={`Filter by ${path}`}
                    >
                      <span className="text-white/45">#</span>
                      {leaf}
                    </button>
                  );
                })}
                {categoryPaths.length > categoryChips.length && (
                  <span
                    className="font-mono text-white/60"
                    style={{ fontSize: '10px' }}
                    data-size="meta"
                  >
                    +{categoryPaths.length - categoryChips.length}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-shrink-0 items-start gap-0.5">
            {thread.isLocked && (
              <Lock size={14} className="mt-1.5 mr-1 text-white/55" />
            )}
            <CardShareButton threadId={thread.id} />
            {canSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSave();
                }}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  saved
                    ? 'text-honey hover:bg-honey/10'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )}
                title={saved ? 'Remove from Saved' : 'Save for later'}
                aria-label={saved ? 'Remove from Saved' : 'Save for later'}
              >
                {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              </button>
            )}
          </div>
        </div>

        {reactionSummary &&
          (reactionSummary.counts.honey > 0 ||
            reactionSummary.counts.fire > 0 ||
            reactionSummary.counts.thinking > 0 ||
            reactionSummary.counts.warning > 0 ||
            reactionSummary.counts.check > 0) && (
            <div className="mt-3">
              <ReactionBar
                sourceSurface="intel"
                sourceId={thread.id}
                sourceKind="thread"
                initialSummary={reactionSummary}
                compact
              />
            </div>
          )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/65">
          <MetaPill icon={<MessageSquare size={11} />}>
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </MetaPill>
          <MetaPill icon={<Clock size={11} />}>{relativeTime(thread.lastActivityAt)}</MetaPill>
          {thread.authorHandle && (
            <span
              className="font-mono text-white/65"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              @{thread.authorHandle}
            </span>
          )}
        </div>
        </div>
      </Link>
    </li>
  );
}

function PersonalSortToggle({
  mode,
  onChange,
  accentColor,
}: {
  mode: 'newest' | 'active';
  onChange: (next: 'newest' | 'active') => void;
  accentColor: string;
}) {
  const options: { value: 'newest' | 'active'; label: string; hint: string }[] = [
    { value: 'newest', label: 'Newest', hint: 'Most recently added' },
    { value: 'active', label: 'Recently Active', hint: 'Most recent reply' },
  ];

  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="font-mono uppercase tracking-widest text-zinc-500"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        Sort
      </span>
      <div
        className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5"
        role="radiogroup"
        aria-label="Sort order"
      >
        {options.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA toggle-button-group pattern; <input type="radio"> would require refactoring all chip styling to override appearance
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              title={opt.hint}
              className={cn(
                'rounded-sm px-2.5 py-0.5 font-mono transition-all',
                !active && 'text-zinc-500 hover:text-zinc-800',
              )}
              style={{
                fontSize: '11px',
                ...(active
                  ? {
                      color: accentColor,
                      background: `${accentColor}18`,
                      fontWeight: 600,
                    }
                  : {}),
              }}
              data-size="meta"
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardShareButton({ threadId }: { threadId: string }) {
  const { bee } = useAuth();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const absoluteUrl = `${window.location.origin}/intel/t/${threadId}`;
      const shareUrl = bee
        ? await createShareLink('intel', threadId, bee.id, absoluteUrl)
        : absoluteUrl;

      if (navigator.share) {
        try {
          await navigator.share({ url: shareUrl });
          setCopied(true);
        } catch {
          await copyToClipboardFallback(shareUrl);
          setCopied(true);
        }
      } else {
        await copyToClipboardFallback(shareUrl);
        setCopied(true);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Card share failed:', err);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={pending}
      className={cn(
        'rounded-md p-1.5 transition-colors',
        copied
          ? 'text-emerald-300 hover:bg-emerald-300/10'
          : 'text-white/60 hover:bg-white/10 hover:text-white',
        pending && 'opacity-60',
      )}
      title={copied ? 'Link copied' : bee ? 'Share with affiliate tracking' : 'Copy share link'}
      aria-label={copied ? 'Link copied' : 'Share thread'}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
    </button>
  );
}

async function copyToClipboardFallback(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

/** "Searching: term" banner shown above search results, with a clear (✕) that
    returns the content area to the normal feed (clears useLensStore.searchTerm). */
function SearchResultsHeader({ term, onClear }: { term: string; onClear: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="min-w-0 truncate text-zinc-700" style={{ fontSize: '13px' }}>
        Searching: <span className="font-semibold text-zinc-900">“{term}”</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        style={{ fontSize: '12px' }}
      >
        <X size={13} /> Clear
      </button>
    </div>
  );
}

function MetaPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono"
      style={{ fontSize: '11px' }}
      data-size="meta"
    >
      {icon}
      {children}
    </span>
  );
}

function ThreadListSkeleton({
  realmId,
  savedMode = false,
  myThreadsMode = false,
}: {
  realmId: RealmId | null;
  savedMode?: boolean;
  myThreadsMode?: boolean;
}) {
  const accentColor = savedMode
    ? '#FAD15E'
    : myThreadsMode
      ? BEE_COLOR
      : realmId && REALM_COLORS[realmId]
        ? REALM_COLORS[realmId]
        : '#6B94C8';

  const cards = [
    { titleW: 75, bodyW1: 95, bodyW2: 60, atoms: 3 },
    { titleW: 60, bodyW1: 90, bodyW2: 72, atoms: 2 },
    { titleW: 82, bodyW1: 88, bodyW2: 45, atoms: 4 },
  ];

  return (
    <ul className="space-y-2" aria-label="Loading threads" aria-busy="true">
      {cards.map((c, i) => (
        <li
          key={`skel-${c.titleW}-${c.bodyW1}-${c.atoms}`}
          className="animate-pulse-slow overflow-hidden rounded-lg border border-zinc-200 bg-white"
          style={{
            borderLeft: '3px solid #1D9BF0',
            animationDelay: `${i * 120}ms`,
          }}
        >
          <div className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span
                className="h-3.5 w-14 rounded"
                style={{ background: `${accentColor}25` }}
              />
              <span className="h-3.5 w-20 rounded bg-zinc-100" />
            </div>

            <div className="h-5 rounded bg-zinc-200" style={{ width: `${c.titleW}%` }} />

            <div className="mt-2 space-y-1.5">
              <div
                className="h-3 rounded bg-zinc-100"
                style={{ width: `${c.bodyW1}%` }}
              />
              <div
                className="h-3 rounded bg-zinc-100"
                style={{ width: `${c.bodyW2}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {Array.from({ length: c.atoms }).map((_, j) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: decorative loading skeleton, fixed length per render, no stable identity
                  key={j}
                  className="h-4 rounded border border-zinc-200 bg-zinc-100"
                  style={{
                    width: `${50 + ((j * 17) % 40)}px`,
                  }}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="h-3 w-14 rounded bg-zinc-100" />
              <span className="h-3 w-10 rounded bg-zinc-100" />
              <span className="h-3 w-20 rounded bg-zinc-100" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyThreads({
  realmId,
  l2,
  l3,
  savedMode = false,
  myThreadsMode = false,
  followingMode = false,
  signedIn = true,
}: {
  realmId: RealmId | null;
  l2: string | null;
  l3: string | null;
  savedMode?: boolean;
  myThreadsMode?: boolean;
  followingMode?: boolean;
  signedIn?: boolean;
}) {
  if (followingMode) {
    const signedOut = !signedIn;
    const headline = signedOut ? 'Sign in to build your Following feed' : 'No voices followed yet';
    const subtext = signedOut
      ? 'Your Following feed is tied to your Bee account. Sign in to choose whose voices you hear.'
      : 'Open any thread and hit Follow on its author. Threads from Bees you follow land here — no algorithm, you decide.';
    const FOLLOW_COLOR = '#1D9BF0';
    return (
      <div
        className="rounded-lg border-2 border-dashed p-8 text-center"
        style={{ borderColor: `${FOLLOW_COLOR}40`, background: `${FOLLOW_COLOR}08` }}
      >
        <div
          className="mx-auto mb-4 h-2 w-12 rounded-full"
          style={{ background: FOLLOW_COLOR, opacity: 0.6 }}
        />
        <div
          className="mb-3 inline-block rounded px-2 py-0.5 font-mono uppercase tracking-widest"
          style={{ fontSize: '10px', color: FOLLOW_COLOR, background: `${FOLLOW_COLOR}15` }}
          data-size="meta"
        >
          FOLLOWING
        </div>
        <p className="mb-2 font-display text-zinc-900" style={{ fontSize: '17px', fontWeight: 500 }}>
          {headline}
        </p>
        <p className="mx-auto max-w-md text-zinc-500" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          {subtext}
        </p>
        <Link
          to={signedOut ? '/login' : '/intel'}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
          style={{
            borderColor: `${FOLLOW_COLOR}70`,
            color: FOLLOW_COLOR,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {signedOut ? 'Sign in' : 'Explore threads'}
        </Link>
      </div>
    );
  }

  if (myThreadsMode) {
    const signedOut = !signedIn;
    const headline = signedOut ? 'Sign in to see your threads' : 'Your first thread is waiting';
    const subtext = signedOut
      ? 'Threads you author are tied to your Bee account. Sign in to start posting and earning BLiNG!.'
      : 'Start a thread from any realm. Every thread you post earns Drops — productive action, rewarded.';
    return (
      <div
        className="rounded-lg border-2 border-dashed p-8 text-center"
        style={{
          borderColor: `${BEE_COLOR}40`,
          background: `${BEE_COLOR}08`,
        }}
      >
        <div className="mx-auto mb-4 flex items-center justify-center">
          <svg width="36" height="40" viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg">
            <title>No threads yet</title>
            <polygon
              points="18,2 34,11 34,29 18,38 2,29 2,11"
              fill="none"
              stroke={BEE_COLOR}
              strokeWidth="1.5"
              opacity="0.7"
            />
            <polygon
              points="18,10 26,14.5 26,23.5 18,28 10,23.5 10,14.5"
              fill={BEE_COLOR}
              opacity="0.25"
            />
          </svg>
        </div>
        <div
          className="mb-3 inline-block rounded px-2 py-0.5 font-mono uppercase tracking-widest"
          style={{
            fontSize: '10px',
            color: BEE_COLOR,
            background: `${BEE_COLOR}15`,
          }}
          data-size="meta"
        >
          MY THREADS
        </div>
        <p
          className="mb-2 font-display text-zinc-900"
          style={{ fontSize: '17px', fontWeight: 500 }}
        >
          {headline}
        </p>
        <p
          className="mx-auto max-w-md text-zinc-500"
          style={{ fontSize: '13px', lineHeight: '1.5' }}
        >
          {subtext}
        </p>
        {signedOut ? (
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
            style={{
              borderColor: `${BEE_COLOR}70`,
              color: BEE_COLOR,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        ) : (
          <Link
            to="/intel"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors hover:brightness-110"
            style={{
              borderColor: `${BEE_COLOR}70`,
              color: BEE_COLOR,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Start a thread
          </Link>
        )}
      </div>
    );
  }

  if (savedMode) {
    const signedOut = !signedIn;
    const headline = signedOut ? 'Sign in to see your Saved threads' : 'Nothing saved yet';
    const subtext = signedOut
      ? 'Your bookmarks are tied to your Bee account. Sign in to start saving threads.'
      : 'Click the 🔖 bookmark icon on any thread card to save it here for later.';
    return (
      <div
        className="rounded-lg border-2 border-dashed p-8 text-center"
        style={{
          borderColor: '#FAD15E40',
          background: '#FAD15E08',
        }}
      >
        <div
          className="mx-auto mb-4 h-2 w-12 rounded-full"
          style={{ background: '#FAD15E', opacity: 0.6 }}
        />
        <div
          className="mb-3 inline-block rounded px-2 py-0.5 font-mono uppercase tracking-widest"
          style={{
            fontSize: '10px',
            color: '#FAD15E',
            background: '#FAD15E15',
          }}
          data-size="meta"
        >
          SAVED
        </div>
        <p
          className="mb-2 font-display text-zinc-900"
          style={{ fontSize: '17px', fontWeight: 500 }}
        >
          {headline}
        </p>
        <p
          className="mx-auto max-w-md text-zinc-500"
          style={{ fontSize: '13px', lineHeight: '1.5' }}
        >
          {subtext}
        </p>
        {signedOut ? (
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors"
            style={{
              borderColor: '#FAD15E60',
              color: '#FAD15E',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Sign in
          </Link>
        ) : (
          <Link
            to="/intel"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors"
            style={{
              borderColor: '#6B94C860',
              color: '#6B94C8',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Browse INTEL
          </Link>
        )}
      </div>
    );
  }

  const realmName = realmId ? REALM_NAMES[realmId] : null;
  const location = [realmName, l2, l3].filter(Boolean).join(' · ') || 'INTEL';

  const accentColor = realmId && REALM_COLORS[realmId] ? REALM_COLORS[realmId] : '#6B94C8';

  const isSpecific = Boolean(l2 || l3);
  const headline = isSpecific
    ? `No threads in ${location} yet`
    : realmName
      ? `No threads in ${realmName} yet`
      : 'The feed is quiet';

  const subtext = isSpecific
    ? 'Be the first Bee to post here. Earn BLiNG! for sparking the conversation.'
    : realmName
      ? 'Start the discussion for this realm. Your thread sets the tone.'
      : 'Pick a realm from the top, or start something from scratch. Every thread begins with one Bee.';

  return (
    <div
      className="rounded-lg border-2 border-dashed p-8 text-center"
      style={{
        borderColor: `${accentColor}40`,
        background: `${accentColor}08`,
      }}
    >
      <div
        className="mx-auto mb-4 h-2 w-12 rounded-full"
        style={{ background: accentColor, opacity: 0.6 }}
      />

      {realmName && (
        <div
          className="mb-3 inline-block rounded px-2 py-0.5 font-mono uppercase tracking-widest"
          style={{
            fontSize: '10px',
            color: accentColor,
            background: `${accentColor}15`,
          }}
          data-size="meta"
        >
          {location}
        </div>
      )}

      <p
        className="mb-2 font-display text-zinc-900"
        style={{ fontSize: '17px', fontWeight: 500 }}
      >
        {headline}
      </p>

      <p
        className="mx-auto max-w-md text-zinc-500"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
      >
        {subtext}
      </p>

      <Link
        to="/intel/new"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border-2 px-4 py-1.5 transition-colors"
        style={{
          borderColor: `${accentColor}60`,
          color: accentColor,
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <span style={{ color: '#FAD15E' }}>✦</span>
        Start a thread
        <span
          className="font-mono"
          style={{ fontSize: '10px', opacity: 0.7 }}
          data-size="meta"
        >
          Earn BLiNG!
        </span>
      </Link>

      {realmName && (
        <p
          className="mt-4 font-mono text-zinc-500"
          style={{ fontSize: '10.5px' }}
          data-size="meta"
        >
          Or pick "All" at the top to see every INTEL thread
        </p>
      )}
    </div>
  );
}
