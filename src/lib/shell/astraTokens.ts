/* PER-ASTRA SHELL TOKENS — SHELL v1.5 (ops_docs SHELL, 2026-08-22)
 *                        + ASTRA_COLORS v1/v1.1 (ops_docs, 2026-09-03, pass ASTRA_COLORS1)
 *                        + ASTRA_COLORS v1.2 (verification delta, this pass)
 *
 * SHELL v1.5 §"PER-ASTRA TOKENS": the ONLY things that swap between astras are
 *   --accent / --accent-dim / --accent-bg, the TLD string, the logo slot, and
 *   the display typeface. Everything else (bg, line, ink, BLiNG gold, BUY green,
 *   BRAND red, all dimensions) is a FIXED constellation-wide token and lives in
 *   index.css under the `.astra-shell` scope — it does not belong here.
 *
 * WHY THE HEXES BELOW ARE NOT THE ONES IN ASTRA_COLORS v1:
 *   v1 §6 recorded that no contrast tool had been run and asked for one before
 *   ratification. It was run (v1.2 §1): 10 of v1's 24 accents fall below 4.5:1
 *   against the shell's own ground #07080a — v1 picked mid-lightness hexes so
 *   they would survive black AND white, but SHELL v1.5 fixes the ground at
 *   #07080a and there is no white ground to survive. v1.2 lifts every accent to
 *   one OKLCH lightness tier (L .700) and nudges four hues out of the reserved
 *   BLiNG-gold / BUY-green bands. Identity — family names, taglines, manifests,
 *   domains, FLAGSHIP's no-accent ruling — is v1's and untouched.
 *
 * EVERYTHING HERE EXCEPT h24 IS `proposed: true`. h24 is LOCKED (ORACLE_MF
 * v1.46). Promote a row by deleting its flag once the owner ratifies.
 *
 * OPEN, OWNER RULING REQUIRED (v1.2 §3): VOTE and SafetyMEETING land on the same
 * hue. The warm-yellow region is over-subscribed — gold forbids 77.5–101.5°, and
 * v1 puts four identities (LIVE NEWS, VOTE, XYZ, SafetyMEETING) into what is left.
 * No hex fixes it; one of the four has to leave the family. Do NOT invent a
 * resolution here — file a -Q.
 */

import type { CSSProperties } from 'react';

export type AstraLogo = 'butterfly' | 'fist';
export type ToolbarSlot = 'tasks' | 'security' | 'alerts';

export interface AstraTokens {
  /** Registry key + astra slug used by the runtime. */
  slug: string;
  /** Left-strip TLD text. h24 shows "h24"; rebelution sites show ".tld". */
  tld: string;
  /** Per-astra logo slot. h24 = butterfly; rebelution.[tld] = the fist mark. */
  logo: AstraLogo;
  /** --accent: focus rings, active nav, send box, TLD text. */
  accent: string;
  /** --accent-dim: scrollbar rest, hairline emphasis. */
  accentDim: string;
  /** --accent-bg: near-black accent-tinted ground for accent surfaces. */
  accentBg: string;
  /** Display typeface (home greeting, headings). UI face is FIXED in CSS. */
  displayFace: string;
  /** ASTRA_COLORS v1 §4 colour-family name. Identity, not a computed value. */
  family?: string;
  /** ASTRA_COLORS v1 §4 tagline. */
  tagline?: string;
  /**
   * SHELL v1.6 header icon manifest, BEYOND the floor. Floor is h24 badge +
   * Notifications + handle + avatar on every astra, plus BLiNG on every astra
   * except h24 (CURRENCY_LAW v1.6 §1). An empty array is a config choice, not a
   * missing feature — never "restore" a slot because another astra has it.
   */
  slots?: ToolbarSlot[];
  /** Measured WCAG contrast of `accent` against the fixed ground #07080a. */
  contrast?: number;
  /** PROPOSED rows are not yet ruled — the owner ratifies ASTRA_COLORS. */
  proposed?: boolean;
}

