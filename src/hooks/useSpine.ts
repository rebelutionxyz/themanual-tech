/* Spine hooks — the runtime half of `lib/spine.ts`.
 *
 * Kept apart from the values module so `lib/spine.ts` stays importable from
 * anywhere (a test, a node script, a non-React surface) without pulling React
 * in behind it.
 */

import { useAstra } from '@/lib/astras/AstraContext';
import { REALM_COLORS, SILVER } from '@/lib/constants';
import { ASTRA_ACCENT_RING } from '@/lib/spine';
import { useManualStore } from '@/stores/useManualStore';
import type { RealmId } from '@/types/manual';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

/**
 * True when the viewer has asked for reduced motion.
 *
 * Live, not read-once: the OS setting can change while the tab is open, and a
 * viewer who turns it ON mid-session is the exact person who must not have to
 * reload to be listened to.
 *
 * FRONT78 removed its only consumer (`useBlingHop`, retired with the drop). Kept
 * anyway: this is an accessibility primitive, not spine plumbing, and the next
 * animation on this platform needs exactly this and should not have to rewrite
 * the live-`change` subscription that the obvious read-once version gets wrong.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/* `useBlingHop` LIVED HERE and is gone — FRONT78, owner: "its h24.tech not
   themanual we dont need the bling drop". The drop, its `bling-hop` window
   event, and the reduced-motion gate around it are retired together; a hop hook
   with no drop to hop is not a seam worth keeping. `usePrefersReducedMotion`
   above outlives it because it was never about the drop. */

/* ───────────── THE ROTATING CONSTELLATION ACCENT ──────────────────────────── */

/* Module scope, not component state: the accent must survive every remount and
   advance ONCE per page change no matter how many things are wearing it.
   `ringIndex` is the position; `lastPath` is what makes the advance idempotent.

   IDEMPOTENCE IS THE WHOLE TRICK, and it still is even though FRONT78 took the
   always-on band away and left `ConstellationRail` as the single consumer. The
   admin list mounts and unmounts as `is_admin` settles and as the breakpoint
   crosses lg, and a naive "advance on pathname change" effect steps the ring on
   every one of those. Keying the advance to the PATH rather than to the effect
   firing means a second call for the same path is a no-op — which is what keeps
   one navigation worth one step regardless of how many consumers there are. */
let ringIndex = 0;
let lastPath: string | null = null;
const ringSubscribers = new Set<(accent: string) => void>();

function accentNow(): string {
  return ASTRA_ACCENT_RING[ringIndex % ASTRA_ACCENT_RING.length] ?? '#C8D1DA';
}

function advanceRing(pathname: string): void {
  if (pathname === lastPath) return;
  lastPath = pathname;
  ringIndex = (ringIndex + 1) % ASTRA_ACCENT_RING.length;
  const next = accentNow();
  for (const fn of ringSubscribers) fn(next);
}

/**
 * The current constellation accent — SPINE 3. Rotates one step per page change,
 * shared by every consumer.
 *
 * Query and hash changes are deliberately NOT triggers: `?tab=2` is the same
 * page, and rotating on it would make the rail twitch while a user filters.
 *
 * Falls back to The Manual's silver if the accent ring is ever empty, so an
 * empty catalog degrades to the foundation colour rather than to `undefined`
 * reaching a style attribute.
 */
export function useConstellationAccent(): string {
  const { pathname } = useLocation();
  const [accent, setAccent] = useState(accentNow);

  useEffect(() => {
    ringSubscribers.add(setAccent);
    return () => {
      ringSubscribers.delete(setAccent);
    };
  }, []);

  useEffect(() => {
    advanceRing(pathname);
    // A consumer mounting mid-session must adopt the ring's CURRENT value, not
    // the one it captured in useState before subscribing.
    setAccent(accentNow());
  }, [pathname]);

  return accent;
}

/* ───────────────── THE REALM ACCENT — resolution without chrome ───────────── */

/**
 * The accent of the realm the user is currently in.
 *
 * Resolution order, and the ORDER IS THE POINT:
 *   1. the ROUTE says which realm    → /realm/:realmId
 *   2. selectedRealmId in the store  → REALM_COLORS[id]
 *   3. astra host, no realm          → astra.accent
 *   4. foundation                    → SILVER (§15.5 / 13-hex flower)
 *
 * The route is consulted FIRST because where you are beats what you last picked:
 * a stale `selectedRealmId` from a previous surface must not claim the realm the
 * URL is actually naming. FRONT74 measured that failure on a running build —
 * navigating to /realm/justice left the answer on `foundation` silver, because
 * `selectedRealmId` is only written when something explicitly picks a realm and
 * walking into a realm URL never does.
 *
 * ─── WHY THIS IS A HOOK AND NOT A STRIP ─────────────────────────────────────
 * FRONT74 put this resolution inside a 3px chrome rail down the left of every
 * page. FRONT78 removed that rail by owner word — "the line on the left of the
 * sidebar needs to be deleted from all pages" — but the RESOLUTION is not the
 * rail. Realm identity still has to be answerable for the switcher and for
 * whatever surface claims it next, so the logic was lifted out here rather than
 * deleted with the chrome that happened to be its first consumer.
 *
 * It has no consumer today. That is deliberate and is recorded rather than
 * hidden: this is kept as the seam the next surface reaches for, and if nothing
 * ever does, deleting it is one edit with no callers to chase.
 */
export function useRealmAccent(): { realm: RealmId | null; color: string } {
  const astra = useAstra();
  const selectedRealmId = useManualStore((s) => s.selectedRealmId);
  const { realmId: routeRealmId } = useParams();

  // `useParams` is untyped at the route boundary, so a bad segment must not
  // index REALM_COLORS blindly — /realm/nonsense would otherwise resolve to
  // `undefined` and hand a caller a colour that is not a colour.
  const routeRealm =
    routeRealmId && routeRealmId in REALM_COLORS ? (routeRealmId as RealmId) : null;
  const realm = routeRealm ?? selectedRealmId;

  return { realm, color: realm ? REALM_COLORS[realm] : (astra?.accent ?? SILVER) };
}
