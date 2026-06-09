// Single source of truth for AstraConfig across all Cat 1 astras.
// Created on first Cat 1 astra build (AtlasINTEL.fyi, 2026-04-27).
// Subsequent astras append to registry.ts only — this file does not change per-astra.
// v2 (2026-04-27): added optional wordmarkShort for dual-wordmark astras (Rebelution.fyi).
// v3 (2026-05-08, Code 24): added promotionSlots (Phase C Component D — promotion slot framework).
// v4 (2026-05-08, Code 23): added defaultGeo (Phase C Component C-5 — geo cascade fallback).
// v5 (2026-05-27, Code A): added siteTitle (required) + tagline + taglineSecondary
// per manual-spine-api-v1.md §2.1. siteTitle drives <title> + og:title and is
// REQUIRED so a new Astra cannot compile without setting it (no silent "The
// Manual" fallback on a non-foundation host).

import type { GeoLocation } from '@/lib/geo/types';

export type Constellation = 'honeycomb' | 'atlasnation';

/**
 * Canonical promotion slot keys. Three slots ship in v1; bottom-scrolling
 * deferred to v2. Field is `behavior` (not `type`) to avoid vocabulary
 * collision with atoms.type / surface kind. Per MMF §19.7 D-2.
 */
export type SlotKey = 'top-ticker' | 'sidebar-promoted' | 'feed-inline';

export type SlotBehavior = 'static' | 'scrolling';

export interface SlotConfig {
  /** When false, slot never renders on this astra (DOM omitted entirely). */
  enabled: boolean;
  /** Static (default) or scrolling (top-ticker pattern). */
  behavior: SlotBehavior;
  /**
   * Optional HTML fallback rendered when no DB promotion matches the cascade.
   * Sanitized at render-time. v1 ships empty for all astras; first promotions
   * arrive via Supabase Studio INSERT.
   */
  fallbackContent?: string;
  /**
   * Feed-inline only: inject promotion at this 0-indexed feed position.
   * Default 10. Astras can override (e.g. tighter feeds may want N=5).
   */
  feedInlinePosition?: number;
}

export interface AstraConfig {
  /** Astra slug — registry key. Lowercase, no spaces. e.g. 'atlasintel' */
  slug: string;
  /** Hostnames that resolve to this astra (apex + www; subdomains added as needed) */
  hosts: string[];
  /** Display wordmark shown in SiteHeader expanded state. Casing is load-bearing — match brand exactly. */
  wordmark: string;
  /**
   * Site title — drives <title>, <meta og:title>, and any header positioning
   * copy that reads from AstraConfig. REQUIRED for every astra so a new
   * Astra can't ship without it. Canonical pattern: "Brand · HONEYCOMB Surface".
   * Per manual-spine-api-v1.md §2.1.
   */
  siteTitle: string;
  /** Optional positioning line (sub-tagline below wordmark). */
  tagline?: string;
  /** Optional philosophy line (e.g. DingleBERRY's paranoia tagline). */
  taglineSecondary?: string;
  /**
   * Condensed wordmark shown when sidebar is collapsed or in menu chip.
   * If absent, SiteHeader falls back to `wordmark.toUpperCase()`.
   * e.g. wordmark: 'Intelligence' → wordmarkShort: 'INTEL'
   */
  wordmarkShort?: string;
  /**
   * Primary surface slug — must match an entry in src/lib/surfaces.ts SURFACES[].slug.
   * The astra's root route (/) renders this surface's layout.
   */
  primarySurface: string;
  /** Constellation membership — affects sidebar tonal palette in v2 */
  constellation: Constellation;
  /** Astra accent color (hex) — used in right-sidebar rotation + favicon tint */
  accent: string;
  /**
   * Optional copy overrides applied at render-time.
   * v1: empty for HoneyComb-base astras. AtlasNation astras may swap "Bees"→"Members" in v2.
   * Keys are exact strings to find; values are replacements. Case-sensitive.
   */
  copyOverrides: Record<string, string>;
  /**
   * Default search-location geo for this astra when no localStorage value exists
   * and no logged-in profile location is set. Per MMF §19.7 C-5 cascade:
   *   1. localStorage (honeycomb:geo:search-location)
   *   2. bee_profiles row (when authenticated)
   *   3. AstraConfig.defaultGeo (this field)
   *   4. 'Global' (final fallback)
   * All canonical Astras = 'Global'. Novas (Bee-clones) may localize.
   */
  defaultGeo?: GeoLocation;
  /**
   * Promotion slot configuration. Hybrid: this controls slot enablement and
   * fallback content; live promotion content comes from the `promotions` table.
   * Cascade per MMF §19.7 D-1:
   *   1. DB row matching (slot_key, scope, geo, active window) — most-specific wins
   *   2. fallbackContent here (if defined)
   *   3. nothing — slot DOM omitted (D-4)
   * If absent, slots default to DEFAULT_PROMOTION_SLOTS (all three enabled).
   */
  promotionSlots?: Partial<Record<SlotKey, SlotConfig>>;
}

/**
 * Canonical slot defaults. All three slots enabled with canonical behaviors.
 * Astras can override individual slot keys via AstraConfig.promotionSlots.
 * Per MMF §19.7 D-2 — bottom-scrolling slot is deferred to v2.
 */
export const DEFAULT_PROMOTION_SLOTS: Record<SlotKey, SlotConfig> = {
  'top-ticker': { enabled: true, behavior: 'scrolling' },
  'sidebar-promoted': { enabled: true, behavior: 'static' },
  'feed-inline': { enabled: true, behavior: 'static', feedInlinePosition: 10 },
};

/**
 * Resolve the effective slot config for a given astra + slot key.
 * Falls through to DEFAULT_PROMOTION_SLOTS when the astra does not specify
 * the slot, or when called on the foundation (no astra — themanual.tech itself).
 */
export function resolveSlotConfig(
  astra: AstraConfig | null,
  slotKey: SlotKey,
): SlotConfig {
  return astra?.promotionSlots?.[slotKey] ?? DEFAULT_PROMOTION_SLOTS[slotKey];
}
