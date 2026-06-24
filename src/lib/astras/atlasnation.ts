// AtlasNATION.com astra config — Groups.
// AtlasNation constellation. Bees↔Members lexicon canonized constellation-wide
// (Code 17, 2026-05-07; cf. atlasunited.ts) — so Groups inherits the Members swap.
// Created 2026-06-24 to wire the toolbar tile (atlasnation.com → /unite),
// mirroring atlasintel (→ /intel) and atlasunited (→ /rule).

import { DEFAULT_PROMOTION_SLOTS, type AstraConfig } from './astra.types';

export const atlasnationAstra: AstraConfig = {
  slug: 'atlasnation',
  hosts: ['atlasnation.com', 'www.atlasnation.com'],
  wordmark: 'AtlasNATION',
  siteTitle: 'AtlasNATION · HONEYCOMB',
  tagline: 'Organize around shared purpose.',
  primarySurface: 'unite',
  constellation: 'atlasnation',
  accent: '#57B17C',
  copyOverrides: {
    Bees: 'Members',
    Bee: 'Member',
    bees: 'members',
    bee: 'member',
  },
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
