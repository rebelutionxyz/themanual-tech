import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { callE2eeKey, joinRoom } from '@/lib/comms';
import { clearCallNotifications, registerPush, showCallNotification } from '@/lib/push';
import { CallView } from './CallView';

/**
 * Global call layer — mounted ONCE at the app root (App.tsx), so:
 *  - an incoming call rings the Bee ANYWHERE on the site, not only inside the
 *    open conversation, and
 *  - an accepted call keeps running as they navigate between surfaces.
 *
 * Ring lifecycle: the server (`comms_room_create`) writes a `call_incoming`
 * notification to every OTHER member; the `notifications` table is in the
 * Realtime publication, so each Bee's client receives its own row live. The
 * ring sounds up to RING_COUNT times, then auto-misses. It also clears the
 * instant the caller hangs up (we watch the call room's status). Any dismissal
 * that wasn't an explicit accept/decline surfaces a "Missed call from …".
 */

const RING_COUNT = 13; // how many times we ring before giving up
const RING_INTERVAL_MS = 3000; // spacing between rings
// A little past the audible rings — a safety net in case the ringer never ran
// (e.g. a call arriving while already in another call, so the tone is muted).
const RING_MISS_MS = RING_COUNT * RING_INTERVAL_MS + 3000;

interface Incoming {
  roomId: string;
  title: string;
  from: string; // caller handle, e.g. "@butch" — for the "Missed call from …" note
  video: boolean;
  convId: string | null;
}
interface ActiveCall {
  roomId: string;
  video: boolean;
  e2eeKey: string | null;
  outgoing: boolean; // true = I placed this call and am waiting for pickup
  peerName: string; // who I'm calling / talking to, for the call screen
  phone: boolean; // 1:1/group voice call → audio-only "phone" screen
}

interface CallCtx {
  /** Drop into a call room the caller already created (via createCallRoom). */
  startCall: (
    roomId: string,
    video?: boolean,
    e2eeKey?: string | null,
    opts?: { outgoing?: boolean; peerName?: string; phone?: boolean },
  ) => void;
  inCall: boolean;
}

const Ctx = createContext<CallCtx | null>(null);

export function useCall(): CallCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCall must be used within CallProvider');
  return c;
}

/**
 * iOS/Safari won't play Web Audio until the user has interacted with the page.
 * We keep ONE shared AudioContext and "unlock" it on the first tap/keypress
 * anywhere in the app, so a later incoming-call ring can actually make sound
 * even though the call itself arrived without a fresh gesture.
 */
