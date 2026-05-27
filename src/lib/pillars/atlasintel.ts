// AtlasINTEL.fyi pillar config — first Cat 1 pillar (2026-04-27).
// AtlasNation constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// v2 (Code 17 / 2026-05-07): Bees↔Members lexicon canonization for AtlasNation.
// v3 (Code 24 / 2026-05-08): canonical promotionSlots configuration (Phase C Component D).
// v4 (Code 23 / 2026-05-08): defaultGeo: 'Global' (Phase C Component C-5).

import { DEFAULT_PROMOTION_SLOTS, type PillarConfig } from './pillar.types';

export const atlasintelPillar: PillarConfig = {
  slug: 'atlasintel',
  hosts: ['atlasintel.fyi', 'www.atlasintel.fyi'],
  wordmark: 'AtlasINTEL',
  // siteTitle fix: previously inheriting "The Manual" from index.html static title.
  // Canonical value per manual-spine-api-v1.md §2.1.
  siteTitle: 'AtlasINTEL · HONEYCOMB Forum',
  primarySurface: 'intel',
  constellation: 'atlasnation',
  accent: '#4A6E96', // deeper steel blue, ~30% darker than INTEL surface #6B94C8
  copyOverrides: {
    Bees: 'Members',
    Bee: 'Member',
    bees: 'members',
    bee: 'member',
  },
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
