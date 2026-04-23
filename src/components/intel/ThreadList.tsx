import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { listThreads, listThreadsByIds, relativeTime, type ForumThread } from '@/lib/intel';
import { listSavedThreadIds, toggleSave, isSavedBatch } from '@/lib/reactions';
import { useManualData } from '@/lib/useManualData';
import { useIntelStore } from '@/stores/useIntelStore';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { KETTLE_COLORS, FRONT_COLORS, REALM_COLORS } from '@/lib/constants';
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
}

export function ThreadList({
  selectedRealm,
  selectedFront,
  selectedL2,
  selectedL3 = null,
  sortBy = 'hot',
  timeWindowHours = 0,
  savedMode = false,
}: ThreadListProps) {
  const { atoms } = useManualData();
  const { bee } = useAuth();

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

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);
    setThreadAtomLinks(new Map());
    setThreadCategoryLinks(new Map());
    setSavedIds(new Set());

    // Saved mode: get Bee's saved thread IDs, then fetch those threads
    // via the shared helper which handles mapping + author enrichment.
    const threadPromise: Promise<ForumThread[]> = savedMode
      ? bee?.id
        ? (async () => {
            const ids = await listSavedThreadIds(bee.id);
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
  }, [selectedRealm, selectedFront, selectedL2, sortBy, timeWindowHours, atomIdsInRealm, savedMode, bee?.id]);

  if (error) {
    return (
      <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
        <p className="text-kettle-unsourced" style={{ fontSize: '13px' }}>
          Failed to load threads: {error}
        </p>
      </div>
    );
  }

  if (threads === null) return <ThreadListSkeleton />;
  if (threads.length === 0)
    return (
      <EmptyThreads
        realm={selectedRealm}
        front={selectedFront}
        l2={selectedL2}
        l3={selectedL3}
        savedMode={savedMode}
        signedIn={Boolean(bee?.id)}
      />
    );

  return (
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
        />
      ))}
    </ul>
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
}: {
  thread: ForumThread;
  atomIds: string[];
  categoryPaths: string[];
  atomById: Map<string, ReturnType<Map<string, unknown>['get']>>;
  saved: boolean;
  canSave: boolean;
  onToggleSave: () => void;
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
          {/* Top-right actions: lock indicator + bookmark button */}
          <div className="flex flex-shrink-0 items-start gap-2">
            {thread.isLocked && (
              <Lock size={14} className="mt-1 text-text-muted" />
            )}
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

function ThreadListSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated"
        />
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
  signedIn = true,
}: {
  realm: string | null;
  front: Front | null;
  l2: string | null;
  l3: string | null;
  savedMode?: boolean;
  signedIn?: boolean;
}) {
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
