// Rebelution.fyi pillar config — second Cat 1 pillar (2026-04-27).
// HoneyComb constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// Dual-wordmark: expanded header shows 'Intelligence'; collapsed/menu shows 'INTEL'.
// v1: no copy overrides, no schema changes. Spec: shared/pillar-specs/rebelution-fyi.md.
// v2 (Code 24 / 2026-05-08): canonical promotionSlots configuration (Phase C Component D).
// v3 (Code 23 / 2026-05-08): defaultGeo: 'Global' (Phase C Component C-5).

import { DEFAULT_PROMOTION_SLOTS, type PillarConfig } from './pillar.types';

export const rebelutionFyiPillar: PillarConfig = {
  slug: 'rebelution-fyi',
  hosts: ['rebelution.fyi', 'www.rebelution.fyi'],
  wordmark: 'Intelligence',
  wordmarkShort: 'INTEL',
  // Conservative value — dispatch didn't list canonical for rebelution-fyi.
  // Brand is dual-wordmark (Intelligence / INTEL); using the Rebelution stem
  // for the site title. Refine when OG HUMAN locks the canonical.
  siteTitle: 'Rebelution · HONEYCOMB Forum',
  tagline: 'Show me who got it wrong.', // first line of the three-line manifesto (honeycomb-vocabulary-v1.md §9)
  primarySurface: 'intel',
  constellation: 'honeycomb',
  accent: '#87CEEB', // sky blue — first HoneyComb-constellation accent
  copyOverrides: {}, // v1: ride canonical HoneyComb lexicon (Bees, Drips, Drops, BLiNG!)
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
