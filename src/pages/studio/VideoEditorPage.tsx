import { MediaPicker } from '@/components/studio/MediaPicker';
import { useAuth } from '@/lib/auth';
import {
  type MediaAsset,
  assetUrl,
  formatDuration,
  getAsset,
  saveBlobToLibrary,
  updateAssetMeta,
} from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Check,
  Download,
  Film,
  Link2,
  Music,
  Pause,
  Play,
  Plus,
  Save,
  Scissors,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const ACCENT = '#D97706';
const FILL = '#FAD15E';

// ═════════════════════════════════════════════════════════════════════
// VIDEO EDITOR — Creator Studio (/studio/edit/video/:assetId).
// Timeline of library clips (splice), per-clip trim (cut), timed text +
// link overlays, background audio from the library, volume mix. Preview
// renders clips through one canvas; EXPORT is a real-time re-render
// captured with MediaRecorder (canvas.captureStream + WebAudio mix) —
// no server, no wasm. Saves back to the Library (source: video_editor).
// ═════════════════════════════════════════════════════════════════════

interface Clip {
  id: string;
  asset: MediaAsset;
  inSec: number;
  outSec: number;
}

interface TextOv {
  id: string;
  text: string;
  url: string | null;
  /** position as fraction of canvas (0–1, top-left of text block) */
  x: number;
  y: number;
  /** font size as fraction of canvas height */
  size: number;
  color: string;
  bg: boolean;
  startSec: number;
  endSec: number;
}

const SWATCHES = ['#ffffff', '#18181b', '#FAD15E', '#D97706', '#DC2626', '#2563EB', '#15803D'];

function clipLen(c: Clip): number {
  return Math.max(0, c.outSec - c.inSec);
}

