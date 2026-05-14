// Rebelution.fyi astra config — second Cat 1 astra (2026-04-27).
// HoneyComb constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// Dual-wordmark: expanded header shows 'Intelligence'; collapsed/menu shows 'INTEL'.
// v1: no copy overrides, no schema changes. Spec: shared/pillar-specs/rebelution-fyi.md.
// v2 (Code 24 / 2026-05-08): canonical promotionSlots configuration (Phase C Component D).
// v3 (Code 23 / 2026-05-08): defaultGeo: 'Global' (Phase C Component C-5).

import { DEFAULT_PROMOTION_SLOTS, type AstraConfig } from './astra.types';

export const rebelutionFyiAstra: AstraConfig = {
  slug: 'rebelution-fyi',
  hosts: ['rebelution.fyi', 'www.rebelution.fyi'],
  wordmark: 'Intelligence',
  wordmarkShort: 'INTEL',
  primarySurface: 'intel',
  constellation: 'honeycomb',
  accent: '#87CEEB', // sky blue — first HoneyComb-constellation accent
  copyOverrides: {}, // v1: ride canonical HoneyComb lexicon (Bees, Drips, Drops, BLiNG!)
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
