/* SPINE 3 — THE RIGHT RAIL, closed state.
 *
 * "RIGHT sidebar rotates through the ASTRA accent colours per page change"
 * (MMF §15.1, locked Apr 25; restated ORACLE_MF v1.23). The rotation is
 * CONSTELLATION IDENTITY, not taxonomy: it says "you are inside a constellation
 * of many worlds", independent of which realm you are reading. That is why it
 * steps on page change rather than tracking the current Astra — a signal that
 * merely named where you are would be a breadcrumb, not a constellation.
 *
 * ─── WHY THIS COMPONENT EXISTS AT ALL, and the conflict it resolves ─────────
 *
 * Two canon lines pull opposite ways and FRONT74 was told to flag rather than
 * silently pick a side, so it does BOTH and splits the element instead:
 *
 *   * MMF §15.1 / ORACLE_MF v1.23 (Apr 25): the right sidebar is SPINE. Spine is
 *     by definition on every Astra and every page, for everyone.
 *   * FRONT31 (owner ruling, 2026-08-08): "THE CONSTELLATION IS AN ADMIN TOOL."
 *     The rail was listing all 40 Astras and their build states — including
 *     everything unbuilt — to signed-out visitors on every surface.
 *
 * Read closely those rule different things. The owner's objection was to
 * PUBLISHING THE BUILD STATE OF UNBUILT WORLDS, not to a colour. So:
 *
 *   THIS BAND — the rotating accent, no names, no statuses, nothing legible as
 *   a roadmap — renders for EVERYONE. It is the spine element.
 *   ConstellationRail — the LIST, which is what FRONT31 actually objected to —
 *   stays admin-gated, unchanged.
 *
 * Both read the same `useConstellationAccent()`, so an admin sees one colour,
 * not two. FLAGGED FOR THE OWNER rather than treated as settled: if the intent
 * of FRONT31 was that nothing constellation-shaped shows to the public at all,
 * this band is the thing to delete, and deleting it is one line in
 * PlatformLayout.
 */

import { useConstellationAccent } from '@/hooks/useSpine';
import { cn } from '@/lib/utils';

export function ConstellationBand({ className }: { className?: string }) {
  const accent = useConstellationAccent();

  return (
    <div
      aria-hidden="true"
      /* Mirrors the left RealmStrip exactly — same 3px, same transition — so the
         two rails read as one spine bracketing the page rather than as two
         unrelated stripes that happen to sit at the edges. The 500ms is slower
         than the left rail's 300ms on purpose: the realm accent answers a
         deliberate act (the user picked a realm) and should feel immediate,
         while this one drifts underneath navigation and should not pull the eye
         away from the page that just loaded. */
      className={cn('h-full w-[3px] flex-shrink-0 transition-colors duration-500', className)}
      style={{ background: accent }}
      data-spine="right-rail"
      data-constellation-accent={accent}
    />
  );
}
