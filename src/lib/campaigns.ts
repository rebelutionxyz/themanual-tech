import { supabase } from './supabase';

// ═════════════════════════════════════════════════════════════════════
// Campaigns (GiVE / Crowdfunding). Backend: campaigns table + campaigns_search
// RPC (SECURITY INVOKER, RLS-scoped). Language firewall: everything is a
// DONATION — campaigns are FUNDED toward a GOAL; never "buy"/"price"/"invest".
// ═════════════════════════════════════════════════════════════════════

export type CampaignStatus = 'active' | 'funded' | 'any';
export type CampaignSort = 'recent' | 'ending' | 'most_funded';

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  fundingModel: string | null;
  goalCents: number;
  raisedCents: number;
  currency: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

function mapCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    excerpt: (row.excerpt as string) ?? (row.description as string) ?? null,
    status: String(row.status ?? 'active'),
    fundingModel: (row.funding_model as string) ?? null,
    goalCents: Number(row.goal_cents ?? 0),
    raisedCents: Number(row.raised_cents ?? 0),
    currency: String(row.currency ?? 'BLiNG'),
    locationText: (row.location_text as string) ?? null,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    startsAt: (row.starts_at as string) ?? null,
    endsAt: (row.ends_at as string) ?? null,
    createdAt: String(row.created_at ?? ''),
  };
}

/** Progress toward goal, 0–1 (0 when no goal set). */
export function fundedFraction(c: Campaign): number {
  if (c.goalCents <= 0) return 0;
  return Math.min(1, c.raisedCents / c.goalCents);
}

/**
 * Discovery feed via the campaigns_search RPC. Powers the GiVE center feed and
 * the right-rail GiVE card. Default = active campaigns, newest first.
 */
export async function campaignsSearch(
  status: CampaignStatus = 'active',
  sort: CampaignSort = 'recent',
  limit = 30,
): Promise<Campaign[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('campaigns_search', {
    p_status: status,
    p_sort: sort,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaign);
}

/**
 * Direct give_campaigns list with an optional realm-strip filter (give_campaigns
 * carries realm_path). RLS-scoped at the table. Used by the GiVE discover feed so
 * the realm lens narrows campaigns; the rail card keeps using campaignsSearch.
 */
export async function listCampaigns(
  status: CampaignStatus = 'active',
  sort: CampaignSort = 'recent',
  realmPath: string[] = [],
): Promise<Campaign[]> {
  if (!supabase) return [];
  let q = supabase.from('give_campaigns').select('*');
  if (status !== 'any') q = q.eq('status', status);
  if (realmPath.length > 0) q = q.contains('realm_path', realmPath);
  const order =
    sort === 'ending'
      ? { col: 'ends_at', ascending: true }
      : sort === 'most_funded'
        ? { col: 'raised_cents', ascending: false }
        : { col: 'created_at', ascending: false };
  const { data, error } = await q.order(order.col, { ascending: order.ascending });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaign);
}
