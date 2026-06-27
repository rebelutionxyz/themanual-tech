import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// Forum moderation helpers (work order §3 Reports queue + §8 mod actions)
// All gated server-side by is_forum_moderator / RLS; these are thin wrappers.
// ═════════════════════════════════════════════════════════════════════

export interface ForumFlag {
  id: number;
  /** Target kind, derived from which id column is populated. */
  targetKind: 'thread' | 'post';
  threadId: string | null;
  postId: string | null;
  /** Thread to deep-link to (for a post flag, the post's parent thread). */
  linkThreadId: string | null;
  threadTitle: string | null;
  flaggedBy: string;
  flaggedByHandle: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

/** UI gate — true if this Bee can see/act on moderation surfaces. */
export async function isForumModerator(beeId: string | null | undefined): Promise<boolean> {
  if (!supabase || !beeId) return false;
  const { data, error } = await supabase.rpc('is_forum_moderator', { p_bee: beeId });
  if (error) return false;
  return Boolean(data);
}

/** Open flags for the Reports queue, newest-pending first, enriched for display. */
export async function listOpenFlags(): Promise<ForumFlag[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('forum_flags')
    .select('id, thread_id, post_id, flagged_by, reason, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Resolve each post flag to its parent thread for deep-linking.
  const postIds = Array.from(
    new Set(rows.map((r) => r.post_id).filter((v): v is string => Boolean(v))),
  );
  const postThread = new Map<string, string>();
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('forum_posts')
      .select('id, thread_id')
      .in('id', postIds);
    for (const p of posts ?? []) postThread.set(String(p.id), String(p.thread_id));
  }

  // Thread titles for the linked threads (direct + via post).
  const threadIds = Array.from(
    new Set(
      rows
        .map((r) => r.thread_id ?? (r.post_id ? postThread.get(String(r.post_id)) : null))
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const threadTitle = new Map<string, string>();
  if (threadIds.length > 0) {
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, title')
      .in('id', threadIds);
    for (const t of threads ?? []) threadTitle.set(String(t.id), String(t.title));
  }

  // Reporter handles.
  const beeIds = Array.from(new Set(rows.map((r) => String(r.flagged_by)).filter(Boolean)));
  const handle = new Map<string, string>();
  if (beeIds.length > 0) {
    const { data: bees } = await supabase.from('bees').select('id, handle').in('id', beeIds);
    for (const b of bees ?? []) handle.set(String(b.id), String(b.handle));
  }

  return rows.map((r) => {
    const targetKind: 'thread' | 'post' = r.post_id ? 'post' : 'thread';
    const linkThreadId =
      r.thread_id ?? (r.post_id ? postThread.get(String(r.post_id)) ?? null : null);
    return {
      id: Number(r.id),
      targetKind,
      threadId: r.thread_id ? String(r.thread_id) : null,
      postId: r.post_id ? String(r.post_id) : null,
      linkThreadId,
      threadTitle: linkThreadId ? threadTitle.get(linkThreadId) ?? null : null,
      flaggedBy: String(r.flagged_by),
      flaggedByHandle: handle.get(String(r.flagged_by)) ?? null,
      reason: String(r.reason),
      status: String(r.status),
      createdAt: String(r.created_at),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Personal "Reported" surface (pass 13) — two directions, both auth-scoped
// to the current Bee by the RPCs (no params beyond paging).
//   • forum_reports_by_me   — flags this Bee FILED (outgoing)
//   • forum_reports_on_mine — flags on content this Bee AUTHORED (incoming);
//     the reporter is NOT returned, by design (no retaliation surface).
// thread_id is always the navigation target (a flagged post → its thread).
// ─────────────────────────────────────────────────────────────────────

export interface ReportRow {
  flagId: number;
  targetKind: 'thread' | 'post';
  threadId: string | null;
  postId: string | null;
  threadTitle: string | null;
  snippet: string;
  reason: string;
  status: string;
  createdAt: string;
}

function mapReport(row: Record<string, unknown>): ReportRow {
  return {
    flagId: Number(row.flag_id),
    targetKind: (row.target_kind as 'thread' | 'post') ?? 'thread',
    threadId: row.thread_id ? String(row.thread_id) : null,
    postId: row.post_id ? String(row.post_id) : null,
    threadTitle: (row.thread_title as string | null) ?? null,
    snippet: String(row.snippet ?? ''),
    reason: String(row.reason ?? ''),
    status: String(row.status ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

/** Flags the current Bee filed (outgoing). */
export async function forumReportsByMe(limit = 30, offset = 0): Promise<ReportRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('forum_reports_by_me', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapReport);
}

/** Flags on content the current Bee authored (incoming; reporter anonymized). */
export async function forumReportsOnMine(limit = 30, offset = 0): Promise<ReportRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('forum_reports_on_mine', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapReport);
}

export type FlagResolution = 'reviewed' | 'dismissed' | 'actioned';

/** Resolve a flag (mod only — enforced by the RPC). */
export async function resolveFlag(flagId: number, status: FlagResolution): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('forum_flag_resolve', {
    p_flag_id: flagId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}
