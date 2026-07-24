// BRANDoSOPHIC astra config — the brand-design Astra (MMF §25). 2026-07-24.
// HoneyComb constellation. Own surface family at /brandosophic/* (STUDIO /
// BRANDS / NOVAS / STOREFRONT / ORDER BOOK) inside the white community shell.
// Anchored to the Tier-2 'brand' surface entry for grouping; routes are its own.
// Naming ratified 2026-07-24: The Workshop = theworkshop.to (whackjob reserved).

import { type AstraConfig, DEFAULT_PROMOTION_SLOTS } from './astra.types';

export const brandosophicAstra: AstraConfig = {
  slug: 'brandosophic',
  hosts: ['brandosophic.com', 'www.brandosophic.com'],
  wordmark: 'BRANDoSOPHIC',
  wordmarkShort: 'BRAND',
  siteTitle: 'BRANDoSOPHIC · HONEYCOMB Brand Studio',
  tagline: 'Make it yours.',
  primarySurface: 'brand',
  constellation: 'honeycomb',
  accent: '#6E1423', // deep maroon (Butch, Jul 24) — matches the astra-owned skin row
  copyOverrides: {},
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
