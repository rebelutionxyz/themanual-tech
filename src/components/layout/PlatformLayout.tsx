import { SidebarPromotedSlot } from '@/components/promotions/SidebarPromotedSlot';
import { Outlet } from 'react-router-dom';

/* FRONT82 — THE CONSTELLATION RAIL IS GONE (ORACLE_MF v1.52 de-scatter).
 *
 * Owner, verbatim: "mission control of the rail not the constellation. I never
 * have understood why it was added all over themanual." The rotating §15.1
 * ConstellationRail that this layout mounted on EVERY platform surface — a
 * link-list to astra routes — was the scattered navigation the owner never
 * asked for (root cause: the unreachable MMF right-sidebar-spine line treated as
 * canon). It is removed as navigation here; the SANCTIONED ways to move between
 * astras are now the shared ROOMS button (user transport, FRONT80) and the
 * admin quick-access list on /hq (FRONT82).
 *
 * WHAT SURVIVED, because "delete the nav" is not "delete the idea":
 *   * the accent DATA and the ASTRA_CATALOG — untouched in lib/astra-catalog.ts.
 *   * `useConstellationAccent()` / `useRealmAccent()` in hooks/useSpine.ts — kept
 *     as shared infra (the switcher and future surfaces read them), even though
 *     the rail was their last consumer.
 *   * the /hq Astra Status monitoring panel and /constellation page — admin
 *     surfaces, untouched by this pass (see the FRONT82 report).
 *
 * The layout needs no compensation: the rail was a `flex-shrink-0` sibling of a
 * `flex-1` <main>, so main reclaims the width and no placeholder is left behind.
 */
export function PlatformLayout() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Main surface area — the surface layout/page owns its internal scroll. */}
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Right: promoted slot (independent of the retired rail; hides when empty) */}
      <SidebarPromotedSlot className="m-2 hidden w-64 flex-shrink-0 self-start lg:block" />
    </div>
  );
}
