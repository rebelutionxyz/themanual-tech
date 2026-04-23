import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useManualData } from '@/lib/useManualData';
import { RealmBar } from '@/components/intel/RealmBar';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { useIntelStore } from '@/stores/useIntelStore';
import { REALM_ORDER } from '@/lib/constants';
import type { Front } from '@/types/manual';

/**
 * Shared layout for all INTEL routes.
 * Keeps left INTEL sidebar + top realm bar visible across:
 *   /intel          → thread list (activeView drives sort/mode)
 *   /intel/mine     → my threads (author = current Bee)
 *   /intel/saved    → saved threads (reserved — state-only today, URL planned)
 *   /intel/new      → composer
 *   /intel/t/:id    → thread detail
 *
 * Child routes render inside the <Outlet />.
 *
 * URL ↔ activeView sync: dedicated sub-routes (like /intel/mine) set the
 * corresponding activeView + clear realm filters on entry. This makes views
 * shareable, bookmarkable, and refresh-safe. Future views (saved, following,
 * forme) should follow the same pattern — see VIEW_ROUTE_MAP below.
 */

// Map sub-routes → view identity. Extend here when adding new top-level INTEL views.
const VIEW_ROUTE_MAP: Record<string, IntelView> = {
  '/intel/mine': 'mythreads',
};

// Views that should show "unfiltered across all realms" (wipe realm/front/L2/L3 on entry).
const UNFILTERED_VIEWS: IntelView[] = ['mythreads', 'saved', 'home'];

export function IntelLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { atoms, loaded } = useManualData();

  const {
    selectedRealm,
    selectedFront,
    selectedL2,
    activeView,
    setRealm,
    setFront,
    setL2,
    setL3,
    setActiveView,
  } = useIntelStore();

  // URL → activeView sync. When the user navigates to /intel/mine directly
  // (deep link, refresh, shared URL), promote that route's view into store
  // state and clear realm filters so the view presents cleanly.
  useEffect(() => {
    const view = VIEW_ROUTE_MAP[location.pathname];
    if (view && view !== activeView) {
      setActiveView(view);
      if (UNFILTERED_VIEWS.includes(view)) {
        setRealm(null);
        setFront(null);
        setL2(null);
        setL3(null);
      }
    }
    // Intentionally exclude activeView from deps — we only want to react to
    // route changes, not state-driven activeView changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

    // Route-backed views: navigate to their dedicated URL. useEffect above
    // picks up the path change and syncs activeView + clears filters.
    if (view === 'mythreads') {
      navigate('/intel/mine');
      return;
    }

    // Non-route views: ensure we're on /intel root, then set state directly.
    if (location.pathname !== '/intel') {
      navigate('/intel');
    }
    // "Home" resets all realm/front/L2/L3 filters (fully unfiltered view)
    if (view === 'home') {
      setRealm(null);
      setFront(null);
      setL2(null);
      setL3(null);
    }
    // Saved view: clear filters too (best practice — "show me mine everywhere")
    if (view === 'saved') {
      setRealm(null);
      setFront(null);
      setL2(null);
      setL3(null);
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: INTEL sidebar (full height, outside realm bar column) */}
      <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

      {/* Main column: realm bars on top, content below */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <RealmBar
          selectedRealm={selectedRealm}
          selectedFront={selectedFront}
          selectedL2={selectedL2}
          onSelectRealm={(r) => {
            setRealm(r);
            // When user picks a realm from /intel/mine (or any sub-route),
            // return to the main /intel root so realm filter applies.
            if (location.pathname !== '/intel') {
              navigate('/intel');
              setActiveView('hot');
            }
          }}
          onSelectFront={(f) => {
            setFront(f);
            if (location.pathname !== '/intel') {
              navigate('/intel');
              setActiveView('hot');
            }
          }}
          onSelectL2={(l2) => {
            setL2(l2);
            if (location.pathname !== '/intel') {
              navigate('/intel');
              setActiveView('hot');
            }
          }}
          onResetL3={() => setL3(null)}
          realmSubs={realmSubs}
        />

        {/* Content */}
        <main
          className="min-w-0 flex-1 overflow-y-auto"
          style={{
            background: 'rgba(107, 148, 200, 0.10)',
          }}
        >
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
