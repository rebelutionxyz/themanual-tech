import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// PREMIUM — membership ladder (fiat rail F6).
//
// Canon §6 UNLOCKED (Butch 2026-07-18): the ad-relief framing in
// shared/canon/atlasads-advertising-2026-06-07.md predates the
// FreedomBlings v9 renovation and no longer applies as written. Premium
// is being re-based on storage + services (addon allowances at tiers);
// Premium + the small GIVE fee are the intended primary Bee-side charges.
// The ladder below stands as PLACEHOLDER pricing until the rework lands.
// Status reads from `subscriptions` (RLS: owner). Checkout goes live with
// Stripe activation (venue rail shipped first; membership products next).
// ═════════════════════════════════════════════════════════════════════

export interface MembershipTier {
  key: string;
  /** Monthly DONATION in USD. */
  usd: number;
  name: string;
  line: string;
  detail: string;
}

/** The locked ad-relief ladder (§6). Order = ascending relief. */
export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    key: 'free',
    usd: 0,
    name: 'Free',
    line: 'Full slot set',
    detail:
      'Every commercial slot runs — labeled "Sponsored," tasteful, no dark patterns. You fund the house by seeing ads.',
  },
  {
    key: 'reduced',
    usd: 3,
    name: 'Reduced',
    line: 'Lighter ad load',
    detail: 'Commercial advertising dialed down across every surface you browse.',
  },
  {
    key: 'minimal',
    usd: 8,
    name: 'Minimal',
    line: 'Ticker only',
    detail: 'Commercial ads retreat to the top ticker. Everything else is yours.',
  },
  {
    key: 'royal_jelly',
    usd: 13,
    name: 'Royal Jelly',
    line: 'Commercial-ad-free',
    detail: 'Zero commercial advertising, everywhere, on every Astra. The full comb, uninterrupted.',
  },
];

export interface MyMembership {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
}

/** Current membership subscription for the signed-in Bee (null = free tier). */
export async function getMyMembership(beeId: string): Promise<MyMembership | null> {
  if (!supabase || !beeId) return null;
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('bee_id', beeId)
    .eq('product_type', 'membership')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    tier: String(data.tier ?? ''),
    status: String(data.status ?? ''),
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
  };
}
