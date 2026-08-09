import { SidebarPromotedSlot } from '@/components/promotions/SidebarPromotedSlot';
import { ConstellationRail } from '@/components/shell/ConstellationRail';
import { useAstra } from '@/lib/astras/AstraContext';
import { REALM_COLORS, SILVER } from '@/lib/constants';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { useManualStore } from '@/stores/useManualStore';
import { Outlet } from 'react-router-dom';

/**
 * Left realm-accent strip per MMF §15.1 (closed sidebar = realm accent).
 * Always visible, ~3px wide. Color resolution order:
 *   1. selectedRealmId set        → REALM_COLORS[id]
 *   2. astra host (no realm)     → astra.accent
 *   3. foundation (themanual.tech) → SILVER (canonical, §15.5 / 13-hex flower)
 */
function RealmStrip() {
  const astra = useAstra();
  const selectedRealmId = useManualStore((s) => s.selectedRealmId);
  const color = selectedRealmId
    ? REALM_COLORS[selectedRealmId]
    : (astra?.accent ?? SILVER);
  return (
    <div
      aria-hidden="true"
      className="h-full w-[3px] flex-shrink-0 transition-colors duration-300"
      style={{ background: color }}
      data-realm-strip={selectedRealmId ?? (astra?.slug ?? 'foundation')}
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
    </div>
  );
}
