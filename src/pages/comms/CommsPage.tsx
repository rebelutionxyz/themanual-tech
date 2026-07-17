import { useAuth } from '@/lib/auth';
import {
  type CommsMessage,
  type Conversation,
  conversationTitle,
  createGroup,
  findBeeByHandle,
  hasUnread,
  leaveConversation,
  listConversations,
  listMessages,
  markRead,
  sendMessage,
  startDirect,
} from '@/lib/comms';
import { cn } from '@/lib/utils';
import { ArrowLeft, LogOut, MessageCircle, Plus, Radio, Send, Shuffle, Users } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * COMMS v1 — the text layer (DMs + groups) over the comms_* RPCs that were
 * already deployed in production. Mounts in the community shell.
 * Polling (not Realtime) per the trivia precedent; rooms/roulette wait on
 * the LiveKit decision.
 */
const COMMS_COLOR = '#0891B2';

export function CommsPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState<'dm' | 'group' | null>(null);

  const active = convos?.find((c) => c.id === conversationId) ?? null;

  const loadConvos = useCallback(async () => {
    try {
      setConvos(await listConversations());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations');
      setConvos([]);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setMessages(await listMessages(conversationId));
    } catch {
      /* transient poll errors stay quiet */
    }
  }, [conversationId]);

  // Conversation list: load + slow poll.
  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, 12000);
    return () => clearInterval(t);
  }, [loadConvos]);

  // Active thread: load + fast poll + mark read.
  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    loadMessages();
    markRead(conversationId).catch(() => {});
    const t = setInterval(loadMessages, 4000);
    return () => clearInterval(t);
  }, [conversationId, loadMessages]);

  const openConversation = (id: string) => navigate(`/comms/${id}`);

  if (!bee) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <CommsHeader />
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-zinc-500">
          Sign in to read and send messages — COMMS is Bee-to-Bee.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-6 md:px-8">
      <CommsHeader />

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Conversation list — hidden on small screens when a thread is open */}
        <div
          className={cn(
            'flex w-full flex-col rounded-xl border border-zinc-200 bg-white md:w-72 md:flex-shrink-0',
            active && 'hidden md:flex',
          )}
        >
          <div className="flex items-center gap-2 border-b border-zinc-100 p-2">
            <NewButton
              icon={<Plus size={14} />}
              label="DM"
              active={composerOpen === 'dm'}
              onClick={() => setComposerOpen(composerOpen === 'dm' ? null : 'dm')}
            />
            <NewButton
              icon={<Users size={14} />}
              label="Group"
              active={composerOpen === 'group'}
              onClick={() => setComposerOpen(composerOpen === 'group' ? null : 'group')}
            />
          </div>

          {composerOpen === 'dm' && (
            <StartDmForm
              onStarted={(id) => {
                setComposerOpen(null);
                loadConvos();
                openConversation(id);
              }}
            />
          )}
          {composerOpen === 'group' && (
            <StartGroupForm
              onStarted={(id) => {
                setComposerOpen(null);
                loadConvos();
                openConversation(id);
              }}
            />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {convos === null && <div className="p-4 text-sm text-zinc-400">Loading…</div>}
            {convos !== null && convos.length === 0 && (
              <div className="p-4 text-sm leading-relaxed text-zinc-400">
                No conversations yet. Start a DM with a Bee handle — the water carries it from
                there.
              </div>
            )}
            {(convos ?? []).map((c) => {
              const unread = hasUnread(c, bee.id);
              const isActive = c.id === conversationId;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-b border-zinc-50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50',
                    isActive && 'bg-cyan-50/60',
                  )}
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                    style={{ background: COMMS_COLOR }}
                  >
                    {c.kind === 'group' ? (
                      <Users size={14} />
                    ) : (
                      conversationTitle(c, bee.id).slice(1, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[14px]',
                        unread ? 'font-bold text-zinc-900' : 'font-medium text-zinc-600',
                      )}
                    >
                      {conversationTitle(c, bee.id)}
                    </span>
                    <span className="block text-[11px] text-zinc-400">
                      {c.lastMessageAt ? timeAgo(c.lastMessageAt) : 'new'}
                    </span>
                  </span>
                  {unread && (
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: COMMS_COLOR }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Rooms + Roulette — voice layer, gated on LiveKit */}
          <div className="border-t border-zinc-100 p-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-dashed px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70"
                style={{ borderColor: `${COMMS_COLOR}50`, color: COMMS_COLOR }}
                title="Live voice rooms — land with the LiveKit rail"
                data-size="meta"
              >
                <Radio size={10} /> Rooms · SOON
              </span>
              <span
                className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-md border border-dashed px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70"
                style={{ borderColor: `${COMMS_COLOR}50`, color: COMMS_COLOR }}
                title="Roulette — meet a random Bee, lands with the LiveKit rail"
                data-size="meta"
              >
                <Shuffle size={10} /> Roulette · SOON
              </span>
            </div>
          </div>
        </div>

        {/* Thread */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white',
            !active && 'hidden md:flex',
          )}
        >
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <MessageCircle size={32} style={{ color: COMMS_COLOR }} className="opacity-40" />
              <p className="text-sm text-zinc-400">Pick a conversation, or start one.</p>
            </div>
          ) : (
            <Thread
              key={active.id}
              conversation={active}
              messages={messages}
              myBeeId={bee.id}
              onBack={() => navigate('/comms')}
              onSent={() => {
                loadMessages();
                loadConvos();
              }}
              onLeft={() => {
                loadConvos();
                navigate('/comms');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommsHeader() {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: `${COMMS_COLOR}1a`, color: COMMS_COLOR }}
      >
        <MessageCircle size={18} />
      </span>
      <div>
        <h1 className="font-display text-xl font-bold tracking-wide text-zinc-900">COMMS</h1>
        <p className="text-[11px] text-zinc-400">Bee-to-Bee · DMs and group chat</p>
      </div>
    </div>
  );
}

function Thread({
  conversation,
  messages,
  myBeeId,
  onBack,
  onSent,
  onLeft,
}: {
  conversation: Conversation;
  messages: CommsMessage[];
  myBeeId: string;
  onBack: () => void;
  onSent: () => void;
  onLeft: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [leaveArmed, setLeaveArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const handleFor = (beeId: string) =>
    conversation.participants.find((p) => p.beeId === beeId)?.handle ?? 'bee';

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, body);
      setDraft('');
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={15} />
        </button>
        <span className="truncate font-display text-[15px] font-bold text-zinc-800">
          {conversationTitle(conversation, myBeeId)}
        </span>
        <span className="ml-auto text-[11px] text-zinc-400">
          {conversation.participants.length}{' '}
          {conversation.participants.length === 1 ? 'Bee' : 'Bees'}
        </span>
        {leaveArmed ? (
          <span className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={async () => {
                if (leaving) return;
                setLeaving(true);
                try {
                  await leaveConversation(conversation.id);
                  onLeft();
                } finally {
                  setLeaving(false);
                  setLeaveArmed(false);
                }
              }}
              disabled={leaving}
              className="rounded-full bg-red-600 px-2 py-0.5 text-[10.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {leaving ? '…' : 'Confirm leave'}
            </button>
            <button
              type="button"
              onClick={() => setLeaveArmed(false)}
              className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-800"
            >
              Stay
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setLeaveArmed(true)}
            title="Leave this conversation"
            aria-label="Leave this conversation"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={13} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-sm text-zinc-300">
            No messages yet — say the first thing.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderBeeId === myBeeId;
          return (
            <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              {conversation.kind === 'group' && !mine && (
                <span className="mb-0.5 px-1 text-[10px] font-semibold text-zinc-400">
                  @{handleFor(m.senderBeeId)}
                </span>
              )}
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed',
                  mine ? 'rounded-br-md text-white' : 'rounded-bl-md bg-zinc-100 text-zinc-800',
                )}
                style={mine ? { background: COMMS_COLOR } : undefined}
              >
                {m.deletedAt ? <em className="opacity-60">message removed</em> : m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-zinc-300">{timeAgo(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-zinc-100 p-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write it…"
          className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-[14px] text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
          style={{ background: COMMS_COLOR }}
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </form>
    </>
  );
}

function NewButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] font-semibold transition-colors',
        active
          ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700',
      )}
    >
      {icon} New {label}
    </button>
  );
}

