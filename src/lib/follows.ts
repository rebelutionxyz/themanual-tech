import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// FOLLOWS — Bee → Bee follow graph (bee_follows_v1).
//
// Mutations go through the SECDEF RPCs (bee_follow / bee_unfollow); reads
// hit the table directly — RLS limits rows to edges the signed-in Bee is
// on, so "my follows" needs no explicit filter (kept anyway for clarity).
// Powers the INTEL Following feed + follow buttons.
// ═════════════════════════════════════════════════════════════════════

export async function followBee(beeId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('bee_follow', { p_followed: beeId });
  if (error) throw new Error(error.message);
}

export async function unfollowBee(beeId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('bee_unfollow', { p_followed: beeId });
  if (error) throw new Error(error.message);
}

/** Is the signed-in Bee following this Bee? */
export async function isFollowingBee(myBeeId: string | null, beeId: string): Promise<boolean> {
  if (!supabase || !myBeeId || myBeeId === beeId) return false;
  const { data } = await supabase
    .from('bee_follows')
    .select('followed_bee_id')
    .eq('follower_bee_id', myBeeId)
    .eq('followed_bee_id', beeId)
    .maybeSingle();
  return Boolean(data);
}

/** All Bee ids the signed-in Bee follows (Following feed source). */
export async function listFollowedBeeIds(myBeeId: string): Promise<string[]> {
  if (!supabase || !myBeeId) return [];
  const { data } = await supabase
    .from('bee_follows')
    .select('followed_bee_id')
    .eq('follower_bee_id', myBeeId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r) => String(r.followed_bee_id));
}

/** Count of Bees the signed-in Bee follows (sidebar badge / empty states). */
export async function countFollowedBees(myBeeId: string): Promise<number> {
  if (!supabase || !myBeeId) return 0;
  const { count } = await supabase
    .from('bee_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_bee_id', myBeeId);
  return count ?? 0;
}
