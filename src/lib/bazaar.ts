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
export async function bazaarSearch(
  query: string,
  limit = 30,
  offset = 0,
): Promise<BazaarListing[]> {
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

export interface BazaarCreateInput {
  title: string;
  description?: string | null;
  category: string;
  condition: string;
  priceBling: number;
  quantity: number;
  imageUrls?: string[];
}

/** Create an OFFER (BLiNG!-only; fiat/split left to server defaults). Returns the
    new listing id. Raises (surfaced verbatim): "title must be 2..200 characters",
    "invalid category", etc. */
export async function bazaarCreateListing(input: BazaarCreateInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.rpc('bazaar_create_listing', {
    p_title: input.title,
    p_description: input.description ?? null,
    p_listing_type: 'offer',
    p_category: input.category,
    p_condition: input.condition,
    p_price_bling: input.priceBling,
    p_accepts_bling: true,
    p_accepts_fiat: false,
    p_quantity: input.quantity,
    p_image_urls: input.imageUrls?.length ? input.imageUrls : null,
  });
  if (error) throw new Error(error.message);
  return String(data);
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
// Orders & sales
// ─────────────────────────────────────────────────────────────────────────

interface BazaarOrderBase {
  orderId: string;
  listingId: string;
  status: string;
  currency: string;
  blingPaid: number;
  createdAt: string;
  shippedAt: string | null;
  fulfilledAt: string | null;
  listingTitle: string;
  listingImage: string | null;
}

/** A purchase the caller made (buyer = caller). */
export interface BazaarOrder extends BazaarOrderBase {
  sellerBee: string;
  sellerHandle: string;
  sellerName: string;
  sellerAvatar: string | null;
}

/** A sale the caller made (seller = caller). */
export interface BazaarSale extends BazaarOrderBase {
  buyerBee: string;
  buyerHandle: string;
  buyerName: string;
  buyerAvatar: string | null;
}

function mapOrderBase(r: Row): BazaarOrderBase {
  return {
    orderId: str(r.order_id),
    listingId: str(r.listing_id),
    status: str(r.status),
    currency: str(r.currency),
    blingPaid: Number(r.bling_paid ?? 0),
    createdAt: str(r.created_at),
    shippedAt: strOrNull(r.shipped_at),
    fulfilledAt: strOrNull(r.fulfilled_at),
    listingTitle: str(r.listing_title),
    listingImage: strOrNull(r.listing_image),
  };
}

/** The caller's purchases (buyer). */
export async function bazaarMyOrders(): Promise<BazaarOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('bazaar_my_orders');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((r) => ({
    ...mapOrderBase(r),
    sellerBee: str(r.seller_bee),
    sellerHandle: str(r.seller_handle),
    sellerName: str(r.seller_name),
    sellerAvatar: strOrNull(r.seller_avatar),
  }));
}

/** The caller's sales (seller). */
export async function bazaarMySales(): Promise<BazaarSale[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('bazaar_my_sales');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((r) => ({
    ...mapOrderBase(r),
    buyerBee: str(r.buyer_bee),
    buyerHandle: str(r.buyer_handle),
    buyerName: str(r.buyer_name),
    buyerAvatar: strOrNull(r.buyer_avatar),
  }));
}

/** Seller marks a paid order shipped. Raises (surfaced verbatim) on guard fail. */
export async function bazaarMarkShipped(orderId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('bazaar_mark_shipped', { p_order_id: orderId });
  if (error) throw new Error(error.message);
}

/** Buyer confirms receipt (from paid or shipped). Raises (verbatim) on guard fail. */
export async function bazaarConfirmReceived(orderId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('bazaar_confirm_received', { p_order_id: orderId });
  if (error) throw new Error(error.message);
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

// ─────────────────────────────────────────────────────────────────────────
// Seller listing management + photo uploads (astras sweep: BAZAAR pass)
// ─────────────────────────────────────────────────────────────────────────

/** The caller's own OFFERs (any status), via bazaar_my_listings. */
export async function bazaarMyListings(): Promise<BazaarListing[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('bazaar_my_listings');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapListing);
}

/** Withdraw an OFFER (seller-only; the RPC guards open orders). */
export async function bazaarCancelListing(listingId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('bazaar_cancel_listing', { p_listing_id: listingId });
  if (error) throw new Error(error.message);
}

/**
 * Upload a listing photo to the group-media bucket. Path is keyed on the
 * uploader (bazaar/{bee_id}/… — bazaar_media_insert policy) because photos
 * upload before the listing exists; the URL goes into image_urls on create.
 */
export async function uploadListingImage(beeId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `bazaar/${beeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('group-media')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('group-media').getPublicUrl(path).data.publicUrl;
}
