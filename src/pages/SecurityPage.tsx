/**
 * SecurityPage — DingleBERRY device security (user-facing) · themanual.tech/security
 * ---------------------------------------------------------------------------------
 * Drop-in for The Manual's Vite + React + Tailwind app. Uses the app's existing
 * CSS variables (--panel, --border, …) for the dark base, plus Security's own
 * palette defined on the page root: --sec #58a6ff (steel blue · trust/authority),
 * --sec-deep #1f6feb (actions), --warn #f59e0b (amber caution), #dc2626 crimson
 * (critical), #16a34a forest green (protected). Honey stays with Blings — it is
 * not used on this page.
 *
 * ROUTE WIRING (matches your existing lazy pattern):
 *   const SecurityPage = lazy(() => import('./pages/SecurityPage')
 *     .then(e => ({ default: e.SecurityPage })));
 *   <Route path="/security" element={<SecurityPage />} />
 *
 * NAV CHANGE (bottom toolbar → Astra dropdown):
 *   1. Remove the Security item from the bottom-toolbar config array.
 *   2. Ensure the Astra dropdown source includes { slug:'security'|'dingleberry',
 *      label:'Security', route:'/security' }. The astra_registry row already
 *      exists (slug 'dingleberry', default_name 'Security'); if the dropdown is
 *      registry-driven, flipping its status from 'off_grid' to 'active' surfaces it.
 *
 * BACKEND (Supabase) — LIVE. Migration dingleberry_device_v1 is applied:
 * tables dingleberry_devices/scans/findings/events (RLS: bee reads own) and
 * RPCs dingleberry_scan_start / dingleberry_finding_act (authenticated) +
 * dingleberry_scan_report (service_role — the agent rail). See
 * dingleberry-device-schema.sql for the exact applied SQL.
 * DEMO_MODE=true until the agent exists. In demo mode every agent-surface
 * finding is tagged SAMPLE in the UI; local surfaces run real in-browser checks.
 * A web page cannot scan a device's filesystem — real detection comes from the
 * DingleBERRY agent reporting through the backend. Keep the SAMPLE tags until
 * that rail is live; a security page must never present fabricated threats as real.
 */

