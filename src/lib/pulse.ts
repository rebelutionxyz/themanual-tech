import { supabase } from './supabase';

/**
 * PULSE / Freedom Network data layer.
 *
 * Typed wrappers + camelCase mappers over the public-schema `pulse_*` RPCs.
 * Mirrors the convention in `src/lib/intel.ts`: plain async functions that
 * call `supabase.rpc(...)`, map snake_case rows to camelCase, and return
 * typed data (no React Query — components fetch via useEffect).
 *
 * Phase 1 is discovery-only: live-now, upcoming, library, search, follow.
 * Tips / claims / go-live land in later dispatches.
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type ClaimPosture = string;

export interface PulseChannelRef {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  /** Upcoming rows don't carry verification; defaults to false there. */
  verified: boolean;
}

export interface PulseLive {
  broadcastId: string;
  title: string;
  summary: string | null;
  realmPath: string[] | null;
  /** Display name (e.g. "Society"); resolve to a color via useRealmColors. */
  primaryRealm: string | null;
  isPremium: boolean;
  claimPosture: ClaimPosture | null;
  viewerCount: number;
  startedAt: string | null;
  channel: PulseChannelRef;
}

export interface PulseUpcoming {
  broadcastId: string;
  title: string;
  realmPath: string[] | null;
  primaryRealm: string | null;
  isPremium: boolean;
  claimPosture: ClaimPosture | null;
  scheduledAt: string | null;
  channel: PulseChannelRef;
}

export interface PulseLibraryItem {
  broadcastId: string;
  title: string;
  summary: string | null;
  realmPath: string[] | null;
  primaryRealm: string | null;
  isPremium: boolean;
  claimPosture: ClaimPosture | null;
  viewCount: number;
  durationSec: number | null;
  publishedAt: string | null;
  channel: PulseChannelRef;
}

export type PulseSearchKind = 'channel' | 'broadcast';

export interface PulseSearchResult {
  kind: PulseSearchKind;
  id: string;
  title: string;
  subtitle: string | null;
  handle: string | null;
  channelName: string | null;
  status: string | null;
  primaryRealm: string | null;
  followerCount: number;
  viewCount: number;
  rank: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Mappers (snake_case row → camelCase)
// ─────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const bool = (v: unknown): boolean => v === true;
const arrOrNull = (v: unknown): string[] | null => (Array.isArray(v) ? v.map(String) : null);

function mapChannel(r: Row): PulseChannelRef {
  return {
    id: str(r.channel_id),
    handle: str(r.channel_handle),
    name: str(r.channel_name),
    avatarUrl: strOrNull(r.channel_avatar),
    verified: bool(r.channel_verified),
  };
}

function mapLive(r: Row): PulseLive {
  return {
    broadcastId: str(r.broadcast_id),
    title: str(r.title),
    summary: strOrNull(r.summary),
    realmPath: arrOrNull(r.realm_path),
    primaryRealm: strOrNull(r.primary_realm),
    isPremium: bool(r.is_premium),
    claimPosture: strOrNull(r.claim_posture),
    viewerCount: num(r.viewer_count),
    startedAt: strOrNull(r.started_at),
    channel: mapChannel(r),
  };
}

function mapUpcoming(r: Row): PulseUpcoming {
  return {
    broadcastId: str(r.broadcast_id),
    title: str(r.title),
    realmPath: arrOrNull(r.realm_path),
    primaryRealm: strOrNull(r.primary_realm),
    isPremium: bool(r.is_premium),
    claimPosture: strOrNull(r.claim_posture),
    scheduledAt: strOrNull(r.scheduled_at),
    channel: mapChannel(r),
  };
}

function mapLibrary(r: Row): PulseLibraryItem {
  return {
    broadcastId: str(r.broadcast_id),
    title: str(r.title),
    summary: strOrNull(r.summary),
    realmPath: arrOrNull(r.realm_path),
    primaryRealm: strOrNull(r.primary_realm),
    isPremium: bool(r.is_premium),
    claimPosture: strOrNull(r.claim_posture),
    viewCount: num(r.view_count),
    durationSec: r.duration_sec == null ? null : num(r.duration_sec),
    publishedAt: strOrNull(r.published_at),
    channel: mapChannel(r),
  };
}

function mapSearch(r: Row): PulseSearchResult {
  const kind: PulseSearchKind = r.kind === 'channel' ? 'channel' : 'broadcast';
  return {
    kind,
    id: str(r.id),
    title: str(r.title),
    subtitle: strOrNull(r.subtitle),
    handle: strOrNull(r.handle),
    channelName: strOrNull(r.channel_name),
    status: strOrNull(r.status),
    primaryRealm: strOrNull(r.primary_realm),
    followerCount: num(r.follower_count),
    viewCount: num(r.view_count),
    rank: num(r.rank),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────

/**
 * Live broadcasts, OR-filtered across realm prefixes (empty = all). Each prefix
 * is a realm_path array; the DB ORs them. `p_query`/`p_after`/`p_before` are
 * forwarded as null — no keyword/time state in the frontend yet (see flag).
 */
export async function pulseLiveNow(
  realmPrefixes: string[][] = [],
  limit = 20,
  after: string | null = null,
): Promise<PulseLive[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pulse_live_now', {
    p_realm_prefixes: realmPrefixes.length ? realmPrefixes : null,
    p_limit: limit,
    p_query: null,
    p_after: after,
    p_before: null,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapLive);
}

/** Scheduled, not-yet-live broadcasts. Not realm-filtered (per RPC). */
export async function pulseUpcoming(limit = 12): Promise<PulseUpcoming[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pulse_upcoming', {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapUpcoming);
}

/**
 * Published VODs, OR-filtered across realm prefixes, paginated via offset.
 * `p_query`/`p_after`/`p_before` forwarded as null — no keyword/time state yet.
 */
export async function pulseLibrary(
  realmPrefixes: string[][] = [],
  limit = 24,
  offset = 0,
  after: string | null = null,
): Promise<PulseLibraryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pulse_library', {
    p_realm_prefixes: realmPrefixes.length ? realmPrefixes : null,
    p_limit: limit,
    p_offset: offset,
    p_query: null,
    p_after: after,
    p_before: null,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapLibrary);
}

