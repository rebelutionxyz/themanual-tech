import { Outlet } from 'react-router-dom';
import { PlatformRail } from './PlatformRail';
import { useAstra } from '@/lib/astras/AstraContext';
import { useManualStore } from '@/stores/useManualStore';
import { REALM_COLORS, SILVER } from '@/lib/constants';

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
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left: realm-accent strip (closed sidebar per §15.1) */}
      <RealmStrip />

      {/* Main surface area */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Right: 19-surface icon rail + hover/click popups + mobile drawer */}
      <PlatformRail />
    </div>
  );
}
