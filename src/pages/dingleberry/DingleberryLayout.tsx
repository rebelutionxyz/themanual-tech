import { Outlet, useOutletContext } from 'react-router-dom';
import { DingleberrySidebar } from '@/components/dingleberry/DingleberrySidebar';
import { PostureSwitcher } from '@/components/dingleberry/PostureSwitcher';
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
        {/* Shared header — the mock-demo posture switcher is hoisted here so it
            drives every drill page from one shared state (was overview-only). */}
        <div className="flex flex-none items-center justify-between gap-3 border-b border-border bg-bg px-6 py-2.5">
          <span className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
            Posture · recolors every surface
          </span>
          <PostureSwitcher posture={posture} setPosture={setPosture} />
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet context={{ data, posture, setPosture } satisfies DingleberryContextValue} />
        </div>
      </main>
    </div>
  );
}

/** Typed accessor for the shared DingleBERRY data/posture inside any screen. */
export function useDingleberry(): DingleberryContextValue {
  return useOutletContext<DingleberryContextValue>();
}
