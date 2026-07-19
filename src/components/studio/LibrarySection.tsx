import { MediaLightbox } from '@/components/studio/MediaLightbox';
import { type Group, listMyGroups, uploadGroupImage } from '@/lib/groups';
import { relativeTime } from '@/lib/intel';
import {
  COLLECTION_LABEL,
  type LibrarySort,
  type LibraryUsage,
  MEDIA_ACCEPT_ALL,
  type MediaAsset,
  type MediaCollection,
  type MediaFolder,
  type MediaKind,
  type QuotaStatus,
  addToCollection,
  assetUrl,
  copyAssetToFile,
  createCollection,
  createFolder,
  deleteCollection,
  deleteFolder,
  downloadAsset,
  formatBytes,
  formatDuration,
  libraryUsage,
  listCollectionAssets,
  listCollections,
  listFolders,
  listLibrary,
  moveAssets,
  purgeAssets,
  quotaStatus,
  removeFromCollection,
  renameCollection,
  renameFolder,
  restoreAssets,
  setCollectionVisibility,
  trashAssets,
  updateAssetMeta,
  uploadToLibrary,
} from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  Camera,
  ChevronRight,
  Download,
  FileText,
  Film,
  Folder,
  FolderInput,
  FolderPlus,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Lock,
  MessageSquare,
  Minus,
  Music,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const ACCENT = '#D97706'; // Workshop amber — matches StudioPage
const FILL = '#FAD15E'; // honey fill

// ═════════════════════════════════════════════════════════════════════
// LIBRARY — the Creator Studio media shelf (creator_studio_media_v1).
// Upload / browse / organize / download images, video, audio, and
// documents. Folders are logical; Trash is a soft-delete shelf; the
// detail drawer edits metadata and routes into the editors.
// ═════════════════════════════════════════════════════════════════════

type KindTab = 'all' | MediaKind | 'trash';

const KIND_TABS: { key: KindTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Audio' },
  { key: 'document', label: 'Docs' },
  { key: 'trash', label: 'Trash' },
];

