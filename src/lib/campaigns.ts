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
  description: string | null;
  createdBy: string;
  coverUrl: string | null;
  parentId: string | null;
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
    description: (row.description as string) ?? null,
    createdBy: String(row.created_by ?? ''),
    coverUrl: (row.cover_url as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
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

// ───────────────────── Detail + creator rail (GIVE pass) ─────────────────────

/** "$320" for usd cents; "320 BLiNG" style otherwise. */
export function formatMoney(cents: number, currency: string): string {
  if (currency.toLowerCase() === 'usd') {
    const dollars = cents / 100;
    return `$${dollars.toLocaleString(undefined, {
      maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    })}`;
  }
  return `${Math.round(cents / 100).toLocaleString()} ${currency.toUpperCase()}`;
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('give_campaigns')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  return data ? mapCampaign(data) : null;
}

/** Campaigns the Bee manages (any status), newest first — the Mine view. */
export async function listMyCampaigns(beeId: string): Promise<Campaign[]> {
  if (!supabase || !beeId) return [];
  const { data, error } = await supabase
    .from('give_campaigns')
    .select('*')
    .eq('created_by', beeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaign);
}

export interface CreateCampaignInput {
  title: string;
  slug: string;
  description?: string;
  endsAt?: string | null;
  locationText?: string | null;
}

/**
 * Create an AWARENESS-MODE campaign (funding_model null — the RPC requires a
 * Stripe Connect account for funded campaigns; funding attaches later via
 * give_campaign_set_funding once the fiat rail lands). Returns the slug.
 */
export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('give_campaign_create', {
    p_title: input.title,
    p_slug: input.slug,
    p_description: input.description ?? null,
    p_funding_model: null, // awareness mode — see note above
    p_goal_cents: null,
    p_currency: 'usd',
    p_manager_connect_account: null,
    p_starts_at: null,
    p_ends_at: input.endsAt ?? null,
    p_parent_id: null,
    p_realm_path: null,
    p_lat: null,
    p_lng: null,
    p_location_text: input.locationText ?? null,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { slug?: string };
  return String(r.slug ?? input.slug);
}

/** Creator-only; the RPC refuses once pledges exist (settlement flow instead). */
export async function cancelCampaign(campaignId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('give_campaign_cancel', { p_campaign_id: campaignId });
  if (error) throw new Error(error.message);
}

/**
 * Upload a campaign cover to the group-media bucket
 * (campaigns/{id}/profile/… — campaign_media_insert policy), then pin it
 * via the creator-only give_campaign_set_cover RPC. Returns the public URL.
 */
export async function uploadCampaignCover(campaignId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `campaigns/${campaignId}/profile/cover-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('group-media')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  const url = supabase.storage.from('group-media').getPublicUrl(path).data.publicUrl;
  const { error: rpcErr } = await supabase.rpc('give_campaign_set_cover', {
    p_campaign_id: campaignId,
    p_cover_url: url,
  });
  if (rpcErr) throw new Error(rpcErr.message);
  return url;
}

// ───────────────────── Discussion (forum reuse, surface 'give') ─────────────────────

export interface CampaignThread {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  lastActivityAt: string;
  authorHandle: string | null;
}

export async function listCampaignThreads(campaignId: string): Promise<CampaignThread[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('parent_id', campaignId)
    .order('last_activity_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => String(r.created_by)).filter(Boolean)));
  const handle = new Map<string, string>();
  if (ids.length > 0) {
    const { data: bees } = await supabase.from('bees').select('id, handle').in('id', ids);
    for (const b of bees ?? []) handle.set(String(b.id), String(b.handle));
  }
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    body: String(r.body ?? ''),
    replyCount: Number(r.reply_count ?? 0),
    lastActivityAt: String(r.last_activity_at ?? ''),
    authorHandle: handle.get(String(r.created_by)) ?? null,
  }));
}

export async function createCampaignThread(
  campaignId: string,
  title: string,
  body: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('forum_create_thread', {
    p_title: title,
    p_body: body,
    // Campaign discussion scopes under the GIVE surface.
    p_parent_surface: 'give',
    p_parent_id: campaignId,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { thread_id?: string; id?: string };
  return String(r.thread_id ?? r.id ?? '');
}
