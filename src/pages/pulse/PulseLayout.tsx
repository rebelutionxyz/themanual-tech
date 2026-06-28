import { Outlet } from 'react-router-dom';
import { RealmStrip } from '@/components/shell/RealmStrip';

/**
 * Shared layout for all PULSE / Freedom Network routes.
 *
 * Mounts the platform's lens-driven realm strip above the surface content.
 * Selecting a realm sets the shared lens (useLensStore.path = realm-name
 * prefix), which PulseHome reads to filter live-now + library. The strip
 * persists across the home, watch and channel routes.
 */
export function PulseLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <RealmStrip />
      <main className="min-w-0 flex-1 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
}
