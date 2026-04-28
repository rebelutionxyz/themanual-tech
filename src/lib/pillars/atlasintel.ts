// AtlasINTEL.fyi pillar config — first Cat 1 pillar (2026-04-27).
// AtlasNation constellation. Reuses the intel (Forum) surface from TheMANUAL.tech.
// v1: no copy overrides, no schema changes. Spec: shared/pillar-specs/atlasintel.md.

import type { PillarConfig } from './pillar.types';

export const atlasintelPillar: PillarConfig = {
  slug: 'atlasintel',
  hosts: ['atlasintel.fyi', 'www.atlasintel.fyi'],
  wordmark: 'AtlasINTEL',
  primarySurface: 'intel',
  constellation: 'atlasnation',
  accent: '#4A6E96', // deeper steel blue, ~30% darker than INTEL surface #6B94C8
  copyOverrides: {}, // v1: ride HoneyComb's "Bees" lexicon; override map fills in v2
};
