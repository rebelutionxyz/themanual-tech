/* THE SPINE — the chrome every Astra and every page shares.
 *
 * Source: ORACLE_MF v1.23 "SPINE TRUTH", restating MMF §7.2 / §15.1 (locked
 * Apr 25, 2026) and §12 (locked Apr 26). v1.23 is the WORKING design source
 * because ORACLE_MF v1.28 records the MMF itself as UNREACHABLE in Drive; when
 * the MMF is restored, it wins on any conflict, per house precedence.
 *
 * ─── WHAT REMAINS MOUNTED ───────────────────────────────────────────────────
 *   1. TOP BAR    always black SPINE_BLACK. No realm tinting of the bar itself.
 *   4. TOOLBARS   realm toolbars run the L1–L4 tonal depth gradient.
 *
 * ─── WHAT FRONT78 RETIRED, and why the numbering keeps the gaps ─────────────
 * FRONT74 built five elements. Three came out again four passes later, by owner
 * word, and NONE OF THEM EVER SHIPPED — FRONT74 was committed and never pushed,
 * so no user saw any of this.
 *
 *   2. LEFT RAIL  — "the line on the left of the sidebar needs to be deleted
 *                   from all pages." The chrome died; the RESOLUTION lives on as
 *                   `useRealmAccent()` in hooks/useSpine.ts, because realm
 *                   identity still has to be answerable.
 *   3. RIGHT RAIL — the always-on band went with it (lead's read of a band-less
 *                   v0.2 approval, flagged as inference in the FRONT78 report).
 *                   `ASTRA_ACCENT_RING` and `useConstellationAccent()` survive
 *                   and still drive the admin-gated ConstellationRail.
 *   5. THE DROP   — "its h24.tech not themanual we dont need the bling drop."
 *                   The drop, its hop, the `bling-hop` event and the honey
 *                   constant are all gone from this module.
 *
 * THE ORIGINAL NUMBERS ARE KEPT rather than renumbered to 1 and 2. Four passes
 * of reports, commits and canon rows refer to "spine element 3" and "spine
 * element 5"; renumbering would silently redirect every one of those to the
 * wrong thing. A gap in a list is cheaper than a wrong reference.
 *
 * This module holds the VALUES and the derivations. It deliberately holds no
 * JSX: the same ring feeds more than one consumer, the same ramp feeds three
 * trees, and a value that lives in one component cannot be reused by the next.
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
 *  A. COUNT — CLOSED by FRONT76 (2026-08-18). ORACLE_MF v1.26 R9 made Workshop
 *     an Astra and put the registry — and with it "the accent table" — at 41
 *     rows; the catalog held 40 and had no `workshop` entry, so the ring was 40
 *     long. FRONT74 declined to add the row because doing so meant inventing a
 *     colour. FRONT76 added it with the file's EXISTING placeholder grey rather
 *     than a new hue, which registers the Astra without making a taste decision.
 *     `countMatchesCanon` below now reports true, and it is COMPUTED — if either
 *     number moves again, the finding reopens itself rather than going stale.
 *
 *  B. UNIQUENESS. The ring is not injective: three colours are shared by more
 *     than one Astra, so those pages rotate to a band a viewer cannot tell
 *     apart from another Astra's. A rotation that repeats is still a rotation,
 *     so this degrades the signal rather than breaking it.
 *
 *  C. THE RESERVED HUE. ASTRA_STANDARD v1.2 item 14: "RED IS GLOBAL, MEANS
 *     ERROR, AND BELONGS TO NO ASTRA." Two catalog rows carry #DC2626.
 *
 * B AND C RIDE UNTIL 2027 by owner word — R-COLOR (ORACLE_MF v1.34,
 * 2026-08-18): "Brandosophic is a 2027 problem." They stay measured here rather
 * than being quietly dropped: a parked finding is still a finding, and the
 * rotation was built to survive the table being replaced wholesale, so parking
 * costs nothing structural.
 */
export const SPINE_ACCENT_FINDINGS = {
  /** Rows in the accent table today. */
  catalogRows: ASTRA_CATALOG.length,
  /** Rows canon calls for — ORACLE_MF v1.26 R9. */
  canonRows: 41,
  /**
   * Finding A, computed rather than asserted. True since FRONT76 registered
   * `workshop`. Deriving it means this cannot rot into a comment that claims
   * a state the data has since left.
   */
  countMatchesCanon: ASTRA_CATALOG.length === 41,
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
  /**
   * Astras the heuristic flags as claiming a red, against ASTRA_STANDARD v1.2
   * item 14. CARRIES THE HEX, not just the slug — FRONT76 found that it had to.
   *
   * FRONT74's report said "two Astras carry #DC2626", and ORACLE_MF v1.33 wrote
   * that number into canon. Both are wrong in different directions, and the
   * export was the only thing telling the truth: it flags SEVEN, because
   * `isReservedRed` is deliberately coarse and catches oranges — `learning`
   * #E88938, `events` #F97316, `freedomnetwork` #C1440E are not reds by any
   * reading. The genuinely red-family set is FOUR across three colours:
   * `pulse` and `dingleberry` (#DC2626), `legalservices` (#C94C4C), `justice`
   * (#B23A48).
   *
   * THE THRESHOLD WAS NOT RETUNED. Colours are parked to 2027 by owner word
   * (R-COLOR), and moving the cutoff is a taste decision wearing a bugfix's
   * clothes. Emitting the hex alongside the slug costs nothing and lets whoever
   * rules on this see the actual colours instead of trusting a boolean.
   */
  reservedRedAstras: ASTRA_CATALOG.filter((a) => isReservedRed(a.accent)).map((a) => ({
    slug: a.slug,
    accent: a.accent,
  })),
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

/* ───────────────── 5. THE DROP — RETIRED, FRONT78 ───────────────────── */

/* `SPINE_HONEY`, `BLING_HOP_EVENT`, `BLING_HOP_MS` and `fireBlingHop()` stood
   here. All four are gone: they existed only to drive the spine drop, and the
   owner retired it ("we dont need the bling drop").

   Nothing was left behind as a stub. An exported constant with no caller is a
   trap — it reads as a supported seam, and the next pass wires something to it
   believing the element still exists. The honey colour itself is not lost: it is
   `--honey` in index.css and a local constant in each surface that draws the
   BLiNG! mark, none of which went through this module. */
