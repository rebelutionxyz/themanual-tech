/**
 * SecurityPage — browser security, user-facing · themanual.tech/security
 * ---------------------------------------------------------------------------------
 * FRONT30, owner ruling 2026-08-08: "If they can go to the website - no app
 * needed to get the value of security, that is good enough for me for now."
 * The website IS the product. There is no agent on the near roadmap.
 *
 * THE RULE THIS FILE EXISTS TO KEEP: **nothing on this page is invented.**
 * Every finding rendered here came from a check this browser actually ran. The
 * old build shipped SAMPLE_FINDINGS behind a DEMO DATA banner, which was right
 * while an agent was weeks away and became scareware once it wasn't — a
 * security page showing fabricated threats indefinitely is scareware however
 * well it is labelled. The sample data, the fake scan item names, the fake item
 * counts and the inert "shield" toggles are all gone. If you are adding to this
 * file: a finding must trace to a real check, or it does not get rendered.
 *
 * THE FIVE THINGS A BROWSER CAN HONESTLY DO, and the one it cannot:
 *   FILES     structural checks + SHA-256 corpus lookup (hand-picked or folder)
 *   LINKS     paste a link, check it against a known-bad feed
 *   PASSWORDS is this password in a known breach (HIBP k-anonymity, local hash)
 *   PRIVACY   granted permissions, tracking opt-out signals
 *   SYSTEM    browser patch level, secure context
 *   DEEP SCAN NOT POSSIBLE IN A BROWSER. Rendered dimmed and inert, with one
 *             plain sentence saying why. A truthful placeholder, not a teaser:
 *             no findings, no fake counts, not clickable, and it never drags
 *             the posture reading.
 *
 * WORDING: 'unknown' is "no known-malware match" / "not on the known-bad list",
 * never clean, never safe, never a green tick. A finished check reports WHAT WAS
 * CHECKED — never that the device is clean.
 *
 * THE AGENT BACKEND STAYS. dingleberry_scan_report and the scans/findings
 * tables are untouched by this pass; if an agent ever exists the rail is waiting
 * for it. This was a UI truthfulness pass, not a teardown.
 *
 * Palette: the app's CSS variables plus --sec #58a6ff (steel blue), --sec-deep
 * #1f6feb (actions), --warn #f59e0b (caution), #dc2626 crimson (critical),
 * #16a34a forest green. Honey stays with BLiNG! and is not used here.
 */

import {
  type FsDirHandle,
  type FsFileEntry,
  QUARANTINE_DIR,
  type WalkSkip,
  ensureWritable,
  folderPickerAvailable,
  pickDirectory,
  purgeQuarantined,
  quarantineFile,
  removeFile,
  restoreFile,
  walkDirectory,
} from '@/lib/security/folderScan';
import {
  type LookupOutcome,
  MAX_HASH_BYTES,
  lookupHashes,
  malwareDetail,
  malwareTitle,
  sha256File,
} from '@/lib/security/malwareHash';
import { PWNED_PASSWORD_MESSAGE, isPwnedPassword } from '@/lib/security/pwnedPassword';
import {
  type UrlVerdict,
  coerceUrl,
  lookupUrls,
  urlFindingDetail,
  urlFindingTitle,
} from '@/lib/security/urlCheck';
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

// Nonstandard-but-universal folder-pick attribute; typed once for reuse.
const DIR_PICK_PROPS = { webkitdirectory: '' } as unknown as InputHTMLAttributes<HTMLInputElement>;

/* ── types ───────────────────────────────────────────────────────────── */
/** `deep` is the honest placeholder; it never carries findings. */
type SurfaceId = 'files' | 'links' | 'passwords' | 'privacy' | 'system' | 'deep';
type Severity = 'critical' | 'high' | 'medium' | 'low';
/**
 * `ok` means "this check ran and turned up nothing" — NOT "clean". `na` is the
 * deep-scan cell: permanently unavailable in a browser, and excluded from the
 * posture calculation entirely so it can never drag the reading.
 */
type Level = 'idle' | 'scanning' | 'ok' | 'warn' | 'risk' | 'na';
type Tab = 'surfaces' | 'threats' | 'quarantine' | 'history';

interface SurfaceDef {
  id: SurfaceId;
  name: string;
  glyph: string;
  desc: string;
}
export interface Finding {
  id?: number;
  surface: SurfaceId;
  sev: Severity;
  title: string;
  detail: string;
  path?: string;
  /* There is deliberately NO `sample` flag on this type any more. The old build
     carried one, plus a SAMPLE badge to render it, and that pair is what made
     fabricated findings expressible in the first place. Removing the field makes
     the invariant structural: there is no way to mark a finding as invented,
     because there is no way to have one. */
  local?: boolean;
  noact?: boolean;
  qAt?: Date;
  /** Set only for findings from a readwrite folder scan — the handle that makes
   *  Remove and Quarantine real. Absent means the action is not offered. */
  fsEntry?: FsFileEntry;
}
/** Outcome of a real filesystem action, shown on the finding it belongs to. */
interface ActNote {
  ok: boolean;
  text: string;
}
/** One real check that actually ran. `items` is a true count, never invented. */
interface HistoryRow {
  at: Date;
  kind: 'files' | 'folder' | 'link' | 'password' | 'browser';
  items: number;
  found: number;
  bad: number;
}
interface FindingAction {
  label: string;
  danger?: boolean;
  confirmingNow?: boolean;
  onClick: () => void;
}
type FcStatus =
  | { phase: 'run'; text: string }
  | {
      phase: 'done';
      checked: number;
      /** Structural indicators — the heuristics, not the database. */
      flagged: number;
      capped: boolean;
      /** Files that produced a fingerprint and were actually looked up. */
      hashed: number;
      /** Confirmed known-malware matches. */
      matched: number;
      /** Files past MAX_HASH_BYTES — reported, never silently skipped. */
      oversize: number;
      /** The lookup could not reach a conclusion. NOT a no-match. */
      degraded: boolean;
      /** Files the walk could not read at all. A scan that hides these lies. */
      skipped: number;
      /** True when the Bee pressed Stop — the numbers are a partial scan. */
      stopped: boolean;
      /** Name of the scanned folder, when this was a folder scan. */
      folder?: string;
    }
  | null;

/* ── catalog ─────────────────────────────────────────────────────────── */
/**
 * Five things this browser can genuinely do, and one it cannot. Every entry
 * except `deep` is backed by code in this file that really runs.
 */
const SURFACES: SurfaceDef[] = [
  {
    id: 'files',
    name: 'Files',
    glyph: '⬡',
    desc: 'Check files you hand over: disguised executables, bad headers, and a known-malware fingerprint lookup.',
  },
  {
    id: 'links',
    name: 'Links',
    glyph: '⌁',
    desc: 'Paste a suspicious link and check it against a feed of addresses seen distributing malware.',
  },
  {
    id: 'passwords',
    name: 'Passwords',
    glyph: '◍',
    desc: 'Check whether a password already appears in a known data breach. It never leaves this device.',
  },
  {
    id: 'privacy',
    name: 'Privacy',
    glyph: '◉',
    desc: 'What this site has been granted, and whether a tracking opt-out signal is switched on.',
  },
  {
    id: 'system',
    name: 'System',
    glyph: '⬢',
    desc: 'Browser patch level and whether this page is running in a secure context.',
  },
  {
    id: 'deep',
    name: 'Deep scan',
    glyph: '▤',
    desc: 'Ambient malware, stalkerware and network monitoring need software installed on the device. That software does not exist yet, so this cannot run here.',
  },
];

/** The one surface that can never run in a browser. Excluded from posture. */
const UNAVAILABLE: SurfaceId = 'deep';

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
/** Stamp for the BROWSER FLOOR table below — not a virus-definition database. */
const FLOORS_STAMP = '2026.08.08';

const HISTORY_LABEL: Record<HistoryRow['kind'], string> = {
  files: 'File check',
  folder: 'Folder scan',
  link: 'Link check',
  password: 'Password check',
  browser: 'Browser check',
};
const HISTORY_UNIT: Record<HistoryRow['kind'], string> = {
  files: 'file',
  folder: 'file',
  link: 'link',
  password: 'password',
  browser: 'check',
};

