import { supabase } from './supabase';
import {
  decryptBody,
  deriveCallKey,
  encryptBody,
  ensureIdentity,
  establishConversationKey,
  getConversationKey,
  isEncryptedBody,
  rekeyConversation,
  resealConversationKey,
} from './e2ee';

/**
 * COMMs v1 (text layer) — typed wrappers over the comms_* RPCs, now end-to-end
 * encrypted. Message bodies are sealed under a per-conversation key before they
 * ever reach `comms_send`; the server only stores ciphertext. See `e2ee.ts`.
 *
 * RPC return shapes (verified via pg_get_functiondef):
 *   comms_start_direct  → { conversation_id, created }   (idempotent per pair)
 *   comms_send          → { message_id }                 (bumps last_message_at, notifies /comms/{id})
 *   comms_create_group  → { conversation_id }
 *   comms_mark_read     → { conversation_id, read_at }
 */

export interface CommsParticipant {
  beeId: string;
  handle: string;
  name: string | null;
  lastReadAt: string | null;
  muted: boolean;
  role: string; // 'owner' | 'member'
}

export interface Conversation {
  id: string;
  kind: string; // 'direct' | 'group'
  title: string | null;
  createdBy: string | null;
  lastMessageAt: string | null;
  membersCanAdd: boolean; // group setting: may non-owners add people?
  participants: CommsParticipant[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean; // did the current Bee react with this emoji?
}

export interface CommsMessage {
  id: string;
  conversationId: string;
  senderBeeId: string;
  body: string; // decrypted plaintext (empty when undecryptable)
  contentType: string;
  encrypted: boolean;
  undecryptable: boolean; // encrypted but this device has no key yet
  createdAt: string;
  deletedAt: string | null;
  reactions: ReactionSummary[];
}

function req() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// ── current Bee (for encryption context) ──
let currentBeeId: string | null = null;
async function myBee(): Promise<string> {
  if (currentBeeId) return currentBeeId;
  const { data } = await req().auth.getUser();
  currentBeeId = data.user?.id ?? null;
  if (!currentBeeId) throw new Error('not signed in');
  return currentBeeId;
}

/** Call once when COMMS mounts: set the current Bee and publish their E2EE key. */
export async function initComms(beeId: string): Promise<void> {
  currentBeeId = beeId;
  await ensureIdentity(beeId);
}

/**
 * Make sure the conversation's content key exists and is sealed to every current
 * member. Call when a thread opens. Creator mints on first open; a member who
 * already holds the key re-seals it so late key-publishers get access.
 */
export async function syncConversationKey(conversation: Conversation): Promise<void> {
  const bee = await myBee();
  const members = conversation.participants.map((p) => p.beeId);
  const ck = await getConversationKey(bee, conversation.id);
  if (ck) {
    if (members.length <= 25) {
      try {
        await resealConversationKey(bee, conversation.id, members);
      } catch {
        /* best-effort */
      }
    }
    return;
  }
  if (conversation.createdBy === bee) {
    // Best-effort: mints only for a genuinely new conversation. If rows exist but
    // can't be opened here (locked out), establish throws and the UI offers Reset.
    try {
      await establishConversationKey(bee, conversation.id, members);
    } catch {
      /* locked out — recover via resetConversationEncryption */
    }
  }
  // else: another member holds the key and will seal to us on their next open.
}

/**
 * Encryption state of a conversation ON THIS DEVICE:
 *   'ok'      — we can read/send.
 *   'locked'  — a key exists but this device can't open it (identity changed /
 *               new device with no reseal yet). Offer "Reset encryption".
 *   'pending' — no key row for us yet; a holder will seal to us shortly.
 */
export async function conversationKeyStatus(
  conversation: Conversation,
): Promise<'ok' | 'locked' | 'pending'> {
  const bee = await myBee();
  const ck = await getConversationKey(bee, conversation.id).catch(() => null);
  if (ck) return 'ok';
  const client = supabase;
  if (!client) return 'pending';
  const { count } = await client
    .from('comms_conversation_keys')
    .select('epoch', { count: 'exact', head: true })
    .eq('bee_id', bee)
    .eq('conversation_id', conversation.id);
  return (count ?? 0) > 0 ? 'locked' : 'pending';
}

/**
 * RECOVERY: reset a conversation's encryption key when no device can open it.
 * Mints a fresh content key sealed to all current member devices. Messages sent
 * before the reset become unreadable — surface a confirm before calling this.
 */
export async function resetConversationEncryption(conversation: Conversation): Promise<void> {
  const bee = await myBee();
  const members = conversation.participants.map((p) => p.beeId);
  await rekeyConversation(bee, conversation.id, members);
}

/** A nested `bees(handle,name)` embed comes back as an object (to-one). */
type BeesEmbed =
  | { handle: string; name: string | null }
  | { handle: string; name: string | null }[]
  | null;
function oneBee(b: BeesEmbed) {
  return Array.isArray(b) ? (b[0] ?? null) : b;
}

// biome-ignore lint/suspicious/noExplicitAny: supabase embed rows are shaped at runtime
type Row = any;

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await req()
    .from('comms_conversations')
    .select(
      'id, kind, title, created_by, last_message_at, members_can_add, comms_participants(bee_id, role, last_read_at, muted, bees(handle, name))',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    createdBy: row.created_by,
    lastMessageAt: row.last_message_at,
    membersCanAdd: !!row.members_can_add,
    participants: (row.comms_participants ?? []).map((p: Row) => {
      const b = oneBee(p.bees);
      return {
        beeId: p.bee_id,
        handle: b?.handle ?? 'unknown',
        name: b?.name ?? null,
        lastReadAt: p.last_read_at,
        muted: !!p.muted,
        role: p.role ?? 'member',
      };
    }),
  }));
}

