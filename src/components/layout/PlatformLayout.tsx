import { Outlet } from 'react-router-dom';
import { PlatformRail } from './PlatformRail';

export function PlatformLayout() {
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Main surface area */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Right: 19-surface icon rail + hover/click popups + mobile drawer */}
      <PlatformRail />
    </div>
  );
}
