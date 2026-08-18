/* THE SPINE — the five chrome elements every Astra and every page shares.
 *
 * Source: ORACLE_MF v1.23 "SPINE TRUTH", restating MMF §7.2 / §15.1 (locked
 * Apr 25, 2026) and §12 (locked Apr 26). v1.23 is the WORKING design source
 * because ORACLE_MF v1.28 records the MMF itself as UNREACHABLE in Drive; when
 * the MMF is restored, it wins on any conflict, per house precedence.
 *
 * The five elements:
 *   1. TOP BAR    always black SPINE_BLACK. No realm tinting of the bar itself.
 *   2. LEFT RAIL  closed sidebar wears the CURRENT REALM accent, and switches
 *                 as the user navigates realms.
 *   3. RIGHT RAIL rotates through the ASTRA accent ring, one step per page
 *                 change. Constellation identity, NOT taxonomy.
 *   4. TOOLBARS   realm toolbars run the L1–L4 tonal depth gradient.
 *   5. THE DROP   BLiNG! honey, right of the wordmark, hops-skips-jumps on
 *                 sidebar open. Respects prefers-reduced-motion.
 *
 * This module holds the VALUES and the derivations. It deliberately holds no
 * JSX: the same ring feeds the rail, the same ramp feeds more than one toolbar,
 * and a value that lives in one component cannot be reused by the next.
 */

import { ASTRA_CATALOG } from '@/lib/astra-catalog';

/* ─────────────────────────── 1. THE TOP BAR ─────────────────────────── */

/**
 * The one black. NOT `--bg` (#07080a): the spine names its own value and the
 * two are close but not equal, so aliasing them would silently redefine the
 * spine the next time the palette moves.
 *
 * Opaque by design. The header was previously `bg-bg/95` with a backdrop blur,
 * which let whatever scrolled underneath tint the bar — precisely what "no
 * exceptions, no realm tinting of the bar itself" forbids.
 */
export const SPINE_BLACK = '#0A0B0E';

/* ─────────────────────────── 3. THE ACCENT RING ─────────────────────── */

/**
 * The rotation ring, taken from the accent table AS DATA (`lib/astra-catalog.ts`).
 * Nothing here invents a colour — the dispatch that commissioned this module was
 * explicit that colours are found or the pass stops.
 *
 * Order is catalog order, which is canon order. The ring is what rotates; the
 * catalog is what it rotates through.
 */
export const ASTRA_ACCENT_RING: readonly string[] = ASTRA_CATALOG.map((a) => a.accent);

/**
 * THREE MEASURED DISCREPANCIES between the accent table and canon, exported as
 * data rather than left in a comment so a report, a test, or a future pass can
 * assert on them instead of re-deriving them by eye. None is fixed here: the
 * commissioning dispatch says to FLAG a tree/doc conflict, not to resolve it
 * toward either side.
 *
 *  A. COUNT. ORACLE_MF v1.26 R9 made Workshop an Astra and put the registry —
 *     and with it "the accent table" — at 41 rows. The catalog holds 40 and has
 *     no `workshop` entry. The ring is therefore 40 long. Adding a 41st row
 *     would mean inventing a colour, which is forbidden.
 *
 *  B. UNIQUENESS. The ring is not injective: three colours are shared by more
 *     than one Astra, so those pages rotate to a band a viewer cannot tell
 *     apart from another Astra's. A rotation that repeats is still a rotation,
 *     so this degrades the signal rather than breaking it.
 *
 *  C. THE RESERVED HUE. ASTRA_STANDARD v1.2 item 14: "RED IS GLOBAL, MEANS
 *     ERROR, AND BELONGS TO NO ASTRA." Two catalog rows carry #DC2626.
 */