/* ── real local checks (run in this browser) ─────────────────────────── */
function parseUA() {
  const ua = navigator.userAgent || '';
  const pick = (re: RegExp) => {
    const m = ua.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };
  let name = 'Browser',
    major = null,
    v;
  if ((v = pick(/Edg\/(\d+)/)) != null) {
    name = 'Edge';
    major = v;
  } else if ((v = pick(/OPR\/(\d+)/)) != null) {
    name = 'Opera';
    major = v;
  } else if ((v = pick(/Chrome\/(\d+)/)) != null) {
    name = 'Chrome';
    major = v;
  } else if ((v = pick(/Firefox\/(\d+)/)) != null) {
    name = 'Firefox';
    major = v;
  } else if ((v = pick(/Version\/(\d+).+Safari/)) != null) {
    name = 'Safari';
    major = v;
  }
  return { name, major };
}
// Floors current as of FLOORS_STAMP above — bump alongside it.
const BROWSER_FLOOR: Record<string, number> = {
  Chrome: 132,
  Edge: 132,
  Firefox: 133,
  Safari: 18,
  Opera: 117,
};

/**
 * How many browser facts the two self-checks actually examine: browser build,
 * secure context, three permission grants, and the tracking opt-out signal.
 * This is a REAL count reported in History — the old build put a random number
 * there to make the scan look substantial.
 */
const BROWSER_CHECK_COUNT = 6;

async function runSystemChecks(): Promise<Finding[]> {
  const out: Finding[] = [];
  const { name, major } = parseUA();
  if (major != null && BROWSER_FLOOR[name] && major < BROWSER_FLOOR[name]) {
    out.push({
      surface: 'system',
      sev: 'high',
      title: `${name} ${major} is out of date`,
      path: 'this browser',
      detail: `Definitions floor is ${name} ${BROWSER_FLOOR[name]}. Old browsers miss patched security holes — update from the browser's own menu.`,
    });
  }
  if (!window.isSecureContext) {
    out.push({
      surface: 'system',
      sev: 'medium',
      title: 'Page not in a secure context',
      path: window.location.origin,
      detail:
        'This page is running without HTTPS guarantees; treat forms and downloads here with care.',
    });
  }
  return out;
}
async function runPrivacyChecks(): Promise<Finding[]> {
  const out: Finding[] = [];
  try {
    if (navigator.permissions) {
      const granted = [];
      for (const n of ['geolocation', 'camera', 'microphone']) {
        try {
          const st = await navigator.permissions.query({ name: n as PermissionName });
          if (st.state === 'granted') granted.push(n);
        } catch {
          /* unsupported name */
        }
      }
      if (granted.length) {
        out.push({
          surface: 'privacy',
          sev: 'medium',
          title: `Site holds ${granted.join(' + ')} access`,
          path: window.location.hostname || 'this site',
          detail: `This browser has granted this site: ${granted.join(', ')}. Revoke anything you don't remember approving (site settings → permissions).`,
        });
      }
    }
  } catch {
    /* permissions API unavailable */
  }
  const gpc =
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const dnt = navigator.doNotTrack === '1';
  if (!gpc && !dnt) {
    out.push({
      surface: 'privacy',
      sev: 'low',
      title: 'No tracking opt-out signal',
      path: 'browser setting',
      detail:
        'Neither Global Privacy Control nor Do Not Track is on. Turning GPC on tells sites not to sell or share your data.',
    });
  }
  return out;
}

/* ── local file check (real, in-browser; nothing leaves the device) ──── */
const FC_EXEC = new Set(['exe', 'scr', 'com', 'pif', 'msi', 'hta']);
const FC_SCRIPT = new Set(['bat', 'cmd', 'vbs', 'vbe', 'jse', 'wsf', 'ps1']);
const FC_MACRO = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'ppsm']);
const FC_DOUBLE = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|csv|mp3|mp4|zip)\.([a-z0-9]{2,4})$/i;
const FC_LIMIT = 2000;
/** Folder scans stream, so the ceiling is far higher than the hand-pick path.
 *  It still exists, and hitting it is REPORTED — never a silent truncation. */
const FOLDER_LIMIT = 50000;
/** Fingerprints resolved per request; mirrors the rail's own batch size. */
const HASH_BATCH = 100;

/** One file entering the scan. `entry` is present only for a readwrite folder
 *  scan, and its presence is what makes Remove and Quarantine real. */
interface ScanItem {
  file: File;
  relPath: string;
  entry?: FsFileEntry;
}

const fcExt = (name: string) => {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
};
async function fcHeader(file: File): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await file.slice(0, 8).arrayBuffer());
  } catch {
    return null;
  }
}
function fcHeaderKind(b: Uint8Array | null): '' | 'MZ' | 'ELF' | 'PDF' | 'ZIP' {
  if (!b || b.length < 4) return '';
  if (b[0] === 0x4d && b[1] === 0x5a) return 'MZ'; // Windows PE
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'ELF'; // Linux exec
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'PDF'; // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b) return 'ZIP'; // PK — also docx/xlsx/pptx/jar/apk
  return '';
}
async function fcCheckFile(file: File, relPath?: string): Promise<Finding[]> {
  const out: Omit<Finding, 'surface'>[] = [];
  const name = file.name;
  const ext = fcExt(name);
  // A folder walk has no webkitRelativePath, so the caller supplies the path.
  const rel = relPath || file.webkitRelativePath || name;
  if (/[\u202A-\u202E\u2066-\u2069]/.test(name)) {
    out.push({
      sev: 'high',
      title: 'Filename hides its real extension',
      detail: `"${name.replace(/[\u202A-\u202E\u2066-\u2069]/g, '\u2400')}" contains invisible text-direction characters — the trick that makes "annexe.exe" read as "annexe.txt". Treat as hostile until verified.`,
    });
  }
  const dm = FC_DOUBLE.exec(name);
  const dext = dm ? dm[2].toLowerCase() : '';
  if (dm && (FC_EXEC.has(dext) || FC_SCRIPT.has(dext))) {
    out.push({
      sev: 'high',
      title: `Disguised executable: .${dm[1].toLowerCase()}.${dext}`,
      detail: `Named like a ${dm[1].toUpperCase()} but it is really a ${dext.toUpperCase()} — the classic malware delivery disguise. Do not open.`,
    });
  } else if (FC_EXEC.has(ext)) {
    out.push({
      sev: 'medium',
      title: `Executable file (.${ext})`,
      detail:
        'Programs run with your full user rights. Keep it only if you downloaded it yourself from a source you trust.',
    });
  } else if (FC_SCRIPT.has(ext)) {
    out.push({
      sev: 'medium',
      title: `Script file (.${ext})`,
      detail:
        'Scripts execute like programs when double-clicked. Delete it unless you wrote it or expected it.',
    });
  }
  if (FC_MACRO.has(ext)) {
    out.push({
      sev: 'medium',
      title: 'Macro-enabled Office file',
      detail:
        'Macros are the most common malware carrier in documents. Open only if you expected a macro file from this sender.',
    });
  }
  const kind = fcHeaderKind(await fcHeader(file));
  if (kind === 'MZ' && !FC_EXEC.has(ext) && ext !== 'dll') {
    out.push({
      sev: 'critical',
      title: `Hidden Windows program inside .${ext || '?'}`,
      detail:
        'The file header is a Windows executable (MZ) even though the name says otherwise. This is how droppers hide. Do not open — delete it.',
    });
  } else if (kind === 'ELF' && !['', 'bin', 'so', 'elf', 'run'].includes(ext)) {
    out.push({
      sev: 'critical',
      title: `Hidden Linux program inside .${ext || '?'}`,
      detail: 'The file header is an ELF executable despite the name. Do not run it.',
    });
  } else if (ext === 'pdf' && kind && kind !== 'PDF') {
    out.push({
      sev: 'medium',
      title: 'Not actually a PDF inside',
      detail:
        'The header does not match a real PDF. Open it only inside a viewer — never by double-click — until you know what it is.',
    });
  } else if (
    ['docx', 'xlsx', 'pptx', 'zip', 'jar', 'apk'].includes(ext) &&
    kind &&
    kind !== 'ZIP'
  ) {
    out.push({
      sev: 'medium',
      title: `.${ext} with a non-matching header`,
      detail: 'Files of this type are ZIP containers; this one is not. The name may be a disguise.',
    });
  }
  // `noact` is decided by the CALLER: a hand-picked file has no handle and so
  // stays Dismiss-only, while a readwrite folder scan can act for real.
  return out.map((f) => ({ ...f, surface: 'files', path: rel, local: true, noact: true }));
}

/* The DEMO_MODE backend adapter that used to live here is DELETED. Its only
   live behaviour was returning SAMPLE_FINDINGS; the rest was commented-out
   scaffolding for an agent rail that has no near-term agent. The SERVER side of
   that rail (dingleberry_scan_report, the scans/findings tables) is deliberately
   untouched and still waiting — see the file header. */

/* ── hex geometry ────────────────────────────────────────────────────── */
const HIVE = 340,
  C = HIVE / 2,
  R_PETAL = 47,
  R_CENTER = 54;
