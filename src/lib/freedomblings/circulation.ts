import { useAuth } from '@/lib/auth';
import { type OGGeneration, getOGGeneration } from '@/lib/og-generation';
/* ============================================================================
   FreedomBLiNGS — Circulation / the melt (Slice #5) · DISPLAY ONLY.
   ----------------------------------------------------------------------------
   How idle BLiNG! gently melts back to the well and is FREE'd again. NOTHING
   about demurrage exists in the DB (no tables / fns / columns), so this is a
   canon explainer, lightly personalized by the viewer's OG status.

   THE MELT IS FLAT (canon, decided Jun 16 — supersedes the old 8/5/3/1 tiers):
     · a single FLAT 3% for EVERY Bee — no Gradation tiers, no paying your way
       down to a lower rate (this closes the whale-hole)
     · OG Founder Bees rest at 2.5% — a −0.5% loyalty edge for being early, not
       for holding more
   Both rates are frontend canon constants (Patchboard-tunable later), NOT a DB
   read. OG status comes from og-generation.ts (date math on bees.created_at).
   No melt has ever run — there is NO "returned this season" figure; we display
   the MODEL, never imply a deduction has happened.
   ============================================================================ */

// Canon rate constants (Patchboard-tunable later; no DB table exists yet).
export const FLAT_RATE = '3';
export const OG_RATE = '2.5';

export interface CirculationState {
  status: 'loading' | 'live';
  signedIn: boolean;
  isOG: boolean;
  generation: OGGeneration | null;
  rate: string; // the viewer's effective rate ('3' | '2.5')
  flatRate: string; // '3' — everyone
  ogRate: string; // '2.5' — OG Founders
}

/** Light, synchronous hook — derives the viewer's rate from auth context.
    No DB read (flat means no Gradation/subscription lookup). */
export function useCirculation(): CirculationState {
  const { user, bee, loading } = useAuth();

  if (loading) {
    return {
      status: 'loading',
      signedIn: false,
      isOG: false,
      generation: null,
      rate: FLAT_RATE,
      flatRate: FLAT_RATE,
      ogRate: OG_RATE,
    };
  }

  let generation: OGGeneration | null = null;
  let isOG = false;
  if (bee?.createdAt) {
    generation = getOGGeneration(bee.createdAt);
    isOG = generation === 'OG';
  }

  return {
    status: 'live',
    signedIn: Boolean(user),
    isOG,
    generation,
    rate: isOG ? OG_RATE : FLAT_RATE,
    flatRate: FLAT_RATE,
    ogRate: OG_RATE,
  };
}
