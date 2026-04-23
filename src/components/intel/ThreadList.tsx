import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Clock } from 'lucide-react';
import { listThreads, relativeTime, type ForumThread } from '@/lib/intel';
import { useManualData } from '@/lib/useManualData';
import { supabase } from '@/lib/supabase';
import { KETTLE_COLORS, FRONT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

interface ThreadListProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  selectedL3?: string | null;
  sortBy?: 'hot' | 'new' | 'top';
}

export function ThreadList({
  selectedRealm,
  selectedFront,
  selectedL2,
  selectedL3 = null,
  sortBy = 'hot',
}: ThreadListProps) {
  const { atoms } = useManualData();
  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Precompute atomIds-in-realm for the atom-link filter.
  // Cap at 500 to avoid Supabase .in() URL-length issues; we rank leaves/sourced.
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
    return matches.slice(0, 500).map((a) => a.id);
  }, [atoms, selectedRealm, selectedFront, selectedL2, selectedL3]);

  // Map atoms by id for quick lookup on cards
  const atomById = useMemo(() => {
    const m = new Map(atoms.map((a) => [a.id, a]));
    return m;
  }, [atoms]);

  // Fetch atom links for all visible threads so we can show chips
  const [threadAtomLinks, setThreadAtomLinks] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);
    setThreadAtomLinks(new Map());

    listThreads(
      {
        realm: selectedRealm,
        front: selectedFront,
        l2: selectedL2,
        sortBy,
      },
      atomIdsInRealm,
    )
      .then(async (result) => {
        if (cancelled) return;
        setThreads(result);

        // Fetch atom links for these threads (best effort — silent if fails)
        if (result.length > 0 && supabase) {
          try {
            const ids = result.map((t) => t.id);
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
  }, [selectedRealm, selectedFront, selectedL2, sortBy, atomIdsInRealm]);

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
  if (threads.length === 0) return <EmptyThreads />;

  return (
    <ul className="space-y-2">
      {threads.map((t) => (
        <ThreadCard
          key={t.id}
          thread={t}
          atomIds={threadAtomLinks.get(t.id) ?? []}
          atomById={atomById}
        />
      ))}
    </ul>
  );
}

function ThreadCard({
  thread,
  atomIds,
  atomById,
}: {
  thread: ForumThread;
  atomIds: string[];
  atomById: Map<string, ReturnType<Map<string, unknown>['get']>>;
}) {
  const linkedAtoms = atomIds
    .map((id) => atomById.get(id) as { id: string; name: string; kettle: string } | undefined)
    .filter((a): a is { id: string; name: string; kettle: string } => !!a)
    .slice(0, 4);

  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block rounded-lg border border-border bg-bg-elevated/40 p-4 transition-colors hover:border-border-bright hover:bg-bg-elevated"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {/* Primary realm badge */}
            {thread.primaryRealm && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded bg-bg px-1.5 py-0.5 font-mono text-text-silver"
                  style={{ fontSize: '10px' }}
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

            {/* Linked atoms on card */}
            {linkedAtoms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {linkedAtoms.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded bg-bg/60 px-1.5 py-0.5 text-text-silver"
                    style={{ fontSize: '10.5px' }}
                  >
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{
                        background:
                          KETTLE_COLORS[a.kettle as keyof typeof KETTLE_COLORS] ?? '#C8D1DA',
                      }}
                    />
                    {a.name}
                  </span>
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
          </div>
          {thread.isLocked && (
            <Lock size={14} className="mt-1 flex-shrink-0 text-text-muted" />
          )}
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
          className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated/40"
        />
      ))}
    </ul>
  );
}

function EmptyThreads() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <div
        className="mx-auto mb-3 h-1.5 w-12 rounded-full"
        style={{ background: '#6B94C8', opacity: 0.4 }}
      />
      <p className="text-text-silver" style={{ fontSize: '14px' }}>
        No threads yet
      </p>
      <p
        className="mt-2 font-mono text-text-muted"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        Be the first Bee to start a discussion
      </p>
      <Link
        to="/intel/new"
        className="mt-4 inline-block rounded-md border border-text-silver/30 bg-bg-elevated px-4 py-1.5 text-text-silver-bright transition-colors hover:border-text-silver/60 hover:bg-panel-2"
        style={{ fontSize: '12px' }}
      >
        New Thread
      </Link>
    </div>
  );
}