const D = Math.sqrt(3) * R_PETAL + 15;
function hexPoints(cx: number, cy: number, r: number) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
const PETALS = SURFACES.map((s, i) => {
  const a = (Math.PI / 180) * (30 + 60 * i);
  return { ...s, cx: C + D * Math.cos(a), cy: C + D * Math.sin(a) };
});

const CELL_STROKE: Record<Level, string> = {
  idle: 'var(--border)',
  scanning: 'var(--sec)',
  ok: 'color-mix(in srgb, var(--clear, #16a34a) 55%, var(--border))',
  warn: 'color-mix(in srgb, var(--warn) 60%, var(--border))',
  risk: 'color-mix(in srgb, #dc2626 65%, var(--border))',
  na: 'var(--border)',
};
const CELL_FILL: Record<Level, string> = {
  idle: 'var(--panel-2)',
  scanning: 'color-mix(in srgb, var(--sec) 9%, var(--panel-2))',
  ok: 'color-mix(in srgb, var(--clear, #16a34a) 7%, var(--panel-2))',
  warn: 'color-mix(in srgb, var(--warn) 8%, var(--panel-2))',
  risk: 'color-mix(in srgb, #dc2626 10%, var(--panel-2))',
  na: 'var(--bg)',
};
/**
 * The centre word. `ok` deliberately reads CHECKED, never PROTECTED — this page
 * can report what it looked at and nothing more. Claiming a device is protected
 * on the strength of five browser-side checks would be the same lie as a false
 * "clean", just louder.
 */
const POSTURE: Record<Level, { word: string; sub: string; color: string }> = {
  idle: { word: 'UNKNOWN', sub: 'nothing checked yet', color: 'var(--text-dim)' },
  scanning: { word: 'CHECKING', sub: '', color: 'var(--sec)' },
  ok: { word: 'CHECKED', sub: 'nothing found so far', color: 'var(--clear, #16a34a)' },
  warn: { word: 'ATTENTION', sub: 'review findings', color: 'var(--warn)' },
  risk: { word: 'AT RISK', sub: 'act on findings', color: '#dc2626' },
  na: { word: 'UNKNOWN', sub: 'nothing checked yet', color: 'var(--text-dim)' },
};
const SEV_STYLE: Record<Severity, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: 'color-mix(in srgb, #dc2626 18%, var(--panel-2))' },
  high: { color: '#f97316', bg: 'color-mix(in srgb, #f97316 16%, var(--panel-2))' },
  medium: { color: 'var(--warn)', bg: 'color-mix(in srgb, var(--warn) 14%, var(--panel-2))' },
  low: { color: 'var(--text-dim)', bg: 'var(--panel-2)' },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let uid = 1;

