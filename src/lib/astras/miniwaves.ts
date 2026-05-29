// MiniWaves.app astra config — registration only (2026-05-28).
// No routes / UI / Spine integration; this entry just makes miniwaves.app
// resolvable via ASTRA_REGISTRY for downstream work. Maps to the existing
// WAVES surface (src/lib/surfaces.ts slug 'waves' — "Motion Flow").
//
// wordmark: canonical stylized form is 'MiNiWaVeS' (matches astra-catalog.ts +
//   the load-bearing-casing pattern: BLiNG!, AtlasINTEL, FreedomBLiNGs).
//   "Mini Waves" is the spoken/display form.
// Hierarchy: Ocean → Trickle (8 levels); H2O + Dribble dropped.
//
// JUDGMENT CALLS (pattern-derived; flagged for OG HUMAN ratification on the PR):
//   - constellation: 'honeycomb' — non-Atlas, HoneyComb-native productivity surface.
//   - accent: '#0EA5E9' — adopted from the WAVES surface color (water blue).
//   - siteTitle: "MiNiWaVeS · HONEYCOMB Motion Flow" — uses the stylized
//     wordmark form, matching the existing Astra pattern (cf. atlasintel).
// NOTE: astra-catalog.ts marks miniwaves status 'live'; task says pre-launch /
// scaffolded. AstraConfig has no status field, so nothing is set here.

import { DEFAULT_PROMOTION_SLOTS, type AstraConfig } from './astra.types';

export const miniwavesAstra: AstraConfig = {
  slug: 'miniwaves',
  hosts: ['miniwaves.app', 'www.miniwaves.app'],
  wordmark: 'MiNiWaVeS',
  siteTitle: 'MiNiWaVeS · HONEYCOMB Motion Flow',
  tagline: 'Orchestrate your life by motion, Ocean to Trickle.',
  primarySurface: 'waves',
  constellation: 'honeycomb',
  accent: '#0EA5E9',
  copyOverrides: {},
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
