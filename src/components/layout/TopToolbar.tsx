import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Rabbit,
  MapPin,
  LayoutGrid,
  Puzzle,
  Clock,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { REALM_ORDER, REALM_NAMES } from '@/lib/constants';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { useManualData } from '@/lib/useManualData';
import { useIntelStore, type TimeWindow } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import { useAstra } from '@/lib/astras/AstraContext';
import { useAstraRegistry, type AstraRow } from '@/lib/astras/useAstraRegistry';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { SearchModal } from '@/components/layout/SearchModal';
import { cn } from '@/lib/utils';
import type { RealmId, TreeNode } from '@/types/manual';

const INTEL_COLOR = '#6B94C8';
const HONEY = '#FAD15E';

// Silver popup palette (dispatch A5). Popups only — toolbar strip + page dark.
const SILVER = '#CBD3DC';
const SILVER_BORDER = '#A9B2BD';
const SILVER_SHEEN = 'inset 0 1px 0 rgba(255,255,255,0.65)';
const ON_SILVER = '#1A1C20';
const ON_SILVER_MUTED = '#51565E';

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
  'bling', 'intel', 'unite', 'rule', 'comms', 'give', 'chat', 'pulse',
  'bazaar', 'brand', 'prize', 'promotion', 'manual', 'secure', 'safe',
  'production', 'edu', 'vote', 'legal',
]);

function surfaceFromPath(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg ?? null;
}

type ControlId = 'search' | 'realms' | 'location' | 'astras' | 'addons' | 'time';

interface ControlDef {
  id: ControlId;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

// lucide stand-ins for the ti-* set (swappable placeholders).
const CONTROLS: ControlDef[] = [
  { id: 'search', label: 'Search', icon: Search, primary: true },
  { id: 'realms', label: 'Realm', icon: Rabbit },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'astras', label: 'Astra', icon: LayoutGrid },
  { id: 'addons', label: 'Addon', icon: Puzzle },
  { id: 'time', label: 'Time', icon: Clock },
];

/**
 * Top Top toolbar — GLOBAL platform chrome (dispatch A1).
 *
 * Identical on every surface: six icon controls (Search · Realms · Location ·
 * Astras · Addons · Time) + a breadcrumb. Each control opens a closeable,
 * NON-MODAL silver popup anchored beneath it (click-outside / Esc / X dismiss).
 *
 * Realms is a cross-Astra topic lens (Part B): picking a realm sets the
 * platform lens + routes to /realm/:realmId.
 */
