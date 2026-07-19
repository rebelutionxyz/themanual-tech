import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import {
  type MediaAsset,
  assetUrl,
  formatDuration,
  getAsset,
  saveBlobToLibrary,
} from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Camera,
  Check,
  Circle,
  Download,
  Film,
  LayoutPanelLeft,
  Mic,
  MicOff,
  PictureInPicture2,
  Save,
  Square,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const ACCENT = '#D97706';
const FILL = '#FAD15E';

// ═════════════════════════════════════════════════════════════════════
// RESPONSE RECORDER — Creator Studio (/studio/record[?respond=assetId]).
// Film yourself while another library video plays — duet-style. Layouts:
// camera picture-in-picture over the video, side-by-side, or camera only.
// Canvas composites both feeds; WebAudio mixes mic + video audio;
// MediaRecorder captures the result. Saves to the Library with lineage
// (source: response_recorder, edit_of: the video you responded to).
// ═════════════════════════════════════════════════════════════════════

type Layout = 'pip' | 'side' | 'camera';

function pickMime(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export function ResponseRecorderPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const respondTo = params.get('respond');

  const [source, setSource] = useState<MediaAsset | null>(null);
  const [layout, setLayout] = useState<Layout>('pip');
  const [micOn, setMicOn] = useState(true);
  const [camReady, setCamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camVideo = useRef<HTMLVideoElement | null>(null);
  const srcVideo = useRef<HTMLVideoElement | null>(null);
  const camStream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const micGain = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef(0);
  const startedAt = useRef(0);
  const layoutRef = useRef<Layout>('pip');
  layoutRef.current = layout;

  /* ───────────── load "respond to" source ───────────── */

  useEffect(() => {
    let cancelled = false;
    if (!respondTo) {
      setSource(null);
      return;
    }
    getAsset(respondTo)
      .then((a) => {
        if (cancelled) return;
        if (!a || a.kind !== 'video') {
          setError('That video was not found in your library');
          return;
        }
        setSource(a);
      })
      .catch(() => !cancelled && setError('Could not load the video'));
    return () => {
      cancelled = true;
    };
  }, [respondTo]);

  useEffect(() => {
    if (!source) {
      srcVideo.current = null;
      return;
    }
    const el = document.createElement('video');
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.playsInline = true;
    el.src = assetUrl(source);
    el.load();
    srcVideo.current = el;
    return () => el.pause();
  }, [source]);

  /* ───────────── camera ───────────── */

  useEffect(() => {
    let cancelled = false;
    async function openCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        camStream.current = stream;
        const el = document.createElement('video');
        el.muted = true;
        el.playsInline = true;
        el.srcObject = stream;
        await el.play();
        camVideo.current = el;
        setCamReady(true);
      } catch {
        if (!cancelled) setError('Camera/microphone access was blocked — allow it and reload.');
      }
    }
    void openCam();
    return () => {
      cancelled = true;
      for (const t of camStream.current?.getTracks() ?? []) t.stop();
    };
  }, []);

  useEffect(() => {
    const track = camStream.current?.getAudioTracks()[0];
    if (track) track.enabled = micOn;
  }, [micOn]);

  /* ───────────── composite loop ───────────── */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cam = camVideo.current;
      const src = srcVideo.current;
      const mode = layoutRef.current;

      const drawFit = (
        el: HTMLVideoElement,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
        cover = false,
      ) => {
        if (el.readyState < 2) return;
        const vw = el.videoWidth || 16;
        const vh = el.videoHeight || 9;
        const scale = cover ? Math.max(dw / vw, dh / vh) : Math.min(dw / vw, dh / vh);
        const sw = dw / scale;
        const sh = dh / scale;
        if (cover) {
          ctx.drawImage(el, (vw - sw) / 2, (vh - sh) / 2, sw, sh, dx, dy, dw, dh);
        } else {
          const ow = vw * scale;
          const oh = vh * scale;
          ctx.drawImage(el, dx + (dw - ow) / 2, dy + (dh - oh) / 2, ow, oh);
        }
      };

      if (mode === 'camera' || !src) {
        if (cam) drawFit(cam, 0, 0, w, h, true);
      } else if (mode === 'side') {
        drawFit(src, 0, 0, w / 2, h);
        if (cam) drawFit(cam, w / 2, 0, w / 2, h, true);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(w / 2 - 2, 0, 4, h);
      } else {
        // pip — source full, camera bottom-right
        drawFit(src, 0, 0, w, h);
        if (cam) {
          const pw = Math.round(w * 0.28);
          const ph = Math.round(pw * 0.75);
          const px = w - pw - Math.round(w * 0.025);
          const py = h - ph - Math.round(w * 0.025);
          ctx.save();
          ctx.strokeStyle = FILL;
          ctx.lineWidth = Math.max(3, w / 320);
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 10);
          ctx.clip();
          drawFit(cam, px, py, pw, ph, true);
          ctx.restore();
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 10);
          ctx.stroke();
        }
      }
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1280;
      canvas.height = 720;
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 250);
    return () => clearInterval(iv);
  }, [recording]);

  /* ───────────── record ───────────── */

  function begin() {
    if (!camReady || recording || countdown !== null) return;
    setResult(null);
    setCountdown(3);
    const step = (n: number) => {
      if (n === 0) {
        setCountdown(null);
        startRecording();
        return;
      }
      setCountdown(n);
      setTimeout(() => step(n - 1), 800);
    };
    step(3);
  }

  function startRecording() {
    const canvas = canvasRef.current;
    if (!canvas || !camStream.current) return;

    // Audio graph: mic + (source video audio when not camera-only)
    const Ctx = window.AudioContext;
    const ctx = new Ctx();
    audioCtx.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    const mic = ctx.createMediaStreamSource(camStream.current);
    micGain.current = ctx.createGain();
    mic.connect(micGain.current);
    micGain.current.connect(dest);
    const src = srcVideo.current;
    if (src && layoutRef.current !== 'camera') {
      try {
        const sv = ctx.createMediaElementSource(src);
        const g = ctx.createGain();
        g.gain.value = 0.9;
        sv.connect(g);
        g.connect(dest);
        g.connect(ctx.destination); // monitor the source audio
      } catch {
        /* already wired */
      }
    }

    const stream = canvas.captureStream(30);
    for (const t of dest.stream.getAudioTracks()) stream.addTrack(t);
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 4_500_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      setResult(new Blob(chunksRef.current, { type: 'video/webm' }));
      setRecording(false);
      srcVideo.current?.pause();
    };
    recorderRef.current = rec;

    if (src && layoutRef.current !== 'camera') {
      src.currentTime = 0;
      src.onended = () => stop();
      void src.play().catch(() => {});
    }
    startedAt.current = performance.now();
    setElapsed(0);
    setRecording(true);
    rec.start(500);
  }

  function stop() {
    recorderRef.current?.stop();
  }

  async function save() {
    if (!bee || !result || saving) return;
    setSaving(true);
    try {
      const saved = await saveBlobToLibrary(bee.id, result, {
        fileName: source
          ? `response-${source.fileName.replace(/\.[a-z0-9]+$/i, '')}.webm`
          : 'recording.webm',
        mimeType: 'video/webm',
        source: 'response_recorder',
        editOf: source?.id ?? null,
        durationSeconds: elapsed,
        width: 1280,
        height: 720,
      });
      setSavedMsg(`Saved to your Library as ${saved.fileName}`);
      setResult(null);
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setSavedMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const resultUrl = useMemo(() => (result ? URL.createObjectURL(result) : null), [result]);
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!bee) {
    return (
      <div className="safe-pad-x mx-auto w-full max-w-3xl px-4 py-10 text-center text-[13px] text-zinc-500">
        Sign in to record.{' '}
        <Link to="/login" className="underline" style={{ color: ACCENT }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="safe-pad-x mx-auto w-full max-w-4xl px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft size={13} /> Studio
        </button>
        <h1 className="flex items-center gap-2 font-display text-[17px] font-semibold text-zinc-900">
          <Camera size={18} style={{ color: ACCENT }} /> Response Recorder
        </h1>
      </div>

      {savedMsg && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
          <Check size={13} /> {savedMsg}
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {/* Source strip */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
        <Film size={14} className="flex-shrink-0" style={{ color: ACCENT }} />
        {source ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800">
              Responding to <span className="font-medium">{source.title || source.fileName}</span>
              {source.durationSeconds !== null && (
                <span className="font-mono text-[11px] text-zinc-500">
                  {' '}
                  · {formatDuration(source.durationSeconds)}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                params.delete('respond');
                setParams(params, { replace: true });
                setSource(null);
              }}
              disabled={recording}
              className="rounded p-1 text-zinc-400 hover:text-red-600 disabled:opacity-40"
              aria-label="Clear source video"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-[13px] text-zinc-500">
              Camera-only recording — or pick a library video to respond to.
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={recording}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-[12px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            >
              Pick video
            </button>
          </>
        )}
      </div>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-black">
        <canvas ref={canvasRef} className="mx-auto block max-h-[60vh] w-full object-contain" />
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="font-display text-[90px] font-bold text-white drop-shadow-lg">
              {countdown}
            </span>
          </div>
        )}
        {recording && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            REC {formatDuration(elapsed)}
          </span>
        )}
        {!camReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-zinc-400">
            Waiting for camera…
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
          <LayoutBtn
            active={layout === 'pip'}
            disabled={!source}
            title="Picture-in-picture"
            onClick={() => setLayout('pip')}
          >
            <PictureInPicture2 size={14} /> PiP
          </LayoutBtn>
          <LayoutBtn
            active={layout === 'side'}
            disabled={!source}
            title="Side by side"
            onClick={() => setLayout('side')}
          >
            <LayoutPanelLeft size={14} /> Split
          </LayoutBtn>
          <LayoutBtn
            active={layout === 'camera'}
            title="Camera only"
            onClick={() => setLayout('camera')}
          >
            <Video size={14} /> Camera
          </LayoutBtn>
        </div>
        <button
          type="button"
          onClick={() => setMicOn((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px]',
            micOn
              ? 'border-zinc-200 text-zinc-700 hover:bg-zinc-100'
              : 'border-red-200 bg-red-50 text-red-600',
          )}
        >
          {micOn ? <Mic size={13} /> : <MicOff size={13} />} {micOn ? 'Mic on' : 'Mic muted'}
        </button>
        <div className="ml-auto">
          {!recording ? (
            <button
              type="button"
              onClick={begin}
              disabled={!camReady || countdown !== null}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: '#DC2626', color: '#fff' }}
            >
              <Circle size={13} fill="#fff" /> {countdown !== null ? 'Get ready…' : 'Record'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Square size={13} fill="#fff" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {result && resultUrl && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="mb-2 text-[13px] font-medium text-zinc-800">
            Take complete ({formatDuration(elapsed)} · {(result.size / (1024 * 1024)).toFixed(1)}{' '}
            MB)
          </p>
          {/* biome-ignore lint/a11y/useMediaCaption: fresh user recording has no caption track */}
          <video
            src={resultUrl}
            controls
            playsInline
            className="mb-2 max-h-64 w-full rounded bg-black"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
              style={{ background: FILL, color: '#18181b' }}
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save to Library'}
            </button>
            <button
              type="button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = resultUrl;
                a.download = 'response.webm';
                a.click();
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-600 hover:bg-zinc-100"
            >
              <Download size={13} /> Download
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-600 hover:bg-zinc-100"
            >
              <X size={13} /> Discard take
            </button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <MediaPicker
          kinds={['video']}
          onClose={() => setPickerOpen(false)}
          onPick={(a) => {
            setPickerOpen(false);
            params.set('respond', a.id);
            setParams(params, { replace: true });
          }}
        />
      )}
    </div>
  );
}

function LayoutBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40',
        !active && 'text-zinc-500 hover:text-zinc-900',
      )}
      style={active ? { color: ACCENT, background: `${ACCENT}14`, fontWeight: 600 } : undefined}
    >
      {children}
    </button>
  );
}
