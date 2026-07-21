import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react';
import { DisconnectReason, ExternalE2EEKeyProvider, Room, type RoomOptions } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import { getRoomToken, leaveRoom } from '@/lib/comms';

// Force H.264 so iPadOS / iOS Safari can hardware-decode remote video and encode
// its own — VP8/VP9 frequently render as a black frame (remote) or freeze
// (local) on Safari. H.264 is supported by every browser, so this is safe for
// desktop/Chrome too. iOS video is genuinely finicky; a native app is the fully
// reliable path, but this is the standard, high-probability fix.
const ROOM_OPTIONS: RoomOptions = {
  publishDefaults: { videoCodec: 'h264' },
};

/**
 * A live LiveKit call (video or audio-only).
 *
 * PROVEN CONNECTION PATH: LiveKitRoom manages its own room for plain calls. We
 * only OBSERVE that room (via useRoomContext, in <CallEndWatcher>) to end the
 * call once everyone else has left — we never replace the room, which is what
 * previously regressed calls.
 *
 * An UNEXPECTED disconnect (not us hanging up) surfaces its reason on-screen —
 * a diagnostic for the iOS Safari drop.
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

  // End on a real hang-up / empty room — never on a bare unmount (StrictMode
  // fires that spuriously in dev). Guarded against double-close.
  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    leaveRoom(roomId).catch(() => {});
    onClose();
  };

  if (error) {
    return (
      <Shell>
        <div className="max-w-xs text-center">
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
        options={ROOM_OPTIONS}
        room={e2eeRoom ?? undefined}
        token={creds.token}
        serverUrl={creds.url}
        connect
        video={video}
        audio
        onDisconnected={(reason) => {
          if (closedRef.current) return; // we tore it down (End Call / other left)
          // Unexpected drop (e.g. the iOS Safari disconnect) — show why, on-screen.
          const name =
            reason === undefined ? 'unknown' : (DisconnectReason[reason] ?? String(reason));
          setError(`Call dropped — reason: ${name}. (Read this back to debug the drop.)`);
        }}
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
 * 1:1, or the last peer leaving a group. POLLS LiveKit's own room (via context)
 * once a second rather than trusting participant events, which fire unreliably;
 * it ends only after the room has been empty for ~2s (ignoring reconnect blips),
 * and only after someone was actually here. Public Rooms pass enabled=false.
 */
function CallEndWatcher({ enabled, onEmpty }: { enabled: boolean; onEmpty: () => void }) {
  const room = useRoomContext();
  const hadRemoteRef = useRef(false);
  const emptyTicksRef = useRef(0);
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;

  useEffect(() => {
    if (!enabled || !room) return;
    hadRemoteRef.current = room.remoteParticipants.size > 0;
    emptyTicksRef.current = 0;
    const id = window.setInterval(() => {
      if (room.remoteParticipants.size > 0) {
        hadRemoteRef.current = true;
        emptyTicksRef.current = 0;
      } else if (hadRemoteRef.current) {
        emptyTicksRef.current += 1;
        if (emptyTicksRef.current >= 2) onEmptyRef.current(); // empty ~2s → end our side
      }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, room]);

  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">{children}</div>
  );
}