import {
  type FsDirHandle,
  type FsFileEntry,
  QUARANTINE_DIR,
  type WalkSkip,
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
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

// Nonstandard-but-universal folder-pick attribute; typed once for reuse.
const DIR_PICK_PROPS = { webkitdirectory: '' } as unknown as InputHTMLAttributes<HTMLInputElement>;
// import { supabase } from '@/lib/supabase'; // real path — note: SupabaseClient | null (env-guarded)

const DEMO_MODE = true;

/* ── types ───────────────────────────────────────────────────────────── */
type SurfaceId = 'malware' | 'spyware' | 'pups' | 'network' | 'privacy' | 'system';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Level = 'idle' | 'scanning' | 'clear' | 'warn' | 'risk';
type ScanMode = 'quick' | 'deep' | 'custom';
type Tab = 'surfaces' | 'threats' | 'quarantine' | 'history';

interface SurfaceDef { id: SurfaceId; name: string; glyph: string; desc: string; src: 'agent' | 'local'; }
interface ShieldDef { id: string; name: string; desc: string; agent: boolean; }
export interface Finding {
  id?: number;
  surface: SurfaceId;
  sev: Severity;
  title: string;
  detail: string;
  path?: string;
  sample?: boolean;
  local?: boolean;
  noact?: boolean;
  qAt?: Date;
  /** Set only for findings from a readwrite folder scan — the handle that makes
   *  Remove and Quarantine real. Absent means the action is not offered. */
  fsEntry?: FsFileEntry;
}
/** Outcome of a real filesystem action, shown on the finding it belongs to. */
interface ActNote { ok: boolean; text: string; }
interface HistoryRow { at: Date; mode: ScanMode; items: number; found: number; bad: number; }
interface FindingAction { label: string; danger?: boolean; confirmingNow?: boolean; onClick: () => void; }
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
const SURFACES: SurfaceDef[] = [
  { id: 'malware', name: 'Malware',               glyph: '⬡', desc: 'Viruses, trojans, ransomware, worms.',          src: 'agent' },
  { id: 'spyware', name: 'Spyware & stalkerware', glyph: '◉', desc: 'Keyloggers, screen grabbers, tracking apps.',   src: 'agent' },
  { id: 'pups',    name: 'Adware & PUPs',         glyph: '▤', desc: 'Unwanted programs, hijacked browser settings.', src: 'agent' },
  { id: 'network', name: 'Network',               glyph: '⌁', desc: 'Wi-Fi posture, open ports, DNS integrity.',     src: 'agent' },
  { id: 'privacy', name: 'Privacy',               glyph: '◍', desc: 'Site permissions, tracking signals, exposure.', src: 'local' },
  { id: 'system',  name: 'System integrity',      glyph: '⬢', desc: 'OS and browser patch level, secure context.',   src: 'local' },
];

const SHIELDS: ShieldDef[] = [
  { id: 'web',     name: 'Web shield',        desc: 'Blocks known-bad domains and phishing pages.',  agent: true },
  { id: 'ransom',  name: 'Ransomware shield', desc: 'Guards protected folders against encryption.',  agent: true },
  { id: 'stalker', name: 'Stalkerware watch', desc: 'Alerts on covert tracking and mic/camera use.', agent: true },
  { id: 'netg',    name: 'Network guard',     desc: 'Watches for rogue devices and DNS tampering.',  agent: true },
];

const SAMPLE_FINDINGS: Finding[] = [
  { surface: 'malware', sev: 'critical', title: 'Trojan.Agent.GenKD', path: '~/Downloads/invoice_2026-07.pdf.exe',
    detail: 'Executable disguised as a PDF. Matches a known dropper signature; quarantine before opening anything from this folder.' },
  { surface: 'spyware', sev: 'high', title: 'Stalkerware.TrackView', path: '/apps/system_helper_svc',
    detail: 'Background service reporting location and screen state to a third-party endpoint every 4 minutes.' },
  { surface: 'pups', sev: 'medium', title: 'PUP.SearchHijack.Bree', path: 'browser extension · "Coupon Companion"',
    detail: 'Extension rewrote the default search engine and injects sponsored results.' },
  { surface: 'network', sev: 'medium', title: 'Open port 3389 (RDP)', path: 'this device · inbound',
    detail: 'Remote Desktop is reachable from the local network. Close it if you do not use remote access.' },
];

const DEMO_ITEMS: Record<SurfaceId, string[]> = {
  malware: ['/bin/launchd', '~/Library/Caches/com.app.store', '~/Downloads/invoice_2026-07.pdf.exe', '/usr/lib/dyld', '~/Documents/tax_2025.xlsx'],
  spyware: ['/apps/system_helper_svc', 'com.track.view.daemon', '/private/var/log/keys.db', 'accessibility services registry'],
  pups: ['extension: Coupon Companion', 'extension: Dark Reader', 'default search settings', 'startup items'],
  network: ['port sweep 1-1024', 'port 3389/tcp', 'router 192.168.1.1', 'DNS resolver check'],
  privacy: ['site permission grants', 'tracking opt-out signals', 'cookie posture'],
  system: ['browser build', 'secure context', 'platform report'],
};

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const DEFINITIONS_STAMP = '2026.08.08';

/* ── real local checks (run in this browser) ─────────────────────────── */
function parseUA() {
  const ua = navigator.userAgent || '';
  const pick = (re: RegExp) => { const m = ua.match(re); return m ? parseInt(m[1], 10) : null; };
  let name = 'Browser', major = null, v;
  if ((v = pick(/Edg\/(\d+)/)) != null)                { name = 'Edge'; major = v; }
  else if ((v = pick(/OPR\/(\d+)/)) != null)           { name = 'Opera'; major = v; }
  else if ((v = pick(/Chrome\/(\d+)/)) != null)        { name = 'Chrome'; major = v; }
  else if ((v = pick(/Firefox\/(\d+)/)) != null)       { name = 'Firefox'; major = v; }
  else if ((v = pick(/Version\/(\d+).+Safari/)) != null){ name = 'Safari'; major = v; }
  return { name, major };
}
// Floors current as of the DEFINITIONS_STAMP above — bump alongside it.
const BROWSER_FLOOR: Record<string, number> = { Chrome: 132, Edge: 132, Firefox: 133, Safari: 18, Opera: 117 };

async function runSystemChecks(): Promise<Finding[]> {
  const out: Finding[] = [];
  const { name, major } = parseUA();
  if (major != null && BROWSER_FLOOR[name] && major < BROWSER_FLOOR[name]) {
    out.push({ surface: 'system', sev: 'high', title: `${name} ${major} is out of date`, path: 'this browser',
      detail: `Definitions floor is ${name} ${BROWSER_FLOOR[name]}. Old browsers miss patched security holes — update from the browser's own menu.` });
  }
  if (!window.isSecureContext) {
    out.push({ surface: 'system', sev: 'medium', title: 'Page not in a secure context', path: window.location.origin,
      detail: 'This page is running without HTTPS guarantees; treat forms and downloads here with care.' });
  }
  return out;
}
async function runPrivacyChecks(): Promise<Finding[]> {
  const out: Finding[] = [];
  try {
    if (navigator.permissions) {
      const granted = [];
      for (const n of ['geolocation', 'camera', 'microphone']) {
        try { const st = await navigator.permissions.query({ name: n as PermissionName }); if (st.state === 'granted') granted.push(n); } catch { /* unsupported name */ }
      }
      if (granted.length) {
        out.push({ surface: 'privacy', sev: 'medium', title: `Site holds ${granted.join(' + ')} access`,
          path: window.location.hostname || 'this site',
          detail: `This browser has granted this site: ${granted.join(', ')}. Revoke anything you don't remember approving (site settings → permissions).` });
      }
    }
  } catch { /* permissions API unavailable */ }
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const dnt = navigator.doNotTrack === '1';
  if (!gpc && !dnt) {
    out.push({ surface: 'privacy', sev: 'low', title: 'No tracking opt-out signal', path: 'browser setting',
      detail: 'Neither Global Privacy Control nor Do Not Track is on. Turning GPC on tells sites not to sell or share your data.' });
  }
  return out;
}

/* ── local file check (real, in-browser; nothing leaves the device) ──── */
const FC_EXEC   = new Set(['exe', 'scr', 'com', 'pif', 'msi', 'hta']);
const FC_SCRIPT = new Set(['bat', 'cmd', 'vbs', 'vbe', 'jse', 'wsf', 'ps1']);
const FC_MACRO  = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'ppsm']);
const FC_DOUBLE = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|csv|mp3|mp4|zip)\.([a-z0-9]{2,4})$/i;
const FC_LIMIT  = 2000;
/** Folder scans stream, so the ceiling is far higher than the hand-pick path.
 *  It still exists, and hitting it is REPORTED — never a silent truncation. */
const FOLDER_LIMIT = 50000;
/** Fingerprints resolved per request; mirrors the rail's own batch size. */
const HASH_BATCH = 100;

/** One file entering the scan. `entry` is present only for a readwrite folder
 *  scan, and its presence is what makes Remove and Quarantine real. */
interface ScanItem { file: File; relPath: string; entry?: FsFileEntry; }

