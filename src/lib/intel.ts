import { supabase } from './supabase';
import type { Front, KettleState } from '@/types/manual';

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
  replyCount: number;
  lastActivityAt: string;
  isLocked: boolean;
  createdAt: string;
  // Optional Bee author info (joined)
  authorHandle?: string;
  // Optional: first N atom links (joined)
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
  realm?: string | null;
  front?: Front | null;
  l2?: string | null;
  atomId?: string | null;
  sortBy?: 'hot' | 'new' | 'top';
  limit?: number;
}

export interface CreateThreadInput {
  title: string;
  body: string;
  atomIds?: string[];
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
 * If an atomId is given, only threads with that atom linked are returned.
 */
export async function listThreads(filter: ThreadListFilter = {}): Promise<ForumThread[]> {
  if (!supabase) return [];
  const limit = filter.limit ?? 30;

  // Build base query — join with bees for handle
  // Note: Supabase doesn't support JOIN in select() shorthand cleanly, so we
  // fetch threads, then author handles in a second pass.

  // If filtering by atom, we need to join entity_atom_links first.
  if (filter.atomId) {
    const { data: links, error } = await supabase
      .from('entity_atom_links')
      .select('source_id')
      .eq('source_surface', 'intel')
      .eq('atom_id', filter.atomId);
    if (error || !links?.length) return [];
    const ids = links.map((l) => l.source_id);
    const { data: threads, error: err2 } = await supabase
      .from('forum_threads')
      .select('*')
      .in('id', ids)
      .order('last_activity_at', { ascending: false })
      .limit(limit);
    if (err2 || !threads) return [];
    return await enrichWithAuthors(threads);
  }

  // Standard list, optionally ordered
  const order =
    filter.sortBy === 'top'
      ? { col: 'reply_count', ascending: false }
      : filter.sortBy === 'new'
        ? { col: 'created_at', ascending: false }
        : { col: 'last_activity_at', ascending: false };

  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .order(order.col, { ascending: order.ascending })
    .limit(limit);
  if (error || !data) return [];
  return await enrichWithAuthors(data);
}

/**
 * Get a single thread by id, enriched with author + atom links.
 */
export async function getThread(threadId: string): Promise<ForumThread | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (error || !data) return null;
  const enriched = await enrichWithAuthors([data]);
  const thread = enriched[0];
  if (!thread) return null;

  // Fetch atom links
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

/**
 * Get all posts for a thread, ordered chronologically.
 */
export async function getPosts(threadId: string): Promise<ForumPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return await enrichPostsWithAuthors(data);
}

// ═════════════════════════════════════════════════════════════════════
// Mutations
// ═════════════════════════════════════════════════════════════════════

/**
 * Create a new forum thread.
 * Returns the new thread's id on success, throws on failure.
 */
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
      parent_surface: input.parentSurface ?? null,
      parent_id: input.parentId ?? null,
    })
    .select('id')
    .single();

  if (error || !thread) {
    throw new Error(error?.message ?? 'Failed to create thread');
  }

  // Attach atom links (if any)
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

  return String(thread.id);
}

/**
 * Reply to a thread (or to another post for nested replies).
 */
export async function createPost(
  threadId: string,
  body: string,
  authorBeeId: string,
  parentPostId: string | null = null,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

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

  // Bump thread reply_count + last_activity_at
  // (Best-effort — if this fails the post still exists)
  try {
    await supabase.rpc('increment_thread_reply_count', { p_thread_id: threadId });
  } catch {
    // Non-fatal; future migration will ensure this RPC exists
  }

  return String(data.id);
}

// ═════════════════════════════════════════════════════════════════════
// Author enrichment helpers
// ═════════════════════════════════════════════════════════════════════

async function enrichWithAuthors(
  rows: Record<string, unknown>[],
): Promise<ForumThread[]> {
  const threads = rows.map(mapThread);
  if (!supabase) return threads;

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

async function enrichPostsWithAuthors(
  rows: Record<string, unknown>[],
): Promise<ForumPost[]> {
  const posts = rows.map(mapPost);
  if (!supabase) return posts;

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

/** Unused import guard — keeps Front/Kettle types in scope for future enrichment */
export type _ForceImports = Front | KettleState;
