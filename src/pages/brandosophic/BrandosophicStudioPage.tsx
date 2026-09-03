import { useAuth } from '@/lib/auth';
import { type SkinRow, cloneSkin, fetchPresets } from '@/lib/skins';
import { Check, Copy, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { BrandosophicOutletCtx } from './BrandosophicLayout';

// STUDIO — pick a preset, preview it, keep it as your own kit.
// Presets are live public.skins rows (is_preset), seeded brandosophic_skins_v1.
// "Generate with AI" is the AtlasORACLE seam — wired on Oracle day (Mon 7/27).

export function BrandosophicStudioPage() {
  const { skin } = useOutletContext<BrandosophicOutletCtx>();
  const { bee } = useAuth();
  const [presets, setPresets] = useState<SkinRow[]>([]);
  const [selected, setSelected] = useState<SkinRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [keptId, setKeptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPresets().then((rows) => {
      setPresets(rows);
      setSelected((cur) => cur ?? rows[0] ?? null);
    });
  }, []);

  const previewAccent = selected?.branding?.accentHex ?? skin.branding.accentHex;

  const keep = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await cloneSkin(selected.id, `${selected.name} — my kit`);
      setKeptId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not keep this skin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-bold text-[var(--ink)]">Studio</h1>
      <p className="mt-1 text-sm text-[var(--mute)]">
        Pick a preset, make it yours. Your kit skins your Novas, your storefront, your merch.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {presets.map((p) => {
          const accent = p.branding?.accentHex ?? '#6E1423';
          const sel = selected?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={`rounded-xl border p-4 text-left transition ${
                sel
                  ? 'border-[var(--accent)] shadow-sm'
                  : 'border-[var(--line)] hover:border-[var(--mute)]'
              }`}
            >
              <div
                className="h-12 w-full rounded-lg"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)` }}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--ink)]">{p.name}</span>
                {sel && <Check size={16} className="text-[var(--ink)]" />}
              </div>
              <span className="text-xs text-[var(--mute)]">{accent}</span>
            </button>
          );
        })}
        {presets.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--mute)]">
            Presets are loading — or the skin layer is unreachable. The shell stays on the platform
            default either way.
          </div>
        )}
      </div>

      {/* Preview panel */}
      {selected && (
        <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-extrabold" style={{ color: previewAccent }}>
                {selected.branding?.wordmarkPre || 'Your'}
                <span className="text-[var(--ink)]">{selected.branding?.wordmarkAccent || ''}</span>
                {selected.branding?.wordmarkPost || ' Brand'}
              </div>
              <div className="text-xs text-[var(--mute)]">
                softness {selected.background_softness} · preset · lineage kept on keep
              </div>
            </div>
            <button
              type="button"
              onClick={() => void keep()}
              disabled={busy || !bee}
              title={bee ? 'Keep a copy as your own kit' : 'Sign in to keep a kit'}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-40"
            >
              <Copy size={15} />
              {busy ? 'Keeping…' : 'KEEP AS MY KIT'}
            </button>
          </div>
          {keptId && (
            <p className="mt-3 text-sm text-emerald-700">
              Kept. Find it under My Brands — it carries this preset's lineage.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* AtlasORACLE seam — Oracle day (Mon 7/27) wires this. */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-[var(--line)] p-4">
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--mute)]"
        >
          <Sparkles size={15} />
          GENERATE WITH AI
        </button>
        <span className="text-xs text-[var(--mute)]">
          Describe your brand, h24 drafts your kit — arrives with h24.
        </span>
      </div>
    </div>
  );
}
