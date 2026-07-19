import { useAuth } from '@/lib/auth';
import { type MediaAsset, assetUrl, getAsset, saveBlobToLibrary } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Crop,
  Download,
  FlipHorizontal,
  FlipVertical,
  MousePointer2,
  PenLine,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  SlidersHorizontal,
  Smile,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

const ACCENT = '#D97706';
const FILL = '#FAD15E';

// ═════════════════════════════════════════════════════════════════════
// IMAGE EDITOR — Creator Studio (/studio/edit/image/:assetId).
// Canva-style canvas editor, zero dependencies: crop, rotate/flip,
// adjustments (brightness/contrast/saturation/…), text, shapes, pen,
// stickers, layers, undo/redo. Exports PNG/JPEG back into the Library
// with lineage (source: image_editor, edit_of: original), or downloads.
// `:assetId` = a library image, or `new` (blank canvas, ?w=&h=).
// ═════════════════════════════════════════════════════════════════════

type Tool = 'select' | 'crop' | 'text' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'sticker';

interface Adjust {
  brightness: number; // 100 = neutral
  contrast: number; // 100
  saturate: number; // 100
  grayscale: number; // 0
  sepia: number; // 0
  blur: number; // 0 px
  hue: number; // 0 deg
}

const NEUTRAL_ADJUST: Adjust = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hue: 0,
};

interface TextItem {
  type: 'text';
  id: string;
  x: number;
  y: number; // top-left in image space
  text: string;
  size: number;
  font: string;
  color: string;
  bold: boolean;
  bg: string | null;
}

interface ShapeItem {
  type: 'rect' | 'ellipse' | 'arrow';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
}

interface PenItem {
  type: 'pen';
  id: string;
  points: number[]; // x0,y0,x1,y1,…
  color: string;
  width: number;
}

interface StickerItem {
  type: 'sticker';
  id: string;
  x: number;
  y: number;
  glyph: string;
  size: number;
}

type Overlay = TextItem | ShapeItem | PenItem | StickerItem;

const FONTS = [
  { key: 'sans', label: 'Sans', css: '600 Xpx system-ui, sans-serif' },
  { key: 'serif', label: 'Serif', css: '600 Xpx Georgia, serif' },
  { key: 'mono', label: 'Mono', css: '600 Xpx ui-monospace, monospace' },
  { key: 'impact', label: 'Impact', css: '700 Xpx Impact, system-ui, sans-serif' },
];

const SWATCHES = [
  '#18181b',
  '#ffffff',
  '#D97706',
  '#FAD15E',
  '#DC2626',
  '#2563EB',
  '#15803D',
  '#7C3AED',
  '#EC4899',
];

const STICKERS = ['🐝', '🍯', '⭐', '❤️', '🔥', '💡', '✅', '⚠️', '👑', '🎯', '🚀', '😂'];

interface EditorState {
  overlays: Overlay[];
  adjust: Adjust;
}

function fontCss(item: TextItem): string {
  const f = FONTS.find((x) => x.key === item.font) ?? FONTS[0];
  return f.css.replace('Xpx', `${item.size}px`).replace('600', item.bold ? '700' : '600');
}

function adjustFilter(a: Adjust): string {
  const parts: string[] = [];
  if (a.brightness !== 100) parts.push(`brightness(${a.brightness}%)`);
  if (a.contrast !== 100) parts.push(`contrast(${a.contrast}%)`);
  if (a.saturate !== 100) parts.push(`saturate(${a.saturate}%)`);
  if (a.grayscale > 0) parts.push(`grayscale(${a.grayscale}%)`);
  if (a.sepia > 0) parts.push(`sepia(${a.sepia}%)`);
  if (a.blur > 0) parts.push(`blur(${a.blur}px)`);
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
  return parts.length ? parts.join(' ') : 'none';
}

