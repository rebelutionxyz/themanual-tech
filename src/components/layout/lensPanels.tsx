import { ScrollRow } from '@/components/ui/ScrollRow';
import { useAstra } from '@/lib/astras/AstraContext';
import { type AstraRow, useAstraRegistry } from '@/lib/astras/useAstraRegistry';
import { type AtomLevelRow, getAtomLevel, getRealmOrderNames } from '@/lib/atomLevels';
import { REALM_ID_BY_NAME, REALM_NAMES } from '@/lib/constants';
import type { FeedSort } from '@/lib/forumFeed';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { TIME_PRESETS } from '@/lib/timePresets';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import type { RealmId } from '@/types/manual';
import { ChevronRight, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────
// Shared realm/time lens panels + the realm-lens hook. Lifted out of
// TopToolbar so both the (legacy) global toolbar and the new white-shell
// GlobalSidebar render IDENTICAL silver popups over the same lens store.
// ─────────────────────────────────────────────────────────────────────────

export const INTEL_COLOR = '#1D9BF0';
export const HONEY = '#FAD15E';

// Silver popup palette (dispatch A5). Popups only.
export const SILVER = '#CBD3DC';
export const SILVER_BORDER = '#A9B2BD';
export const SILVER_SHEEN = 'inset 0 1px 0 rgba(255,255,255,0.65)';
export const ON_SILVER = '#1A1C20';
export const ON_SILVER_MUTED = '#51565E';

/** Per-depth row background ramp (locked, darkest → lightest) — Realms rows. */
const DEPTH_BG = ['#0B0B0D', '#2A2A30', '#494951', '#74747D', '#A0A0A8'];
/** Inactive chip text per depth (crosses light → dark with the bg ramp). */
const DEPTH_TEXT = ['#9A9BA2', '#C4C5CC', '#DDDEE2', '#2C2C31', '#26262B'];

function rampAt(arr: string[], i: number): string {
  return arr[Math.min(i, arr.length - 1)];
}

// parent_surface enum values that double as surface slugs — used to default the
// Source chip to the surface the Bee picked the realm from.
const PARENT_SURFACES = new Set([
  'bling',
  'intel',
  'unite',
  'rule',
  'comms',
  'give',
  'chat',
  'pulse',
  'bazaar',
  'brand',
  'prize',
  'promotion',
  'manual',
  'secure',
  'safe',
  'production',
  'edu',
  'vote',
  'legal',
]);

export function surfaceFromPath(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg ?? null;
}

/* ───────────────────────── useRealmLens hook ───────────────────────── */

/**
 * Shared realm-lens wiring: reads/writes the platform lens store, resolves the
 * realm→Astra jump target, and exposes the handlers the Realms popup needs.
 */
export function useRealmLens() {
  const navigate = useNavigate();
  const location = useLocation();
  const astra = useAstra();
  const registry = useAstraRegistry();

  const { realmId, l2, l3, path: lensPath, setLens, setSource } = useLensStore();

  function handleSelectPath(rid: RealmId | null, pathNames: string[]) {
    setLens(rid, pathNames);
    if (rid) {
      const surf = surfaceFromPath(location.pathname);
      setSource(surf && PARENT_SURFACES.has(surf) ? surf : 'all');
    }
  }

  function clearRealms() {
    setLens(null, []);
    setSource('all');
  }

  const activeRealmId = realmId;
  const realmAstraSlug = activeRealmId ? (registry.realmAstraSlug[activeRealmId] ?? null) : null;
  const realmAstra = realmAstraSlug ? (registry.bySlug.get(realmAstraSlug) ?? null) : null;

  function jumpToAstra() {
    if (!activeRealmId || !realmAstraSlug) return;
    if (realmAstra?.status === 'active') navigate(`/${activeRealmId}`);
  }

  function onRealm() {
    if (realmId) setLens(realmId, [REALM_NAMES[realmId]]);
  }
  function onL2() {
    if (realmId && l2) setLens(realmId, [REALM_NAMES[realmId], l2]);
  }

  const currentName =
    SURFACE_BY_SLUG.get(surfaceFromPath(location.pathname) ?? '')?.name ??
    astra?.wordmark ??
    'TheMANUAL.tech';

  return {
    registry,
    realmId,
    l2,
    l3,
    lensPath,
    setLens,
    realmAstra,
    hasRealmAstra: Boolean(realmAstraSlug),
    handleSelectPath,
    clearRealms,
    jumpToAstra,
    onRealm,
    onL2,
    currentName,
  };
}

/* ───────────────────────── Popup shell (silver) ───────────────────────── */

export function Popup({
  anchorLeft,
  containerW,
  width,
  full,
  title,
  children,
  onClose,
  style: styleOverride,
}: {
  anchorLeft?: number;
  containerW?: number;
  width?: number;
  full?: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** When provided, fully overrides positioning (sidebar use anchors differently). */
  style?: React.CSSProperties;
}) {
  let style: React.CSSProperties;
  if (styleOverride) {
    style = styleOverride;
  } else if (full) {
    style = { top: '100%', left: 8, right: 8 };
  } else {
    const cw = containerW ?? 320;
    const w = Math.min(width ?? 320, Math.max(220, cw - 16));
    const left = Math.max(8, Math.min(anchorLeft ?? 0, cw - w - 8));
    style = { top: '100%', left, width: w };
  }

  return (
    <div className="absolute z-50" style={style}>
      <div
        className="mt-1 overflow-hidden rounded-lg border shadow-xl"
        style={{
          background: SILVER,
          borderColor: SILVER_BORDER,
          boxShadow: `${SILVER_SHEEN}, 0 8px 24px rgba(0,0,0,0.45)`,
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: 'rgba(0,0,0,0.12)' }}
        >
          <span
            className="font-mono uppercase tracking-wider"
            style={{ fontSize: '10.5px', color: ON_SILVER_MUTED }}
            data-size="meta"
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-black/10"
            style={{ color: ON_SILVER }}
          >
            <X size={12} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Realms panel ───────────────────────── */

export function RealmsPanel({
  lensPath,
  realmAstra,
  hasRealmAstra,
  onSelectPath,
  onClear,
  onJump,
}: {
  lensPath: string[];
  realmAstra: AstraRow | null;
  hasRealmAstra: boolean;
  onSelectPath: (realmId: RealmId | null, pathNames: string[]) => void;
  onClear: () => void;
  onJump: () => void;
}) {
  const [roots, setRoots] = useState<AtomLevelRow[]>([]);
  const [drill, setDrill] = useState<AtomLevelRow[]>([]);
  const [childrenByPath, setChildrenByPath] = useState<Map<string, AtomLevelRow[]>>(new Map());

  // biome-ignore lint/correctness/useExhaustiveDependencies: lensPath is the one-shot seed (joined to a stable key); stable module fns + setters intentionally omitted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawRoots, orderNames] = await Promise.all([getAtomLevel(null), getRealmOrderNames()]);
      if (cancelled) return;
      const orderIdx = new Map(orderNames.map((n, i) => [n, i]));
      const sorted = [...rawRoots].sort(
        (a, b) => (orderIdx.get(a.name) ?? 999) - (orderIdx.get(b.name) ?? 999),
      );
      setRoots(sorted);

      const nextDrill: AtomLevelRow[] = [];
      const childMap = new Map<string, AtomLevelRow[]>();
      let levelRows = sorted;
      for (const name of lensPath) {
        const node = levelRows.find((r) => r.name === name);
        if (!node) break;
        nextDrill.push(node);
        if (node.isLeaf) break;
        levelRows = await getAtomLevel(node.path);
        if (cancelled) return;
        childMap.set(node.path, levelRows);
      }
      setDrill(nextDrill);
      setChildrenByPath(childMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [lensPath.join(' / ')]);

  async function ensureChildren(path: string) {
    if (childrenByPath.has(path)) return;
    const rows = await getAtomLevel(path);
    setChildrenByPath((m) => new Map(m).set(path, rows));
  }

  function pickNode(level: number, node: AtomLevelRow) {
    const next = drill.slice(0, level).concat(node);
    setDrill(next);
    const rid = REALM_ID_BY_NAME[next[0].name] ?? null;
    onSelectPath(
      rid,
      next.map((d) => d.name),
    );
    if (!node.isLeaf) void ensureChildren(node.path);
  }

  function clearAll() {
    setDrill([]);
    onClear();
  }

  const activeRealmName = drill[0]?.name ?? null;
  const offGrid = realmAstra?.status !== 'active';
  const astraLabel = realmAstra?.displayName ?? (hasRealmAstra ? 'Astra' : null);

  const deeperRows: { level: number; nodes: AtomLevelRow[] }[] = [];
  for (let i = 0; i < drill.length; i++) {
    if (drill[i].isLeaf) continue;
    const kids = childrenByPath.get(drill[i].path);
    if (kids && kids.length > 0) deeperRows.push({ level: i + 1, nodes: kids });
  }

  return (
    <div className="space-y-1 p-1.5">
      <DepthRow level={0}>
        <Chip level={0} label="All" active={drill.length === 0} onClick={clearAll} />
        <Divider />
        {roots.map((node) => (
          <Chip
            key={node.id}
            level={0}
            label={node.name}
            active={activeRealmName === node.name}
            onClick={() => pickNode(0, node)}
          />
        ))}
        {hasRealmAstra && astraLabel && (
          <>
            <Divider />
            <button
              type="button"
              onClick={onJump}
              disabled={offGrid}
              title={offGrid ? `${astraLabel} — coming soon` : `Jump to ${astraLabel}`}
              className={cn(
                'flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1 transition-colors',
                offGrid ? 'cursor-default opacity-70' : 'hover:bg-white/[0.06]',
              )}
              style={{ borderColor: `${HONEY}40`, color: HONEY, fontSize: '12px' }}
            >
              {astraLabel}
              {offGrid ? (
                <span
                  className="rounded px-1 font-mono uppercase"
                  style={{
                    fontSize: '8.5px',
                    background: `${HONEY}1A`,
                    border: `1px solid ${HONEY}33`,
                  }}
                  data-size="meta"
                >
                  Soon
                </span>
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          </>
        )}
      </DepthRow>

      {deeperRows.map((row) => {
        const activeName = drill[row.level]?.name;
        return (
          <DepthRow key={`row-${row.level}`} level={row.level}>
            {row.nodes.map((node) => (
              <Chip
                key={node.path}
                level={row.level}
                label={node.name}
                active={activeName === node.name}
                onClick={() => pickNode(row.level, node)}
              />
            ))}
          </DepthRow>
        );
      })}
    </div>
  );
}

function DepthRow({ level, children }: { level: number; children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-md"
      style={{ background: rampAt(DEPTH_BG, level), border: '1px solid rgba(0,0,0,0.25)' }}
    >
      <ScrollRow>{children}</ScrollRow>
    </div>
  );
}

function Chip({
  level,
  label,
  active,
  onClick,
}: { level: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 whitespace-nowrap tracking-wide transition-all',
        !active && 'hover:bg-white/[0.06]',
      )}
      style={{
        borderRadius: '6px',
        padding: '4px 11px',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        background: active ? HONEY : 'transparent',
        color: active ? '#0B0B0D' : rampAt(DEPTH_TEXT, level),
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="h-5 w-px flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.10)' }}
      aria-hidden="true"
    />
  );
}

/* ───────────────────────── Time panel (silver, light rows) ───────────────────────── */

// The Time lens IS the INTEL feed-sort selector (pass 13): each maps straight to
// a forum_thread_feed sort value via the intel store's feedSort.
const SORT_OPTIONS: { sort: FeedSort; label: string; sub: string }[] = [
  { sort: 'trending', label: 'Trending', sub: 'Rising now — ranked momentum' },
  { sort: 'new', label: 'Breaking', sub: 'Newest first — most recent' },
  { sort: 'top', label: 'Top', sub: 'Highest net score — all time' },
];

export function TimePanel() {
  const { feedSort, setFeedSort } = useIntelStore();

  return (
    <div className="p-2">
      <div
        className="px-2 pb-1 font-mono uppercase tracking-wider"
        style={{ fontSize: '10px', color: ON_SILVER_MUTED }}
        data-size="meta"
      >
        Sort the feed
      </div>
      {SORT_OPTIONS.map((opt) => {
        const active = feedSort === opt.sort;
        return (
          <button
            key={opt.sort}
            type="button"
            onClick={() => setFeedSort(opt.sort)}
            className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left transition-colors hover:bg-white"
            style={{ background: active ? '#FFFFFF' : 'transparent' }}
          >
            <span>
              <span
                style={{
                  fontSize: '12.5px',
                  color: active ? INTEL_COLOR : ON_SILVER,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {opt.label}
              </span>
              <span className="block" style={{ fontSize: '11px', color: ON_SILVER_MUTED }}>
                {opt.sub}
              </span>
            </span>
            {active && <ChevronRight size={12} style={{ color: INTEL_COLOR }} />}
          </button>
        );
      })}

      <div
        className="mt-2 border-t px-2 pb-1 pt-2 font-mono uppercase tracking-wider"
        style={{ fontSize: '10px', color: ON_SILVER_MUTED, borderColor: 'rgba(0,0,0,0.12)' }}
        data-size="meta"
      >
        Time period (era)
      </div>
      <p className="px-3 py-1.5" style={{ fontSize: '11.5px', color: ON_SILVER_MUTED }}>
        Era search lands once content carries a date/era field.
      </p>
    </div>
  );
}

/* ───────────────────────── Stub panel (silver) ───────────────────────── */

export function StubPanel({ line, note }: { line: string; note: string }) {
  return (
    <div className="p-4">
      <p style={{ fontSize: '12.5px', color: ON_SILVER }}>{line}</p>
      {note && (
        <p className="mt-1.5" style={{ fontSize: '11px', color: ON_SILVER_MUTED }}>
          {note}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Time-preset panel (white) ───────────────────────── */

/** Time-window presets — picks `useLensStore.timePreset` (drives the feeds'
    p_after at fetch time). Selecting one closes the popup. */
export function TimePresetPanel({ onClose }: { onClose: () => void }) {
  const timePreset = useLensStore((s) => s.timePreset);
  const setTimePreset = useLensStore((s) => s.setTimePreset);

  return (
    <div className="bg-white p-2">
      <div
        className="px-2 pb-1 font-mono uppercase tracking-wider text-zinc-500"
        style={{ fontSize: '10px' }}
        data-size="meta"
      >
        Time window
      </div>
      {TIME_PRESETS.map((p) => {
        const active = timePreset === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setTimePreset(p.key);
              onClose();
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left transition-colors',
              active ? 'bg-zinc-100' : 'hover:bg-zinc-100',
            )}
          >
            <span
              style={{
                fontSize: '12.5px',
                color: active ? INTEL_COLOR : '#3f3f46',
                fontWeight: active ? 600 : 400,
              }}
            >
              {p.label}
            </span>
            {active && <ChevronRight size={12} style={{ color: INTEL_COLOR }} />}
          </button>
        );
      })}
    </div>
  );
}