/** Mixed channel + broadcast search. Branch results on `kind`. */
export async function pulseSearch(query: string, limit = 20): Promise<PulseSearchResult[]> {
  if (!supabase) return [];
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase.rpc('pulse_search', {
    p_query: q,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapSearch);
}

/** Follow a channel. Returns authoritative follow state. */
export async function pulseFollow(channelId: string): Promise<{ following: boolean }> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_follow', {
    p_channel_id: channelId,
  });
  if (error) throw new Error(error.message);
  return { following: bool((data as Row | null)?.following) };
}

/** Unfollow a channel. Returns authoritative follow state. */
export async function pulseUnfollow(channelId: string): Promise<{ following: boolean }> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_unfollow', {
    p_channel_id: channelId,
  });
  if (error) throw new Error(error.message);
  return { following: bool((data as Row | null)?.following) };
}

/** The current Bee's channel id, or null if they don't have one. */
export async function pulseMyChannel(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('pulse_my_channel');
  if (error) throw new Error(error.message);
  return data ? String(data) : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────

/** Seconds → compact duration ("4:07", "1:02:31"). */
export function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** ISO timestamp → viewer-local short date + time (e.g. "Jun 27, 3:40 PM"). */
export function formatScheduled(iso: string | null): string {
  if (!iso) return 'Soon';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Soon';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Watch + Channel + Creator rail (astras sweep: PULSE pass)
// ─────────────────────────────────────────────────────────────────────────

export interface PulseChannel {
  id: string;
  ownerBee: string;
  handle: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  followerCount: number;
  locationText: string | null;
  createdAt: string;
}

function mapFullChannel(row: Record<string, unknown>): PulseChannel {
  return {
    id: String(row.id),
    ownerBee: String(row.owner_bee ?? ''),
    handle: String(row.handle ?? ''),
    name: String(row.name ?? ''),
    tagline: (row.tagline as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    bannerUrl: (row.banner_url as string) ?? null,
    isVerified: Boolean(row.is_verified),
    followerCount: Number(row.follower_count ?? 0),
    locationText: (row.location_text as string) ?? null,
    createdAt: String(row.created_at ?? ''),
  };
}

export interface PulseBroadcast {
  id: string;
  channelId: string;
  title: string;
  summary: string | null;
  status: string;
  claimPosture: ClaimPosture | null;
  isPremium: boolean;
  recordingUrl: string | null;
  viewerCount: number;
  viewCount: number;
  commentCount: number;
  durationSec: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function mapBroadcast(row: Record<string, unknown>): PulseBroadcast {
  return {
    id: String(row.id),
    channelId: String(row.channel_id ?? ''),
    title: String(row.title ?? ''),
    summary: (row.summary as string) ?? null,
    status: String(row.status ?? ''),
    claimPosture: (row.claim_posture as string) ?? null,
    isPremium: Boolean(row.is_premium),
    recordingUrl: (row.recording_url as string) ?? null,
    viewerCount: Number(row.viewer_count ?? 0),
    viewCount: Number(row.view_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    durationSec: row.duration_sec == null ? null : Number(row.duration_sec),
    scheduledAt: (row.scheduled_at as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    createdAt: String(row.created_at ?? ''),
  };
}

/** Broadcast + its channel (direct RLS reads; both tables are public-read). */
export async function getBroadcast(
  broadcastId: string,
): Promise<{ broadcast: PulseBroadcast; channel: PulseChannel | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('pulse_broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .is('removed_at', null)
    .maybeSingle();
  if (!data) return null;
  const broadcast = mapBroadcast(data);
  const { data: ch } = await supabase
    .from('pulse_channels')
    .select('*')
    .eq('id', broadcast.channelId)
    .maybeSingle();
  return { broadcast, channel: ch ? mapFullChannel(ch) : null };
}

/** Fire-and-forget view counter + creator drip (pulse_view RPC). */
export function registerView(broadcastId: string): void {
  if (!supabase) return;
  void supabase.rpc('pulse_view', { p_broadcast_id: broadcastId }).then(
    () => {},
    () => {},
  );
}

export async function getChannelByHandle(handle: string): Promise<PulseChannel | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('pulse_channels')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();
  return data ? mapFullChannel(data) : null;
}

export async function getChannelById(id: string): Promise<PulseChannel | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('pulse_channels').select('*').eq('id', id).maybeSingle();
  return data ? mapFullChannel(data) : null;
}

/** All of a channel's visible broadcasts, newest first; split client-side. */
export async function listChannelBroadcasts(channelId: string): Promise<PulseBroadcast[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('pulse_broadcasts')
    .select('*')
    .eq('channel_id', channelId)
    .is('removed_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBroadcast);
}

// ── Creator rail ──

export interface ChannelInput {
  handle?: string; // create only — updates can't change the handle
  name: string;
  tagline?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  locationText?: string | null;
}

/** Create the Bee's channel (one per Bee). Returns the channel id. */
export async function createChannel(input: ChannelInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_channel_create', {
    p_handle: input.handle ?? '',
    p_name: input.name,
    p_tagline: input.tagline ?? null,
    p_realm_path: null,
    p_location_text: input.locationText ?? null,
    p_lat: null,
    p_lng: null,
    p_avatar_url: input.avatarUrl ?? null,
    p_banner_url: input.bannerUrl ?? null,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { id?: string; channel_id?: string };
  return String(r.id ?? r.channel_id ?? data ?? '');
}

/** Update the Bee's own channel (RPC resolves it from auth). */
export async function updateChannel(input: ChannelInput): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_channel_update', {
    p_name: input.name,
    p_tagline: input.tagline ?? null,
    p_realm_path: null,
    p_location_text: input.locationText ?? null,
    p_lat: null,
    p_lng: null,
    p_avatar_url: input.avatarUrl ?? null,
    p_banner_url: input.bannerUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Upload channel imagery to the group-media bucket
 * (channels/{channel_id}/profile/… — pulse_channel_media_insert policy).
 * Returns the public URL; persist it via updateChannel.
 */
export async function uploadChannelImage(
  channelId: string,
  kind: 'avatar' | 'banner',
  file: File,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `channels/${channelId}/profile/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('group-media')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('group-media').getPublicUrl(path).data.publicUrl;
}

export interface ScheduleBroadcastInput {
  title: string;
  scheduledAt: string; // ISO
  summary?: string | null;
  locationText?: string | null;
}

/** Schedule an upcoming broadcast (shows in Upcoming; going live stays LiveKit-gated). */
export async function scheduleBroadcast(input: ScheduleBroadcastInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_broadcast_schedule', {
    p_title: input.title,
    p_scheduled_at: input.scheduledAt,
    p_summary: input.summary ?? null,
    p_realm_path: null,
    p_location_text: input.locationText ?? null,
    p_lat: null,
    p_lng: null,
    p_atom_id: null,
    p_claim_posture: null,
    p_is_premium: false,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { id?: string; broadcast_id?: string };
  return String(r.id ?? r.broadcast_id ?? data ?? '');
}

export interface PublishVodInput {
  title: string;
  recordingUrl: string;
  summary?: string | null;
  durationSec?: number | null;
}

/** Publish a video post (external recording URL — no LiveKit needed). */
export async function publishVod(input: PublishVodInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_broadcast_publish_vod', {
    p_title: input.title,
    p_recording_url: input.recordingUrl,
    p_duration_sec: input.durationSec ?? null,
    p_summary: input.summary ?? null,
    p_realm_path: null,
    p_location_text: null,
    p_lat: null,
    p_lng: null,
    p_atom_id: null,
    p_claim_posture: null,
    p_is_premium: false,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { id?: string; broadcast_id?: string };
  return String(r.id ?? r.broadcast_id ?? data ?? '');
}

// ── Comments ──

export interface PulseComment {
  id: string;
  beeId: string;
  parentId: string | null;
  body: string;
  isPinned: boolean;
  removed: boolean;
  createdAt: string;
  handle: string | null;
}

/** Comment list, oldest first (direct RLS read + one handle batch). */
export async function listComments(broadcastId: string, limit = 200): Promise<PulseComment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('pulse_comments')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => String(r.bee_id)).filter(Boolean)));
  const handle = new Map<string, string>();
  if (ids.length > 0) {
    const { data: bees } = await supabase.from('bees').select('id, handle').in('id', ids);
    for (const b of bees ?? []) handle.set(String(b.id), String(b.handle));
  }
  return rows.map((r) => ({
    id: String(r.id),
    beeId: String(r.bee_id),
    parentId: r.parent_id == null ? null : String(r.parent_id),
    body: String(r.body ?? ''),
    isPinned: Boolean(r.is_pinned),
    removed: r.removed_at != null,
    createdAt: String(r.created_at ?? ''),
    handle: handle.get(String(r.bee_id)) ?? null,
  }));
}

export async function postComment(broadcastId: string, body: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_comment_post', {
    p_broadcast_id: broadcastId,
    p_body: body,
    p_parent_id: null,
  });
  if (error) throw new Error(error.message);
}

export async function removeComment(commentId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_comment_remove', {
    p_comment_id: Number(commentId),
  });
  if (error) throw new Error(error.message);
}

// ── Claims (the PULSE truth layer) ──

export interface PulseClaim {
  id: string;
  text: string;
  status: string;
  isDisputed: boolean;
  isAiSurfaced: boolean;
  sourcesCount: number;
  sourcesNeeded: number;
  createdBy: string;
  createdAt: string;
}

export async function listClaims(broadcastId: string): Promise<PulseClaim[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('pulse_claims')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    text: String(r.text ?? ''),
    status: String(r.status ?? ''),
    isDisputed: Boolean(r.is_disputed),
    isAiSurfaced: Boolean(r.is_ai_surfaced),
    sourcesCount: Number(r.sources_count ?? 0),
    sourcesNeeded: Number(r.sources_needed ?? 0),
    createdBy: String(r.created_by ?? ''),
    createdAt: String(r.created_at ?? ''),
  }));
}

export async function addClaim(broadcastId: string, text: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_claim_add', {
    p_broadcast_id: broadcastId,
    p_text: text,
    p_atom_id: null,
    p_is_ai_surfaced: false,
    p_status: null,
    p_sources_needed: null,
  });
  if (error) throw new Error(error.message);
}

export async function disputeClaim(claimId: string, disputed: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_claim_dispute', {
    p_claim_id: claimId,
    p_disputed: disputed,
  });
  if (error) throw new Error(error.message);
}

export async function addClaimSource(claimId: string, url: string, note: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('pulse_claim_source', {
    p_claim_id: claimId,
    p_source_url: url,
    p_note: note || null,
  });
  if (error) throw new Error(error.message);
}
