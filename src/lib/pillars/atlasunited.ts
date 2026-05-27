// AtlasUNITED.fyi pillar config.
// AtlasNation constellation. Code 17 (2026-05-07): Bees↔Members lexicon canonization.
// v2 (Code 24 / 2026-05-08): canonical promotionSlots configuration (Phase C Component D).
// v3 (Code 23 / 2026-05-08): defaultGeo: 'Global' (Phase C Component C-5).

import { DEFAULT_PROMOTION_SLOTS, type PillarConfig } from './pillar.types';

export const atlasunitedPillar: PillarConfig = {
  slug: 'atlasunited',
  hosts: ['atlasunited.fyi', 'www.atlasunited.fyi'],
  wordmark: 'AtlasUNITED',
  // Conservative value — dispatch didn't list canonical for atlasunited;
  // matches the dispatch fallback pattern `${brand} · HONEYCOMB`. Refine when
  // OG HUMAN locks the Rule-of-Law surface copy.
  siteTitle: 'AtlasUNITED · HONEYCOMB',
  tagline: 'Rule of law, by the people.',
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
  defaultGeo: 'Global',
};
