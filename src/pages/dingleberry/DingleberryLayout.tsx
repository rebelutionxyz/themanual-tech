import { Outlet, useOutletContext } from 'react-router-dom';
import { DingleberrySidebar } from '@/components/dingleberry/DingleberrySidebar';
import { useDingleberryData } from '@/lib/dingleberry/useDingleberryData';
import type { DingleberrySnapshot, Posture } from '@/lib/dingleberry/contract';

/**
 * Shared layout for all DingleBERRY routes. Mirrors IntelLayout:
 *   - owns the single source of data + posture (useDingleberryData)
 *   - keeps the left DingleBERRY sidebar visible across every screen
 *   - hands {data, posture, setPosture} to nested screens via Outlet context,
 *     so one posture switch drives the whole surface (Command Center + drills)
 *
 * The artifact's own TopBar + RightRail are intentionally DROPPED — the repo's
 * PlatformLayout chrome (SiteHeader / utility rail) wraps this surface already.
 */

export interface DingleberryContextValue {
  data: DingleberrySnapshot | null;
  posture: Posture;
  setPosture: (p: Posture) => void;
}

export function DingleberryLayout() {
  const { data, posture, setPosture } = useDingleberryData();

  return (
    <div className="flex h-full overflow-hidden">
      <DingleberrySidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
        <Outlet context={{ data, posture, setPosture } satisfies DingleberryContextValue} />
      </main>
    </div>
  );
}

/** Typed accessor for the shared DingleBERRY data/posture inside any screen. */
export function useDingleberry(): DingleberryContextValue {
  return useOutletContext<DingleberryContextValue>();
}
