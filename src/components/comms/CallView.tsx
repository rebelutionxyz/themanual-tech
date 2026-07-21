import '@livekit/components-styles';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import { useEffect, useState } from 'react';
import { getRoomToken, leaveRoom } from '@/lib/comms';

/**
 * A live LiveKit call (video or audio-only) for a comms_room the caller is
 * already a participant of. Mints a room-scoped token from the `livekit-token`
 * edge function, connects, and renders the LiveKit conference UI.
 *
 * v1: media is encrypted in transit (DTLS-SRTP). Full end-to-end media
 * encryption (SFU-blind) is the next step — see the E2EE key-provider wiring.
 */
export function CallView({
  roomId,
  video = true,
  onClose,
}: {
  roomId: string;
  video?: boolean;
  onClose: () => void;
}) {
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Leave only on a real end (hang-up / disconnect / close) — NOT on unmount,
  // which React StrictMode fires spuriously in dev and would kill the room.
  const close = () => {
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

  if (!creds) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          Connecting…
        </div>
      </Shell>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black" data-lk-theme="default">
      <LiveKitRoom
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
      </LiveKitRoom>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">{children}</div>
  );
}
