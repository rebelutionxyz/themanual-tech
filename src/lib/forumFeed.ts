import { supabase } from './supabase';
import { REALM_ID_BY_NAME } from '@/lib/constants';
import type { RealmId } from '@/types/manual';

// ═════════════════════════════════════════════════════════════════════
// forum_thread_feed — unified ranked thread feed (trending / top / new).
// Author handle + scores baked into the row (no N+1 enrichment needed).
// forum_realm_facets — top-level realm categories that carry posts.
// ═════════════════════════════════════════════════════════════════════

export type FeedSort = 'trending' | 'top' | 'new';

export interface ThreadFeedItem {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  lastActivityAt: string;
  replyCount: number;
  isLocked: boolean;
  authorBeeId: string;
  authorHandle: string | null;
  primaryRealm: RealmId | null;
  realmPath: string[];
  netScore: number;
  trendingScore: number;
}

function mapFeed(row: Record<string, unknown>): ThreadFeedItem {
  return {
    id: String(row.thread_id),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ''),
    createdAt: String(row.created_at ?? ''),
    lastActivityAt: String(row.last_activity_at ?? ''),
    replyCount: Number(row.reply_count ?? 0),
    isLocked: Boolean(row.is_locked),
    authorBeeId: String(row.author_bee_id ?? ''),
    authorHandle: (row.author_handle as string) ?? null,
    primaryRealm: (row.primary_realm as RealmId) ?? null,
    realmPath: Array.isArray(row.realm_path) ? (row.realm_path as string[]) : [],
    netScore: Number(row.net_score ?? 0),
    trendingScore: Number(row.trending_score ?? 0),
  };
}

/**
 * Ranked thread feed, OR-filtered across realm prefixes. Each prefix is a
 * realm_path array (e.g. ['Society','Government']); the DB ORs them. Empty =
 * all threads. sort: 'trending' (default), 'top' (net score), 'new' (recency).
 *
 * NOTE: `p_query` / `p_after` / `p_before` are forwarded as null — the frontend
 * has no keyword-chip or time-range state to source them from yet (see the
 * session flag). When that UI lands, pass them through here.
 */
export async function listThreadFeed(
  prefixes: string[][] = [],
  sort: FeedSort = 'trending',
  limit = 20,
  offset = 0,
): Promise<ThreadFeedItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('forum_thread_feed', {
    p_realm_prefixes: prefixes.length ? prefixes : null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
    p_query: null,
    p_after: null,
    p_before: null,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapFeed);
}

/**
 * Astra-LOCAL forum search — cross-realm (IGNORES the realm selection; searches
 * the whole INTEL Astra). forum_search requires ≥2 chars. Returns ThreadFeedItem
 * rows so the existing feed → ForumThread pipeline (feedItemToThread) renders the
 * results unchanged.
 *
 * THIS IS THE PER-SURFACE SEARCH HOOK: other Astras swap in their own content
 * search RPC behind the same `useLensStore.searchTerm` pattern (PULSE →
 * pulse_search, GIVE → campaigns_search(term), etc.).
 */
export async function forumSearch(query: string, limit = 30): Promise<ThreadFeedItem[]> {
  const q = query.trim();
  if (!supabase || q.length < 2) return [];
  const { data, error } = await supabase.rpc('forum_search', {
    p_query: q,
    p_realm_prefixes: null, // cross-realm: ignore the realm lens
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapSearchRow);
}

function mapSearchRow(row: Record<string, unknown>): ThreadFeedItem {
  return {
    id: String(row.thread_id),
    title: String(row.title),
    excerpt: String(row.snippet ?? ''),
    createdAt: String(row.last_activity_at ?? ''),
    lastActivityAt: String(row.last_activity_at ?? ''),
    replyCount: Number(row.reply_count ?? 0),
    isLocked: false,
    authorBeeId: String(row.created_by ?? ''),
    authorHandle: null,
    primaryRealm: (row.primary_realm as RealmId) ?? null,
    realmPath: Array.isArray(row.realm_path) ? (row.realm_path as string[]) : [],
    netScore: Number(row.score ?? 0),
    trendingScore: 0,
  };
}

export interface RealmCategory {
  segment: string;
  threadCount: number;
  hasChildren: boolean;
  /** Resolved realm slug for the top-level segment (null if unmapped). */
  realmId: RealmId | null;
}

/** Top-level realm categories that actually carry posts (forum_realm_facets([])). */
export async function listRealmCategories(): Promise<RealmCategory[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('forum_realm_facets', { p_prefix: [] });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    segment: String(r.segment),
    threadCount: Number(r.thread_count ?? 0),
    hasChildren: Boolean(r.has_children),
    realmId: REALM_ID_BY_NAME[String(r.segment)] ?? null,
  }));
}