function StartDmForm({ onStarted }: { onStarted: (conversationId: string) => void }) {
  const [handle, setHandle] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const other = await findBeeByHandle(handle);
      if (!other) {
        setErr(`No Bee named @${handle.trim().replace(/^@/, '')}`);
        return;
      }
      onStarted(await startDirect(other.id));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not start the DM');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5 border-b border-zinc-100 p-2.5">
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="@handle"
        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-cyan-400"
      />
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={busy || !handle.trim()}
        className="w-full rounded-md py-1.5 text-[12px] font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: COMMS_COLOR }}
      >
        Start DM
      </button>
    </form>
  );
}

function StartGroupForm({ onStarted }: { onStarted: (conversationId: string) => void }) {
  const [title, setTitle] = useState('');
  const [handles, setHandles] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const wanted = handles
        .split(/[,\s]+/)
        .map((h) => h.trim())
        .filter(Boolean);
      const ids: string[] = [];
      const misses: string[] = [];
      for (const h of wanted) {
        const found = await findBeeByHandle(h);
        if (found) ids.push(found.id);
        else misses.push(h);
      }
      if (misses.length) {
        setErr(`Not found: ${misses.join(', ')}`);
        return;
      }
      onStarted(await createGroup(title.trim(), ids));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not create the group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5 border-b border-zinc-100 p-2.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Group name"
        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-cyan-400"
      />
      <input
        value={handles}
        onChange={(e) => setHandles(e.target.value)}
        placeholder="@handles, comma separated"
        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-cyan-400"
      />
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="w-full rounded-md py-1.5 text-[12px] font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: COMMS_COLOR }}
      >
        Create Group
      </button>
    </form>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
