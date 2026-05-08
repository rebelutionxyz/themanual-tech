// Phase C Component D — promotion slot framework types (Code 24, 2026-05-08).
// Shape mirrors the `promotions` table from migration 20260508120000.

import type { SlotBehavior, SlotConfig, SlotKey } from '@/lib/pillars/pillar.types';

/**
 * One row from public.promotions. Shape matches the migration-applied schema.
 * The active-window predicate is enforced by RLS — anon clients never see
 * paused / future / expired rows, so the reader does not re-filter on time.
 */
export interface Promotion {
  id: string;
  slot_key: string;
  behavior: SlotBehavior;
  content_html: string;

  astra_slug: string | null;
  realm_slug: string | null;
  branch_path: string | null;
  atom_id: string | null; // text slug, e.g. 'justice/freedom-of-speech'

  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_neighborhood: string | null;

  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Reader context for a single slot lookup. All fields optional. */
export interface SlotContext {
  /** Required canonical slot identifier. */
  slotKey: SlotKey;
  /** Astra slug (e.g. 'atlasintel'). Omit on themanual.tech foundation. */
  astra?: string | null;
  /** Realm slug if a realm is selected (e.g. 'justice'). */
  realmSlug?: string | null;
  /** Branch / category path (e.g. 'science / biology / genetics'). */
  branchPath?: string | null;
  /** Atom slug (e.g. 'justice/freedom-of-speech'). */
  atomId?: string | null;
  /** ISO 3166-1 alpha-2 country code (e.g. 'US'). v1 reader is country-only. */
  geoCountry?: string | null;
}

/**
 * Result returned to render code.
 *   enabled        — slot is allowed to render at all (PillarConfig flag)
 *   promotion      — winning DB row, if any matched the cascade
 *   fallbackContent — astra-defined HTML when no DB match
 *   behavior       — effective behavior (DB row's behavior if matched, else slot config's)
 *   feedInlinePosition — only meaningful for the 'feed-inline' slot
 *   loading        — true while the query is in flight
 */
export interface SlotResult {
  enabled: boolean;
  promotion: Promotion | null;
  fallbackContent: string | null;
  behavior: SlotBehavior;
  feedInlinePosition?: number;
  loading: boolean;
  config: SlotConfig;
}
