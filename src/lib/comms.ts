import { supabase } from './supabase';

/**
 * COMMs v1 (text layer) — typed wrappers over the comms_* RPCs deployed in
 * production (2026-07-10 session: 12 RPCs live, schema + RLS present, zero
 * frontend until now). Rooms + roulette are gated on the LiveKit decision.
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
  body: string;
  contentType: string;
  createdAt: string;
  deletedAt: string | null;
}

function req() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

/** A nested `bees(handle,name)` embed comes back as an object (to-one). */
type BeesEmbed = { handle: string; name: string | null } | { handle: string; name: string | null }[] | null;
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
    .select('id, conversation_id, sender_bee_id, body, content_type, created_at, deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((m: Row) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderBeeId: m.sender_bee_id,
    body: m.body,
    contentType: m.content_type,
    createdAt: m.created_at,
    deletedAt: m.deleted_at,
  }));
}

export async function sendMessage(conversationId: string, body: string): Promise<string> {
  const { data, error } = await req().rpc('comms_send', {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw error;
  return (data as Row)?.message_id ?? '';
}

/** Idempotent: returns the existing 1:1 conversation when one exists. */
export async function startDirect(otherBeeId: string): Promise<string> {
  const { data, error } = await req().rpc('comms_start_direct', { p_other: otherBeeId });
  if (error) throw error;
  const id = (data as Row)?.conversation_id;
  if (!id) throw new Error('comms_start_direct returned no conversation id');
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
  return id;
}

export async function markRead(conversationId: string): Promise<void> {
  const { error } = await req().rpc('comms_mark_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const { error } = await req().rpc('comms_leave', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function findBeeByHandle(handle: string): Promise<{ id: string; handle: string } | null> {
  const clean = handle.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  const { data, error } = await req().from('bees').select('id, handle').eq('handle', clean).maybeSingle();
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
