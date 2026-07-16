import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// CREATORS STUDIO — cross-Astra manage-your-content data layer.
//
// A Workshop section (Creators Studio · Create Novas · Create Apps). V1
// covers: forum threads + replies (edit via RLS update_own; edited_at
// stamped by the forum_*_stamp_edit triggers) and Pulse video posts
// (channel + broadcasts via the deployed pulse_* creator RPCs).
// ═════════════════════════════════════════════════════════════════════

// ── Forum: my replies ─────────────────────────────────────────────────

export interface MyReply {
  id: string;
  threadId: string;
  threadTitle: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  upvotes: number;
  downvotes: number;
}

/** Replies (forum posts) authored by this Bee, newest first, thread titles baked in. */
export async function listMyReplies(beeId: string, limit = 100): Promise<MyReply[]> {
  if (!supabase || !beeId) return [];
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id, thread_id, body, created_at, edited_at, upvotes, downvotes')
    .eq('bee_id', beeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const threadIds = Array.from(new Set(rows.map((r) => String(r.thread_id))));
  const titles = new Map<string, string>();
  if (threadIds.length > 0) {
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, title')
      .in('id', threadIds);
    for (const t of threads ?? []) titles.set(String(t.id), String(t.title ?? ''));
  }
  return rows.map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    threadTitle: titles.get(String(r.thread_id)) ?? null,
    body: String(r.body ?? ''),
    createdAt: String(r.created_at ?? ''),
    editedAt: (r.edited_at as string | null) ?? null,
    upvotes: Number(r.upvotes ?? 0),
    downvotes: Number(r.downvotes ?? 0),
  }));
}

/** Edit own thread (RLS update_own; forum_threads_stamp_edit stamps edited_at). */
export async function updateMyThread(
  threadId: string,
  fields: { title?: string; body?: string },
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const patch: Record<string, string> = {};
  if (typeof fields.title === 'string') patch.title = fields.title;
  if (typeof fields.body === 'string') patch.body = fields.body;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('forum_threads').update(patch).eq('id', threadId);
  if (error) throw new Error(error.message);
}

/** Edit own reply (RLS update_own; forum_posts_stamp_edit stamps edited_at). */
export async function updateMyReply(postId: string, body: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('forum_posts').update({ body }).eq('id', postId);
  if (error) throw new Error(error.message);
}

// ── Pulse: my channel + video posts ───────────────────────────────────

export interface MyChannel {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  followerCount: number;
  isVerified: boolean;
}

export interface MyBroadcast {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  publishedAt: string | null;
  viewCount: number;
  durationSec: number | null;
  createdAt: string;
}

/** The signed-in Bee's Pulse channel (owner_bee = me), or null if none yet. */
export async function getMyChannel(beeId: string): Promise<MyChannel | null> {
  if (!supabase || !beeId) return null;
  const { data } = await supabase
    .from('pulse_channels')
    .select('id, handle, name, tagline, follower_count, is_verified')
    .eq('owner_bee', beeId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    handle: String(data.handle ?? ''),
    name: String(data.name ?? ''),
    tagline: (data.tagline as string | null) ?? null,
    followerCount: Number(data.follower_count ?? 0),
    isVerified: Boolean(data.is_verified),
  };
}

/** Video posts on my channel, newest first (RLS shows the owner everything). */
export async function listMyBroadcasts(channelId: string, limit = 50): Promise<MyBroadcast[]> {
  if (!supabase || !channelId) return [];
  const { data, error } = await supabase
    .from('pulse_broadcasts')
    .select(
      'id, title, summary, status, scheduled_at, started_at, published_at, view_count, duration_sec, created_at',
    )
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    summary: (r.summary as string | null) ?? null,
    status: String(r.status ?? ''),
    scheduledAt: (r.scheduled_at as string | null) ?? null,
    startedAt: (r.started_at as string | null) ?? null,
    publishedAt: (r.published_at as string | null) ?? null,
    viewCount: Number(r.view_count ?? 0),
    durationSec: (r.duration_sec as number | null) ?? null,
    createdAt: String(r.created_at ?? ''),
  }));
}

/** Create my channel (one per Bee; pulse_channel_create enforces). */
export async function createMyChannel(
  handle: string,
  name: string,
  tagline?: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_channel_create', {
    p_handle: handle,
    p_name: name,
    p_tagline: tagline ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Schedule an upcoming video post (status 'upcoming'). */
export async function scheduleMyBroadcast(
  title: string,
  scheduledAtIso: string,
  summary?: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_broadcast_schedule', {
    p_title: title,
    p_scheduled_at: scheduledAtIso,
    p_summary: summary ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Publish a recorded video post straight to the library. */
export async function publishMyVod(
  title: string,
  recordingUrl: string,
  summary?: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_broadcast_publish_vod', {
    p_title: title,
    p_recording_url: recordingUrl,
    p_summary: summary ?? null,
  });
  if (error) throw new Error(error.message);
}
