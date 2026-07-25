// MiniWaves.app astra config — registration only (2026-05-28).
// No routes / UI / Spine integration; this entry just makes miniwaves.app
// resolvable via ASTRA_REGISTRY for downstream work. Maps to the existing
// WAVES surface (src/lib/surfaces.ts slug 'waves' — "Motion Flow").
//
// wordmark: canon is 'MiniWaves' (MMF v2.8; domain 'MiniWAVES.app'). Ratified by OG
//   HUMAN 2026-07-25. An alternating-caps form 'MiNiWaVeS' was previously asserted here
//   as settled canon by analogy to BLiNG! / AtlasINTEL / FreedomBLiNGs — it was never in
//   the MMF and never ratified. That analogy was wrong: those wordmarks are individually
//   locked, not instances of a rule that generalizes. Do not re-derive a stylized form
//   for this astra from the pattern; the MMF is the only source.
//   "Mini Waves" is the spoken/display form.
// Hierarchy: Vessel → Dribble (10 levels; resequenced 2026-07-10, H2O dropped).
//   Vessel · Ocean · Wave · Tide · Flow · Ripple · Drip · Drop · Trickle · Dribble.
//   Search/nav ceiling: Ripple. Post depth: Dribble (9 levels below Vessel).
//
// JUDGMENT CALLS (pattern-derived; flagged for OG HUMAN ratification on the PR):
//   - constellation: 'honeycomb' — non-Atlas, HoneyComb-native productivity surface.
//   - accent: '#0EA5E9' — adopted from the WAVES surface color (water blue).
//   - siteTitle: "MiniWaves · HONEYCOMB Motion Flow" — uses the canonical
//     wordmark form, matching the existing Astra pattern (cf. atlasintel).
// NOTE: astra-catalog.ts marks miniwaves status 'live'; task says pre-launch /
// scaffolded. AstraConfig has no status field, so nothing is set here.

import { DEFAULT_PROMOTION_SLOTS, type AstraConfig } from './astra.types';

export const miniwavesAstra: AstraConfig = {
  slug: 'miniwaves',
  hosts: ['miniwaves.app', 'www.miniwaves.app'],
  wordmark: 'MiniWaves',
  siteTitle: 'MiniWaves · HONEYCOMB Motion Flow',
  tagline: 'Orchestrate your life by motion, Vessel to Dribble.',
  primarySurface: 'waves',
  constellation: 'honeycomb',
  accent: '#0EA5E9',
  copyOverrides: {},
  promotionSlots: { ...DEFAULT_PROMOTION_SLOTS },
  defaultGeo: 'Global',
};
