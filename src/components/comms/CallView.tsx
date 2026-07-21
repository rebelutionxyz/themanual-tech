import '@livekit/components-styles';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import { ExternalE2EEKeyProvider, Room } from 'livekit-client';
import { useEffect, useState } from 'react';
import { getRoomToken, leaveRoom } from '@/lib/comms';

/**
 * A live LiveKit call (video or audio-only).
 *
 * When `e2eeKey` is supplied (DM/group calls — derived locally from the shared
 * conversation key, never transmitted), the room is created with LiveKit SFrame
 * end-to-end encryption, so the SFU cannot see the media. Without a key
 * (roulette / public rooms), media is transport-encrypted (DTLS-SRTP) as before.
 */
export function CallView({
  roomId,
  video = true,
  e2eeKey,
  onClose,
}: {
  roomId: string;
  video?: boolean;
  e2eeKey?: string | null;
  onClose: () => void;
}) {
  const [creds, setCreds] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [e2eeRoom, setE2eeRoom] = useState<Room | null>(null);
  const [e2eeReady, setE2eeReady] = useState(!e2eeKey);

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

  // Build an SFrame-E2EE room before connecting, keyed by the shared secret.
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

  if (!creds || !e2eeReady) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          {e2eeKey && !e2eeReady ? 'Securing call…' : 'Connecting…'}
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
      </LiveKitRoom>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">{children}</div>
  );
}
