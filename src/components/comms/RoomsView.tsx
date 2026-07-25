import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  createSpace,
  joinRoom,
  listRoomParticipants,
  listSpaces,
  setRoomRole,
  subscribeRoomParticipants,
  type RoomParticipant,
  type Space,
} from '@/lib/comms';
const CallView = lazy(() => import('./CallView').then((m) => ({ default: m.CallView })));

/**
 * Rooms — live public voice spaces. Start one (you're the host) or drop into a
 * live one as a speaker. Audio-first; reuses the LiveKit CallView with video off.
 */
type Phase = 'list' | 'in';

export function RoomsView({ onClose }: { onClose: () => void }) {
  const { bee } = useAuth();
  const [phase, setPhase] = useState<Phase>('list');
  const [rooms, setRooms] = useState<Space[] | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<RoomParticipant[]>([]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [joinedAs, setJoinedAs] = useState<'host' | 'listener'>('listener');

  // Live roster while in a room; my row's role drives my publish rights.
  useEffect(() => {
    if (phase !== 'in' || !roomId) return;
    let live = true;
    const load = () =>
      listRoomParticipants(roomId)
        .then((ps) => {
          if (live) setParts(ps);
        })
        .catch(() => {});
    load();
    const sub = subscribeRoomParticipants(roomId, load);
    const t = window.setInterval(load, 15000); // safety net
    return () => {
      live = false;
      window.clearInterval(t);
      sub?.close();
    };
  }, [phase, roomId]);

  const myRole = (bee && parts.find((pp) => pp.beeId === bee.id)?.role) || joinedAs;
  const iAmHost = myRole === 'host';

  const promote = async (beeId: string, to: 'speaker' | 'listener') => {
    if (!roomId) return;
    try {
      await setRoomRole(roomId, beeId, to);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change their role');
    }
  };

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
      setJoinedAs('host');
      setParts([]);
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
        await joinRoom(id, 'listener'); // everyone starts listening; the host promotes speakers
        setJoinedAs('listener');
        setParts([]);
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
        {/* Keyed on my role: a promotion/demotion remounts CallView, which
            fetches a FRESH token — that's where publish rights live. */}
        <CallView
          key={`${roomId}:${myRole}`}
          roomId={roomId}
          video={false}
          onClose={() => {
            setRoomId(null);
            setPhase('list');
            setRosterOpen(false);
          }}
        />
        <div className="fixed bottom-4 left-4 z-[70] flex flex-col items-start gap-2">
          {rosterOpen && (
            <div className="max-h-64 w-64 overflow-y-auto rounded-xl border border-white/15 bg-zinc-900/95 p-2 text-white shadow-2xl">
              {parts.map((pp) => (
                <div key={pp.beeId} className="flex items-center gap-2 px-1.5 py-1">
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    @{pp.handle}
                    {bee && pp.beeId === bee.id && (
                      <span className="ml-1 text-[10px] text-white/40">you</span>
                    )}
                  </span>
                  <span
                    className={
                      pp.role === 'listener'
                        ? 'flex-shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50'
                        : 'flex-shrink-0 rounded-full bg-cyan-500/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-cyan-300'
                    }
                  >
                    {pp.role}
                  </span>
                  {iAmHost && pp.role !== 'host' && (
                    <button
                      type="button"
                      onClick={() =>
                        promote(pp.beeId, pp.role === 'listener' ? 'speaker' : 'listener')
                      }
                      className="flex-shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-900 hover:bg-zinc-100"
                    >
                      {pp.role === 'listener' ? 'Promote' : 'Mute'}
                    </button>
                  )}
                </div>
              ))}
              {myRole === 'listener' && (
                <p className="border-t border-white/10 px-1.5 pt-1.5 text-[10px] leading-relaxed text-white/40">
                  You're listening — the host can promote you to speak.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRosterOpen((v) => !v)}
            className="rounded-full border border-white/15 bg-zinc-900/90 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-lg hover:bg-zinc-800"
          >
            {parts.length || 1} in room{myRole === 'listener' ? ' · listening' : ''}
          </button>
        </div>
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
