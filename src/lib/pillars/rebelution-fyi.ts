// Rebelution.fyi pillar config — second Cat 1 pillar (2026-04-27).
// HoneyComb constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// Dual-wordmark: expanded header shows 'Intelligence'; collapsed/menu shows 'INTEL'.
// v1: no copy overrides, no schema changes. Spec: shared/pillar-specs/rebelution-fyi.md.

import type { PillarConfig } from './pillar.types';

export const rebelutionFyiPillar: PillarConfig = {
  slug: 'rebelution-fyi',
  hosts: ['rebelution.fyi', 'www.rebelution.fyi'],
  wordmark: 'Intelligence',
  wordmarkShort: 'INTEL',
  primarySurface: 'intel',
  constellation: 'honeycomb',
  accent: '#87CEEB', // sky blue — first HoneyComb-constellation accent
  copyOverrides: {}, // v1: ride canonical HoneyComb lexicon (Bees, Drips, Drops, BLiNG!)
};