const fcExt = (name: string) => { const m = /\.([a-z0-9]{1,5})$/i.exec(name); return m ? m[1].toLowerCase() : ''; };
async function fcHeader(file: File): Promise<Uint8Array | null> {
  try { return new Uint8Array(await file.slice(0, 8).arrayBuffer()); } catch { return null; }
}
function fcHeaderKind(b: Uint8Array | null): '' | 'MZ' | 'ELF' | 'PDF' | 'ZIP' {
  if (!b || b.length < 4) return '';
  if (b[0] === 0x4d && b[1] === 0x5a) return 'MZ';                                   // Windows PE
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'ELF'; // Linux exec
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'PDF'; // %PDF
  if (b[0] === 0x50 && b[1] === 0x4b) return 'ZIP';                                   // PK — also docx/xlsx/pptx/jar/apk
  return '';
}
async function fcCheckFile(file: File, relPath?: string): Promise<Finding[]> {
  const out: Omit<Finding, 'surface'>[] = []; const name = file.name; const ext = fcExt(name);
  // A folder walk has no webkitRelativePath, so the caller supplies the path.
  const rel = relPath || file.webkitRelativePath || name;
  if (/[\u202A-\u202E\u2066-\u2069]/.test(name)) {
    out.push({ sev: 'high', title: 'Filename hides its real extension',
      detail: `"${name.replace(/[\u202A-\u202E\u2066-\u2069]/g, '\u2400')}" contains invisible text-direction characters — the trick that makes "annexe.exe" read as "annexe.txt". Treat as hostile until verified.` });
  }
  const dm = FC_DOUBLE.exec(name);
  const dext = dm ? dm[2].toLowerCase() : '';
  if (dm && (FC_EXEC.has(dext) || FC_SCRIPT.has(dext))) {
    out.push({ sev: 'high', title: `Disguised executable: .${dm[1].toLowerCase()}.${dext}`,
      detail: `Named like a ${dm[1].toUpperCase()} but it is really a ${dext.toUpperCase()} — the classic malware delivery disguise. Do not open.` });
  } else if (FC_EXEC.has(ext)) {
    out.push({ sev: 'medium', title: `Executable file (.${ext})`,
      detail: 'Programs run with your full user rights. Keep it only if you downloaded it yourself from a source you trust.' });
  } else if (FC_SCRIPT.has(ext)) {
    out.push({ sev: 'medium', title: `Script file (.${ext})`,
      detail: 'Scripts execute like programs when double-clicked. Delete it unless you wrote it or expected it.' });
  }
  if (FC_MACRO.has(ext)) {
    out.push({ sev: 'medium', title: 'Macro-enabled Office file',
      detail: 'Macros are the most common malware carrier in documents. Open only if you expected a macro file from this sender.' });
  }
  const kind = fcHeaderKind(await fcHeader(file));
  if (kind === 'MZ' && !FC_EXEC.has(ext) && ext !== 'dll') {
    out.push({ sev: 'critical', title: `Hidden Windows program inside .${ext || '?'}`,
      detail: 'The file header is a Windows executable (MZ) even though the name says otherwise. This is how droppers hide. Do not open — delete it.' });
  } else if (kind === 'ELF' && !['', 'bin', 'so', 'elf', 'run'].includes(ext)) {
    out.push({ sev: 'critical', title: `Hidden Linux program inside .${ext || '?'}`,
      detail: 'The file header is an ELF executable despite the name. Do not run it.' });
  } else if (ext === 'pdf' && kind && kind !== 'PDF') {
    out.push({ sev: 'medium', title: 'Not actually a PDF inside',
      detail: 'The header does not match a real PDF. Open it only inside a viewer — never by double-click — until you know what it is.' });
  } else if (['docx', 'xlsx', 'pptx', 'zip', 'jar', 'apk'].includes(ext) && kind && kind !== 'ZIP') {
    out.push({ sev: 'medium', title: `.${ext} with a non-matching header`,
      detail: 'Files of this type are ZIP containers; this one is not. The name may be a disguise.' });
  }
  // `noact` is decided by the CALLER: a hand-picked file has no handle and so
  // stays Dismiss-only, while a readwrite folder scan can act for real.
  return out.map((f) => ({ ...f, surface: 'malware', path: rel, sample: false, local: true, noact: true }));
}

/* ── backend adapter (single seam for going live) ────────────────────── */
// Params the DEMO_MODE branch never reads carry a leading underscore so
// tsconfig's noUnusedParameters stays satisfied. When the LIVE lines below are
// uncommented, drop the underscore — the commented code already names them bare.
const securityApi = {
  /** Start a scan. Live mode: creates the scan row (RPC is applied + granted to authenticated). */
  async startScan(mode: ScanMode, surfaceIds: SurfaceId[]) {
    if (DEMO_MODE) return { scanId: `demo-${Date.now()}`, mode, surfaceIds };
    // LIVE (uncomment the supabase import first; client is env-guarded → assert):
    // const { data, error } = await supabase!.rpc('dingleberry_scan_start',
    //   { p_mode: mode, p_surfaces: surfaceIds, p_device_label: 'This browser' });
    // if (error) throw error;
    // return { scanId: data as string, mode, surfaceIds };
    throw new Error('Live scan rail not wired yet');
  },
  /** Resolve one agent surface. Live mode: read agent-reported findings (RLS: bee reads own). */
  async resolveAgentSurface(_scanId: string, surfaceId: SurfaceId): Promise<Finding[]> {
    if (DEMO_MODE) {
      return SAMPLE_FINDINGS.filter((f) => f.surface === surfaceId).map((f) => ({ ...f, sample: true }));
    }
    // LIVE: const { data } = await supabase!
    //   .from('dingleberry_findings').select('*')
    //   .eq('scan_id', scanId).eq('surface', surfaceId).eq('status', 'detected');
    // return (data ?? []).map((r) => ({ surface: r.surface, sev: r.severity,
    //   title: r.title, detail: r.detail, path: r.item_ref ?? undefined, sample: false }));
    return [];
  },
  /** Record an action on a finding. Live mode: SECDEF RPC (applied); the agent executes for real. */
  async actOnFinding(_findingId: number | string, _action: 'quarantine' | 'remove' | 'allow' | 'restore' | 'purge') {
    if (DEMO_MODE) return true;
    // LIVE: const { error } = await supabase!.rpc('dingleberry_finding_act',
    //   { p_finding_id: findingId, p_action: action });
    // if (error) throw error;
    return true;
  },
};

/* ── hex geometry ────────────────────────────────────────────────────── */
const HIVE = 340, C = HIVE / 2, R_PETAL = 47, R_CENTER = 54;
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
  idle: 'var(--border)', scanning: 'var(--sec)',
  clear: 'color-mix(in srgb, var(--clear, #16a34a) 55%, var(--border))',
  warn: 'color-mix(in srgb, var(--warn) 60%, var(--border))',
  risk: 'color-mix(in srgb, #dc2626 65%, var(--border))',
};
const CELL_FILL: Record<Level, string> = {
  idle: 'var(--panel-2)', scanning: 'color-mix(in srgb, var(--sec) 9%, var(--panel-2))',
  clear: 'color-mix(in srgb, var(--clear, #16a34a) 7%, var(--panel-2))',
  warn: 'color-mix(in srgb, var(--warn) 8%, var(--panel-2))',
  risk: 'color-mix(in srgb, #dc2626 10%, var(--panel-2))',
};
const POSTURE: Record<Level, { word: string; sub: string; color: string }> = {
  idle:     { word: 'UNKNOWN',   sub: 'run a scan',        color: 'var(--text-dim)' },
  scanning: { word: 'SCANNING',  sub: '',                  color: 'var(--sec)' },
  clear:    { word: 'PROTECTED', sub: 'no active threats', color: 'var(--clear, #16a34a)' },
  warn:     { word: 'ATTENTION', sub: 'review findings',   color: 'var(--warn)' },
  risk:     { word: 'AT RISK',   sub: 'act on threats',    color: '#dc2626' },
};
const SEV_STYLE: Record<Severity, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: 'color-mix(in srgb, #dc2626 18%, var(--panel-2))' },
  high:     { color: '#f97316', bg: 'color-mix(in srgb, #f97316 16%, var(--panel-2))' },
  medium:   { color: 'var(--warn)', bg: 'color-mix(in srgb, var(--warn) 14%, var(--panel-2))' },
  low:      { color: 'var(--text-dim)', bg: 'var(--panel-2)' },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let uid = 1;

