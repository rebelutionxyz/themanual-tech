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
const arrOrNull = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.map(String) : null;

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

/** Live broadcasts, optionally filtered by realm prefix (empty = all). */
export async function pulseLiveNow(
  realmPrefix: string[] = [],
  limit = 20,
): Promise<PulseLive[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pulse_live_now', {
    p_realm_prefix: realmPrefix,
    p_limit: limit,
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

/** Published VODs, optionally realm-filtered, paginated via offset. */
export async function pulseLibrary(
  realmPrefix: string[] = [],
  limit = 24,
  offset = 0,
): Promise<PulseLibraryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('pulse_library', {
    p_realm_prefix: realmPrefix,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapLibrary);
}

/** Mixed channel + broadcast search. Branch results on `kind`. */
export async function pulseSearch(
  query: string,
  limit = 20,
): Promise<PulseSearchResult[]> {
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
export async function pulseFollow(
  channelId: string,
): Promise<{ following: boolean }> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('pulse_follow', {
    p_channel_id: channelId,
  });
  if (error) throw new Error(error.message);
  return { following: bool((data as Row | null)?.following) };
}

/** Unfollow a channel. Returns authoritative follow state. */
export async function pulseUnfollow(
  channelId: string,
): Promise<{ following: boolean }> {
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
