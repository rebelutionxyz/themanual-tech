import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import { type MediaAsset, assetUrl, formatDuration, saveBlobToLibrary } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Circle,
  Film,
  Layers,
  Monitor,
  Play,
  Save,
  Smartphone,
  Square,
  Waves,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ACCENT = '#D97706';

// ═════════════════════════════════════════════════════════════════════
// COMPARE LAB — Creator Studio (/studio/compare). 2026-07-24.
// Two library videos overlaid; a fade slider (or auto-sweep) crossfades
// between them to show differences or similarities. Canvas composites,
// WebAudio crossfades both tracks with the same curve, MediaRecorder
// captures. Saves to the Library (source: compare_lab).
// ═════════════════════════════════════════════════════════════════════

function pickMime(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export function ComparePage() {
  const { bee } = useAuth();
  const navigate = useNavigate();

  const [a, setA] = useState<MediaAsset | null>(null);
  const [b, setB] = useState<MediaAsset | null>(null);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  const [fade, setFade] = useState(0); // 0 = all A · 1 = all B
  const [sweep, setSweep] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vidA = useRef<HTMLVideoElement | null>(null);
  const vidB = useRef<HTMLVideoElement | null>(null);
  const fadeRef = useRef(0);
  const sweepRef = useRef(false);
  const rafRef = useRef(0);
  const gainA = useRef<GainNode | null>(null);
  const gainB = useRef<GainNode | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAt = useRef(0);
  fadeRef.current = fade;
  sweepRef.current = sweep;

  const makeVideo = useCallback((asset: MediaAsset): HTMLVideoElement => {
    const el = document.createElement('video');
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.playsInline = true;
    el.loop = true;
    el.src = assetUrl(asset);
    el.load();
    return el;
  }, []);

  useEffect(() => {
    vidA.current?.pause();
    vidA.current = a ? makeVideo(a) : null;
    setPlaying(false);
  }, [a, makeVideo]);
  useEffect(() => {
    vidB.current?.pause();
    vidB.current = b ? makeVideo(b) : null;
    setPlaying(false);
  }, [b, makeVideo]);

  /* ───────────── composite loop ───────────── */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const w = canvas.width;
      const h = canvas.height;
      // Auto-sweep: slow sine oscillation A↔B.
      if (sweepRef.current) {
        const t = performance.now() / 1000;
        const f = (Math.sin(t * 1.1) + 1) / 2;
        fadeRef.current = f;
        setFade(f);
      }
      const f = fadeRef.current;
      if (gainA.current) gainA.current.gain.value = 1 - f;
      if (gainB.current) gainB.current.gain.value = f;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const fit = (el: HTMLVideoElement | null, alpha: number) => {
        if (!el || el.readyState < 2 || alpha <= 0.004) return;
        const vw = el.videoWidth || 16;
        const vh = el.videoHeight || 9;
        const scale = Math.min(w / vw, h / vh);
        const ow = vw * scale;
        const oh = vh * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(el, (w - ow) / 2, (h - oh) / 2, ow, oh);
        ctx.globalAlpha = 1;
      };
      fit(vidA.current, 1);
      fit(vidB.current, f);
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = portrait ? 720 : 1280;
      canvas.height = portrait ? 1280 : 720;
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, portrait]);

  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 250);
    return () => clearInterval(iv);
  }, [recording]);

  /* ───────────── playback + record ───────────── */

  function togglePlay() {
    const va = vidA.current;
    const vb = vidB.current;
    if (!va && !vb) return;
    if (playing) {
      va?.pause();
      vb?.pause();
      setPlaying(false);
    } else {
      if (va) void va.play().catch(() => {});
      if (vb) void vb.play().catch(() => {});
      setPlaying(true);
    }
  }

  function startRecording() {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    const ctx = new window.AudioContext();
    audioCtx.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    const wire = (el: HTMLVideoElement | null, store: { current: GainNode | null }) => {
      if (!el) return;
      try {
        const src = ctx.createMediaElementSource(el);
        const g = ctx.createGain();
        src.connect(g);
        g.connect(dest);
        g.connect(ctx.destination); // monitor
        store.current = g;
      } catch {
        /* already wired */
      }
    };
    wire(vidA.current, gainA);
    wire(vidB.current, gainB);

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
    };
    recorderRef.current = rec;
    if (!playing) togglePlay();
    startedAt.current = performance.now();
    setElapsed(0);
    setRecording(true);
    rec.start(500);
  }

  async function save() {
    if (!bee || !result || saving) return;
    setSaving(true);
    try {
      const saved = await saveBlobToLibrary(bee.id, result, {
        fileName: `compare-${a?.fileName.replace(/\.[a-z0-9]+$/i, '') ?? 'a'}-vs-${
          b?.fileName.replace(/\.[a-z0-9]+$/i, '') ?? 'b'
        }.webm`,
        mimeType: 'video/webm',
        source: 'compare_lab',
        editOf: a?.id ?? null,
        durationSeconds: elapsed,
        width: portrait ? 720 : 1280,
        height: portrait ? 1280 : 720,
      });
      setMsg(`Saved to your Library as ${saved.fileName}`);
      setResult(null);
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setMsg(null), 4000);
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
        Sign in to use the Compare Lab.{' '}
        <Link to="/login" className="underline" style={{ color: ACCENT }}>
          Sign in
        </Link>
      </div>
    );
  }

  const slot = (label: 'A' | 'B', asset: MediaAsset | null, open: () => void) => (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold text-white"
        style={{ background: label === 'A' ? '#3F3F46' : ACCENT }}
      >
        {label}
      </span>
      {asset ? (
        <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800">
          {asset.title || asset.fileName}
          {asset.durationSeconds !== null && (
            <span className="font-mono text-[11px] text-zinc-500">
              {' '}
              · {formatDuration(asset.durationSeconds)}
            </span>
          )}
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-[13px] text-zinc-500">Pick video {label}</span>
      )}
      <button
        type="button"
        onClick={open}
        disabled={recording}
        className="rounded-md border border-zinc-200 px-2.5 py-1 text-[12px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
      >
        {asset ? 'Swap' : 'Pick'}
      </button>
    </div>
  );

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
          <Layers size={18} style={{ color: ACCENT }} /> Compare Lab
        </h1>
      </div>

      {msg && (
        <p className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
          {msg}
        </p>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        {slot('A', a, () => setPicking('a'))}
        {slot('B', b, () => setPicking('b'))}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-black">
        <canvas ref={canvasRef} className="block w-full" />
        {recording && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            REC {formatDuration(elapsed)}
          </span>
        )}
        {!a && !b && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-zinc-400">
            <Film size={15} /> Pick two videos to compare
          </div>
        )}
      </div>

      {/* Fade controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] font-bold text-zinc-500">A</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(fade * 100)}
          onChange={(e) => {
            setSweep(false);
            setFade(Number(e.target.value) / 100);
          }}
          className="min-w-[160px] flex-1"
          style={{ accentColor: ACCENT }}
          aria-label="Fade between A and B"
        />
        <span className="font-mono text-[11px] font-bold" style={{ color: ACCENT }}>
          B
        </span>
        <button
          type="button"
          onClick={() => setPortrait((v) => !v)}
          disabled={recording}
          title={portrait ? 'Vertical 9:16 — tap for landscape' : 'Landscape 16:9 — tap for vertical'}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] disabled:opacity-40',
            portrait
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100',
          )}
        >
          {portrait ? <Smartphone size={13} /> : <Monitor size={13} />} {portrait ? '9:16' : '16:9'}
        </button>
        <button
          type="button"
          onClick={() => setSweep((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px]',
            sweep
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100',
          )}
        >
          <Waves size={13} /> {sweep ? 'Auto-sweep on' : 'Auto-sweep'}
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!a && !b}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
        >
          {playing ? <Square size={13} /> : <Play size={13} />} {playing ? 'Pause' : 'Play'}
        </button>
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!a || !b}
            className="ml-auto flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
            style={{ background: '#DC2626' }}
          >
            <Circle size={12} fill="currentColor" /> Record
          </button>
        ) : (
          <button
            type="button"
            onClick={() => recorderRef.current?.stop()}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
          >
            <Square size={12} fill="currentColor" /> Stop
          </button>
        )}
      </div>

      {/* Result */}
      {resultUrl && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
          {/* biome-ignore lint/a11y/useMediaCaption: creator's own fresh recording */}
          <video src={resultUrl} controls className="w-full rounded-md bg-black" />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save to Library'}
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {picking && (
        <MediaPicker
          kinds={['video']}
          onClose={() => setPicking(null)}
          onPick={(asset) => {
            if (picking === 'a') setA(asset);
            else setB(asset);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
