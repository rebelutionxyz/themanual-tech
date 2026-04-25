import { supabase } from './supabase';
import type { RealmId } from '@/types/manual';

// ═════════════════════════════════════════════════════════════════════
// Types mirroring the forum_threads / forum_posts tables
// ═════════════════════════════════════════════════════════════════════

export interface ForumThread {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  parentSurface: string | null;
  parentId: string | null;
  /** Auto-derived or manually set realm this thread primarily lives in (RealmId slug) */
  primaryRealm: RealmId | null;
  /** Optional L2 subcategory */
  primaryL2: string | null;
  replyCount: number;
  lastActivityAt: string;
  isLocked: boolean;
  createdAt: string;
  authorHandle?: string;
  atomLinks?: { atomId: string; linkType: string }[];
}

export interface ForumPost {
  id: string;
  threadId: string;
  beeId: string;
  body: string;
  parentPostId: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  editedAt: string | null;
  authorHandle?: string;
}

export interface ThreadListFilter {
  /**
   * When set, only include threads whose primary_realm == this realmId
   * OR whose linked atoms' realmId == this realmId.
   */
  realmId?: RealmId | null;
  l2?: string | null;
  /** Only threads linked to this specific atom */
  atomId?: string | null;
  sortBy?: 'hot' | 'new' | 'top';
  /** Time window in hours for sortBy='hot' or 'new'. 0 = all-time. */
  timeWindowHours?: number;
  limit?: number;
}

export interface CreateThreadInput {
  title: string;
  body: string;
  atomIds?: string[];
  categoryPaths?: string[];
  primaryRealm?: RealmId | null;
  primaryL2?: string | null;
  parentSurface?: string | null;
  parentId?: string | null;
}

// ═════════════════════════════════════════════════════════════════════
// Mapping helpers (snake_case DB → camelCase client)
// ═════════════════════════════════════════════════════════════════════

function mapThread(row: Record<string, unknown>): ForumThread {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body ?? ''),
    createdBy: String(row.created_by ?? ''),
    parentSurface: (row.parent_surface as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
    primaryRealm: (row.primary_realm as RealmId) ?? null,
    primaryL2: (row.primary_l2 as string) ?? null,
    replyCount: Number(row.reply_count ?? 0),
    lastActivityAt: String(row.last_activity_at ?? ''),
    isLocked: Boolean(row.is_locked),
    createdAt: String(row.created_at ?? ''),
    authorHandle: (row.author_handle as string) ?? undefined,
  };
}

function mapPost(row: Record<string, unknown>): ForumPost {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    beeId: String(row.bee_id ?? ''),
    body: String(row.body ?? ''),
    parentPostId: (row.parent_post_id as string) ?? null,
    upvotes: Number(row.upvotes ?? 0),
    downvotes: Number(row.downvotes ?? 0),
    createdAt: String(row.created_at ?? ''),
    editedAt: (row.edited_at as string) ?? null,
    authorHandle: (row.author_handle as string) ?? undefined,
  };
}

// ═════════════════════════════════════════════════════════════════════
// Queries
// ═════════════════════════════════════════════════════════════════════

/**
 * List threads with optional filters.
 *
 * Realm filtering applies Model D:
 * - Match threads where primary_realm = filter.realm
 * - OR threads linked to atoms whose realm = filter.realm
 *
 * To do this efficiently we ship atomIds-by-realm from the client.
 */
