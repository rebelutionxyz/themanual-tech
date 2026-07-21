import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import { ExternalE2EEKeyProvider, Room, RoomEvent } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import { getRoomToken, leaveRoom } from '@/lib/comms';

/**
 * A live LiveKit call (video or audio-only).
 *
 * PROVEN CONNECTION PATH: LiveKitRoom manages its own room for plain calls. We
 * only OBSERVE that room (via useRoomContext, inside <CallEndWatcher>) to end the
 * call once everyone else has left — we never replace the room, which is what
 * previously regressed calls across devices.
 *
 * With `e2eeKey` (currently never set — E2EE calls are gated off in comms.ts) the
 * room is built with SFrame E2EE; without it, media is transport-encrypted
 * (DTLS-SRTP), which works in every browser.
 */
export function CallView({
  roomId,
  video = true,
  e2eeKey,
  endWhenAlone,
  onClose,
}: {
  roomId: string;
  video?: boolean;
  e2eeKey?: string | null;
  outgoing?: boolean;
  peerName?: string;
  phone?: boolean;
  endWhenAlone?: boolean;
  onClose: (reason?: 'no-answer') => void;
}) {
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [e2eeRoom, setE2eeRoom] = useState<Room | null>(null);
  const [e2eeReady, setE2eeReady] = useState(!e2eeKey);
  const closedRef = useRef(false);

  // Fetch the access token for this room.
  useEffect(() => {
    let cancelled = false;
    getRoomToken(roomId)
      .then((c) => {
        if (!cancelled) setCreds({ token: c.token, url: c.url });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not join the call');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Build an SFrame-E2EE room only when a key is supplied (currently never).
  useEffect(() => {
    if (!e2eeKey) {
      setE2eeRoom(null);
      setE2eeReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const keyProvider = new ExternalE2EEKeyProvider();
        const worker = new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
        const room = new Room({ encryption: { keyProvider, worker } });
        await keyProvider.setKey(e2eeKey);
        await room.setE2EEEnabled(true);
        if (cancelled) {
          room.disconnect().catch(() => {});
          worker.terminate();
          return;
        }
        setE2eeRoom(room);
        setE2eeReady(true);
      } catch {
        if (!cancelled) {
          setError('Encrypted calls aren’t supported in this browser.');
          setE2eeReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [e2eeKey]);

  // End on a real hang-up / disconnect / empty room — never on a bare unmount
  // (StrictMode fires that spuriously in dev). Guarded against double-close.
  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    leaveRoom(roomId).catch(() => {});
    onClose();
  };

  if (error) {
    return (
      <Shell>
        <div className="text-center">
          <p className="mb-4 text-red-300">{error}</p>
          <button
            type="button"
            onClick={close}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </Shell>
    );
  }

  if (!creds || !e2eeReady) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          {e2eeKey ? 'Securing call…' : 'Connecting…'}
        </div>
      </Shell>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black" data-lk-theme="default">
      <button
        type="button"
        onClick={close}
        className="fixed top-4 right-4 z-[60] rounded-full bg-red-600 px-4 py-2 font-bold text-sm text-white shadow-lg hover:bg-red-700"
      >
        End Call
      </button>
      <LiveKitRoom
        room={e2eeRoom ?? undefined}
        token={creds.token}
        serverUrl={creds.url}
        connect
        video={video}
        audio
        onDisconnected={close}
        onError={(e) => setError(e.message)}
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <CallEndWatcher enabled={!!endWhenAlone} onEmpty={close} />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Ends this side once everyone else has left — the other person hanging up a
 * 1:1, or the last peer leaving a group. Observes LiveKit's own room via context
 * (never replaces it). A short grace period ignores momentary reconnect blips so
 * a stable call is never dropped by a hiccup. Public Rooms pass enabled=false.
 */
function CallEndWatcher({ enabled, onEmpty }: { enabled: boolean; onEmpty: () => void }) {
  const room = useRoomContext();
  const hadRemoteRef = useRef(false);
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;

  useEffect(() => {
    if (!enabled || !room) return;
    let grace: number | null = null;
    const clearGrace = () => {
      if (grace !== null) {
        clearTimeout(grace);
        grace = null;
      }
    };
    const check = () => {
      if (room.remoteParticipants.size > 0) {
        hadRemoteRef.current = true;
        clearGrace(); // (back) in company — cancel any pending end
      } else if (hadRemoteRef.current && grace === null) {
        // had company, now empty — end after a short grace period
        grace = window.setTimeout(() => onEmptyRef.current(), 1500);
      }
    };
    room.on(RoomEvent.ParticipantConnected, check);
    room.on(RoomEvent.ParticipantDisconnected, check);
    check();
    return () => {
      clearGrace();
      room.off(RoomEvent.ParticipantConnected, check);
      room.off(RoomEvent.ParticipantDisconnected, check);
    };
  }, [enabled, room]);

  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">{children}</div>
  );
}