function overlayBBox(o: Overlay, ctx: CanvasRenderingContext2D): [number, number, number, number] {
  if (o.type === 'text') {
    ctx.font = fontCss(o);
    const lines = o.text.split('\n');
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 10);
    return [o.x, o.y, w, o.size * 1.25 * lines.length];
  }
  if (o.type === 'sticker') return [o.x, o.y, o.size, o.size];
  if (o.type === 'pen') {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < o.points.length; i += 2) {
      minX = Math.min(minX, o.points[i]);
      maxX = Math.max(maxX, o.points[i]);
      minY = Math.min(minY, o.points[i + 1]);
      maxY = Math.max(maxY, o.points[i + 1]);
    }
    return [minX, minY, maxX - minX, maxY - minY];
  }
  const x = o.w < 0 ? o.x + o.w : o.x;
  const y = o.h < 0 ? o.y + o.h : o.y;
  return [x, y, Math.abs(o.w), Math.abs(o.h)];
}

function drawOverlay(ctx: CanvasRenderingContext2D, o: Overlay) {
  if (o.type === 'text') {
    ctx.font = fontCss(o);
    ctx.textBaseline = 'top';
    const lines = o.text.split('\n');
    const lineH = o.size * 1.25;
    if (o.bg) {
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 10);
      ctx.fillStyle = o.bg;
      const pad = o.size * 0.18;
      ctx.fillRect(o.x - pad, o.y - pad, w + pad * 2, lineH * lines.length + pad * 2);
    }
    ctx.fillStyle = o.color;
    lines.forEach((l, i) => ctx.fillText(l, o.x, o.y + i * lineH));
    return;
  }
  if (o.type === 'sticker') {
    ctx.font = `${o.size}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(o.glyph, o.x, o.y);
    return;
  }
  if (o.type === 'pen') {
    if (o.points.length < 4) return;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(o.points[0], o.points[1]);
    for (let i = 2; i < o.points.length; i += 2) ctx.lineTo(o.points[i], o.points[i + 1]);
    ctx.stroke();
    return;
  }
  // shapes
  ctx.strokeStyle = o.stroke;
  ctx.lineWidth = o.strokeWidth;
  ctx.lineCap = 'round';
  const [x, y, w, h] = overlayBBox(o, ctx);
  if (o.type === 'rect') {
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeRect(x, y, w, h);
  } else if (o.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
    ctx.stroke();
  } else {
    // arrow: from (o.x,o.y) to (o.x+o.w, o.y+o.h)
    const x2 = o.x + o.w;
    const y2 = o.y + o.h;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - o.y, x2 - o.x);
    const head = Math.max(10, o.strokeWidth * 3.5);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
    ctx.stroke();
  }
}

export function ImageEditorPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [params] = useSearchParams();
  const { bee } = useAuth();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tool, setTool] = useState<Tool>('select');
  const [state, setState] = useState<EditorState>({ overlays: [], adjust: NEUTRAL_ADJUST });
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<[number, number, number, number] | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Tool defaults
  const [color, setColor] = useState('#D97706');
  const [strokeWidth, setStrokeWidth] = useState(6);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: 'move' | 'draw' | 'crop' | 'shape';
    id?: string;
    startX: number;
    startY: number;
    origX?: number;
    origY?: number;
    draft?: Overlay;
  } | null>(null);

  const selected = useMemo(
    () => state.overlays.find((o) => o.id === selectedId) ?? null,
    [state.overlays, selectedId],
  );

  /* ───────────── load base image ───────────── */

  useEffect(() => {
    let cancelled = false;
    async function loadBase() {
      try {
        if (assetId === 'new') {
          const w = Math.min(4096, Math.max(64, Number(params.get('w')) || 1080));
          const h = Math.min(4096, Math.max(64, Number(params.get('h')) || 1080));
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }
          if (!cancelled) setBase(c);
          return;
        }
        if (!assetId) throw new Error('No image');
        const a = await getAsset(assetId);
        if (!a || a.kind !== 'image') throw new Error('Image not found in your library');
        if (cancelled) return;
        setAsset(a);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) return;
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d')?.drawImage(img, 0, 0);
          setBase(c);
        };
        img.onerror = () => !cancelled && setLoadError('Could not load the image data');
        img.src = assetUrl(a);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Load failed');
      }
    }
    void loadBase();
    return () => {
      cancelled = true;
    };
  }, [assetId, params]);

  /* ───────────── history ───────────── */

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-29), state]);
    setFuture([]);
  }, [state]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [state, ...f].slice(0, 30));
      setState(prev);
      return h.slice(0, -1);
    });
  }, [state]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, state]);
      setState(next);
      return f.slice(1);
    });
  }, [state]);

  /* ───────────── render ───────────── */

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !base) return;
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.filter = adjustFilter(state.adjust);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    for (const o of state.overlays) drawOverlay(ctx, o);
    // selection outline
    if (selected) {
      const [x, y, w, h] = overlayBBox(selected, ctx);
      ctx.save();
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = Math.max(2, base.width / 400);
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
      ctx.restore();
    }
    // crop marquee
    if (cropRect) {
      const [x, y, w, h] = cropRect;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, y);
      ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, canvas.width - x - w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, base.width / 500);
      ctx.setLineDash([10, 7]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }, [base, state, selected, cropRect]);

  useEffect(() => {
    render();
  }, [render]);

  /* ───────────── pointer interactions ───────────── */

  const toImageSpace = useCallback(
    (e: { clientX: number; clientY: number }): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas || !base) return [0, 0];
      const r = canvas.getBoundingClientRect();
      return [
        ((e.clientX - r.left) / r.width) * base.width,
        ((e.clientY - r.top) / r.height) * base.height,
      ];
    },
    [base],
  );

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!base) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toImageSpace(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'select') {
      // topmost hit first
      for (let i = state.overlays.length - 1; i >= 0; i--) {
        const o = state.overlays[i];
        const [bx, by, bw, bh] = overlayBBox(o, ctx);
        if (x >= bx - 8 && x <= bx + bw + 8 && y >= by - 8 && y <= by + bh + 8) {
          setSelectedId(o.id);
          pushHistory();
          dragRef.current = {
            mode: 'move',
            id: o.id,
            startX: x,
            startY: y,
            origX: 'x' in o ? o.x : 0,
            origY: 'y' in o ? o.y : 0,
          };
          return;
        }
      }
      setSelectedId(null);
      return;
    }

    if (tool === 'crop') {
      dragRef.current = { mode: 'crop', startX: x, startY: y };
      setCropRect([x, y, 0, 0]);
      return;
    }

    if (tool === 'text') {
      pushHistory();
      const item: TextItem = {
        type: 'text',
        id: crypto.randomUUID(),
        x,
        y,
        text: 'Your text',
        size: Math.max(24, Math.round(base.width / 18)),
        font: 'sans',
        color,
        bold: true,
        bg: null,
      };
      setState((s) => ({ ...s, overlays: [...s.overlays, item] }));
      setSelectedId(item.id);
      setTool('select');
      return;
    }

    if (tool === 'sticker') {
      setStickerOpen(true);
      return;
    }

    if (tool === 'pen') {
      pushHistory();
      const item: PenItem = {
        type: 'pen',
        id: crypto.randomUUID(),
        points: [x, y],
        color,
        width: strokeWidth,
      };
      dragRef.current = { mode: 'draw', id: item.id, startX: x, startY: y, draft: item };
      setState((s) => ({ ...s, overlays: [...s.overlays, item] }));
      return;
    }

    // shapes
    pushHistory();
    const item: ShapeItem = {
      type: tool,
      id: crypto.randomUUID(),
      x,
      y,
      w: 0,
      h: 0,
      stroke: color,
      strokeWidth,
      fill: null,
    };
    dragRef.current = { mode: 'shape', id: item.id, startX: x, startY: y };
    setState((s) => ({ ...s, overlays: [...s.overlays, item] }));
    setSelectedId(item.id);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const [x, y] = toImageSpace(e);

    if (drag.mode === 'crop') {
      const w = x - drag.startX;
      const h = y - drag.startY;
      setCropRect([w < 0 ? x : drag.startX, h < 0 ? y : drag.startY, Math.abs(w), Math.abs(h)]);
      return;
    }
    if (drag.mode === 'move' && drag.id) {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      setState((s) => ({
        ...s,
        overlays: s.overlays.map((o) => {
          if (o.id !== drag.id) return o;
          if (o.type === 'pen') return o; // pen strokes stay put
          return { ...o, x: (drag.origX ?? 0) + dx, y: (drag.origY ?? 0) + dy };
        }),
      }));
      return;
    }
    if (drag.mode === 'draw' && drag.id) {
      setState((s) => ({
        ...s,
        overlays: s.overlays.map((o) =>
          o.id === drag.id && o.type === 'pen' ? { ...o, points: [...o.points, x, y] } : o,
        ),
      }));
      return;
    }
    if (drag.mode === 'shape' && drag.id) {
      setState((s) => ({
        ...s,
        overlays: s.overlays.map((o) =>
          o.id === drag.id && (o.type === 'rect' || o.type === 'ellipse' || o.type === 'arrow')
            ? { ...o, w: x - drag.startX, h: y - drag.startY }
            : o,
        ),
      }));
    }
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === 'shape' && drag.id) {
      // drop degenerate shapes
      setState((s) => ({
        ...s,
        overlays: s.overlays.filter((o) => {
          if (o.id !== drag.id) return true;
          if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'arrow')
            return Math.abs(o.w) > 4 || Math.abs(o.h) > 4;
          return true;
        }),
      }));
    }
  }

  /* ───────────── base transforms ───────────── */

  function bakeTransform(kind: 'cw' | 'ccw' | 'flipH' | 'flipV') {
    if (!base) return;
    const rotated = kind === 'cw' || kind === 'ccw';
    const c = document.createElement('canvas');
    c.width = rotated ? base.height : base.width;
    c.height = rotated ? base.width : base.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.save();
    if (kind === 'cw') {
      ctx.translate(c.width, 0);
      ctx.rotate(Math.PI / 2);
    } else if (kind === 'ccw') {
      ctx.translate(0, c.height);
      ctx.rotate(-Math.PI / 2);
    } else if (kind === 'flipH') {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, c.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    setBase(c);
    // Overlays don't auto-map across transforms — clear selection, keep them.
    setCropRect(null);
  }

  function applyCrop() {
    if (!base || !cropRect) return;
    const [x, y, w, h] = cropRect.map(Math.round) as [number, number, number, number];
    if (w < 8 || h < 8) {
      setCropRect(null);
      return;
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')?.drawImage(base, x, y, w, h, 0, 0, w, h);
    setBase(c);
    // shift overlays into the new origin
    setState((s) => ({
      ...s,
      overlays: s.overlays.map((o) => {
        if (o.type === 'pen') {
          const pts = o.points.map((p, i) => (i % 2 === 0 ? p - x : p - y));
          return { ...o, points: pts };
        }
        return { ...o, x: o.x - x, y: o.y - y };
      }),
    }));
    setCropRect(null);
    setTool('select');
  }

  /* ───────────── export ───────────── */

  const renderExport = useCallback((): HTMLCanvasElement | null => {
    if (!base) return null;
    const c = document.createElement('canvas');
    c.width = base.width;
    c.height = base.height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.save();
    ctx.filter = adjustFilter(state.adjust);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    for (const o of state.overlays) drawOverlay(ctx, o);
    return c;
  }, [base, state]);

  async function saveToLibrary(format: 'png' | 'jpeg') {
    if (!bee || saving) return;
    const out = renderExport();
    if (!out) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, `image/${format}`, 0.92),
      );
      if (!blob) throw new Error('Export failed');
      const stem = (asset?.fileName ?? 'design').replace(/\.[a-z0-9]+$/i, '');
      const saved = await saveBlobToLibrary(bee.id, blob, {
        fileName: `${stem}-edit.${format === 'png' ? 'png' : 'jpg'}`,
        mimeType: `image/${format}`,
        source: 'image_editor',
        editOf: asset?.id ?? null,
        folderId: asset?.folderId ?? null,
        width: out.width,
        height: out.height,
      });
      setSavedMsg(`Saved to your Library as ${saved.fileName}`);
      setTimeout(() => setSavedMsg(null), 3500);
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setSavedMsg(null), 3500);
    } finally {
      setSaving(false);
    }
  }

  function download(format: 'png' | 'jpeg') {
    const out = renderExport();
    if (!out) return;
    out.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(asset?.fileName ?? 'design').replace(/\.[a-z0-9]+$/i, '')}-edit.${format === 'png' ? 'png' : 'jpg'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      },
      `image/${format}`,
      0.92,
    );
  }

  /* ───────────── keyboard ───────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        pushHistory();
        setState((s) => ({ ...s, overlays: s.overlays.filter((o) => o.id !== selectedId) }));
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedId, pushHistory]);

  /* ───────────── selected item mutation ───────────── */

  function patchSelected(
    patch: Partial<Omit<TextItem, 'type'> & Omit<ShapeItem, 'type'> & Omit<StickerItem, 'type'>>,
  ) {
    if (!selectedId) return;
    setState((s) => ({
      ...s,
      overlays: s.overlays.map((o) => (o.id === selectedId ? ({ ...o, ...patch } as Overlay) : o)),
    }));
  }

  function reorderSelected(dir: 1 | -1) {
    if (!selectedId) return;
    setState((s) => {
      const idx = s.overlays.findIndex((o) => o.id === selectedId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= s.overlays.length) return s;
      const next = [...s.overlays];
      const [item] = next.splice(idx, 1);
      next.splice(to, 0, item);
      return { ...s, overlays: next };
    });
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
          Image Editor
          {asset && (
            <span className="max-w-[200px] truncate font-mono text-[11px] font-normal text-zinc-500">
              {asset.fileName}
            </span>
          )}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <IconBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={history.length === 0}>
            <Undo2 size={14} />
          </IconBtn>
          <IconBtn title="Redo (Ctrl+Y)" onClick={redo} disabled={future.length === 0}>
            <Redo2 size={14} />
          </IconBtn>
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => download('png')}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Download size={13} /> Download
          </button>
          <button
            type="button"
            onClick={() => void saveToLibrary('png')}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
            style={{ background: FILL, color: '#18181b' }}
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save to Library'}
          </button>
        </div>
      </div>

      {savedMsg && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
          <Check size={13} /> {savedMsg}
        </p>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Tool rail */}
        <div className="flex flex-row flex-wrap gap-1 lg:w-11 lg:flex-col">
          <ToolBtn
            active={tool === 'select'}
            title="Select / move"
            onClick={() => setTool('select')}
          >
            <MousePointer2 size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'crop'} title="Crop" onClick={() => setTool('crop')}>
            <Crop size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'text'} title="Text" onClick={() => setTool('text')}>
            <Type size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'rect'} title="Rectangle" onClick={() => setTool('rect')}>
            <Square size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'ellipse'} title="Ellipse" onClick={() => setTool('ellipse')}>
            <Circle size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'arrow'} title="Arrow" onClick={() => setTool('arrow')}>
            <ArrowUpRight size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'pen'} title="Pen" onClick={() => setTool('pen')}>
            <PenLine size={15} />
          </ToolBtn>
          <ToolBtn active={stickerOpen} title="Sticker" onClick={() => setStickerOpen((v) => !v)}>
            <Smile size={15} />
          </ToolBtn>
          <span className="my-0.5 hidden h-px w-full bg-zinc-200 lg:block" />
          <ToolBtn active={adjustOpen} title="Adjust" onClick={() => setAdjustOpen((v) => !v)}>
            <SlidersHorizontal size={15} />
          </ToolBtn>
          <ToolBtn title="Rotate left" onClick={() => bakeTransform('ccw')}>
            <RotateCcw size={15} />
          </ToolBtn>
          <ToolBtn title="Rotate right" onClick={() => bakeTransform('cw')}>
            <RotateCw size={15} />
          </ToolBtn>
          <ToolBtn title="Flip horizontal" onClick={() => bakeTransform('flipH')}>
            <FlipHorizontal size={15} />
          </ToolBtn>
          <ToolBtn title="Flip vertical" onClick={() => bakeTransform('flipV')}>
            <FlipVertical size={15} />
          </ToolBtn>
        </div>

        {/* Canvas */}
        <div
          ref={wrapRef}
          className="relative min-h-[320px] flex-1 overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3"
        >
          {!base ? (
            <div className="flex h-full min-h-[280px] items-center justify-center text-[13px] text-zinc-500">
              Loading image…
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                'mx-auto block max-h-[70vh] max-w-full rounded shadow-sm',
                tool === 'select' ? 'cursor-default' : 'cursor-crosshair',
              )}
              style={{ touchAction: 'none' }}
            />
          )}

          {/* Crop confirm */}
          {cropRect && cropRect[2] > 4 && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 gap-2 rounded-md border border-zinc-200 bg-white p-1 shadow-md">
              <button
                type="button"
                onClick={applyCrop}
                className="flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: FILL, color: '#18181b' }}
              >
                <Check size={12} /> Apply crop
              </button>
              <button
                type="button"
                onClick={() => setCropRect(null)}
                className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[12px] text-zinc-600 hover:bg-zinc-100"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          )}

          {/* Sticker picker */}
          {stickerOpen && (
            <div className="absolute left-3 top-3 z-10 grid grid-cols-6 gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
              {STICKERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    if (!base) return;
                    pushHistory();
                    const item: StickerItem = {
                      type: 'sticker',
                      id: crypto.randomUUID(),
                      x: base.width / 2 - base.width / 16,
                      y: base.height / 2 - base.width / 16,
                      glyph: g,
                      size: Math.round(base.width / 8),
                    };
                    setState((s) => ({ ...s, overlays: [...s.overlays, item] }));
                    setSelectedId(item.id);
                    setStickerOpen(false);
                    setTool('select');
                  }}
                  className="rounded p-1 text-[20px] hover:bg-zinc-100"
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full flex-shrink-0 lg:w-60">
          {/* Color + stroke (tool defaults) */}
          <PanelCard title="Color">
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => {
                    setColor(c);
                    if (selected && selected.type !== 'pen') {
                      if (selected.type === 'text') patchSelected({ color: c });
                      else if (selected.type !== 'sticker') patchSelected({ stroke: c });
                    }
                  }}
                  className={cn(
                    'h-6 w-6 rounded-full border',
                    color === c ? 'ring-2 ring-offset-1' : 'border-zinc-300',
                  )}
                  style={{
                    background: c,
                    ...(color === c ? { ['--tw-ring-color' as string]: ACCENT } : {}),
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Custom color"
                className="h-6 w-8 cursor-pointer rounded border border-zinc-300"
              />
            </div>
            <label
              htmlFor="ed-stroke"
              className="mt-3 block font-mono text-[10.5px] uppercase tracking-wider text-zinc-500"
            >
              Stroke / pen width · {strokeWidth}px
            </label>
            <input
              id="ed-stroke"
              type="range"
              min={2}
              max={40}
              value={strokeWidth}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStrokeWidth(v);
                if (
                  selected &&
                  (selected.type === 'rect' ||
                    selected.type === 'ellipse' ||
                    selected.type === 'arrow')
                )
                  patchSelected({ strokeWidth: v });
              }}
              className="w-full accent-amber-500"
            />
          </PanelCard>

          {/* Selected item */}
          {selected && (
            <PanelCard title={`Selected: ${selected.type}`}>
              {selected.type === 'text' && (
                <>
                  <textarea
                    value={selected.text}
                    onChange={(e) => patchSelected({ text: e.target.value })}
                    rows={2}
                    aria-label="Text content"
                    className="mb-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] text-zinc-900 outline-none focus:border-honey/60"
                  />
                  <div className="mb-2 flex gap-1">
                    {FONTS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => patchSelected({ font: f.key })}
                        className={cn(
                          'flex-1 rounded border px-1 py-1 text-[11px]',
                          selected.font === f.key
                            ? 'border-amber-400 bg-amber-50 font-semibold text-zinc-900'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <label
                    htmlFor="ed-tsize"
                    className="block font-mono text-[10.5px] uppercase tracking-wider text-zinc-500"
                  >
                    Size · {selected.size}px
                  </label>
                  <input
                    id="ed-tsize"
                    type="range"
                    min={12}
                    max={Math.max(300, selected.size)}
                    value={selected.size}
                    onChange={(e) => patchSelected({ size: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[12px] text-zinc-600">
                      <input
                        type="checkbox"
                        checked={selected.bold}
                        onChange={(e) => patchSelected({ bold: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Bold
                    </label>
                    <label className="flex items-center gap-1.5 text-[12px] text-zinc-600">
                      <input
                        type="checkbox"
                        checked={selected.bg !== null}
                        onChange={(e) =>
                          patchSelected({ bg: e.target.checked ? 'rgba(255,255,255,0.85)' : null })
                        }
                        className="accent-amber-500"
                      />
                      Backing
                    </label>
                  </div>
                </>
              )}
              {selected.type === 'sticker' && (
                <>
                  <label
                    htmlFor="ed-ssize"
                    className="block font-mono text-[10.5px] uppercase tracking-wider text-zinc-500"
                  >
                    Size · {selected.size}px
                  </label>
                  <input
                    id="ed-ssize"
                    type="range"
                    min={24}
                    max={600}
                    value={selected.size}
                    onChange={(e) => patchSelected({ size: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </>
              )}
              {(selected.type === 'rect' || selected.type === 'ellipse') && (
                <label className="flex items-center gap-1.5 text-[12px] text-zinc-600">
                  <input
                    type="checkbox"
                    checked={selected.fill !== null}
                    onChange={(e) =>
                      patchSelected({ fill: e.target.checked ? `${color}55` : null })
                    }
                    className="accent-amber-500"
                  />
                  Fill with color
                </label>
              )}
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  title="Bring forward"
                  onClick={() => reorderSelected(1)}
                  className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
                >
                  <ChevronUp size={12} /> Forward
                </button>
                <button
                  type="button"
                  title="Send back"
                  onClick={() => reorderSelected(-1)}
                  className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
                >
                  <ChevronDown size={12} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pushHistory();
                    setState((s) => ({
                      ...s,
                      overlays: s.overlays.filter((o) => o.id !== selected.id),
                    }));
                    setSelectedId(null);
                  }}
                  className="ml-auto flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[11.5px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </PanelCard>
          )}

          {/* Adjustments */}
          {adjustOpen && (
            <PanelCard title="Adjust">
              {(
                [
                  ['brightness', 'Brightness', 0, 200],
                  ['contrast', 'Contrast', 0, 200],
                  ['saturate', 'Saturation', 0, 200],
                  ['grayscale', 'Grayscale', 0, 100],
                  ['sepia', 'Sepia', 0, 100],
                  ['blur', 'Blur', 0, 20],
                  ['hue', 'Hue', -180, 180],
                ] as [keyof Adjust, string, number, number][]
              ).map(([key, label, min, max]) => (
                <div key={key} className="mb-1.5">
                  <label
                    htmlFor={`adj-${key}`}
                    className="block font-mono text-[10.5px] uppercase tracking-wider text-zinc-500"
                  >
                    {label} · {state.adjust[key]}
                  </label>
                  <input
                    id={`adj-${key}`}
                    type="range"
                    min={min}
                    max={max}
                    value={state.adjust[key]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        adjust: { ...s.adjust, [key]: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  pushHistory();
                  setState((s) => ({ ...s, adjust: NEUTRAL_ADJUST }));
                }}
                className="mt-1 rounded border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100"
              >
                Reset adjustments
              </button>
            </PanelCard>
          )}

          {/* Layers */}
          {state.overlays.length > 0 && (
            <PanelCard title={`Layers (${state.overlays.length})`}>
              <ul className="flex max-h-40 flex-col-reverse gap-1 overflow-y-auto">
                {state.overlays.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        'w-full truncate rounded border px-2 py-1 text-left text-[11.5px]',
                        selectedId === o.id
                          ? 'border-amber-400 bg-amber-50 font-semibold text-zinc-900'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                      )}
                    >
                      {o.type === 'text'
                        ? `T · ${o.text.slice(0, 22)}`
                        : o.type === 'sticker'
                          ? `${o.glyph} sticker`
                          : o.type}
                    </button>
                  </li>
                ))}
              </ul>
            </PanelCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── small bits ───────────────────────── */

function ToolBtn({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
        active
          ? 'border-amber-400 bg-amber-50 text-zinc-900'
          : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
      )}
    >
      {children}
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-lg border border-zinc-200 bg-white p-3">
      <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      {children}
    </div>
  );
}
