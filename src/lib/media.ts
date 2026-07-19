import { supabase } from '@/lib/supabase';

// ═════════════════════════════════════════════════════════════════════
// CREATOR STUDIO — MEDIA LIBRARY data layer (creator_studio_media_v1).
//
// The per-Bee shelf every Astra pulls from: images, video, audio, and
// documents. Storage paths are flat (library/{bee_id}/{uuid}.{ext});
// folders are logical DB rows, so moving assets is metadata-only.
// Editors (image / video / response recorder) save exports back here
// with source + edit_of lineage.
// ═════════════════════════════════════════════════════════════════════

export type MediaKind = 'image' | 'video' | 'audio' | 'document';

export const MEDIA_BUCKET = 'creator-media';

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  storagePath: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  folderId: string | null;
  title: string | null;
  altText: string | null;
  description: string | null;
  tags: string[];
  source: 'upload' | 'image_editor' | 'video_editor' | 'response_recorder' | 'import';
  editOf: string | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryUsage {
  kind: MediaKind;
  assetCount: number;
  totalBytes: number;
}

/** Accept attribute per kind (file pickers + drop validation). */
export const MEDIA_ACCEPT: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif',
  video:
    'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/mpeg,video/x-m4v,video/3gpp',
  audio:
    'audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/flac,audio/x-m4a',
  document:
    'application/pdf,text/plain,text/markdown,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export const MEDIA_ACCEPT_ALL = Object.values(MEDIA_ACCEPT).join(',');

/**
 * Classify a MIME type into a library kind (null = not accepted). STRICT
 * membership against MEDIA_ACCEPT — which mirrors the bucket allowlist —
 * so unsupported formats fail early with a clear message instead of a
 * cryptic storage rejection.
 */
export function kindFromMime(mime: string): MediaKind | null {
  for (const kind of Object.keys(MEDIA_ACCEPT) as MediaKind[]) {
    if (MEDIA_ACCEPT[kind].split(',').includes(mime)) return kind;
  }
  return null;
}

/** Translate raw storage errors into Bee-readable ones. */
function friendlyStorageError(msg: string): string {
  if (/exceeded the maximum allowed size|too large|payload too large/i.test(msg)) {
    return 'Too big — over the per-file upload cap. Compress or trim it (or the cap gets raised in Supabase storage settings).';
  }
  if (/mime type .* is not supported/i.test(msg)) {
    return 'That format is not accepted — use MP4/WebM/MOV for video, MP3/WAV/M4A for audio, PNG/JPG/WebP for images.';
  }
  return msg;
}

/** Human-readable byte count (1 dp above KB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** mm:ss (or h:mm:ss) for AV durations. */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

/* ───────────────────────── row mapping ───────────────────────── */

