import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import type { RealmId } from '@/types/manual';

/**
 * Shared layout for all INTEL routes.
 * Keeps left INTEL sidebar + top realm bar visible across:
 *   /intel          → thread list (activeView drives sort/mode)
 *   /intel/mine     → my threads (author = current Bee)
 *   /intel/saved    → saved threads (state-only today, URL planned)
 *   /intel/new      → composer
 *   /intel/t/:id    → thread detail
 */

const VIEW_ROUTE_MAP: Record<string, IntelView> = {
  '/intel/mine': 'mythreads',
};

const UNFILTERED_VIEWS: IntelView[] = ['mythreads', 'saved', 'home'];

export function IntelLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedRealmId,
    selectedL2,
    activeView,
    setRealmId,
    setL2,
    setL3,
    setActiveView,
  } = useIntelStore();
  const setPrefix = useLensStore((s) => s.setPrefix);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-syncs store on route change; including store actions/state would cause unwanted re-runs
  useEffect(() => {
    const view = VIEW_ROUTE_MAP[location.pathname];
    if (view && view !== activeView) {
      setActiveView(view);
      if (UNFILTERED_VIEWS.includes(view)) {
        setRealmId(null);
        setL2(null);
        setL3(null);
        setPrefix([]);
      }
    }
  }, [location.pathname]);

  // The realm lens (global toolbar) re-filters Intel IN PLACE — IntelSidebar
  // stays mounted, no navigation. Mirror the lens realm/L2/L3 into the Intel
  // store so ThreadList re-queries (approved bridge, not direct-read).
  const lensRealmId = useLensStore((s) => s.realmId);
  const lensL2 = useLensStore((s) => s.l2);
  const lensL3 = useLensStore((s) => s.l3);
  // biome-ignore lint/correctness/useExhaustiveDependencies: store setters are stable; re-sync only when the lens path changes
  useEffect(() => {
    setRealmId(lensRealmId);
    if (lensL2) setL2(lensL2);
    if (lensL3) setL3(lensL3);
  }, [lensRealmId, lensL2, lensL3]);


  function handleSidebarSelect(view: IntelView) {
    if (view === 'create') {
      navigate(buildNewThreadUrl(selectedRealmId, selectedL2));
      return;
    }

    if (view === 'mythreads') {
      navigate('/intel/mine');
      return;
    }

    if (location.pathname !== '/intel') {
      navigate('/intel');
    }
    if (view === 'home' || view === 'saved') {
      setRealmId(null);
      setL2(null);
      setL3(null);
      setPrefix([]);
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Top toolbar is now global platform chrome (mounted in App.tsx). */}
        <main
          className="min-h-0 min-w-0 flex-1 overflow-y-auto"
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
  realmId: RealmId | null,
  l2: string | null,
): string {
  const params = new URLSearchParams();
  if (realmId) params.set('realm', realmId);
  if (l2) params.set('l2', l2);
  const qs = params.toString();
  return qs ? `/intel/new?${qs}` : '/intel/new';
}
