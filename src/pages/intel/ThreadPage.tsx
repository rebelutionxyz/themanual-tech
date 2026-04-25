import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Clock, Reply, Network, List } from 'lucide-react';
import { ReactionBar } from '@/components/intel/ReactionBar';
import { SaveButton } from '@/components/intel/SaveButton';
import { ShareButton } from '@/components/intel/ShareButton';
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
import { KETTLE_COLORS, REALM_COLORS, REALM_NAMES, BEE_COLOR } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';

/**
 * Single thread view — /intel/t/:threadId
 */
export function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { bee } = useAuth();
  const { atoms, tree } = useManualData();
  const navigate = useNavigate();
  const { setRealmId, setL2, setL3 } = useIntelStore();

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

  const linkedAtoms = (thread.atomLinks ?? [])
    .map((l) => atoms.find((a) => a.id === l.atomId))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const topLevelPosts = posts.filter((p) => !p.parentPostId);
  const childMap = new Map<string, ForumPost[]>();
  for (const post of posts) {
    if (post.parentPostId) {
      const arr = childMap.get(post.parentPostId) ?? [];
      arr.push(post);
      childMap.set(post.parentPostId, arr);
    }
  }

  const primaryRealmId = thread.primaryRealm;
  const primaryRealmName = primaryRealmId ? REALM_NAMES[primaryRealmId] : null;
  const primaryRealmColor = primaryRealmId
    ? REALM_COLORS[primaryRealmId] ?? '#E0E6EC'
    : '#E0E6EC';

  async function handleReply(
    parentId: string | null,
    body: string,
    atomIds: string[] = [],
    categoryPaths: string[] = [],
  ) {
    if (!bee || !threadId) return;
    const newId = await createPost(threadId, body, bee.id, parentId, atomIds, categoryPaths);
    const [p, t] = await Promise.all([getPosts(threadId), getThread(threadId)]);
    setPosts(p);
    if (t) setThread(t);
    setReplyingTo(null);
    setTimeout(() => {
      document.getElementById(`post-${newId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <button
        type="button"
        onClick={() => {
          if (primaryRealmId) {
            setRealmId(primaryRealmId);
            setL2(thread.primaryL2 ?? null);
            setL3(null);
          } else {
            setRealmId(null);
            setL2(null);
            setL3(null);
          }
          navigate('/intel');
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-text-silver hover:text-text-silver-bright transition-colors"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} />
        <span>
          Back to{' '}
          {primaryRealmName ? (
            <span style={{ color: primaryRealmColor }}>{primaryRealmName}</span>
          ) : (
            'INTEL'
          )}
        </span>
      </button>

      <article className="rounded-lg border border-border bg-bg-elevated p-5 md:p-6">
        {(primaryRealmId || thread.primaryL2) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {primaryRealmId && primaryRealmName && (
              <button
                type="button"
                onClick={() => {
                  setRealmId(primaryRealmId);
                  setL2(null);
                  setL3(null);
                  navigate('/intel');
                }}
                className="rounded-md border px-2 py-0.5 font-mono transition-colors hover:brightness-125"
                style={{
                  fontSize: '11px',
                  color: primaryRealmColor,
                  borderColor: `${primaryRealmColor}40`,
                  background: `${primaryRealmColor}0D`,
                }}
                data-size="meta"
                title={`Filter INTEL by ${primaryRealmName}`}
              >
                {primaryRealmName}
              </button>
            )}
            {thread.primaryL2 && (
              <button
                type="button"
                onClick={() => {
                  if (primaryRealmId) setRealmId(primaryRealmId);
                  setL2(thread.primaryL2);
                  setL3(null);
                  navigate('/intel');
                }}
                className="rounded-md border border-border bg-bg px-2 py-0.5 font-mono text-text-dim transition-colors hover:border-text-silver/40 hover:text-text-silver"
                style={{ fontSize: '11px' }}
                data-size="meta"
                title={`Filter INTEL by ${thread.primaryL2}`}
              >
                {thread.primaryL2}
              </button>
            )}
          </div>
        )}

        <h1 className="font-display text-3xl font-semibold leading-tight text-text-silver-bright">
          {thread.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-text-muted">
          {thread.authorHandle && (
            <>
              <span
                className="inline-flex items-center gap-1.5 font-mono"
                style={{ fontSize: '12px', color: BEE_COLOR }}
                data-size="meta"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: BEE_COLOR }}
                  aria-hidden="true"
                />
                @{thread.authorHandle}
              </span>
              <span className="text-text-muted/40" aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span
            className="inline-flex items-center gap-1 font-mono"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            <Clock size={11} />
            {relativeTime(thread.createdAt)}
          </span>
          <span className="text-text-muted/40" aria-hidden="true">
            ·
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
                      setRealmId(a.realmId);
                      if (a.pathParts[1]) setL2(a.pathParts[1]);
                      if (a.pathParts[2]) setL3(a.pathParts[2]);
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
                  const realmsWithAtoms = new Set<RealmId>(linkedAtoms.map((a) => a.realmId));
                  const linkedAtomIds = new Set(linkedAtoms.map((a) => a.id));
                  return Array.from(realmsWithAtoms).map((realmId) => {
                    const realmNode = tree.children.find((c) => c.realmId === realmId);
                    if (!realmNode) return null;
                    return (
                      <TaxonomyTree
                        key={realmId}
                        root={realmNode}
                        mode="multi-atom"
                        selectedAtomIds={linkedAtomIds}
                        onToggleAtom={(atom) => {
                          setRealmId(atom.realmId);
                          if (atom.pathParts[1]) setL2(atom.pathParts[1]);
                          if (atom.pathParts[2]) setL3(atom.pathParts[2]);
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ReactionBar
            sourceSurface="intel"
            sourceId={thread.id}
            sourceKind="thread"
          />
          <div className="ml-auto flex items-center gap-1.5">
            <SaveButton sourceSurface="intel" sourceId={thread.id} />
            <ShareButton
              sourceSurface="intel"
              sourceId={thread.id}
              url={`/intel/t/${thread.id}`}
            />
          </div>
        </div>

        {bee && !replyingTo && !thread.isLocked && (
          <button
            type="button"
            onClick={() => setReplyingTo('root')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-text-silver/30 bg-bg-elevated px-3 py-1.5 text-text-silver-bright hover:border-text-silver/60 hover:bg-panel-2"
            style={{ fontSize: '12px' }}
          >
            <Reply size={12} />
            Reply
          </button>
        )}

        {replyingTo === 'root' && bee && (
          <div className="mt-3">
            <InlineComposer
              mode="reply"
              enabled={true}
              autoFocus={true}
              onCancel={() => setReplyingTo(null)}
              draftKey={`intel-reply-${thread.id}-root`}
              inheritedContext={{
                realmId: thread.primaryRealm,
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
              realmId: thread.primaryRealm,
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
    realmId?: RealmId | null;
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
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
          {post.authorHandle && (
            <>
              <span
                className="inline-flex items-center gap-1.5 font-mono"
                style={{ fontSize: '12px', color: BEE_COLOR }}
                data-size="meta"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: BEE_COLOR }}
                  aria-hidden="true"
                />
                @{post.authorHandle}
              </span>
              <span className="text-text-muted/40" aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span
            className="font-mono"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {relativeTime(post.createdAt)}
          </span>
        </div>

        <div
          className="whitespace-pre-wrap text-text-silver"
          style={{ fontSize: '14px', lineHeight: '1.6' }}
        >
          {post.body}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ReactionBar
            sourceSurface="intel"
            sourceId={post.id}
            sourceKind="post"
            compact={true}
          />
          {canReply && replyingTo !== post.id && (
            <button
              type="button"
              onClick={() => setReplyingTo(post.id)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-2 py-0.5 text-text-silver hover:border-border-bright hover:bg-bg"
              style={{ fontSize: '11px' }}
            >
              <Reply size={11} />
              Reply
            </button>
          )}
        </div>
      </div>

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
