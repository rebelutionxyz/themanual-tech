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
    // If we're not on /intel root, navigate there
    if (window.location.pathname !== '/intel') {
      navigate('/intel');
    }
    // "Home" resets all realm/front/L2/L3 filters (fully unfiltered view)
    if (view === 'home') {
      setRealm(null);
      setFront(null);
      setL2(null);
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top: realm bar spans FULL width (above sidebar) */}
      <RealmBar
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        onSelectRealm={(r) => {
          setRealm(r);
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

      {/* Row below realm bar: sidebar + content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: INTEL sidebar */}
        <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

        {/* Content */}
        <main className="min-w-0 flex-1 overflow-y-auto">
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
