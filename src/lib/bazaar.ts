import { supabase } from './supabase';

/**
 * BAZAAR data layer — typed wrappers + camelCase mappers over the public-schema
 * bazaar_* RPCs. Mirrors src/lib/pulse.ts: plain async functions, supabase.rpc,
 * map snake_case → camelCase. Reads (browse/search/get) need no auth; the my_*
 * reads and the writes read auth.uid() server-side. Copy rule: BLiNG! / Perks,
 * "OFFER" never "sell".
 */

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface BazaarSeller {
  offeredBy: string;
  handle: string;
  name: string;
  avatar: string | null;
}

export interface BazaarListing {
  id: string;
  title: string;
  description: string | null;
  listingType: string;
  category: string | null;
  condition: string | null;
  status: string;
  priceBling: number | null;
  priceCents: number | null;
  acceptsBling: boolean;
  acceptsFiat: boolean;
  blingSplitRatio: number | null;
  blingSplitMax: number | null;
  quantity: number;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  seller: BazaarSeller;
}

export type BazaarSort = 'recent' | 'price_low' | 'price_high';

export interface BazaarBrowseFilters {
  category?: string | null;
  listingType?: string | null;
  condition?: string | null;
  sort?: BazaarSort;
  limit?: number;
  offset?: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

function mapListing(r: Row): BazaarListing {
  return {
    id: str(r.id),
    title: str(r.title),
    description: strOrNull(r.description),
    listingType: str(r.listing_type),
    category: strOrNull(r.category),
    condition: strOrNull(r.condition),
    status: str(r.status),
    priceBling: numOrNull(r.price_bling),
    priceCents: numOrNull(r.price_cents),
    acceptsBling: r.accepts_bling === true,
    acceptsFiat: r.accepts_fiat === true,
    blingSplitRatio: numOrNull(r.bling_split_ratio),
    blingSplitMax: numOrNull(r.bling_split_max),
    quantity: Number(r.quantity ?? 0),
    imageUrls: Array.isArray(r.image_urls) ? r.image_urls.map(String) : [],
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    seller: {
      offeredBy: str(r.offered_by),
      handle: str(r.seller_handle),
      name: str(r.seller_name),
      avatar: strOrNull(r.seller_avatar),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

/** Active, in-stock listings, filtered + sorted. */
export async function bazaarBrowse(f: BazaarBrowseFilters = {}): Promise<BazaarListing[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('bazaar_browse', {
    p_category: f.category ?? null,
    p_listing_type: f.listingType ?? null,
    p_condition: f.condition ?? null,
    p_sort: f.sort ?? 'recent',
    p_limit: f.limit ?? 30,
    p_offset: f.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapListing);
}

/** Astra-local search across listings (≥2 chars). */
export async function bazaarSearch(query: string, limit = 30, offset = 0): Promise<BazaarListing[]> {
  const q = query.trim();
  if (!supabase || q.length < 2) return [];
  const { data, error } = await supabase.rpc('bazaar_search', {
    p_query: q,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapListing);
}

export interface BazaarCategory {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  bucket: string;
  department: string;
  path: string;
  isLeaf: boolean;
}

/** Spine-backed category taxonomy, pre-sorted (bucket → department → depth → name). */
export async function bazaarCategories(): Promise<BazaarCategory[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('bazaar_categories_list');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((r) => ({
    id: str(r.id),
    name: str(r.name),
    depth: Number(r.depth),
    parentId: strOrNull(r.parent_id),
    bucket: str(r.bucket),
    department: str(r.department),
    path: str(r.path),
    isLeaf: r.is_leaf === true,
  }));
}

/** Single listing by id (any status). null when not found. */
export async function bazaarListingGet(id: string): Promise<BazaarListing | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('bazaar_listing_get', { p_listing_id: id });
  if (error) throw new Error(error.message);
  const rows = (data as Row[]) ?? [];
  return rows.length ? mapListing(rows[0]) : null;
}

export interface BazaarPurchaseResult {
  ok: boolean;
  orderId: string;
  listingId: string;
  blingPaid: number;
  buyerBalanceAfter: number;
  sellerBalanceAfter: number;
  listingStatus: string;
  quantityRemaining: number;
}

/** GET one unit with BLiNG!. Raises (surfaced verbatim): cannot buy your own
    listing, insufficient balance (X < Y), etc. */
export async function bazaarPurchaseBling(listingId: string): Promise<BazaarPurchaseResult> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('bazaar_purchase_bling', { p_listing_id: listingId });
  if (error) throw new Error(error.message);
  const r = (data as Row | null) ?? {};
  return {
    ok: r.ok === true,
    orderId: str(r.order_id),
    listingId: str(r.listing_id),
    blingPaid: Number(r.bling_paid ?? 0),
    buyerBalanceAfter: Number(r.buyer_balance_after ?? 0),
    sellerBalanceAfter: Number(r.seller_balance_after ?? 0),
    listingStatus: str(r.listing_status),
    quantityRemaining: Number(r.quantity_remaining ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────

/** BLiNG! amount → compact string (drops trailing zeros). */
export function formatBling(n: number | null): string {
  if (n == null) return '0';
  return n % 1 === 0
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Fiat cents → "$X.XX". */
export function formatFiat(cents: number | null): string {
  if (cents == null) return '';
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