/* ── component ───────────────────────────────────────────────────────── */
export function SecurityPage() {
  const [surfaceStatus, setSurfaceStatus] = useState<Record<SurfaceId, Level>>(
    () =>
      Object.fromEntries(
        // The deep-scan cell starts — and stays — `na`. It is never scanned,
        // never has findings, and is excluded from the posture reading.
        SURFACES.map((s) => [s.id, s.id === UNAVAILABLE ? 'na' : 'idle']),
      ) as Record<SurfaceId, Level>,
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [quarantine, setQuarantine] = useState<Finding[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('surfaces');
  const [confirming, setConfirming] = useState<number | null>(null); // finding id awaiting destructive confirm
  // ---- LINKS ----------------------------------------------------------
  const [urlInput, setUrlInput] = useState('');
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlResult, setUrlResult] = useState<
    | { kind: 'invalid' }
    | { kind: 'malicious'; v: UrlVerdict }
    | { kind: 'unknown'; url: string }
    | { kind: 'degraded' }
    | null
  >(null);
  // ---- PASSWORDS ------------------------------------------------------
  const [pwInput, setPwInput] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwResult, setPwResult] = useState<
    { kind: 'pwned'; count: number } | { kind: 'unlisted' } | null
  >(null);
  const stopRef = useRef(false);
  const allowedRef = useRef<Set<string>>(new Set());
  const [fcStatus, setFcStatus] = useState<FcStatus>(null);
  const [fcDrag, setFcDrag] = useState(false);
  // Folder picking is detected BEHAVIOURALLY, never by property sniffing:
  // `'webkitdirectory' in input` returns true on Android Chrome even where
  // selecting a folder is impossible, so the property is a liar. The honest
  // signal is a change event that yields zero files. null = not yet tried.
  const [folderWorks, setFolderWorks] = useState<boolean | null>(null);
  const fcFilesRef = useRef<HTMLInputElement | null>(null);
  const fcFolderRef = useRef<HTMLInputElement | null>(null);
  // ---- FRONT29: real folder access ------------------------------------
  // `fsAvailable` starts as the capability check and is demoted to false the
  // first time the picker fails for anything other than a user cancel, so the
  // control disappears instead of failing twice.
  const [fsAvailable, setFsAvailable] = useState<boolean>(() => folderPickerAvailable());
  const [fsRoot, setFsRoot] = useState<FsDirHandle | null>(null);
  // FRONT33: no `fsWritable` state any more. Write is not held after a scan and
  // is not meant to be; whether it is currently granted is asked at the moment
  // of the action via ensureWritable(), which is the only moment it matters.
  const [skips, setSkips] = useState<WalkSkip[]>([]);
  const [showSkips, setShowSkips] = useState(false);
  const [actNotes, setActNotes] = useState<Record<number, ActNote>>({});
  const [acting, setActing] = useState<number | null>(null);
  // Skips are collected in a ref because the walk fills them while React is
  // mid-render; the state copy is published once the scan settles.
  const skipRef = useRef<WalkSkip[]>([]);

  /**
   * Posture derives from REAL checks only.
   *
   * The `deep` cell is filtered out before anything is decided, so a permanently
   * unavailable surface can never drag the reading to a false ATTENTION — and
   * equally can never be counted as a pass. Nothing checked yet means UNKNOWN,
   * not "protected".
   */
  const posture = useMemo<Level>(() => {
    if (scanning) return 'scanning';
    const st = SURFACES.filter((s) => s.id !== UNAVAILABLE).map((s) => surfaceStatus[s.id]);
    if (st.includes('risk')) return 'risk';
    if (st.includes('warn')) return 'warn';
    if (st.includes('ok')) return 'ok';
    return 'idle';
  }, [surfaceStatus, scanning]);

  const levelFor = (id: SurfaceId, list: Finding[]): Level => {
    const f = list.filter((x) => x.surface === id);
    if (f.some((x) => x.sev === 'critical' || x.sev === 'high')) return 'risk';
    // ANY finding means the cell must not read "nothing found". The old ladder
    // let a `low` fall through to the all-clear state, so a surface could report
    // NOTHING FOUND while a finding of its own sat in the Threats tab. `ok` is
    // reserved for a check that ran and genuinely produced nothing.
    if (f.length > 0) return 'warn';
    return 'ok';
  };

  /** Record a real check in History. Only ever called after something ran. */
  const recordRun = (kind: HistoryRow['kind'], items: number, list: Finding[]) => {
    const now = new Date();
    setLastScan(now);
    const bad = list.filter((f) => f.sev === 'critical' || f.sev === 'high').length;
    setHistory((h) => [{ at: now, kind, items, found: list.length, bad }, ...h].slice(0, 50));
  };

  /**
   * PRIVACY + SYSTEM — the two checks the browser can run on itself.
   *
   * There is no artificial delay and no invented item count: these enumerate a
   * fixed, small set of real browser facts and finish immediately. The old build
   * padded them with fake filenames and a random item counter to look busy.
   */
  async function runBrowserChecks() {
    if (scanning) return;
    setScanning(true);
    setSurfaceStatus((p) => ({ ...p, privacy: 'scanning', system: 'scanning' }));

    const [sys, priv] = await Promise.all([runSystemChecks(), runPrivacyChecks()]);
    const fresh = [...sys, ...priv]
      .filter((f) => !allowedRef.current.has(f.title))
      .map((f) => ({ ...f, id: uid++ }));

    const working = [
      ...findings.filter((f) => f.surface !== 'privacy' && f.surface !== 'system'),
      ...fresh,
    ];
    setFindings(working);
    setSurfaceStatus((p) => ({
      ...p,
      privacy: levelFor('privacy', working),
      system: levelFor('system', working),
    }));
    setScanning(false);
    // Item count is the number of browser facts examined, and it is exact.
    recordRun('browser', BROWSER_CHECK_COUNT, working);
  }

  /** LINKS — check one pasted link against DB38's rail. */
  async function runUrlCheck() {
    if (urlBusy) return;
    const url = coerceUrl(urlInput);
    if (!url) {
      setUrlResult({ kind: 'invalid' });
      return;
    }

    setUrlBusy(true);
    setUrlResult(null);
    // Remember where the cell was, so a failed lookup can put it back exactly.
    const prevLinks = surfaceStatus.links;
    setSurfaceStatus((p) => ({ ...p, links: 'scanning' }));

    const outcome = await lookupUrls([url]);
    const v = outcome.results[0];
    setUrlBusy(false);

    // Degraded FIRST: a failed lookup must never be rendered as a no-match, and
    // must never move the surface off its previous state — in EITHER direction.
    // Restoring `prevLinks` matters most when an earlier check already found
    // something: dropping back to "not checked" would quietly hide a live
    // finding that is still sitting in the Threats tab.
    if (outcome.degraded || !v) {
      setUrlResult({ kind: 'degraded' });
      setSurfaceStatus((p) => ({ ...p, links: prevLinks }));
      return;
    }

    if (v.verdict === 'malicious') {
      setUrlResult({ kind: 'malicious', v });
      const working = [
        // Re-checking the same link replaces its finding rather than stacking a
        // duplicate. Checking twice is a normal thing to do and must not inflate
        // the count — an inflated threat count is its own small lie.
        ...findings.filter((f) => !(f.surface === 'links' && f.path === v.url)),
        {
          id: uid++,
          surface: 'links' as SurfaceId,
          sev: 'critical' as Severity,
          title: urlFindingTitle(v),
          detail: urlFindingDetail(v),
          path: v.url,
          local: true,
          noact: true,
        },
      ];
      setFindings(working);
      setSurfaceStatus((p) => ({ ...p, links: levelFor('links', working) }));
      recordRun('link', 1, working);
      return;
    }

    setUrlResult({ kind: 'unknown', url: v.url });
    setSurfaceStatus((p) => ({ ...p, links: levelFor('links', findings) }));
    recordRun('link', 1, findings);
  }

  /**
   * PASSWORDS — HIBP k-anonymity via the FRONT25 helper.
   *
   * The password is hashed in this browser and only the first five hex
   * characters of the digest are sent. NOTHING is stored: the input is cleared
   * on success, no finding carries the password, and no history row names it.
   */
  async function runPasswordCheck() {
    if (pwBusy || !pwInput) return;
    setPwBusy(true);
    setPwResult(null);
    setSurfaceStatus((p) => ({ ...p, passwords: 'scanning' }));

    const { pwned, count } = await isPwnedPassword(pwInput);
    setPwBusy(false);
    setPwInput(''); // never keep it around

    if (pwned) {
      setPwResult({ kind: 'pwned', count });
      const working = [
        ...findings.filter((f) => f.surface !== 'passwords'),
        {
          id: uid++,
          surface: 'passwords' as SurfaceId,
          sev: 'high' as Severity,
          title: 'Password found in a known breach',
          detail: `${PWNED_PASSWORD_MESSAGE} It has been seen ${count.toLocaleString()} time${count === 1 ? '' : 's'} in breach corpora, which means it is already in the word lists attackers try first. Change it anywhere you have used it. The password itself was never sent and is not stored here.`,
          local: true,
          noact: true,
        },
      ];
      setFindings(working);
      setSurfaceStatus((p) => ({ ...p, passwords: levelFor('passwords', working) }));
      recordRun('password', 1, working);
      return;
    }

    // The helper fails OPEN, so `pwned:false` can also mean "could not check".
    // It is worded as "not found in the breach lists we could check" for exactly
    // that reason — never "safe", never "strong".
    setPwResult({ kind: 'unlisted' });
    const working = findings.filter((f) => f.surface !== 'passwords');
    setFindings(working);
    setSurfaceStatus((p) => ({ ...p, passwords: levelFor('passwords', working) }));
    recordRun('password', 1, working);
  }

  /**
   * The one scan pipeline, fed by either entry point.
   *
   * STREAMING is the point: a real folder holds tens of thousands of files, so
   * items arrive one at a time and fingerprints are resolved in batches of
   * HASH_BATCH rather than accumulating the whole tree first. Stop is checked
   * every item, so it takes effect mid-walk instead of at the end.
   */
  async function runScanStream(
    source: AsyncIterable<ScanItem>,
    meta: { folder?: string; cap: number },
  ) {
    stopRef.current = false;
    setScanning(true);
    setActNotes({});
    let working = findings.filter((f) => !f.local); // re-checks replace, not stack
    setFindings(working);

    let seen = 0;
    let checked = 0;
    let flagged = 0;
    let hashed = 0;
    let oversize = 0;
    let matched = 0;
    let degraded = false;
    let capped = false;
    let batch: { item: ScanItem; hash: string }[] = [];

    // Resolve one batch of fingerprints and turn every 'malicious' verdict into
    // a real critical finding. A folder-scan item carries its handle, which is
    // what makes Remove and Quarantine act on disk rather than on a list.
    const flush = async () => {
      if (!batch.length) return;
      setFcStatus({
        phase: 'run',
        text: `Checking ${batch.length} fingerprint${batch.length === 1 ? '' : 's'} against the malware database…`,
      });
      await sleep(0);
      const outcome: LookupOutcome = await lookupHashes(batch.map((b) => b.hash));
      if (outcome.degraded) degraded = true;
      for (const b of batch) {
        const v = outcome.byHash.get(b.hash);
        if (!v || v.verdict !== 'malicious') continue;
        matched++;
        working = [
          ...working,
          {
            id: uid++,
            surface: 'files',
            sev: 'critical',
            title: malwareTitle(v),
            detail: malwareDetail(b.item.file.name, v),
            path: b.item.relPath,
            local: true,
            noact: !b.item.entry,
            fsEntry: b.item.entry,
          },
        ];
      }
      setFindings(working);
      batch = [];
    };

    for await (const item of source) {
      if (stopRef.current) break;
      if (checked >= meta.cap) {
        capped = true;
        break;
      }
      seen++;
      if (seen === 1 || seen % 20 === 0) {
        setFcStatus({ phase: 'run', text: `Checked ${checked} of ${seen} seen — ${item.relPath}` });
        await sleep(0);
      }

      // Structural checks AND a fingerprint. Both signals matter, so the hash
      // is taken in addition to the heuristics, never instead of them.
      const found = await fcCheckFile(item.file, item.relPath);
      for (const f of found) {
        working = [...working, { ...f, id: uid++, noact: !item.entry, fsEntry: item.entry }];
        flagged++;
      }
      checked++;

      const h = await sha256File(item.file);
      if (h) {
        hashed++;
        batch.push({ item, hash: h });
        if (batch.length >= HASH_BATCH) await flush();
      } else if (item.file.size > MAX_HASH_BYTES) {
        oversize++;
      }
    }
    await flush();

    setFindings(working);
    setSurfaceStatus((p) => {
      const next = levelFor('files', working);
      // A degraded lookup must NEVER paint this surface as checked-and-nothing-
      // found. That is the false clean this whole surface exists to prevent — if
      // the database could not be reached, the honest answer is the status quo.
      if (degraded && next === 'ok') return p;
      return flagged || matched || p.files !== 'idle' ? { ...p, files: next } : p;
    });
    setFcStatus({
      phase: 'done',
      checked,
      flagged,
      capped,
      hashed,
      matched,
      oversize,
      degraded,
      skipped: skipRef.current.length,
      stopped: stopRef.current,
      folder: meta.folder,
    });
    setScanning(false);
    stopRef.current = false;
    // History gets the TRUE number of files examined by this run.
    recordRun(meta.folder ? 'folder' : 'files', checked, working);
  }

  /** File-pick / drag-drop path. No handles, so actions stay Dismiss-only. */
  async function runFileCheck(fileList: FileList) {
    if (scanning) return;
    // Read length up front: the input is cleared on change, and this function
    // awaits, so `fileList.length` is not safe to read later.
    const files = Array.from(fileList);
    if (!files.length) return;
    skipRef.current = [];
    setSkips([]);
    async function* stream(): AsyncGenerator<ScanItem> {
      for (const file of files) {
        yield { file, relPath: file.webkitRelativePath || file.name };
      }
    }
    await runScanStream(stream(), { cap: FC_LIMIT });
  }

  /**
   * Folder path (Chromium desktop). Walks the granted directory, streaming.
   * Everything the walk cannot read is COUNTED and listed — a scan that
   * silently skips files reports a smaller, prettier, wrong number.
   */
  async function runFolderScan() {
    if (scanning) return;
    let picked: Awaited<ReturnType<typeof pickDirectory>>;
    try {
      picked = await pickDirectory();
    } catch {
      // The picker exists but this environment refuses it — demote to the
      // file-input fallback rather than leaving a control that cannot work.
      setFsAvailable(false);
      return;
    }
    if (!picked) return; // Bee cancelled; capability is fine.

    setFsRoot(picked.root);
    skipRef.current = [];
    setSkips([]);
    setShowSkips(false);

    const source = walkDirectory(
      picked.root,
      () => stopRef.current,
      (s) => {
        skipRef.current = [...skipRef.current, s];
      },
    );
    async function* stream(): AsyncGenerator<ScanItem> {
      for await (const e of source) {
        // FRONT33: every folder-scan finding carries its handle, whether or not
        // write is held yet. Write is requested at the moment the Bee clicks an
        // action, not at pick time — so the handle is what makes that upgrade
        // possible later, and withholding it here would disable actions that
        // are in fact one prompt away.
        yield { file: e.file, relPath: e.relPath, entry: e };
      }
    }
    await runScanStream(stream(), { folder: picked.root.name, cap: FOLDER_LIMIT });
    setSkips(skipRef.current);
  }

  function afterAction(surfaceId: SurfaceId, nextFindings: Finding[]) {
    setSurfaceStatus((p) =>
      p[surfaceId] === 'idle' ? p : { ...p, [surfaceId]: levelFor(surfaceId, nextFindings) },
    );
  }
  const note = (id: number, ok: boolean, text: string) =>
    setActNotes((n) => ({ ...n, [id]: { ok, text } }));

  /**
   * FRONT33 — the second stage of the two-stage permission.
   *
   * The scan held READ only. The moment the Bee actually chooses to change
   * something on disk, ask for write — inside this click, which is the
   * transient activation the API requires. An already-granted handle is not
   * re-prompted, so the second Remove in a session is silent.
   *
   * A refusal is an ordinary answer, not an error: the finding stays, with its
   * detail intact and its path shown, so the Bee can deal with the file
   * themselves. No dialog, no dead end, nothing thrown at the console.
   */
  async function claimWrite(f: Finding): Promise<boolean> {
    if (!fsRoot) return false;
    const grant = await ensureWritable(fsRoot);
    if (grant === 'granted') {
      return true;
    }
    note(
      f.id!,
      false,
      grant === 'denied'
        ? `Permission to change files was declined, so nothing was touched. The file is still at ${f.path ?? 'the path above'} if you want to handle it yourself.`
        : `This browser would not grant permission to change files, so nothing was touched. The file is still at ${f.path ?? 'the path above'}.`,
    );
    return false;
  }

  /**
   * Quarantine — real, and honestly bounded.
   *
   * A browser has no sandbox to put a file in, so this does the containment it
   * CAN do: move the file into <folder>/Quarantine/ and append .quarantined so
   * it cannot be launched by double-click. The UI says exactly that. The file
   * is moved, never copied-and-left, and the original is deleted only after the
   * copy is verified — so a failure loses nothing.
   */
  async function actQuarantine(f: Finding) {
    if (!f.fsEntry || !fsRoot) return;
    if (!(await claimWrite(f))) return;
    setActing(f.id!);
    const res = await quarantineFile(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) {
      note(f.id!, false, res.error ?? 'Quarantine failed.');
      return;
    }
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next);
    setQuarantine((q) => [{ ...f, qAt: new Date() }, ...q]);
    afterAction(f.surface, next);
  }

  /** Remove — deletes from disk, then proves it is gone before saying so. */
  async function actRemove(f: Finding) {
    if (confirming !== f.id) {
      setConfirming(f.id!);
      setTimeout(() => setConfirming((c) => (c === f.id ? null : c)), 3500);
      return;
    }
    setConfirming(null);
    if (!f.fsEntry) return;
    if (!(await claimWrite(f))) return;
    setActing(f.id!);
    const res = await removeFile(f.fsEntry);
    setActing(null);
    if (!res.ok) {
      note(f.id!, false, res.error ?? 'Remove failed.');
      return;
    }
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next);
    afterAction(f.surface, next);
  }
  function actAllow(f: Finding) {
    // Dismiss is local only — it suppresses this title for the rest of the
    // session. There is no server rail to record it against.
    allowedRef.current.add(f.title);
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next);
    afterAction(f.surface, next);
  }
  /** Restore — moves the file back out of Quarantine to where it came from. */
  async function actRestore(f: Finding) {
    if (!f.fsEntry || !fsRoot) return;
    if (!(await claimWrite(f))) return;
    setActing(f.id!);
    const res = await restoreFile(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) {
      note(f.id!, false, res.error ?? 'Restore failed.');
      return;
    }
    setQuarantine((q) => q.filter((x) => x.id !== f.id));
    const next = [f, ...findings];
    setFindings(next);
    afterAction(f.surface, next);
    if (res.error) note(f.id!, false, res.error); // restored, with a caveat
  }

  /** Delete forever — removes the quarantined copy from disk. */
  async function actPurge(f: Finding) {
    if (confirming !== f.id) {
      setConfirming(f.id!);
      setTimeout(() => setConfirming((c) => (c === f.id ? null : c)), 3500);
      return;
    }
    setConfirming(null);
    if (!f.fsEntry || !fsRoot) return;
    if (!(await claimWrite(f))) return;
    setActing(f.id!);
    const res = await purgeQuarantined(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) {
      note(f.id!, false, res.error ?? 'Delete failed.');
      return;
    }
    setQuarantine((q) => q.filter((x) => x.id !== f.id));
  }

  const sortedFindings = useMemo(
    () => [...findings].sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]),
    [findings],
  );
  const hot = findings.some((f) => f.sev === 'critical' || f.sev === 'high');
  const fmtWhen = (d: Date) =>
    d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    // Full-bleed dark center column. Security keeps its console skin inside the
    // white community shell (owner ruling 2026-08-08) — the dark owns the whole
    // content column so the boundary reads as intentional, with no white gaps
    // inside it and no dark bleed past it onto the shell chrome. --clear is
    // pinned here rather than left to each call site's var() fallback.
    <div
      className="min-h-full w-full bg-[var(--bg)] text-text"
      style={
        {
          '--sec': '#58a6ff',
          '--sec-deep': '#1f6feb',
          '--warn': '#f59e0b',
          '--clear': '#16a34a',
        } as CSSProperties
      }
    >
      <div className="mx-auto max-w-[760px] px-4 pt-5 pb-24">
        <div
          className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-muted)' }}
        >
          <b style={{ color: '#dc2626' }}>SECURITY</b> · IN YOUR BROWSER
        </div>
        <h1 className="m-0 text-[28px] font-bold tracking-tight">Security</h1>
        {/* Said once, plainly, at the top. This is the honest boundary of the
          whole page and it is never softened further down. */}
        <p className="mb-6 mt-1 text-sm leading-relaxed text-text-dim">
          This page checks <b className="text-text-silver-bright">what you hand it</b> — files, a
          link, a password — and{' '}
          <b className="text-text-silver-bright">what the browser can see about itself</b>. It
          cannot see the rest of your device, and it never runs in the background. Nothing here is a
          guess: every result comes from a check that actually ran.
        </p>

        {/* hex posture flower */}
        <div className="mb-2 flex justify-center">
          <svg
            viewBox={`0 0 ${HIVE} ${HIVE}`}
            role="img"
            aria-label="Browser security check status"
            className="block h-auto w-[min(340px,86vw)]"
          >
            {PETALS.map((s) => {
              const st = surfaceStatus[s.id];
              const na = s.id === UNAVAILABLE;
              return (
                /* The unavailable cell is drawn dashed and faded so it reads as
                 "not part of this" rather than "not yet run". It carries no
                 status colour and never animates. */
                <g key={s.id} style={na ? { opacity: 0.45 } : undefined}>
                  <polygon
                    points={hexPoints(s.cx, s.cy, R_PETAL)}
                    strokeDasharray={na ? '3 3' : undefined}
                    style={{
                      fill: CELL_FILL[st],
                      stroke: CELL_STROKE[st],
                      strokeWidth: 1.5,
                      transition: 'fill .5s, stroke .5s',
                    }}
                  >
                    {st === 'scanning' && (
                      <animate
                        attributeName="stroke-width"
                        values="1.5;3;1.5"
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                    )}
                  </polygon>
                  <text
                    x={s.cx}
                    y={s.cy - 2}
                    textAnchor="middle"
                    style={{
                      fill: st === 'ok' ? 'var(--clear, #16a34a)' : 'var(--text-silver)',
                      fontSize: 15,
                    }}
                  >
                    {s.glyph}
                  </text>
                  <text
                    x={s.cx}
                    y={s.cy + 15}
                    textAnchor="middle"
                    className="font-mono uppercase"
                    style={{ fill: 'var(--text-dim)', fontSize: 9.5, letterSpacing: '.06em' }}
                  >
                    {na ? 'DEEP' : s.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
            <polygon
              points={hexPoints(C, C, R_CENTER)}
              style={{ fill: 'var(--panel-2)', stroke: 'var(--border)', strokeWidth: 1.5 }}
            />
            <text
              x={C}
              y={C + 1}
              textAnchor="middle"
              className="font-mono font-semibold uppercase"
              style={{ fill: POSTURE[posture].color, fontSize: 13, letterSpacing: '.12em' }}
            >
              {POSTURE[posture].word}
            </text>
            <text
              x={C}
              y={C + 18}
              textAnchor="middle"
              className="font-mono"
              style={{ fill: 'var(--text-muted)', fontSize: 9.5, letterSpacing: '.06em' }}
            >
              {POSTURE[posture].sub}
            </text>
          </svg>
        </div>

        {/* The only whole-page action left. There is no "Quick / Deep / Custom
          scan" any more: those ran a timed animation over invented filenames and
          a random item counter, then displayed sample findings. This button runs
          the two checks the browser can genuinely perform on itself, and returns
          immediately because that is how long they actually take. */}
        <div className="mb-6 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              void runBrowserChecks();
            }}
            disabled={scanning}
            className="rounded-xl px-[18px] py-[11px] text-sm font-semibold disabled:opacity-45"
            style={{ background: 'var(--sec-deep)', color: '#fff' }}
          >
            Check this browser
            <small className="block font-mono text-[10px] font-normal tracking-[0.05em] opacity-75">
              privacy + system · instant
            </small>
          </button>
        </div>

        {/* tabs */}
        <div
          className="mb-4 flex gap-1 overflow-x-auto border-b"
          style={{ borderColor: 'var(--border)' }}
          role="tablist"
          aria-label="Security views"
        >
          {(
            [
              ['surfaces', 'Surfaces'],
              ['threats', 'Threats'],
              ['quarantine', 'Quarantine'],
              ['history', 'History'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold"
              style={{
                color: tab === id ? 'var(--text)' : 'var(--text-dim)',
                borderColor: tab === id ? 'var(--sec)' : 'transparent',
              }}
            >
              {label}
              {id === 'threats' && (
                <span
                  className="ml-1.5 rounded-full border px-1.5 py-px font-mono text-[10.5px]"
                  style={{
                    background: 'var(--panel-2)',
                    borderColor: hot
                      ? 'color-mix(in srgb, #dc2626 55%, var(--border))'
                      : 'var(--border)',
                    color: hot ? '#dc2626' : 'var(--text-dim)',
                  }}
                >
                  {findings.length}
                </span>
              )}
              {id === 'quarantine' && (
                <span
                  className="ml-1.5 rounded-full border px-1.5 py-px font-mono text-[10.5px]"
                  style={{
                    background: 'var(--panel-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-dim)',
                  }}
                >
                  {quarantine.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* SURFACES */}
        {tab === 'surfaces' && (
          <section>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SURFACES.map((s) => {
                const st = surfaceStatus[s.id];
                const n = findings.filter((f) => f.surface === s.id).length;
                const na = s.id === UNAVAILABLE;
                const statusTxt = na
                  ? 'NOT POSSIBLE IN A BROWSER'
                  : st === 'idle'
                    ? 'NOT CHECKED'
                    : st === 'scanning'
                      ? 'CHECKING…'
                      : st === 'ok'
                        ? 'CHECKED · NOTHING FOUND'
                        : st === 'warn'
                          ? `${n} TO REVIEW`
                          : `${n} FINDING${n === 1 ? '' : 'S'}`;
                const statusColor = na
                  ? 'var(--text-muted)'
                  : {
                      idle: 'var(--text-muted)',
                      scanning: 'var(--sec)',
                      ok: 'var(--clear, #16a34a)',
                      warn: 'var(--warn)',
                      risk: '#dc2626',
                      na: 'var(--text-muted)',
                    }[st];
                return (
                  /* The deep-scan cell is dimmed and inert: no counts, no badge,
                   nothing clickable. A truthful placeholder, not a teaser. */
                  <div
                    key={s.id}
                    className="flex flex-col gap-1.5 rounded-2xl border p-3.5"
                    style={{
                      background: na ? 'var(--bg)' : 'var(--panel)',
                      borderColor: 'var(--border)',
                      borderStyle: na ? 'dashed' : 'solid',
                      opacity: na ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: na ? 'var(--text-dim)' : 'var(--text-silver-bright)' }}
                      >
                        {s.name}
                      </span>
                      {na ? (
                        <span
                          className="flex-none rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          NEEDS AN APP
                        </span>
                      ) : (
                        <span
                          className="flex-none rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
                          style={{
                            borderColor:
                              'color-mix(in srgb, var(--clear, #16a34a) 45%, var(--border))',
                            color: 'var(--clear, #16a34a)',
                          }}
                        >
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-[12.5px] leading-relaxed text-text-dim">
                      {s.desc}
                    </div>
                    <div
                      className="font-mono text-[11px] tracking-[0.05em]"
                      style={{ color: statusColor }}
                    >
                      {statusTxt}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── LINKS ─────────────────────────────────────────────────── */}
            <div
              className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Check a link · before you open it
            </div>
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--panel)', borderColor: 'var(--border-bright)' }}
            >
              <p className="mb-3 mt-0 text-[12.5px] leading-relaxed text-text-dim">
                Paste a link someone sent you. It is checked against a feed of addresses seen
                distributing malware.{' '}
                <b className="font-semibold text-text-silver-bright">Only the address is sent</b> —
                the page is never opened, and nothing about you goes with it.
              </p>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runUrlCheck();
                }}
              >
                <input
                  type="url"
                  inputMode="url"
                  value={urlInput}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlResult(null);
                  }}
                  placeholder="https://example.com/login"
                  aria-label="Link to check"
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-[12.5px] text-text"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                />
                <button
                  type="submit"
                  disabled={urlBusy || !urlInput.trim()}
                  className="rounded-lg border px-3 py-2 text-[12.5px] font-semibold disabled:opacity-45"
                  style={{
                    background: 'var(--sec-deep)',
                    borderColor: 'var(--sec-deep)',
                    color: '#fff',
                  }}
                >
                  {urlBusy ? 'Checking…' : 'Check link'}
                </button>
              </form>
              {urlResult && (
                <div className="mt-3 text-[12.5px] leading-relaxed" aria-live="polite">
                  {urlResult.kind === 'invalid' && (
                    <span style={{ color: 'var(--warn)' }}>
                      That does not look like a web address. Paste the whole link, including
                      https://
                    </span>
                  )}
                  {urlResult.kind === 'malicious' && (
                    <b style={{ color: '#dc2626' }}>
                      On the known-bad list — do not open it. See the Threats tab.
                    </b>
                  )}
                  {/* NEVER "safe", NEVER "clean", NEVER a green tick. Absence from
                    a blocklist is not safety, and this sentence says so. */}
                  {urlResult.kind === 'unknown' && (
                    <span style={{ color: 'var(--text-dim)' }}>
                      <b className="text-text-silver-bright">Not on the known-bad list.</b> That is
                      not the same as safe — most brand-new phishing pages are on no list yet. If
                      you were not expecting this link, still do not open it.
                    </span>
                  )}
                  {urlResult.kind === 'degraded' && (
                    <b style={{ color: 'var(--warn)' }}>
                      Could not check this link — the link database was unreachable. This is not a
                      result.
                    </b>
                  )}
                </div>
              )}
            </div>

            {/* ── PASSWORDS ─────────────────────────────────────────────── */}
            <div
              className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Check a password · against known breaches
            </div>
            <div
              className="rounded-2xl border p-4"
              style={{ background: 'var(--panel)', borderColor: 'var(--border-bright)' }}
            >
              <p className="mb-3 mt-0 text-[12.5px] leading-relaxed text-text-dim">
                Type a password to see whether it already appears in a known data breach.{' '}
                <b className="font-semibold text-text-silver-bright">
                  The password never leaves this device.
                </b>{' '}
                It is scrambled here, and only the first five characters of that scramble are sent —
                never enough to identify the password. Nothing is stored, and the box is cleared the
                moment the check finishes.
              </p>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runPasswordCheck();
                }}
              >
                <input
                  type="password"
                  value={pwInput}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setPwInput(e.target.value);
                    setPwResult(null);
                  }}
                  placeholder="type a password"
                  aria-label="Password to check against known breaches"
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[12.5px] text-text"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                />
                <button
                  type="submit"
                  disabled={pwBusy || !pwInput}
                  className="rounded-lg border px-3 py-2 text-[12.5px] font-semibold disabled:opacity-45"
                  style={{
                    background: 'var(--sec-deep)',
                    borderColor: 'var(--sec-deep)',
                    color: '#fff',
                  }}
                >
                  {pwBusy ? 'Checking…' : 'Check password'}
                </button>
              </form>
              {pwResult && (
                <div className="mt-3 text-[12.5px] leading-relaxed" aria-live="polite">
                  {pwResult.kind === 'pwned' ? (
                    <b style={{ color: '#dc2626' }}>
                      Found in a known breach — seen {pwResult.count.toLocaleString()} time
                      {pwResult.count === 1 ? '' : 's'}. Stop using it anywhere. See the Threats
                      tab.
                    </b>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>
                      <b className="text-text-silver-bright">
                        Not found in the breach lists we could check.
                      </b>{' '}
                      That says nothing about how strong it is, and a password can be breached
                      tomorrow.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div
              className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Local file check · runs in this browser
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setFcDrag(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setFcDrag(true);
              }}
              onDragLeave={() => setFcDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFcDrag(false);
                if (e.dataTransfer?.files?.length) runFileCheck(e.dataTransfer.files);
              }}
              className="rounded-2xl border-[1.5px] border-dashed p-4 transition-colors"
              style={{
                background: fcDrag
                  ? 'color-mix(in srgb, var(--sec) 7%, var(--panel))'
                  : 'var(--panel)',
                borderColor: fcDrag ? 'var(--sec)' : 'var(--border-bright)',
              }}
            >
              <p className="mb-2 mt-0 text-[12.5px] leading-relaxed text-text-dim">
                Drop files here — or pick below. Each file is examined{' '}
                <b className="font-semibold text-text-silver-bright">in this browser</b> for
                disguised executables, double extensions, hidden direction-override characters,
                macro carriers, and headers that don't match the name. Each file is then
                fingerprinted and checked against a known-malware database.
              </p>
              <p className="mb-2 mt-0 text-[12.5px] leading-relaxed text-text-dim">
                <b className="font-semibold text-text-silver-bright">
                  Only a mathematical fingerprint (SHA-256) of each file is sent — never the file,
                  its name, or its contents.
                </b>{' '}
                A fingerprint is one-way: it cannot be turned back into the file it came from.
              </p>
              <p className="mb-3 mt-0 text-[12.5px] leading-relaxed text-text-dim">
                Downloaded an app install file? Check it here before you open it. This page can only
                check files you hand it — it cannot see installed apps, other apps' storage, or
                watch this device in the background.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fcFilesRef.current?.click()}
                  disabled={scanning}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                  style={{
                    background: 'var(--panel-2)',
                    borderColor: 'var(--border-bright)',
                    color: 'var(--text-silver)',
                  }}
                >
                  Pick files
                </button>
                {/* Real folder scan — Chromium desktop only. Hidden entirely where
                  the picker is absent or has already failed, so no dead control
                  is ever shown and the Bee is never asked what platform this is. */}
                {fsAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      void runFolderScan();
                    }}
                    disabled={scanning}
                    className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                    style={{
                      background: 'var(--sec-deep)',
                      borderColor: 'var(--sec-deep)',
                      color: '#fff',
                    }}
                  >
                    Scan a folder
                  </button>
                )}
                {!fsAvailable && folderWorks !== false && (
                  <button
                    onClick={() => fcFolderRef.current?.click()}
                    disabled={scanning}
                    className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                    style={{
                      background: 'var(--panel-2)',
                      borderColor: 'var(--border-bright)',
                      color: 'var(--text-silver)',
                    }}
                  >
                    Pick a folder
                  </button>
                )}
                {scanning && (
                  <button
                    type="button"
                    onClick={() => {
                      stopRef.current = true;
                    }}
                    className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold"
                    style={{
                      background: 'var(--panel-2)',
                      borderColor: 'color-mix(in srgb, #dc2626 60%, var(--border-bright))',
                      color: '#dc2626',
                    }}
                  >
                    Stop
                  </button>
                )}
              </div>
              {fsAvailable && (
                <p className="mb-0 mt-2 text-[12px] leading-relaxed text-text-dim">
                  A folder scan only reads. If something turns up and you choose to remove it, this
                  page asks for permission to change files at that point — not before.
                </p>
              )}
              {/* FRONT33: the old "Opened read-only - Remove and Quarantine are
                not available" warning is gone. Read-only is now the NORMAL state
                after a scan, not a degraded one, and the actions ARE available -
                they ask for permission when used. Warning about the expected
                case would be noise. */}
              {folderWorks === false && (
                <p className="mb-0 mt-2 text-[12px] leading-relaxed text-text-dim">
                  Your browser can't select a whole folder — pick files instead.
                </p>
              )}
              {fcStatus && (
                <div
                  className="mt-3 font-mono text-[11.5px] tracking-[0.03em]"
                  style={{ color: 'var(--text-dim)' }}
                  aria-live="polite"
                >
                  {fcStatus.phase === 'run' ? (
                    fcStatus.text
                  ) : (
                    <>
                      <div>
                        {fcStatus.stopped ? (
                          <b style={{ color: 'var(--warn)' }}>Stopped early — partial scan. </b>
                        ) : null}
                        Checked <b style={{ color: 'var(--text-silver)' }}>{fcStatus.checked}</b>{' '}
                        file{fcStatus.checked === 1 ? '' : 's'}
                        {fcStatus.folder ? (
                          <>
                            {' '}
                            in <b style={{ color: 'var(--text-silver)' }}>{fcStatus.folder}</b>
                          </>
                        ) : null}
                        {fcStatus.skipped > 0 ? (
                          <>
                            , skipped <b style={{ color: 'var(--warn)' }}>{fcStatus.skipped}</b>
                          </>
                        ) : null}{' '}
                        ·{' '}
                        {fcStatus.flagged ? (
                          <b style={{ color: 'var(--warn)' }}>
                            {fcStatus.flagged} risk indicator{fcStatus.flagged === 1 ? '' : 's'} —
                            see the Threats tab
                          </b>
                        ) : (
                          <span>no structural risk indicators</span>
                        )}
                        {fcStatus.capped
                          ? ` · stopped at the ${fcStatus.folder ? FOLDER_LIMIT : FC_LIMIT}-file ceiling`
                          : ''}
                        {fcStatus.oversize
                          ? ` · ${fcStatus.oversize} too large to fingerprint in the browser`
                          : ''}
                      </div>
                      {/* The skipped list is openable, not buried. A scan that
                        hides what it could not read reports a prettier, wrong
                        number and invites false confidence. */}
                      {skips.length > 0 && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => setShowSkips((v) => !v)}
                            className="underline decoration-dotted underline-offset-2"
                            style={{ color: 'var(--warn)' }}
                          >
                            {showSkips ? 'Hide' : 'Show'} the {skips.length} skipped file
                            {skips.length === 1 ? '' : 's'}
                          </button>
                          {showSkips && (
                            <div
                              className="mt-1 max-h-40 overflow-y-auto rounded-lg border px-2 py-1.5"
                              style={{
                                background: 'var(--bg-elevated)',
                                borderColor: 'var(--border)',
                              }}
                            >
                              {skips.map((s) => (
                                <div
                                  key={`${s.reason}:${s.path}`}
                                  className="truncate text-[11px]"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {s.path} —{' '}
                                  {s.reason === 'permission' ? 'permission denied' : 'unreadable'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* The database line is deliberately SEPARATE and never green.
                        "No known-malware match" is not "clean" and must not look
                        like a pass; a degraded lookup must not look like either. */}
                      <div className="mt-1">
                        {fcStatus.matched > 0 && (
                          <b style={{ color: '#dc2626' }}>
                            {fcStatus.matched} known-malware match
                            {fcStatus.matched === 1 ? '' : 'es'} — see the Threats tab
                          </b>
                        )}
                        {fcStatus.degraded ? (
                          <b
                            className={fcStatus.matched > 0 ? 'ml-2' : ''}
                            style={{ color: 'var(--warn)' }}
                          >
                            Could not reach the malware database — structural checks only.
                          </b>
                        ) : fcStatus.matched === 0 && fcStatus.hashed > 0 ? (
                          <span>
                            No known-malware match for {fcStatus.hashed} fingerprint
                            {fcStatus.hashed === 1 ? '' : 's'}.
                          </span>
                        ) : null}
                      </div>
                      {/* The line that keeps a finished scan from reading as a
                        clean bill of health. It is the last thing shown, and it
                        is deliberately unavoidable. */}
                      <div className="mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        This says what was checked, not that this device is clean — it can only see
                        the files you handed it.
                      </div>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fcFilesRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) runFileCheck(e.target.files);
                  e.target.value = '';
                }}
              />
              {/* A change event carrying ZERO files is the Android tell: the picker
                opened and could not return a folder. Cancelling fires `cancel`,
                not `change`, so this does not misfire on a user backing out. */}
              <input
                ref={fcFolderRef}
                type="file"
                {...DIR_PICK_PROPS}
                hidden
                onChange={(e) => {
                  const list = e.target.files;
                  if (list && list.length > 0) {
                    setFolderWorks(true);
                    runFileCheck(list);
                  } else {
                    setFolderWorks(false);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            {/* ── WHAT THIS PAGE CANNOT DO ──────────────────────────────── */}
            {/* The "Real-time shields" block that stood here is DELETED. It was
              four toggles — web shield, ransomware shield, stalkerware watch,
              network guard — permanently disabled behind a NEEDS AGENT label.
              They protected nothing and, with no agent on the roadmap, read as a
              promise rather than a state. What they described is real and worth
              saying, so it is said here as prose that claims nothing. */}
            <div
              className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              What a web page cannot do
            </div>
            <div
              className="rounded-2xl border border-dashed p-4 text-[12.5px] leading-relaxed text-text-dim"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="mb-2 mt-0">
                There is no always-on protection here, and this page does not run when it is closed.
                Blocking bad sites as you browse, guarding folders against ransomware, spotting
                stalkerware, and watching your network all need software installed on the device
                itself.
              </p>
              <p className="mb-0 mt-0">
                That software does not exist yet. When it does, this page will say so — until then
                it will not offer you a switch that does nothing.
              </p>
            </div>
          </section>
        )}

        {/* THREATS */}
        {tab === 'threats' && (
          <section>
            {sortedFindings.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] leading-relaxed text-text-dim"
                style={{ borderColor: 'var(--border)' }}
              >
                {lastScan
                  ? 'Nothing to review from the checks that have run. That covers what was checked — not this whole device.'
                  : 'Nothing checked yet. Hand this page a file, a link, or a password, or check the browser itself.'}
              </div>
            ) : (
              sortedFindings.map((f) => (
                /* Real actions require a real handle. Without one the card offers
               Dismiss only — the old build showed Quarantine and Remove on
               every finding and neither touched the disk. */
                <FindingCard
                  key={f.id}
                  f={f}
                  confirming={confirming === f.id}
                  busy={acting === f.id}
                  note={actNotes[f.id!]}
                  actions={
                    !f.fsEntry
                      ? [{ label: 'Dismiss', onClick: () => actAllow(f) }]
                      : [
                          {
                            label: 'Quarantine',
                            onClick: () => {
                              void actQuarantine(f);
                            },
                          },
                          {
                            label: confirming === f.id ? 'Confirm remove' : 'Remove',
                            danger: true,
                            confirmingNow: confirming === f.id,
                            onClick: () => {
                              void actRemove(f);
                            },
                          },
                          { label: 'Allow', onClick: () => actAllow(f) },
                        ]
                  }
                />
              ))
            )}
          </section>
        )}

        {/* QUARANTINE */}
        {tab === 'quarantine' && (
          <section>
            {quarantine.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] text-text-dim"
                style={{ borderColor: 'var(--border)' }}
              >
                Quarantine is empty. Files you quarantine are moved into a <b>{QUARANTINE_DIR}</b>{' '}
                folder inside the folder you scanned and renamed so they cannot be opened by
                double-click.
              </div>
            ) : (
              quarantine.map((f) => (
                <FindingCard
                  key={f.id}
                  f={f}
                  confirming={confirming === f.id}
                  busy={acting === f.id}
                  note={actNotes[f.id!]}
                  actions={[
                    {
                      label: 'Restore',
                      onClick: () => {
                        void actRestore(f);
                      },
                    },
                    {
                      label: confirming === f.id ? 'Confirm delete' : 'Delete forever',
                      danger: true,
                      confirmingNow: confirming === f.id,
                      onClick: () => {
                        void actPurge(f);
                      },
                    },
                  ]}
                />
              ))
            )}
          </section>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <section>
            {history.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] text-text-dim"
                style={{ borderColor: 'var(--border)' }}
              >
                No scans yet on this device.
              </div>
            ) : (
              history.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline gap-3 border-b px-1 py-2.5 text-[13px]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    className="min-w-[150px] flex-none font-mono text-[11.5px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {fmtWhen(h.at)}
                  </span>
                  <span className="font-semibold text-text-silver">{HISTORY_LABEL[h.kind]}</span>
                  <span className="font-mono text-[11.5px] text-text-dim">
                    {h.items.toLocaleString()} {HISTORY_UNIT[h.kind]}
                    {h.items === 1 ? '' : 's'}
                  </span>
                  {/* "NOTHING FOUND" — never "CLEAR". This row reports one check,
                  not the state of the device. */}
                  <span
                    className="font-mono text-[11.5px]"
                    style={{ color: h.bad ? '#dc2626' : 'var(--text-dim)' }}
                  >
                    {h.bad
                      ? `${h.bad} SERIOUS`
                      : h.found
                        ? `${h.found} TO REVIEW`
                        : 'NOTHING FOUND'}
                  </span>
                </div>
              ))
            )}
          </section>
        )}

        {/* foot line */}
        {/* The old footer advertised "AGENT · NOT CONNECTED" and a DEFINITIONS
          date, both of which implied a product that was about to arrive. What
          is left is true: where the checks run, what the browser-floor stamp
          actually dates, and when something last ran. */}
        <div
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3.5 font-mono text-[10.5px] tracking-[0.05em]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>
            <Dot color="var(--clear, #16a34a)" />
            CHECKS RUN · IN THIS BROWSER
          </span>
          <span>BROWSER FLOORS · {FLOORS_STAMP}</span>
          <span>LAST CHECK · {lastScan ? fmtWhen(lastScan).toUpperCase() : 'NEVER'}</span>
        </div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-[1px]"
      style={{ background: color }}
    />
  );
}

function FindingCard({
  f,
  actions,
  busy,
  note,
}: {
  f: Finding;
  actions: FindingAction[];
  confirming?: boolean;
  /** An action is in flight against the disk — buttons lock so it cannot double-fire. */
  busy?: boolean;
  /** The outcome of the last action on this finding, shown verbatim. */
  note?: ActNote;
}) {
  const sev = SEV_STYLE[f.sev];
  const sname = (SURFACES.find((s) => s.id === f.surface) || {}).name || f.surface;
  return (
    <div
      className="mb-2.5 rounded-2xl border p-3.5"
      style={{
        background: 'var(--panel)',
        borderColor:
          f.sev === 'critical' ? 'color-mix(in srgb, #dc2626 45%, var(--border))' : 'var(--border)',
      }}
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span
          className="flex-none rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em]"
          style={{ background: sev.bg, color: sev.color }}
        >
          {f.sev}
        </span>
        <span className="text-sm font-semibold text-text-silver-bright">{f.title}</span>
        <span
          className="font-mono text-[10.5px] tracking-[0.04em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {sname.toUpperCase()}
        </span>
        {f.local && (
          <span
            className="rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.08em]"
            style={{
              color: 'var(--clear, #16a34a)',
              borderColor: 'color-mix(in srgb, var(--clear, #16a34a) 45%, var(--border))',
            }}
          >
            LOCAL CHECK
          </span>
        )}
      </div>
      <div
        className="my-1.5 text-[12.5px] leading-relaxed text-text-dim"
        style={{ wordBreak: 'break-word' }}
      >
        {f.detail}
      </div>
      {f.path && (
        <div
          className="mb-2.5 inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border px-2 py-1 font-mono text-[11px] text-text-silver"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          {f.path}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
            style={
              a.confirmingNow
                ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' }
                : {
                    background: 'var(--panel-2)',
                    borderColor: a.danger
                      ? 'color-mix(in srgb, #dc2626 45%, var(--border-bright))'
                      : 'var(--border-bright)',
                    color: a.danger ? '#dc2626' : 'var(--text-silver)',
                  }
            }
          >
            {a.label}
          </button>
        ))}
        {busy && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            working…
          </span>
        )}
      </div>
      {/* A failed disk action is reported here, in plain language. Success is
          silent because the card disappears — a failure must never be. */}
      {note && (
        <div
          className="mt-2 rounded-lg border px-2 py-1.5 text-[12px] leading-relaxed"
          style={
            note.ok
              ? {
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-silver)',
                }
              : {
                  background: 'color-mix(in srgb, #dc2626 10%, var(--panel-2))',
                  borderColor: 'color-mix(in srgb, #dc2626 45%, var(--border))',
                  color: '#f87171',
                }
          }
          role={note.ok ? undefined : 'alert'}
        >
          {note.text}
        </div>
      )}
    </div>
  );
}

export default SecurityPage;
