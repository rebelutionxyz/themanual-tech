import { MediaPicker } from '@/components/studio/MediaPicker';
import { useCall } from '@/components/comms/CallProvider';
import { RouletteView } from '@/components/comms/RouletteView';
import { RoomsView } from '@/components/comms/RoomsView';
import { useAuth } from '@/lib/auth';
import { enablePush, pushPermission } from '@/lib/push';
import {
  type CommsMediaPayload,
  type CommsMessage,
  type Conversation,
  type Follow,
  type TypingChannel,
  addGroupMember,
  blockBee,
  callE2eeKey,
  clearVerifiedSafetyNumber,
  conversationKeyStatus,
  conversationSafetyNumber,
  conversationTitle,
  createCallRoom,
  createGroup,
  decryptMediaToObjectUrl,
  editMessage,
  fetchMessagesPage,
  getLastSeen,
  getMessagesByIds,
  getMyPresenceVisibility,
  getVerifiedSafetyNumber,
  findBeeByHandle,
  hasUnread,
  initComms,
  joinOnlinePresence,
  joinTyping,
  leaveConversation,
  listConversations,
  listFollows,
  listMessages,
  listMyBlocks,
  listPins,
  markRead,
  notifyMentions,
  presencePing,
  parseMediaPayload,
  pinMessage,
  sendMediaMessage,
  removeGroupMember,
  resetConversationEncryption,
  sendMessage,
  reportBee,
  searchBees,
  sendVoiceMessage,
  setConversationMuted,
  setDisappearing,
  setPresenceVisibility,
  setGroupAddPolicy,
  startDirect,
  storeVerifiedSafetyNumber,
  subscribeConversation,
  subscribeConversationList,
  syncConversationKey,
  toggleReaction,
  unblockBee,
  unpinMessage,
  unsendMessage,
} from '@/lib/comms';
import { assetUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  FileText,
  Flag,
  LogOut,
  MessageCircle,
  Mic,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Play,
  Plus,
  Radio,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Shuffle,
  SmilePlus,
  Timer,
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
/** Disappearing-messages presets — one compact segmented control (Off = timer cleared). */
const DISAPPEAR_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: 'Off', seconds: null },
  { label: '1h', seconds: 3_600 },
  { label: '24h', seconds: 86_400 },
  { label: '7d', seconds: 604_800 },
];
/** Voice notes auto-stop here — keeps files small on mobile. */
const VOICE_MAX_SECONDS = 120;

export function CommsPage() {
  const { bee, session } = useAuth();
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
  const [myBlocks, setMyBlocks] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Map<string, string>>(new Map());
  const [presenceVisible, setPresenceVisible] = useState(true);
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
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(loadConvos, 200);
    };
    const sub = subscribeConversationList(session?.access_token ?? null, refresh);
    const t = window.setInterval(loadConvos, 30000); // safety-net fallback
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(t);
      sub?.close();
    };
  }, [loadConvos, session?.access_token]);

  // Load who I follow the first time the Following filter is opened.
  useEffect(() => {
    if (filter === 'following' && follows === null) {
      listFollows()
        .then(setFollows)
        .catch(() => setFollows([]));
    }
  }, [filter, follows]);

  // Active thread: load + mark read + LIVE updates (Realtime), slow poll fallback.
  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    loadMessages();
    markRead(conversationId).catch(() => {});
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        loadMessages();
        markRead(conversationId).catch(() => {}); // advance my read cursor → live "Seen"
      }, 120);
    };
    const sub = subscribeConversation(conversationId, session?.access_token ?? null, refresh);
    const t = window.setInterval(loadMessages, 20000); // safety-net fallback
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(t);
      sub?.close();
    };
  }, [conversationId, loadMessages, session?.access_token]);

  // Publish this Bee's E2EE identity key on mount.
  useEffect(() => {
    if (bee) initComms(bee.id).catch(() => {});
  }, [bee]);

  const reloadBlocks = useCallback(() => {
    listMyBlocks().then(setMyBlocks).catch(() => {});
  }, []);
  useEffect(() => {
    if (bee) reloadBlocks();
  }, [bee, reloadBlocks]);

  // Presence: heartbeat my last-seen and load my visibility once.
  useEffect(() => {
    if (!bee) return;
    getMyPresenceVisibility().then(setPresenceVisible).catch(() => {});
    presencePing().catch(() => {});
    const t = window.setInterval(() => presencePing().catch(() => {}), 60000);
    return () => window.clearInterval(t);
  }, [bee]);

  // Live online channel — rejoined when the eye toggles, so invisible mode
  // really is invisible: we watch the channel but never announce ourselves.
  useEffect(() => {
    if (!bee) return;
    const chan = joinOnlinePresence(bee.id, setOnline, presenceVisible);
    return () => chan.close();
  }, [bee, presenceVisible]);

  // Last-seen for my DM peers (only bees who share presence come back).
  useEffect(() => {
    if (!bee || !convos?.length) return;
    const peers = Array.from(
      new Set(
        convos
          .filter((c) => c.kind === 'direct')
          .map((c) => c.participants.find((pp) => pp.beeId !== bee.id)?.beeId)
          .filter((x): x is string => !!x),
      ),
    );
    if (peers.length) getLastSeen(peers).then(setLastSeen).catch(() => {});
  }, [bee, convos]);

  const togglePresenceVisibility = async () => {
    const next = !presenceVisible;
    setPresenceVisible(next);
    try {
      await setPresenceVisibility(next);
    } catch {
      setPresenceVisible(!next);
    }
  };

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
            <button
              type="button"
              onClick={togglePresenceVisibility}
              title={
                presenceVisible
                  ? 'Bees can see when you are online — tap to go invisible'
                  : 'You appear offline to other Bees — tap to show presence'
              }
              aria-label="Toggle online visibility"
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                presenceVisible
                  ? 'border-zinc-200 text-zinc-500 hover:border-cyan-300 hover:text-cyan-700'
                  : 'border-amber-200 bg-amber-50 text-amber-600',
              )}
            >
              {presenceVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
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
                        'flex items-center gap-1.5 truncate text-[14px]',
                        unread ? 'font-bold text-zinc-900' : 'font-medium text-zinc-600',
                      )}
                    >
                      {c.kind === 'direct' &&
                        online.has(
                          c.participants.find((pp) => pp.beeId !== bee.id)?.beeId ?? '',
                        ) && (
                          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        )}
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
              myBlocks={myBlocks}
              onBlocksChanged={reloadBlocks}
              online={online}
              lastSeen={lastSeen}
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