export async function listThreads(
  filter: ThreadListFilter = {},
  atomIdsInRealm?: string[],
): Promise<ForumThread[]> {
  if (!supabase) return [];
  const limit = filter.limit ?? 30;

  const order =
    filter.sortBy === 'top'
      ? { col: 'reply_count', ascending: false }
      : filter.sortBy === 'new'
        ? { col: 'created_at', ascending: false }
        : { col: 'last_activity_at', ascending: false };

  // Compute time-window cutoff (if applicable). 0 = all-time, skip filter.
  const windowHours = filter.timeWindowHours;
  const applyWindow = typeof windowHours === 'number' && windowHours > 0;
  const cutoffIso = applyWindow
    ? new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
    : null;
  // Which column to filter by window on:
  //  - 'new' (Breaking): filter by created_at (threads born in window)
  //  - 'hot': filter by last_activity_at (threads active in window)
  //  - 'top': we could filter either way; default to last_activity_at
  const windowCol: 'created_at' | 'last_activity_at' =
    filter.sortBy === 'new' ? 'created_at' : 'last_activity_at';

  // Specific atom filter — narrow to threads linked to this atom
  if (filter.atomId) {
    const { data: links } = await supabase
      .from('entity_atom_links')
      .select('source_id')
      .eq('source_surface', 'intel')
      .eq('atom_id', filter.atomId);
    if (!links?.length) return [];
    const ids = links.map((l) => l.source_id);
    let q = supabase
      .from('forum_threads')
      .select('*')
      .in('id', ids)
      .order(order.col, { ascending: order.ascending })
      .limit(limit);
    if (cutoffIso) q = q.gte(windowCol, cutoffIso);
    const { data: threads } = await q;
    return enrichWithAuthors(threads ?? []);
  }

  // No realm filter — all threads
  if (!filter.realmId) {
    let q = supabase
      .from('forum_threads')
      .select('*')
      .order(order.col, { ascending: order.ascending })
      .limit(limit);
    if (cutoffIso) q = q.gte(windowCol, cutoffIso);
    const { data } = await q;
    return enrichWithAuthors(data ?? []);
  }

  // Realm filter: two sources
  // 1. Threads with primary_realm = realmId
  // 2. Threads linked to atoms in that realm (via entity_atom_links)
  const directIds = new Set<string>();
  const linkedIds = new Set<string>();

  // Query 1 — direct primary_realm match (also filter by l2 if set)
  let q = supabase
    .from('forum_threads')
    .select('id')
    .eq('primary_realm', filter.realmId);
  if (filter.l2) q = q.eq('primary_l2', filter.l2);
  const { data: direct } = await q;
  (direct ?? []).forEach((r) => directIds.add(String(r.id)));

  // Query 2 — via atom links (only if atomIdsInRealm provided; otherwise skip)
  // BATCH must stay small: each atom ID is ~80 chars average. PostgREST rejects
  // URLs beyond ~16KB total. 50 IDs × 80 chars ≈ 4KB — safely under limits.
  if (atomIdsInRealm && atomIdsInRealm.length > 0) {
    const BATCH = 50;
    for (let i = 0; i < atomIdsInRealm.length; i += BATCH) {
      const chunk = atomIdsInRealm.slice(i, i + BATCH);
      const { data: links, error: linkErr } = await supabase
        .from('entity_atom_links')
        .select('source_id')
        .eq('source_surface', 'intel')
        .in('atom_id', chunk);
      if (linkErr) {
        // Log but keep going — partial results better than no thread list
        console.warn('atom link batch failed', linkErr.message);
        continue;
      }
      (links ?? []).forEach((l) => linkedIds.add(String(l.source_id)));
    }
  }

  const allIds = Array.from(new Set([...directIds, ...linkedIds]));
  if (allIds.length === 0) return [];

  let qFinal = supabase
    .from('forum_threads')
    .select('*')
    .in('id', allIds)
    .order(order.col, { ascending: order.ascending })
    .limit(limit);
  if (cutoffIso) qFinal = qFinal.gte(windowCol, cutoffIso);
  const { data: threads } = await qFinal;
  return enrichWithAuthors(threads ?? []);
}

/**
 * Fetch thread IDs authored by a specific Bee.
 * @param sortMode 'newest' = by created_at (default). 'active' = by last_activity_at.
 */
