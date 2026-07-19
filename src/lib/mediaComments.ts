import { supabase } from '@/lib/supabase';

// ═════════════════════════════════════════════════════════════════════
// MEDIA DISCUSSIONS (media_comments_v1) — flat comment threads on media
// surfaces. One spine, three targets:
//   'asset'       → Library asset uuid (Showcase items, drawer)
//   'collection'  → shelf uuid (debate a whole Album)
//   'group_image' → group-media storage path (UNITE album lightbox)
// Writes via SECDEF RPCs; reads hide removed rows via RLS.
// ═════════════════════════════════════════════════════════════════════

export type MediaCommentTarget = 'asset' | 'collection' | 'group_image';

export interface MediaComment {
  id: string;
  beeId: string;
  handle: string;
  body: string;
  createdAt: string;
}

interface CommentRow {
  id: string;
  bee_id: string;
  body: string;
  created_at: string;
  bees: { handle: string } | { handle: string }[] | null;
}

function handleOf(b: CommentRow['bees']): string {
  if (!b) return 'bee';
  return Array.isArray(b) ? (b[0]?.handle ?? 'bee') : b.handle;
}

export async function listMediaComments(
  targetKind: MediaCommentTarget,
  targetRef: string,
): Promise<MediaComment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('media_comments')
    .select('id, bee_id, body, created_at, bees(handle)')
    .eq('target_kind', targetKind)
    .eq('target_ref', targetRef)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CommentRow[]).map((r) => ({
    id: r.id,
    beeId: r.bee_id,
    handle: handleOf(r.bees),
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function postMediaComment(
  targetKind: MediaCommentTarget,
  targetRef: string,
  body: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('media_comment_post', {
    p_target_kind: targetKind,
    p_target_ref: targetRef,
    p_body: body,
  });
  if (error) throw new Error(error.message);
}

export async function removeMediaComment(commentId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('media_comment_remove', { p_comment_id: commentId });
  if (error) throw new Error(error.message);
}
