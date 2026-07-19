import { ProfileLocationEditor } from '@/components/profile/ProfileLocationEditor';
import { MediaLightbox } from '@/components/studio/MediaLightbox';
import { useAuth } from '@/lib/auth';
import {
  COLLECTION_LABEL,
  type MediaAsset,
  type MediaCollection,
  assetUrl,
  listCollectionAssets,
  listPublicCollections,
} from '@/lib/media';
import { getOGDisplayLabel, getOGGeneration } from '@/lib/og-generation';
import { cn } from '@/lib/utils';
import { Crown, FileText, Globe, Layers, LogOut, Music, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

const BLING_RANK_NAMES = [
  'Seed',
  'Sprout',
  'Sapling',
  'Ranger',
  'Scout',
  'Squire',
  'Knight',
  'Protector',
  'Defender',
  'Guardian',
  'Champion',
  'Hero',
  'Paladin',
  'Sage',
  'Wizard',
  'Mystic',
  'Oracle',
  'Prophet',
  'Luminary',
  'Ascendant',
  'Exalted',
  'Sovereign',
  'Radiant',
  'Celestial',
  'Divine',
  'Archon',
  'Demiurge',
  'Eternal',
  'Infinite',
  'Transcendent',
  'Absolute',
  'Miraculous',
  'Miracle',
];

const RING_NAMES = [
  'NewBee',
  'Producer',
  'Scout',
  'Builder',
  'Scholar',
  'Sentinel',
  'Guardian',
  'Creator',
  'Queen',
];

const RING_THRESHOLDS = [0, 500, 2000, 6000, 15000, 35000, 75000, 150000, 300000];

export function ProfilePage() {
  const { bee, loading, signOut, configured } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!bee) return <Navigate to="/login" replace />;

  const blingRank = bee.blingRank ?? 0;
  const ring = bee.honeycombRing ?? 0;
  const rankName = BLING_RANK_NAMES[Math.min(blingRank, 32)];
  const ringName = RING_NAMES[Math.min(ring, 8)];
  const nextRingThreshold = ring < 8 ? RING_THRESHOLDS[ring + 1] : null;
  const ogLabel = getOGDisplayLabel(getOGGeneration(bee.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      {/* Header */}
      <div className="mb-10 flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-text-silver/30 bg-bg-elevated">
          <span className="font-display text-3xl text-text-silver-bright">
            {bee.handle.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold text-text-silver-bright">
            {bee.handle}
          </h1>
          <p
            className="mt-1 font-mono text-text-muted"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            Ringbearer · {ringName}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-honey/40 bg-honey/10 px-2 py-0.5">
            <Sparkles size={11} className="text-honey" />
            <span
              className="font-mono uppercase tracking-wider text-honey"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {ogLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm',
            'text-text-dim hover:border-border-bright hover:bg-bg-elevated hover:text-text-silver',
          )}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>

      {/* Rank cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <RankCard
          icon={<Sparkles size={16} />}
          title="BLiNG! Rank"
          subtitle="33 levels · 1.0x – 10.0x multiplier"
          level={blingRank}
          max={32}
          name={rankName}
          colorClass="text-honey"
        />
        <RankCard
          icon={<Crown size={16} />}
          title="HoneyComb RiNG"
          subtitle="9 levels · raw action count · cannot be bought"
          level={ring}
          max={8}
          name={ringName}
          colorClass="text-text-silver-bright"
          nextThreshold={nextRingThreshold}
        />
      </div>

      {/* Phase C Component C-4: location editor — reads/writes bee_profiles */}
      <ProfileLocationEditor />

      {/* Creator Studio Showcase — the Bee's PUBLIC shelves. Renders on the
          Bee's own /profile today; the same data lights up for visitors when
          /bees/:handle lands (hive-read policies already deployed). */}
      <ShowcaseSection beeId={bee.id} />

      {/* Contributions placeholder */}
      <div className="mt-10 rounded-lg border border-border bg-bg-elevated/40 p-6">
        <h2 className="font-display text-xl font-semibold text-text-silver-bright">
          Your contributions
        </h2>
        <p className="mt-2 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          Sources added · kettle votes · comments — coming soon
        </p>
        <Link
          to="/manual"
          className="mt-4 inline-block font-mono text-text-silver hover:text-text-silver-bright"
          style={{ fontSize: '12px' }}
        >
          → Explore the Manual
        </Link>
      </div>

      {!configured && (
        <div className="mt-6 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
          <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
            Read-only mode: Supabase not configured.
          </p>
        </div>
      )}
    </main>
  );
}

interface RankCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  level: number;
  max: number;
  name: string;
  colorClass: string;
  nextThreshold?: number | null;
}

