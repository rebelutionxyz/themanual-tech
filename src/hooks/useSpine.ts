/* Spine hooks — the runtime half of `lib/spine.ts`.
 *
 * Kept apart from the values module so `lib/spine.ts` stays importable from
 * anywhere (a test, a node script, a non-React surface) without pulling React
 * in behind it.
 */

import { ASTRA_ACCENT_RING, BLING_HOP_EVENT, BLING_HOP_MS } from '@/lib/spine';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * True when the viewer has asked for reduced motion.
 *
 * Live, not read-once: the OS setting can change while the tab is open, and a
 * viewer who turns it ON mid-session is the exact person who must not have to
 * reload to be listened to.
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

/**
 * True for the duration of one hop, driven by the `bling-hop` window event.
 *
 * Returns a permanent `false` when the viewer prefers reduced motion — the
 * check lives HERE rather than at the CSS layer so the drop never even enters
 * the animating class, and a future caller cannot reintroduce the motion by
 * styling around a media query it forgot about.
 *
 * Re-firing mid-hop restarts the timer rather than stacking: `hopSeq` bumps on
 * every event, and the effect that clears it is keyed to the sequence number,
 * so the previous timeout is cancelled instead of ending the new hop early.
 */
export function useBlingHop(): boolean {
  const reduced = usePrefersReducedMotion();
  const [hopSeq, setHopSeq] = useState(0);
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const onHop = () => {
      setHopSeq((n) => n + 1);
      setHopping(true);
    };
    window.addEventListener(BLING_HOP_EVENT, onHop);
    return () => window.removeEventListener(BLING_HOP_EVENT, onHop);
  }, [reduced]);

  // `hopSeq` is not read in the body, so the linter calls it unnecessary. It is
  // the mechanism: re-firing mid-hop must CANCEL the running timeout and start a
  // fresh one, and the only way to make that happen is for the dependency list
  // to change. Drop it and a second hop lands inside the first one's timer,
  // which then ends the new hop early.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hopSeq restarts the timer, by design
  useEffect(() => {
    if (!hopping) return;
    const t = window.setTimeout(() => setHopping(false), BLING_HOP_MS);
    return () => window.clearTimeout(t);
  }, [hopping, hopSeq]);

  return reduced ? false : hopping;
}

/* ───────────────── SPINE 3 — the rotating constellation accent ────────────── */

/* Module scope, not component state: the accent must survive every remount and
   advance ONCE per page change no matter how many things are wearing it.
   `ringIndex` is the position; `lastPath` is what makes the advance idempotent.

   IDEMPOTENCE IS THE WHOLE TRICK. Two components read this hook — the always-on
   right rail and the admin-only list — and a naive "advance on pathname change"
   effect would fire in both and step the ring twice per navigation, so the two
   would also disagree about the colour. Keying the advance to the PATH rather
   than to the effect firing means the second caller for a given path is a no-op
   and both read the same value. */
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
