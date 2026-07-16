import { BRANDING_DEFAULTS, type BrandingConfig, saveBranding } from '@/lib/branding';
import { useBranding } from '@/stores/useBranding';
import { Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// HQ → Branding. Edits the ui_theme_config.branding jsonb (public read,
// admin-only UPDATE via is_platform_admin() RLS — migration ui_branding_v1).
// Changes apply platform-wide: live in this tab immediately, everyone else
// on their next page load. Assets: point logo/favicon at anything under
// public/ (e.g. /rebelution-logo.png) or a full https URL.

type Field = keyof BrandingConfig;

const FIELDS: { key: Field; label: string; hint?: string; width?: 'sm' | 'lg' }[] = [
  { key: 'wordmarkPre', label: 'Wordmark — before accent', width: 'sm' },
  { key: 'wordmarkAccent', label: 'Accent letters', hint: 'renders in the accent color', width: 'sm' },
  { key: 'wordmarkPost', label: 'Wordmark — after accent', width: 'sm' },
  { key: 'wordmarkSuffix', label: 'Suffix', hint: 'sans face, true lowercase (e.g. .app)', width: 'sm' },
  { key: 'accentHex', label: 'Accent color (hex)', width: 'sm' },
  { key: 'logoUrl', label: 'Logo image URL', hint: '/rebelution-logo.png or https://…', width: 'lg' },
  { key: 'faviconUrl', label: 'Favicon URL', hint: '/rebelution-favicon.png or https://…', width: 'lg' },
];

export function BrandingSection() {
  const branding = useBranding((s) => s.branding);
  const setLocal = useBranding((s) => s.setLocal);
  const [form, setForm] = useState<BrandingConfig>({ ...branding });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Store loads async after mount — reseed the untouched form when it lands.
  useEffect(() => {
    setForm({ ...branding });
  }, [branding]);

  const hexOk = /^#[0-9a-fA-F]{6}$/.test(form.accentHex.trim());
  const dirty = JSON.stringify(form) !== JSON.stringify(branding);

  async function onSave() {
    if (saving || !hexOk) return;
    setSaving(true);
    setFlash(null);
    const clean: BrandingConfig = {
      wordmarkPre: form.wordmarkPre,
      wordmarkAccent: form.wordmarkAccent,
      wordmarkPost: form.wordmarkPost,
      wordmarkSuffix: form.wordmarkSuffix,
      accentHex: form.accentHex.trim(),
      logoUrl: form.logoUrl.trim(),
      faviconUrl: form.faviconUrl.trim(),
    };
    try {
      await saveBranding(clean);
      setLocal(clean);
      setFlash({ kind: 'ok', msg: 'Saved — live now here, everyone else on next load.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setFlash({
        kind: 'err',
        msg: /column|branding|policy|permission|denied/i.test(msg)
          ? `${msg} — has the ui_branding_v1 migration been applied?`
          : msg,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-5 text-text-dim" style={{ fontSize: '12.5px' }}>
        Platform brand — wordmark, accent, logo, favicon. Public read, OG-only write. Assets live
        under <span className="font-mono">public/</span> or any https URL.
      </p>

      {/* Live preview — rendered on white, exactly as the community shell shows it. */}
      <div className="mb-6 rounded-lg border border-border bg-white p-4">
        <div className="flex items-center gap-2.5">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              width={26}
              height={26}
              alt=""
              aria-hidden="true"
              className="rounded-full object-contain"
            />
          ) : (
            <span className="inline-block h-[26px] w-[26px] rounded-full bg-zinc-200" />
          )}
          <span
            className="text-[19px] leading-none tracking-wide text-zinc-900"
            style={{ fontFamily: "'Norwester', 'Arial Narrow', sans-serif" }}
          >
            {form.wordmarkPre}
            <span style={{ color: hexOk ? form.accentHex : '#DC2626' }}>
              {form.wordmarkAccent}
            </span>
            {form.wordmarkPost}
            {form.wordmarkSuffix && (
              <span className="font-sans text-[13px] font-semibold text-zinc-500">
                {form.wordmarkSuffix}
              </span>
            )}
          </span>
          {form.faviconUrl && (
            <span
              className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400"
              data-size="meta"
            >
              favicon
              <img src={form.faviconUrl} width={16} height={16} alt="" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.width === 'lg' ? 'sm:col-span-2' : undefined}>
            <label
              htmlFor={`brand-${f.key}`}
              className="mb-1 block font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              {f.label}
              {f.hint && <span className="ml-2 text-text-dim/70">{f.hint}</span>}
            </label>
            <input
              id={`brand-${f.key}`}
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-silver-bright outline-none focus:border-border-bright"
              style={{ fontSize: '13.5px' }}
            />
            {f.key === 'accentHex' && !hexOk && (
              <p className="mt-1 text-[11px] text-kettle-contested">Use #RRGGBB format.</p>
            )}
          </div>
        ))}
      </div>

      {flash && (
        <div
          className="mt-4 flex items-start gap-2 rounded-md border p-3"
          style={{
            fontSize: '12.5px',
            borderColor: flash.kind === 'ok' ? '#FAD15E66' : '#EF444466',
            background: flash.kind === 'ok' ? '#FAD15E14' : '#EF444414',
            color: flash.kind === 'ok' ? '#FAD15E' : '#F87171',
          }}
        >
          {flash.kind === 'ok' ? <Check size={15} /> : <X size={15} />}
          <span>{flash.msg}</span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || !dirty || !hexOk}
          className="inline-flex items-center gap-2 rounded-md bg-honey px-4 py-2 font-mono text-sm text-bg hover:bg-honey/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save branding'}
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...BRANDING_DEFAULTS })}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 font-mono text-sm text-text-dim hover:border-border-bright hover:text-text-silver"
          title="Reset the form to the baked defaults (not saved until you hit Save)"
        >
          <RotateCcw size={13} />
          Defaults
        </button>
      </div>
    </div>
  );
}