export async function listMessages(conversationId: string, limit = 200): Promise<CommsMessage[]> {
  const { data, error } = await req()
    .from('comms_messages')
    .select(
      'id, conversation_id, sender_bee_id, body, content_type, is_encrypted, created_at, deleted_at, comms_reactions(bee_id, emoji)',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const bee = await myBee().catch(() => null);
  const ck = bee ? await getConversationKey(bee, conversationId).catch(() => null) : null;

  const out: CommsMessage[] = [];
  for (const m of (data ?? []) as Row[]) {
    let body: string = m.body ?? '';
    let undecryptable = false;
    if (m.is_encrypted && isEncryptedBody(m.body)) {
      if (ck) {
        try {
          body = await decryptBody(ck, m.body);
        } catch {
          body = '';
          undecryptable = true;
        }
      } else {
        body = '';
        undecryptable = true;
      }
    }
    const rrows = (m.comms_reactions ?? []) as { bee_id: string; emoji: string }[];
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of rrows) {
      const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (bee && r.bee_id === bee) cur.mine = true;
      byEmoji.set(r.emoji, cur);
    }
    out.push({
      id: m.id,
      conversationId: m.conversation_id,
      senderBeeId: m.sender_bee_id,
      body,
      contentType: m.content_type,
      encrypted: !!m.is_encrypted,
      undecryptable,
      createdAt: m.created_at,
      deletedAt: m.deleted_at,
      reactions: Array.from(byEmoji, ([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })),
    });
  }
  return out;
}

async function sendEncrypted(conversationId: string, plaintext: string, contentType: string): Promise<string> {
  const bee = await myBee();
  const ck = await getConversationKey(bee, conversationId);
  if (!ck) throw new Error('Encryption is still setting up for this conversation — try again in a moment.');
  const enc = await encryptBody(ck, plaintext);
  const { data, error } = await req().rpc('comms_send', {
    p_conversation_id: conversationId,
    p_body: enc,
    p_content_type: contentType,
    p_is_encrypted: true,
  });
  if (error) throw error;
  return (data as Row)?.message_id ?? '';
}

export async function sendMessage(
  conversationId: string,
  body: string,
  contentType: 'text' | 'media' = 'text',
): Promise<string> {
  return sendEncrypted(conversationId, body, contentType);
}

/** Add or remove my emoji reaction on a message (toggles). Emoji stays plaintext. */
export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const { error } = await req().rpc('comms_react', { p_message_id: messageId, p_emoji: emoji });
  if (error) throw error;
}

// ── typing indicators (ephemeral; Supabase Realtime broadcast — nothing stored) ──

export interface TypingChannel {
  sendTyping: () => void;
  close: () => void;
}

/**
 * Join a conversation's ephemeral "typing" channel. `onTyping` fires when another
 * member types; `sendTyping()` broadcasts that I'm typing (throttled to ~1/2s).
 * Pure pub/sub — no table, no storage, no E2EE impact.
 */
