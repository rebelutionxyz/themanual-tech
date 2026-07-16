import { useAuth } from '@/lib/auth';
import { listThreadIdsByAuthor, listThreadsByIds, relativeTime, type ForumThread } from '@/lib/intel';
import {
  type MyBroadcast,
  type MyChannel,
  type MyReply,
  createMyChannel,
  getMyChannel,
  listMyBroadcasts,
  listMyReplies,
  publishMyVod,
  scheduleMyBroadcast,
  updateMyReply,
  updateMyThread,
} from '@/lib/studio';
import { cn } from '@/lib/utils';
import {
  Boxes,
  Clapperboard,
  Hammer,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Plus,
  Radio,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STUDIO_ACCENT = '#D97706'; // amber ink — honey accent that reads on white
const STUDIO_FILL = '#FAD15E'; // honey fill (dark ink on top)

type Tab = 'threads' | 'replies' | 'video';

/**
 * CREATORS STUDIO — a Workshop section (/studio).
 * Create + manage everything you've put on the platform, across all Astras:
 * threads, replies, and video posts. Sibling Workshop sections (Create Novas,
 * Create Apps) land in their own dispatches.
 */
export function StudioPage() {
  const { bee } = useAuth();
  const [tab, setTab] = useState<Tab>('threads');

  return (
    <div className="safe-pad-x mx-auto w-full max-w-3xl px-4 py-6 md:py-8">
      {/* Workshop context strip */}
      <div
        className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
        data-size="meta"
      >
        <Hammer size={14} style={{ color: STUDIO_ACCENT }} />
        <span
          className="font-mono uppercase tracking-widest text-zinc-500"
          style={{ fontSize: '10.5px' }}
        >
          The Workshop
        </span>
        <span className="text-zinc-400">·</span>
        <span
          className="rounded px-1.5 py-0.5 font-mono uppercase tracking-wider"
          style={{ fontSize: '10px', color: STUDIO_ACCENT, background: `${STUDIO_ACCENT}18` }}
        >
          Creators Studio
        </span>
        <span
          className="flex items-center gap-1 font-mono uppercase tracking-wider text-zinc-400"
          style={{ fontSize: '10px' }}
          title="Create Novas — coming soon"
        >
          <Sparkles size={11} /> Create Novas · soon
        </span>
        <span
          className="flex items-center gap-1 font-mono uppercase tracking-wider text-zinc-400"
          style={{ fontSize: '10px' }}
          title="Create Apps — coming soon"
        >
          <Boxes size={11} /> Create Apps · soon
        </span>
      </div>

      <h1 className="mb-1 flex items-center gap-2.5 font-display text-2xl font-semibold text-zinc-900">
        <Clapperboard size={22} style={{ color: STUDIO_ACCENT }} />
        Creators Studio
      </h1>
      <p className="mb-5 text-[13px] text-zinc-500">
        Create, edit, and manage everything you've posted — across every Astra.
      </p>

      {!bee ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
          Sign in to manage your posts.{' '}
          <Link to="/login" className="underline" style={{ color: STUDIO_ACCENT }}>
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
            <TabButton active={tab === 'threads'} onClick={() => setTab('threads')}>
              <MessagesSquare size={13} /> Threads
            </TabButton>
            <TabButton active={tab === 'replies'} onClick={() => setTab('replies')}>
              <MessageSquare size={13} /> Replies
            </TabButton>
            <TabButton active={tab === 'video'} onClick={() => setTab('video')}>
              <Radio size={13} /> Video Posts
            </TabButton>
          </div>

          {tab === 'threads' && <MyThreadsSection beeId={bee.id} />}
          {tab === 'replies' && <MyRepliesSection beeId={bee.id} />}
          {tab === 'video' && <MyVideoSection beeId={bee.id} />}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Threads ───────────────────────── */

function MyThreadsSection({ beeId }: { beeId: string }) {
  const [threads, setThreads] = useState<ForumThread[] | null>(null);
  const [editing, setEditing] = useState<ForumThread | null>(null);

  const load = useCallback(() => {
    listThreadIdsByAuthor(beeId, 'newest')
      .then(listThreadsByIds)
      .then(setThreads)
      .catch(() => setThreads([]));
  }, [beeId]);

  useEffect(() => {
    setThreads(null);
    load();
  }, [load]);

  if (threads === null) return <LoadingCard />;
  if (threads.length === 0)
    return (
      <EmptyCard>
        No threads yet.{' '}
        <Link to="/intel/new" className="underline" style={{ color: STUDIO_ACCENT }}>
          Start your first thread
        </Link>
        .
      </EmptyCard>
    );

  return (
    <>
      <ul className="flex flex-col gap-2">
        {threads.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-zinc-200 bg-white p-3.5 transition-colors hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/intel/t/${t.id}`}
                className="min-w-0 flex-1 text-[14px] font-medium text-zinc-900 hover:underline"
              >
                {t.title}
              </Link>
              <button
                type="button"
                onClick={() => setEditing(t)}
                className="flex flex-shrink-0 items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Pencil size={11} /> Edit
              </button>
            </div>
            <p className="mt-1 line-clamp-2 text-[12.5px] text-zinc-500">{t.body}</p>
            <p className="mt-1.5 font-mono text-[11px] text-zinc-500" data-size="meta">
              {t.primaryRealm && (
                <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 uppercase tracking-wider">
                  {t.primaryRealm}
                </span>
              )}
              {t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'} ·{' '}
              {relativeTime(t.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      {editing && (
        <EditThreadModal
          thread={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function EditThreadModal({
  thread,
  onClose,
  onSaved,
}: {
  thread: ForumThread;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateMyThread(thread.id, { title: title.trim(), body });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Edit thread" onClose={onClose}>
      <label htmlFor="studio-field-1" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Title
      </label>
      <input id="studio-field-1"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      <label htmlFor="studio-field-2" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Body
      </label>
      <textarea id="studio-field-2"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        className="mb-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] leading-relaxed text-zinc-900 outline-none focus:border-honey/60"
      />
      {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
      <ModalActions busy={busy} disabled={!title.trim()} onCancel={onClose} onSave={save} />
    </ModalShell>
  );
}

/* ───────────────────────── Replies ───────────────────────── */

function MyRepliesSection({ beeId }: { beeId: string }) {
  const [replies, setReplies] = useState<MyReply[] | null>(null);
  const [editing, setEditing] = useState<MyReply | null>(null);

  const load = useCallback(() => {
    listMyReplies(beeId)
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [beeId]);

  useEffect(() => {
    setReplies(null);
    load();
  }, [load]);

  if (replies === null) return <LoadingCard />;
  if (replies.length === 0)
    return <EmptyCard>No replies yet. Join a thread and add your voice.</EmptyCard>;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {replies.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-zinc-200 bg-white p-3.5 transition-colors hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/intel/t/${r.threadId}`}
                className="min-w-0 flex-1 font-mono text-[11.5px] text-zinc-500 hover:underline"
                data-size="meta"
              >
                in “{r.threadTitle ?? 'Untitled thread'}”
              </Link>
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="flex flex-shrink-0 items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Pencil size={11} /> Edit
              </button>
            </div>
            <p className="mt-1 line-clamp-3 text-[13px] text-zinc-900">{r.body}</p>
            <p className="mt-1.5 font-mono text-[11px] text-zinc-500" data-size="meta">
              ▲ {r.upvotes} · ▼ {r.downvotes} · {relativeTime(r.createdAt)}
              {r.editedAt && ' · edited'}
            </p>
          </li>
        ))}
      </ul>

      {editing && (
        <EditReplyModal
          reply={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function EditReplyModal({
  reply,
  onClose,
  onSaved,
}: {
  reply: MyReply;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState(reply.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateMyReply(reply.id, body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Edit reply" onClose={onClose}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        className="mb-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] leading-relaxed text-zinc-900 outline-none focus:border-honey/60"
      />
      {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
      <ModalActions busy={busy} disabled={!body.trim()} onCancel={onClose} onSave={save} />
    </ModalShell>
  );
}

/* ───────────────────────── Video posts ───────────────────────── */

type VideoModal = 'schedule' | 'vod' | null;

function MyVideoSection({ beeId }: { beeId: string }) {
  const [channel, setChannel] = useState<MyChannel | null | undefined>(undefined);
  const [broadcasts, setBroadcasts] = useState<MyBroadcast[] | null>(null);
  const [modal, setModal] = useState<VideoModal>(null);

  const load = useCallback(() => {
    getMyChannel(beeId)
      .then(async (ch) => {
        setChannel(ch);
        if (ch) {
          const list = await listMyBroadcasts(ch.id);
          setBroadcasts(list);
        } else {
          setBroadcasts([]);
        }
      })
      .catch(() => {
        setChannel(null);
        setBroadcasts([]);
      });
  }, [beeId]);

  useEffect(() => {
    setChannel(undefined);
    setBroadcasts(null);
    load();
  }, [load]);

  if (channel === undefined) return <LoadingCard />;

  if (channel === null) return <CreateChannelCard onCreated={load} />;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3.5">
        <div className="min-w-0">
          <p className="text-[14.5px] font-medium text-zinc-900">
            {channel.name}{' '}
            <span className="font-mono text-[12px] text-zinc-500">@{channel.handle}</span>
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-500" data-size="meta">
            {channel.followerCount} {channel.followerCount === 1 ? 'follower' : 'followers'}
            {channel.isVerified && ' · verified'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal('schedule')}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Plus size={13} /> Schedule
          </button>
          <button
            type="button"
            onClick={() => setModal('vod')}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold"
            style={{ background: STUDIO_FILL, color: '#18181b' }}
          >
            <Plus size={13} /> Publish video
          </button>
        </div>
      </div>

      {broadcasts === null ? (
        <LoadingCard />
      ) : broadcasts.length === 0 ? (
        <EmptyCard>No video posts yet — schedule one or publish a recording.</EmptyCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {broadcasts.map((b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/pulse/watch/${b.id}`}
                  className="text-[14px] font-medium text-zinc-900 hover:underline"
                >
                  {b.title}
                </Link>
                {b.summary && (
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-zinc-500">{b.summary}</p>
                )}
                <p className="mt-1 font-mono text-[11px] text-zinc-500" data-size="meta">
                  {b.viewCount} views ·{' '}
                  {b.publishedAt
                    ? `published ${relativeTime(b.publishedAt)}`
                    : b.scheduledAt
                      ? `scheduled ${relativeTime(b.scheduledAt)}`
                      : relativeTime(b.createdAt)}
                </p>
              </div>
              <StatusPill status={b.status} />
            </li>
          ))}
        </ul>
      )}

      {modal === 'schedule' && (
        <ScheduleModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === 'vod' && (
        <PublishVodModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </>
  );
}

function CreateChannelCard({ onCreated }: { onCreated: () => void }) {
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOk = /^[a-z0-9_-]{2,30}$/.test(handle);

  async function create() {
    if (busy || !handleOk || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createMyChannel(handle, name.trim(), tagline.trim() || undefined);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Channel creation failed');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="mb-1 text-[15px] font-medium text-zinc-900">Open your channel</p>
      <p className="mb-4 text-[12.5px] text-zinc-500">
        Video posts live on your channel. Pick a handle and a name — you can add art and details
        later.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="studio-field-3" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Handle
          </label>
          <input id="studio-field-3"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            placeholder="my-channel"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
          />
          {handle && !handleOk && (
            <p className="mt-1 text-[11px] text-red-600">2–30 chars: a–z, 0–9, _ or -</p>
          )}
        </div>
        <div>
          <label htmlFor="studio-field-4" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Name
          </label>
          <input id="studio-field-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Channel"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
          />
        </div>
      </div>
      <label htmlFor="studio-field-5" className="mb-1 mt-3 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Tagline (optional)
      </label>
      <input id="studio-field-5"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void create()}
        disabled={busy || !handleOk || !name.trim()}
        className="mt-4 rounded-md px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
        style={{ background: STUDIO_FILL, color: '#18181b' }}
      >
        {busy ? 'Opening…' : 'Open channel'}
      </button>
    </div>
  );
}

function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy || !title.trim() || !when) return;
    setBusy(true);
    setError(null);
    try {
      await scheduleMyBroadcast(title.trim(), new Date(when).toISOString(), summary.trim() || undefined);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scheduling failed');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Schedule a video post" onClose={onClose}>
      <label htmlFor="studio-field-6" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Title
      </label>
      <input id="studio-field-6"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      <label htmlFor="studio-field-7" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        When
      </label>
      <input id="studio-field-7"
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      <label htmlFor="studio-field-8" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Summary (optional)
      </label>
      <textarea id="studio-field-8"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        className="mb-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
      />
      {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
      <ModalActions
        busy={busy}
        disabled={!title.trim() || !when}
        onCancel={onClose}
        onSave={save}
        saveLabel="Schedule"
      />
    </ModalShell>
  );
}

function PublishVodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlOk = /^https?:\/\/.+/i.test(url.trim());

  async function save() {
    if (busy || !title.trim() || !urlOk) return;
    setBusy(true);
    setError(null);
    try {
      await publishMyVod(title.trim(), url.trim(), summary.trim() || undefined);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Publish a video post" onClose={onClose}>
      <label htmlFor="studio-field-9" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Title
      </label>
      <input id="studio-field-9"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      <label htmlFor="studio-field-10" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Recording URL
      </label>
      <input id="studio-field-10"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
      />
      <label htmlFor="studio-field-11" className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Summary (optional)
      </label>
      <textarea id="studio-field-11"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        className="mb-3 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
      />
      {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
      <ModalActions
        busy={busy}
        disabled={!title.trim() || !urlOk}
        onCancel={onClose}
        onSave={save}
        saveLabel="Publish"
      />
    </ModalShell>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-all',
        !active && 'text-zinc-500 hover:text-zinc-900',
      )}
      style={
        active
          ? { color: STUDIO_ACCENT, background: `${STUDIO_ACCENT}14`, fontWeight: 600 }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === 'live'
      ? { color: '#DC2626', bg: '#FEE2E2' }
      : s === 'upcoming' || s === 'scheduled'
        ? { color: '#2563EB', bg: '#DBEAFE' }
        : s === 'published' || s === 'ended'
          ? { color: '#15803D', bg: '#DCFCE7' }
          : { color: '#52525B', bg: '#F4F4F5' };
  return (
    <span
      className="flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider"
      style={{ color: tone.color, background: tone.bg }}
      data-size="meta"
    >
      {status || 'draft'}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; Escape/Cancel close the dialog */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  busy,
  disabled,
  onCancel,
  onSave,
  saveLabel = 'Save',
}: {
  busy: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={busy || disabled}
        className="rounded-md px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
        style={{ background: STUDIO_FILL, color: '#18181b' }}
      >
        {busy ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
      Loading…
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
      {children}
    </div>
  );
}
