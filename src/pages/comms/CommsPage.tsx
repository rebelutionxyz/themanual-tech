import { MediaPicker } from '@/components/studio/MediaPicker';
import { useCall } from '@/components/comms/CallProvider';
import { RouletteView } from '@/components/comms/RouletteView';
import { RoomsView } from '@/components/comms/RoomsView';
import { useAuth } from '@/lib/auth';
import { enablePush, pushPermission } from '@/lib/push';
import {
  type CommsMessage,
  type Conversation,
  type Follow,
  addGroupMember,
  callE2eeKey,
  conversationTitle,
  createCallRoom,
  createGroup,
  findBeeByHandle,
  hasUnread,
  initComms,
  leaveConversation,
  listConversations,
  listFollows,
  listMessages,
  markRead,
  parseMediaPayload,
  sendMediaMessage,
  removeGroupMember,
  sendMessage,
  setGroupAddPolicy,
  startDirect,
  syncConversationKey,
  toggleReaction,
} from '@/lib/comms';
import { assetUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  FileText,
  LogOut,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Radio,
  Send,
  Shuffle,
  SmilePlus,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * COMMS v1 — the text layer (DMs + groups) over the comms_* RPCs that were
 * already deployed in production. Mounts in the community shell.
 * Polling (not Realtime) per the trivia precedent; rooms/roulette wait on
 * the LiveKit decision.
 */
const COMMS_COLOR = '#0891B2';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

export function CommsPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState<'dm' | 'group' | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [pushPerm, setPushPerm] = useState<ReturnType<typeof pushPermission>>(() => pushPermission());
  const [filter, setFilter] = useState<'all' | 'dm' | 'group' | 'following'>('all');
  const [follows, setFollows] = useState<Follow[] | null>(null);
  const { startCall: enterCall } = useCall();

  const active = convos?.find((c) => c.id === conversationId) ?? null;

  const shown = (convos ?? []).filter(
    (c) =>
      filter === 'all' ||
      (filter === 'dm' && c.kind === 'direct') ||
      (filter === 'group' && c.kind === 'group'),
  );

  const startCall = useCallback(
    async (video: boolean) => {
      if (!active || !bee) return;
      try {
        const { roomId } = await createCallRoom(active.id, video ? 'video' : 'audio');
        const key = await callE2eeKey(active.id, roomId).catch(() => null);
        enterCall(roomId, video, key, {
          outgoing: true,
          peerName: conversationTitle(active, bee.id),
          phone: true,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start the call');
      }
    },
    [active, bee, enterCall],
  );

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

  // Load who I follow the first time the Following filter is opened.
  useEffect(() => {
    if (filter === 'following' && follows === null) {
      listFollows()
        .then(setFollows)
        .catch(() => setFollows([]));
    }
  }, [filter, follows]);

  // Active thread: load + fast poll + mark read.
  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    loadMessages();
    markRead(conversationId).catch(() => {});
    const t = setInterval(loadMessages, 4000);
    return () => clearInterval(t);
  }, [conversationId, loadMessages]);

  // Publish this Bee's E2EE identity key on mount.
  useEffect(() => {
    if (bee) initComms(bee.id).catch(() => {});
  }, [bee]);

  // When a thread opens, make sure its encryption key is set up, then refresh.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the open conversation
  useEffect(() => {
    if (active) syncConversationKey(active).then(loadMessages).catch(() => {});
  }, [active?.id, loadMessages]);

  const openConversation = (id: string) => navigate(`/comms/${id}`);

  const openDmWith = async (beeId: string) => {
    try {
      const id = await startDirect(beeId);
      loadConvos();
      openConversation(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the DM');
    }
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm('Delete this conversation? It disappears from your chats.')) return;
    try {
      await leaveConversation(id);
      if (id === conversationId) navigate('/comms');
      loadConvos();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the conversation');
    }
  };

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

      <AppleInstallBanner />

      {pushPerm === 'default' && (
        <button
          type="button"
          onClick={async () => setPushPerm(await enablePush())}
          className="mb-3 w-full rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-left font-semibold text-[12px] text-cyan-800 transition-colors hover:bg-cyan-100"
        >
          🔔 Enable call alerts on this device — get notified when someone calls while the app's in the background.
        </button>
      )}

      {showRoulette && <RouletteView onClose={() => setShowRoulette(false)} />}
      {showRooms && <RoomsView onClose={() => setShowRooms(false)} />}

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

          <div className="flex gap-0.5 border-b border-zinc-100 p-1.5">
            {(['all', 'dm', 'group', 'following'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 rounded-md px-1 py-1 font-semibold text-[11px] transition-colors',
                  filter === f ? 'text-white' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                )}
                style={filter === f ? { background: COMMS_COLOR } : undefined}
              >
                {f === 'all' ? 'All' : f === 'dm' ? 'DMs' : f === 'group' ? 'Groups' : 'Following'}
              </button>
            ))}
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
            {filter === 'following' && <FollowingList follows={follows} onPick={openDmWith} />}
            {filter !== 'following' && convos !== null && shown.length === 0 && (
              <div className="p-4 text-sm leading-relaxed text-zinc-400">
                {filter === 'all'
                  ? 'No conversations yet. Start a DM with a Bee handle — the water carries it from there.'
                  : filter === 'dm'
                    ? 'No direct messages yet.'
                    : 'No group chats yet.'}
              </div>
            )}
            {filter !== 'following' &&
              shown.map((c) => {
              const unread = hasUnread(c, bee.id);
              const isActive = c.id === conversationId;
              return (
                <div key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-b border-zinc-50 px-3 py-2.5 pr-9 text-left transition-colors hover:bg-zinc-50',
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
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  title="Delete this conversation"
                  aria-label="Delete this conversation"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
                </div>
              );
            })}
          </div>

          {/* Rooms + Roulette — voice layer, gated on LiveKit */}
          <div className="border-t border-zinc-100 p-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowRooms(true)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-cyan-50"
                style={{ borderColor: `${COMMS_COLOR}80`, color: COMMS_COLOR }}
                title="Live voice rooms"
              >
                <Radio size={10} /> Rooms
              </button>
              <button
                type="button"
                onClick={() => setShowRoulette(true)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-cyan-50"
                style={{ borderColor: `${COMMS_COLOR}80`, color: COMMS_COLOR }}
                title="Roulette — meet a random Bee"
              >
                <Shuffle size={10} /> Roulette
              </button>
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
              onStartCall={() => startCall(true)}
              onStartVoice={() => startCall(false)}
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
  onStartCall,
  onStartVoice,
  onBack,
  onSent,
  onLeft,
}: {
  conversation: Conversation;
  messages: CommsMessage[];
  myBeeId: string;
  onStartCall: () => void;
  onStartVoice: () => void;
  onBack: () => void;
  onSent: () => void;
  onLeft: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [leaveArmed, setLeaveArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const handleFor = (beeId: string) =>
    conversation.participants.find((p) => p.beeId === beeId)?.handle ?? 'bee';
  const iAmOwner = conversation.participants.find((p) => p.beeId === myBeeId)?.role === 'owner';
  const canAdd = conversation.kind === 'group' && (iAmOwner || conversation.membersCanAdd);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const react = async (messageId: string, emoji: string) => {
    setReactingId(null);
    try {
      await toggleReaction(messageId, emoji);
      onSent();
    } catch (err) {
      console.warn('react failed', err);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, body);
      setDraft('');
      onSent();
    } catch (err) {
      // e.g. "encryption still setting up" — keep the draft so they can retry
      console.warn('comms send failed', err);
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
        {conversation.kind === 'group' ? (
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            title="Members"
            className={cn(
              'ml-auto rounded px-1 text-[11px] transition-colors hover:text-cyan-700',
              membersOpen ? 'text-cyan-700' : 'text-zinc-400',
            )}
          >
            {conversation.participants.length} Bees
          </button>
        ) : (
          <span className="ml-auto text-[11px] text-zinc-400">
            {conversation.participants.length}{' '}
            {conversation.participants.length === 1 ? 'Bee' : 'Bees'}
          </span>
        )}
        <button
          type="button"
          onClick={onStartCall}
          title="Start a video call"
          aria-label="Start a video call"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
        >
          <Video size={15} />
        </button>
        <button
          type="button"
          onClick={onStartVoice}
          title="Start a voice call"
          aria-label="Start a voice call"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
        >
          <Phone size={15} />
        </button>
        {canAdd && (
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            title="Add someone to this group"
            aria-label="Add someone to this group"
            className={cn(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-cyan-50 hover:text-cyan-700',
              addOpen ? 'bg-cyan-50 text-cyan-700' : 'text-zinc-400',
            )}
          >
            <UserPlus size={15} />
          </button>
        )}
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

      {addOpen && canAdd && (
        <AddMemberPanel
          conversation={conversation}
          isOwner={iAmOwner}
          onChanged={onSent}
          onClose={() => setAddOpen(false)}
        />
      )}

      {membersOpen && (
        <MembersPanel
          conversation={conversation}
          myBeeId={myBeeId}
          isOwner={iAmOwner}
          onChanged={onSent}
        />
      )}

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
              {!m.deletedAt && !m.undecryptable && m.contentType === 'media' && parseMediaPayload(m.body) ? (
                <MediaBubble payload={parseMediaPayload(m.body)!} mine={mine} />
              ) : (
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed',
                    mine ? 'rounded-br-md text-white' : 'rounded-bl-md bg-zinc-100 text-zinc-800',
                  )}
                  style={mine ? { background: COMMS_COLOR } : undefined}
                >
                  {m.deletedAt ? (
                    <em className="opacity-60">message removed</em>
                  ) : m.undecryptable ? (
                    <em className="opacity-60">🔒 setting up encryption…</em>
                  ) : (
                    m.body
                  )}
                </div>
              )}
              <div
                className={cn(
                  'mt-0.5 flex items-center gap-1 px-1',
                  mine ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {m.reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => react(m.id, r.emoji)}
                    className={cn(
                      'flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
                      r.mine
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                ))}
                {!m.deletedAt && (
                  <button
                    type="button"
                    onClick={() => setReactingId((id) => (id === m.id ? null : m.id))}
                    title="React"
                    aria-label="React"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <SmilePlus size={13} />
                  </button>
                )}
                <span className="text-[10px] text-zinc-300">{timeAgo(m.createdAt)}</span>
              </div>
              {reactingId === m.id && (
                <div
                  className={cn(
                    'mt-1 flex gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 shadow-sm',
                    mine ? 'self-end' : 'self-start',
                  )}
                >
                  {REACTION_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => react(m.id, e)}
                      className="text-[17px] leading-none transition-transform hover:scale-125"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-zinc-100 p-2.5">
        <button
          type="button"
          onClick={() => setAttachOpen(true)}
          disabled={sending}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-40"
          aria-label="Attach from your Library"
          title="Attach from your Library"
        >
          <Paperclip size={15} />
        </button>
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

      {attachOpen && (
        <MediaPicker
          kinds={['image', 'video', 'audio', 'document']}
          title="Send from your Library"
          onClose={() => setAttachOpen(false)}
          onPick={(a) => {
            setAttachOpen(false);
            setSending(true);
            sendMediaMessage(conversation.id, {
              url: assetUrl(a),
              kind: a.kind,
              name: a.title || a.fileName,
            })
              .then(onSent)
              .finally(() => setSending(false));
          }}
        />
      )}
    </>
  );
}

/** Inline preview for content_type='media' messages (Library attachments). */
function MediaBubble({
  payload,
  mine,
}: {
  payload: { url: string; kind: string; name: string };
  mine: boolean;
}) {
  const frame = cn(
    'max-w-[78%] overflow-hidden rounded-2xl border',
    mine ? 'rounded-br-md border-cyan-200' : 'rounded-bl-md border-zinc-200',
  );
  if (payload.kind === 'image') {
    return (
      <a href={payload.url} target="_blank" rel="noreferrer" className={frame}>
        <img
          src={payload.url}
          alt={payload.name}
          loading="lazy"
          className="max-h-64 w-full object-cover"
        />
      </a>
    );
  }
  if (payload.kind === 'video') {
    return (
      <div className={frame}>
        {/* biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track */}
        <video src={payload.url} controls playsInline className="max-h-64 w-full bg-black" />
      </div>
    );
  }
  if (payload.kind === 'audio') {
    return (
      <div className={cn(frame, 'bg-white p-2')}>
        {/* biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track */}
        <audio src={payload.url} controls className="w-56 max-w-full" />
      </div>
    );
  }
  return (
    <a
      href={payload.url}
      target="_blank"
      rel="noreferrer"
      className={cn(frame, 'flex items-center gap-2 bg-white px-3 py-2.5')}
    >
      <FileText size={16} className="flex-shrink-0 text-zinc-400" />
      <span className="truncate text-[13px] font-medium text-zinc-800">{payload.name}</span>
    </a>
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
        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-cyan-400"
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
        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-cyan-400"
      />
      <input
        value={handles}
        onChange={(e) => setHandles(e.target.value)}
        placeholder="@handles, comma separated"
        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-cyan-400"
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

/** People the Bee follows — tap to open (or start) a DM. */
function FollowingList({
  follows,
  onPick,
}: {
  follows: Follow[] | null;
  onPick: (beeId: string) => void;
}) {
  if (follows === null) return <div className="p-4 text-sm text-zinc-400">Loading…</div>;
  if (!follows.length)
    return (
      <div className="p-4 text-sm leading-relaxed text-zinc-400">
        You're not following anyone yet. Follow Bees and they'll show up here to start a chat.
      </div>
    );
  return (
    <>
      {follows.map((f) => (
        <button
          key={f.beeId}
          type="button"
          onClick={() => onPick(f.beeId)}
          className="flex w-full items-center gap-2.5 border-b border-zinc-50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
        >
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-semibold text-[13px] text-white"
            style={{ background: COMMS_COLOR }}
          >
            {f.handle.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-[14px] text-zinc-700">@{f.handle}</span>
            {f.name && <span className="block truncate text-[11px] text-zinc-400">{f.name}</span>}
          </span>
        </button>
      ))}
    </>
  );
}

/** Add a Bee to a group + (owner only) the "let members add" switch. Compact. */
function AddMemberPanel({
  conversation,
  isOwner,
  onChanged,
  onClose,
}: {
  conversation: Conversation;
  isOwner: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [allowMembers, setAllowMembers] = useState(conversation.membersCanAdd);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const clean = handle.trim();
    if (!clean || busy) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const found = await findBeeByHandle(clean);
      if (!found) {
        setErr(`No Bee named @${clean.replace(/^@/, '')}`);
        return;
      }
      await addGroupMember(conversation.id, found.id);
      setHandle('');
      setNote(`Added @${found.handle}`);
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not add them');
    } finally {
      setBusy(false);
    }
  };

  const togglePolicy = async () => {
    const next = !allowMembers;
    setAllowMembers(next);
    try {
      await setGroupAddPolicy(conversation.id, next);
      onChanged();
    } catch {
      setAllowMembers(!next); // revert on failure
    }
  };

  return (
    <div className="space-y-2 border-b border-zinc-100 bg-zinc-50/60 p-2.5">
      <form onSubmit={add} className="flex items-center gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Add by @handle"
          className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={busy || !handle.trim()}
          className="rounded-md px-3 py-1.5 text-[12px] font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: COMMS_COLOR }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-[12px] font-semibold text-zinc-500 hover:text-zinc-800"
        >
          Done
        </button>
      </form>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      {note && <p className="text-[11px] text-emerald-600">{note}</p>}
      {isOwner && (
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-500">
          <input
            type="checkbox"
            checked={allowMembers}
            onChange={togglePolicy}
            className="accent-cyan-600"
          />
          Let members (not just you) add people
        </label>
      )}
    </div>
  );
}

/** Roster popup opened from the header count. The owner can remove members. */
function MembersPanel({
  conversation,
  myBeeId,
  isOwner,
  onChanged,
}: {
  conversation: Conversation;
  myBeeId: string;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const remove = async (beeId: string) => {
    setBusy(beeId);
    setErr(null);
    try {
      await removeGroupMember(conversation.id, beeId);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove them');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto border-b border-zinc-100 bg-zinc-50/60 p-2">
      {conversation.participants.map((p) => {
        const isOwnerRow = p.role === 'owner';
        const isMe = p.beeId === myBeeId;
        return (
          <div key={p.beeId} className="flex items-center gap-2 px-1 py-0.5">
            <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">
              @{p.handle}
              {isOwnerRow && <span className="ml-1.5 text-[10px] text-zinc-400">owner</span>}
              {isMe && !isOwnerRow && <span className="ml-1.5 text-[10px] text-zinc-400">you</span>}
            </span>
            {isOwner && !isOwnerRow && !isMe && (
              <button
                type="button"
                onClick={() => remove(p.beeId)}
                disabled={busy === p.beeId}
                title={`Remove @${p.handle}`}
                aria-label={`Remove @${p.handle}`}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <X size={13} />
              </button>
            )}
          </div>
        );
      })}
      {err && <p className="px-1 text-[11px] text-red-500">{err}</p>}
    </div>
  );
}

/** iOS/iPadOS Safari only, when not installed: how to add COMMS to the Home
 *  Screen (the only way Apple allows call alerts + ringing). Auto-hides once
 *  installed (standalone). Dismissible. */
function AppleInstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || typeof navigator === 'undefined' || typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!isIOS || standalone) return null;
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
      <span className="text-base leading-none">📲</span>
      <div className="flex-1 leading-relaxed">
        <span className="font-semibold">Add COMMS to your Home Screen</span> to get call alerts and
        ringing on this device: tap <span className="font-semibold">Share</span> →{' '}
        <span className="font-semibold">Add to Home Screen</span>, open COMMS from that icon, then tap
        “Enable call alerts.” Apple only allows call notifications for installed web apps.
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded p-0.5 text-amber-500 hover:text-amber-800"
      >
        <X size={14} />
      </button>
    </div>
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
