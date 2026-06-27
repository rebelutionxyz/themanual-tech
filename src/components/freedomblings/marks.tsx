/* FreedomBLiNGS — the BLiNG! marks: a DROP OF HONEY (gold).
   Canon = the Apr'20 logo lock (Butch override of the handoff README, which had
   called for a diamond). The mark is a honey drop — pointing DOWN, a drip of
   honey — in the gold accent family. Platform marks only: NOT a hexagon, NOT a
   diamond. Component names/props are unchanged so call sites don't churn. */

/* Canonical honey-drop path (viewBox 0 0 24 24): narrow at the top where it
   trails from the source, round bulb hanging below — a drip pointing down. */
const DROP = 'M12 2.4C12 2.4 5.4 11 5.4 15.6a6.6 6.6 0 1 0 13.2 0C18.6 11 12 2.4 12 2.4Z';

/** Wordmark/brand mark — a gold honey drop. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'block', flex: 'none' }}
      aria-hidden="true"
    >
      <path
        d={DROP}
        fill="var(--accent)"
        stroke="var(--accent-deep)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline mark beside numbers / in prose — a small honey drop.
    `fill` = solid gold drop; otherwise a gold outline drop. */
export function BMark({ fill = false }: { fill?: boolean }) {
  return (
    <svg
      className={fill ? 'bmark fill' : 'bmark'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={DROP}
        fill={fill ? 'var(--accent)' : 'none'}
        stroke="var(--accent-deep)"
        strokeWidth={fill ? 1.6 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Big balance mark — a larger honey drop with a gleam (reads as honey). */
export function HeroMark() {
  return (
    <svg className="heromark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={DROP}
        fill="var(--accent)"
        stroke="var(--accent-deep)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* the gleam — a soft highlight on the bulb */}
      <ellipse
        cx="9.4"
        cy="13.4"
        rx="1.7"
        ry="2.5"
        fill="#fff"
        opacity="0.5"
        transform="rotate(-18 9.4 13.4)"
      />
    </svg>
  );
}

/** Constellation-launcher glyph — a 2×2 grid of tiles (the Astras), top-left lit.
    Tiles, not diamonds — this is the launcher affordance, not the BLiNG! mark. */
export function LauncherGlyph() {
  return (
    <span className="launch-glyph" aria-hidden="true">
      <i className="lit" />
      <i />
      <i />
      <i />
    </span>
  );
}
