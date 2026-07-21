import { supabase } from './supabase';
import {
  decryptBody,
  encryptBody,
  ensureIdentity,
  establishConversationKey,
  getConversationKey,
  isEncryptedBody,
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
}

export interface Conversation {
  id: string;
  kind: string; // 'direct' | 'group'
  title: string | null;
  createdBy: string | null;
  lastMessageAt: string | null;
  participants: CommsParticipant[];
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
    await establishConversationKey(bee, conversation.id, members);
  }
  // else: another member holds the key and will seal to us on their next open.
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
      'id, kind, title, created_by, last_message_at, comms_participants(bee_id, last_read_at, muted, bees(handle, name))',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    createdBy: row.created_by,
    lastMessageAt: row.last_message_at,
    participants: (row.comms_participants ?? []).map((p: Row) => {
      const b = oneBee(p.bees);
      return {
        beeId: p.bee_id,
        handle: b?.handle ?? 'unknown',
        name: b?.name ?? null,
        lastReadAt: p.last_read_at,
        muted: !!p.muted,
      };
    }),
  }));
}

export async function listMessages(conversationId: string, limit = 200): Promise<CommsMessage[]> {
  const { data, error } = await req()
    .from('comms_messages')
    .select('id, conversation_id, sender_bee_id, body, content_type, is_encrypted, created_at, deleted_at')
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

// ── rooms + 1:1 calls (LiveKit) ──

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
  const { data, error } = await req()
    .from('comms_rooms')
    .select('id, livekit_room, status, kind, comms_room_participants!inner(bee_id)')
    .eq('kind', 'roulette')
    .eq('status', 'live')
    .eq('comms_room_participants.bee_id', bee)
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
