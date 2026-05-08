// AtlasUNITED.fyi pillar config.
// AtlasNation constellation. Code 17 (2026-05-07): Bees↔Members lexicon canonization.
// v2 (Code 24 / 2026-05-08): canonical promotionSlots configuration (Phase C Component D).

import { DEFAULT_PROMOTION_SLOTS, type PillarConfig } from './pillar.types';

export const atlasunitedPillar: PillarConfig = {
  slug: 'atlasunited',
  hosts: ['atlasunited.fyi', 'www.atlasunited.fyi'],
  wordmark: 'AtlasUNITED',
  primarySurface: 'rule',
  constellation: 'atlasnation',
  accent: '#C16E2A',
  copyOverrides: {
    Bees: 'Members',
    Bee: 'Member',
    bees: 'members',
    bee: 'member',
  },
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
};
