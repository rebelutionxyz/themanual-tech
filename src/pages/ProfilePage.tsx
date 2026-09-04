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
import { ManualProfileHost } from '@/lib/profileHost';
import { ProfileOwnPage } from '@honeycomb/profile';
import { FileText, Globe, Layers, Music, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

/**
 * PROFILE_SHARED1 — thin adapter. The core (header, sign-out, rank/ring
 * cards, location editor) now lives in @honeycomb/profile's ProfileOwnPage;
 * this file supplies only what's roof-specific to TheMANUAL.tech: the
 * Creator Studio Showcase and the contributions placeholder, as `children`.
 */
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

  return (
    <ManualProfileHost>
      <ProfileOwnPage
        bee={{
          id: bee.id,
          handle: bee.handle,
          blingRank: bee.blingRank ?? 0,
          honeycombRing: bee.honeycombRing ?? 0,
          createdAt: bee.createdAt,
        }}
        configured={configured}
        onSignOut={() => signOut()}
      >
        {/* Creator Studio Showcase — the Bee's PUBLIC shelves. The same
            component renders for visitors on /@handle (PublicProfilePage); the
            hive-read policies it relies on are deployed. */}
        <ShowcaseSection beeId={bee.id} owner />

        {/* Contributions placeholder */}
        <div className="mt-10 rounded-lg border border-border bg-bg-elevated/40 p-6">
          <h2 className="font-display text-xl font-semibold text-text-silver-bright">
            Your contributions
          </h2>
          <p
            className="mt-2 font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
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
      </ProfileOwnPage>
    </ManualProfileHost>
  );
}

/* ───────────────────────── Showcase (Creator Studio) ───────────────────────── */

export function ShowcaseSection({ beeId, owner = false }: { beeId: string; owner?: boolean }) {
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
        Public Albums, Playlists, and Categories{owner ? ' from your Creators Studio Library' : ''}
      </p>
      {shelves === null ? (
        <p className="mt-4 text-text-dim" style={{ fontSize: '12.5px' }}>
          Loading…
        </p>
      ) : shelves.length === 0 ? (
        owner ? (
          <p className="mt-4 text-text-dim" style={{ fontSize: '12.5px' }}>
            Nothing public yet — open a shelf in your{' '}
            <Link to="/studio" className="underline hover:text-text-silver-bright">
              Creators Studio Library
            </Link>{' '}
            and flip it to Public.
          </p>
        ) : (
          <p className="mt-4 text-text-dim" style={{ fontSize: '12.5px' }}>
            Nothing public yet.
          </p>
        )
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
