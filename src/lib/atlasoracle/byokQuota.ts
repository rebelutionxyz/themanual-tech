// Free-band directive quota — COMPOSER v1.2 "TWO DOORS" mechanic (H24_BYOK1).
//
// COMPOSER v1.2 (owner ruling 2026-08-23): "free users get N directives on the
// house (N = owner-set quota, TBD — make it config, not a hardcode). At quota
// the composer offers TWO doors, never a wall: (1) GET h24 tokens (managed
// lane) and (2) ADD YOUR PROVIDER API KEY. Before quota, free stays CLEAN —
// no upsell nag." This is the ONE place N lives — change it here, nothing else.
//
// COUNTING WINDOW: v1.2 explicitly leaves the reset cadence open ("Quota N +
// reset cadence = owner call at ratify time"). Counting ALL-TIME free
// directives is the conservative reading until that ruling lands — resetting
// on a cadence nobody has ratified would make the two doors appear and then
// vanish again on a made-up schedule, which is worse than never resetting.

import { supabase } from '@/lib/supabase';
import { isMocked } from './client';

export const FREE_DIRECTIVE_QUOTA = 20;

// Demo stays in the "before quota" state so the clean composer is what a
// fresh mock session shows, matching the ruling's default posture.
const MOCK_FREE_DIRECTIVE_COUNT = 0;

/**
 * All-time count of this Bee's free-tier directives. null means "could not be
 * read" (signed out, or a transient failure) — NOT zero, so callers must not
 * treat null as "under quota" without checking explicitly.
 */
export async function countFreeDirectives(): Promise<number | null> {
  if (isMocked()) return MOCK_FREE_DIRECTIVE_COUNT;
  if (!supabase) return null;

  const { count, error } = await supabase
    .from('h24_directives')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'free');

  if (error) return null;
  return count ?? 0;
}