interface AssetRow {
  id: string;
  kind: MediaKind;
  storage_path: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | string | null;
  folder_id: string | null;
  title: string | null;
  alt_text: string | null;
  description: string | null;
  tags: string[] | null;
  source: MediaAsset['source'];
  edit_of: string | null;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

const ASSET_COLS =
  'id,kind,storage_path,file_name,mime_type,byte_size,width,height,duration_seconds,folder_id,title,alt_text,description,tags,source,edit_of,trashed_at,created_at,updated_at';

function mapAsset(r: AssetRow): MediaAsset {
  return {
    id: r.id,
    kind: r.kind,
    storagePath: r.storage_path,
    fileName: r.file_name,
    mimeType: r.mime_type,
    byteSize: r.byte_size,
    width: r.width,
    height: r.height,
    durationSeconds: r.duration_seconds === null ? null : Number(r.duration_seconds),
    folderId: r.folder_id,
    title: r.title,
    altText: r.alt_text,
    description: r.description,
    tags: r.tags ?? [],
    source: r.source,
    editOf: r.edit_of,
    trashedAt: r.trashed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Public URL for an asset (creator-media is a public bucket). */
export function assetUrl(asset: Pick<MediaAsset, 'storagePath'>): string {
  if (!supabase) return '';
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(asset.storagePath).data.publicUrl;
}

/* ───────────────────────── metadata probing ───────────────────────── */

interface ProbedMeta {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

/** Read intrinsic dimensions / duration client-side before upload. */
export async function probeFile(file: File, kind: MediaKind): Promise<ProbedMeta> {
  const none: ProbedMeta = { width: null, height: null, durationSeconds: null };
  if (kind === 'document') return none;
  const url = URL.createObjectURL(file);
  try {
    if (kind === 'image') {
      return await new Promise<ProbedMeta>((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight, durationSeconds: null });
        img.onerror = () => resolve(none);
        img.src = url;
      });
    }
    return await new Promise<ProbedMeta>((resolve) => {
      const el = document.createElement(kind === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const v = el as HTMLVideoElement;
        resolve({
          width: kind === 'video' && v.videoWidth ? v.videoWidth : null,
          height: kind === 'video' && v.videoHeight ? v.videoHeight : null,
          durationSeconds: Number.isFinite(el.duration) ? el.duration : null,
        });
      };
      el.onerror = () => resolve(none);
      el.src = url;
    });
  } finally {
    // Probe elements read metadata synchronously after load; safe to revoke
    // on the next macrotask.
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

/* ───────────────────────── uploads ───────────────────────── */

export interface UploadResult {
  asset: MediaAsset;
}

function extFor(file: File): string {
  const fromName = file.name.includes('.') ? (file.name.split('.').pop() ?? '') : '';
  if (fromName && /^[a-z0-9]{1,8}$/i.test(fromName)) return fromName.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'weba',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
  };
  return map[file.type] ?? 'bin';
}

/**
 * Upload one file into the Bee's library. Storage first, then the metadata
 * row; if the row insert fails the object is removed (no orphans).
 */
export async function uploadToLibrary(
  beeId: string,
  file: File,
  folderId: string | null,
): Promise<MediaAsset> {
  if (!supabase) throw new Error('Supabase not configured');
  const kind = kindFromMime(file.type);
  if (!kind) {
    throw new Error(
      `Format not accepted (${file.type || file.name.split('.').pop() || 'unknown'}) — use MP4/WebM/MOV, MP3/WAV/M4A, PNG/JPG/WebP, or PDF/DOC.`,
    );
  }

  const id = crypto.randomUUID();
  const path = `library/${beeId}/${id}.${extFor(file)}`;
  const meta = await probeFile(file, kind);

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (upErr) throw new Error(friendlyStorageError(upErr.message));

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id,
      bee_id: beeId,
      kind,
      storage_path: path,
      file_name: file.name || `untitled.${extFor(file)}`,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      width: meta.width,
      height: meta.height,
      duration_seconds: meta.durationSeconds,
      folder_id: folderId,
    })
    .select(ASSET_COLS)
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return mapAsset(data as AssetRow);
}

/**
 * Save an editor export (image/video/audio Blob) into the library with
 * lineage. Used by the image editor, video editor, and response recorder.
 */
export async function saveBlobToLibrary(
  beeId: string,
  blob: Blob,
  opts: {
    fileName: string;
    mimeType: string;
    source: MediaAsset['source'];
    editOf?: string | null;
    folderId?: string | null;
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
  },
): Promise<MediaAsset> {
  if (!supabase) throw new Error('Supabase not configured');
  const kind = kindFromMime(opts.mimeType);
  if (!kind) throw new Error(`Type not accepted: ${opts.mimeType}`);
  const id = crypto.randomUUID();
  const ext = extFor(new File([blob], opts.fileName, { type: opts.mimeType }));
  const path = `library/${beeId}/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: opts.mimeType, upsert: false });
  if (upErr) throw new Error(friendlyStorageError(upErr.message));

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id,
      bee_id: beeId,
      kind,
      storage_path: path,
      file_name: opts.fileName,
      mime_type: opts.mimeType,
      byte_size: blob.size,
      width: opts.width ?? null,
      height: opts.height ?? null,
      duration_seconds: opts.durationSeconds ?? null,
      folder_id: opts.folderId ?? null,
      source: opts.source,
      edit_of: opts.editOf ?? null,
    })
    .select(ASSET_COLS)
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return mapAsset(data as AssetRow);
}

/* ───────────────────────── listing ───────────────────────── */

export type LibrarySort = 'newest' | 'oldest' | 'name' | 'largest';

export interface ListLibraryOpts {
  kind?: MediaKind | null;
  /** undefined = all folders; null = root only; string = that folder. */
  folderId?: string | null;
  search?: string;
  trashed?: boolean;
  sort?: LibrarySort;
  limit?: number;
}

export async function listLibrary(opts: ListLibraryOpts = {}): Promise<MediaAsset[]> {
  if (!supabase) return [];
  let q = supabase.from('media_assets').select(ASSET_COLS);
  q = opts.trashed ? q.not('trashed_at', 'is', null) : q.is('trashed_at', null);
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.folderId !== undefined && !opts.trashed) {
    q = opts.folderId === null ? q.is('folder_id', null) : q.eq('folder_id', opts.folderId);
  }
  if (opts.search?.trim()) {
    const term = opts.search.trim().replaceAll('%', '\\%').replaceAll(',', ' ');
    q = q.or(`file_name.ilike.%${term}%,title.ilike.%${term}%`);
  }
  switch (opts.sort ?? 'newest') {
    case 'newest':
      q = q.order(opts.trashed ? 'trashed_at' : 'created_at', { ascending: false });
      break;
    case 'oldest':
      q = q.order('created_at', { ascending: true });
      break;
    case 'name':
      q = q.order('file_name', { ascending: true });
      break;
    case 'largest':
      q = q.order('byte_size', { ascending: false });
      break;
  }
  q = q.limit(opts.limit ?? 500);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as AssetRow[]).map(mapAsset);
}

export async function getAsset(id: string): Promise<MediaAsset | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('media_assets')
    .select(ASSET_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAsset(data as AssetRow) : null;
}

/* ───────────────────────── asset mutations ───────────────────────── */

export async function updateAssetMeta(
  id: string,
  patch: Partial<{
    fileName: string;
    title: string | null;
    altText: string | null;
    description: string | null;
    tags: string[];
    folderId: string | null;
  }>,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const row: Record<string, unknown> = {};
  if (patch.fileName !== undefined) row.file_name = patch.fileName;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.altText !== undefined) row.alt_text = patch.altText;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.folderId !== undefined) row.folder_id = patch.folderId;
  const { error } = await supabase.from('media_assets').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moveAssets(ids: string[], folderId: string | null): Promise<void> {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase
    .from('media_assets')
    .update({ folder_id: folderId })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

/** Soft-delete: assets land in Trash (storage untouched until purge). */
export async function trashAssets(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase
    .from('media_assets')
    .update({ trashed_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

export async function restoreAssets(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase.from('media_assets').update({ trashed_at: null }).in('id', ids);
  if (error) throw new Error(error.message);
}

/** Hard delete: remove storage objects, then the rows. */
export async function purgeAssets(assets: Pick<MediaAsset, 'id' | 'storagePath'>[]): Promise<void> {
  if (!supabase || assets.length === 0) return;
  const { error: sErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(assets.map((a) => a.storagePath));
  if (sErr) throw new Error(sErr.message);
  const { error } = await supabase
    .from('media_assets')
    .delete()
    .in(
      'id',
      assets.map((a) => a.id),
    );
  if (error) throw new Error(error.message);
}

/** Download via blob so the browser saves instead of navigating. */
export async function downloadAsset(asset: MediaAsset): Promise<void> {
  const res = await fetch(assetUrl(asset));
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = asset.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ───────────────────────── folders ───────────────────────── */

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export async function listFolders(): Promise<MediaFolder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('media_folders')
    .select('id,name,parent_id,created_at')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as FolderRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    createdAt: r.created_at,
  }));
}

export async function createFolder(
  beeId: string,
  name: string,
  parentId: string | null,
): Promise<MediaFolder> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('media_folders')
    .insert({ bee_id: beeId, name: name.trim(), parent_id: parentId })
    .select('id,name,parent_id,created_at')
    .single();
  if (error) {
    throw new Error(
      error.message.includes('media_folders_unique_name_per_level')
        ? 'A folder with that name already exists here.'
        : error.message,
    );
  }
  const r = data as FolderRow;
  return { id: r.id, name: r.name, parentId: r.parent_id, createdAt: r.created_at };
}

export async function renameFolder(id: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('media_folders').update({ name: name.trim() }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Delete a folder. Contained assets fall back to the library root
 * (folder_id → NULL via FK); subfolders cascade away.
 */
export async function deleteFolder(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('media_folders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ───────────────────────── collections ───────────────────────── */
// Curation shelves (creator_studio_collections_v1): kind-scoped, m2m —
// one asset can live in many. UI label depends on kind:

export const COLLECTION_LABEL: Record<MediaKind, { one: string; many: string }> = {
  image: { one: 'Album', many: 'Albums' },
  video: { one: 'Playlist', many: 'Playlists' },
  audio: { one: 'Playlist', many: 'Playlists' },
  document: { one: 'Category', many: 'Categories' },
};

export type CollectionVisibility = 'private' | 'public';

export interface MediaCollection {
  id: string;
  kind: MediaKind;
  name: string;
  visibility: CollectionVisibility;
  itemCount: number;
  createdAt: string;
}

interface CollectionRow {
  id: string;
  kind: MediaKind;
  name: string;
  visibility: CollectionVisibility;
  created_at: string;
  media_collection_items: { count: number }[] | null;
}

export async function listCollections(kind?: MediaKind): Promise<MediaCollection[]> {
  if (!supabase) return [];
  let q = supabase
    .from('media_collections')
    .select('id,kind,name,visibility,created_at,media_collection_items(count)')
    .order('name', { ascending: true });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as CollectionRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    visibility: r.visibility,
    itemCount: r.media_collection_items?.[0]?.count ?? 0,
    createdAt: r.created_at,
  }));
}

export async function createCollection(
  beeId: string,
  kind: MediaKind,
  name: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('media_collections')
    .insert({ bee_id: beeId, kind, name: name.trim() })
    .select('id')
    .single();
  if (error) {
    throw new Error(
      error.message.includes('media_collections_unique_name_per_kind')
        ? `A ${COLLECTION_LABEL[kind].one.toLowerCase()} with that name already exists.`
        : error.message,
    );
  }
  return (data as { id: string }).id;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('media_collections')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Delete a shelf; the assets inside are never touched. */
export async function deleteCollection(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('media_collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Add assets to a shelf (already-added ones are skipped). */
export async function addToCollection(collectionId: string, assetIds: string[]): Promise<void> {
  if (!supabase || assetIds.length === 0) return;
  const { error } = await supabase.from('media_collection_items').upsert(
    assetIds.map((asset_id) => ({ collection_id: collectionId, asset_id })),
    { onConflict: 'collection_id,asset_id', ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(
      error.message.includes('row-level security')
        ? 'Only matching media types can go in this shelf.'
        : error.message,
    );
  }
}

export async function setCollectionVisibility(
  id: string,
  visibility: CollectionVisibility,
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('media_collections').update({ visibility }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * A Bee's PUBLIC shelves (profile Showcase). Readable by any signed-in Bee
 * via the hive-read policies; harmless to call for yourself too.
 */
export async function listPublicCollections(beeId: string): Promise<MediaCollection[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('media_collections')
    .select('id,kind,name,visibility,created_at,media_collection_items(count)')
    .eq('bee_id', beeId)
    .eq('visibility', 'public')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CollectionRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    visibility: r.visibility,
    itemCount: r.media_collection_items?.[0]?.count ?? 0,
    createdAt: r.created_at,
  }));
}

export async function removeFromCollection(
  collectionId: string,
  assetIds: string[],
): Promise<void> {
  if (!supabase || assetIds.length === 0) return;
  const { error } = await supabase
    .from('media_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .in('asset_id', assetIds);
  if (error) throw new Error(error.message);
}

/** Contents of a shelf, newest additions first. */
export async function listCollectionAssets(collectionId: string): Promise<MediaAsset[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('media_collection_items')
    .select(`added_at, media_assets(${ASSET_COLS})`)
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as { media_assets: AssetRow | AssetRow[] | null }[])
    .map((r) => (Array.isArray(r.media_assets) ? r.media_assets[0] : r.media_assets))
    .filter((a): a is AssetRow => a !== null && a !== undefined)
    .filter((a) => a.trashed_at === null)
    .map(mapAsset);
}

/**
 * Fetch a Library asset's bytes as a File — the copy-to-bucket bridge for
 * Astra that store their own media (group albums, event covers, listings).
 */
export async function copyAssetToFile(asset: MediaAsset): Promise<File> {
  const res = await fetch(assetUrl(asset));
  if (!res.ok) throw new Error('Could not read the Library file');
  const blob = await res.blob();
  return new File([blob], asset.fileName, { type: asset.mimeType });
}

/* ───────────────────────── usage ───────────────────────── */

export interface QuotaStatus {
  usedBytes: number;
  capBytes: number;
}

/** Library cap meter (v1: flat 2 GiB per Bee — media_quota_cap()). */
export async function quotaStatus(): Promise<QuotaStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('media_quota_status');
  if (error) throw new Error(error.message);
  const row = (data as { used_bytes: number; cap_bytes: number }[] | null)?.[0];
  return row ? { usedBytes: Number(row.used_bytes), capBytes: Number(row.cap_bytes) } : null;
}

export async function libraryUsage(): Promise<LibraryUsage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('media_library_usage');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { kind: MediaKind; asset_count: number; total_bytes: number }[]).map(
    (r) => ({ kind: r.kind, assetCount: Number(r.asset_count), totalBytes: Number(r.total_bytes) }),
  );
}
