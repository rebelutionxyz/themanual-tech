import { DingleberrySidebar } from '@/components/dingleberry/DingleberrySidebar';
import { PostureSwitcher } from '@/components/dingleberry/PostureSwitcher';
import { dbIcon } from '@/components/dingleberry/icons';
import { DINGLEBERRY_COLOR, TONE } from '@/components/dingleberry/tone';
import { useAuth } from '@/lib/auth';
import type { DingleberrySnapshot, Posture, S02Live } from '@/lib/dingleberry/contract';
import { useDingleberryData } from '@/lib/dingleberry/useDingleberryData';
import { supabase } from '@/lib/supabase';
import { type ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';

/**
 * Shared layout for all DingleBERRY routes. Mirrors IntelLayout:
 *   - owns the single source of data + posture (useDingleberryData), incl. the
 *     S02 live snapshot (Step-3) handed to screens via Outlet context
 *   - keeps the left DingleBERRY sidebar visible across every screen
 *   - GATES the surface: DingleBERRY is the platform's security console, so only
 *     operator (admin) Bees see the drills. Access resolves BEFORE any drill
 *     renders — no flicker-then-deny.
 *
 * The artifact's own TopBar + RightRail are intentionally DROPPED — the repo's
 * PlatformLayout chrome (SiteHeader / utility rail) wraps this surface already.
 */

export interface DingleberryContextValue {
  data: DingleberrySnapshot | null;
  posture: Posture;
  setPosture: (p: Posture) => void;
  s02: S02Live;
}

type Gate = 'checking' | 'allowed' | 'denied';

/* Surfaces wired to real data — their posture DERIVES from that data, so the
   mock posture switcher is replaced by a caption + green "live" dot. Mark a
   future live surface by adding its route here (value = the header caption). */
const LIVE_ROUTES: Record<string, string> = {
  '/dingleberry/txn': 'S02 posture derives from live ledger state',
};

export function DingleberryLayout() {
  const { data, posture, setPosture, s02 } = useDingleberryData();
  const { user, loading: authLoading } = useAuth();
  const [gate, setGate] = useState<Gate>('checking');

  // Live surface? → caption + green dot instead of the mock switcher.
  const liveCaption = LIVE_ROUTES[useLocation().pathname.replace(/\/+$/, '')];

  // Resolve operator access: signed-in Bee's bees.is_admin (id = auth.uid()).
  useEffect(() => {
    if (authLoading) return; // wait for auth to settle before deciding
    let alive = true;
    async function check() {
      if (!user || !supabase) {
        if (alive) setGate('denied');
        return;
      }
      const { data: row } = await supabase
        .from('bees')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (alive) setGate(row?.is_admin === true ? 'allowed' : 'denied');
    }
    check();
    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  // No flicker-then-deny: hold the surface until access resolves.
  if (authLoading || gate === 'checking') {
    return (
      <GateShell>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Verifying operator access…
        </div>
      </GateShell>
    );
  }

  if (gate === 'denied') {
    return (
      <GateShell>
        <GateDenied />
      </GateShell>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <DingleberrySidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg">
        {/* Shared header — the mock-demo posture switcher is hoisted here so it
            drives every drill page from one shared state (was overview-only). */}
        <div className="flex flex-none items-center justify-between gap-3 border-b border-border bg-bg px-6 py-2.5">
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 10, letterSpacing: '0.1em' }}
          >
            {liveCaption ?? 'Posture · recolors every surface'}
          </span>
          {liveCaption ? (
            <span
              className="flex items-center gap-1.5 font-mono uppercase text-text-muted"
              style={{ fontSize: 10, letterSpacing: '0.1em' }}
            >
              <span
                className="animate-pulse"
                style={{ width: 7, height: 7, borderRadius: 99, background: TONE.secure.c }}
              />
              live
            </span>
          ) : (
            <PostureSwitcher posture={posture} setPosture={setPosture} />
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet context={{ data, posture, setPosture, s02 } satisfies DingleberryContextValue} />
        </div>
      </main>
    </div>
  );
}

/** Sidebar chrome + centered content — used for the gate (checking / denied). */
function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <DingleberrySidebar />
      <main className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto bg-bg p-8">
        {children}
      </main>
    </div>
  );
}

/** Honest non-operator view — replaces the drills, never a half-loaded surface. */
function GateDenied() {
  const Lock = dbIcon('lock');
  return (
    <div className="max-w-md rounded-lg border border-border bg-bg-panel p-8 text-center">
      <div
        className="mx-auto mb-4 flex items-center justify-center rounded-md"
        style={{
          width: 48,
          height: 48,
          background: 'rgba(220,38,38,0.12)',
          color: DINGLEBERRY_COLOR,
        }}
      >
        <Lock size={24} />
      </div>
      <h1 className="font-serif font-bold text-text" style={{ fontSize: 22, lineHeight: 1.1 }}>
        Operator access required
      </h1>
      <p className="mt-2 text-text-silver" style={{ fontSize: 14, lineHeight: 1.5 }}>
        DingleBERRY is the platform’s security console. Sign in with an operator (admin) Bee to view
        it.
      </p>
      <div
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-bright px-3 py-1 font-mono uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: '0.08em' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: TONE.idle.c }} />
        access denied
      </div>
    </div>
  );
}

/** Typed accessor for the shared DingleBERRY data/posture inside any screen. */
export function useDingleberry(): DingleberryContextValue {
  return useOutletContext<DingleberryContextValue>();
}