export function joinTyping(
  conversationId: string,
  me: { beeId: string; handle: string },
  onTyping: (who: { beeId: string; handle: string }) => void,
): TypingChannel | null {
  if (!supabase) return null;
  const client = supabase;
  const channel = client.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'typing' }, (msg) => {
      const p = (msg as { payload?: { beeId?: string; handle?: string } }).payload;
      if (p?.beeId && p.beeId !== me.beeId) {
        onTyping({ beeId: p.beeId, handle: p.handle ?? 'someone' });
      }
    })
    .subscribe();
  let last = 0;
  return {
    sendTyping: () => {
      const now = Date.now();
      if (now - last < 2000) return;
      last = now;
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { beeId: me.beeId, handle: me.handle },
      });
    },
    close: () => {
      client.removeChannel(channel);
    },
  };
}

// ── Media attachments (Creator Studio Library) ──
// content_type='media', body = JSON payload — encrypted like any other body, so
// the attachment pointer is sealed too. The media file itself lives in storage
// (separate concern; file-level encryption is a later step).

export interface CommsMediaPayload {
  url: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  name: string;
}

/** Send a Library asset into a conversation as an inline (encrypted) media message. */
export async function sendMediaMessage(
  conversationId: string,
  payload: CommsMediaPayload,
): Promise<string> {
  return sendEncrypted(conversationId, JSON.stringify(payload), 'media');
}

/** Parse a media message body; null when malformed (render raw body instead). */
export function parseMediaPayload(body: string): CommsMediaPayload | null {
  try {
    const p = JSON.parse(body) as Partial<CommsMediaPayload>;
    if (
      typeof p.url === 'string' &&
      /^https?:\/\//i.test(p.url) &&
      (p.kind === 'image' || p.kind === 'video' || p.kind === 'audio' || p.kind === 'document')
    ) {
      return { url: p.url, kind: p.kind, name: typeof p.name === 'string' ? p.name : 'attachment' };
    }
    return null;
  } catch {
    return null;
  }
}

/** Idempotent: returns the existing 1:1 conversation when one exists. */
export async function startDirect(otherBeeId: string): Promise<string> {
  const { data, error } = await req().rpc('comms_start_direct', { p_other: otherBeeId });
  if (error) throw error;
  const id = (data as Row)?.conversation_id;
  if (!id) throw new Error('comms_start_direct returned no conversation id');
  const created = !!(data as Row)?.created;
  const bee = await myBee();
  try {
    if (created) {
      await establishConversationKey(bee, id, [bee, otherBeeId]);
    } else if (await getConversationKey(bee, id)) {
      await resealConversationKey(bee, id, [bee, otherBeeId]);
    }
  } catch {
    /* key setup is best-effort; syncConversationKey retries on open */
  }
  return id;
}

export async function createGroup(title: string, memberBeeIds: string[]): Promise<string> {
  const { data, error } = await req().rpc('comms_create_group', {
    p_title: title,
    p_member_bees: memberBeeIds,
  });
  if (error) throw error;
  const id = (data as Row)?.conversation_id;
  if (!id) throw new Error('comms_create_group returned no conversation id');
  const bee = await myBee();
  try {
    await establishConversationKey(bee, id, [bee, ...memberBeeIds]);
  } catch {
    /* best-effort */
  }
  return id;
}

/**
 * Add a Bee to an existing group, then re-seal the conversation's E2EE content
 * key to the (now larger) membership so the new member can read messages. The
 * re-seal is best-effort — syncConversationKey retries when a thread opens, and
 * a member who hasn't published their identity key yet is picked up then.
 */
export async function addGroupMember(conversationId: string, beeId: string): Promise<void> {
  const { error } = await req().rpc('comms_group_add', {
    p_conversation_id: conversationId,
    p_bee_id: beeId,
  });
  if (error) throw error;
  const bee = await myBee();
  const ck = await getConversationKey(bee, conversationId).catch(() => null);
  if (!ck) return; // we don't hold the key; whoever does re-seals on their next open
  try {
    const { data } = await req()
      .from('comms_participants')
      .select('bee_id')
      .eq('conversation_id', conversationId);
    const members = (data ?? []).map((r: Row) => r.bee_id as string);
    if (members.length) await resealConversationKey(bee, conversationId, members);
  } catch {
    /* best-effort — syncConversationKey retries on next open */
  }
}

/** Owner-only: set whether non-owner members may add people to a group. */
export async function setGroupAddPolicy(conversationId: string, allowed: boolean): Promise<void> {
  const { error } = await req().rpc('comms_group_set_add_policy', {
    p_conversation_id: conversationId,
    p_allowed: allowed,
  });
  if (error) throw error;
}

