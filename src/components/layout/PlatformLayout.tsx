import { SidebarPromotedSlot } from '@/components/promotions/SidebarPromotedSlot';
import { ConstellationBand } from '@/components/shell/ConstellationBand';
import { ConstellationRail } from '@/components/shell/ConstellationRail';
import { useAstra } from '@/lib/astras/AstraContext';
import { REALM_COLORS, SILVER } from '@/lib/constants';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { useManualStore } from '@/stores/useManualStore';
import type { RealmId } from '@/types/manual';
import { Outlet, useParams } from 'react-router-dom';

/**
 * SPINE 2 — the LEFT rail: the closed sidebar wearing the CURRENT REALM accent,
 * per MMF §15.1. Always visible, 3px wide.
 *
 * Colour resolution order:
 *   1. the ROUTE says which realm    → /realm/:realmId
 *   2. selectedRealmId in the store  → REALM_COLORS[id]
 *   3. astra host, no realm          → astra.accent
 *   4. foundation (themanual.tech)   → SILVER (canonical, §15.5 / 13-hex flower)
 *
 * FRONT74 ADDED STEP 1, and it is the step that makes this a spine element
 * rather than decoration. The design says the rail "switches as the user
 * navigates realms". Measured on a running build before the fix: navigating to
 * /realm/justice left the rail on `foundation` silver, because `selectedRealmId`
 * is only written when something explicitly picks a realm — walking into a realm
 * URL never sets it. The rail was therefore correct on the manual surface and
 * inert everywhere else, which is the half of the behaviour nobody would notice
 * was missing.
 *
 * The route is consulted FIRST, not last: where you are beats what you last
 * picked. A stale `selectedRealmId` from a previous surface must not repaint the
 * rail against the realm the URL is actually naming.
 */
function RealmStrip() {
  const astra = useAstra();
  const selectedRealmId = useManualStore((s) => s.selectedRealmId);
  const { realmId: routeRealmId } = useParams();

  // `useParams` is untyped at the route boundary, so a bad segment must not
  // index REALM_COLORS blindly — /realm/nonsense would otherwise paint the rail
  // `undefined` and the transition would flicker to transparent.
  const routeRealm =
    routeRealmId && routeRealmId in REALM_COLORS ? (routeRealmId as RealmId) : null;
  const activeRealm = routeRealm ?? selectedRealmId;

  const color = activeRealm ? REALM_COLORS[activeRealm] : (astra?.accent ?? SILVER);
  return (
    <div
      aria-hidden="true"
      className="h-full w-[3px] flex-shrink-0 transition-colors duration-300"
      style={{ background: color }}
      data-spine="left-rail"
      data-realm-strip={activeRealm ?? (astra?.slug ?? 'foundation')}
    />
  );
}

export function PlatformLayout() {
  // Right PlatformRail retired platform-wide (dispatch A2) — surface-switching
  // was the toolbar's Astras popup. FRONT21 restores a right column, but NOT
  // that rail: this is the §15.1 rotating CONSTELLATION rail (the full derived
  // Astra set, accent rotating per page change), which the retired rail never
  // was. The promoted slot keeps its own column and still hides when empty.
  //
  // FRONT31 (owner ruling 2026-08-08): THE CONSTELLATION IS AN ADMIN TOOL. The
  // rail listed all 40 Astras with their build states — including everything
  // unbuilt — to signed-out visitors on every platform surface. Admins only now.
  //
  // Note the gate is on RENDER, not on CSS: a non-admin never mounts the rail,
  // so ConstellationRail's rotation effect never runs and the catalog never
  // reaches the DOM. `loading` renders nothing too — otherwise the rail would
  // flash for everyone on first paint, before the is_admin lookup settles.
  //
  // No layout compensation is needed. The rail is a flex sibling with a fixed
  // w-52; the <main> beside it is flex-1, so when the rail is absent main takes
  // the width back at every breakpoint. There is no placeholder to leave a gap.
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left: realm-accent strip (closed sidebar per §15.1) */}
      <RealmStrip />

      {/* Main surface area — the surface layout/page owns its internal scroll. */}
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Right: promoted slot (independent of the retired rail; hides when empty) */}
      <SidebarPromotedSlot className="m-2 hidden w-64 flex-shrink-0 self-start lg:block" />

      {/* Right: the rotating constellation (§15.1). lg+ — the same breakpoint
          the promoted slot uses, so a laptop shows the constellation rather
          than hiding the spine's second sidebar. Below lg it collapses and
          /constellation is the full-page equivalent (also admin-gated). */}
      {!adminLoading && isAdmin && (
        <ConstellationRail className="hidden w-52 flex-shrink-0 lg:flex" />
      )}

      {/* FRONT74 — SPINE 3, the right rail in its CLOSED state. Always rendered,
          at every breakpoint, for every viewer: it is spine, and the left rail
          opposite it has never been gated either. It carries the rotating accent
          and nothing else — no names, no build states — which is what lets it
          coexist with FRONT31's admin gate on the LIST above. See
          ConstellationBand for the full reading of that conflict.

          It sits AFTER the rail so the page reads left-to-right as
          realm | content | promoted | constellation-list | constellation-edge,
          with the two 3px rails as the outermost pair. */}
      <ConstellationBand />
    </div>
  );
}