/** h24 — LOCKED (ORACLE_MF v1.46). Burnt orange; BLiNG! stays gold regardless. */
export const H24_TOKENS: AstraTokens = {
  slug: 'h24',
  tld: 'h24',
  logo: 'butterfly',
  accent: '#ef6c2a',
  accentDim: '#8a3c14',
  accentBg: '#1e100a',
  displayFace: "'JetBrains Mono', ui-monospace, monospace",
  family: 'Burnt Orange',
  tagline: 'Ask it anything. It answers to you.',
  slots: ['tasks', 'security'],
  contrast: 6.53,
};

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = "'Spectral', Georgia, serif";
const SANS = "'Public Sans', system-ui, sans-serif";
const GROTESK = "'Space Grotesk', system-ui, sans-serif";

/**
 * FLAGSHIP carries NO accent — it is the constellation's front door and the
 * neutral frame every other astra's base derives from (ASTRA_COLORS v1 §4). The
 * "accent" here is ink-neutral on purpose; do not give it a hue.
 */
export const FLAGSHIP_TOKENS: AstraTokens = {
  slug: 'flagship',
  tld: '.app',
  logo: 'fist',
  accent: '#e6eaee',
  accentDim: '#7c858d',
  accentBg: '#131619',
  displayFace: MONO,
  family: 'no accent — base black + white',
  tagline: "The Constellation's Front Door.",
  slots: ['security'],
  proposed: true,
};

