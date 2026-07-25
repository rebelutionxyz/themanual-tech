import { useAuth } from '@/lib/auth';
import { saveBlobToLibrary } from '@/lib/media';
import { type SkinRow, fetchMyKits, mergeBranding } from '@/lib/skins';
import { cn } from '@/lib/utils';
import { ArrowLeft, QrCode, Save } from 'lucide-react';
import qrcodegen from 'qrcode-generator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ACCENT = '#D97706';

// ═════════════════════════════════════════════════════════════════════
// QR LAB — Creator Studio (/studio/qr). Block 15, 2026-07-25.
// Text/URL → QR on canvas, plain or brand-inked (your kit's accent).
// Zero-dependency generator (qrcode-generator, no transitive tree).
// Saves PNG to the Library. Feeds /press auto-QR ads, storefront links,
// Nova portals — one generator, many mouths.
// ═════════════════════════════════════════════════════════════════════

export function QrPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [inked, setInked] = useState(false);
  const [kit, setKit] = useState<SkinRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (bee?.id) {
      void fetchMyKits(bee.id).then((kits) => setKit(kits[0] ?? null));
    }
  }, [bee?.id]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const size = 640;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    if (!text.trim()) return;
    try {
      const qr = qrcodegen(0, 'M'); // type 0 = auto-size
      qr.addData(text.trim());
      qr.make();
      const n = qr.getModuleCount();
      const quiet = 4;
      const cell = size / (n + quiet * 2);
      const ink = inked && kit ? mergeBranding(kit.branding).accentHex : '#111111';
      ctx.fillStyle = ink;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(
              Math.floor((c + quiet) * cell),
              Math.floor((r + quiet) * cell),
              Math.ceil(cell),
              Math.ceil(cell),
            );
          }
        }
      }
    } catch {
      // content too long for QR — leave the canvas blank white
    }
  }, [text, inked, kit]);

  useEffect(() => {
    render();
  }, [render]);

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !bee || !text.trim() || saving) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (blob) {
        const saved = await saveBlobToLibrary(bee.id, blob, {
          fileName: `qr-${Date.now()}.png`,
          mimeType: 'image/png',
          source: 'image_editor',
          editOf: null,
          durationSeconds: null,
          width: canvas.width,
          height: canvas.height,
        });
        setMsg(`Saved to your Library as ${saved.fileName}`);
        setTimeout(() => setMsg(null), 4000);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  if (!bee) {
    return (
      <div className="safe-pad-x mx-auto w-full max-w-3xl px-4 py-10 text-center text-[13px] text-zinc-500">
        Sign in to make QR codes.{' '}
        <Link to="/login" className="underline" style={{ color: ACCENT }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="safe-pad-x mx-auto w-full max-w-2xl px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft size={13} /> Studio
        </button>
        <h1 className="flex items-center gap-2 font-display text-[17px] font-semibold text-zinc-900">
          <QrCode size={18} style={{ color: ACCENT }} /> QR Lab
        </h1>
      </div>

      {msg && (
        <p className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] text-green-700">
          {msg}
        </p>
      )}

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="https:// link, /n/your-nova, or any text"
        className="mb-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-honey/60"
      />

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setInked((v) => !v)}
          disabled={!kit}
          title={kit ? "Ink the code in your brand kit's accent" : 'KEEP a kit in /brand first'}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] disabled:opacity-40',
            inked
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100',
          )}
        >
          ⬡ Brand ink
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!text.trim() || saving}
          className="ml-auto flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          <Save size={13} /> {saving ? 'Saving…' : 'Save to Library'}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-4">
        <canvas ref={canvasRef} className="mx-auto block w-full max-w-sm" />
        {!text.trim() && (
          <p className="pb-2 text-center text-[12px] text-zinc-400">Type above — the code draws live.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">
        Dark-ink codes scan most reliably; brand ink works when your accent is dark enough.
        Feeds /press ads, storefront links, and Nova portals.
      </p>
    </div>
  );
}
