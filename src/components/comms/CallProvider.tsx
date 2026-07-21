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
import { joinRoom } from '@/lib/comms';
import { CallView } from './CallView';

/**
 * Global call layer — mounted ONCE at the app root (App.tsx), so:
 *  - an incoming call rings the Bee ANYWHERE on the site, not only inside the
 *    open conversation, and
 *  - an accepted call keeps running as they navigate between surfaces.
 *
 * How the ring arrives: the server (`comms_room_create`) writes a
 * `call_incoming` notification to every OTHER member of the conversation. The
 * `notifications` table is in the Realtime publication, so each Bee's client
 * receives its own row live (RLS scopes delivery to the recipient). No polling.
 */

interface Incoming {
  roomId: string;
  title: string;
  video: boolean;
}
interface ActiveCall {
  roomId: string;
  video: boolean;
}

interface CallCtx {
  /** Drop into a call room the caller already created (via createCallRoom). */
  startCall: (roomId: string, video?: boolean) => void;
  inCall: boolean;
}

const Ctx = createContext<CallCtx | null>(null);

export function useCall(): CallCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCall must be used within CallProvider');
  return c;
}

/**
 * Synthesized ringtone — no audio asset needed. NOTE: iOS Safari blocks audio
 * until the user has interacted with the page, so a cold or backgrounded tab
 * rings silently there; desktop and a foregrounded iOS tab ring out loud.
 */
function useRinger(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!active) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    ctx.resume?.().catch(() => {});
    const beep = () => {
      const c = ctxRef.current;
      if (!c) return;
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
    beep();
    const id = window.setInterval(beep, 3000);
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {
      /* vibrate unsupported (e.g. iOS) */
    }
    return () => clearInterval(id);
  }, [active]);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { bee, session } = useAuth();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const ringTimer = useRef<number | null>(null);

  // Audible ring while a call is coming in (and we're not already in one).
  useRinger(!!incoming && !active);

  const clearRing = () => {
    if (ringTimer.current) {
      clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  };

  const dismissIncoming = useCallback(() => {
    clearRing();
    setIncoming(null);
  }, []);

  const startCall = useCallback((roomId: string, video = true) => {
    setActive({ roomId, video });
  }, []);

  const accept = useCallback(async () => {
    if (!incoming) return;
    const roomId = incoming.roomId;
    const video = incoming.video;
    dismissIncoming();
    try {
      await joinRoom(roomId, 'speaker');
      setActive({ roomId, video });
    } catch {
      setToast('Could not join the call');
      window.setTimeout(() => setToast(null), 4000);
    }
  }, [incoming, dismissIncoming]);

  const decline = useCallback(async () => {
    if (!incoming || !supabase) return;
    const roomId = incoming.roomId;
    dismissIncoming();
    try {
      await supabase.rpc('comms_call_decline', { p_room_id: roomId });
    } catch {
      /* best-effort — the caller just won't get the decline notice */
    }
  }, [incoming, dismissIncoming]);

  // Live incoming-call ring: subscribe to MY notifications over Realtime.
  useEffect(() => {
    if (!supabase || !bee) return;
    const client = supabase; // capture non-null ref for the cleanup closure
    // Ensure Realtime carries the auth token so RLS lets my rows through.
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
          };
          if (n.type === 'call_incoming' && n.entity_id) {
            clearRing();
            setIncoming({
              roomId: n.entity_id,
              title: n.title || 'Incoming call',
              video: n.body !== 'audio',
            });
            // Auto-miss after 35s of ringing.
            ringTimer.current = window.setTimeout(() => setIncoming(null), 35000);
          } else if (n.type === 'call_declined') {
            setToast(n.title || 'Call declined');
            window.setTimeout(() => setToast(null), 4000);
          }
        },
      )
      .subscribe();

    return () => {
      clearRing();
      client.removeChannel(channel);
    };
  }, [bee, session?.access_token]);

  // Never ring for the call you're already in.
  useEffect(() => {
    if (active && incoming && active.roomId === incoming.roomId) dismissIncoming();
  }, [active, incoming, dismissIncoming]);

  return (
    <Ctx.Provider value={{ startCall, inCall: !!active }}>
      {children}

      {/* Active call — rendered app-wide so it survives navigation. */}
      {active && (
        <CallView
          key={active.roomId}
          roomId={active.roomId}
          video={active.video}
          onClose={() => setActive(null)}
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
