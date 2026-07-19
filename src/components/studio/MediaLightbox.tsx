import { useAuth } from '@/lib/auth';
import { relativeTime } from '@/lib/intel';
import {
  type MediaComment,
  type MediaCommentTarget,
  listMediaComments,
  postMediaComment,
  removeMediaComment,
} from '@/lib/mediaComments';
import { cn } from '@/lib/utils';
import { FileText, Layers, MessageSquare, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const ACCENT = '#D97706';
const FILL = '#FAD15E';

// ═════════════════════════════════════════════════════════════════════
// MEDIA LIGHTBOX — media on the left, the debate on the right. One
// component serves every surface: group album images (UNITE), Showcase
// items and whole shelves (profiles), and the Library drawer. The
// discussion rail is a flat media_comments thread (post / remove own).
// ═════════════════════════════════════════════════════════════════════

export interface LightboxMedia {
  /** 'collection' renders a shelf card instead of a media pane. */
  kind: 'image' | 'video' | 'audio' | 'document' | 'collection';
  url: string | null;
  title: string;
}

export function MediaLightbox({
  media,
  targetKind,
  targetRef,
  onClose,
}: {
  media: LightboxMedia;
  targetKind: MediaCommentTarget;
  targetRef: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; Escape + close button provided */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:flex-row">
        {/* Media pane */}
        <div className="flex min-h-[200px] flex-1 items-center justify-center bg-black md:max-h-[92vh]">
          {media.kind === 'image' && media.url && (
            <img
              src={media.url}
              alt={media.title}
              className="max-h-[50vh] w-auto max-w-full object-contain md:max-h-[92vh]"
            />
          )}
          {media.kind === 'video' && media.url && (
            // biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track
            <video
              src={media.url}
              controls
              autoPlay
              playsInline
              className="max-h-[50vh] w-full md:max-h-[92vh]"
            />
          )}
          {media.kind === 'audio' && media.url && (
            <div className="w-full p-8">
              {/* biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track */}
              <audio src={media.url} controls autoPlay className="w-full" />
            </div>
          )}
          {media.kind === 'document' && media.url && (
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 p-10 text-zinc-300 hover:text-white"
            >
              <FileText size={40} />
              <span className="text-[13px] underline">Open “{media.title}”</span>
            </a>
          )}
          {media.kind === 'collection' && (
            <div className="flex flex-col items-center gap-2 p-10 text-zinc-300">
              <Layers size={40} style={{ color: FILL }} />
              <span className="max-w-[260px] truncate text-[14px] font-semibold text-white">
                {media.title}
              </span>
            </div>
          )}
        </div>

        {/* Discussion rail */}
        <div className="flex w-full flex-shrink-0 flex-col border-t border-zinc-200 md:w-80 md:border-l md:border-t-0">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <MessageSquare size={14} style={{ color: ACCENT }} />
              <span className="truncate text-[13.5px] font-semibold text-zinc-900">
                {media.title}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X size={15} />
            </button>
          </div>
          <DiscussionThread targetKind={targetKind} targetRef={targetRef} />
        </div>
      </div>
    </div>
  );
}

/** The flat thread: list + composer. Standalone so other surfaces can mount it. */
export function DiscussionThread({
  targetKind,
  targetRef,
}: {
  targetKind: MediaCommentTarget;
  targetRef: string;
}) {
  const { bee } = useAuth();
  const [comments, setComments] = useState<MediaComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    listMediaComments(targetKind, targetRef)
      .then(setComments)
      .catch(() => setComments([]));
  }, [targetKind, targetRef]);

  useEffect(() => {
    setComments(null);
    load();
  }, [load]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new comments
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [comments?.length]);

  async function post() {
    if (!bee || busy || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await postMediaComment(targetKind, targetRef, draft.trim());
      setDraft('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Post failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {comments === null ? (
          <p className="py-6 text-center text-[12px] text-zinc-400">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-zinc-400">
            No takes yet — start the debate.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {comments.map((c) => (
              <li key={c.id} className="group">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-semibold text-zinc-900">@{c.handle}</span>
                  <span className="font-mono text-[9.5px] text-zinc-400" data-size="meta">
                    {relativeTime(c.createdAt)}
                  </span>
                  {bee?.id === c.beeId && (
                    <button
                      type="button"
                      title="Remove"
                      aria-label="Remove comment"
                      onClick={() => {
                        removeMediaComment(c.id)
                          .then(load)
                          .catch(() => {});
                      }}
                      className="ml-auto rounded p-0.5 text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </p>
                <p className="text-[13px] leading-snug text-zinc-700">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>
      {error && <p className="px-3 pb-1 text-[11.5px] text-red-600">{error}</p>}
      {bee ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post();
          }}
          className="flex flex-shrink-0 items-center gap-1.5 border-t border-zinc-100 p-2.5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add your take…"
            aria-label="Add a comment"
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[13px] text-zinc-800 outline-none focus:border-honey/60 focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Post comment"
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full disabled:opacity-40',
            )}
            style={{ background: FILL, color: '#18181b' }}
          >
            <Send size={13} />
          </button>
        </form>
      ) : (
        <p className="border-t border-zinc-100 p-3 text-center text-[12px] text-zinc-500">
          <Link to="/login" className="underline" style={{ color: ACCENT }}>
            Sign in
          </Link>{' '}
          to join the debate.
        </p>
      )}
    </>
  );
}