function RankCard({
  icon,
  title,
  subtitle,
  level,
  max,
  name,
  colorClass,
  nextThreshold,
}: RankCardProps) {
  const progress = (level / max) * 100;
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
      <div className="flex items-center gap-2 text-text-silver">
        <span className={colorClass}>{icon}</span>
        <span className="font-mono" style={{ fontSize: '11px' }} data-size="meta">
          {title}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-text-silver-bright">{name}</p>
      <p className="mt-0.5 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
        Level {level} / {max}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className={cn('h-full transition-all', colorClass.replace('text-', 'bg-'))}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-text-dim" style={{ fontSize: '12px' }}>
        {subtitle}
      </p>
      {nextThreshold !== null && nextThreshold !== undefined && (
        <p className="mt-2 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          next: {nextThreshold.toLocaleString()} actions
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Showcase (Creator Studio) ───────────────────────── */

function ShowcaseSection({ beeId }: { beeId: string }) {
  const [shelves, setShelves] = useState<MediaCollection[] | null>(null);
  const [open, setOpen] = useState<MediaCollection | null>(null);

  useEffect(() => {
    listPublicCollections(beeId)
      .then(setShelves)
      .catch(() => setShelves([]));
  }, [beeId]);

  return (
    <div className="mt-10 rounded-lg border border-border bg-bg-elevated/40 p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-text-silver-bright">
        <Globe size={17} className="text-text-silver" /> Showcase
      </h2>
      <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
        Public Albums, Playlists, and Categories from your Creators Studio Library
      </p>
      {shelves === null ? (
        <p className="mt-4 text-text-dim" style={{ fontSize: '12.5px' }}>
          Loading…
        </p>
      ) : shelves.length === 0 ? (
        <p className="mt-4 text-text-dim" style={{ fontSize: '12.5px' }}>
          Nothing public yet — open a shelf in your{' '}
          <Link to="/studio" className="underline hover:text-text-silver-bright">
            Creators Studio Library
          </Link>{' '}
          and flip it to Public.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {shelves.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpen(c)}
                className="w-full rounded-lg border border-border bg-bg p-3 text-left transition-colors hover:border-text-silver/40"
              >
                <span
                  className="flex items-center gap-1.5 text-text-silver-bright"
                  style={{ fontSize: '13.5px', fontWeight: 600 }}
                >
                  <Layers size={13} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                </span>
                <span
                  className="mt-1 block font-mono text-text-muted"
                  style={{ fontSize: '10.5px' }}
                  data-size="meta"
                >
                  {COLLECTION_LABEL[c.kind].one} · {c.itemCount}{' '}
                  {c.itemCount === 1 ? 'item' : 'items'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <ShowcaseViewer collection={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ShowcaseViewer({
  collection,
  onClose,
}: {
  collection: MediaCollection;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const [shelfTalk, setShelfTalk] = useState(false);

  useEffect(() => {
    listCollectionAssets(collection.id)
      .then(setAssets)
      .catch(() => setAssets([]));
  }, [collection.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; close button provided */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h3 className="flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold text-zinc-900">
            <Layers size={15} className="text-amber-600" />
            <span className="truncate">{collection.name}</span>
            <span
              className="font-mono text-[10.5px] font-normal uppercase tracking-wider text-zinc-400"
              data-size="meta"
            >
              {COLLECTION_LABEL[collection.kind].one}
            </span>
          </h3>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShelfTalk(true)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              Discuss this {COLLECTION_LABEL[collection.kind].one}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {assets === null ? (
            <p className="py-10 text-center text-[13px] text-zinc-500">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-zinc-500">Empty shelf.</p>
          ) : collection.kind === 'image' ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {assets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setLightbox(a)}
                    aria-label="Open image and discussion"
                    className="block w-full overflow-hidden rounded-lg border border-zinc-200 transition-transform hover:scale-[1.01]"
                  >
                    <img
                      src={assetUrl(a)}
                      alt={a.altText ?? a.fileName}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              {assets.map((a) => (
                <li key={a.id} className="rounded-lg border border-zinc-200 p-2.5">
                  <p className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-zinc-800">
                    <span className="min-w-0 flex-1 truncate">{a.title || a.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setLightbox(a)}
                      className="flex-shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[10.5px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      Discuss
                    </button>
                  </p>
                  {a.kind === 'video' && (
                    // biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track
                    <video
                      src={assetUrl(a)}
                      controls
                      playsInline
                      className="max-h-64 w-full rounded bg-black"
                    />
                  )}
                  {a.kind === 'audio' && (
                    // biome-ignore lint/a11y/useMediaCaption: Bee-shared media has no caption track
                    <audio src={assetUrl(a)} controls className="w-full" />
                  )}
                  {a.kind === 'document' && (
                    <a
                      href={assetUrl(a)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[12.5px] text-zinc-600 underline hover:text-zinc-900"
                    >
                      {a.kind === 'document' ? <FileText size={14} /> : <Music size={14} />}
                      Open document
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {lightbox && (
        <MediaLightbox
          media={{
            kind: lightbox.kind,
            url: assetUrl(lightbox),
            title: lightbox.title || lightbox.fileName,
          }}
          targetKind="asset"
          targetRef={lightbox.id}
          onClose={() => setLightbox(null)}
        />
      )}
      {shelfTalk && (
        <MediaLightbox
          media={{ kind: 'collection', url: null, title: collection.name }}
          targetKind="collection"
          targetRef={collection.id}
          onClose={() => setShelfTalk(false)}
        />
      )}
    </div>
  );
}