function pickMime(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export function VideoEditorPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { bee } = useAuth();
  const navigate = useNavigate();

  const [clips, setClips] = useState<Clip[]>([]);
  const [texts, setTexts] = useState<TextOv[]>([]);
  const [audioAsset, setAudioAsset] = useState<MediaAsset | null>(null);
  const [musicVolume, setMusicVolume] = useState(60);
  const [originalVolume, setOriginalVolume] = useState(100);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'clip' | 'audio' | null>(null);
  const [exporting, setExporting] = useState<null | { at: number; total: number }>(null);
  const [exportResult, setExportResult] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoPool = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const mixDest = useRef<MediaStreamAudioDestinationNode | null>(null);
  const clipGain = useRef<GainNode | null>(null);
  const musicGain = useRef<GainNode | null>(null);
  const wiredEls = useRef<Set<HTMLMediaElement>>(new Set());
  const rafRef = useRef<number>(0);
  const playStateRef = useRef<{ playing: boolean; t: number; last: number; exporting: boolean }>({
    playing: false,
    t: 0,
    last: 0,
    exporting: false,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const dragText = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const duration = useMemo(() => clips.reduce((n, c) => n + clipLen(c), 0), [clips]);
  const selText = useMemo(
    () => texts.find((t) => t.id === selectedText) ?? null,
    [texts, selectedText],
  );

  /* ───────────── load initial clip ───────────── */

  useEffect(() => {
    let cancelled = false;
    if (!assetId) return;
    getAsset(assetId)
      .then((a) => {
        if (cancelled) return;
        if (!a || a.kind !== 'video') {
          setLoadError('Video not found in your library');
          return;
        }
        setClips([{ id: crypto.randomUUID(), asset: a, inSec: 0, outSec: a.durationSeconds ?? 0 }]);
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Load failed'));
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  /* ───────────── media element pool + audio graph ───────────── */

  const ensureAudioGraph = useCallback(() => {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext;
      audioCtx.current = new Ctx();
      mixDest.current = audioCtx.current.createMediaStreamDestination();
      clipGain.current = audioCtx.current.createGain();
      musicGain.current = audioCtx.current.createGain();
      clipGain.current.connect(mixDest.current);
      clipGain.current.connect(audioCtx.current.destination);
      musicGain.current.connect(mixDest.current);
      musicGain.current.connect(audioCtx.current.destination);
    }
    void audioCtx.current.resume();
  }, []);

  const getVideoEl = useCallback((clip: Clip): HTMLVideoElement => {
    let el = videoPool.current.get(clip.id);
    if (!el) {
      el = document.createElement('video');
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.playsInline = true;
      el.src = assetUrl(clip.asset);
      el.load();
      videoPool.current.set(clip.id, el);
    }
    // Wire into the audio graph once the graph exists (after user gesture).
    if (audioCtx.current && clipGain.current && !wiredEls.current.has(el)) {
      try {
        const src = audioCtx.current.createMediaElementSource(el);
        src.connect(clipGain.current);
        wiredEls.current.add(el);
      } catch {
        /* already wired elsewhere */
      }
    }
    return el;
  }, []);

  useEffect(() => {
    if (!audioAsset) {
      audioEl.current?.pause();
      audioEl.current = null;
      return;
    }
    const el = document.createElement('audio');
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.loop = true;
    el.src = assetUrl(audioAsset);
    el.load();
    audioEl.current = el;
    if (audioCtx.current && musicGain.current && !wiredEls.current.has(el)) {
      try {
        const src = audioCtx.current.createMediaElementSource(el);
        src.connect(musicGain.current);
        wiredEls.current.add(el);
      } catch {
        /* noop */
      }
    }
    return () => {
      el.pause();
    };
  }, [audioAsset]);

  useEffect(() => {
    if (clipGain.current) clipGain.current.gain.value = originalVolume / 100;
    if (musicGain.current) musicGain.current.gain.value = musicVolume / 100;
  }, [originalVolume, musicVolume]);

  /* ───────────── timeline mapping ───────────── */

  const locate = useCallback(
    (t: number): { clip: Clip; local: number; index: number } | null => {
      let acc = 0;
      for (let i = 0; i < clips.length; i++) {
        const len = clipLen(clips[i]);
        if (t < acc + len || i === clips.length - 1) {
          return { clip: clips[i], local: Math.min(t - acc, len) + clips[i].inSec, index: i };
        }
        acc += len;
      }
      return null;
    },
    [clips],
  );

  /* ───────────── render loop ───────────── */

  const drawFrame = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas || clips.length === 0) return;
      const loc = locate(t);
      if (!loc) return;
      const el = getVideoEl(loc.clip);
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      if (el.readyState >= 2) {
        const vw = el.videoWidth || 16;
        const vh = el.videoHeight || 9;
        const scale = Math.min(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      // overlays active at t
      for (const ov of texts) {
        if (t < ov.startSec || t > ov.endSec) continue;
        const size = Math.max(10, ov.size * h);
        ctx.font = `700 ${size}px system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        const label = ov.url ? `${ov.text} 🔗` : ov.text;
        const tw = ctx.measureText(label).width;
        const x = ov.x * w;
        const y = ov.y * h;
        if (ov.bg) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          const pad = size * 0.25;
          ctx.fillRect(x - pad, y - pad, tw + pad * 2, size * 1.2 + pad * 2);
        }
        ctx.fillStyle = ov.color;
        ctx.fillText(label, x, y);
        if (ov.id === selectedText && !playStateRef.current.exporting) {
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = Math.max(2, h / 300);
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(x - 6, y - 6, tw + 12, size * 1.2 + 12);
          ctx.setLineDash([]);
        }
      }
    },
    [clips, texts, selectedText, locate, getVideoEl],
  );

  const syncMedia = useCallback(
    (t: number, wantPlay: boolean) => {
      const loc = locate(t);
      if (!loc) return;
      // pause all non-active
      for (const [id, el] of videoPool.current) {
        if (id !== loc.clip.id && !el.paused) el.pause();
      }
      const el = getVideoEl(loc.clip);
      if (Math.abs(el.currentTime - loc.local) > 0.3) el.currentTime = loc.local;
      if (wantPlay && el.paused) void el.play().catch(() => {});
      if (!wantPlay && !el.paused) el.pause();
      const music = audioEl.current;
      if (music) {
        if (wantPlay && music.paused) void music.play().catch(() => {});
        if (!wantPlay && !music.paused) music.pause();
      }
    },
    [locate, getVideoEl],
  );

  const tick = useCallback(
    (now: number) => {
      const ps = playStateRef.current;
      if (ps.playing) {
        const dt = (now - ps.last) / 1000;
        ps.last = now;
        ps.t = Math.min(ps.t + dt, duration);
        setPlayhead(ps.t);
        syncMedia(ps.t, true);
        if (ps.t >= duration) {
          if (ps.exporting) {
            finishExport();
          } else {
            ps.playing = false;
            setPlaying(false);
            syncMedia(ps.t, false);
          }
        }
      }
      drawFrame(ps.t);
      rafRef.current = requestAnimationFrame(tick);
    },
    // finishExport is stable-by-ref below (defined with useRef pattern)
    [duration, drawFrame, syncMedia],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  function togglePlay() {
    ensureAudioGraph();
    const ps = playStateRef.current;
    if (ps.playing) {
      ps.playing = false;
      setPlaying(false);
      syncMedia(ps.t, false);
    } else {
      if (ps.t >= duration) ps.t = 0;
      ps.playing = true;
      ps.last = performance.now();
      setPlaying(true);
    }
  }

  function seek(t: number) {
    const ps = playStateRef.current;
    ps.t = Math.max(0, Math.min(t, duration));
    setPlayhead(ps.t);
    syncMedia(ps.t, ps.playing);
  }

  /* ───────────── export ───────────── */

  const chunksRef = useRef<BlobPart[]>([]);

  const finishExport = useCallback(() => {
    const ps = playStateRef.current;
    if (!ps.exporting) return;
    ps.playing = false;
    ps.exporting = false;
    setPlaying(false);
    syncMedia(ps.t, false);
    recorderRef.current?.stop();
  }, [syncMedia]);

  function startExport() {
    if (clips.length === 0 || exporting) return;
    ensureAudioGraph();
    const canvas = canvasRef.current;
    if (!canvas || !mixDest.current) return;
    // wire every element into the graph before capture
    for (const c of clips) getVideoEl(c);
    const stream = canvas.captureStream(30);
    for (const track of mixDest.current.stream.getAudioTracks()) stream.addTrack(track);
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 5_000_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      setExporting(null);
      setExportResult(new Blob(chunksRef.current, { type: 'video/webm' }));
    };
    recorderRef.current = rec;
    const ps = playStateRef.current;
    ps.t = 0;
    ps.last = performance.now();
    ps.playing = true;
    ps.exporting = true;
    setPlaying(true);
    setExporting({ at: 0, total: duration });
    syncMedia(0, true);
    rec.start(500);
  }

  useEffect(() => {
    if (!exporting) return;
    const iv = setInterval(() => {
      setExporting((e) => (e ? { ...e, at: playStateRef.current.t } : e));
    }, 250);
    return () => clearInterval(iv);
  }, [exporting]);

  async function saveExport() {
    if (!bee || !exportResult || saving) return;
    setSaving(true);
    try {
      const first = clips[0]?.asset;
      const links = texts.filter((t) => t.url).map((t) => `${t.text}: ${t.url}`);
      const saved = await saveBlobToLibrary(bee.id, exportResult, {
        fileName: `${(first?.fileName ?? 'video').replace(/\.[a-z0-9]+$/i, '')}-edit.webm`,
        mimeType: 'video/webm',
        source: 'video_editor',
        editOf: first?.id ?? null,
        folderId: first?.folderId ?? null,
        durationSeconds: duration,
      });
      if (links.length > 0) {
        await updateAssetMeta(saved.id, { description: `Links:\n${links.join('\n')}` });
      }
      setSavedMsg(`Saved to your Library as ${saved.fileName}`);
      setExportResult(null);
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setSavedMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  /* ───────────── canvas sizing ───────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || clips.length === 0) return;
    const a = clips[0].asset;
    const w = a.width && a.width > 0 ? a.width : 1280;
    const h = a.height && a.height > 0 ? a.height : 720;
    const scale = Math.min(1, 1280 / w);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
  }, [clips]);

  /* ───────────── text overlay drag ───────────── */

  function canvasPoint(e: React.PointerEvent): [number, number] {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  function onCanvasDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const [fx, fy] = canvasPoint(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const t = playStateRef.current.t;
    for (let i = texts.length - 1; i >= 0; i--) {
      const ov = texts[i];
      if (t < ov.startSec || t > ov.endSec) continue;
      const size = ov.size * canvas.height;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      const tw = ctx.measureText(ov.url ? `${ov.text} 🔗` : ov.text).width / canvas.width;
      const th = (size * 1.3) / canvas.height;
      if (
        fx >= ov.x - 0.01 &&
        fx <= ov.x + tw + 0.01 &&
        fy >= ov.y - 0.01 &&
        fy <= ov.y + th + 0.01
      ) {
        setSelectedText(ov.id);
        dragText.current = { id: ov.id, dx: fx - ov.x, dy: fy - ov.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }
    setSelectedText(null);
  }

  function onCanvasMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = dragText.current;
    if (!d) return;
    const [fx, fy] = canvasPoint(e);
    setTexts((ts) =>
      ts.map((t) =>
        t.id === d.id
          ? {
              ...t,
              x: Math.max(0, Math.min(0.98, fx - d.dx)),
              y: Math.max(0, Math.min(0.95, fy - d.dy)),
            }
          : t,
      ),
    );
  }

  /* ───────────── clip ops ───────────── */

  function patchClip(id: string, patch: Partial<Pick<Clip, 'inSec' | 'outSec'>>) {
    setClips((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeClip(id: string) {
    videoPool.current.get(id)?.pause();
    videoPool.current.delete(id);
    setClips((cs) => cs.filter((c) => c.id !== id));
  }

  function moveClip(id: string, dir: -1 | 1) {
    setClips((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      const [c] = next.splice(i, 1);
      next.splice(j, 0, c);
      return next;
    });
  }

  function addText() {
    const t = playStateRef.current.t;
    const item: TextOv = {
      id: crypto.randomUUID(),
      text: 'Your text',
      url: null,
      x: 0.08,
      y: 0.08,
      size: 0.07,
      color: '#ffffff',
      bg: true,
      startSec: Math.floor(t),
      endSec: Math.min(duration, Math.floor(t) + 4),
    };
    setTexts((ts) => [...ts, item]);
    setSelectedText(item.id);
  }

  if (!bee) {
    return (
      <div className="safe-pad-x mx-auto w-full max-w-3xl px-4 py-10 text-center text-[13px] text-zinc-500">
        Sign in to use the editor.{' '}
        <Link to="/login" className="underline" style={{ color: ACCENT }}>
          Sign in
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="safe-pad-x mx-auto w-full max-w-3xl px-4 py-10">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          {loadError}
        </p>
        <Link
          to="/studio"
          className="mt-3 inline-block text-[13px] underline"
          style={{ color: ACCENT }}
        >
          ← Back to Creators Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="safe-pad-x mx-auto w-full max-w-6xl px-4 py-4">
      {/* Top bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft size={13} /> Studio
        </button>
        <h1 className="flex items-center gap-2 font-display text-[17px] font-semibold text-zinc-900">
          <Film size={18} style={{ color: ACCENT }} /> Video Editor
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={startExport}
            disabled={clips.length === 0 || exporting !== null}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
            style={{ background: FILL, color: '#18181b' }}
          >
            <Save size={13} /> {exporting ? 'Rendering…' : 'Render & save'}
          </button>
        </div>
      </div>

      {savedMsg && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
          <Check size={13} /> {savedMsg}
        </p>
      )}

      {/* Export progress */}
      {exporting && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-[12.5px] font-medium text-zinc-800">
            Rendering in real time — keep this tab open ({formatDuration(exporting.at)} /{' '}
            {formatDuration(exporting.total)})
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${exporting.total ? Math.min(100, (exporting.at / exporting.total) * 100) : 0}%`,
                background: ACCENT,
              }}
            />
          </div>
          <button
            type="button"
            onClick={finishExport}
            className="mt-2 rounded border border-zinc-300 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-white"
          >
            Stop here
          </button>
        </div>
      )}

      {/* Export result */}
      {exportResult && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <span className="text-[12.5px] font-medium text-zinc-800">
            Render complete ({(exportResult.size / (1024 * 1024)).toFixed(1)} MB webm)
          </span>
          <button
            type="button"
            onClick={() => void saveExport()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-50"
            style={{ background: FILL, color: '#18181b' }}
          >
            <Save size={12} /> {saving ? 'Saving…' : 'Save to Library'}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(exportResult);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'edit.webm';
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
            }}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100"
          >
            <Download size={12} /> Download
          </button>
          <button
            type="button"
            onClick={() => setExportResult(null)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Discard render"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Preview + transport */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black">
            <canvas
              ref={canvasRef}
              onPointerDown={onCanvasDown}
              onPointerMove={onCanvasMove}
              onPointerUp={() => {
                dragText.current = null;
              }}
              className="mx-auto block max-h-[58vh] w-full object-contain"
              style={{ touchAction: 'none' }}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              disabled={clips.length === 0 || exporting !== null}
              aria-label={playing ? 'Pause' : 'Play'}
              className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: FILL, color: '#18181b' }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0.01, duration)}
              step={0.01}
              value={playhead}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={exporting !== null}
              aria-label="Timeline position"
              className="min-w-0 flex-1 accent-amber-500"
            />
            <span className="font-mono text-[11px] text-zinc-500" data-size="meta">
              {formatDuration(playhead)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Clip timeline */}
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                <Scissors size={12} /> Clips (splice & cut)
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen('clip')}
                className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
              >
                <Plus size={12} /> Add clip
              </button>
            </div>
            {clips.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-zinc-500">No clips.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {clips.map((c, i) => {
                  const max = c.asset.durationSeconds ?? c.outSec;
                  return (
                    <li key={c.id} className="rounded-md border border-zinc-200 p-2.5">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-[10.5px] text-zinc-400" data-size="meta">
                          #{i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-zinc-800">
                          {c.asset.title || c.asset.fileName}
                        </span>
                        <span className="font-mono text-[10.5px] text-zinc-500" data-size="meta">
                          {formatDuration(clipLen(c))}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveClip(c.id, -1)}
                          disabled={i === 0}
                          aria-label="Move clip earlier"
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveClip(c.id, 1)}
                          disabled={i === clips.length - 1}
                          aria-label="Move clip later"
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeClip(c.id)}
                          aria-label="Remove clip"
                          className="rounded border border-red-200 p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`in-${c.id}`}
                            className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                          >
                            In · {c.inSec.toFixed(1)}s
                          </label>
                          <input
                            id={`in-${c.id}`}
                            type="range"
                            min={0}
                            max={max}
                            step={0.1}
                            value={c.inSec}
                            onChange={(e) =>
                              patchClip(c.id, {
                                inSec: Math.min(Number(e.target.value), c.outSec - 0.2),
                              })
                            }
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`out-${c.id}`}
                            className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                          >
                            Out · {c.outSec.toFixed(1)}s
                          </label>
                          <input
                            id={`out-${c.id}`}
                            type="range"
                            min={0}
                            max={max}
                            step={0.1}
                            value={c.outSec}
                            onChange={(e) =>
                              patchClip(c.id, {
                                outSec: Math.max(Number(e.target.value), c.inSec + 0.2),
                              })
                            }
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right rail: text overlays + audio */}
        <div className="w-full flex-shrink-0 lg:w-72">
          <div className="mb-3 rounded-lg border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                <Type size={12} /> Text & links
              </p>
              <button
                type="button"
                onClick={addText}
                className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
              >
                <Plus size={12} /> Add at {formatDuration(playhead)}
              </button>
            </div>
            {texts.length === 0 ? (
              <p className="py-2 text-[12px] text-zinc-500">
                No text yet. Add one, then drag it on the preview.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {texts.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedText(t.id);
                        seek(t.startSec);
                      }}
                      className={cn(
                        'w-full truncate rounded border px-2 py-1 text-left text-[11.5px]',
                        selectedText === t.id
                          ? 'border-amber-400 bg-amber-50 font-semibold text-zinc-900'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                      )}
                    >
                      {t.text} · {formatDuration(t.startSec)}–{formatDuration(t.endSec)}
                      {t.url && ' 🔗'}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selText && (
              <div className="mt-2.5 border-t border-zinc-100 pt-2.5">
                <textarea
                  value={selText.text}
                  onChange={(e) =>
                    setTexts((ts) =>
                      ts.map((t) => (t.id === selText.id ? { ...t, text: e.target.value } : t)),
                    )
                  }
                  rows={2}
                  aria-label="Overlay text"
                  className="mb-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[12.5px] text-zinc-900 outline-none focus:border-honey/60"
                />
                <div className="mb-2 flex items-center gap-1.5">
                  <Link2 size={12} className="flex-shrink-0 text-zinc-400" />
                  <input
                    value={selText.url ?? ''}
                    onChange={(e) =>
                      setTexts((ts) =>
                        ts.map((t) =>
                          t.id === selText.id ? { ...t, url: e.target.value || null } : t,
                        ),
                      )
                    }
                    placeholder="https:// link (optional)"
                    aria-label="Overlay link"
                    className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900 outline-none focus:border-honey/60"
                  />
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() =>
                        setTexts((ts) =>
                          ts.map((t) => (t.id === selText.id ? { ...t, color: c } : t)),
                        )
                      }
                      className={cn(
                        'h-5 w-5 rounded-full border',
                        selText.color === c
                          ? 'ring-2 ring-amber-400 ring-offset-1'
                          : 'border-zinc-300',
                      )}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="ml-auto flex items-center gap-1 text-[11.5px] text-zinc-600">
                    <input
                      type="checkbox"
                      checked={selText.bg}
                      onChange={(e) =>
                        setTexts((ts) =>
                          ts.map((t) => (t.id === selText.id ? { ...t, bg: e.target.checked } : t)),
                        )
                      }
                      className="accent-amber-500"
                    />
                    Backing
                  </label>
                </div>
                <label
                  htmlFor="tov-size"
                  className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                >
                  Size
                </label>
                <input
                  id="tov-size"
                  type="range"
                  min={0.03}
                  max={0.2}
                  step={0.005}
                  value={selText.size}
                  onChange={(e) =>
                    setTexts((ts) =>
                      ts.map((t) =>
                        t.id === selText.id ? { ...t, size: Number(e.target.value) } : t,
                      ),
                    )
                  }
                  className="w-full accent-amber-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="tov-start"
                      className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                    >
                      From · {selText.startSec.toFixed(1)}s
                    </label>
                    <input
                      id="tov-start"
                      type="range"
                      min={0}
                      max={Math.max(0.1, duration)}
                      step={0.1}
                      value={selText.startSec}
                      onChange={(e) =>
                        setTexts((ts) =>
                          ts.map((t) =>
                            t.id === selText.id
                              ? {
                                  ...t,
                                  startSec: Math.min(Number(e.target.value), t.endSec - 0.2),
                                }
                              : t,
                          ),
                        )
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tov-end"
                      className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                    >
                      To · {selText.endSec.toFixed(1)}s
                    </label>
                    <input
                      id="tov-end"
                      type="range"
                      min={0}
                      max={Math.max(0.1, duration)}
                      step={0.1}
                      value={selText.endSec}
                      onChange={(e) =>
                        setTexts((ts) =>
                          ts.map((t) =>
                            t.id === selText.id
                              ? { ...t, endSec: Math.max(Number(e.target.value), t.startSec + 0.2) }
                              : t,
                          ),
                        )
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTexts((ts) => ts.filter((t) => t.id !== selText.id));
                    setSelectedText(null);
                  }}
                  className="mt-1.5 flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[11.5px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={11} /> Remove text
                </button>
              </div>
            )}
          </div>

          {/* Audio */}
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                <Music size={12} /> Audio
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen('audio')}
                className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
              >
                <Plus size={12} /> {audioAsset ? 'Swap track' : 'Add track'}
              </button>
            </div>
            {audioAsset && (
              <div className="mb-2 flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5">
                <Music size={12} className="flex-shrink-0" style={{ color: ACCENT }} />
                <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">
                  {audioAsset.title || audioAsset.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => setAudioAsset(null)}
                  aria-label="Remove audio track"
                  className="rounded p-0.5 text-zinc-400 hover:text-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <label
              htmlFor="vol-orig"
              className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
            >
              Clip audio · {originalVolume}%
            </label>
            <input
              id="vol-orig"
              type="range"
              min={0}
              max={100}
              value={originalVolume}
              onChange={(e) => setOriginalVolume(Number(e.target.value))}
              className="mb-1.5 w-full accent-amber-500"
            />
            {audioAsset && (
              <>
                <label
                  htmlFor="vol-music"
                  className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                >
                  Track · {musicVolume}%
                </label>
                <input
                  id="vol-music"
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <MediaPicker
          kinds={pickerOpen === 'clip' ? ['video'] : ['audio']}
          onClose={() => setPickerOpen(null)}
          onPick={(a) => {
            if (pickerOpen === 'clip') {
              setClips((cs) => [
                ...cs,
                { id: crypto.randomUUID(), asset: a, inSec: 0, outSec: a.durationSeconds ?? 0 },
              ]);
            } else {
              setAudioAsset(a);
            }
            setPickerOpen(null);
          }}
        />
      )}
    </div>
  );
}
