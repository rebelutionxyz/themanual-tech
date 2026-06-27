import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RealmBar } from '@/components/intel/RealmBar';
import { usePulseStore } from '@/stores/usePulseStore';

/**
 * Shared layout for all PULSE / Freedom Network routes.
 * Keeps the 14-realm strip (reused from INTEL) above the surface content.
 * Selecting a realm filters live-now + library; picking one from a stub
 * route bounces back to the FN home where the lists live.
 */
export function PulseLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRealmId, setRealmId } = usePulseStore();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <RealmBar
        selectedRealmId={selectedRealmId}
        selectedL2={null}
        onSelectRealmId={(r) => {
          setRealmId(r);
          if (location.pathname !== '/pulse') navigate('/pulse');
        }}
        onSelectL2={() => {}}
        realmSubs={{}}
      />
      <main
        className="min-w-0 flex-1 overflow-y-auto"
        style={{ background: 'rgba(201, 76, 76, 0.05)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
