// Single source of truth for PillarConfig across all Cat 1 pillars.
// Created on first Cat 1 pillar build (AtlasINTEL.fyi, 2026-04-27).
// Subsequent pillars append to registry.ts only — this file does not change per-pillar.
// v2 (2026-04-27): added optional wordmarkShort for dual-wordmark pillars (Rebelution.fyi).

export type Constellation = 'honeycomb' | 'atlasnation';

export interface PillarConfig {
  /** Pillar slug — registry key. Lowercase, no spaces. e.g. 'atlasintel' */
  slug: string;
  /** Hostnames that resolve to this pillar (apex + www; subdomains added as needed) */
  hosts: string[];
  /** Display wordmark shown in SiteHeader expanded state. Casing is load-bearing — match brand exactly. */
  wordmark: string;
  /**
   * Condensed wordmark shown when sidebar is collapsed or in menu chip.
   * If absent, SiteHeader falls back to `wordmark.toUpperCase()`.
   * e.g. wordmark: 'Intelligence' → wordmarkShort: 'INTEL'
   */
  wordmarkShort?: string;
  /**
   * Primary surface slug — must match an entry in src/lib/surfaces.ts SURFACES[].slug.
   * The pillar's root route (/) renders this surface's layout.
   */
  primarySurface: string;
  /** Constellation membership — affects sidebar tonal palette in v2 */
  constellation: Constellation;
  /** Pillar accent color (hex) — used in right-sidebar rotation + favicon tint */
  accent: string;
  /**
   * Optional copy overrides applied at render-time.
   * v1: empty for HoneyComb-base pillars. AtlasNation pillars may swap "Bees"→"Members" in v2.
   * Keys are exact strings to find; values are replacements. Case-sensitive.
   */
  copyOverrides: Record<string, string>;
}