/** Owner-only: remove a member from a group. Their access ends immediately (RLS). */
export async function removeGroupMember(conversationId: string, beeId: string): Promise<void> {
  const { error } = await req().rpc('comms_group_remove', {
    p_conversation_id: conversationId,
    p_bee_id: beeId,
  });
  if (error) throw error;
}

// ── follows (for the "Following" list + people pickers) ──

export interface Follow {
  beeId: string;
  handle: string;
  name: string | null;
}

/** Bees the current Bee follows, newest first. */
export async function listFollows(): Promise<Follow[]> {
  const me = await myBee();
  const { data, error } = await req()
    .from('bee_follows')
    .select('followed_bee_id, created_at')
    .eq('follower_bee_id', me)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const ids = Array.from(new Set(rows.map((r) => r.followed_bee_id).filter(Boolean)));
  if (!ids.length) return [];
  const { data: bs } = await req().from('bees').select('id, handle, name').in('id', ids);
  const map = new Map<string, { handle: string; name: string | null }>();
  for (const b of (bs ?? []) as Row[]) map.set(b.id, { handle: b.handle, name: b.name ?? null });
  return rows
    .map((r) => {
      const b = map.get(r.followed_bee_id);
      return b ? { beeId: r.followed_bee_id as string, handle: b.handle, name: b.name } : null;
    })
    .filter((x): x is Follow => x !== null);
}

// ── rooms + 1:1 calls (LiveKit) ──

/** Shared media key for an end-to-end-encrypted call. OFF for now: LiveKit SFrame
 *  relies on insertable streams that Safari/iOS don't reliably support, and mixed
 *  encrypted/plain participants can't interop — so call media falls back to
 *  transport encryption (DTLS-SRTP). Messages stay fully E2EE. Set E2EE_CALLS=true
 *  (gated by per-browser support) to re-enable. */
const E2EE_CALLS: boolean = false;

export async function callE2eeKey(conversationId: string, roomId: string): Promise<string | null> {
  if (!E2EE_CALLS) return null;
  const bee = await myBee();
  return deriveCallKey(bee, conversationId, roomId);
}

/** Start a call room, optionally bound to a DM/group conversation. */
export async function createCallRoom(
  conversationId?: string,
  mode: 'video' | 'audio' = 'video',
): Promise<{ roomId: string; livekitRoom: string }> {
  const { data, error } = await req().rpc('comms_room_create', {
    p_kind: 'call',
    p_conversation_id: conversationId ?? null,
    p_atom_id: null,
    p_title: mode,
    p_is_public: null,
    p_max: null,
  });
  if (error) throw error;
  const r = data as Row;
  return { roomId: r.room_id, livekitRoom: r.livekit_room };
}

export async function joinRoom(
  roomId: string,
  role: 'host' | 'speaker' | 'listener' = 'speaker',
): Promise<{ livekitRoom: string; role: string }> {
  const { data, error } = await req().rpc('comms_room_join', { p_room_id: roomId, p_role: role });
  if (error) throw error;
  const r = data as Row;
  return { livekitRoom: r.livekit_room, role: r.role };
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await req().rpc('comms_room_leave', { p_room_id: roomId });
  if (error) throw error;
}

export async function endRoom(roomId: string): Promise<void> {
  const { error } = await req().rpc('comms_room_end', { p_room_id: roomId });
  if (error) throw error;
}

/**
 * End an unanswered outgoing call once the ring window (~13 rings) elapses.
 * Ends the room and — only when nobody picked up — logs a "Missed call" to the
 * other members and a "No answer" entry to the caller. Safe to call more than
 * once (no-ops if the room already left 'live').
 */
export async function callTimeout(roomId: string): Promise<void> {
  const { error } = await req().rpc('comms_call_timeout', { p_room_id: roomId });
  if (error) throw error;
}

/** Mint a LiveKit access token for a room (caller must already be a participant). */
export async function getRoomToken(
  roomId: string,
): Promise<{ token: string; url: string; canPublish: boolean }> {
  const { data, error } = await req().functions.invoke('livekit-token', { body: { room_id: roomId } });
  if (error) throw error;
  const r = data as Row;
  if (!r?.token) throw new Error(r?.error || 'no token returned');
  return { token: r.token, url: r.url, canPublish: !!r.can_publish };
}

