import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Clock, Bookmark, BookmarkCheck, Share2, Check } from 'lucide-react';
import { listThreads, listThreadsByIds, listThreadIdsByAuthor, relativeTime, type ForumThread } from '@/lib/intel';
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
import { useIntelStore } from '@/stores/useIntelStore';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { KETTLE_COLORS, FRONT_COLORS, REALM_COLORS, BEE_COLOR } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

interface ThreadListProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  selectedL3?: string | null;
  sortBy?: 'hot' | 'new' | 'top';
  timeWindowHours?: number;
  /** When true, list only threads this Bee has saved. Ignores realm filters. */
  savedMode?: boolean;
  /** When true, list only threads authored by this Bee, newest first. Ignores realm filters. */
  myThreadsMode?: boolean;
}

export function ThreadList({
  selectedRealm,
  selectedFront,
  selectedL2,
  selectedL3 = null,
  sortBy = 'hot',
  timeWindowHours = 0,
  savedMode = false,
  myThreadsMode = false,
}: ThreadListProps) {
  const { atoms } = useManualData();
  const { bee } = useAuth();

  // Personal-view sort mode (saved + mythreads). Each view remembers its own
  // preference in localStorage. 'newest' = newest first. 'active' = most
  // recently replied first.
  const personalSortKey = savedMode
    ? 'intel-sort-saved'
    : myThreadsMode
      ? 'intel-sort-mythreads'
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

  // Track which threads the current Bee has saved. Batch-fetched when threads
  // load. Optimistic toggle on click.
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function handleToggleSave(threadId: string) {
    if (!bee?.id) return;
    const currentlySaved = savedIds.has(threadId);
    // Optimistic
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
    try {
      await toggleSave('intel', threadId, bee.id);
      // Notify sidebar to refresh Saved badge count
      window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
    } catch (err) {
      // Rollback
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

  // Precompute atomIds-in-realm for the atom-link filter.
  // Cap at 200: each atom ID is ~80 chars; with BATCH=50 in listThreads we
  // make up to 4 requests per thread fetch. Higher caps cause wasted batches
  // + URL-length 400s.
  const atomIdsInRealm = useMemo(() => {
    if (!selectedRealm) return undefined;
    const matches = atoms.filter((a) => {
      if (a.realm !== selectedRealm) return false;
      if (selectedFront && a.front !== selectedFront) return false;
      if (selectedL2 && a.L2 !== selectedL2) return false;
      if (selectedL3 && a.L3 !== selectedL3) return false;
      return true;
    });
    // Prefer leaves + sourced atoms when capping
    matches.sort((a, b) => {
      const aScore = (a.isLeaf ? 2 : 0) + (a.kettle === 'Sourced' ? 1 : 0);
      const bScore = (b.isLeaf ? 2 : 0) + (b.kettle === 'Sourced' ? 1 : 0);
      return bScore - aScore;
    });
    return matches.slice(0, 200).map((a) => a.id);
  }, [atoms, selectedRealm, selectedFront, selectedL2, selectedL3]);

  // Map atoms by id for quick lookup on cards
  const atomById = useMemo(() => {
    const m = new Map(atoms.map((a) => [a.id, a]));
    return m;
  }, [atoms]);

  // Fetch atom + category links for all visible threads so we can show chips
  const [threadAtomLinks, setThreadAtomLinks] = useState<Map<string, string[]>>(new Map());
  const [threadCategoryLinks, setThreadCategoryLinks] = useState<Map<string, string[]>>(new Map());
  // Batch-fetched reaction summaries (per thread id)
  const [reactionSummaries, setReactionSummaries] = useState<Map<string, ReactionSummary>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);
    setThreadAtomLinks(new Map());
    setThreadCategoryLinks(new Map());
    setSavedIds(new Set());
    setReactionSummaries(new Map());

    // Mode dispatch: savedMode → Bee's bookmarks; myThreadsMode → Bee's authored;
    // otherwise → standard filtered listing.
    const threadPromise: Promise<ForumThread[]> =
      savedMode
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
          : listThreads(
              {
                realm: selectedRealm,
                front: selectedFront,
                l2: selectedL2,
                sortBy,
                timeWindowHours,
              },
              atomIdsInRealm,
            );

    threadPromise
      .then(async (result) => {
        if (cancelled) return;
        setThreads(result);

        // Fetch atom + category links + saved state for these threads (best effort)
        if (result.length > 0 && supabase) {
          const ids = result.map((t) => t.id);
          try {
            const { data } = await supabase
              .from('entity_atom_links')
              .select('source_id, atom_id')
              .eq('source_surface', 'intel')
              .in('source_id', ids);
            if (cancelled || !data) return;
            const map = new Map<string, string[]>();
            for (const link of data) {
              const sid = String(link.source_id);
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
              .select('source_id, category_path')
              .eq('source_surface', 'intel')
              .in('source_id', ids);
            if (cancelled || !catData) return;
            const catMap = new Map<string, string[]>();
            for (const link of catData) {
              const sid = String(link.source_id);
              const arr = catMap.get(sid) ?? [];
              arr.push(String(link.category_path));
              catMap.set(sid, arr);
            }
            setThreadCategoryLinks(catMap);
          } catch {
            // non-fatal (table may not exist pre-migration)
          }
          // Batch-fetch which of these threads the current Bee has saved.
          // In savedMode all are saved by definition; skip the call.
          if (!savedMode && bee?.id) {
            try {
              const saved = await isSavedBatch(ids, bee.id);
              if (!cancelled) setSavedIds(saved);
            } catch {
              // non-fatal (entity_saves table may not be migrated yet)
            }
          } else if (savedMode) {
            // All visible threads are saved in savedMode
            setSavedIds(new Set(ids));
          }

          // Batch-fetch reaction summaries for all visible threads
          try {
            const reactions = await getReactionsBatch(ids, bee?.id ?? null);
            if (!cancelled) setReactionSummaries(reactions);
          } catch {
            // non-fatal (entity_reactions table may not be migrated yet)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load threads');
          setThreads([]); // allow empty state to render instead of infinite skeleton
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRealm, selectedFront, selectedL2, sortBy, timeWindowHours, atomIdsInRealm, savedMode, myThreadsMode, personalSortMode, bee?.id]);

  if (error) {
    return (
      <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
        <p className="text-kettle-unsourced" style={{ fontSize: '13px' }}>
          Failed to load threads: {error}
        </p>
      </div>
    );
  }

  if (threads === null)
    return (
      <ThreadListSkeleton
        realm={selectedRealm}
        front={selectedFront}
        savedMode={savedMode}
        myThreadsMode={myThreadsMode}
      />
    );
  if (threads.length === 0)
    return (
      <EmptyThreads
        realm={selectedRealm}
        front={selectedFront}
        l2={selectedL2}
        l3={selectedL3}
        savedMode={savedMode}
        myThreadsMode={myThreadsMode}
        signedIn={Boolean(bee?.id)}
      />
    );

  const showPersonalSortToggle = (savedMode || myThreadsMode) && threads.length > 0;

  return (
    <>
      {showPersonalSortToggle && (
        <PersonalSortToggle
          mode={personalSortMode}
          onChange={setPersonalSortMode}
          accentColor={savedMode ? '#FAD15E' : BEE_COLOR}
        />
      )}
      <ul className="space-y-2">
        {threads.map((t) => (
          <ThreadCard
            key={t.id}
            thread={t}
            atomIds={threadAtomLinks.get(t.id) ?? []}
            categoryPaths={threadCategoryLinks.get(t.id) ?? []}
            atomById={atomById}
            saved={savedIds.has(t.id)}
            canSave={Boolean(bee?.id)}
            onToggleSave={() => handleToggleSave(t.id)}
            reactionSummary={reactionSummaries.get(t.id)}
          />
        ))}
      </ul>
    </>
  );
}

type AtomShape = {
  id: string;
  name: string;
  kettle: string;
  realm: string;
  front?: Front;
  L2?: string;
  L3?: string;
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
  const { setRealm, setFront, setL2, setL3 } = useIntelStore();

  const linkedAtoms = atomIds
    .map((id) => atomById.get(id) as AtomShape | undefined)
    .filter((a): a is AtomShape => !!a)
    .slice(0, 4);

  // Accent color: Front takes precedence (more specific), else realm
  const accentColor =
    thread.primaryFront && FRONT_COLORS[thread.primaryFront]
      ? FRONT_COLORS[thread.primaryFront]
      : thread.primaryRealm &&
          REALM_COLORS[thread.primaryRealm as keyof typeof REALM_COLORS]
        ? REALM_COLORS[thread.primaryRealm as keyof typeof REALM_COLORS]
        : '#6B94C8'; // default to INTEL blue

  // Show up to 3 category chips (excluding ones that would duplicate primary)
  const primarySet = new Set(
    [thread.primaryRealm, thread.primaryFront, thread.primaryL2]
      .filter(Boolean)
      .map((s) => String(s)),
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
    setRealm(atom.realm);
    if (atom.front) setFront(atom.front);
    if (atom.L2) setL2(atom.L2);
    if (atom.L3) setL3(atom.L3);
  }

  function handleCategoryClick(e: React.MouseEvent, path: string) {
    e.preventDefault();
    e.stopPropagation();
    // Parse the category path to set realm/front/L2/L3 filters
    const parts = path.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const FRONTS = [
      'UNITE & RULE',
      'INVESTIGATE',
      'THE NEW WORLD ORDER',
      'PROSECUTE',
      'THE DEEP STATE',
    ];
    setRealm(parts[0]);
    setFront(null);
    setL2(null);
    setL3(null);
    if (parts.length >= 2) {
      if (FRONTS.includes(parts[1])) {
        setFront(parts[1] as Front);
      } else {
        setL2(parts[1]);
      }
    }
    if (parts.length >= 3) setL3(parts[2]);
  }

  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block overflow-hidden rounded-lg border border-border bg-bg-elevated transition-all hover:border-border-bright hover:bg-panel-2"
        style={{ borderLeft: `3px solid ${accentColor}80` }}
      >
        <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* Primary realm/front/L2 breadcrumb badges */}
            {thread.primaryRealm && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 font-mono"
                  style={{
                    fontSize: '10px',
                    color: accentColor,
                    background: `${accentColor}15`,
                  }}
                  data-size="meta"
                >
                  {thread.primaryRealm}
                </span>
                {thread.primaryFront && (
                  <span
                    className="rounded bg-bg px-1.5 py-0.5 font-display"
                    style={{
                      fontSize: '10px',
                      color: FRONT_COLORS[thread.primaryFront],
                    }}
                  >
                    {thread.primaryFront}
                  </span>
                )}
                {thread.primaryL2 && (
                  <span
                    className="rounded bg-bg px-1.5 py-0.5 font-mono text-text-dim"
                    style={{ fontSize: '10px' }}
                    data-size="meta"
                  >
                    {thread.primaryL2}
                  </span>
                )}
              </div>
            )}

            <h3
              className={cn(
                'font-display text-lg leading-tight text-text-silver-bright group-hover:text-text',
                thread.isLocked && 'opacity-70',
              )}
            >
              {thread.title}
            </h3>

            {thread.body && (
              <p
                className="mt-1.5 line-clamp-2 text-text-dim"
                style={{ fontSize: '13px', lineHeight: '1.5' }}
              >
                {thread.body}
              </p>
            )}

            {/* Linked atoms on card (clickable → filter by atom's context) */}
            {linkedAtoms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {linkedAtoms.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={(e) => handleAtomClick(e, a)}
                    className="inline-flex items-center gap-1 rounded border border-transparent bg-bg/60 px-1.5 py-0.5 text-text-silver transition-colors hover:border-text-silver/30 hover:bg-bg-elevated hover:text-text"
                    style={{ fontSize: '10.5px' }}
                    title={`Filter by ${a.realm}${a.L2 ? ` · ${a.L2}` : ''}${a.L3 ? ` · ${a.L3}` : ''}`}
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
                    className="font-mono text-text-muted"
                    style={{ fontSize: '10.5px' }}
                    data-size="meta"
                  >
                    +{atomIds.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Category tags (from schema v5 multi-category system) */}
            {categoryChips.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {categoryChips.map((path) => {
                  const leaf = path.split(' / ').pop() ?? path;
                  return (
                    <button
                      type="button"
                      key={path}
                      onClick={(e) => handleCategoryClick(e, path)}
                      className="inline-flex items-center gap-1 rounded border border-border/50 bg-bg/40 px-1.5 py-0.5 text-text-dim transition-colors hover:border-border hover:bg-bg hover:text-text-silver"
                      style={{ fontSize: '10px' }}
                      title={`Filter by ${path}`}
                    >
                      <span className="text-text-muted">#</span>
                      {leaf}
                    </button>
                  );
                })}
                {categoryPaths.length > categoryChips.length && (
                  <span
                    className="font-mono text-text-muted"
                    style={{ fontSize: '10px' }}
                    data-size="meta"
                  >
                    +{categoryPaths.length - categoryChips.length}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Top-right actions: lock indicator + share + bookmark */}
          <div className="flex flex-shrink-0 items-start gap-0.5">
            {thread.isLocked && (
              <Lock size={14} className="mt-1.5 mr-1 text-text-muted" />
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
                    : 'text-text-muted hover:bg-bg hover:text-text-silver',
                )}
                title={saved ? 'Remove from Saved' : 'Save for later'}
                aria-label={saved ? 'Remove from Saved' : 'Save for later'}
              >
                {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Reactions row — compact mode. ReactionBar handles hiding zero-count
            reactions and stopping propagation per-button, so we just render
            it unconditionally and trust it to go invisible when empty. */}
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

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
          <MetaPill icon={<MessageSquare size={11} />}>
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </MetaPill>
          <MetaPill icon={<Clock size={11} />}>{relativeTime(thread.lastActivityAt)}</MetaPill>
          {thread.authorHandle && (
            <span
              className="font-mono text-text-silver"
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

/**
 * Sort toggle for Saved + My Threads views. Segmented 2-button control:
 * Newest / Recently Active. Persists to localStorage via ThreadList parent.
 * Accent color mirrors the view (honey for Saved, BEE_COLOR for My Threads).
 */
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
        className="font-mono uppercase tracking-widest text-text-muted"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        Sort
      </span>
      <div
        className="inline-flex rounded-md border border-border bg-bg-elevated p-0.5"
        role="radiogroup"
        aria-label="Sort order"
      >
        {options.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              title={opt.hint}
              className={cn(
                'rounded-sm px-2.5 py-0.5 font-mono transition-all',
                !active && 'text-text-dim hover:text-text-silver',
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

/**
 * Small icon-only share button for thread cards. Mirrors the bookmark icon's
 * visual weight. Stops propagation so the click doesn't open the thread.
 * Shows a Check icon for 2s after successful copy/share.
 */
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

      // navigator.share on mobile, clipboard elsewhere
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
          ? 'text-kettle-sourced hover:bg-kettle-sourced/10'
          : 'text-text-muted hover:bg-bg hover:text-text-silver',
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
  realm,
  front,
  savedMode = false,
  myThreadsMode = false,
}: {
  realm: string | null;
  front: Front | null;
  savedMode?: boolean;
  myThreadsMode?: boolean;
}) {
  // Match ThreadCard accent-color logic for visual continuity between
  // skeleton → real cards. Saved mode uses honey gold. My Threads uses
  // soft amber (Bee color) — your output, earned, honey-family.
  const accentColor = savedMode
    ? '#FAD15E'
    : myThreadsMode
      ? BEE_COLOR
      : front && FRONT_COLORS[front]
        ? FRONT_COLORS[front]
        : realm && REALM_COLORS[realm as keyof typeof REALM_COLORS]
          ? REALM_COLORS[realm as keyof typeof REALM_COLORS]
          : '#6B94C8'; // INTEL blue default

  // Randomized widths to feel like real content rather than uniform bars
  const cards = [
    { titleW: 75, bodyW1: 95, bodyW2: 60, atoms: 3 },
    { titleW: 60, bodyW1: 90, bodyW2: 72, atoms: 2 },
    { titleW: 82, bodyW1: 88, bodyW2: 45, atoms: 4 },
  ];

  return (
    <ul className="space-y-2" aria-label="Loading threads" aria-busy="true">
      {cards.map((c, i) => (
        <li
          key={i}
          className="animate-pulse-slow overflow-hidden rounded-lg border border-border bg-bg-elevated"
          style={{
            borderLeft: `3px solid ${accentColor}80`,
            animationDelay: `${i * 120}ms`,
          }}
        >
          <div className="p-4">
            {/* Realm chip placeholder */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span
                className="h-3.5 w-14 rounded"
                style={{ background: `${accentColor}25` }}
              />
              <span className="h-3.5 w-20 rounded bg-bg" />
            </div>

            {/* Title placeholder */}
            <div
              className="h-5 rounded bg-text-muted/15"
              style={{ width: `${c.titleW}%` }}
            />

            {/* Body preview — 2 lines */}
            <div className="mt-2 space-y-1.5">
              <div
                className="h-3 rounded bg-text-muted/10"
                style={{ width: `${c.bodyW1}%` }}
              />
              <div
                className="h-3 rounded bg-text-muted/10"
                style={{ width: `${c.bodyW2}%` }}
              />
            </div>

            {/* Atom chips placeholder */}
            <div className="mt-3 flex flex-wrap gap-1">
              {Array.from({ length: c.atoms }).map((_, j) => (
                <span
                  key={j}
                  className="h-4 rounded bg-bg/60"
                  style={{
                    width: `${50 + ((j * 17) % 40)}px`,
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                />
              ))}
            </div>

            {/* Meta row placeholder */}
            <div className="mt-3 flex items-center gap-3">
              <span className="h-3 w-14 rounded bg-text-muted/10" />
              <span className="h-3 w-10 rounded bg-text-muted/10" />
              <span className="h-3 w-20 rounded bg-text-muted/10" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyThreads({
  realm,
  front,
  l2,
  l3,
  savedMode = false,
  myThreadsMode = false,
  signedIn = true,
}: {
  realm: string | null;
  front: Front | null;
  l2: string | null;
  l3: string | null;
  savedMode?: boolean;
  myThreadsMode?: boolean;
  signedIn?: boolean;
}) {
  // My Threads empty state — soft amber (Bee color). Your output earns honey.
  // Frame as invitation, not absence: "your first thread is waiting."
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
        {/* Hex honeycomb cell, subtle — nod to Bee identity */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          <svg width="36" height="40" viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg">
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
          className="mb-2 font-display text-text-silver-bright"
          style={{ fontSize: '17px', fontWeight: 500 }}
        >
          {headline}
        </p>
        <p
          className="mx-auto max-w-md text-text-dim"
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

  // Saved-mode empty state — different messaging, honey-gold theming
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
          className="mb-2 font-display text-text-silver-bright"
          style={{ fontSize: '17px', fontWeight: 500 }}
        >
          {headline}
        </p>
        <p
          className="mx-auto max-w-md text-text-dim"
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

  // Build the "where" phrase for the empty message
  const location =
    [realm, front, l2, l3].filter(Boolean).join(' · ') || 'INTEL';

  // Accent color matches the context
  const accentColor = front
    ? FRONT_COLORS[front]
    : realm && REALM_COLORS[realm as keyof typeof REALM_COLORS]
      ? REALM_COLORS[realm as keyof typeof REALM_COLORS]
      : '#6B94C8'; // INTEL blue default

  // Messaging adapts to depth
  const isSpecific = Boolean(l2 || l3 || front);
  const headline = isSpecific
    ? `No threads in ${location} yet`
    : realm
      ? `No threads in ${realm} yet`
      : 'The feed is quiet';

  const subtext = isSpecific
    ? 'Be the first Bee to post here. Earn BLiNG! for sparking the conversation.'
    : realm
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
      {/* Accent dot */}
      <div
        className="mx-auto mb-4 h-2 w-12 rounded-full"
        style={{ background: accentColor, opacity: 0.6 }}
      />

      {/* Location chip */}
      {realm && (
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
        className="mb-2 font-display text-text-silver-bright"
        style={{ fontSize: '17px', fontWeight: 500 }}
      >
        {headline}
      </p>

      <p
        className="mx-auto max-w-md text-text-dim"
        style={{ fontSize: '13px', lineHeight: '1.5' }}
      >
        {subtext}
      </p>

      {/* Primary CTA — matches context */}
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

      {/* Secondary hint when realm selected */}
      {realm && (
        <p
          className="mt-4 font-mono text-text-muted"
          style={{ fontSize: '10.5px' }}
          data-size="meta"
        >
          Or pick "All" at the top to see every INTEL thread
        </p>
      )}
    </div>
  );
}
