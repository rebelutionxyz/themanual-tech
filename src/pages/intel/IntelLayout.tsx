import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useManualData } from '@/lib/useManualData';
import { RealmBar } from '@/components/intel/RealmBar';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { useIntelStore } from '@/stores/useIntelStore';
import { REALM_ORDER } from '@/lib/constants';
import type { Front } from '@/types/manual';

/**
 * Shared layout for all INTEL routes.
 * Keeps left INTEL sidebar + top realm bar visible across:
 *   /intel          → thread list
 *   /intel/new      → composer
 *   /intel/t/:id    → thread detail
 *
 * Child routes render inside the <Outlet />.
 */
export function IntelLayout() {
  const navigate = useNavigate();
  const { atoms, loaded } = useManualData();

  const {
    selectedRealm,
    selectedFront,
    selectedL2,
    activeView,
    setRealm,
    setFront,
    setL2,
    setActiveView,
  } = useIntelStore();

  // L2 options per realm, computed from atoms
  const realmSubs = useMemo(() => {
    if (!loaded) return {};
    const subs: Record<string, Set<string>> = {};
    for (const realm of REALM_ORDER) subs[realm] = new Set<string>();
    for (const atom of atoms) {
      if (atom.L2 && subs[atom.realm]) subs[atom.realm].add(atom.L2);
    }
    const result: Record<string, string[]> = {};
    for (const [realm, set] of Object.entries(subs)) {
      result[realm] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [atoms, loaded]);

  function handleSidebarSelect(view: IntelView) {
    if (view === 'create') {
      navigate(buildNewThreadUrl(selectedRealm, selectedFront, selectedL2));
      return;
    }
    // If we're not on /intel root and the user picks a different view, go home
    if (window.location.pathname !== '/intel') {
      navigate('/intel');
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: INTEL internal sidebar (persists across all /intel/* routes) */}
      <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top: realm bar (persists across all /intel/* routes) */}
        <RealmBar
          selectedRealm={selectedRealm}
          selectedFront={selectedFront}
          selectedL2={selectedL2}
          onSelectRealm={(r) => {
            setRealm(r);
            // When realm changes while viewing thread/composer, navigate back to /intel
            if (window.location.pathname !== '/intel') {
              navigate('/intel');
            }
          }}
          onSelectFront={(f) => {
            setFront(f);
            if (window.location.pathname !== '/intel') {
              navigate('/intel');
            }
          }}
          onSelectL2={(l2) => {
            setL2(l2);
            if (window.location.pathname !== '/intel') {
              navigate('/intel');
            }
          }}
          realmSubs={realmSubs}
        />

        {/* Content: child route renders here */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Build /intel/new URL with optional realm context params */
export function buildNewThreadUrl(
  realm: string | null,
  front: Front | null,
  l2: string | null,
): string {
  const params = new URLSearchParams();
  if (realm) params.set('realm', realm);
  if (front) params.set('front', front);
  if (l2) params.set('l2', l2);
  const qs = params.toString();
  return qs ? `/intel/new?${qs}` : '/intel/new';
}
