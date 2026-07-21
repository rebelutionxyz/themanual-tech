import '@livekit/components-styles';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import { ExternalE2EEKeyProvider, Room, RoomEvent } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import { callTimeout, getRoomToken, leaveRoom } from '@/lib/comms';

/**
 * A live LiveKit call — the video grid, or a dedicated audio-only "phone"
 * screen when `video` is false (avatar + mute, no video tiles).
 *
 * Outgoing calls (`outgoing`) show a "Calling …" screen and ring for a bounded
 * window (~13 rings). If nobody joins we end as "No answer" (comms_call_timeout),
 * which drops a "Missed call" on the other side. The moment the other side joins
 * we flip to the connected UI and cancel the timer.
 *
 * `endWhenAlone` auto-ends our side once everyone else has left — a 1:1 hang-up,
 * or the last peer leaving a group call. Off for public Rooms, where sitting
 * alone is valid.
 *
 * When `e2eeKey` is supplied the room is built with LiveKit SFrame E2EE. That's
 * currently gated OFF upstream (Safari/iOS can't do insertable streams), so the
 * key is null and media is transport-encrypted (DTLS-SRTP). Messages stay E2EE.
 */

const RING_WINDOW_MS = 39_000; // ≈ 13 rings at a ~3s cadence, then give up

export function CallView({
  roomId,
  video = true,
  e2eeKey,
  outgoing = false,
  peerName,
  phone = false,
  endWhenAlone = false,
  onClose,
}: {
  roomId: string;
  video?: boolean;
  e2eeKey?: string | null;
  outgoing?: boolean;
  peerName?: string;
  /** 1:1/group voice call → show the audio-only "phone" screen. Public voice
   *  Rooms leave this off and keep the multi-participant grid. */
  phone?: boolean;
  /** Auto-end our side once everyone else has left (1:1 hang-up, or the last
   *  peer leaving a group call). Off for public Rooms. */
  endWhenAlone?: boolean;
  onClose: (reason?: 'no-answer') => void;
}) {
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [ready, setReady] = useState(false);
  const [answered, setAnswered] = useState(!outgoing);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const hadRemoteRef = useRef(false); // has anyone else ever been in the room?
  const closedRef = useRef(false); // guard against double-close

  // Leave only on a real end (hang-up / disconnect / auto-end) — never on a
  // bare unmount, which React StrictMode fires spuriously in dev.
  const close = (reason?: 'no-answer') => {
    if (closedRef.current) return;
    closedRef.current = true;
    leaveRoom(roomId).catch(() => {});
    onCloseRef.current(reason);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

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

  // Build the Room ourselves (always) so we can watch participants and drive the
  // mic. With a key it's an SFrame-E2EE room; without, a plain room.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let r: Room;
        if (e2eeKey) {
          const keyProvider = new ExternalE2EEKeyProvider();
          const worker = new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
          r = new Room({ encryption: { keyProvider, worker } });
          await keyProvider.setKey(e2eeKey);
          await r.setE2EEEnabled(true);
        } else {
          r = new Room();
        }
        if (cancelled) {
          r.disconnect().catch(() => {});
          return;
        }
        setRoom(r);
        setReady(true);
      } catch {
        if (!cancelled) {
          setError('Encrypted calls aren’t supported in this browser.');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [e2eeKey]);

  // Watch the other side. First remote → we're connected (hides "Calling…" and
  // cancels the no-answer timer). If everyone else then leaves a call that had
  // company, end our side too (1:1: they hung up; group: the last one left).
  useEffect(() => {
    if (!room) return;
    const sync = () => {
      const n = room.remoteParticipants.size;
      if (n > 0) {
        hadRemoteRef.current = true;
        setAnswered(true);
      } else if (endWhenAlone && hadRemoteRef.current) {
        closeRef.current();
      }
    };
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    sync();
    return () => {
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
    };
  }, [room, endWhenAlone]);

  // No-answer timeout for an unanswered outgoing call.
  useEffect(() => {
    if (!outgoing || answered || !room) return;
    const t = window.setTimeout(() => {
      if (closedRef.current) return;
      closedRef.current = true;
      callTimeout(roomId).catch(() => {});
      onCloseRef.current('no-answer');
    }, RING_WINDOW_MS);
    return () => clearTimeout(t);
  }, [outgoing, answered, room, roomId]);

  if (error) {
    return (
      <Shell>
        <div className="text-center">
          <p className="mb-4 text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => close()}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </Shell>
    );
  }

  if (!creds || !ready || !room) {
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
        onClick={() => close()}
        className="fixed top-4 right-4 z-[60] rounded-full bg-red-600 px-4 py-2 font-bold text-sm text-white shadow-lg hover:bg-red-700"
      >
        End Call
      </button>
      <LiveKitRoom
        room={room}
        token={creds.token}
        serverUrl={creds.url}
        connect
        video={video}
        audio
        onDisconnected={() => close()}
        onError={(e) => setError(e.message)}
        style={{ height: '100%' }}
      >
        {!video && phone ? <AudioStage room={room} peerName={peerName} /> : <VideoConference />}
        <RoomAudioRenderer />
      </LiveKitRoom>

      {outgoing && !answered && <CallingOverlay peerName={peerName} onCancel={() => close()} />}
    </div>
  );
}

/** Dedicated audio-only screen — avatar, name, and a mute toggle. No video grid. */
function AudioStage({ room, peerName }: { room: Room; peerName?: string }) {
  const [muted, setMuted] = useState(false);
  const label = peerName || 'On call';
  const initial = (peerName?.replace(/^@/, '')[0] || '•').toUpperCase();
  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
    } catch {
      /* mic may not be granted — leave the UI in its optimistic state */
    }
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 text-white">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 font-bold text-5xl">
        {initial}
      </div>
      <div className="text-center">
        <div className="font-semibold text-xl">{label}</div>
        <div className="mt-1 text-sm text-white/50">Voice call</div>
      </div>
      <button
        type="button"
        onClick={toggleMute}
        className={`rounded-full px-6 py-2.5 font-bold text-sm transition-colors ${
          muted ? 'bg-white text-black hover:bg-white/90' : 'bg-white/15 text-white hover:bg-white/25'
        }`}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
}

/** Full-screen "Calling …" state shown to the caller until the other side joins. */
function CallingOverlay({ peerName, onCancel }: { peerName?: string; onCancel: () => void }) {
  const initial = (peerName?.replace(/^@/, '')[0] || '•').toUpperCase();
  return (
    <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-7 bg-black/95 text-white">
      <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-white/10 font-bold text-4xl">
        {initial}
      </div>
      <div className="text-center">
        <div className="font-semibold text-xl">Calling {peerName || '…'}</div>
        <div className="mt-1 text-sm text-white/50">Ringing…</div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full bg-red-600 px-6 py-2.5 font-bold text-sm text-white hover:bg-red-700"
      >
        Cancel
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">{children}</div>
  );
}
