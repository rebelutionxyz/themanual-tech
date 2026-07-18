import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — reader + actions over the `notifications` table.
//
// Rows are written server-side (forum reply/mention triggers, comms_send,
// the generic `notify()` RPC). RLS scopes SELECT to the recipient, so the
// list query needs no explicit bee filter. Actions go through the deployed
// RPCs: notifications_mark_read(p_ids | null = all), notifications_dismiss.
// Mirrors the src/lib convention: plain async wrappers, snake→camel maps.
// ═════════════════════════════════════════════════════════════════════

export interface NotificationItem {
  id: number;
  actorBeeId: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  body: string | null;
  /** Deep link (in-app path like /comms/<id> or /intel/t/<id>). */
  url: string | null;
  isRead: boolean;
  createdAt: string;
}

function mapRow(row: Record<string, unknown>): NotificationItem {
  return {
    id: Number(row.id),
    actorBeeId: (row.actor_bee_id as string) ?? null,
    type: String(row.type ?? ''),
    entityType: (row.entity_type as string) ?? null,
    entityId: (row.entity_id as string) ?? null,
    title: String(row.title ?? ''),
    body: (row.body as string) ?? null,
    url: (row.url as string) ?? null,
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at ?? ''),
  };
}

/**
 * Newest-first page of the signed-in Bee's notifications (RLS-scoped).
 * `astraId` narrows to one Astra's rows (popup surface scope) — most rows
 * carry astra_id null today, so callers treat the scoped view as sparse.
 */
export async function listNotifications(
  limit = 30,
  offset = 0,
  astraId: string | null = null,
): Promise<NotificationItem[]> {
  if (!supabase) return [];
  let query = supabase
    .from('notifications')
    .select('id, actor_bee_id, type, entity_type, entity_id, title, body, url, is_read, created_at')
    // New above normal: unread first, then newest-first within each band.
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (astraId) query = query.eq('astra_id', astraId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const items = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  return resolveForumUrls(items);
}

/**
 * Forum triggers write entity refs but no `url` — resolve forum_post rows to
 * their thread deep link (/intel/t/<threadId>) in one batch query so the
 * notification card is clickable. Non-fatal: unresolved rows stay linkless.
 */
async function resolveForumUrls(items: NotificationItem[]): Promise<NotificationItem[]> {
  if (!supabase) return items;
  const postIds = items
    .filter((n) => !n.url && n.entityType === 'forum_post' && n.entityId)
    .map((n) => n.entityId as string);
  if (postIds.length === 0) return items;
  try {
    const { data } = await supabase.from('forum_posts').select('id, thread_id').in('id', postIds);
    if (!data) return items;
    const threadByPost = new Map(data.map((r) => [String(r.id), String(r.thread_id)]));
    return items.map((n) => {
      if (n.url || n.entityType !== 'forum_post' || !n.entityId) return n;
      const threadId = threadByPost.get(n.entityId);
      return threadId ? { ...n, url: `/intel/t/${threadId}` } : n;
    });
  } catch {
    return items;
  }
}

/**
 * Unread notifications from EVERY Astra (newest first). The scoped popup
 * view pins these above the surface's own results — being scoped never
 * hides fresh activity from the rest of the comb.
 */
export async function listUnreadNotifications(limit = 20): Promise<NotificationItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, actor_bee_id, type, entity_type, entity_id, title, body, url, is_read, created_at')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const items = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  return resolveForumUrls(items);
}

/** Unread count for the signed-in Bee (sidebar badge). */
export async function unreadNotificationsCount(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('notifications_unread_count');
  if (error) return 0;
  return Number(data ?? 0);
}

/**
 * Mark notifications read. `ids = null` marks ALL of the Bee's unread rows.
 * Returns the number of rows updated.
 */
export async function markNotificationsRead(ids: number[] | null = null): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('notifications_mark_read', { p_ids: ids });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Dismiss (remove) notifications by id. Returns the number affected. */
export async function dismissNotifications(ids: number[]): Promise<number> {
  if (!supabase || ids.length === 0) return 0;
  const { data, error } = await supabase.rpc('notifications_dismiss', { p_ids: ids });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