export function TopToolbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const astra = useAstra();
  const { tree } = useManualData();
  const registry = useAstraRegistry();

  const { realmId, l2, l3, setLens, setSource } = useLensStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<ControlId | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [anchorLeft, setAnchorLeft] = useState(0);
  const [containerW, setContainerW] = useState(0);

  // Full-depth drill state for the Realms popup (index 0 = realm node).
  const [drill, setDrill] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (openId !== 'realms') return;
    const next: TreeNode[] = [];
    if (realmId) {
      const realmNode = tree.children.find((c) => c.realmId === realmId);
      if (realmNode) {
        next.push(realmNode);
        if (l2) {
          const l2Node = realmNode.children.find((c) => c.name === l2);
          if (l2Node) {
            next.push(l2Node);
            if (l3) {
              const l3Node = l2Node.children.find((c) => c.name === l3);
              if (l3Node) next.push(l3Node);
            }
          }
        }
      }
    }
    setDrill(next);
  }, [openId, realmId, l2, l3, tree]);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openId]);

  function handleControlClick(id: ControlId, btn: HTMLButtonElement) {
    if (id === 'search') {
      setOpenId(null);
      setSearchOpen(true);
      return;
    }
    if (openId === id) {
      setOpenId(null);
      return;
    }
    const container = containerRef.current;
    if (container) {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setAnchorLeft(bRect.left - cRect.left);
      setContainerW(cRect.width);
    }
    setOpenId(id);
  }

  // Realms pick → set the platform lens (full drilled path) + route to the
  // cross-Astra realm feed. Every drill level narrows the feed by realm_path prefix.
  function pickAtLevel(level: number, node: TreeNode) {
    const next = drill.slice(0, level).concat(node);
    setDrill(next);
    const rid = (next[0]?.realmId || null) as RealmId | null;
    setLens(rid, next.map((n) => n.name));
    if (rid) {
      // Default the Source chip to the surface the realm was picked from.
      const surf = surfaceFromPath(location.pathname);
      setSource(surf && PARENT_SURFACES.has(surf) ? surf : 'all');
      navigate(`/realm/${rid}`);
    }
  }

  function clearRealms() {
    setDrill([]);
    setLens(null, []);
    setSource('all');
    if (location.pathname.startsWith('/realm/')) navigate('/intel');
  }

  const activeRealmId = (drill[0]?.realmId ?? realmId) as RealmId | null;
  const realmAstraSlug = activeRealmId
    ? registry.realmAstraSlug[activeRealmId] ?? null
    : null;
  const realmAstra = realmAstraSlug ? registry.bySlug.get(realmAstraSlug) ?? null : null;

  function jumpToAstra() {
    if (!activeRealmId || !realmAstraSlug) return;
    if (realmAstra?.status === 'active') {
      setOpenId(null);
      navigate(`/${activeRealmId}`);
    }
  }

  // Breadcrumb: realm path when a realm is set; else Home › <current Astra>.
  const currentName =
    SURFACE_BY_SLUG.get(surfaceFromPath(location.pathname) ?? '')?.name ??
    astra?.wordmark ??
    'TheMANUAL.tech';

  return (
    <div ref={containerRef} className="sticky top-0 z-30">
      {/* Toolbar strip — stays dark */}
      <div className="border-b border-border" style={{ background: '#141519' }}>
        <div className="flex items-center justify-between gap-1 px-2 py-1.5 md:justify-start md:px-3">
          {CONTROLS.map((c) => {
            const Icon = c.icon;
            const active = openId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={(e) => handleControlClick(c.id, e.currentTarget)}
                title={c.label}
                aria-label={c.label}
                aria-expanded={active}
                className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors md:px-2.5',
                  active ? 'bg-bg text-text' : 'text-text-silver hover:bg-white/[0.06]',
                  c.primary && !active && 'bg-white/[0.05]',
                )}
              >
                <Icon size={16} className="flex-shrink-0" style={active ? { color: INTEL_COLOR } : undefined} />
                <span className="hidden tracking-wide md:inline" style={{ fontSize: '12.5px' }}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb strip — stays dark */}
      <Breadcrumb
        realmId={realmId}
        l2={l2}
        l3={l3}
        currentName={currentName}
        onClear={clearRealms}
        onRealm={() => {
          if (realmId) {
            setLens(realmId, [REALM_NAMES[realmId]]);
            navigate(`/realm/${realmId}`);
          }
        }}
        onL2={() => realmId && l2 && setLens(realmId, [REALM_NAMES[realmId], l2])}
      />

      {/* ── Popups (silver, non-modal) ── */}
      {openId === 'realms' && (
        <Popup full anchorLeft={anchorLeft} containerW={containerW} title="Realm" onClose={() => setOpenId(null)}>
          <RealmsPanel
            tree={tree}
            drill={drill}
            activeRealmId={activeRealmId}
            realmAstra={realmAstra}
            hasRealmAstra={Boolean(realmAstraSlug)}
            onPick={pickAtLevel}
            onClear={clearRealms}
            onJump={jumpToAstra}
          />
        </Popup>
      )}

      {openId === 'astras' && (
        <Popup anchorLeft={anchorLeft} containerW={containerW} width={560} title="Astra" onClose={() => setOpenId(null)}>
          <AstrasPanel registry={registry} />
        </Popup>
      )}

      {openId === 'addons' && (
        <Popup anchorLeft={anchorLeft} containerW={containerW} width={420} title="Addon" onClose={() => setOpenId(null)}>
          <StubPanel line="No addon registry wired yet." note="The current Astra's addon grid lands once an addon registry exists." />
        </Popup>
      )}

      {openId === 'location' && (
        <Popup anchorLeft={anchorLeft} containerW={containerW} width={300} title="Location" onClose={() => setOpenId(null)}>
          <StubPanel line="No location field wired yet." note="Geo scoping attaches here once content carries a location." />
        </Popup>
      )}

      {openId === 'time' && (
        <Popup anchorLeft={anchorLeft} containerW={containerW} width={300} title="Time" onClose={() => setOpenId(null)}>
          <TimePanel />
        </Popup>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

/* ───────────────────────── Popup shell (silver) ───────────────────────── */

function Popup({
  anchorLeft,
  containerW,
  width,
  full,
  title,
  children,
  onClose,
}: {
  anchorLeft: number;
  containerW: number;
  width?: number;
  full?: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  let style: React.CSSProperties;
  if (full) {
    style = { top: '100%', left: 8, right: 8 };
  } else {
    const w = Math.min(width ?? 320, Math.max(220, containerW - 16));
    const left = Math.max(8, Math.min(anchorLeft, containerW - w - 8));
    style = { top: '100%', left, width: w };
  }

  return (
    <div className="absolute z-50" style={style}>
      <div
        className="mt-1 overflow-hidden rounded-lg border shadow-xl"
        style={{ background: SILVER, borderColor: SILVER_BORDER, boxShadow: `${SILVER_SHEEN}, 0 8px 24px rgba(0,0,0,0.45)` }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: 'rgba(0,0,0,0.12)' }}
        >
          <span className="font-mono uppercase tracking-wider" style={{ fontSize: '10.5px', color: ON_SILVER_MUTED }} data-size="meta">
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

function RealmsPanel({
  tree,
  drill,
  activeRealmId,
  realmAstra,
  hasRealmAstra,
  onPick,
  onClear,
  onJump,
}: {
  tree: TreeNode;
  drill: TreeNode[];
  activeRealmId: RealmId | null;
  realmAstra: AstraRow | null;
  hasRealmAstra: boolean;
  onPick: (level: number, node: TreeNode) => void;
  onClear: () => void;
  onJump: () => void;
}) {
  const realmNodes = REALM_ORDER.map((id) => tree.children.find((c) => c.realmId === id)).filter(
    (n): n is TreeNode => Boolean(n),
  );

  const deeperRows: { level: number; nodes: TreeNode[] }[] = [];
  for (let i = 0; i < drill.length; i++) {
    const node = drill[i];
    if (node.children.length > 0) deeperRows.push({ level: i + 1, nodes: node.children });
  }

  const offGrid = realmAstra?.status !== 'active';
  const astraLabel = realmAstra?.displayName ?? (hasRealmAstra ? 'Astra' : null);

  // Dark depth-ramp rows on the silver box: padded so silver shows as gaps,
  // each strip rounded with a hairline so even the lightest level separates.
  return (
    <div className="space-y-1 p-1.5">
      <DepthRow level={0}>
        <Chip level={0} label="All" active={!activeRealmId} onClick={onClear} />
        <Divider />
        {realmNodes.map((node) => (
          <Chip
            key={node.realmId}
            level={0}
            label={REALM_NAMES[node.realmId as RealmId]}
            active={activeRealmId === node.realmId}
            onClick={() => onPick(0, node)}
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
                  style={{ fontSize: '8.5px', background: `${HONEY}1A`, border: `1px solid ${HONEY}33` }}
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
                onClick={() => onPick(row.level, node)}
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
      style={{
        background: rampAt(DEPTH_BG, level),
        border: '1px solid rgba(0,0,0,0.25)',
      }}
    >
      <ScrollRow>{children}</ScrollRow>
    </div>
  );
}

function Chip({ level, label, active, onClick }: { level: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex-shrink-0 whitespace-nowrap tracking-wide transition-all', !active && 'hover:bg-white/[0.06]')}
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
  return <div className="h-5 w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }} aria-hidden="true" />;
}

/* ───────────────────────── Astras panel (silver, light tiles) ─────────────────────── */

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function AstrasPanel({ registry }: { registry: ReturnType<typeof useAstraRegistry> }) {
  if (!registry.loaded) return <StubPanel line="Loading Astras…" note="" />;
  if (registry.error) return <StubPanel line="Couldn't load the Astra registry." note={registry.error} />;
  if (registry.gridGroups.length === 0)
    return <StubPanel line="Sign in to browse the Astra constellation." note="The Astra registry is visible to signed-in Bees." />;

  return (
    <div className="p-3">
      {registry.gridGroups.map(({ group, astras }) => (
        <div key={group} className="mb-3 last:mb-0">
          <div className="mb-1.5 font-mono uppercase tracking-wider" style={{ fontSize: '10px', color: ON_SILVER_MUTED }} data-size="meta">
            {group}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {astras.map((a) => {
              const target = a.linkRedirectSlug ? registry.bySlug.get(a.linkRedirectSlug) ?? a : a;
              const redirected = target.slug !== a.slug;
              const offGrid = target.status !== 'active';
              const hue = hashHue(a.slug);
              return (
                <button
                  key={a.slug}
                  type="button"
                  disabled={offGrid}
                  onClick={() => {
                    if (!offGrid && target.domain) window.open(`https://${target.domain}`, '_blank', 'noopener');
                  }}
                  title={
                    offGrid
                      ? `${a.displayName}${redirected ? ` → ${target.displayName}` : ''} — coming soon`
                      : `${a.displayName}${redirected ? ` → ${target.displayName}` : ''} — ${target.domain ?? ''}`
                  }
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border px-1.5 py-2.5 text-center transition-colors',
                    offGrid ? 'cursor-default' : 'hover:brightness-95',
                  )}
                  style={{ background: '#FFFFFF', borderColor: 'rgba(0,0,0,0.10)' }}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg font-display font-semibold"
                    style={{
                      fontSize: '13px',
                      color: `hsl(${hue} 55% 38%)`,
                      background: `hsl(${hue} 55% 50% / 0.14)`,
                      border: `1px solid hsl(${hue} 50% 45% / 0.30)`,
                      opacity: offGrid ? 0.85 : 1,
                    }}
                  >
                    {a.defaultName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="w-full truncate tracking-wide" style={{ fontSize: '10.5px', color: ON_SILVER, opacity: offGrid ? 0.85 : 1 }}>
                    {a.defaultName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Time panel (silver, light rows) ───────────────────────── */

const WINDOW_OPTIONS: { hours: TimeWindow; label: string }[] = [
  { hours: 1, label: 'Past hour' },
  { hours: 4, label: 'Past 4 hours' },
  { hours: 12, label: 'Past 12 hours' },
  { hours: 24, label: 'Past 24 hours' },
  { hours: 48, label: 'Past 48 hours' },
  { hours: 72, label: 'Past 72 hours' },
  { hours: 0, label: 'All time' },
];

function TimePanel() {
  const { activeView, hotWindow, breakingWindow, setHotWindow, setBreakingWindow } = useIntelStore();
  const mode: 'hot' | 'breaking' | null =
    activeView === 'hot' ? 'hot' : activeView === 'new' ? 'breaking' : null;
  const value = mode === 'hot' ? hotWindow : mode === 'breaking' ? breakingWindow : null;
  const setValue = (h: TimeWindow) =>
    mode === 'hot' ? setHotWindow(h) : mode === 'breaking' ? setBreakingWindow(h) : undefined;
  const verb = mode === 'hot' ? 'Hot' : 'Breaking';

  return (
    <div className="p-2">
      <div className="px-2 pb-1 font-mono uppercase tracking-wider" style={{ fontSize: '10px', color: ON_SILVER_MUTED }} data-size="meta">
        {mode ? `${verb} window` : 'Recency window'}
      </div>
      {mode ? (
        WINDOW_OPTIONS.map((opt) => {
          const active = value === opt.hours;
          return (
            <button
              key={opt.hours}
              type="button"
              onClick={() => setValue(opt.hours)}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left transition-colors hover:bg-white"
              style={{ fontSize: '12.5px', color: ON_SILVER, background: active ? '#FFFFFF' : 'transparent' }}
            >
              <span>
                <span style={{ color: ON_SILVER_MUTED }}>{verb} in </span>
                <span style={active ? { color: INTEL_COLOR, fontWeight: 600 } : undefined}>{opt.label.toLowerCase()}</span>
              </span>
              {active && <ChevronRight size={12} style={{ color: INTEL_COLOR }} />}
            </button>
          );
        })
      ) : (
        <p className="px-3 py-1.5" style={{ fontSize: '11.5px', color: ON_SILVER_MUTED }}>
          Recency applies to the Hot and Breaking views.
        </p>
      )}

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

function StubPanel({ line, note }: { line: string; note: string }) {
  return (
    <div className="p-4">
      <p style={{ fontSize: '12.5px', color: ON_SILVER }}>{line}</p>
      {note && <p className="mt-1.5" style={{ fontSize: '11px', color: ON_SILVER_MUTED }}>{note}</p>}
    </div>
  );
}

/* ───────────────────────── Breadcrumb (dark strip) ───────────────────────── */

function Breadcrumb({
  realmId,
  l2,
  l3,
  currentName,
  onClear,
  onRealm,
  onL2,
}: {
  realmId: RealmId | null;
  l2: string | null;
  l3: string | null;
  currentName: string;
  onClear: () => void;
  onRealm: () => void;
  onL2: () => void;
}) {
  const realmName = realmId ? REALM_NAMES[realmId] : null;

  const segs: { label: string; onClick?: () => void }[] = [];
  if (realmName) {
    segs.push({ label: realmName, onClick: l2 || l3 ? onRealm : undefined });
    if (l2) segs.push({ label: l2, onClick: l3 ? onL2 : undefined });
    if (l3) segs.push({ label: l3 });
  } else {
    // No realm set → generic crumb (Home › current Astra/surface).
    segs.push({ label: currentName });
  }

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-1.5"
      style={{ background: '#0F1014', scrollbarWidth: 'none' }}
    >
      <button
        type="button"
        onClick={onClear}
        className={cn('flex-shrink-0 tracking-wide transition-colors', realmName ? 'text-text-muted hover:text-text-silver' : 'text-text-silver')}
        style={{ fontSize: '12px' }}
        disabled={!realmName}
      >
        Home
      </button>
      {segs.map((seg, i) => {
        const deepest = i === segs.length - 1;
        const isRealmCrumb = Boolean(realmName);
        return (
          <span key={`${seg.label}-${i}`} className="flex flex-shrink-0 items-center gap-1">
            <ChevronRight size={12} className="flex-shrink-0 text-text-muted" />
            {seg.onClick && !deepest ? (
              <button
                type="button"
                onClick={seg.onClick}
                className="tracking-wide text-text-muted transition-colors hover:text-text-silver"
                style={{ fontSize: '12px' }}
              >
                {seg.label}
              </button>
            ) : (
              <span
                className="tracking-wide"
                style={{
                  fontSize: '12px',
                  color: deepest && isRealmCrumb ? HONEY : deepest ? '#C8D1DA' : '#8A94A0',
                  fontWeight: deepest ? 500 : 400,
                }}
              >
                {seg.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