export async function listThreadIdsByAuthor(
  beeId: string,
  sortMode: 'newest' | 'active' = 'newest',
): Promise<string[]> {
  if (!supabase || !beeId) return [];
  const orderCol = sortMode === 'active' ? 'last_activity_at' : 'created_at';
  const { data } = await supabase
    .from('forum_threads')
    .select('id')
    .eq('created_by', beeId)
    .order(orderCol, { ascending: false });
  return (data ?? []).map((r) => String(r.id));
}

/**
 * Count of threads authored by a specific Bee. Used for sidebar badge.
 * Uses head+count — no row payload transferred.
 */
export async function countThreadsByAuthor(beeId: string): Promise<number> {
  if (!supabase || !beeId) return 0;
  const { count } = await supabase
    .from('forum_threads')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', beeId);
  return count ?? 0;
}

/**
 * Fetch multiple threads by ID, preserving the order of the provided IDs.
 * Used by the Saved view and anywhere else that needs specific threads.
 */
export async function listThreadsByIds(threadIds: string[]): Promise<ForumThread[]> {
  if (!supabase || threadIds.length === 0) return [];
  const { data } = await supabase
    .from('forum_threads')
    .select('*')
    .in('id', threadIds);
  if (!data) return [];

  const enriched = await enrichWithAuthors(data);
  // Preserve caller's order
  const order = new Map(threadIds.map((id, i) => [id, i]));
  return enriched.sort(
    (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
  );
}

/**
 * Get a single thread with author + atom links enriched.
 */
export async function getThread(threadId: string): Promise<ForumThread | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (!data) return null;

  const enriched = await enrichWithAuthors([data]);
  const thread = enriched[0];
  if (!thread) return null;

  const { data: links } = await supabase
    .from('entity_atom_links')
    .select('atom_id, link_type')
    .eq('source_surface', 'intel')
    .eq('source_id', threadId);
  thread.atomLinks = (links ?? []).map((l) => ({
    atomId: String(l.atom_id),
    linkType: String(l.link_type),
  }));
  return thread;
}

/** Get all posts for a thread */
export async function getPosts(threadId: string): Promise<ForumPost[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return enrichPostsWithAuthors(data ?? []);
}

// ═════════════════════════════════════════════════════════════════════
// Mutations
// ═════════════════════════════════════════════════════════════════════

export async function createThread(
  input: CreateThreadInput,
  authorBeeId: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: thread, error } = await supabase
    .from('forum_threads')
    .insert({
      title: input.title.trim(),
      body: input.body,
      created_by: authorBeeId,
      primary_realm: input.primaryRealm ?? null,
      primary_l2: input.primaryL2 ?? null,
      parent_surface: input.parentSurface ?? null,
      parent_id: input.parentId ?? null,
    })
    .select('id')
    .single();

  if (error || !thread) {
    throw new Error(error?.message ?? 'Failed to create thread');
  }

  if (input.atomIds && input.atomIds.length > 0) {
    const links = input.atomIds.map((atomId) => ({
      source_surface: 'intel',
      source_id: thread.id,
      atom_id: atomId,
      link_type: 'reference',
      created_by: authorBeeId,
    }));
    const { error: linkErr } = await supabase.from('entity_atom_links').insert(links);
    if (linkErr) {
      console.warn('Atom link insert failed (thread was created):', linkErr.message);
    }
  }

  // Category tags — additive L2+ branches for cross-discovery
  if (input.categoryPaths && input.categoryPaths.length > 0) {
    const catLinks = input.categoryPaths.map((path) => ({
      source_surface: 'intel',
      source_id: thread.id,
      category_path: path,
      created_by: authorBeeId,
    }));
    const { error: catErr } = await supabase
      .from('entity_category_links')
      .insert(catLinks);
    if (catErr) {
      console.warn('Category link insert failed (thread was created):', catErr.message);
    }
  }

  return String(thread.id);
}

