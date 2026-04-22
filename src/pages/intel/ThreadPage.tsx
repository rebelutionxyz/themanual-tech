import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Clock, Reply, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useManualData } from '@/lib/useManualData';
import {
  getThread,
  getPosts,
  createPost,
  relativeTime,
  type ForumThread,
  type ForumPost,
} from '@/lib/intel';
import { KETTLE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Single thread view — /intel/t/:threadId
 */
export function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { bee } = useAuth();
  const { atoms } = useManualData();

  const [thread, setThread] = useState<ForumThread | null | undefined>(undefined);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleReply(parentId: string | null, body: string) {
    if (!bee || !threadId) return;
    const newId = await createPost(threadId, body, bee.id, parentId);
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
      <article className="rounded-lg border border-border bg-bg-elevated/40 p-5 md:p-6">
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
            <div
              className="mb-2 font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Linked atoms
            </div>
            <div className="flex flex-wrap gap-1.5">
              {linkedAtoms.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-text-silver"
                  style={{ fontSize: '12px' }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: KETTLE_COLORS[a.kettle] }}
                  />
                  {a.name}
                </span>
              ))}
            </div>
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
          <ReplyComposer
            onSubmit={(body) => handleReply(null, body)}
            onCancel={() => setReplyingTo(null)}
          />
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
          <div className="rounded-lg border border-border bg-bg-elevated/40 p-4 text-center">
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
  onReply: (parentId: string | null, body: string) => Promise<void>;
  canReply: boolean;
}

function PostNode({
  post,
  childMap,
  depth,
  replyingTo,
  setReplyingTo,
  onReply,
  canReply,
}: PostNodeProps) {
  const children = childMap.get(post.id) ?? [];
  const maxDepth = 4;
  const indent = depth > 0 && depth <= maxDepth;

  return (
    <div
      id={`post-${post.id}`}
      className={cn(indent && 'ml-4 border-l border-border pl-4 md:ml-6 md:pl-5')}
    >
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-4">
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
        <ReplyComposer
          onSubmit={async (body) => onReply(post.id, body)}
          onCancel={() => setReplyingTo(null)}
        />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-lg border border-text-silver/30 bg-bg-elevated p-3"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Your reply..."
        rows={3}
        autoFocus
        className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-text placeholder:text-text-muted focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30"
        style={{ fontSize: '14px', lineHeight: '1.5' }}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-text-silver hover:bg-bg"
          style={{ fontSize: '12px' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className={cn(
            'flex items-center gap-1 rounded-md border px-3 py-1 transition-all',
            body.trim() && !submitting
              ? 'border-text-silver/40 bg-bg-elevated text-text-silver-bright hover:border-text-silver/70'
              : 'cursor-not-allowed border-border text-text-dim opacity-60',
          )}
          style={{ fontSize: '12px' }}
        >
          <Send size={11} />
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}

function ThreadLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="h-40 animate-pulse-slow rounded-lg border border-border bg-bg-elevated/40" />
      <div className="mt-4 space-y-3">
        <div className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated/40" />
        <div className="h-24 animate-pulse-slow rounded-lg border border-border bg-bg-elevated/40" />
      </div>
    </div>
  );
}