export const ASTRA_TOKENS: Record<string, AstraTokens> = {
  h24: H24_TOKENS,
  flagship: FLAGSHIP_TOKENS,
  justice: {
    slug: 'justice',
    tld: '.org',
    logo: 'fist',
    accent: '#6ea2df',
    accentDim: '#3d5c80',
    accentBg: '#0f151b',
    displayFace: SERIF,
    family: 'Spectral Steel',
    tagline: 'Narrative vs Internet.',
    slots: ['alerts'],
    contrast: 7.53,
    proposed: true,
  },
  vote: {
    slug: 'vote',
    tld: '.vote',
    logo: 'fist',
    accent: '#b1a100',
    accentDim: '#645b01',
    accentBg: '#161409',
    displayFace: SERIF,
    family: 'Gold (see v1.2 §4 — hex is now brass-olive)',
    tagline: 'Every Vote, On The Record.',
    slots: ['tasks', 'alerts'],
    contrast: 7.6,
    proposed: true,
  },
  events: {
    slug: 'events',
    tld: '.events',
    logo: 'fist',
    accent: '#c27fdd',
    accentDim: '#6f477f',
    accentBg: '#18111b',
    displayFace: GROTESK,
    family: 'Plum-Violet',
    tagline: 'Show Up, Rule the Room.',
    slots: ['tasks'],
    contrast: 7.03,
    proposed: true,
  },
  groups: {
    slug: 'groups',
    tld: '.group',
    logo: 'fist',
    accent: '#e573a2',
    accentDim: '#84405c',
    accentBg: '#1c1014',
    displayFace: SANS,
    family: 'Rose Magenta',
    tagline: 'Find Your Hive.',
    slots: ['tasks'],
    contrast: 6.97,
    proposed: true,
  },
  talk: {
    slug: 'talk',
    tld: '.talk',
    logo: 'fist',
    accent: '#00b1d7',
    accentDim: '#01647b',
    accentBg: '#0a161a',
    displayFace: SANS,
    family: 'Signal Cyan',
    tagline: 'Say It Direct.',
    slots: ['alerts'],
    contrast: 7.89,
    proposed: true,
  },
  news: {
    slug: 'news',
    tld: '.news',
    logo: 'fist',
    accent: '#d28f00',
    accentDim: '#785002',
    accentBg: '#1a1309',
    displayFace: SERIF,
    family: 'Amber',
    tagline: "What's Actually Happening.",
    slots: ['alerts'],
    contrast: 7.32,
    proposed: true,
  },
  etzy: {
    slug: 'etzy',
    tld: '.store',
    logo: 'fist',
    accent: '#e3832f',
    accentDim: '#824917',
    accentBg: '#1c110a',
    displayFace: GROTESK,
    family: 'Terracotta',
    tagline: 'Made By Bees, Printed for Bees.',
    slots: ['tasks'],
    contrast: 7.21,
    proposed: true,
  },
  bazaar: {
    slug: 'bazaar',
    tld: '.shop',
    logo: 'fist',
    accent: '#00b8a8',
    accentDim: '#01685f',
    accentBg: '#0a1715',
    displayFace: SANS,
    family: 'Turquoise',
    tagline: 'Everything Bees Offer.',
    slots: ['tasks'],
    contrast: 8.03,
    proposed: true,
  },
  ads: {
    slug: 'ads',
    tld: '.biz',
    logo: 'fist',
    accent: '#81b040',
    accentDim: '#486421',
    accentBg: '#11160b',
    displayFace: GROTESK,
    family: 'Chartreuse',
    tagline: 'Get Seen, Give Back.',
    slots: [],
    contrast: 7.84,
    proposed: true,
  },
  pros: {
    slug: 'pros',
    tld: '.pro',
    logo: 'fist',
    accent: '#9290f8',
    accentDim: '#52518f',
    accentBg: '#12131e',
    displayFace: SANS,
    family: 'Indigo',
    tagline: 'Skilled Bees, Ready to Give.',
    slots: ['tasks'],
    contrast: 7.22,
    proposed: true,
  },
  security: {
    slug: 'security',
    tld: '.icu',
    logo: 'fist',
    accent: '#5faeae',
    accentDim: '#346363',
    accentBg: '#0e1616',
    displayFace: MONO,
    family: 'Sentinel Teal',
    tagline: 'Watching Your Back.',
    slots: ['security', 'alerts'],
    contrast: 7.78,
    proposed: true,
  },
  workshop: {
    slug: 'workshop',
    tld: '.dev',
    logo: 'fist',
    accent: '#cf8e51',
    accentDim: '#77502c',
    accentBg: '#19120c',
    displayFace: MONO,
    family: 'Bronze',
    tagline: 'Build the Next Astra.',
    slots: ['security', 'tasks'],
    contrast: 7.29,
    proposed: true,
  },
  tasks: {
    slug: 'tasks',
    tld: '.ing',
    logo: 'fist',
    accent: '#64a6d5',
    accentDim: '#375e7a',
    accentBg: '#0e151a',
    displayFace: SANS,
    family: 'Denim',
    tagline: 'Small Asks, Big Hive.',
    slots: ['tasks'],
    contrast: 7.59,
    proposed: true,
  },
  intel: {
    slug: 'intel',
    tld: '.fyi',
    logo: 'fist',
    accent: '#8195fb',
    accentDim: '#485491',
    accentBg: '#11131e',
    displayFace: SERIF,
    family: 'Periwinkle',
    tagline: 'Know Before They Do.',
    slots: ['alerts'],
    contrast: 7.28,
    proposed: true,
  },
  dating: {
    slug: 'dating',
    tld: '.love',
    logo: 'fist',
    accent: '#e97293',
    accentDim: '#863f53',
    accentBg: '#1d1013',
    displayFace: GROTESK,
    family: 'Blush',
    tagline: 'Sovereign, and Looking.',
    slots: [],
    contrast: 6.96,
    proposed: true,
  },
  studio: {
    slug: 'studio',
    tld: '.studio',
    logo: 'fist',
    accent: '#cc7bd1',
    accentDim: '#754578',
    accentBg: '#19111a',
    displayFace: GROTESK,
    family: 'Plum',
    tagline: 'Make It, Keep It, Send It.',
    slots: ['tasks'],
    contrast: 6.99,
    proposed: true,
  },
  education: {
    slug: 'education',
    tld: '.online',
    logo: 'fist',
    accent: '#00ade8',
    accentDim: '#016285',
    accentBg: '#0a161c',
    displayFace: SANS,
    family: 'Sky',
    tagline: 'Learn It, Earn From It.',
    slots: ['tasks'],
    contrast: 7.77,
    proposed: true,
  },
  xyz: {
    slug: 'xyz',
    tld: '.xyz',
    logo: 'fist',
    accent: '#a4a440',
    accentDim: '#5d5d22',
    accentBg: '#15150b',
    displayFace: GROTESK,
    family: 'Olive',
    tagline: 'Wear the Rebellion.',
    slots: ['tasks'],
    contrast: 7.6,
    proposed: true,
  },
  waggles: {
    slug: 'waggles',
    tld: '.tech',
    logo: 'fist',
    accent: '#de8721',
    accentDim: '#7f4c0f',
    accentBg: '#1b1209',
    displayFace: SANS,
    family: 'Honey',
    tagline: 'Get More Done, Together.',
    slots: ['tasks'],
    contrast: 7.24,
    proposed: true,
  },
  fund: {
    slug: 'fund',
    tld: '.fund',
    logo: 'fist',
    accent: '#58b38c',
    accentDim: '#30664f',
    accentBg: '#0d1612',
    displayFace: SANS,
    family: 'Forest (see v1.2 §4 — hex is lighter than the name)',
    tagline: 'The Fountain. Fund it together.',
    slots: [],
    contrast: 7.86,
    proposed: true,
  },
  games: {
    slug: 'games',
    tld: '.games',
    logo: 'fist',
    accent: '#b982e5',
    accentDim: '#694984',
    accentBg: '#17111c',
    displayFace: GROTESK,
    family: 'Violet',
    tagline: 'Play the Hive, Win Together.',
    slots: [],
    contrast: 7.05,
    proposed: true,
  },
  // DEFERRED (CONCEPTS v4.3) — swatch parked so nothing is re-derived on revival.
  diephone: {
    slug: 'diephone',
    tld: '.app',
    logo: 'fist',
    accent: '#909fba',
    accentDim: '#515a6a',
    accentBg: '#11141a',
    displayFace: MONO,
    family: 'Graphite',
    tagline: 'Lock It Down From Anywhere.',
    slots: ['security', 'alerts'],
    contrast: 7.49,
    proposed: true,
  },
  // STATUS OPEN (ASTRA_COLORS v1 §4) + hue collides with VOTE — see v1.2 §3.
  safetymeeting: {
    slug: 'safetymeeting',
    tld: '.tech',
    logo: 'fist',
    accent: '#b1a100',
    accentDim: '#645b01',
    accentBg: '#161409',
    displayFace: GROTESK,
    family: 'Signal Yellow',
    tagline: 'Help, the Moment You Need It.',
    slots: ['alerts', 'security'],
    contrast: 7.6,
    proposed: true,
  },
};