export async function createPost(
  threadId: string,
  body: string,
  authorBeeId: string,
  parentPostId: string | null = null,
  atomIds: string[] = [],
  categoryPaths: string[] = [],
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // Snapshot reply_count BEFORE insert so we can detect trigger failure.
  // If the trigger fires correctly, the stored count will be +1 after insert.
  // If it silently fails (e.g., trigger not installed), we fall back to RPC.
  const { data: pre } = await supabase
    .from('forum_threads')
    .select('reply_count')
    .eq('id', threadId)
    .maybeSingle();
  const preCount = Number(pre?.reply_count ?? 0);

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      thread_id: threadId,
      bee_id: authorBeeId,
      body: body,
      parent_post_id: parentPostId,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create post');
  }

  const postId = String(data.id);

  // Link atoms to this reply (if any were provided)
  if (atomIds.length > 0) {
    const links = atomIds.map((atomId) => ({
      source_type: 'forum_post',
      source_id: postId,
      atom_id: atomId,
    }));
    await supabase.from('entity_atom_links').insert(links);
  }

  // Link categories to this reply (if any were provided)
  if (categoryPaths.length > 0) {
    const catLinks = categoryPaths.map((path) => ({
      source_surface: 'intel',
      source_id: postId,
      category_path: path,
      created_by: authorBeeId,
    }));
    await supabase.from('entity_category_links').insert(catLinks);
  }

  // Reply count increment SHOULD be handled by the on_forum_post_insert
  // trigger (see schema-v3-intel.sql + schema-v7-reply-count-fix.sql).
  // Verify by re-reading the count — if trigger silently failed, fall back
  // to the RPC. This is a safety net, not the primary mechanism.
  try {
    const { data: post } = await supabase
      .from('forum_threads')
      .select('reply_count')
      .eq('id', threadId)
      .maybeSingle();
    const postCount = Number(post?.reply_count ?? 0);
    if (postCount <= preCount) {
      // Trigger didn't fire. Fall back to RPC.
      console.warn(
        `[intel] reply_count trigger appears broken (pre=${preCount}, post=${postCount}). Falling back to RPC.`,
      );
      await supabase.rpc('increment_thread_reply_count', { p_thread_id: threadId });
    }
  } catch (verifyErr) {
    // Non-fatal: verification itself failed. Post is saved, count may drift.
    console.warn('[intel] reply_count verification failed:', verifyErr);
  }

  return postId;
}

// ═════════════════════════════════════════════════════════════════════
// Author enrichment helpers
// ═════════════════════════════════════════════════════════════════════

async function enrichWithAuthors(rows: Record<string, unknown>[]): Promise<ForumThread[]> {
  const threads = rows.map(mapThread);
  if (!supabase || threads.length === 0) return threads;

  const beeIds = Array.from(new Set(threads.map((t) => t.createdBy).filter(Boolean)));
  if (beeIds.length === 0) return threads;

  const { data: bees } = await supabase
    .from('bees')
    .select('id, handle')
    .in('id', beeIds);
  const handleMap = new Map((bees ?? []).map((b) => [String(b.id), String(b.handle)]));

  return threads.map((t) => ({
    ...t,
    authorHandle: handleMap.get(t.createdBy) ?? undefined,
  }));
}

async function enrichPostsWithAuthors(rows: Record<string, unknown>[]): Promise<ForumPost[]> {
  const posts = rows.map(mapPost);
  if (!supabase || posts.length === 0) return posts;

  const beeIds = Array.from(new Set(posts.map((p) => p.beeId).filter(Boolean)));
  if (beeIds.length === 0) return posts;

  const { data: bees } = await supabase
    .from('bees')
    .select('id, handle')
    .in('id', beeIds);
  const handleMap = new Map((bees ?? []).map((b) => [String(b.id), String(b.handle)]));

  return posts.map((p) => ({
    ...p,
    authorHandle: handleMap.get(p.beeId) ?? undefined,
  }));
}

// ═════════════════════════════════════════════════════════════════════
// Utilities
// ═════════════════════════════════════════════════════════════════════

/** Format a timestamp into a relative time string (e.g. "2h ago") */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