let sharedAudio: AudioContext | null = null;
function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedAudio) sharedAudio = new AC();
  sharedAudio.resume?.().catch(() => {});
  return sharedAudio;
}
function installAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = audioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchend', unlock);
    window.removeEventListener('keydown', unlock);
    if (!ctx) return;
    try {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

/**
 * Synthesized ringtone — no audio asset needed. Rings RING_COUNT times, then
 * calls `onExhausted` (used to auto-miss the call). installAudioUnlock() primes
 * a shared context on first interaction so the ring can sound on iOS. If audio
 * is still blocked, the ring COUNT still advances, so the auto-miss fires on
 * time regardless.
 */
function useRinger(active: boolean, onExhausted?: () => void) {
  const exhaustedRef = useRef(onExhausted);
  exhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!active) return;

    const beep = () => {
      const c = audioContext();
      if (!c) return; // no audio (blocked / unsupported) — stay silent, keep counting
      const g = c.createGain();
      g.connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
      g.gain.setValueAtTime(0.22, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      for (const freq of [440, 480]) {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        o.start(t);
        o.stop(t + 1.0);
      }
    };

    let rings = 1;
    beep();
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {
      /* vibrate unsupported (e.g. iOS) */
    }
    const id = window.setInterval(() => {
      rings += 1;
      beep();
      if (rings >= RING_COUNT) {
        clearInterval(id);
        exhaustedRef.current?.();
      }
    }, RING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { bee, session } = useAuth();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const ringTimer = useRef<number | null>(null);
  const incomingRef = useRef<Incoming | null>(null);

  // Keep a ref of the current incoming so timers/subscriptions read fresh state.
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const clearRing = () => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  };

  // Dismiss the incoming ring. 'missed' (caller hung up / no answer) leaves a
  // "Missed call from …" note; 'handled' (I accepted or declined) is silent.
  const dismissIncoming = useCallback(
    (reason: 'handled' | 'missed' = 'handled') => {
      clearRing();
      const cur = incomingRef.current;
      if (cur && reason === 'missed') {
        showToast(`Missed call from ${cur.from}`);
        // The only call notification we surface outside the app: a missed call.
        showCallNotification('Missed call', `from ${cur.from}`);
      } else {
        clearCallNotifications();
      }
      setIncoming(null);
    },
    [showToast],
  );

  // Audible ring while a call is coming in (and we're not already in one).
  // When the rings run out, treat it as a miss.
  useRinger(!!incoming && !active, () => dismissIncoming('missed'));

  const startCall = useCallback(
    (
      roomId: string,
      video = true,
      e2eeKey: string | null = null,
      opts?: { outgoing?: boolean; peerName?: string; phone?: boolean },
    ) => {
      setActive({
        roomId,
        video,
        e2eeKey,
        outgoing: opts?.outgoing ?? false,
        peerName: opts?.peerName ?? '',
        phone: opts?.phone ?? false,
      });
      // Off-site alert: also ring the other members' registered devices.
      supabase?.functions.invoke('push-send', { body: { room_id: roomId } }).catch(() => {});
    },
    [],
  );

  const accept = useCallback(async () => {
    const cur = incomingRef.current;
    if (!cur) return;
    const { roomId, video, convId, from } = cur;
    dismissIncoming('handled');
    try {
      await joinRoom(roomId, 'speaker');
      const e2eeKey = convId ? await callE2eeKey(convId, roomId).catch(() => null) : null;
      setActive({ roomId, video, e2eeKey, outgoing: false, peerName: from, phone: true });
    } catch {
      showToast('Could not join the call');
    }
  }, [dismissIncoming, showToast]);

  const decline = useCallback(async () => {
    const cur = incomingRef.current;
    if (!cur || !supabase) return;
    const roomId = cur.roomId;
    dismissIncoming('handled');
    try {
      await supabase.rpc('comms_call_decline', { p_room_id: roomId });
    } catch {
      /* best-effort — the caller just won't get the decline notice */
    }
  }, [dismissIncoming]);

  // Live incoming-call ring: subscribe to MY notifications over Realtime.
  useEffect(() => {
    if (!supabase || !bee) return;
    const client = supabase; // capture non-null ref for the cleanup closure
    if (session?.access_token) client.realtime.setAuth(session.access_token);

    const channel = client
      .channel(`calls:${bee.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_bee_id=eq.${bee.id}`,
        },
        (payload) => {
          const n = payload.new as {
            type?: string;
            entity_id?: string;
            title?: string;
            body?: string;
            url?: string;
          };
          if (n.type === 'call_incoming' && n.entity_id) {
            clearRing();
            const convId =
              typeof n.url === 'string' && n.url.startsWith('/comms/') ? n.url.slice(7) : null;
            const title = n.title || 'Incoming call';
            const from = title.replace(/\s+is calling$/i, '');
            setIncoming({
              roomId: n.entity_id,
              title,
              from: from === title ? 'someone' : from,
              video: n.body !== 'audio',
              convId: convId || null,
            });
            // Safety net: auto-miss a hair past the audible rings, in case the
            // ringer never ran (e.g. already in another call).
            ringTimer.current = window.setTimeout(() => dismissIncoming('missed'), RING_MISS_MS);
          } else if (n.type === 'call_declined') {
            showToast(n.title || 'Call declined');
          }
        },
      )
      .subscribe();

    return () => {
      clearRing();
      client.removeChannel(channel);
    };
  }, [bee, session?.access_token, dismissIncoming, showToast]);

  // Never ring for the call you're already in.
  useEffect(() => {
    if (active && incoming && active.roomId === incoming.roomId) dismissIncoming('handled');
  }, [active, incoming, dismissIncoming]);

  // Register for off-site push alerts once signed in (silent until granted).
  useEffect(() => {
    if (bee) registerPush().catch(() => {});
  }, [bee]);

  // Prime audio on the first interaction so incoming-call rings can play (iOS).
  useEffect(() => {
    installAudioUnlock();
  }, []);

  // Stop ringing the instant the caller hangs up (their call room leaves 'live')
  // — and surface it as a missed call.
  useEffect(() => {
    if (!supabase || !incoming) return;
    const channel = supabase
      .channel(`ring:${incoming.roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comms_rooms',
          filter: `id=eq.${incoming.roomId}`,
        },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status && status !== 'live') dismissIncoming('missed');
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [incoming, dismissIncoming]);

  return (
    <Ctx.Provider value={{ startCall, inCall: !!active }}>
      {children}

      {/* Active call — rendered app-wide so it survives navigation. */}
      {active && (
        <CallView
          key={active.roomId}
          roomId={active.roomId}
          video={active.video}
          e2eeKey={active.e2eeKey}
          outgoing={active.outgoing}
          peerName={active.peerName}
          phone={active.phone}
          endWhenAlone
          onClose={(reason) => {
            const who = active.peerName || 'them';
            setActive(null);
            if (reason === 'no-answer') showToast(`No answer from ${who}`);
          }}
        />
      )}

      {/* Incoming ring — appears anywhere on the site. */}
      {incoming && !active && (
        <div className="fixed inset-x-0 top-6 z-[70] flex justify-center px-4">
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl bg-zinc-900/95 px-5 py-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur">
            <span className="text-2xl">📞</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-sm">{incoming.title}</div>
              <div className="text-white/50 text-xs">
                {incoming.video ? 'Incoming video call' : 'Incoming voice call'}
              </div>
            </div>
            <button
              type="button"
              onClick={decline}
              className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-sm hover:bg-white/20"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-full bg-green-500 px-4 py-1.5 font-bold text-sm text-zinc-900 hover:bg-green-400"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-[70] rounded-full bg-zinc-900/95 px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}