/* ── component ───────────────────────────────────────────────────────── */
export function SecurityPage() {
  const [surfaceStatus, setSurfaceStatus] = useState<Record<SurfaceId, Level>>(
    () => Object.fromEntries(SURFACES.map((s) => [s.id, 'idle'])) as Record<SurfaceId, Level>,
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [quarantine, setQuarantine] = useState<Finding[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [shields, setShields] = useState<Record<string, boolean>>(() => Object.fromEntries(SHIELDS.map((s) => [s.id, false])));
  const [scanning, setScanning] = useState(false);
  const [readout, setReadout] = useState({ line: 'No scan yet on this device.', item: '', items: 0 });
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>('surfaces');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<SurfaceId>>(() => new Set(SURFACES.map((s) => s.id)));
  const [confirming, setConfirming] = useState<number | null>(null); // finding id awaiting destructive confirm
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
  const [fsWritable, setFsWritable] = useState(false);
  const [skips, setSkips] = useState<WalkSkip[]>([]);
  const [showSkips, setShowSkips] = useState(false);
  const [actNotes, setActNotes] = useState<Record<number, ActNote>>({});
  const [acting, setActing] = useState<number | null>(null);
  // Skips are collected in a ref because the walk fills them while React is
  // mid-render; the state copy is published once the scan settles.
  const skipRef = useRef<WalkSkip[]>([]);

  const posture = useMemo(() => {
    if (scanning) return 'scanning';
    const st = Object.values(surfaceStatus);
    if (st.includes('risk')) return 'risk';
    if (st.includes('warn')) return 'warn';
    if (st.includes('clear')) return 'clear';
    return 'idle';
  }, [surfaceStatus, scanning]);

  const levelFor = (id: SurfaceId, list: Finding[]): Level => {
    const f = list.filter((x) => x.surface === id);
    if (f.some((x) => x.sev === 'critical' || x.sev === 'high')) return 'risk';
    if (f.some((x) => x.sev === 'medium')) return 'warn';
    return 'clear';
  };

  async function runScan(mode: ScanMode, ids: SurfaceId[]) {
    if (scanning) return;
    const targets = SURFACES.filter((s) => ids.includes(s.id));
    if (!targets.length) return;
    stopRef.current = false;
    setScanning(true);
    setPickerOpen(false);
    let working = findings.filter((f) => !ids.includes(f.surface));
    setFindings(working);
    setSurfaceStatus((p) => ({ ...p, ...Object.fromEntries(targets.map((s) => [s.id, 'scanning'])) }));

    const { scanId } = await securityApi.startScan(mode, ids);
    const perSurfaceMs = mode === 'deep' ? 2600 : 1400;
    let items = 0;
    let aborted = false;

    for (const s of targets) {
      if (stopRef.current) { aborted = true; break; }
      const pool = DEMO_ITEMS[s.id] || ['…'];
      const steps = mode === 'deep' ? pool.length : Math.min(pool.length, 3);
      for (let i = 0; i < steps; i++) {
        if (stopRef.current) { aborted = true; break; }
        items += Math.floor(180 + Math.random() * 420);
        setReadout({ line: `Scanning ${s.name}`, item: pool[i % pool.length], items });
        await sleep(perSurfaceMs / steps);
      }
      if (aborted) break;

      let found = s.src === 'local'
        ? (s.id === 'system' ? await runSystemChecks() : await runPrivacyChecks()).map((f) => ({ ...f, sample: false }))
        : await securityApi.resolveAgentSurface(scanId, s.id);
      found = found.filter((f) => !allowedRef.current.has(f.title)).map((f) => ({ ...f, id: uid++ }));
      working = [...working, ...found];
      setFindings(working);
      setSurfaceStatus((p) => ({ ...p, [s.id]: levelFor(s.id, working) }));
    }

    setScanning(false);
    if (aborted) {
      setSurfaceStatus((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v === 'scanning' ? 'idle' : v])) as Record<SurfaceId, Level>);
      setReadout({ line: 'Scan stopped.', item: '', items });
      return;
    }
    const now = new Date();
    setLastScan(now);
    const bad = working.filter((f) => f.sev === 'critical' || f.sev === 'high').length;
    setHistory((h) => [{ at: now, mode, items, found: working.length, bad }, ...h]);
    setReadout({ line: `Scan complete · ${working.length} finding${working.length === 1 ? '' : 's'}`, item: '', items });
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
        working = [...working, {
          id: uid++, surface: 'malware', sev: 'critical',
          title: malwareTitle(v), detail: malwareDetail(b.item.file.name, v),
          path: b.item.relPath, sample: false, local: true,
          noact: !b.item.entry, fsEntry: b.item.entry,
        }];
      }
      setFindings(working);
      batch = [];
    };

    for await (const item of source) {
      if (stopRef.current) break;
      if (checked >= meta.cap) { capped = true; break; }
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
      const next = levelFor('malware', working);
      // A degraded lookup must NEVER paint this surface CLEAR. That green is
      // the false clean this whole pass exists to prevent — if the database
      // could not be reached, the honest answer is the status quo, not "clear".
      if (degraded && next === 'clear') return p;
      return (flagged || matched || p.malware !== 'idle') ? { ...p, malware: next } : p;
    });
    setFcStatus({
      phase: 'done', checked, flagged, capped,
      hashed, matched, oversize, degraded,
      skipped: skipRef.current.length, stopped: stopRef.current, folder: meta.folder,
    });
    setScanning(false);
    stopRef.current = false;
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
    setFsWritable(picked.writable);
    skipRef.current = [];
    setSkips([]);
    setShowSkips(false);

    const source = walkDirectory(
      picked.root,
      () => stopRef.current,
      (s) => { skipRef.current = [...skipRef.current, s]; },
    );
    async function* stream(): AsyncGenerator<ScanItem> {
      for await (const e of source) {
        // Only a writable grant gets handles: an action offered on a read-only
        // folder would fail, and a button that fails is worse than none.
        yield { file: e.file, relPath: e.relPath, entry: picked?.writable ? e : undefined };
      }
    }
    await runScanStream(stream(), { folder: picked.root.name, cap: FOLDER_LIMIT });
    setSkips(skipRef.current);
  }

  function afterAction(surfaceId: SurfaceId, nextFindings: Finding[]) {
    setSurfaceStatus((p) => (p[surfaceId] === 'idle' ? p : { ...p, [surfaceId]: levelFor(surfaceId, nextFindings) }));
  }
  const note = (id: number, ok: boolean, text: string) =>
    setActNotes((n) => ({ ...n, [id]: { ok, text } }));

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
    setActing(f.id!);
    const res = await quarantineFile(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) { note(f.id!, false, res.error ?? 'Quarantine failed.'); return; }
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next);
    setQuarantine((q) => [{ ...f, qAt: new Date() }, ...q]);
    afterAction(f.surface, next);
  }

  /** Remove — deletes from disk, then proves it is gone before saying so. */
  async function actRemove(f: Finding) {
    if (confirming !== f.id) { setConfirming(f.id!); setTimeout(() => setConfirming((c) => (c === f.id ? null : c)), 3500); return; }
    setConfirming(null);
    if (!f.fsEntry) return;
    setActing(f.id!);
    const res = await removeFile(f.fsEntry);
    setActing(null);
    if (!res.ok) { note(f.id!, false, res.error ?? 'Remove failed.'); return; }
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next);
    afterAction(f.surface, next);
  }
  function actAllow(f: Finding) {
    securityApi.actOnFinding(f.id!, 'allow');
    allowedRef.current.add(f.title);
    const next = findings.filter((x) => x.id !== f.id);
    setFindings(next); afterAction(f.surface, next);
  }
  /** Restore — moves the file back out of Quarantine to where it came from. */
  async function actRestore(f: Finding) {
    if (!f.fsEntry || !fsRoot) return;
    setActing(f.id!);
    const res = await restoreFile(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) { note(f.id!, false, res.error ?? 'Restore failed.'); return; }
    setQuarantine((q) => q.filter((x) => x.id !== f.id));
    const next = [f, ...findings];
    setFindings(next); afterAction(f.surface, next);
    if (res.error) note(f.id!, false, res.error); // restored, with a caveat
  }

  /** Delete forever — removes the quarantined copy from disk. */
  async function actPurge(f: Finding) {
    if (confirming !== f.id) { setConfirming(f.id!); setTimeout(() => setConfirming((c) => (c === f.id ? null : c)), 3500); return; }
    setConfirming(null);
    if (!f.fsEntry || !fsRoot) return;
    setActing(f.id!);
    const res = await purgeQuarantined(f.fsEntry, fsRoot);
    setActing(null);
    if (!res.ok) { note(f.id!, false, res.error ?? 'Delete failed.'); return; }
    setQuarantine((q) => q.filter((x) => x.id !== f.id));
  }

  const sortedFindings = useMemo(() => [...findings].sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]), [findings]);
  const hot = findings.some((f) => f.sev === 'critical' || f.sev === 'high');
  const fmtWhen = (d: Date) => d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    // Full-bleed dark center column. Security keeps its console skin inside the
    // white community shell (owner ruling 2026-08-08) — the dark owns the whole
    // content column so the boundary reads as intentional, with no white gaps
    // inside it and no dark bleed past it onto the shell chrome. --clear is
    // pinned here rather than left to each call site's var() fallback.
    <div className="min-h-full w-full bg-[var(--bg)] text-text"
      style={{ '--sec': '#58a6ff', '--sec-deep': '#1f6feb', '--warn': '#f59e0b', '--clear': '#16a34a' } as CSSProperties}>
    <div className="mx-auto max-w-[760px] px-4 pt-5 pb-24">
      {DEMO_MODE && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed"
          style={{ background: 'color-mix(in srgb, var(--warn) 8%, var(--panel))', borderColor: 'color-mix(in srgb, var(--warn) 45%, var(--border))', color: 'var(--text-silver)' }}>
          <span className="mt-px flex-none rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em]"
            style={{ background: 'var(--warn)', color: '#07080a' }}>DEMO DATA</span>
          <span><b className="text-text-silver-bright">Agent surfaces show sample findings</b> until the security agent is
            connected to this device. Local surfaces (Privacy, System integrity) and the file check below are live, and run on your machine.</span>
        </div>
      )}

      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        <b style={{ color: '#dc2626' }}>SECURITY</b> · DEVICE
      </div>
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Security</h1>
      <p className="mb-6 mt-1 text-sm text-text-dim">The immune system, pointed at your device. Six surfaces, one posture.</p>

      {/* hex posture flower */}
      <div className="mb-2 flex justify-center">
        <svg viewBox={`0 0 ${HIVE} ${HIVE}`} role="img" aria-label="Device security posture" className="block h-auto w-[min(340px,86vw)]">
          {PETALS.map((s) => {
            const st = surfaceStatus[s.id];
            return (
              <g key={s.id}>
                <polygon points={hexPoints(s.cx, s.cy, R_PETAL)}
                  style={{ fill: CELL_FILL[st], stroke: CELL_STROKE[st], strokeWidth: 1.5, transition: 'fill .5s, stroke .5s' }}>
                  {st === 'scanning' && <animate attributeName="stroke-width" values="1.5;3;1.5" dur="1.1s" repeatCount="indefinite" />}
                </polygon>
                <text x={s.cx} y={s.cy - 2} textAnchor="middle" style={{ fill: st === 'clear' ? 'var(--clear, #16a34a)' : 'var(--text-silver)', fontSize: 15 }}>{s.glyph}</text>
                <text x={s.cx} y={s.cy + 15} textAnchor="middle" className="font-mono uppercase" style={{ fill: 'var(--text-dim)', fontSize: 9.5, letterSpacing: '.06em' }}>
                  {s.id === 'spyware' ? 'SPYWARE' : s.id === 'system' ? 'SYSTEM' : s.name.split(' ')[0].toUpperCase()}
                </text>
              </g>
            );
          })}
          <polygon points={hexPoints(C, C, R_CENTER)} style={{ fill: 'var(--panel-2)', stroke: 'var(--border)', strokeWidth: 1.5 }} />
          <text x={C} y={C + 1} textAnchor="middle" className="font-mono font-semibold uppercase" style={{ fill: POSTURE[posture].color, fontSize: 13, letterSpacing: '.12em' }}>{POSTURE[posture].word}</text>
          <text x={C} y={C + 18} textAnchor="middle" className="font-mono" style={{ fill: 'var(--text-muted)', fontSize: 9.5, letterSpacing: '.06em' }}>{POSTURE[posture].sub}</text>
        </svg>
      </div>

      {/* readout */}
      <div className="mx-auto mb-4 min-h-[38px] text-center font-mono text-xs" style={{ color: 'var(--text-dim)' }} aria-live="polite">
        <span>{readout.line}{readout.items > 0 && !readout.line.startsWith('No scan') ? <> · <span style={{ color: 'var(--sec)' }}>{readout.items.toLocaleString()}</span> items</> : null}</span>
        {readout.item && <span className="mx-auto block max-w-[520px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>{readout.item}</span>}
      </div>

      {/* controls */}
      <div className="mb-6 flex flex-wrap justify-center gap-2.5">
        {!scanning ? (
          <>
            <button onClick={() => runScan('quick', SURFACES.map((s) => s.id))}
              className="rounded-xl px-[18px] py-[11px] text-sm font-semibold" style={{ background: 'var(--sec-deep)', color: '#fff' }}>
              Quick scan<small className="block font-mono text-[10px] font-normal tracking-[0.05em] opacity-75">~30 s · active surfaces</small>
            </button>
            <button onClick={() => runScan('deep', SURFACES.map((s) => s.id))}
              className="rounded-xl border px-[18px] py-[11px] text-sm font-semibold text-text-silver-bright"
              style={{ background: 'var(--panel)', borderColor: 'var(--border-bright)' }}>
              Deep scan<small className="block font-mono text-[10px] font-normal tracking-[0.05em] opacity-70">full sweep · all six</small>
            </button>
            <button onClick={() => { if (pickerOpen && picked.size) runScan('custom', [...picked]); else setPickerOpen(true); }}
              aria-expanded={pickerOpen}
              className="rounded-xl border px-[18px] py-[11px] text-sm font-semibold text-text-silver-bright"
              style={{ background: 'var(--panel)', borderColor: pickerOpen ? 'var(--sec)' : 'var(--border-bright)' }}>
              Custom<small className="block font-mono text-[10px] font-normal tracking-[0.05em] opacity-70">{pickerOpen ? 'tap again to start' : 'pick surfaces'}</small>
            </button>
          </>
        ) : (
          <button onClick={() => { stopRef.current = true; }}
            className="rounded-xl border px-[18px] py-[11px] text-sm font-semibold"
            style={{ background: 'var(--panel)', borderColor: 'color-mix(in srgb, #dc2626 60%, var(--border-bright))', color: '#dc2626' }}>
            Stop scan
          </button>
        )}
      </div>

      {pickerOpen && !scanning && (
        <div className="-mt-3 mb-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose surfaces to scan">
          {SURFACES.map((s) => {
            const on = picked.has(s.id);
            return (
              <button key={s.id} aria-pressed={on}
                onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                className="rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.05em]"
                style={{ background: 'var(--panel)', borderColor: on ? 'var(--sec)' : 'var(--border)', color: on ? 'var(--sec)' : 'var(--text-dim)' }}>
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }} role="tablist" aria-label="Security views">
        {([['surfaces', 'Surfaces'], ['threats', 'Threats'], ['quarantine', 'Quarantine'], ['history', 'History']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className="-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold"
            style={{ color: tab === id ? 'var(--text)' : 'var(--text-dim)', borderColor: tab === id ? 'var(--sec)' : 'transparent' }}>
            {label}
            {id === 'threats' && <span className="ml-1.5 rounded-full border px-1.5 py-px font-mono text-[10.5px]"
              style={{ background: 'var(--panel-2)', borderColor: hot ? 'color-mix(in srgb, #dc2626 55%, var(--border))' : 'var(--border)', color: hot ? '#dc2626' : 'var(--text-dim)' }}>{findings.length}</span>}
            {id === 'quarantine' && <span className="ml-1.5 rounded-full border px-1.5 py-px font-mono text-[10.5px]"
              style={{ background: 'var(--panel-2)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}>{quarantine.length}</span>}
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
              const statusTxt = st === 'idle' ? 'NOT SCANNED' : st === 'scanning' ? 'SCANNING…' : st === 'clear' ? 'CLEAR' : st === 'warn' ? `${n} TO REVIEW` : `${n} THREAT${n === 1 ? '' : 'S'}`;
              const statusColor = { idle: 'var(--text-muted)', scanning: 'var(--sec)', clear: 'var(--clear, #16a34a)', warn: 'var(--warn)', risk: '#dc2626' }[st];
              return (
                <div key={s.id} className="flex flex-col gap-1.5 rounded-2xl border p-3.5" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-silver-bright">{s.name}</span>
                    <span className="flex-none rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
                      style={s.src === 'local'
                        ? { borderColor: 'color-mix(in srgb, var(--clear, #16a34a) 45%, var(--border))', color: 'var(--clear, #16a34a)' }
                        : { borderColor: 'var(--border-bright)', color: 'var(--text-muted)' }}>
                      {s.src === 'local' ? 'LOCAL' : 'AGENT'}
                    </span>
                  </div>
                  <div className="flex-1 text-[12.5px] leading-relaxed text-text-dim">{s.desc}</div>
                  <div className="font-mono text-[11px] tracking-[0.05em]" style={{ color: statusColor }}>{statusTxt}</div>
                </div>
              );
            })}
          </div>

          <div className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Local file check · runs in this browser</div>
          <div
            onDragOver={(e) => { e.preventDefault(); setFcDrag(true); }}
            onDragEnter={(e) => { e.preventDefault(); setFcDrag(true); }}
            onDragLeave={() => setFcDrag(false)}
            onDrop={(e) => { e.preventDefault(); setFcDrag(false); if (e.dataTransfer?.files?.length) runFileCheck(e.dataTransfer.files); }}
            className="rounded-2xl border-[1.5px] border-dashed p-4 transition-colors"
            style={{ background: fcDrag ? 'color-mix(in srgb, var(--sec) 7%, var(--panel))' : 'var(--panel)', borderColor: fcDrag ? 'var(--sec)' : 'var(--border-bright)' }}>
            <p className="mb-2 mt-0 text-[12.5px] leading-relaxed text-text-dim">
              Drop files here — or pick below. Each file is examined <b className="font-semibold text-text-silver-bright">in this browser</b> for
              disguised executables, double extensions, hidden direction-override characters, macro carriers, and headers that don't match the name.
              Each file is then fingerprinted and checked against a known-malware database.
            </p>
            <p className="mb-2 mt-0 text-[12.5px] leading-relaxed text-text-dim">
              <b className="font-semibold text-text-silver-bright">Only a mathematical fingerprint (SHA-256) of each file is sent — never the file, its name, or its contents.</b>{' '}
              A fingerprint is one-way: it cannot be turned back into the file it came from.
            </p>
            <p className="mb-3 mt-0 text-[12.5px] leading-relaxed text-text-dim">
              Downloaded an app install file? Check it here before you open it. This page can only check files you hand it —
              it cannot see installed apps, other apps' storage, or watch this device in the background.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => fcFilesRef.current?.click()} disabled={scanning}
                className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                style={{ background: 'var(--panel-2)', borderColor: 'var(--border-bright)', color: 'var(--text-silver)' }}>Pick files</button>
              {/* Real folder scan — Chromium desktop only. Hidden entirely where
                  the picker is absent or has already failed, so no dead control
                  is ever shown and the Bee is never asked what platform this is. */}
              {fsAvailable && (
                <button type="button" onClick={() => { void runFolderScan(); }} disabled={scanning}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                  style={{ background: 'var(--sec-deep)', borderColor: 'var(--sec-deep)', color: '#fff' }}>Scan a folder</button>
              )}
              {!fsAvailable && folderWorks !== false && (
                <button onClick={() => fcFolderRef.current?.click()} disabled={scanning}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
                  style={{ background: 'var(--panel-2)', borderColor: 'var(--border-bright)', color: 'var(--text-silver)' }}>Pick a folder</button>
              )}
              {scanning && (
                <button type="button" onClick={() => { stopRef.current = true; }}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold"
                  style={{ background: 'var(--panel-2)', borderColor: 'color-mix(in srgb, #dc2626 60%, var(--border-bright))', color: '#dc2626' }}>Stop</button>
              )}
            </div>
            {fsAvailable && (
              <p className="mb-0 mt-2 text-[12px] leading-relaxed text-text-dim">
                A folder scan reads every file inside the folder you choose. Grant write access and
                findings inside it can be removed or quarantined for real.
              </p>
            )}
            {fsRoot && !fsWritable && (
              <p className="mb-0 mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--warn)' }}>
                Opened read-only — Remove and Quarantine are not available for this folder.
              </p>
            )}
            {folderWorks === false && (
              <p className="mb-0 mt-2 text-[12px] leading-relaxed text-text-dim">
                Your browser can't select a whole folder — pick files instead.
              </p>
            )}
            {fcStatus && (
              <div className="mt-3 font-mono text-[11.5px] tracking-[0.03em]" style={{ color: 'var(--text-dim)' }} aria-live="polite">
                {fcStatus.phase === 'run' ? fcStatus.text : (
                  <>
                    <div>
                      {fcStatus.stopped ? <b style={{ color: 'var(--warn)' }}>Stopped early — partial scan. </b> : null}
                      Checked <b style={{ color: 'var(--text-silver)' }}>{fcStatus.checked}</b> file{fcStatus.checked === 1 ? '' : 's'}
                      {fcStatus.folder ? <> in <b style={{ color: 'var(--text-silver)' }}>{fcStatus.folder}</b></> : null}
                      {fcStatus.skipped > 0 ? <>, skipped <b style={{ color: 'var(--warn)' }}>{fcStatus.skipped}</b></> : null} ·{' '}
                      {fcStatus.flagged
                        ? <b style={{ color: 'var(--warn)' }}>{fcStatus.flagged} risk indicator{fcStatus.flagged === 1 ? '' : 's'} — see the Threats tab</b>
                        : <span>no structural risk indicators</span>}
                      {fcStatus.capped ? ` · stopped at the ${fcStatus.folder ? FOLDER_LIMIT : FC_LIMIT}-file ceiling` : ''}
                      {fcStatus.oversize ? ` · ${fcStatus.oversize} too large to fingerprint in the browser` : ''}
                    </div>
                    {/* The skipped list is openable, not buried. A scan that
                        hides what it could not read reports a prettier, wrong
                        number and invites false confidence. */}
                    {skips.length > 0 && (
                      <div className="mt-1">
                        <button type="button" onClick={() => setShowSkips((v) => !v)}
                          className="underline decoration-dotted underline-offset-2"
                          style={{ color: 'var(--warn)' }}>
                          {showSkips ? 'Hide' : 'Show'} the {skips.length} skipped file{skips.length === 1 ? '' : 's'}
                        </button>
                        {showSkips && (
                          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border px-2 py-1.5"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                            {skips.map((s) => (
                              <div key={`${s.reason}:${s.path}`} className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {s.path} — {s.reason === 'permission' ? 'permission denied' : 'unreadable'}
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
                          {fcStatus.matched} known-malware match{fcStatus.matched === 1 ? '' : 'es'} — see the Threats tab
                        </b>
                      )}
                      {fcStatus.degraded ? (
                        <b className={fcStatus.matched > 0 ? 'ml-2' : ''} style={{ color: 'var(--warn)' }}>
                          Could not reach the malware database — structural checks only.
                        </b>
                      ) : fcStatus.matched === 0 && fcStatus.hashed > 0 ? (
                        <span>
                          No known-malware match for {fcStatus.hashed} fingerprint{fcStatus.hashed === 1 ? '' : 's'}.
                        </span>
                      ) : null}
                    </div>
                    {/* The line that keeps a finished scan from reading as a
                        clean bill of health. It is the last thing shown, and it
                        is deliberately unavoidable. */}
                    <div className="mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      This says what was checked, not that this device is clean — it can only
                      see the files you handed it.
                    </div>
                  </>
                )}
              </div>
            )}
            <input ref={fcFilesRef} type="file" multiple hidden onChange={(e) => { if (e.target.files) runFileCheck(e.target.files); e.target.value = ''; }} />
            {/* A change event carrying ZERO files is the Android tell: the picker
                opened and could not return a folder. Cancelling fires `cancel`,
                not `change`, so this does not misfire on a user backing out. */}
            <input ref={fcFolderRef} type="file" {...DIR_PICK_PROPS} hidden onChange={(e) => {
              const list = e.target.files;
              if (list && list.length > 0) { setFolderWorks(true); runFileCheck(list); }
              else { setFolderWorks(false); }
              e.target.value = '';
            }} />
          </div>

          <div className="mb-2.5 mt-6 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Real-time shields</div>
          {SHIELDS.map((s) => {
            const needsAgent = s.agent && DEMO_MODE;
            const on = shields[s.id];
            return (
              <div key={s.id} className="mb-2 flex items-center gap-3 rounded-xl border px-3.5 py-3" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-text-silver-bright">{s.name}</div>
                  <div className="mt-px text-xs text-text-dim">{s.desc}</div>
                </div>
                {needsAgent && <span className="font-mono text-[9.5px] tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>NEEDS AGENT</span>}
                <button role="switch" aria-checked={on} aria-label={s.name} disabled={needsAgent}
                  onClick={() => setShields((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  className="relative h-6 w-[42px] flex-none rounded-full border transition-colors disabled:opacity-40"
                  style={{ background: on ? 'color-mix(in srgb, var(--sec) 25%, var(--panel-2))' : 'var(--panel-2)', borderColor: on ? 'var(--sec)' : 'var(--border-bright)' }}>
                  <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all"
                    style={{ left: on ? 20 : 2, background: on ? 'var(--sec)' : 'var(--text-dim)' }} />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {/* THREATS */}
      {tab === 'threats' && (
        <section>
          {sortedFindings.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] text-text-dim" style={{ borderColor: 'var(--border)' }}>
              No open findings. {lastScan ? 'Your last scan came back clear or everything has been handled.' : 'Run a scan to check this device.'}
            </div>
          ) : sortedFindings.map((f) => (
            /* Real actions require a real handle. Without one the card offers
               Dismiss only — the old build showed Quarantine and Remove on
               every finding and neither touched the disk. */
            <FindingCard key={f.id} f={f} confirming={confirming === f.id}
              busy={acting === f.id} note={actNotes[f.id!]}
              actions={!f.fsEntry ? [
                { label: 'Dismiss', onClick: () => actAllow(f) },
              ] : [
                { label: 'Quarantine', onClick: () => { void actQuarantine(f); } },
                { label: confirming === f.id ? 'Confirm remove' : 'Remove', danger: true, confirmingNow: confirming === f.id, onClick: () => { void actRemove(f); } },
                { label: 'Allow', onClick: () => actAllow(f) },
              ]} />
          ))}
        </section>
      )}

      {/* QUARANTINE */}
      {tab === 'quarantine' && (
        <section>
          {quarantine.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] text-text-dim" style={{ borderColor: 'var(--border)' }}>
              Quarantine is empty. Files you quarantine are moved into a <b>{QUARANTINE_DIR}</b> folder
              inside the folder you scanned and renamed so they cannot be opened by double-click.
            </div>
          ) : quarantine.map((f) => (
            <FindingCard key={f.id} f={f} confirming={confirming === f.id}
              busy={acting === f.id} note={actNotes[f.id!]}
              actions={[
                { label: 'Restore', onClick: () => { void actRestore(f); } },
                { label: confirming === f.id ? 'Confirm delete' : 'Delete forever', danger: true, confirmingNow: confirming === f.id, onClick: () => { void actPurge(f); } },
              ]} />
          ))}
        </section>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <section>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-7 text-center text-[13.5px] text-text-dim" style={{ borderColor: 'var(--border)' }}>
              No scans yet on this device.
            </div>
          ) : history.map((h, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-3 border-b px-1 py-2.5 text-[13px]" style={{ borderColor: 'var(--border)' }}>
              <span className="min-w-[150px] flex-none font-mono text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{fmtWhen(h.at)}</span>
              <span className="font-semibold text-text-silver">{h.mode === 'deep' ? 'Deep scan' : h.mode === 'quick' ? 'Quick scan' : 'Custom scan'}</span>
              <span className="font-mono text-[11.5px] text-text-dim">{h.items.toLocaleString()} items</span>
              <span className="font-mono text-[11.5px]" style={{ color: h.bad ? '#dc2626' : 'var(--clear, #16a34a)' }}>{h.bad ? `${h.bad} THREATS` : 'CLEAR'}</span>
            </div>
          ))}
        </section>
      )}

      {/* foot line */}
      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3.5 font-mono text-[10.5px] tracking-[0.05em]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <span><Dot color={DEMO_MODE ? 'var(--warn)' : 'var(--clear, #16a34a)'} />AGENT · {DEMO_MODE ? 'NOT CONNECTED' : 'CONNECTED'}</span>
        <span><Dot color="var(--clear, #16a34a)" />DEFINITIONS · {DEFINITIONS_STAMP}</span>
        <span>LAST SCAN · {lastScan ? fmtWhen(lastScan).toUpperCase() : 'NEVER'}</span>
      </div>
    </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-[1px]" style={{ background: color }} />;
}

function FindingCard({ f, actions, busy, note }: {
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
    <div className="mb-2.5 rounded-2xl border p-3.5"
      style={{ background: 'var(--panel)', borderColor: f.sev === 'critical' ? 'color-mix(in srgb, #dc2626 45%, var(--border))' : 'var(--border)' }}>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="flex-none rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.09em]" style={{ background: sev.bg, color: sev.color }}>{f.sev}</span>
        <span className="text-sm font-semibold text-text-silver-bright">{f.title}</span>
        <span className="font-mono text-[10.5px] tracking-[0.04em]" style={{ color: 'var(--text-muted)' }}>{sname.toUpperCase()}</span>
        {f.local && <span className="rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.08em]" style={{ color: 'var(--clear, #16a34a)', borderColor: 'color-mix(in srgb, var(--clear, #16a34a) 45%, var(--border))' }}>LOCAL CHECK</span>}
        {f.sample && <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.08em]" style={{ background: 'var(--warn)', color: '#07080a' }}>SAMPLE</span>}
      </div>
      <div className="my-1.5 text-[12.5px] leading-relaxed text-text-dim" style={{ wordBreak: 'break-word' }}>{f.detail}</div>
      {f.path && (
        <div className="mb-2.5 inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border px-2 py-1 font-mono text-[11px] text-text-silver"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>{f.path}</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick} disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-45"
            style={a.confirmingNow
              ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' }
              : { background: 'var(--panel-2)', borderColor: a.danger ? 'color-mix(in srgb, #dc2626 45%, var(--border-bright))' : 'var(--border-bright)', color: a.danger ? '#dc2626' : 'var(--text-silver)' }}>
            {a.label}
          </button>
        ))}
        {busy && <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>working…</span>}
      </div>
      {/* A failed disk action is reported here, in plain language. Success is
          silent because the card disappears — a failure must never be. */}
      {note && (
        <div className="mt-2 rounded-lg border px-2 py-1.5 text-[12px] leading-relaxed"
          style={note.ok
            ? { background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-silver)' }
            : { background: 'color-mix(in srgb, #dc2626 10%, var(--panel-2))', borderColor: 'color-mix(in srgb, #dc2626 45%, var(--border))', color: '#f87171' }}
          role={note.ok ? undefined : 'alert'}>
          {note.text}
        </div>
      )}
    </div>
  );
}

export default SecurityPage;
