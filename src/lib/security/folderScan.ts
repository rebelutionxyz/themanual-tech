/**
 * folderScan — real folder access for the device Security page (FRONT29).
 * -----------------------------------------------------------------------
 * Wraps the File System Access API: pick a directory, walk it, and — where the
 * Bee granted readwrite — actually remove or quarantine a file.
 *
 * SUPPORT. showDirectoryPicker is Chromium desktop only (Chrome / Edge / Opera).
 * Firefox and Safari do not implement it, and no mobile browser does. Detection
 * here is BEHAVIOURAL, never a UA sniff: we look for the callable, and any
 * failure that is not an explicit user cancel demotes the capability so the
 * caller can fall back to <input type=file> without ever showing a dead control.
 *
 * PERMISSION. A directory granted read-only can be scanned but NOT written. The
 * caller must gate every destructive control on `writable` — a Remove button
 * that is going to fail is worse than no button.
 *
 * The DOM lib does not ship these types in every TS version we build against,
 * so the shapes below are declared structurally rather than imported.
 */

/* ── minimal structural types ─────────────────────────────────────────── */
export interface FsWritable {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}
export interface FsFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(opts?: { keepExistingData?: boolean }): Promise<FsWritable>;
}
export interface FsDirHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FsDirHandle | FsFileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FsDirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
  queryPermission?(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface PickerWindow {
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FsDirHandle>;
}

/** One file found by the walk, with the handle needed to act on it later. */
export interface FsFileEntry {
  file: File;
  name: string;
  /** Path relative to the picked root, for display. */
  relPath: string;
  parent: FsDirHandle;
}

/** Something the walk could not read. Counted and shown — never swallowed. */
export interface WalkSkip {
  path: string;
  reason: 'permission' | 'unreadable';
}

export interface PickedFolder {
  root: FsDirHandle;
  /** True only when readwrite was actually granted. Gate destructive UI on this. */
  writable: boolean;
}

/** The subfolder quarantined files are moved into, inside the granted root. */
export const QUARANTINE_DIR = 'Quarantine';
/** Appended so a quarantined file cannot be launched by double-click. */
export const QUARANTINE_SUFFIX = '.quarantined';

/* ── capability ───────────────────────────────────────────────────────── */

/** Is the directory picker callable at all? Presence check, not a UA sniff. */
export function folderPickerAvailable(): boolean {
  return typeof (window as PickerWindow).showDirectoryPicker === 'function';
}

/**
 * Prompt for a directory. Resolves null when the Bee cancels, and throws
 * UNSUPPORTED when the picker exists but the environment refuses it (some
 * embedded webviews) so the caller can demote to the file-input fallback.
 */
export async function pickDirectory(): Promise<PickedFolder | null> {
  const show = (window as PickerWindow).showDirectoryPicker;
  if (!show) throw new Error('UNSUPPORTED');

  let root: FsDirHandle;
  try {
    root = await show({ mode: 'readwrite' });
  } catch (err) {
    // AbortError is the Bee closing the dialog — an ordinary outcome, not a
    // capability failure, so it must NOT demote the button.
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError')
      return null;
    throw new Error('UNSUPPORTED');
  }

  // Asking for readwrite does not guarantee getting it.
  let writable = false;
  try {
    const state = (await root.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt';
    writable =
      state === 'granted'
        ? true
        : (await root.requestPermission?.({ mode: 'readwrite' })) === 'granted';
  } catch {
    writable = false;
  }
  return { root, writable };
}

/* ── walk ─────────────────────────────────────────────────────────────── */

/**
 * Yield every file under `dir`, depth-first, one at a time. A generator so the
 * caller can process and release each file instead of materialising the tree —
 * a real folder can hold tens of thousands of entries.
 *
 * `shouldStop` is consulted before every entry so Stop takes effect mid-walk.
 * The Quarantine subfolder is skipped: re-scanning our own quarantine would
 * re-report files the Bee has already dealt with.
 */
export async function* walkDirectory(
  dir: FsDirHandle,
  shouldStop: () => boolean,
  onSkip: (s: WalkSkip) => void,
  prefix = '',
): AsyncGenerator<FsFileEntry> {
  let iter: AsyncIterableIterator<FsDirHandle | FsFileHandle>;
  try {
    iter = dir.values();
  } catch {
    onSkip({ path: prefix || dir.name, reason: 'permission' });
    return;
  }

  for (;;) {
    if (shouldStop()) return;

    let step: IteratorResult<FsDirHandle | FsFileHandle>;
    try {
      step = await iter.next();
    } catch {
      onSkip({ path: prefix || dir.name, reason: 'permission' });
      return;
    }
    if (step.done) return;

    const handle = step.value;
    const relPath = prefix ? `${prefix}/${handle.name}` : handle.name;

    if (handle.kind === 'directory') {
      if (handle.name === QUARANTINE_DIR) continue;
      yield* walkDirectory(handle, shouldStop, onSkip, relPath);
      continue;
    }

    try {
      const file = await handle.getFile();
      yield { file, name: handle.name, relPath, parent: dir };
    } catch {
      // Locked, vanished mid-walk, or permission-denied at the file level.
      onSkip({ path: relPath, reason: 'unreadable' });
    }
  }
}

/* ── act ──────────────────────────────────────────────────────────────── */

export interface ActResult {
  ok: boolean;
  /** Present on success where the file moved; shown back to the Bee. */
  path?: string;
  /** Present on failure. Plain language — this reaches the UI verbatim. */
  error?: string;
}

const msg = (err: unknown): string => {
  const name = err && typeof err === 'object' ? (err as { name?: string }).name : undefined;
  if (name === 'NotAllowedError') return 'permission was refused';
  if (name === 'NotFoundError') return 'the file was already gone';
  if (name === 'NoModificationAllowedError') return 'the file is locked by another program';
  return 'the browser refused the operation';
};

/** True when `name` no longer exists in `dir`. The proof, not the assumption. */
async function isGone(dir: FsDirHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return false;
  } catch (err) {
    return !!err && typeof err === 'object' && (err as { name?: string }).name === 'NotFoundError';
  }
}

/**
 * Delete a file, then PROVE it is gone before reporting success. A security
 * page that says "removed" about a file still on disk is worse than one that
 * never offered to remove it.
 */
export async function removeFile(entry: FsFileEntry): Promise<ActResult> {
  try {
    await entry.parent.removeEntry(entry.name);
  } catch (err) {
    return { ok: false, error: `Could not remove it — ${msg(err)}.` };
  }
  if (!(await isGone(entry.parent, entry.name))) {
    return { ok: false, error: 'The browser reported success but the file is still there.' };
  }
  return { ok: true };
}

/**
 * Move a file into <root>/Quarantine/<name>.quarantined.
 *
 * This is containment a browser can honestly perform: the file leaves its
 * original location and loses its executable extension, so it cannot be
 * launched by double-click. It is NOT a sandbox and the UI must not imply one.
 *
 * The copy is STREAMED, so a large file never sits in memory, and the original
 * is deleted only after the copy is verified present. A failure at any step
 * leaves the original untouched.
 */
export async function quarantineFile(entry: FsFileEntry, root: FsDirHandle): Promise<ActResult> {
  const target = `${entry.name}${QUARANTINE_SUFFIX}`;
  let qdir: FsDirHandle;
  try {
    qdir = await root.getDirectoryHandle(QUARANTINE_DIR, { create: true });
  } catch (err) {
    return { ok: false, error: `Could not create the Quarantine folder — ${msg(err)}.` };
  }

  try {
    const handle = await qdir.getFileHandle(target, { create: true });
    const writable = await handle.createWritable();
    await entry.file.stream().pipeTo(writable as unknown as WritableStream);
  } catch (err) {
    return {
      ok: false,
      error: `Could not write the quarantined copy — ${msg(err)}. The file was left where it is.`,
    };
  }

  // Only now is deleting the original safe.
  try {
    await qdir.getFileHandle(target);
  } catch {
    return {
      ok: false,
      error: 'The quarantined copy could not be verified. The file was left where it is.',
    };
  }

  try {
    await entry.parent.removeEntry(entry.name);
  } catch (err) {
    return {
      ok: false,
      error: `Copied to Quarantine but could not delete the original — ${msg(err)}. It is now in BOTH places.`,
    };
  }
  if (!(await isGone(entry.parent, entry.name))) {
    return { ok: false, error: 'Copied to Quarantine but the original is still there.' };
  }
  return { ok: true, path: `${QUARANTINE_DIR}/${target}` };
}

/** Move a quarantined file back to where it came from, dropping the suffix. */
export async function restoreFile(entry: FsFileEntry, root: FsDirHandle): Promise<ActResult> {
  const stored = `${entry.name}${QUARANTINE_SUFFIX}`;
  let qdir: FsDirHandle;
  try {
    qdir = await root.getDirectoryHandle(QUARANTINE_DIR);
  } catch (err) {
    return { ok: false, error: `Could not open the Quarantine folder — ${msg(err)}.` };
  }

  try {
    const src = await qdir.getFileHandle(stored);
    const file = await src.getFile();
    const dest = await entry.parent.getFileHandle(entry.name, { create: true });
    const writable = await dest.createWritable();
    await file.stream().pipeTo(writable as unknown as WritableStream);
  } catch (err) {
    return { ok: false, error: `Could not restore it — ${msg(err)}. It is still in Quarantine.` };
  }

  try {
    await qdir.removeEntry(stored);
  } catch {
    return {
      ok: true,
      path: entry.relPath,
      error: 'Restored, but the quarantined copy could not be deleted.',
    };
  }
  return { ok: true, path: entry.relPath };
}

/** Permanently delete a quarantined file from the Quarantine folder. */
export async function purgeQuarantined(entry: FsFileEntry, root: FsDirHandle): Promise<ActResult> {
  const stored = `${entry.name}${QUARANTINE_SUFFIX}`;
  try {
    const qdir = await root.getDirectoryHandle(QUARANTINE_DIR);
    await qdir.removeEntry(stored);
    if (!(await isGone(qdir, stored))) {
      return { ok: false, error: 'The browser reported success but the file is still there.' };
    }
  } catch (err) {
    return { ok: false, error: `Could not delete it — ${msg(err)}.` };
  }
  return { ok: true };
}
