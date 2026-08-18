import { SidebarPromotedSlot } from '@/components/promotions/SidebarPromotedSlot';
import { ConstellationRail } from '@/components/shell/ConstellationRail';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { Outlet } from 'react-router-dom';

/* FRONT78 — THE TWO EDGE RAILS ARE GONE.
 *
 * Owner, verbatim: "the line on the left of the sidebar needs to be deleted from
 * all pages." That retires the left realm strip FRONT74 added here. The
 * ConstellationBand on the right goes with it — the lead's read of the owner
 * approving a band-less v0.2 plus the v1.36 recommendation on record, which is
 * an inference rather than a quoted instruction and is flagged as such in the
 * FRONT78 report. One word restores either.
 *
 * NEITHER EVER SHIPPED. FRONT74 was committed and never pushed, so no user has
 * seen these rails; this removes something that only existed in the tree.
 *
 * WHAT SURVIVED AND WHERE IT WENT, because "delete the chrome" is not "delete
 * the idea":
 *   * the realm-accent RESOLUTION → `useRealmAccent()` in hooks/useSpine.ts.
 *     Realm identity still has to be answerable for the switcher and for
 *     whatever surface claims it next; the 3px strip was merely its first
 *     consumer, not its purpose.
 *   * the rotation → `useConstellationAccent()`, still read by ConstellationRail
 *     below.
 *   * the accent DATA → untouched in lib/astra-catalog.ts.
 *
 * The layout needs no compensation for either removal. Both were
 * `flex-shrink-0` siblings of a `flex-1` <main>, so main reclaims the width at
 * every breakpoint and there is no placeholder left behind.
 */
export function PlatformLayout() {
  // Right PlatformRail retired platform-wide (dispatch A2) — surface-switching
  // was the toolbar's Astras popup. FRONT21 restores a right column, but NOT
  // that rail: this is the §15.1 rotating CONSTELLATION rail (the full derived
  // Astra set, accent rotating per page change), which the retired rail never
  // was. The promoted slot keeps its own column and still hides when empty.
  //
  // FRONT31 (owner ruling 2026-08-08): THE CONSTELLATION IS AN ADMIN TOOL. The
  // rail listed all Astras with their build states — including everything
  // unbuilt — to signed-out visitors on every platform surface. Admins only now.
  //
  // Note the gate is on RENDER, not on CSS: a non-admin never mounts the rail,
  // so ConstellationRail's rotation effect never runs and the catalog never
  // reaches the DOM. `loading` renders nothing too — otherwise the rail would
  // flash for everyone on first paint, before the is_admin lookup settles.
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main surface area — the surface layout/page owns its internal scroll. */}
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Right: promoted slot (independent of the retired rail; hides when empty) */}
      <SidebarPromotedSlot className="m-2 hidden w-64 flex-shrink-0 self-start lg:block" />

      {/* Right: the rotating constellation LIST (§15.1), admin-gated per FRONT31.
          lg+ only; below that /constellation is the full-page equivalent, also
          admin-gated. This is the last consumer of `useConstellationAccent`. */}
      {!adminLoading && isAdmin && (
        <ConstellationRail className="hidden w-52 flex-shrink-0 lg:flex" />
      )}
    </div>
  );
}