interface UploadItem {
  id: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export function LibrarySection({ beeId }: { beeId: string }) {
  const [tab, setTab] = useState<KindTab>('all');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<LibrarySort>('newest');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<MediaCollection | null>(null);
  const [usage, setUsage] = useState<LibraryUsage[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<MediaAsset | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dragOver, setDragOver] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const searching = search.trim().length > 0;
  const inTrash = tab === 'trash';

  const load = useCallback(() => {
    setError(null);
    if (activeCollection) {
      listCollectionAssets(activeCollection.id)
        .then((list) => {
          const term = search.trim().toLowerCase();
          setAssets(
            term
              ? list.filter((a) => `${a.fileName} ${a.title ?? ''}`.toLowerCase().includes(term))
              : list,
          );
        })
        .catch((e) => {
          setAssets([]);
          setError(e instanceof Error ? e.message : 'Load failed');
        });
      return;
    }
    listLibrary({
      kind: tab === 'all' || tab === 'trash' ? null : tab,
      folderId: inTrash || searching ? undefined : folderId,
      search: search.trim() || undefined,
      trashed: inTrash,
      sort,
    })
      .then(setAssets)
      .catch((e) => {
        setAssets([]);
        setError(e instanceof Error ? e.message : 'Load failed');
      });
  }, [tab, folderId, search, sort, inTrash, searching, activeCollection]);

  useEffect(() => {
    setAssets(null);
    load();
  }, [load]);

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
    listCollections()
      .then(setCollections)
      .catch(() => setCollections([]));
    libraryUsage()
      .then(setUsage)
      .catch(() => setUsage([]));
    quotaStatus()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  const refreshMeta = useCallback(() => {
    listFolders()
      .then(setFolders)
      .catch(() => {});
    listCollections()
      .then(setCollections)
      .catch(() => {});
    libraryUsage()
      .then(setUsage)
      .catch(() => {});
    quotaStatus()
      .then(setQuota)
      .catch(() => {});
  }, []);

  /* ───────────── uploads ───────────── */

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      const items: UploadItem[] = list.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        status: 'uploading',
      }));
      setUploads((u) => [...items, ...u].slice(0, 30));
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const item = items[i];
        try {
          // uploadToLibrary raises a detailed format message when unsupported.
          await uploadToLibrary(beeId, file, inTrash ? null : folderId);
          setUploads((u) =>
            u.map((x) => (x.id === item.id ? { ...x, status: 'done' as const } : x)),
          );
        } catch (e) {
          setUploads((u) =>
            u.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    status: 'error' as const,
                    error:
                      e instanceof Error
                        ? e.message.includes('quota')
                          ? 'Library full — free space in Trash or delete files'
                          : e.message
                        : 'failed',
                  }
                : x,
            ),
          );
        }
      }
      load();
      refreshMeta();
    },
    [beeId, folderId, inTrash, load, refreshMeta],
  );

  /* ───────────── selection + bulk ───────────── */

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());
  const selectedAssets = useMemo(
    () => (assets ?? []).filter((a) => selected.has(a.id)),
    [assets, selected],
  );

  async function bulk(
    action: 'trash' | 'restore' | 'purge' | 'download',
    targetFolder?: string | null,
  ) {
    try {
      if (action === 'trash') await trashAssets([...selected]);
      else if (action === 'restore') await restoreAssets([...selected]);
      else if (action === 'purge') {
        if (!window.confirm(`Delete ${selected.size} item(s) forever? This cannot be undone.`))
          return;
        await purgeAssets(selectedAssets);
      } else if (action === 'download') {
        for (const a of selectedAssets) await downloadAsset(a);
      }
      if (targetFolder !== undefined) await moveAssets([...selected], targetFolder);
      clearSelection();
      load();
      refreshMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  }

  async function moveSelection(target: string | null) {
    try {
      await moveAssets([...selected], target);
      clearSelection();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Move failed');
    }
  }

  /* ───────────── folders ───────────── */

  const childFolders = useMemo(
    () => folders.filter((f) => f.parentId === folderId),
    [folders, folderId],
  );

  const breadcrumb = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const chain: MediaFolder[] = [];
    let cur = folderId ? byId.get(folderId) : undefined;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return chain;
  }, [folders, folderId]);

  const totalBytes = usage.reduce((n, u) => n + u.totalBytes, 0);
  const totalCount = usage.reduce((n, u) => n + u.assetCount, 0);

  const showFolders = !inTrash && !searching && !activeCollection && childFolders.length > 0;

  // Collections (Albums / Playlists / Categories) live on the kind tabs.
  const kindTab: MediaKind | null = tab === 'all' || tab === 'trash' ? null : tab;
  const kindCollections = kindTab ? collections.filter((c) => c.kind === kindTab) : [];
  const shelfWord = kindTab ? COLLECTION_LABEL[kindTab] : null;

  async function newCollection() {
    if (!kindTab || !shelfWord) return;
    const name = window.prompt(`New ${shelfWord.one} name`);
    if (!name?.trim()) return;
    try {
      const id = await createCollection(beeId, kindTab, name);
      refreshMeta();
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create');
    }
  }

  async function addSelectionTo(collectionId: string) {
    try {
      await addToCollection(collectionId, [...selected]);
      clearSelection();
      refreshMeta();
      if (activeCollection?.id === collectionId) load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    }
  }

  async function removeSelectionFromActive() {
    if (!activeCollection) return;
    try {
      await removeFromCollection(activeCollection.id, [...selected]);
      clearSelection();
      refreshMeta();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  return (
    // Drag-drop surface only — every action inside has its own button.
    <div
      className="relative"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) setDragOver((n) => n + 1);
      }}
      onDragLeave={() => setDragOver((n) => Math.max(0, n - 1))}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(0);
          void handleFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Toolbar row 1: kind tabs + usage */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
          {KIND_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setActiveCollection(null);
                clearSelection();
              }}
              className={cn(
                'flex items-center gap-1 rounded-sm px-2.5 py-1 text-[12.5px] font-medium transition-all',
                tab !== t.key && 'text-zinc-500 hover:text-zinc-900',
              )}
              style={
                tab === t.key
                  ? { color: ACCENT, background: `${ACCENT}14`, fontWeight: 600 }
                  : undefined
              }
            >
              {t.key === 'trash' && <Trash2 size={12} />}
              {t.label}
            </button>
          ))}
        </div>
        <span
          className="flex items-center gap-2 font-mono text-[11px] text-zinc-500"
          data-size="meta"
          title={
            quota
              ? `${formatBytes(quota.usedBytes)} of ${formatBytes(quota.capBytes)} used`
              : 'Library storage in use'
          }
        >
          <HardDrive size={12} />
          <span>
            {totalCount} {totalCount === 1 ? 'item' : 'items'} · {formatBytes(totalBytes)}
            {quota && ` / ${formatBytes(quota.capBytes)}`}
          </span>
          {quota && (
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, (quota.usedBytes / quota.capBytes) * 100)}%`,
                  background: quota.usedBytes / quota.capBytes > 0.9 ? '#DC2626' : ACCENT,
                }}
              />
            </span>
          )}
        </span>
      </div>

      {/* Toolbar row 2: actions + search + sort + layout */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ background: FILL, color: '#18181b' }}
        >
          <Upload size={13} /> Upload
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={MEDIA_ACCEPT_ALL}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {!inTrash && (
          <>
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <FolderPlus size={13} /> New folder
            </button>
            <Link
              to="/studio/edit/image/new"
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Wand2 size={13} /> New design
            </Link>
            <Link
              to="/studio/record"
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Camera size={13} /> Record
            </Link>
          </>
        )}
        <div className="relative min-w-0 flex-1" style={{ minWidth: 140 }}>
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library…"
            aria-label="Search your library"
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-7 text-[12.5px] text-zinc-900 outline-none focus:border-honey/60"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySort)}
          aria-label="Sort"
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[12px] text-zinc-600 outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
          <option value="largest">Largest</option>
        </select>
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setLayout('grid')}
            aria-label="Grid view"
            className={cn(
              'rounded-sm p-1.5',
              layout === 'grid' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-700',
            )}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            type="button"
            onClick={() => setLayout('list')}
            aria-label="List view"
            className={cn(
              'rounded-sm p-1.5',
              layout === 'list' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-700',
            )}
          >
            <List size={13} />
          </button>
        </div>
      </div>

      {/* Breadcrumb (folder navigation) */}
      {!inTrash && !searching && !activeCollection && (
        <div
          className="mb-3 flex flex-wrap items-center gap-1 font-mono text-[11.5px]"
          data-size="meta"
        >
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className={cn(
              'rounded px-1.5 py-0.5 hover:bg-zinc-100',
              folderId === null ? 'font-semibold text-zinc-900' : 'text-zinc-500',
            )}
          >
            Library
          </button>
          {breadcrumb.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight size={11} className="text-zinc-400" />
              <button
                type="button"
                onClick={() => setFolderId(f.id)}
                className={cn(
                  'rounded px-1.5 py-0.5 hover:bg-zinc-100',
                  folderId === f.id ? 'font-semibold text-zinc-900' : 'text-zinc-500',
                )}
              >
                {f.name}
              </button>
            </span>
          ))}
          {folderId !== null && breadcrumb.length > 0 && (
            <FolderRowActions
              folder={breadcrumb[breadcrumb.length - 1]}
              onChanged={() => {
                refreshMeta();
                setFolderId(breadcrumb[breadcrumb.length - 1].parentId);
              }}
              onRenamed={refreshMeta}
            />
          )}
        </div>
      )}

      {error && (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {/* Collections rail — Albums / Playlists / Categories on the kind tabs */}
      {kindTab && shelfWord && !searching && !activeCollection && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span
            className="flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500"
            data-size="meta"
          >
            <Layers size={12} style={{ color: ACCENT }} /> {shelfWord.many}
          </span>
          {kindCollections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveCollection(c);
                clearSelection();
              }}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-700 transition-colors hover:border-amber-300 hover:bg-amber-50/50"
            >
              <span className="max-w-[140px] truncate font-medium">{c.name}</span>
              <span className="font-mono text-[10px] text-zinc-400" data-size="meta">
                {c.itemCount}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => void newCollection()}
            className="flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-[12px] text-zinc-500 hover:border-amber-400 hover:text-zinc-800"
          >
            <Plus size={12} /> New {shelfWord.one}
          </button>
        </div>
      )}

      {/* Open collection header */}
      {activeCollection && shelfWord && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setActiveCollection(null);
              clearSelection();
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500 hover:bg-white"
            data-size="meta"
          >
            ← {shelfWord.many}
          </button>
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-900">
            <Layers size={14} style={{ color: ACCENT }} />
            {activeCollection.name}
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              title={
                activeCollection.visibility === 'public'
                  ? 'Public — any signed-in Bee can view. Click to make private.'
                  : 'Private — only you. Click to publish to your profile Showcase.'
              }
              onClick={() => {
                const next = activeCollection.visibility === 'public' ? 'private' : 'public';
                setCollectionVisibility(activeCollection.id, next)
                  .then(() => {
                    setActiveCollection({ ...activeCollection, visibility: next });
                    refreshMeta();
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : 'Update failed'));
              }}
              className={cn(
                'mr-1 flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
                activeCollection.visibility === 'public'
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400',
              )}
              data-size="meta"
            >
              {activeCollection.visibility === 'public' ? <Globe size={10} /> : <Lock size={10} />}
              {activeCollection.visibility === 'public' ? 'Public' : 'Private'}
            </button>
            {activeCollection.kind === 'image' && (
              <button
                type="button"
                title="Copy this Album into a group album"
                aria-label="Share to a Group"
                onClick={() => setShareOpen(true)}
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-700"
              >
                <Share2 size={12} />
              </button>
            )}
            <button
              type="button"
              title={`Rename ${shelfWord.one}`}
              aria-label={`Rename ${shelfWord.one}`}
              onClick={() => {
                const name = window.prompt(`Rename ${shelfWord.one}`, activeCollection.name);
                if (name?.trim() && name.trim() !== activeCollection.name) {
                  renameCollection(activeCollection.id, name)
                    .then(() => {
                      setActiveCollection({ ...activeCollection, name: name.trim() });
                      refreshMeta();
                    })
                    .catch((e) => setError(e instanceof Error ? e.message : 'Rename failed'));
                }
              }}
              className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-700"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              title={`Delete ${shelfWord.one} (files stay in your Library)`}
              aria-label={`Delete ${shelfWord.one}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${activeCollection.name}”? The files stay in your Library.`,
                  )
                ) {
                  deleteCollection(activeCollection.id)
                    .then(() => {
                      setActiveCollection(null);
                      refreshMeta();
                    })
                    .catch((e) => setError(e instanceof Error ? e.message : 'Delete failed'));
                }
              }}
              className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={12} />
            </button>
          </span>
        </div>
      )}

      {/* Folder cards */}
      {showFolders && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {childFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolderId(f.id)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <Folder size={16} style={{ color: ACCENT }} className="flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
                {f.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Asset grid / list */}
      {assets === null ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
          Loading…
        </div>
      ) : assets.length === 0 && !showFolders ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-10 text-center text-[13px] text-zinc-500">
          {inTrash
            ? 'Trash is empty.'
            : searching
              ? 'Nothing matches that search.'
              : activeCollection && shelfWord
                ? `Nothing in this ${shelfWord.one} yet — go back, select files, and use “Add to ${shelfWord.one}”.`
                : 'Nothing here yet — drop files anywhere, or hit Upload.'}
        </div>
      ) : layout === 'grid' ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              selected={selected.has(a.id)}
              onSelect={() => toggleSelect(a.id)}
              onOpen={() => setDrawer(a)}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {assets.map((a) => (
            <AssetRow
              key={a.id}
              asset={a}
              selected={selected.has(a.id)}
              onSelect={() => toggleSelect(a.id)}
              onOpen={() => setDrawer(a)}
            />
          ))}
        </ul>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-300 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="font-mono text-[11.5px] font-semibold text-zinc-700" data-size="meta">
            {selected.size} selected
          </span>
          {!inTrash ? (
            <>
              <MoveMenu folders={folders} onMove={(t) => void moveSelection(t)} />
              {kindTab && shelfWord && (
                <AddToCollectionMenu
                  label={shelfWord.one}
                  collections={kindCollections}
                  onAdd={(id) => void addSelectionTo(id)}
                  onNew={() => {
                    void newCollection().then((id) => {
                      if (id) void addSelectionTo(id);
                    });
                  }}
                />
              )}
              {activeCollection && shelfWord && (
                <BulkButton
                  icon={<Minus size={12} />}
                  label={`Remove from ${shelfWord.one}`}
                  onClick={() => void removeSelectionFromActive()}
                />
              )}
              <BulkButton
                icon={<Download size={12} />}
                label="Download"
                onClick={() => void bulk('download')}
              />
              <BulkButton
                icon={<Trash2 size={12} />}
                label="Trash"
                tone="danger"
                onClick={() => void bulk('trash')}
              />
            </>
          ) : (
            <>
              <BulkButton
                icon={<RotateCcw size={12} />}
                label="Restore"
                onClick={() => void bulk('restore')}
              />
              <BulkButton
                icon={<Trash2 size={12} />}
                label="Delete forever"
                tone="danger"
                onClick={() => void bulk('purge')}
              />
            </>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto rounded p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload tray */}
      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 w-64 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-xl">
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500"
              data-size="meta"
            >
              Uploads
            </span>
            <button
              type="button"
              onClick={() => setUploads([])}
              aria-label="Dismiss uploads"
              className="rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            >
              <X size={12} />
            </button>
          </div>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {uploads.map((u) => (
              <li key={u.id} className="text-[11.5px]">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                      u.status === 'uploading' && 'animate-pulse bg-amber-500',
                      u.status === 'done' && 'bg-green-500',
                      u.status === 'error' && 'bg-red-500',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-zinc-700">{u.name}</span>
                  {u.status === 'error' && (
                    <span className="flex-shrink-0 text-[10px] font-semibold text-red-600">
                      failed
                    </span>
                  )}
                </span>
                {u.status === 'error' && u.error && (
                  <p className="mt-0.5 pl-3.5 text-[10.5px] leading-snug text-red-600">{u.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drag overlay */}
      {dragOver > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed"
          style={{ borderColor: ACCENT, background: `${ACCENT}0d` }}
        >
          <p
            className="flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: ACCENT }}
          >
            <Upload size={16} /> Drop to add to your library
          </p>
        </div>
      )}

      {shareOpen && activeCollection && (
        <GroupShareModal
          beeId={beeId}
          collectionName={activeCollection.name}
          assets={(assets ?? []).filter((a) => a.kind === 'image')}
          onClose={() => setShareOpen(false)}
        />
      )}

      {newFolderOpen && (
        <NewFolderModal
          beeId={beeId}
          parentId={folderId}
          onClose={() => setNewFolderOpen(false)}
          onCreated={() => {
            setNewFolderOpen(false);
            refreshMeta();
          }}
        />
      )}

      {drawer && (
        <AssetDrawer
          asset={drawer}
          folders={folders}
          onClose={() => setDrawer(null)}
          onChanged={() => {
            load();
            refreshMeta();
          }}
          onGone={() => {
            setDrawer(null);
            load();
            refreshMeta();
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── cards + rows ───────────────────────── */

function KindGlyph({ kind, size = 14 }: { kind: MediaKind; size?: number }) {
  if (kind === 'image') return <ImageIcon size={size} />;
  if (kind === 'video') return <Film size={size} />;
  if (kind === 'audio') return <Music size={size} />;
  return <FileText size={size} />;
}

function Thumb({ asset, className }: { asset: MediaAsset; className?: string }) {
  const url = assetUrl(asset);
  if (asset.kind === 'image') {
    return (
      <img
        src={url}
        alt={asset.altText ?? asset.fileName}
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  if (asset.kind === 'video') {
    return (
      <video
        src={url}
        preload="metadata"
        muted
        playsInline
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400',
        className,
      )}
    >
      <KindGlyph kind={asset.kind} size={26} />
    </div>
  );
}

function AssetCard({
  asset,
  selected,
  onSelect,
  onOpen,
}: {
  asset: MediaAsset;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md',
        selected ? 'border-amber-400 ring-2 ring-amber-300/50' : 'border-zinc-200',
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-50">
          <Thumb asset={asset} />
          {asset.durationSeconds !== null && (
            <span
              className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1 py-0.5 font-mono text-[10px] text-white"
              data-size="meta"
            >
              {formatDuration(asset.durationSeconds)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="flex-shrink-0 text-zinc-400">
            <KindGlyph kind={asset.kind} size={12} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-800">
            {asset.title || asset.fileName}
          </span>
        </div>
      </button>
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        aria-label={`Select ${asset.fileName}`}
        className={cn(
          'absolute left-2 top-2 h-4 w-4 cursor-pointer accent-amber-500 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      />
    </li>
  );
}

function AssetRow({
  asset,
  selected,
  onSelect,
  onOpen,
}: {
  asset: MediaAsset;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-white px-3 py-2',
        selected ? 'border-amber-400 ring-1 ring-amber-300/50' : 'border-zinc-200',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        aria-label={`Select ${asset.fileName}`}
        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-amber-500"
      />
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-zinc-50">
        <Thumb asset={asset} />
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium text-zinc-800">
          {asset.title || asset.fileName}
        </p>
        <p className="font-mono text-[10.5px] text-zinc-500" data-size="meta">
          {asset.kind} · {formatBytes(asset.byteSize)}
          {asset.durationSeconds !== null && ` · ${formatDuration(asset.durationSeconds)}`}
          {asset.width && asset.height && ` · ${asset.width}×${asset.height}`}
          {' · '}
          {relativeTime(asset.trashedAt ?? asset.createdAt)}
        </p>
      </button>
    </li>
  );
}

/* ───────────────────────── bulk bar bits ───────────────────────── */

function BulkButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md border px-2 py-1 text-[11.5px] font-medium',
        tone === 'danger'
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MoveMenu({
  folders,
  onMove,
}: {
  folders: MediaFolder[];
  onMove: (target: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Flatten the tree with depth for indentation.
  const flat = useMemo(() => {
    const byParent = new Map<string | null, MediaFolder[]>();
    for (const f of folders) {
      const key = f.parentId;
      byParent.set(key, [...(byParent.get(key) ?? []), f]);
    }
    const out: { folder: MediaFolder; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const f of byParent.get(parent) ?? []) {
        out.push({ folder: f, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [folders]);

  return (
    <div ref={ref} className="relative">
      <BulkButton
        icon={<FolderInput size={12} />}
        label="Move to…"
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onMove(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
          >
            <Folder size={12} className="text-zinc-400" /> Library root
          </button>
          {flat.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                onMove(folder.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
              style={{ paddingLeft: 12 + depth * 14 }}
            >
              <Folder size={12} style={{ color: ACCENT }} />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddToCollectionMenu({
  label,
  collections,
  onAdd,
  onNew,
}: {
  label: string;
  collections: MediaCollection[];
  onAdd: (collectionId: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <BulkButton
        icon={<Layers size={12} />}
        label={`Add to ${label}…`}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onAdd(c.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
            >
              <Layers size={12} style={{ color: ACCENT }} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="font-mono text-[10px] text-zinc-400" data-size="meta">
                {c.itemCount}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNew();
            }}
            className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-1.5 text-left text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={12} /> New {label}…
          </button>
        </div>
      )}
    </div>
  );
}

/** Copy an image Album's contents into one of the Bee's group albums. */
function GroupShareModal({
  beeId,
  collectionName,
  assets,
  onClose,
}: {
  beeId: string;
  collectionName: string;
  assets: MediaAsset[];
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [progress, setProgress] = useState<{ at: number; total: number } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyGroups(beeId)
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [beeId]);

  async function shareTo(group: Group) {
    if (progress) return;
    setError(null);
    setProgress({ at: 0, total: assets.length });
    try {
      for (let i = 0; i < assets.length; i++) {
        const file = await copyAssetToFile(assets[i]);
        await uploadGroupImage(group.id, 'album', file);
        setProgress({ at: i + 1, total: assets.length });
      }
      setDone(group.name);
      setProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed');
      setProgress(null);
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
      <div className="relative w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-zinc-900">
            Share “{collectionName}” to a Group
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
        <p className="mb-3 text-[12px] text-zinc-500">
          Copies {assets.length} {assets.length === 1 ? 'image' : 'images'} into the group's album.
          Your Library originals stay put.
        </p>
        {done ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[12.5px] text-green-700">
            Shared to {done} — the album has them now.
          </p>
        ) : progress ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-[12px] text-zinc-700">
            Copying {progress.at} / {progress.total}…
          </p>
        ) : groups === null ? (
          <p className="py-4 text-center text-[12.5px] text-zinc-500">Loading your groups…</p>
        ) : groups.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-zinc-500">
            You're not in any groups yet.
          </p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => void shareTo(g)}
                  disabled={assets.length === 0}
                  className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-left text-[13px] text-zinc-800 hover:border-amber-300 hover:bg-amber-50/40 disabled:opacity-50"
                >
                  <Share2 size={13} className="flex-shrink-0 text-zinc-400" />
                  <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── folder management ───────────────────────── */

function FolderRowActions({
  folder,
  onChanged,
  onRenamed,
}: {
  folder: MediaFolder;
  onChanged: () => void;
  onRenamed: () => void;
}) {
  return (
    <span className="ml-1 flex items-center gap-0.5">
      <button
        type="button"
        title="Rename folder"
        aria-label="Rename folder"
        onClick={() => {
          const name = window.prompt('Rename folder', folder.name);
          if (name?.trim() && name.trim() !== folder.name) {
            renameFolder(folder.id, name)
              .then(onRenamed)
              .catch(() => {});
          }
        }}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Pencil size={11} />
      </button>
      <button
        type="button"
        title="Delete folder (contents move to Library root)"
        aria-label="Delete folder"
        onClick={() => {
          if (window.confirm(`Delete “${folder.name}”? Its files move to the Library root.`)) {
            deleteFolder(folder.id)
              .then(onChanged)
              .catch(() => {});
          }
        }}
        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={11} />
      </button>
    </span>
  );
}

function NewFolderModal({
  beeId,
  parentId,
  onClose,
  onCreated,
}: {
  beeId: string;
  parentId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createFolder(beeId, name, parentId);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create folder');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; Cancel closes the dialog */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="mb-3 font-display text-[16px] font-semibold text-zinc-900">New folder</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void create()}
          placeholder="Folder name"
          aria-label="Folder name"
          className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none focus:border-honey/60"
        />
        {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy || !name.trim()}
            className="rounded-md px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ background: FILL, color: '#18181b' }}
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── detail drawer ───────────────────────── */

function AssetDrawer({
  asset,
  folders,
  onClose,
  onChanged,
  onGone,
}: {
  asset: MediaAsset;
  folders: MediaFolder[];
  onClose: () => void;
  onChanged: () => void;
  onGone: () => void;
}) {
  const [fileName, setFileName] = useState(asset.fileName);
  const [title, setTitle] = useState(asset.title ?? '');
  const [altText, setAltText] = useState(asset.altText ?? '');
  const [description, setDescription] = useState(asset.description ?? '');
  const [tags, setTags] = useState(asset.tags.join(', '));
  const [folderId, setFolderId] = useState<string | ''>(asset.folderId ?? '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = assetUrl(asset);
  const dirty =
    fileName !== asset.fileName ||
    title !== (asset.title ?? '') ||
    altText !== (asset.altText ?? '') ||
    description !== (asset.description ?? '') ||
    tags !== asset.tags.join(', ') ||
    (folderId || null) !== asset.folderId;

  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      await updateAssetMeta(asset.id, {
        fileName: fileName.trim() || asset.fileName,
        title: title.trim() || null,
        altText: altText.trim() || null,
        description: description.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        folderId: folderId || null,
      });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  async function toTrash() {
    setBusy(true);
    try {
      await trashAssets([asset.id]);
      onGone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trash failed');
      setBusy(false);
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
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3">
          <span className="flex min-w-0 items-center gap-2">
            <span style={{ color: ACCENT }}>
              <KindGlyph kind={asset.kind} size={16} />
            </span>
            <span className="truncate font-display text-[15px] font-semibold text-zinc-900">
              {asset.title || asset.fileName}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* Preview */}
          <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            {asset.kind === 'image' && (
              <img
                src={url}
                alt={asset.altText ?? asset.fileName}
                className="mx-auto max-h-72 object-contain"
              />
            )}
            {asset.kind === 'video' && (
              // biome-ignore lint/a11y/useMediaCaption: user-authored library media has no caption track
              <video src={url} controls playsInline className="mx-auto max-h-72 w-full bg-black" />
            )}
            {asset.kind === 'audio' && (
              <div className="p-4">
                {/* biome-ignore lint/a11y/useMediaCaption: user-authored library media has no caption track */}
                <audio src={url} controls className="w-full" />
              </div>
            )}
            {asset.kind === 'document' && (
              <div className="flex items-center justify-center gap-2 p-8 text-zinc-400">
                <FileText size={28} />
                <span className="font-mono text-[12px] uppercase" data-size="meta">
                  {asset.fileName.split('.').pop()}
                </span>
              </div>
            )}
          </div>

          {/* Meta line */}
          <p className="mb-4 font-mono text-[11px] text-zinc-500" data-size="meta">
            {asset.mimeType} · {formatBytes(asset.byteSize)}
            {asset.width && asset.height && ` · ${asset.width}×${asset.height}`}
            {asset.durationSeconds !== null && ` · ${formatDuration(asset.durationSeconds)}`}
            {' · added '}
            {relativeTime(asset.createdAt)}
            {asset.source !== 'upload' && ` · from ${asset.source.replaceAll('_', ' ')}`}
          </p>

          {/* Actions */}
          <div className="mb-5 flex flex-wrap gap-2">
            {asset.kind === 'image' && (
              <Link
                to={`/studio/edit/image/${asset.id}`}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold"
                style={{ background: FILL, color: '#18181b' }}
              >
                <Wand2 size={13} /> Edit image
              </Link>
            )}
            {asset.kind === 'video' && (
              <>
                <Link
                  to={`/studio/edit/video/${asset.id}`}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold"
                  style={{ background: FILL, color: '#18181b' }}
                >
                  <Wand2 size={13} /> Edit video
                </Link>
                <Link
                  to={`/studio/record?respond=${asset.id}`}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Camera size={13} /> Respond
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => void downloadAsset(asset)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Download size={13} /> Download
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Link2 size={13} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => setTalkOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <MessageSquare size={13} /> Discussion
            </button>
            {asset.trashedAt === null ? (
              <button
                type="button"
                onClick={() => void toTrash()}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-[12px] text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} /> Trash
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  restoreAssets([asset.id])
                    .then(onGone)
                    .catch(() => {});
                }}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 hover:bg-zinc-100"
              >
                <RotateCcw size={13} /> Restore
              </button>
            )}
          </div>

          {/* Editable metadata */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lib-file-name"
                className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
              >
                File name
              </label>
              <input
                id="lib-file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
              />
            </div>
            <div>
              <label
                htmlFor="lib-title"
                className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
              >
                Title
              </label>
              <input
                id="lib-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Display title"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
              />
            </div>
          </div>
          {asset.kind === 'image' && (
            <div className="mt-3">
              <label
                htmlFor="lib-alt"
                className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
              >
                Alt text
              </label>
              <input
                id="lib-alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for screen readers"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
              />
            </div>
          )}
          <div className="mt-3">
            <label
              htmlFor="lib-desc"
              className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
            >
              Description
            </label>
            <textarea
              id="lib-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-honey/60"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lib-tags"
                className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
              >
                Tags (comma-separated)
              </label>
              <input
                id="lib-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="honey, launch, hero"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none focus:border-honey/60"
              />
            </div>
            <div>
              <label
                htmlFor="lib-folder"
                className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
              >
                Folder
              </label>
              <select
                id="lib-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13.5px] text-zinc-900 outline-none"
              >
                <option value="">Library root</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-zinc-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !dirty}
            className="rounded-md px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ background: FILL, color: '#18181b' }}
          >
            {busy ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </div>

      {talkOpen && (
        <MediaLightbox
          media={{ kind: asset.kind, url, title: asset.title || asset.fileName }}
          targetKind="asset"
          targetRef={asset.id}
          onClose={() => setTalkOpen(false)}
        />
      )}
    </div>
  );
}
