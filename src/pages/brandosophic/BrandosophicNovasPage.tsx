import { useAuth } from '@/lib/auth';
import {
  type SkinRow,
  createNova,
  fetchAstraChoices,
  fetchMyKits,
  fetchPresets,
} from '@/lib/skins';
import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// NOVAS — creation wizard v1 (MMF §25 Nova-creation flow, minimum honest version).
// Steps: source Astra → name + slug → tier → skin → create (nova_create RPC).
// Slugs never rename (house rule). Paid tiers render but ship SOON —
// standard/path routing is the live v1 tier.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}$/;

const TIERS = [
  {
    id: 'standard',
    label: 'FREE',
    desc: 'Path routing — /n/your-slug. Live today.',
    soon: false,
  },
  {
    id: 'subdomain',
    label: 'SUBDOMAIN',
    desc: 'your-slug on its own subdomain. Automatic once the wildcard lands.',
    soon: true,
  },
  {
    id: 'custom_domain',
    label: 'YOUR DOMAIN',
    desc: 'Bring your own domain — the rebelution.* pattern.',
    soon: true,
  },
] as const;

export function BrandosophicNovasPage() {
  const { bee } = useAuth();
  const [astras, setAstras] = useState<{ id: string; slug: string; displayName: string }[]>([]);
  const [skins, setSkins] = useState<SkinRow[]>([]);
  const [astraId, setAstraId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tier, setTier] = useState<string>('standard');
  const [skinId, setSkinId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; novaId: string } | null>(null);

  useEffect(() => {
    void fetchAstraChoices().then(setAstras);
    void fetchPresets().then((presets) => {
      setSkins(presets);
      setSkinId((cur) => cur ?? presets[0]?.id ?? null);
    });
  }, []);
  useEffect(() => {
    if (bee?.id) {
      void fetchMyKits(bee.id).then((kits) => setSkins((prev) => [...kits, ...prev]));
    }
  }, [bee?.id]);

  // Auto-derive slug from the display name until the Bee edits it directly.
  useEffect(() => {
    if (!slugTouched) {
      setSlug(
        displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-+|-+$)/g, '')
          .slice(0, 39),
      );
    }
  }, [displayName, slugTouched]);

  const slugOk = SLUG_RE.test(slug);
  const ready = Boolean(bee && astraId && displayName.trim().length >= 2 && slugOk && skinId);
  const selectedAstra = useMemo(() => astras.find((a) => a.id === astraId), [astras, astraId]);

  const submit = async () => {
    if (!ready || busy || !astraId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await createNova({
        astraId,
        displayName: displayName.trim(),
        slug,
        tier,
        skinSourceId: skinId,
      });
      setDone({ slug: res.slug, novaId: res.novaId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nova creation failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    // The Nova's Birth Certificate (Butch, Jul 24) — the keeper.
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border-2 border-zinc-900 p-8 text-center">
          <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400">
            NOVA REGISTRY
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-zinc-900">Birth Certificate</h1>
          <p className="mt-4 text-lg font-bold text-zinc-900">{displayName}</p>
          <p className="mt-1 text-sm text-zinc-500">
            born this day · slug <code className="rounded bg-zinc-100 px-1">{done.slug}</code> ·
            skin lineage kept
          </p>
          <a
            href={`/n/${done.slug}`}
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white"
          >
            VISIT /n/{done.slug}
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setDisplayName('');
            setSlug('');
            setSlugTouched(false);
          }}
          className="mx-auto mt-6 block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-zinc-900">Create a Nova</h1>
      <p className="mt-1 text-sm text-zinc-500">
        A Nova is your own portal composing an Astra's surfaces — wearing your skin.
      </p>

      {/* 1 · Source Astra */}
      <h2 className="mt-6 text-xs font-bold tracking-wide text-zinc-500">1 · SOURCE ASTRA</h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {astras.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAstraId(a.id)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              astraId === a.id
                ? 'border-zinc-900 font-semibold text-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            }`}
          >
            {a.displayName}
          </button>
        ))}
        {astras.length === 0 && (
          <div className="col-span-full text-sm text-zinc-500">Loading Astras…</div>
        )}
      </div>

      {/* 2 · Name + slug */}
      <h2 className="mt-6 text-xs font-bold tracking-wide text-zinc-500">2 · NAME + SLUG</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="slug (permanent)"
            className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${
              slug && !slugOk ? 'border-red-400' : 'border-zinc-300'
            }`}
          />
          <p className="mt-1 text-xs text-zinc-400">
            lowercase, digits, dashes · 2–39 chars · slugs never rename
          </p>
        </div>
      </div>

      {/* 3 · Tier */}
      <h2 className="mt-6 text-xs font-bold tracking-wide text-zinc-500">3 · TIER</h2>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={t.soon}
            onClick={() => setTier(t.id)}
            className={`rounded-lg border p-3 text-left disabled:opacity-45 ${
              tier === t.id ? 'border-zinc-900' : 'border-zinc-200'
            }`}
          >
            <div className="text-sm font-bold text-zinc-900">
              {t.label}
              {t.soon && <span className="ml-2 text-[10px] font-semibold text-zinc-400">SOON</span>}
            </div>
            <div className="mt-1 text-xs text-zinc-500">{t.desc}</div>
          </button>
        ))}
      </div>

      {/* 4 · Skin */}
      <h2 className="mt-6 text-xs font-bold tracking-wide text-zinc-500">4 · SKIN</h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {skins.map((s) => {
          const accent = s.branding?.accentHex ?? '#6E1423';
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSkinId(s.id)}
              className={`rounded-lg border p-2 text-left ${
                skinId === s.id ? 'border-zinc-900' : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="h-7 w-full rounded" style={{ background: accent }} />
              <div className="mt-1 flex items-center justify-between">
                <span className="truncate text-xs font-semibold text-zinc-800">{s.name}</span>
                {skinId === s.id && <Check size={12} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {selectedAstra
            ? `Composing ${selectedAstra.displayName}'s surfaces`
            : 'Pick a source Astra to begin'}
          {!bee && ' · sign in to create'}
        </span>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void submit()}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Creating…' : 'CREATE NOVA'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