/** "Seen" label for my latest message, from other participants' last_read_at. */
function seenLabel(conversation: Conversation, m: CommsMessage, myBeeId: string): string | null {
  const others = conversation.participants.filter((p) => p.beeId !== myBeeId);
  if (others.length === 0) return null;
  const readers = others.filter(
    (p) => p.lastReadAt && new Date(p.lastReadAt).getTime() >= new Date(m.createdAt).getTime(),
  );
  if (readers.length === 0) return null;
  if (conversation.kind === 'direct') return 'Seen';
  return readers.length === others.length ? 'Seen by all' : `Seen by ${readers.length}`;
}

/** Short one-line preview of a quoted message for the reply UI. */
function quoteSnippet(m: CommsMessage): string {
  if (m.deletedAt) return 'removed message';
  if (m.undecryptable) return 'encrypted message';
  if (m.contentType === 'media') return '📎 media';
  const t = m.body.replace(/\s+/g, ' ').trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

function Thread({
  conversation,
  messages,
  myBeeId,
  myBlocks,
  onBlocksChanged,
  online,
  lastSeen,
  onStartCall,
  onStartVoice,
  onBack,
  onSent,
  onLeft,
}: {
  conversation: Conversation;
  messages: CommsMessage[];
  myBeeId: string;
  myBlocks: Set<string>;
  onBlocksChanged: () => void;
  online: Set<string>;
  lastSeen: Map<string, string>;
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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [safetyNum, setSafetyNum] = useState<string | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [pins, setPins] = useState<{ messageId: string; pinnedBy: string; createdAt: string }[]>([]);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [pinnedMsgs, setPinnedMsgs] = useState<CommsMessage[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState<CommsMessage[] | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommsMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [typing, setTyping] = useState<{ handle: string; at: number } | null>(null);
  const typingChanRef = useRef<TypingChannel | null>(null);
  const [keyState, setKeyState] = useState<'ok' | 'locked' | 'pending' | null>(null);
  const [resetting, setResetting] = useState(false);
  // Safety-number verification memory (device-local): unverified → verified → changed.
  const [snState, setSnState] = useState<'unknown' | 'unverified' | 'verified' | 'changed'>(
    'unknown',
  );
  // Disappearing-messages timer (shared setting; optimistic local copy).
  const [timerOpen, setTimerOpen] = useState(false);
  const [ttl, setTtl] = useState<number | null>(conversation.disappearSeconds);
  const [ttlBusy, setTtlBusy] = useState(false);
  // Voice-note recording.
  const [recState, setRecState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [recElapsed, setRecElapsed] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const recRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    mime: string;
    tick: number;
    startedAt: number;
    intent: 'send' | 'cancel';
  } | null>(null);
  // Ticks every 30s so expired (disappearing) messages vanish between sweeps.
  const [nowTs, setNowTs] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement>(null);
  const handleFor = (beeId: string) =>
    conversation.participants.find((p) => p.beeId === beeId)?.handle ?? 'bee';
  const iAmOwner = conversation.participants.find((p) => p.beeId === myBeeId)?.role === 'owner';
  const canAdd = conversation.kind === 'group' && (iAmOwner || conversation.membersCanAdd);
  const iAmMutedProp = conversation.participants.find((p) => p.beeId === myBeeId)?.muted ?? false;
  const dmPeer =
    conversation.kind === 'direct'
      ? conversation.participants.find((p) => p.beeId !== myBeeId)
      : undefined;
  const peerBlocked = !!dmPeer && myBlocks.has(dmPeer.beeId);
  const toggleBlock = async (beeId: string, blocked: boolean) => {
    try {
      if (blocked) await unblockBee(beeId);
      else await blockBee(beeId);
      onBlocksChanged();
    } catch (err) {
      console.warn('block toggle failed', err);
    }
  };
  const doReport = async (beeId: string, handle: string) => {
    const reason = window.prompt(`Report @${handle} — what happened?`);
    if (reason === null) return;
    try {
      await reportBee(beeId, reason, conversation.id);
      window.alert('Report sent. Thank you.');
    } catch (err) {
      console.warn('report failed', err);
    }
  };
  const mentionMatch =
    conversation.kind === 'group' && recState === 'idle' ? draft.match(/@(\w*)$/) : null;
  const mentionOptions = mentionMatch
    ? conversation.participants
        .filter(
          (p) =>
            p.beeId !== myBeeId &&
            p.handle.toLowerCase().startsWith(mentionMatch[1].toLowerCase()),
        )
        .slice(0, 5)
    : [];

  // Pins: load on open, keep fresh on a light poll (comms_pins is realtime-published;
  // the 20s poll is the safety net that matches the message poll).
  useEffect(() => {
    let live = true;
    const load = () =>
      listPins(conversation.id)
        .then((ps) => {
          if (live) setPins(ps);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 20000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [conversation.id]);

  // Resolve pinned message bodies when the panel opens (some may be outside the
  // loaded window — fetch those by id).
  useEffect(() => {
    if (!pinsOpen) return;
    let live = true;
    (async () => {
      const wanted = pins.map((pn) => pn.messageId);
      const have = new Map(messages.filter((m) => wanted.includes(m.id)).map((m) => [m.id, m]));
      const missing = wanted.filter((id) => !have.has(id));
      const fetched = missing.length
        ? await getMessagesByIds(conversation.id, missing).catch(() => [])
        : [];
      for (const m of fetched) have.set(m.id, m);
      const list = wanted
        .map((id) => have.get(id))
        .filter((m): m is CommsMessage => !!m);
      if (live) setPinnedMsgs(list);
    })();
    return () => {
      live = false;
    };
  }, [pinsOpen, pins, messages, conversation.id]);

  const pinnedIds = new Set(pins.map((pn) => pn.messageId));
  const togglePin = async (messageId: string, pinned: boolean) => {
    try {
      if (pinned) await unpinMessage(conversation.id, messageId);
      else await pinMessage(conversation.id, messageId);
      setPins(await listPins(conversation.id));
    } catch (err) {
      console.warn('pin toggle failed', err);
    }
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1600);
    return true;
  };

  const runSearch = async () => {
    const q = searchQ.trim().toLowerCase();
    if (!q || searchBusy) return;
    setSearchBusy(true);
    setSearchResults(null);
    try {
      const all: CommsMessage[] = [];
      let before: string | null = null;
      for (let page = 0; page < 10; page++) {
        const batch = await fetchMessagesPage(conversation.id, before, 200);
        if (!batch.length) break;
        all.unshift(...batch);
        before = batch[0]?.createdAt ?? null;
        if (batch.length < 200) break;
      }
      const now = Date.now();
      const hits = all.filter(
        (m) =>
          !m.deletedAt &&
          !m.undecryptable &&
          m.contentType === 'text' &&
          (!m.expiresAt || new Date(m.expiresAt).getTime() > now) &&
          m.body.toLowerCase().includes(q),
      );
      setSearchResults(hits.slice(-100).reverse());
    } catch (err) {
      console.warn('search failed', err);
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  };
  const [muted, setMuted] = useState(iAmMutedProp);
  const visible = messages.filter((m) => !m.expiresAt || Date.parse(m.expiresAt) > nowTs);
  const lastMineId = visible.reduce(
    (acc, m) => (m.senderBeeId === myBeeId && !m.deletedAt ? m.id : acc),
    null as string | null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Ephemeral typing channel for this conversation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the conversation
  useEffect(() => {
    const myHandle = conversation.participants.find((p) => p.beeId === myBeeId)?.handle ?? 'someone';
    const chan = joinTyping(conversation.id, { beeId: myBeeId, handle: myHandle }, (who) => {
      setTyping({ handle: who.handle, at: Date.now() });
    });
    typingChanRef.current = chan;
    return () => {
      chan?.close();
      typingChanRef.current = null;
    };
  }, [conversation.id, myBeeId]);

  // Clear the typing note after a few seconds of quiet.
  useEffect(() => {
    if (!typing) return;
    const t = window.setTimeout(() => setTyping(null), 3500);
    return () => clearTimeout(t);
  }, [typing]);

  // Compute the safety number when the thread opens and compare it with the
  // value this device verified earlier — 'changed' drives the warning strip.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the conversation
  useEffect(() => {
    let alive = true;
    setSafetyNum(null);
    setSnState('unknown');
    conversationSafetyNumber(conversation)
      .then((sn) => {
        if (!alive) return;
        setSafetyNum(sn);
        const stored = getVerifiedSafetyNumber(myBeeId, conversation.id);
        setSnState(!stored ? 'unverified' : stored === sn ? 'verified' : 'changed');
      })
      .catch(() => {
        if (alive) setSafetyNum('unavailable');
      });
    return () => {
      alive = false;
    };
  }, [conversation.id, myBeeId]);

  // The disappear timer is a shared conversation setting — track prop updates.
  useEffect(() => {
    setTtl(conversation.disappearSeconds);
  }, [conversation.disappearSeconds]);

  // Re-filter expired messages every 30s (the server sweep runs every 5 min).
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Never leave the mic running when the thread unmounts.
  useEffect(
    () => () => {
      const entry = recRef.current;
      if (!entry) return;
      recRef.current = null;
      entry.intent = 'cancel';
      try {
        entry.recorder.stop();
      } catch {
        /* already stopped */
      }
    },
    [],
  );

  // Encryption status on THIS device — drives the "Reset encryption" banner.
  // biome-ignore lint/correctness/useExhaustiveDependencies: also recheck as messages load
  useEffect(() => {
    let alive = true;
    conversationKeyStatus(conversation)
      .then((s) => alive && setKeyState(s))
      .catch(() => alive && setKeyState(null));
    return () => {
      alive = false;
    };
  }, [conversation.id, messages.length]);

  const resetEncryption = async () => {
    setResetting(true);
    try {
      await resetConversationEncryption(conversation);
      setKeyState('ok');
      onSent();
    } catch (err) {
      console.warn('reset encryption failed', err);
    } finally {
      setResetting(false);
    }
  };

  const react = async (messageId: string, emoji: string) => {
    setReactingId(null);
    try {
      await toggleReaction(messageId, emoji);
      onSent();
    } catch (err) {
      console.warn('react failed', err);
    }
  };

  const saveEdit = async () => {
    const text = editDraft.trim();
    if (!text || !editingId) return;
    setMsgBusy(true);
    try {
      await editMessage(editingId, conversation.id, text);
      setEditingId(null);
      setEditDraft('');
      onSent();
    } catch (err) {
      console.warn('comms edit failed', err);
    } finally {
      setMsgBusy(false);
    }
  };

  const unsend = async (messageId: string) => {
    setMsgBusy(true);
    try {
      await unsendMessage(messageId);
      setConfirmDelId(null);
      onSent();
    } catch (err) {
      console.warn('comms unsend failed', err);
    } finally {
      setMsgBusy(false);
    }
  };

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next); // optimistic
    try {
      await setConversationMuted(conversation.id, next);
      onSent();
    } catch (err) {
      console.warn('comms mute toggle failed', err);
      setMuted(!next); // revert on failure
    }
  };

  const openVerify = () => setVerifyOpen((v) => !v);

  const markVerified = () => {
    if (!safetyNum || safetyNum === 'unavailable') return;
    storeVerifiedSafetyNumber(myBeeId, conversation.id, safetyNum);
    setSnState('verified');
  };

  const unverify = () => {
    clearVerifiedSafetyNumber(myBeeId, conversation.id);
    setSnState('unverified');
  };

  const chooseTtl = async (seconds: number | null) => {
    if (ttlBusy || seconds === ttl) return;
    const prev = ttl;
    setTtl(seconds); // optimistic
    setTtlBusy(true);
    try {
      await setDisappearing(conversation.id, seconds);
      onSent();
    } catch (err) {
      console.warn('set disappearing failed', err);
      setTtl(prev);
    } finally {
      setTtlBusy(false);
    }
  };

  const stopRecording = (send: boolean) => {
    const entry = recRef.current;
    if (!entry) return;
    entry.intent = send ? 'send' : 'cancel';
    recRef.current = null;
    try {
      entry.recorder.stop();
    } catch {
      /* already stopped */
    }
  };

  const startRecording = async () => {
    if (recState !== 'idle') return;
    setRecError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecError('Microphone permission is needed for voice messages.');
      return;
    }
    // Prefer mp4/aac — it plays back on EVERY device (iPhone/iPad Safari can't
    // play webm/opus on older iOS versions, and voice notes cross devices).
    // Browsers that can't record mp4 (e.g. Firefox) fall back to webm.
    const preferred = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find(
      (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
    );
    let recorder: MediaRecorder;
    try {
      recorder = preferred
        ? new MediaRecorder(stream, { mimeType: preferred })
        : new MediaRecorder(stream);
    } catch {
      for (const t of stream.getTracks()) t.stop();
      setRecError('Voice recording is not supported in this browser.');
      return;
    }
    const entry = {
      recorder,
      stream,
      chunks: [] as Blob[],
      mime: preferred || recorder.mimeType || 'audio/mp4',
      tick: 0,
      startedAt: Date.now(),
      intent: 'cancel' as 'send' | 'cancel',
    };
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) entry.chunks.push(e.data);
    };
    recorder.onstop = () => {
      for (const t of entry.stream.getTracks()) t.stop();
      window.clearInterval(entry.tick);
      const secs = Math.round((Date.now() - entry.startedAt) / 1000);
      if (entry.intent !== 'send' || secs < 1 || entry.chunks.length === 0) {
        setRecState('idle');
        setRecElapsed(0);
        return;
      }
      const blob = new Blob(entry.chunks, { type: entry.mime });
      setRecState('uploading');
      sendVoiceMessage(conversation.id, blob, entry.mime, secs)
        .then(() => onSent())
        .catch((err) => {
          console.warn('voice send failed', err);
          setRecError('Could not send the voice message — try again.');
        })
        .finally(() => {
          setRecState('idle');
          setRecElapsed(0);
        });
    };
    recRef.current = entry;
    setRecElapsed(0);
    setRecState('recording');
    recorder.start(1000);
    entry.tick = window.setInterval(() => {
      const secs = Math.round((Date.now() - entry.startedAt) / 1000);
      setRecElapsed(secs);
      if (secs >= VOICE_MAX_SECONDS) stopRecording(true);
    }, 500);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const id = await sendMessage(conversation.id, body, 'text', replyingTo?.id ?? null);
      if (conversation.kind === 'group' && id) {
        const esc = (h: string) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mentioned = conversation.participants
          .filter((p) => p.beeId !== myBeeId && new RegExp(`@${esc(p.handle)}\\b`, 'i').test(body))
          .map((p) => p.beeId);
        if (mentioned.length) notifyMentions(conversation.id, id, mentioned).catch(() => {});
      }
      setDraft('');
      setReplyingTo(null);
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
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            title="Conversation info"
            className={cn(
              'ml-auto flex items-center gap-1 rounded px-1 text-[11px] transition-colors hover:text-cyan-700',
              membersOpen ? 'text-cyan-700' : 'text-zinc-400',
            )}
          >
            {dmPeer && online.has(dmPeer.beeId) ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                online
              </>
            ) : dmPeer && lastSeen.get(dmPeer.beeId) ? (
              `last seen ${timeAgo(lastSeen.get(dmPeer.beeId) as string)}`
            ) : (
              `${conversation.participants.length} ${conversation.participants.length === 1 ? 'Bee' : 'Bees'}`
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => !v);
            setSearchResults(null);
            setSearchQ('');
          }}
          title="Search this conversation"
          aria-label="Search this conversation"
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-cyan-50 hover:text-cyan-700',
            searchOpen ? 'text-cyan-700' : 'text-zinc-400',
          )}
        >
          <Search size={15} />
        </button>
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
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? 'Unmute this chat' : 'Mute this chat'}
          aria-label={muted ? 'Unmute this chat' : 'Mute this chat'}
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-cyan-50 hover:text-cyan-700',
            muted ? 'text-amber-500' : 'text-zinc-400',
          )}
        >
          {muted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
        <button
          type="button"
          onClick={openVerify}
          title="Verify encryption (safety number)"
          aria-label="Verify encryption"
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-cyan-50 hover:text-cyan-700',
            verifyOpen
              ? 'bg-cyan-50 text-cyan-700'
              : snState === 'verified'
                ? 'text-emerald-600'
                : snState === 'changed'
                  ? 'text-amber-500'
                  : 'text-zinc-400',
          )}
        >
          <ShieldCheck size={15} />
        </button>
        <button
          type="button"
          onClick={() => setTimerOpen((v) => !v)}
          title="Disappearing messages"
          aria-label="Disappearing messages"
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-cyan-50 hover:text-cyan-700',
            timerOpen ? 'bg-cyan-50 text-cyan-700' : ttl ? 'text-cyan-600' : 'text-zinc-400',
          )}
        >
          <Timer size={15} />
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

      {snState === 'changed' && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11.5px] text-amber-900">
          <span className="min-w-0 flex-1">
            Safety number changed — a device was added or replaced. Compare again before trusting
            this chat.
          </span>
          <button
            type="button"
            onClick={() => setVerifyOpen(true)}
            className="flex-shrink-0 font-semibold text-amber-800 underline"
          >
            Review
          </button>
        </div>
      )}

      {verifyOpen && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-700">
            <ShieldCheck size={14} className="text-cyan-600" /> Safety number
          </div>
          <div className="mb-2 break-all font-mono text-[13px] tracking-wide text-zinc-800">
            {safetyNum ?? 'Computing…'}
          </div>
          <div className="mb-2 flex items-center gap-2">
            {snState === 'verified' ? (
              <>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                  Verified ✓
                </span>
                <button
                  type="button"
                  onClick={unverify}
                  className="text-[10.5px] text-zinc-400 underline hover:text-zinc-600"
                >
                  Unverify
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={markVerified}
                disabled={!safetyNum || safetyNum === 'unavailable'}
                className="rounded-md bg-cyan-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
              >
                {snState === 'changed' ? 'Verify the new number' : 'Mark as verified'}
              </button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Compare this with {conversationTitle(conversation, myBeeId)} — read it aloud or hold your
            screens side by side. If it matches, no one is intercepting your keys. Mark it verified
            and this device will warn you if it ever changes.
          </p>
        </div>
      )}

      {timerOpen && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-700">
            <Timer size={14} className="text-cyan-600" /> Disappearing messages
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {DISAPPEAR_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => chooseTtl(o.seconds)}
                disabled={ttlBusy}
                className={cn(
                  'px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50',
                  ttl === o.seconds ? 'bg-cyan-600 text-white' : 'text-zinc-600 hover:bg-zinc-50',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            New messages vanish for everyone after this long. Applies to messages sent from now on.
          </p>
        </div>
      )}
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
          myBlocks={myBlocks}
          onBlockToggle={toggleBlock}
          onReport={doReport}
        />
      )}

      {searchOpen && (
        <div className="border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search size={13} className="flex-shrink-0 text-zinc-400" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="Search messages… (Enter)"
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searchBusy || !searchQ.trim()}
              className="rounded-md px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-40"
              style={{ background: COMMS_COLOR }}
            >
              {searchBusy ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchResults !== null && (
            <div className="max-h-44 overflow-y-auto border-t border-zinc-100">
              {searchResults.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-zinc-400">No matches.</p>
              )}
              {searchResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => jumpTo(m.id)}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left transition-colors hover:bg-cyan-50"
                >
                  <span className="flex-shrink-0 text-[10px] text-zinc-400">
                    {timeAgo(m.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">
                    <span className="font-semibold text-zinc-500">@{handleFor(m.senderBeeId)}</span>{' '}
                    {m.body}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {pins.length > 0 && (
        <button
          type="button"
          onClick={() => setPinsOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 border-b border-amber-100 bg-amber-50/70 px-3 py-1.5 text-left text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-50"
        >
          <Pin size={11} className="flex-shrink-0" />
          {pins.length} pinned {pins.length === 1 ? 'message' : 'messages'}
          <span className="ml-auto font-normal text-amber-600">{pinsOpen ? 'hide' : 'view'}</span>
        </button>
      )}
      {pinsOpen && (
        <div className="max-h-44 overflow-y-auto border-b border-amber-100 bg-amber-50/40">
          {pinnedMsgs === null && <p className="px-3 py-2 text-[12px] text-zinc-400">Loading…</p>}
          {(pinnedMsgs ?? []).map((m) => (
            <div key={m.id} className="flex items-baseline gap-2 px-3 py-1.5">
              <button
                type="button"
                onClick={() => jumpTo(m.id)}
                className="flex min-w-0 flex-1 items-baseline gap-2 text-left transition-colors hover:text-cyan-800"
              >
                <span className="flex-shrink-0 text-[10px] text-zinc-400">{timeAgo(m.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">
                  <span className="font-semibold text-zinc-500">@{handleFor(m.senderBeeId)}</span>{' '}
                  {m.deletedAt ? 'message removed' : m.contentType === 'text' ? m.body : '📎 media'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => togglePin(m.id, true)}
                title="Unpin"
                aria-label="Unpin"
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700"
              >
                <PinOff size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.length === 0 && (
          <p className="pt-6 text-center text-sm text-zinc-300">
            No messages yet — say the first thing.
          </p>
        )}
        {visible.map((m) => {
          const mine = m.senderBeeId === myBeeId;
          const parent = m.replyToId ? messages.find((x) => x.id === m.replyToId) : null;
          const media =
            !m.deletedAt && !m.undecryptable && m.contentType === 'media'
              ? parseMediaPayload(m.body)
              : null;
          const seen = m.id === lastMineId ? seenLabel(conversation, m, myBeeId) : null;
          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={cn(
                'flex flex-col rounded-lg transition-shadow',
                mine ? 'items-end' : 'items-start',
                flashId === m.id && 'ring-2 ring-cyan-300',
              )}
            >
              {conversation.kind === 'group' && !mine && (
                <span className="mb-0.5 px-1 text-[10px] font-semibold text-zinc-400">
                  @{handleFor(m.senderBeeId)}
                </span>
              )}
              {parent && (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`msg-${parent.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  className={cn(
                    'mb-0.5 max-w-[78%] truncate rounded-lg border-l-2 border-cyan-300 bg-zinc-50 px-2 py-1 text-left text-[11px] text-zinc-500',
                    mine ? 'self-end' : 'self-start',
                  )}
                >
                  <span className="font-semibold">
                    {parent.senderBeeId === myBeeId ? 'You' : `@${handleFor(parent.senderBeeId)}`}
                  </span>{' '}
                  {quoteSnippet(parent)}
                </button>
              )}
              {editingId === m.id ? (
                <div
                  className={cn(
                    'flex w-full max-w-[78%] flex-col gap-1',
                    mine ? 'items-end' : 'items-start',
                  )}
                >
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditDraft('');
                      }
                    }}
                    // biome-ignore lint/a11y/noAutofocus: focus the edit field when it opens
                    autoFocus
                    className="w-full rounded-xl border border-cyan-300 px-3 py-2 text-[14px] text-zinc-800 outline-none focus:border-cyan-500"
                  />
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={msgBusy}
                      className="font-semibold text-cyan-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft('');
                      }}
                      className="text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : media?.enc && media.kind === 'audio' ? (
                <VoiceBubble payload={media} conversationId={conversation.id} mine={mine} />
              ) : media ? (
                <MediaBubble payload={media} mine={mine} />
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
                    renderMentions(m.body)
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
                    onClick={() => setReplyingTo(m)}
                    title="Reply"
                    aria-label="Reply"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <Reply size={13} />
                  </button>
                )}
                {!m.deletedAt && (
                  <button
                    type="button"
                    onClick={() => togglePin(m.id, pinnedIds.has(m.id))}
                    title={pinnedIds.has(m.id) ? 'Unpin' : 'Pin'}
                    aria-label={pinnedIds.has(m.id) ? 'Unpin' : 'Pin'}
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-zinc-100',
                      pinnedIds.has(m.id)
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-zinc-300 hover:text-zinc-600',
                    )}
                  >
                    {pinnedIds.has(m.id) ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                )}
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
                {mine && !m.deletedAt && !m.undecryptable && m.contentType !== 'media' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(m.id);
                      setEditDraft(m.body);
                    }}
                    title="Edit"
                    aria-label="Edit"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {mine && !m.deletedAt && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelId((id) => (id === m.id ? null : m.id))}
                    title="Unsend"
                    aria-label="Unsend"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <span className="text-[10px] text-zinc-300">
                  {timeAgo(m.createdAt)}
                  {m.editedAt && !m.deletedAt ? ' · edited' : ''}
                </span>
              </div>
              {seen && (
                <span
                  className={cn('px-1 text-[10px] text-zinc-400', mine ? 'self-end' : 'self-start')}
                >
                  {seen}
                </span>
              )}
              {confirmDelId === m.id && (
                <div
                  className={cn(
                    'mt-1 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px]',
                    mine ? 'self-end' : 'self-start',
                  )}
                >
                  <span className="text-red-700">Unsend this message?</span>
                  <button
                    type="button"
                    onClick={() => unsend(m.id)}
                    disabled={msgBusy}
                    className="font-semibold text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setConfirmDelId(null)} className="text-zinc-400">
                    Cancel
                  </button>
                </div>
              )}
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

      {keyState === 'locked' && (
        <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <div className="font-semibold">This chat can’t be unlocked on this device</div>
          <div className="mt-0.5 text-amber-800">
            Your encryption key changed. Reset it to send again — messages sent before the reset may
            become unreadable.
          </div>
          <button
            type="button"
            onClick={resetEncryption}
            disabled={resetting}
            className="mt-1.5 rounded-md bg-amber-600 px-3 py-1.5 font-semibold text-white text-xs hover:bg-amber-700 disabled:opacity-50"
          >
            {resetting ? 'Resetting…' : 'Reset encryption'}
          </button>
        </div>
      )}
      {typing && (
        <div className="border-t border-zinc-50 px-3 py-1 text-[11px] text-zinc-400">
          @{typing.handle} is typing…
        </div>
      )}
      {replyingTo && (
        <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-3 py-1.5">
          <div className="min-w-0 flex-1 border-l-2 border-cyan-400 pl-2">
            <div className="text-[11px] font-semibold text-cyan-700">
              Replying to{' '}
              {replyingTo.senderBeeId === myBeeId ? 'yourself' : `@${handleFor(replyingTo.senderBeeId)}`}
            </div>
            <div className="truncate text-[11px] text-zinc-500">{quoteSnippet(replyingTo)}</div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {mentionOptions.length > 0 && !peerBlocked && (
        <div className="flex flex-wrap gap-1 border-t border-zinc-100 bg-zinc-50 px-2.5 py-1.5">
          {mentionOptions.map((p) => (
            <button
              key={p.beeId}
              type="button"
              onClick={() => setDraft((d) => d.replace(/@\w*$/, `@${p.handle} `))}
              className="rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-[12px] font-semibold text-cyan-800 transition-colors hover:bg-cyan-50"
            >
              @{p.handle}
            </button>
          ))}
        </div>
      )}
      {peerBlocked && (
        <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <Ban size={13} className="flex-shrink-0" />
          <span className="min-w-0 flex-1">
            You've blocked @{dmPeer?.handle} — messaging is off.
          </span>
          <button
            type="button"
            onClick={() => dmPeer && toggleBlock(dmPeer.beeId, true)}
            className="flex-shrink-0 font-semibold text-amber-900 underline"
          >
            Unblock
          </button>
        </div>
      )}
      {!peerBlocked && recError && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1 text-[11px] text-red-700">
          {recError}
        </div>
      )}
      {!peerBlocked && (
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-zinc-100 p-2.5">
        {recState === 'idle' ? (
          <>
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
              onChange={(e) => {
                setDraft(e.target.value);
                typingChanRef.current?.sendTyping();
              }}
              placeholder="Write it…"
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-[14px] text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-white"
            />
            {draft.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                style={{ background: COMMS_COLOR }}
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={sending}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                style={{ background: COMMS_COLOR }}
                aria-label="Record a voice message"
                title="Record a voice message"
              >
                <Mic size={15} />
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              disabled={recState === 'uploading'}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
              aria-label="Cancel recording"
              title="Cancel recording"
            >
              <X size={15} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700">
              <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-red-500" />
              <span className="font-semibold tabular-nums">{fmtClock(recElapsed)}</span>
              <span className="truncate text-red-500">
                {recState === 'uploading' ? 'Sending…' : 'Recording…'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              disabled={recState === 'uploading'}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{ background: COMMS_COLOR }}
              aria-label="Send voice message"
              title="Send voice message"
            >
              <Send size={15} />
            </button>
          </>
        )}
      </form>
      )}

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

/**
 * E2EE voice note. The stored file is ciphertext; tapping fetches it, decrypts
 * it under the conversation key on-device, and plays it. Lazy on purpose —
 * nothing is downloaded until the listener asks (mobile data first).
 */
function VoiceBubble({
  payload,
  conversationId,
  mine,
}: {
  payload: CommsMediaPayload;
  conversationId: string;
  mine: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );
  const load = async () => {
    if (state === 'loading' || src) return;
    setState('loading');
    try {
      setSrc(await decryptMediaToObjectUrl(conversationId, payload));
      setState('idle');
    } catch (err) {
      console.warn('voice decrypt failed', err);
      setState('error');
    }
  };
  return (
    <div
      className={cn(
        'max-w-[78%] rounded-2xl px-3 py-2',
        mine ? 'rounded-br-md bg-cyan-50' : 'rounded-bl-md bg-zinc-100',
      )}
    >
      {src ? (
        // biome-ignore lint/a11y/useMediaCaption: voice notes have no caption track
        <audio controls autoPlay src={src} className="h-9 w-56 max-w-full" />
      ) : (
        <button
          type="button"
          onClick={load}
          className={cn(
            'flex items-center gap-2 text-[13px] font-semibold',
            state === 'error' ? 'text-red-600' : 'text-cyan-800',
          )}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
            {state === 'loading' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Play size={13} />
            )}
          </span>
          <span className="truncate">
            {state === 'error'
              ? 'Could not decrypt — tap to retry'
              : `Voice message${payload.dur ? ` · ${fmtClock(payload.dur)}` : ''}`}
          </span>
          <span className="text-[10px] font-normal">🔒</span>
        </button>
      )}
    </div>
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
  const [results, setResults] = useState<{ id: string; handle: string; name: string | null }[]>([]);

  // Live directory search — any Bee, not just follows.
  useEffect(() => {
    const q = handle.trim().replace(/^@/, '');
    if (!q) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchBees(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [handle]);

  const pick = async (beeId: string) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      onStarted(await startDirect(beeId));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not start the DM');
    } finally {
      setBusy(false);
    }
  };

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
      {results.length > 0 && (
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r.id)}
              disabled={busy}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-zinc-700 transition-colors hover:bg-cyan-50 disabled:opacity-40"
            >
              <span className="font-semibold text-cyan-800">@{r.handle}</span>
              {r.name && <span className="truncate text-[11px] text-zinc-400">{r.name}</span>}
            </button>
          ))}
        </div>
      )}
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
  myBlocks,
  onBlockToggle,
  onReport,
}: {
  conversation: Conversation;
  myBeeId: string;
  isOwner: boolean;
  onChanged: () => void;
  myBlocks: Set<string>;
  onBlockToggle: (beeId: string, blocked: boolean) => void;
  onReport: (beeId: string, handle: string) => void;
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
            {!isMe && (
              <button
                type="button"
                onClick={() => onReport(p.beeId, p.handle)}
                title={`Report @${p.handle}`}
                aria-label={`Report @${p.handle}`}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              >
                <Flag size={12} />
              </button>
            )}
            {!isMe && (
              <button
                type="button"
                onClick={() => onBlockToggle(p.beeId, myBlocks.has(p.beeId))}
                title={myBlocks.has(p.beeId) ? `Unblock @${p.handle}` : `Block @${p.handle}`}
                aria-label={myBlocks.has(p.beeId) ? `Unblock @${p.handle}` : `Block @${p.handle}`}
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded transition-colors',
                  myBlocks.has(p.beeId)
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'text-zinc-400 hover:bg-red-50 hover:text-red-600',
                )}
              >
                <Ban size={12} />
              </button>
            )}
            {conversation.kind === 'group' && isOwner && !isOwnerRow && !isMe && (
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

/** 75 → "1:15" — recording elapsed + voice-note duration labels. */
function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.max(0, totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Style @handle tokens inside a message body (works on both bubble colors). */
function renderMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    /^@\w+$/.test(part) ? (
      <span
        key={`${i}-${part}`}
        className="font-semibold underline decoration-current/40 underline-offset-2"
      >
        {part}
      </span>
    ) : (
      part
    ),
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
