import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { cancelRoulette, enqueueRoulette, getRoomStatus, pollRouletteMatch } from '@/lib/comms';
import { supabase } from '@/lib/supabase';
const CallView = lazy(() => import('./CallView').then((m) => ({ default: m.CallView })));

/**
 * Roulette — enqueue for a random 1:1, get matched, drop into a call, and
 * "Next" to the following Bee. The matching partner creates the room server-side
 * (comms_roulette_enqueue); the waiting side polls for it.
 */
type Phase = 'choose' | 'searching' | 'incall';

export function RouletteView({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hadCall, setHadCall] = useState(false);
  const pollRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('choose');
  phaseRef.current = phase;

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const start = useCallback(async (m: 'video' | 'audio') => {
    setError(null);
    setMode(m);
    setRoomId(null);
    setPhase('searching');
    try {
      const res = await enqueueRoulette(m);
      if (res.matched && res.roomId) {
        setRoomId(res.roomId);
        setPhase('incall');
        setHadCall(true);
        return;
      }
      // No partner waiting — poll until someone matches us.
      stopPoll();
      pollRef.current = window.setInterval(async () => {
        try {
          const match = await pollRouletteMatch();
          if (match) {
            stopPoll();
            setRoomId(match.roomId);
            setPhase('incall');
            setHadCall(true);
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start roulette');
      setPhase('choose');
    }
  }, []);

  const stop = useCallback(async () => {
    stopPoll();
    try {
      await cancelRoulette();
    } catch {
      /* ignore */
    }
    onClose();
  }, [onClose]);

  // Clean up the poll if the component goes away.
  useEffect(() => () => stopPoll(), []);

  // Partner-left detector: the server ends a roulette room the moment EITHER
  // side leaves (any exit path). Watch the room row (realtime + a poll safety
  // net); the abandoned side auto-requeues → "Finding the next Bee…".
  useEffect(() => {
    if (phase !== 'incall' || !roomId) return;
    let live = true;
    const requeue = () => {
      if (!live || phaseRef.current !== 'incall') return;
      start(mode);
    };
    const check = async () => {
      try {
        const status = await getRoomStatus(roomId);
        if (status && status !== 'live') requeue();
      } catch {
        /* keep watching */
      }
    };
    const t = window.setInterval(check, 4000);
    const channel = supabase
      ?.channel(`roulette-room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comms_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status && status !== 'live') requeue();
        },
      )
      .subscribe();
    return () => {
      live = false;
      window.clearInterval(t);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [phase, roomId, mode, start]);

  if (phase === 'incall' && roomId) {
    return (
      <div className="fixed inset-0 z-50">
        <Suspense fallback={null}>
          <CallView
          key={roomId}
          roomId={roomId}
          video={mode === 'video'}
          onClose={() => {
            // Only MY deliberate exit lands here while in-call; the Next-flow
            // teardown fires this too, after phase already moved — ignore that.
            if (phaseRef.current !== 'incall') return;
            setRoomId(null);
            setPhase('choose');
          }}
        />
        </Suspense>
        <div className="-translate-x-1/2 fixed bottom-24 left-1/2 z-[60] flex gap-2">
          <button
            type="button"
            onClick={() => start(mode)}
            className="rounded-full bg-white px-5 py-2 font-bold text-sm text-zinc-900 shadow-lg hover:bg-zinc-100"
          >
            Next ›
          </button>
          <button
            type="button"
            onClick={stop}
            className="rounded-full bg-red-600 px-5 py-2 font-bold text-sm text-white shadow-lg hover:bg-red-700"
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 text-center text-white">
        <h2 className="mb-1 font-display font-bold text-xl">Roulette</h2>
        <p className="mb-5 text-sm text-white/50">Meet a random Bee.</p>
        {error && <p className="mb-3 text-red-300 text-sm">{error}</p>}

        {phase === 'choose' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => start('video')}
              className="w-full rounded-lg bg-cyan-500 py-2.5 font-bold hover:bg-cyan-400"
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => start('audio')}
              className="w-full rounded-lg bg-white/10 py-2.5 font-bold hover:bg-white/20"
            >
              Voice only
            </button>
            <button type="button" onClick={onClose} className="w-full py-2 text-sm text-white/50 hover:text-white">
              Cancel
            </button>
          </div>
        )}

        {phase === 'searching' && (
          <div className="space-y-4">
            <p className="text-white/70">{hadCall ? 'Finding the next Bee…' : 'Finding a Bee…'}</p>
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <button
              type="button"
              onClick={stop}
              className="w-full rounded-lg bg-white/10 py-2 text-sm hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