/** A live call room bound to a conversation (for the "incoming call" banner). */
export async function activeRoomForConversation(
  conversationId: string,
): Promise<{ roomId: string } | null> {
  const { data, error } = await req()
    .from('comms_rooms')
    .select('id, status')
    .eq('conversation_id', conversationId)
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const r = (data ?? [])[0] as Row;
  return r ? { roomId: r.id } : null;
}

// ── rooms / spaces (public voice rooms) ──

export interface Space {
  id: string;
  title: string;
  hostHandle: string;
  startedAt: string;
}

/** Create a public voice room (space). The creator is the host. */
export async function createSpace(title: string): Promise<{ roomId: string; livekitRoom: string }> {
  const { data, error } = await req().rpc('comms_room_create', {
    p_kind: 'space',
    p_conversation_id: null,
    p_atom_id: null,
    p_title: title,
    p_is_public: true,
    p_max: null,
  });
  if (error) throw error;
  const r = data as Row;
  return { roomId: r.room_id, livekitRoom: r.livekit_room };
}

/** Live public rooms, newest first (with host handle). */
export async function listSpaces(): Promise<Space[]> {
  const { data, error } = await req()
    .from('comms_rooms')
    .select('id, title, host_bee_id, started_at')
    .eq('kind', 'space')
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const rooms = (data ?? []) as Row[];
  const hostIds = Array.from(new Set(rooms.map((r) => r.host_bee_id).filter(Boolean)));
  const handles = new Map<string, string>();
  if (hostIds.length) {
    const { data: bs } = await req().from('bees').select('id, handle').in('id', hostIds);
    for (const b of (bs ?? []) as Row[]) handles.set(b.id, b.handle);
  }
  return rooms.map((r) => ({
    id: r.id,
    title: r.title ?? 'Room',
    hostHandle: handles.get(r.host_bee_id) ?? 'someone',
    startedAt: r.started_at,
  }));
}

// ── roulette ──

export async function enqueueRoulette(
  mode: 'video' | 'audio' = 'video',
): Promise<{ matched: boolean; roomId?: string; livekitRoom?: string; partner?: string }> {
  const { data, error } = await req().rpc('comms_roulette_enqueue', { p_mode: mode });
  if (error) throw error;
  const r = data as Row;
  return { matched: !!r.matched, roomId: r.room_id, livekitRoom: r.livekit_room, partner: r.partner };
}

export async function cancelRoulette(): Promise<void> {
  const { error } = await req().rpc('comms_roulette_cancel');
  if (error) throw error;
}

/** While waiting in the queue, poll for the room the matching partner created. */
export async function pollRouletteMatch(): Promise<{ roomId: string; livekitRoom: string } | null> {
  const bee = await myBee();
  // Only accept a FRESH match room. A match room is created the moment a partner
  // arrives, so it's always seconds old; bounding to the last 60s means a stale
  // 'live' room we never left can't be re-matched into an empty call.
  const { data, error } = await req()
    .from('comms_rooms')
    .select('id, livekit_room, status, kind, started_at, comms_room_participants!inner(bee_id)')
    .eq('kind', 'roulette')
    .eq('status', 'live')
    .eq('comms_room_participants.bee_id', bee)
    .gt('started_at', new Date(Date.now() - 60_000).toISOString())
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const r = (data ?? [])[0] as Row;
  return r ? { roomId: r.id, livekitRoom: r.livekit_room } : null;
}

export async function markRead(conversationId: string): Promise<void> {
  const { error } = await req().rpc('comms_mark_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const { error } = await req().rpc('comms_leave', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function findBeeByHandle(
  handle: string,
): Promise<{ id: string; handle: string } | null> {
  const clean = handle.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  const { data, error } = await req()
    .from('bees')
    .select('id, handle')
    .eq('handle', clean)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, handle: data.handle } : null;
}

/** True when the conversation has messages the Bee hasn't read. */
export function hasUnread(conv: Conversation, myBeeId: string | undefined): boolean {
  if (!myBeeId || !conv.lastMessageAt) return false;
  const me = conv.participants.find((p) => p.beeId === myBeeId);
  if (!me) return false;
  return !me.lastReadAt || me.lastReadAt < conv.lastMessageAt;
}

/** Display title: group title, or the other side of a DM. */
export function conversationTitle(conv: Conversation, myBeeId: string | undefined): string {
  if (conv.kind === 'group') return conv.title || 'Group';
  const others = conv.participants.filter((p) => p.beeId !== myBeeId);
  if (!others.length) return conv.title || 'Conversation';
  return others.map((p) => `@${p.handle}`).join(', ');
}
