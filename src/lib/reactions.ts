import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════
// REACTIONS — 5 locked types (🍯 🔥 🤔 ⚠️ ✓)
// ═══════════════════════════════════════════════════════════════════

export const REACTION_TYPES = ['honey', 'fire', 'thinking', 'warning', 'check'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_LABELS: Record<ReactionType, string> = {
  honey: '🍯',
  fire: '🔥',
  thinking: '🤔',
  warning: '⚠️',
  check: '✓',
};

export const REACTION_NAMES: Record<ReactionType, string> = {
  honey: 'Honey',
  fire: 'Fire',
  thinking: 'Thinking',
  warning: 'Warning',
  check: 'Check',
};

export const REACTION_HINTS: Record<ReactionType, string> = {
  honey: 'Appreciate this',
  fire: 'Hot take — agree',
  thinking: 'Questioning this',
  warning: 'Flag as suspect',
  check: 'Verified / correct',
};

export interface ReactionSummary {
  counts: Record<ReactionType, number>;
  myReactions: Set<ReactionType>;
}

/**
 * Load reaction counts + the current Bee's reactions for a source (thread or post).
 */
export async function getReactions(
  sourceId: string,
  beeId: string | null,
): Promise<ReactionSummary> {
  const empty: ReactionSummary = {
    counts: { honey: 0, fire: 0, thinking: 0, warning: 0, check: 0 },
    myReactions: new Set(),
  };

  if (!supabase) return empty;

  const { data, error } = await supabase
    .from('entity_reactions')
    .select('reaction, bee_id')
    .eq('source_id', sourceId);

  if (error || !data) return empty;

  for (const row of data) {
    const r = row.reaction as ReactionType;
    if (REACTION_TYPES.includes(r)) {
      empty.counts[r] += 1;
      if (beeId && row.bee_id === beeId) {
        empty.myReactions.add(r);
      }
    }
  }

  return empty;
}

/**
 * Batch-load reaction summaries for multiple sources (for thread list cards).
 */
export async function getReactionsBatch(
  sourceIds: string[],
  beeId: string | null,
): Promise<Map<string, ReactionSummary>> {
  const result = new Map<string, ReactionSummary>();
  for (const id of sourceIds) {
    result.set(id, {
      counts: { honey: 0, fire: 0, thinking: 0, warning: 0, check: 0 },
      myReactions: new Set(),
    });
  }

  if (!supabase || sourceIds.length === 0) return result;

  const { data, error } = await supabase
    .from('entity_reactions')
    .select('source_id, reaction, bee_id')
    .in('source_id', sourceIds);

  if (error || !data) return result;

  for (const row of data) {
    const id = String(row.source_id);
    const r = row.reaction as ReactionType;
    const s = result.get(id);
    if (s && REACTION_TYPES.includes(r)) {
      s.counts[r] += 1;
      if (beeId && row.bee_id === beeId) {
        s.myReactions.add(r);
      }
    }
  }

  return result;
}

/**
 * Toggle a reaction: if the Bee already reacted with this type, remove it.
 * Otherwise add it.
 */
export async function toggleReaction(
  sourceSurface: string,
  sourceId: string,
  sourceKind: 'thread' | 'post',
  reaction: ReactionType,
  beeId: string,
): Promise<'added' | 'removed'> {
  if (!supabase) throw new Error('Supabase not configured');

  // Check existing
  const { data: existing } = await supabase
    .from('entity_reactions')
    .select('id')
    .eq('source_id', sourceId)
    .eq('reaction', reaction)
    .eq('bee_id', beeId)
    .maybeSingle();

  if (existing?.id) {
    // Remove
    const { error } = await supabase
      .from('entity_reactions')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return 'removed';
  }

  // Add
  const { error } = await supabase.from('entity_reactions').insert({
    source_surface: sourceSurface,
    source_id: sourceId,
    source_kind: sourceKind,
    reaction,
    bee_id: beeId,
  });
  if (error) throw new Error(error.message);
  return 'added';
}

// ═══════════════════════════════════════════════════════════════════
// SAVES — Bee bookmarks (threads only for now)
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if the current Bee has saved this thread.
 */
export async function isSaved(sourceId: string, beeId: string | null): Promise<boolean> {
  if (!supabase || !beeId) return false;
  const { data } = await supabase
    .from('entity_saves')
    .select('id')
    .eq('source_id', sourceId)
    .eq('bee_id', beeId)
    .maybeSingle();
  return Boolean(data?.id);
}

/**
 * Batch-check saves for multiple threads.
 */
export async function isSavedBatch(
  sourceIds: string[],
  beeId: string | null,
): Promise<Set<string>> {
  const saved = new Set<string>();
  if (!supabase || !beeId || sourceIds.length === 0) return saved;

  const { data } = await supabase
    .from('entity_saves')
    .select('source_id')
    .eq('bee_id', beeId)
    .in('source_id', sourceIds);

  if (data) {
    for (const row of data) saved.add(String(row.source_id));
  }
  return saved;
}

export async function toggleSave(
  sourceSurface: string,
  sourceId: string,
  beeId: string,
): Promise<'saved' | 'unsaved'> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: existing } = await supabase
    .from('entity_saves')
    .select('id')
    .eq('source_id', sourceId)
    .eq('bee_id', beeId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('entity_saves')
      .delete()
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return 'unsaved';
  }

  const { error } = await supabase.from('entity_saves').insert({
    source_surface: sourceSurface,
    source_id: sourceId,
    bee_id: beeId,
  });
  if (error) throw new Error(error.message);
  return 'saved';
}

/**
 * List of thread source_ids the Bee has saved, newest first.
 */
export async function listSavedThreadIds(beeId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('entity_saves')
    .select('source_id, created_at')
    .eq('bee_id', beeId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((r) => String(r.source_id));
}

/**
 * Count of threads the Bee has saved. Used for sidebar badge.
 * Uses head+count for efficiency — no row payload transferred.
 */
export async function countSavedThreads(beeId: string): Promise<number> {
  if (!supabase || !beeId) return 0;
  const { count } = await supabase
    .from('entity_saves')
    .select('*', { count: 'exact', head: true })
    .eq('bee_id', beeId);
  return count ?? 0;
}

// ═══════════════════════════════════════════════════════════════════
// SHARES — Generate shareable URL with attribution token
// (Per Universal Post Architecture: Fibonacci weights applied at resolution)
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a share record and return the shareable URL.
 * Token is short random string appended to the URL as ?a=<token>.
 * Future: affiliate payout resolves based on token → shared_by → fibonacci chain.
 */
export async function createShareLink(
  sourceSurface: string,
  sourceId: string,
  beeId: string,
  baseUrl: string,
): Promise<string> {
  if (!supabase) {
    // Fallback: return URL without tracking if Supabase unavailable
    return baseUrl;
  }

  const token = generateToken(8);

  const { error } = await supabase.from('entity_shares').insert({
    source_surface: sourceSurface,
    source_id: sourceId,
    shared_by: beeId,
    share_token: token,
  });

  if (error) {
    console.warn('Share tracking insert failed, returning untracked URL:', error.message);
    return baseUrl;
  }

  // Append token as ?a=<token>
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}a=${token}`;
}

function generateToken(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
