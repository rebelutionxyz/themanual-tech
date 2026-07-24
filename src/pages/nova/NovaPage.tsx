import type { BrandingConfig } from '@/lib/branding';
import { mergeBranding } from '@/lib/skins';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Hexagon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════
// NOVA PORTAL v1 — /n/:slug (Block 2, 2026-07-24).
// A Nova finally exists somewhere you can stand: branded full-page portal
// wearing the Nova's skin, carrying its Birth Certificate, opening onto
// the comb. Full surface composition under the Nova's skin = later block.
// Public: resolves via nova_resolve (SECDEF); logs via page_view_log.
// ═════════════════════════════════════════════════════════════════════

interface NovaData {
  nova: { id: string; slug: string; display_name: string; tier: string; created_at: string };
  astra: { slug: string; display_name: string; domain: string | null };
  skin: {
    skin_id: string;
    name: string;
    branding: Partial<BrandingConfig>;
    background_softness: number;
    lineage: string | null;
  } | null;
  /** Doorways-as-lenses v1: the Nova's own OFFERs + INTEL threads (owner-based
      today; nova_id-tagged content joins automatically when tagging ships). */
  offers: { id: string; title: string; price_bling: number | null; listing_type: string | null; image_url: string | null }[];
  threads: { id: string; title: string; created_at: string }[];
}

// The comb doorways a v1 Nova opens onto (community surfaces on this host).
const DOORWAYS = [
  { label: 'INTEL', to: '/intel' },
  { label: 'UNITE', to: '/unite' },
  { label: 'RULE', to: '/rule' },
  { label: 'GIVE', to: '/give' },
  { label: 'BAZAAR', to: '/bazaar' },
];

export function NovaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<NovaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !supabase) {
      setLoading(false);
      return;
    }
    void supabase.rpc('nova_resolve', { p_slug: slug }).then(({ data: d }) => {
      setData((d as NovaData | null) ?? null);
      setLoading(false);
    });
    // Analytics rail: append-only, fire-and-forget, never blocks the page.
    void supabase.rpc('page_view_log', {
      p_path: `/n/${slug}`,
      p_astra_slug: null,
      p_referrer: document.referrer || null,
    });
  }, [slug]);

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-zinc-950" />;
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
        <Hexagon size={28} />
        <p className="text-sm">No Nova lives at this address.</p>
        <Link to="/brandosophic/novas" className="text-sm underline">
          Create one in BRANDoSOPHIC
        </Link>
      </div>
    );
  }

  const branding = mergeBranding(data.skin?.branding);
  const accent = branding.accentHex;
  const soft = data.skin?.background_softness ?? 0.9;
  const born = new Date(data.nova.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="relative flex h-full flex-col overflow-y-auto bg-zinc-950 text-zinc-100"
      style={{ ['--nova-accent' as string]: accent }}
    >
      {/* Skin wash — softness-driven, same trick as the shell mock. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(900px 480px at 70% -10%, ${accent}26, transparent 70%)`,
          opacity: Math.max(0, 1.05 - soft),
        }}
      />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Hexagon size={40} style={{ color: accent }} />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight">{data.nova.display_name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          A sovereign portal of{' '}
          <span className="font-semibold text-zinc-200">{data.astra.display_name}</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {DOORWAYS.map((d) => (
            <Link
              key={d.label}
              to={d.to}
              className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-xs font-bold tracking-wide text-zinc-300 transition hover:text-white"
              style={{ borderColor: `${accent}55` }}
            >
              {d.label}
              <ArrowRight size={12} className="opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </div>
        {/* ── Lensed shelves: the Nova's own goods + voice ─────────── */}
        {data.offers.length > 0 && (
          <section className="mt-14 w-full text-left">
            <h2 className="text-[11px] font-bold tracking-[0.25em]" style={{ color: accent }}>
              OFFERS
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.offers.map((o) => (
                <Link
                  key={o.id}
                  to={`/bazaar/${o.id}`}
                  className="rounded-xl border border-zinc-800 p-3 transition hover:border-zinc-600"
                >
                  {o.image_url && (
                    <img
                      src={o.image_url}
                      alt=""
                      className="mb-2 h-20 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="truncate text-sm font-semibold text-zinc-100">{o.title}</div>
                  {o.price_bling != null && (
                    <div className="text-xs text-zinc-400">{o.price_bling} BLiNG!</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
        {data.threads.length > 0 && (
          <section className="mt-10 w-full text-left">
            <h2 className="text-[11px] font-bold tracking-[0.25em]" style={{ color: accent }}>
              FROM THE HIVE MIND
            </h2>
            <div className="mt-3 space-y-2">
              {data.threads.map((t) => (
                <Link
                  key={t.id}
                  to={`/intel/t/${t.id}`}
                  className="block rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-200 transition hover:border-zinc-600"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── The Birth Certificate ─────────────────────────────────── */}
      <footer className="relative border-t border-zinc-800/70 px-6 py-5">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] tracking-wide text-zinc-500">
          <span className="font-semibold" style={{ color: accent }}>
            BIRTH CERTIFICATE
          </span>
          <span>
            born {born} · of {data.astra.display_name} · tier {data.nova.tier}
          </span>
          {data.skin?.lineage && <span>skin lineage · {data.skin.lineage}</span>}
          <span>/n/{data.nova.slug}</span>
        </div>
      </footer>
    </div>
  );
}
