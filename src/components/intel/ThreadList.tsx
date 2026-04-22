import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Clock } from 'lucide-react';
import { listThreads, relativeTime, type ForumThread } from '@/lib/intel';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

interface ThreadListProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  sortBy?: 'hot' | 'new' | 'top';
}

export function ThreadList({ selectedRealm, selectedFront, selectedL2, sortBy = 'hot' }: ThreadListProps) {
  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setThreads(null);
    setError(null);

    listThreads({
      realm: selectedRealm,
      front: selectedFront,
      l2: selectedL2,
      sortBy,
    })
      .then((result) => {
        if (!cancelled) setThreads(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load threads');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRealm, selectedFront, selectedL2, sortBy]);

  if (error) {
    return (
      <div className="rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
        <p className="text-kettle-unsourced" style={{ fontSize: '13px' }}>
          Failed to load threads: {error}
        </p>
      </div>
    );
  }

  if (threads === null) {
    return <ThreadListSkeleton />;
  }

  if (threads.length === 0) {
    return <EmptyThreads />;
  }

  return (
    <ul className="space-y-2">
      {threads.map((t) => (
        <ThreadCard key={t.id} thread={t} />
      ))}
    </ul>
  );
}

function ThreadCard({ thread }: { thread: ForumThread }) {
  return (
    <li>
      <Link
        to={`/intel/t/${thread.id}`}
        className="group block rounded-lg border border-border bg-bg-elevated/40 p-4 transition-colors hover:border-border-bright hover:bg-bg-elevated"
      >
        {/* Top row: title + locked indicator */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
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
          </div>
          {thread.isLocked && (
            <Lock size={14} className="mt-1 flex-shrink-0 text-text-muted" />
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
          <MetaPill icon={<MessageSquare size={11} />}>
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </MetaPill>
          <MetaPill icon={<Clock size={11} />}>
            {relativeTime(thread.lastActivityAt)}
          </MetaPill>
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
