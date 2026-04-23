import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Clock, Reply, Network, List } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useManualData } from '@/lib/useManualData';
import { useIntelStore } from '@/stores/useIntelStore';
import { TaxonomyTree } from '@/components/manual/TaxonomyTree';
import { InlineComposer } from '@/components/intel/InlineComposer';
import {
  getThread,
  getPosts,
  createPost,
  relativeTime,
  type ForumThread,
  type ForumPost,
} from '@/lib/intel';
import { KETTLE_COLORS, FRONT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

/**
 * Single thread view — /intel/t/:threadId
 */
export function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { bee } = useAuth();
  const { atoms, tree } = useManualData();
  const navigate = useNavigate();
  const { setRealm, setFront, setL2, setL3 } = useIntelStore();

  const [thread, setThread] = useState<ForumThread | null | undefined>(undefined);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atomsView, setAtomsView] = useState<'chips' | 'tree'>('chips');

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    (async () => {
      try {
        const [t, p] = await Promise.all([getThread(threadId), getPosts(threadId)]);
        if (cancelled) return;
        setThread(t);
        setPosts(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load thread');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  if (!threadId) return <Navigate to="/intel" replace />;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-kettle-unsourced">Failed to load thread: {error}</p>
      </div>
    );
  }

  if (thread === undefined) {
    return <ThreadLoadingSkeleton />;
  }

  if (thread === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/intel" className="text-text-silver hover:text-text" style={{ fontSize: '13px' }}>
          ← Back to INTEL
        </Link>
        <p className="mt-6 text-text-silver">Thread not found.</p>
      </div>
    );
  }

  // Build linked atom full info
  const linkedAtoms = (thread.atomLinks ?? [])
    .map((l) => atoms.find((a) => a.id === l.atomId))
    .filter((a): a is NonNullable<typeof a> => !!a);

  // Build nested tree structure from flat posts array
  const topLevelPosts = posts.filter((p) => !p.parentPostId);
  const childMap = new Map<string, ForumPost[]>();
  for (const post of posts) {
    if (post.parentPostId) {
      const arr = childMap.get(post.parentPostId) ?? [];
      arr.push(post);
      childMap.set(post.parentPostId, arr);
    }
  }

  async function handleReply(
    parentId: string | null,
    body: string,
    atomIds: string[] = [],
    categoryPaths: string[] = [],
  ) {
    if (!bee || !threadId) return;
    const newId = await createPost(threadId, body, bee.id, parentId, atomIds, categoryPaths);
    // Optimistic: refetch posts
    const p = await getPosts(threadId);
    setPosts(p);
    setReplyingTo(null);
    // Auto-scroll to new post
    setTimeout(() => {
      document.getElementById(`post-${newId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      {/* Breadcrumb */}
      <Link
        to="/intel"
        className="mb-4 inline-flex items-center gap-1.5 text-text-silver hover:text-text"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} />
        <span>Back to INTEL</span>
      </Link>

      {/* Thread header */}
      <article className="rounded-lg border border-border bg-bg-elevated p-5 md:p-6">
        {/* Realm / Front / L2 badges */}
        {(thread.primaryRealm || thread.primaryFront || thread.primaryL2) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {thread.primaryRealm && (
              <span
                className="rounded-md border border-border bg-bg px-2 py-0.5 font-mono text-text-silver"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {thread.primaryRealm}
              </span>
            )}
            {thread.primaryFront && (
              <span
                className="rounded-md border px-2 py-0.5 font-display"
                style={{
                  fontSize: '11px',
                  color: FRONT_COLORS[thread.primaryFront],
                  borderColor: FRONT_COLORS[thread.primaryFront] + '40',
                }}
              >
                {thread.primaryFront}
              </span>
            )}
            {thread.primaryL2 && (
              <span
                className="rounded-md border border-border bg-bg px-2 py-0.5 font-mono text-text-dim"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {thread.primaryL2}
              </span>
            )}
          </div>
        )}

        <h1 className="font-display text-3xl font-semibold leading-tight text-text-silver-bright">
          {thread.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
          {thread.authorHandle && (
            <span
              className="font-mono text-text-silver"
              style={{ fontSize: '12px' }}
              data-size="meta"
            >
              @{thread.authorHandle}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 font-mono"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            <Clock size={11} />
            {relativeTime(thread.createdAt)}
          </span>
          <span
            className="inline-flex items-center gap-1 font-mono"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            <MessagesSquare size={11} />
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </div>

        <div
          className="mt-4 whitespace-pre-wrap text-text"
          style={{ fontSize: '15px', lineHeight: '1.65' }}
        >
          {thread.body}
        </div>

        {/* Linked atoms */}
        {linkedAtoms.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div
                className="font-mono uppercase tracking-wider text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                Linked atoms ({linkedAtoms.length})
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-elevated p-0.5">
                <button
                  type="button"
                  onClick={() => setAtomsView('chips')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
                    atomsView === 'chips'
                      ? 'bg-bg text-text'
                      : 'text-text-muted hover:text-text-silver',
                  )}
                  style={{ fontSize: '11px' }}
                >
                  <List size={10} />
                  Chips
                </button>
                <button
                  type="button"
                  onClick={() => setAtomsView('tree')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
                    atomsView === 'tree'
                      ? 'bg-bg text-text'
                      : 'text-text-muted hover:text-text-silver',
                  )}
                  style={{ fontSize: '11px' }}
                >
                  <Network size={10} />
                  Tree
                </button>
              </div>
            </div>

            {atomsView === 'chips' && (
              <div className="flex flex-wrap gap-1.5">
                {linkedAtoms.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      // Navigate to /intel with this atom's context as filter
                      setRealm(a.realm);
                      if (a.front) setFront(a.front);
                      if (a.L2) setL2(a.L2);
                      if (a.L3) setL3(a.L3);
                      navigate('/intel');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-text-silver transition-colors hover:border-text-silver/50 hover:text-text"
                    style={{ fontSize: '12px' }}
                    title={a.path}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: KETTLE_COLORS[a.kettle] }}
                    />
                    {a.name}
                  </button>
                ))}
              </div>
            )}

            {atomsView === 'tree' && tree && (
              <div className="rounded-md border border-border bg-bg-elevated p-2">
                {(() => {
                  // Group linked atoms by realm, render each realm's branch
                  const realmsWithAtoms = new Set(linkedAtoms.map((a) => a.realm));
                  const linkedAtomIds = new Set(linkedAtoms.map((a) => a.id));
                  return Array.from(realmsWithAtoms).map((realmName) => {
                    const realmNode = tree.children.find((c) => c.name === realmName);
                    if (!realmNode) return null;
                    return (
                      <TaxonomyTree
                        key={realmName}
                        root={realmNode}
                        mode="multi-atom"
                        selectedAtomIds={linkedAtomIds}
                        onToggleAtom={(atom) => {
                          // Click atom = navigate to its context
                          setRealm(atom.realm);
                          if (atom.front) setFront(atom.front);
                          if (atom.L2) setL2(atom.L2);
                          if (atom.L3) setL3(atom.L3);
                          navigate('/intel');
                        }}
                        compact={true}
                      />
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* Reply trigger */}
        {bee && !replyingTo && !thread.isLocked && (
          <button
            type="button"
            onClick={() => setReplyingTo('root')}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-text-silver/30 bg-bg-elevated px-3 py-1.5 text-text-silver-bright hover:border-text-silver/60 hover:bg-panel-2"
            style={{ fontSize: '12px' }}
          >
            <Reply size={12} />
            Reply
          </button>
        )}

        {/* Root reply composer */}
        {replyingTo === 'root' && bee && (
          <div className="mt-3">
            <InlineComposer
              mode="reply"
              enabled={true}
              autoFocus={true}
              onCancel={() => setReplyingTo(null)}
              draftKey={`intel-reply-${thread.id}-root`}
              inheritedContext={{
                realm: thread.primaryRealm,
                front: thread.primaryFront,
                l2: thread.primaryL2,
                atomIds: linkedAtoms.map((a) => a.id),
              }}
              header="Reply. Earn BLiNG!"
              placeholderBody="Your reply..."
              onSubmit={async ({ body, atomIds, categoryPaths }) => {
                try {
                  await handleReply(null, body, atomIds, categoryPaths);
                  return true;
                } catch {
                  return false;
                }
              }}
            />
          </div>
        )}
      </article>

      {/* Replies */}
      <div className="mt-6 space-y-4">
        {topLevelPosts.length === 0 && !thread.isLocked && bee && (
          <p
            className="text-center font-mono text-text-muted"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            No replies yet — be the first
          </p>
        )}

        {topLevelPosts.length === 0 && !bee && (
          <div className="rounded-lg border border-border bg-bg-elevated p-4 text-center">
            <p className="text-text-silver" style={{ fontSize: '13px' }}>
              No replies yet.{' '}
              <Link to="/login" className="text-text-silver-bright underline">
                Sign in
              </Link>{' '}
              to contribute.
            </p>
          </div>
        )}

        {topLevelPosts.map((post) => (
          <PostNode
            key={post.id}
            post={post}
            childMap={childMap}
            depth={0}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            onReply={handleReply}
            canReply={!!bee && !thread.isLocked}
            threadId={thread.id}
            threadContext={{
              realm: thread.primaryRealm,
              front: thread.primaryFront,
              l2: thread.primaryL2,
              atomIds: linkedAtoms.map((a) => a.id),
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface PostNodeProps {
  post: ForumPost;
  childMap: Map<string, ForumPost[]>;
  depth: number;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  onReply: (
    parentId: string | null,
    body: string,
    atomIds?: string[],
    categoryPaths?: string[],
  ) => Promise<void>;
  canReply: boolean;
  threadId: string;
  threadContext: {
    realm?: string | null;
    front?: Front | null;
    l2?: string | null;
    atomIds?: string[];
  };
}

function PostNode({
  post,
  childMap,
  depth,
  replyingTo,
  setReplyingTo,
  onReply,
  canReply,
  threadId,
  threadContext,
}: PostNodeProps) {
  const children = childMap.get(post.id) ?? [];
  const maxDepth = 4;
  const indent = depth > 0 && depth <= maxDepth;

  return (
    <div
      id={`post-${post.id}`}
      className={cn(indent && 'ml-4 border-l border-border pl-4 md:ml-6 md:pl-5')}
    >
      <div className="rounded-lg border border-border bg-bg-elevated p-4">
        {/* Author + time */}
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
          {post.authorHandle && (
            <span
              className="font-mono text-text-silver"
              style={{ fontSize: '12px' }}
              data-size="meta"
            >
              @{post.authorHandle}
            </span>
          )}
          <span
            className="font-mono"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {relativeTime(post.createdAt)}
          </span>
        </div>

        {/* Body */}
        <div
          className="whitespace-pre-wrap text-text-silver"
          style={{ fontSize: '14px', lineHeight: '1.6' }}
        >
          {post.body}
        </div>

        {/* Actions */}
        {canReply && replyingTo !== post.id && (
          <button
            type="button"
            onClick={() => setReplyingTo(post.id)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-silver hover:border-border-bright hover:bg-bg"
            style={{ fontSize: '11px' }}
          >
            <Reply size={11} />
            Reply
          </button>
        )}
      </div>

      {/* Reply composer for this post */}
      {replyingTo === post.id && (
        <div className="mt-3">
          <InlineComposer
            mode="reply"
            enabled={true}
            autoFocus={true}
            onCancel={() => setReplyingTo(null)}
            draftKey={`intel-reply-${threadId}-${post.id}`}
            inheritedContext={threadContext}
            header="Reply. Earn BLiNG!"
            placeholderBody="Your reply..."
            onSubmit={async ({ body, atomIds, categoryPaths }) => {
              try {
                await onReply(post.id, body, atomIds, categoryPaths);
                return true;
              } catch {
                return false;
              }
            }}
          />
        </div>
      )}

      {/* Nested replies */}
      {children.length > 0 && (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <PostNode
              key={child.id}
              post={child}
              childMap={childMap}
              depth={depth + 1}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onReply={onReply}
              canReply={canReply}
              threadId={threadId}
              threadContext={threadContext}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="h-40 animate-pulse-slow rounded-lg border border-border bg-bg-elevated" />
      <div className="mt-4 space-y-3">
        <div className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated" />
        <div className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated" />
      </div>
    </div>
  );
}