/**
 * ONE_SHELL1 (owner 2026-09-03: "One shell. ONE."): every surface in the roof
 * wears UniversalShell. A surface that already has a ratified/proposed row in
 * ASTRA_TOKENS uses it; one that does not gets tokens DERIVED from the accent
 * the surface already carried in the old shell, so nothing is left wearing the
 * old chrome while ASTRA_COLORS catches up. dim/bg are CSS color-mix
 * expressions — valid values for the custom properties, no color library.
 */
export function tokensFromAccent(slug: string, tld: string, accent: string): AstraTokens {
  return {
    slug,
    tld,
    logo: 'fist',
    accent,
    accentDim: `color-mix(in srgb, ${accent} 58%, #000)`,
    accentBg: `color-mix(in srgb, ${accent} 12%, #07080a)`,
    displayFace: "'JetBrains Mono', ui-monospace, monospace",
    proposed: true,
  };
}

/**
 * The CSS custom properties an astra's tokens resolve to, ready to spread onto
 * the shell root's `style`. Fixed tokens are NOT here — they are static in CSS.
 */
export function astraCssVars(t: AstraTokens): CSSProperties {
  return {
    '--accent': t.accent,
    '--accent-dim': t.accentDim,
    '--accent-bg': t.accentBg,
    '--display-face': t.displayFace,
    // Scrollbars read --surface-accent (index.css); point it at the astra accent
    // so the whole shell's scrollbars are accent-dim at rest, accent on grab.
    '--surface-accent': t.accentDim,
  } as CSSProperties;
}
