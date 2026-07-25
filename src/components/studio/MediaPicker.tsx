import { useAuth } from '@/lib/auth';
import {
  type MediaAsset,
  type MediaFolder,
  type MediaKind,
  assetUrl,
  formatBytes,
  formatDuration,
  listFolders,
  listLibrary,
  uploadToLibrary,
} from '@/lib/media';
import { cn } from '@/lib/utils';
import { FileText, Film, Folder, Image as ImageIcon, Music, Search, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const ACCENT = '#D97706';

// ═════════════════════════════════════════════════════════════════════
// MEDIA PICKER — the shared "attach from your Library" modal every Astra
// mounts (COMMs attachments, Groups album, Pulse publish, the editors).
// Pass the kinds a surface accepts; the Bee browses/searches their
// Creator Studio Library and picks one asset.
// ═════════════════════════════════════════════════════════════════════

const KIND_META: Record<MediaKind, { label: string; icon: typeof Film }> = {
  image: { label: 'Images', icon: ImageIcon },
  video: { label: 'Video', icon: Film },
  audio: { label: 'Audio', icon: Music },
  document: { label: 'Docs', icon: FileText },
};

export function MediaPicker({
  kinds,
  title,
  onClose,
  onPick,
}: {
  /** Which library kinds this surface accepts (tabs shown when > 1). */
  kinds: MediaKind[];
  title?: string;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
}) {
  const { bee } = useAuth();
  const [kind, setKind] = useState<MediaKind>(kinds[0]);
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  /** undefined = all folders · string = that folder. */
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  useEffect(() => {
    setAssets(null);
    const t = setTimeout(
      () => {
        listLibrary({ kind, folderId, search: search.trim() || undefined, sort: 'newest' })
          .then(setAssets)
          .catch(() => setAssets([]));
      },
      search ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [kind, search, folderId]);

  async function handleUpload(file: File) {
    if (!bee || uploading) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const saved = await uploadToLibrary(bee.id, file, folderId ?? null);
      onPick(saved); // picked the moment it lands — the flow the picker is for
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed');
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; close button provided */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <h2 className="min-w-0 truncate font-display text-[15px] font-semibold text-zinc-900">
            {title ?? 'Pick from your Library'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-2">
          {kinds.length > 1 && (
            <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
              {kinds.map((k) => {
                const Icon = KIND_META[k].icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex items-center gap-1 rounded-sm px-2 py-1 text-[11.5px] font-medium',
                      kind !== k && 'text-zinc-500 hover:text-zinc-900',
                    )}
                    style={
                      kind === k
                        ? { color: ACCENT, background: `${ACCENT}14`, fontWeight: 600 }
                        : undefined
                    }
                  >
                    <Icon size={12} /> {KIND_META[k].label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="relative min-w-0 flex-1" style={{ minWidth: 120 }}>
            <Search
              size={12}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search your library"
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-7 pr-2 text-[12px] text-zinc-900 outline-none focus:border-honey/60"
            />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!bee || uploading}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = '';
            }}
          />
        </div>

        {(folders.length > 0 || uploadErr) && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-4 py-2">
            {folders.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setFolderId(undefined)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px]',
                    folderId === undefined
                      ? 'border-amber-300 bg-amber-50 font-semibold text-amber-700'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100',
                  )}
                >
                  All
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFolderId(f.id)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]',
                      folderId === f.id
                        ? 'border-amber-300 bg-amber-50 font-semibold text-amber-700'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100',
                    )}
                  >
                    <Folder size={10} /> {f.name}
                  </button>
                ))}
              </>
            )}
            {uploadErr && <span className="text-[11px] text-red-600">{uploadErr}</span>}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {assets === null ? (
            <p className="py-10 text-center text-[12.5px] text-zinc-500">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-zinc-500">
              Nothing here yet — add {KIND_META[kind].label.toLowerCase()} in your{' '}
              <Link to="/studio" className="underline" style={{ color: ACCENT }}>
                Creators Studio Library
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {assets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onPick(a)}
                    className="group block w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-left transition-colors hover:border-amber-300 hover:shadow-sm"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-50">
                      {a.kind === 'image' ? (
                        <img
                          src={assetUrl(a)}
                          alt={a.altText ?? a.fileName}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : a.kind === 'video' ? (
                        <video
                          src={assetUrl(a)}
                          preload="metadata"
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          {a.kind === 'audio' ? <Music size={22} /> : <FileText size={22} />}
                        </div>
                      )}
                      {a.durationSeconds !== null && (
                        <span
                          className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9.5px] text-white"
                          data-size="meta"
                        >
                          {formatDuration(a.durationSeconds)}
                        </span>
                      )}
                    </div>
                    <div className="px-1.5 py-1">
                      <p className="truncate text-[11px] font-medium text-zinc-800">
                        {a.title || a.fileName}
                      </p>
                      <p className="font-mono text-[9.5px] text-zinc-500" data-size="meta">
                        {formatBytes(a.byteSize)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
