import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// Events (RULE / AtlasUNITED). Backend: events + event_rsvps tables,
// event_create / event_rsvp RPCs. going_count/maybe_count live on the row.
// bee.id === auth.uid().
// ═════════════════════════════════════════════════════════════════════

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  isVirtual: boolean;
  virtualLink: string | null;
  createdBy: string;
  parentSurface: string | null;
  parentId: string | null;
  goingCount: number;
  maybeCount: number;
  createdAt: string;
}

export interface EventRsvpRow {
  status: RsvpStatus;
  handle: string | null;
  name: string | null;
}

/** Postgres `point` comes back as "(x,y)" where x=lng, y=lat. */
function parsePoint(raw: unknown): { lng: number | null; lat: number | null } {
  if (typeof raw !== 'string') return { lng: null, lat: null };
  const m = raw.match(/\(([^,]+),([^)]+)\)/);
  if (!m) return { lng: null, lat: null };
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  return { lng: Number.isFinite(lng) ? lng : null, lat: Number.isFinite(lat) ? lat : null };
}

function mapEvent(row: Record<string, unknown>): EventItem {
  const { lng, lat } = parsePoint(row.location_coords);
  return {
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string) ?? null,
    startsAt: String(row.starts_at ?? ''),
    endsAt: (row.ends_at as string) ?? null,
    locationText: (row.location_text as string) ?? null,
    lat,
    lng,
    isVirtual: Boolean(row.is_virtual),
    virtualLink: (row.virtual_link as string) ?? null,
    createdBy: String(row.created_by ?? ''),
    parentSurface: (row.parent_surface as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
    goingCount: Number(row.going_count ?? 0),
    maybeCount: Number(row.maybe_count ?? 0),
    createdAt: String(row.created_at ?? ''),
  };
}

function bee(row: Record<string, unknown>): { handle: string | null; name: string | null } {
  const b = row.bees;
  const obj = Array.isArray(b) ? b[0] : b;
  const rec = (obj ?? {}) as Record<string, unknown>;
  return { handle: (rec.handle as string) ?? null, name: (rec.name as string) ?? null };
}

// ───────────────────────────── Reading ─────────────────────────────

export async function listEvents(upcomingOnly = true): Promise<EventItem[]> {
  if (!supabase) return [];
  let q = supabase.from('events').select('*').order('starts_at', { ascending: true });
  if (upcomingOnly) q = q.gte('starts_at', new Date().toISOString());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEvent);
}

/** Events anchored to a group (events.parent_id = group_id). */
export async function listEventsByGroup(groupId: string, upcomingOnly = true): Promise<EventItem[]> {
  if (!supabase) return [];
  let q = supabase.from('events').select('*').eq('parent_id', groupId).order('starts_at', { ascending: true });
  if (upcomingOnly) q = q.gte('starts_at', new Date().toISOString());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEvent);
}

export async function getEvent(id: string): Promise<EventItem | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  return data ? mapEvent(data) : null;
}

export async function listRsvps(eventId: string): Promise<EventRsvpRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('status, bees(handle,name)')
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const b = bee(row);
    return { status: (row.status as RsvpStatus) ?? 'going', handle: b.handle, name: b.name };
  });
}

export async function getMyRsvp(eventId: string, beeId: string): Promise<RsvpStatus | null> {
  if (!supabase || !beeId) return null;
  const { data } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('bee_id', beeId)
    .maybeSingle();
  return data ? ((data.status as RsvpStatus) ?? null) : null;
}

// ───────────────────────────── Actions ─────────────────────────────

function unwrap<T = Record<string, unknown>>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return (data ?? {}) as T;
}

export interface CreateEventInput {
  title: string;
  startsAt: string; // ISO
  description?: string;
  endsAt?: string | null; // ISO
  isVirtual?: boolean;
  virtualLink?: string | null;
  locationText?: string | null;
  lat?: number | null;
  lng?: number | null;
  parentId?: string | null; // group id when hosted by a group
}

export async function createEvent(input: CreateEventInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('event_create', {
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_description: input.description ?? null,
    p_ends_at: input.endsAt ?? null,
    p_location_text: input.locationText ?? null,
    p_is_virtual: input.isVirtual ?? false,
    p_virtual_link: input.virtualLink ?? null,
    p_parent_surface: 'unite',
    p_parent_id: input.parentId ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
  const r = unwrap<{ id?: string }>(data, error);
  return String(r.id ?? '');
}

/** Upsert RSVP. not_going is the decline state (no separate un-RSVP). */
export async function rsvp(eventId: string, status: RsvpStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('event_rsvp', { p_event_id: eventId, p_status: status });
  unwrap(data, error);
}

// ──────────────────────── Event discussion (forum reuse) ────────────────────────

export interface EventThread {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  authorHandle: string | null;
}

export async function listEventThreads(eventId: string): Promise<EventThread[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('parent_id', eventId)
    .order('last_activity_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => String(r.created_by)).filter(Boolean)));
  const handle = new Map<string, string>();
  if (ids.length > 0) {
    const { data: bees } = await supabase.from('bees').select('id, handle').in('id', ids);
    for (const b of bees ?? []) handle.set(String(b.id), String(b.handle));
  }
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body ?? ''),
    replyCount: Number(r.reply_count ?? 0),
    lastActivityAt: String(r.last_activity_at ?? ''),
    authorHandle: handle.get(String(r.created_by)) ?? null,
  }));
}

export async function createEventThread(eventId: string, title: string, body: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('forum_create_thread', {
    p_title: title,
    p_body: body,
    // Event discussion scopes under the Events surface ('rule'), NOT 'unite'.
    // The thread hangs off the event, whose surface label is 'rule'.
    p_parent_surface: 'rule',
    p_parent_id: eventId,
  });
  const r = unwrap<{ thread_id?: string; id?: string }>(data, error);
  return String(r.thread_id ?? r.id ?? '');
}

// ──────────────────────────── Date helpers ────────────────────────────

/** "Sat, Jun 28 · 7:00 PM" style. */
export function formatEventWhen(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  const datePart = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timePart = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (endsAt) {
    const end = new Date(endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return `${datePart} · ${timePart} – ${endTime}`;
  }
  return `${datePart} · ${timePart}`;
}
