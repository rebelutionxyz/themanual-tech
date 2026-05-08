// AtlasINTEL.fyi pillar config — first Cat 1 pillar (2026-04-27).
// AtlasNation constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// v2 (Code 17 / 2026-05-07): Bees↔Members lexicon canonization for AtlasNation.

import type { PillarConfig } from './pillar.types';

export const atlasintelPillar: PillarConfig = {
  slug: 'atlasintel',
  hosts: ['atlasintel.fyi', 'www.atlasintel.fyi'],
  wordmark: 'AtlasINTEL',
  primarySurface: 'intel',
  constellation: 'atlasnation',
  accent: '#4A6E96', // deeper steel blue, ~30% darker than INTEL surface #6B94C8
  copyOverrides: {
    Bees: 'Members',
    Bee: 'Member',
    bees: 'members',
    bee: 'member',
  },
};