export const SPINE_ACCENT_FINDINGS = {
  /** Rows in the accent table today. */
  catalogRows: ASTRA_CATALOG.length,
  /** Rows canon calls for — ORACLE_MF v1.26 R9. */
  canonRows: 41,
  /** Slugs sharing a colour with at least one other Astra. */
  duplicateAccents: (() => {
    const byColor = new Map<string, string[]>();
    for (const a of ASTRA_CATALOG) {
      const seen = byColor.get(a.accent);
      if (seen) seen.push(a.slug);
      else byColor.set(a.accent, [a.slug]);
    }
    return [...byColor.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([color, slugs]) => ({ color, slugs }));
  })(),
  /** Astras claiming a red, against ASTRA_STANDARD v1.2 item 14. */
  reservedRedAstras: ASTRA_CATALOG.filter((a) => isReservedRed(a.accent)).map((a) => a.slug),
} as const;

/**
 * Red is reserved for errors platform-wide. This is a coarse test on purpose —
 * it is a flag for a human to rule on, not a gate that rejects a colour.
 */
export function isReservedRed(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Dominantly red, and not merely a warm brown or a terracotta: red must lead
  // both other channels by a clear margin.
  return r > 150 && r - g > 90 && r - b > 90;
}

/* ─────────────────────── 4. THE L1–L4 TONAL RAMP ────────────────────── */

/**
 * Taxonomy depth, 1–4. L1 is a realm root (Justice, Science…); L4 is three
 * levels beneath it. Depth past 4 clamps to L4 — the ramp is a depth CUE, not
 * a counter, and a fifth distinguishable step does not exist at these values.
 */
export type RealmDepth = 1 | 2 | 3 | 4;

/**
 * The tonal depth gradient. Every value is drawn from the locked April-20
 * palette ladder in `index.css` (--bg → --bg-elevated → --panel → --panel-2 and
 * one step past it), so the ramp reads as the same material getting closer to
 * the surface rather than as four new colours.
 *
 * DEEPER TAXONOMY = LIGHTER TONE. Drilling in is coming UP out of the black,
 * which is the direction that matches the black top bar sitting behind
 * everything: the further in you are, the further you have risen off the spine.
 */
export const REALM_DEPTH_TONE: Record<RealmDepth, string> = {
  1: '#0F1014',
  2: '#14171C',
  3: '#191D24',
  4: '#1E232B',
};

/** Hairline above each toolbar level — one step brighter than its own fill. */
export const REALM_DEPTH_EDGE: Record<RealmDepth, string> = {
  1: '#1F252C',
  2: '#252C34',
  3: '#2A3138',
  4: '#303840',
};

/** Clamp any taxonomy depth (0-based or unbounded) onto the 1–4 ramp. */
export function realmDepth(level: number): RealmDepth {
  if (level <= 1) return 1;
  if (level >= 4) return 4;
  return level as RealmDepth;
}

/** Fill + edge for a taxonomy level, clamped. */
export function realmDepthTone(level: number): { background: string; borderColor: string } {
  const d = realmDepth(level);
  return { background: REALM_DEPTH_TONE[d], borderColor: REALM_DEPTH_EDGE[d] };
}

/* ─────────────────────────── 5. THE DROP ────────────────────────────── */

/** BLiNG! honey. The drop is always this colour; it never wears an accent. */
export const SPINE_HONEY = '#FAD15E';

/**
 * The window event that makes the drop hop. Fired on SIDEBAR OPEN — the
 * design's stated trigger — and listened for by whatever is rendering the drop,
 * so the sidebar never needs a handle on the header.
 *
 * A window event rather than shared state because the two ends sit in different
 * layout trees: the black shell's header and the community shell's sidebar are
 * mounted by different routes and share no provider.
 */
export const BLING_HOP_EVENT = 'bling-hop';

/** How long the hop runs — must match `animate-bling-hop` in tailwind.config.ts. */
export const BLING_HOP_MS = 900;

/** Fire the hop. Safe to call during SSR/tests, where there is no window. */
export function fireBlingHop(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BLING_HOP_EVENT));
}
