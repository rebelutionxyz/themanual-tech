import { Outlet } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';

export function PlatformLayout() {
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left: 19-surface sidebar */}
      <aside className="hidden md:block">
        <PlatformSidebar />
      </aside>

      {/* Main surface area */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
