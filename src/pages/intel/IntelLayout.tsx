import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useManualData } from '@/lib/useManualData';
import { RealmBar } from '@/components/intel/RealmBar';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { useIntelStore } from '@/stores/useIntelStore';
import { REALM_ORDER } from '@/lib/constants';
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
  const { atoms, loaded } = useManualData();

  const {
    selectedRealmId,
    selectedL2,
    activeView,
    setRealmId,
    setL2,
    setL3,
    setActiveView,
  } = useIntelStore();

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-syncs store on route change; including store actions/state would cause unwanted re-runs
  useEffect(() => {
    const view = VIEW_ROUTE_MAP[location.pathname];
    if (view && view !== activeView) {
      setActiveView(view);
      if (UNFILTERED_VIEWS.includes(view)) {
        setRealmId(null);
        setL2(null);
        setL3(null);
      }
    }
  }, [location.pathname]);

  const realmSubs = useMemo(() => {
    if (!loaded) return {} as Partial<Record<RealmId, string[]>>;
    const subs: Partial<Record<RealmId, Set<string>>> = {};
    for (const realmId of REALM_ORDER) subs[realmId] = new Set<string>();
    for (const atom of atoms) {
      const l2 = atom.pathParts[1];
      if (l2) subs[atom.realmId]?.add(l2);
    }
    const result: Partial<Record<RealmId, string[]>> = {};
    for (const realmId of REALM_ORDER) {
      result[realmId] = Array.from(subs[realmId] ?? []).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [atoms, loaded]);

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
    if (view === 'home') {
      setRealmId(null);
      setL2(null);
      setL3(null);
    }
    if (view === 'saved') {
      setRealmId(null);
      setL2(null);
      setL3(null);
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <RealmBar
          selectedRealmId={selectedRealmId}
          selectedL2={selectedL2}
          onSelectRealmId={(r) => {
            setRealmId(r);
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
  realmId: RealmId | null,
  l2: string | null,
): string {
  const params = new URLSearchParams();
  if (realmId) params.set('realm', realmId);
  if (l2) params.set('l2', l2);
  const qs = params.toString();
  return qs ? `/intel/new?${qs}` : '/intel/new';
}
