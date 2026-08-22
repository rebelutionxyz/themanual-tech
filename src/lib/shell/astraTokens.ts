/* PER-ASTRA SHELL TOKENS — SHELL v1.5 (ops_docs SHELL, 2026-08-22).
 *
 * SHELL v1.5 §"PER-ASTRA TOKENS": the ONLY things that swap between astras are
 *   --accent / --accent-dim / --accent-bg, the TLD string, the logo slot, and
 *   the display typeface. Everything else (bg, line, ink, BLiNG gold, BUY green,
 *   BRAND red, all dimensions) is a FIXED constellation-wide token and lives in
 *   index.css under the `.h24-shell` scope — it does not belong here.
 *
 * This module is the reference the other astras copy-port: add a row to
 * ASTRA_TOKENS, mount the UniversalShell with it, done. The values below are the
 * ruled h24 set plus the PROPOSED (not-yet-ruled) sets SHELL v1.5 lists for
 * VOTE/JUSTICE/FUND/GAMES — kept here as `proposed: true` so they are visible to
 * the copy-porter but are NOT presented as ratified. Mint ASTRA_COLORS v1 to
 * promote a proposed row (and resolve FUND green vs. BUY green there).
 */

import type { CSSProperties } from 'react';

export type AstraLogo = 'butterfly' | 'fist';

export interface AstraTokens {
  /** Registry key + astra slug used by the runtime (e.g. 'themanual' for h24). */
  slug: string;
  /** Left-strip TLD text. h24 shows "h24"; rebelution sites show ".tld". */
  tld: string;
  /** Per-astra logo slot. h24 = butterfly; rebelution.[tld] = the fist mark. */
  logo: AstraLogo;
  /** --accent: the astra's primary accent (focus rings, active nav, send box). */
  accent: string;
  /** --accent-dim: muted accent (scrollbar rest, hairline emphasis). */
  accentDim: string;
  /** --accent-bg: near-black accent-tinted ground for accent surfaces. */
  accentBg: string;
  /**
   * Display typeface (home greeting, headings). UI face is FIXED JetBrains Mono
   * everywhere per SHELL v1.5 and is set in CSS, NOT here. A CSS font stack.
   */
  displayFace: string;
  /** PROPOSED rows are not yet ruled — ASTRA_COLORS v1 ratifies them. */
  proposed?: boolean;
}

/**
 * h24 — the reference implementation (SHELL_PORT1). Accent = BURNT ORANGE, the
 * first proof of the currency/astra split (BLiNG! stays gold regardless).
 *
 * h24's display face is unruled in SHELL v1.5 (only VOTE/JUSTICE/FUND/GAMES are
 * proposed). JUDGMENT CALL (SHELL_PORT1, recorded in REPORT.md): a console
 * identity reads mono-forward, so h24's display face defaults to the UI face
 * (JetBrains Mono) until ASTRA_COLORS v1 rules otherwise — a one-line swap here.
 */
export const H24_TOKENS: AstraTokens = {
  slug: 'themanual',
  tld: 'h24',
  logo: 'butterfly',
  accent: '#ef6c2a',
  accentDim: '#8a3c14',
  accentBg: '#1e100a',
  displayFace: "'JetBrains Mono', ui-monospace, monospace",
};

/** PROPOSED sets from SHELL v1.5 — visible to the copy-porter, not yet ruled. */
export const ASTRA_TOKENS: Record<string, AstraTokens> = {
  h24: H24_TOKENS,
  vote: {
    slug: 'vote',
    tld: '.vote',
    logo: 'fist',
    accent: '#c9a227',
    accentDim: '#7a611a',
    accentBg: '#181307',
    displayFace: "'Source Serif 4', Georgia, serif",
    proposed: true,
  },
  justice: {
    slug: 'justice',
    tld: '.press',
    logo: 'fist',
    accent: '#7fa8d9',
    accentDim: '#3f5c7d',
    accentBg: '#0b1119',
    displayFace: "'Spectral', Georgia, serif",
    proposed: true,
  },
  fund: {
    slug: 'fund',
    tld: '.fund',
    logo: 'fist',
    // NOTE (SHELL v1.5): FUND green sits near BUY green #3fbf6a — resolve the
    // collision at ASTRA_COLORS mint before this row is promoted out of proposed.
    accent: '#3fbf6a',
    accentDim: '#22623a',
    accentBg: '#08130c',
    displayFace: "'Public Sans', system-ui, sans-serif",
    proposed: true,
  },
  games: {
    slug: 'games',
    tld: '.games',
    logo: 'fist',
    accent: '#c77dff',
    accentDim: '#6b3f8c',
    accentBg: '#130a1a',
    displayFace: "'Space Grotesk', system-ui, sans-serif",
    proposed: true,
  },
};

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
