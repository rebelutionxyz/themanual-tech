import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createSpace, joinRoom, listSpaces, type Space } from '@/lib/comms';
const CallView = lazy(() => import('./CallView').then((m) => ({ default: m.CallView })));

/**
 * Rooms — live public voice spaces. Start one (you're the host) or drop into a
 * live one as a speaker. Audio-first; reuses the LiveKit CallView with video off.
 */
type Phase = 'list' | 'in';

export function RoomsView({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('list');
  const [rooms, setRooms] = useState<Space[] | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRooms(await listSpaces());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rooms');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'list') return;
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [phase, refresh]);

  const create = useCallback(async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { roomId: id } = await createSpace(name);
      setRoomId(id);
      setPhase('in');
      setTitle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the room');
    } finally {
      setBusy(false);
    }
  }, [title, busy]);

  const join = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await joinRoom(id, 'speaker');
        setRoomId(id);
        setPhase('in');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join the room');
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  if (phase === 'in' && roomId) {
    return (
      <Suspense fallback={null}>
          <CallView
        key={roomId}
        roomId={roomId}
        video={false}
        onClose={() => {
          setRoomId(null);
          setPhase('list');
        }}
      />
        </Suspense>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-zinc-900 p-6 text-white">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">Rooms</h2>
          <button type="button" onClick={onClose} className="text-sm text-white/50 hover:text-white">
            Close
          </button>
        </div>
        <p className="mb-4 text-sm text-white/50">Drop into a live voice room, or start your own.</p>
        {error && <p className="mb-3 text-red-300 text-sm">{error}</p>}

        <div className="mb-4 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name your room…"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || !title.trim()}
            className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-sm text-white hover:bg-cyan-400 disabled:opacity-40"
          >
            Start
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {rooms === null && <p className="text-sm text-white/40">Loading…</p>}
          {rooms !== null && rooms.length === 0 && (
            <p className="py-4 text-center text-sm text-white/40">No live rooms — start one above.</p>
          )}
          {(rooms ?? []).map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-sm">{r.title}</span>
                <span className="block text-white/40 text-xs">@{r.hostHandle}</span>
              </span>
              <button
                type="button"
                onClick={() => join(r.id)}
                disabled={busy}
                className="rounded-full bg-white px-4 py-1.5 font-bold text-sm text-zinc-900 hover:bg-zinc-100 disabled:opacity-40"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
