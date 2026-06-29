import { SearchModal } from '@/components/layout/SearchModal';
import {
  HONEY,
  INTEL_COLOR,
  ON_SILVER,
  ON_SILVER_MUTED,
  Popup,
  RealmsPanel,
  StubPanel,
  TimePanel,
  useRealmLens,
} from '@/components/layout/lensPanels';
import { useAstraRegistry } from '@/lib/astras/useAstraRegistry';
import { REALM_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RealmId } from '@/types/manual';
import {
  ChevronRight,
  Clock,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Puzzle,
  Rabbit,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ControlId = 'search' | 'realms' | 'location' | 'astras' | 'addons' | 'time';

interface ControlDef {
  id: ControlId;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

// lucide stand-ins for the ti-* set (swappable placeholders).
// Locked left→right order: Search · Realm · Location · Time · Astra · Addon.
const CONTROLS: ControlDef[] = [
  { id: 'search', label: 'Search', icon: Search, primary: true },
  { id: 'realms', label: 'Realm', icon: Rabbit },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'astras', label: 'Astra', icon: LayoutGrid },
  { id: 'addons', label: 'Addon', icon: Puzzle },
];

/**
 * Top Top toolbar — GLOBAL platform chrome (dispatch A1).
 *
 * Still mounted on non-community surfaces. Community surfaces (INTEL / UNITE /
 * RULE / GiVE) render the white-shell GlobalSidebar instead, which reuses the
 * same lens panels via lensPanels.tsx.
 */
export function TopToolbar() {
  const registry = useAstraRegistry();
  const {
    realmId,
    l2,
    l3,
    lensPath,
    realmAstra,
    hasRealmAstra,
    handleSelectPath,
    clearRealms,
    jumpToAstra,
    onRealm,
    onL2,
    currentName,
  } = useRealmLens();

  const containerRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<ControlId | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [anchorLeft, setAnchorLeft] = useState(0);
  const [containerW, setContainerW] = useState(0);

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
                <Icon
                  size={16}
                  className="flex-shrink-0"
                  style={active ? { color: INTEL_COLOR } : undefined}
                />
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
        onRealm={onRealm}
        onL2={onL2}
      />

      {/* ── Popups (silver, non-modal) ── */}
      {openId === 'realms' && (
        <Popup
          full
          anchorLeft={anchorLeft}
          containerW={containerW}
          title="Realm"
          onClose={() => setOpenId(null)}
        >
          <RealmsPanel
            lensPath={lensPath}
            realmAstra={realmAstra}
            hasRealmAstra={hasRealmAstra}
            onSelectPath={handleSelectPath}
            onClear={clearRealms}
            onJump={jumpToAstra}
          />
        </Popup>
      )}

      {openId === 'astras' && (
        <Popup
          anchorLeft={anchorLeft}
          containerW={containerW}
          width={560}
          title="Astra"
          onClose={() => setOpenId(null)}
        >
          <AstrasPanel registry={registry} />
        </Popup>
      )}

      {openId === 'addons' && (
        <Popup
          anchorLeft={anchorLeft}
          containerW={containerW}
          width={420}
          title="Addon"
          onClose={() => setOpenId(null)}
        >
          <StubPanel
            line="No addon registry wired yet."
            note="The current Astra's addon grid lands once an addon registry exists."
          />
        </Popup>
      )}

      {openId === 'location' && (
        <Popup
          anchorLeft={anchorLeft}
          containerW={containerW}
          width={300}
          title="Location"
          onClose={() => setOpenId(null)}
        >
          <StubPanel
            line="No location field wired yet."
            note="Geo scoping attaches here once content carries a location."
          />
        </Popup>
      )}

      {openId === 'time' && (
        <Popup
          anchorLeft={anchorLeft}
          containerW={containerW}
          width={300}
          title="Time"
          onClose={() => setOpenId(null)}
        >
          <TimePanel />
        </Popup>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

/* ───────────────────────── Astras panel (silver, light tiles) ─────────────────────── */

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function AstrasPanel({ registry }: { registry: ReturnType<typeof useAstraRegistry> }) {
  const navigate = useNavigate();
  if (!registry.loaded) return <StubPanel line="Loading Astras…" note="" />;
  if (registry.error)
    return <StubPanel line="Couldn't load the Astra registry." note={registry.error} />;
  if (registry.gridGroups.length === 0)
    return (
      <StubPanel
        line="Sign in to browse the Astra constellation."
        note="The Astra registry is visible to signed-in Bees."
      />
    );

  return (
    <div className="p-3">
      {registry.gridGroups.map(({ group, astras }) => (
        <div key={group} className="mb-3 last:mb-0">
          <div
            className="mb-1.5 font-mono uppercase tracking-wider"
            style={{ fontSize: '10px', color: ON_SILVER_MUTED }}
            data-size="meta"
          >
            {group}
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {astras.map((a) => {
              // No own domain + a link_redirect_slug ⇒ this Astra is served by a
              // live in-app surface (Bazaar → /bazaar, Media → /pulse): route
              // internally and stay clickable regardless of off_grid status.
              // Anything with its own domain (Atlas*, TheHoneycomb.games) routes
              // out there ("coming soon" until that domain is live).
              const internalSlug = !a.domain && a.linkRedirectSlug ? a.linkRedirectSlug : null;
              const externalDomain = !internalSlug && a.status === 'active' ? a.domain : null;
              const disabled = !internalSlug && !externalDomain;
              const hue = hashHue(a.slug);
              return (
                <button
                  key={a.slug}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (internalSlug) navigate(`/${internalSlug}`);
                    else if (externalDomain)
                      window.open(`https://${externalDomain}`, '_blank', 'noopener');
                  }}
                  title={
                    internalSlug
                      ? `${a.displayName} → /${internalSlug}`
                      : externalDomain
                        ? `${a.displayName} — ${externalDomain}`
                        : `${a.displayName} — coming soon`
                  }
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border px-1.5 py-2.5 text-center transition-colors',
                    disabled ? 'cursor-default' : 'hover:brightness-95',
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
                      opacity: disabled ? 0.85 : 1,
                    }}
                  >
                    {a.defaultName.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="w-full truncate tracking-wide"
                    style={{ fontSize: '10.5px', color: ON_SILVER, opacity: disabled ? 0.85 : 1 }}
                  >
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
        className={cn(
          'flex-shrink-0 tracking-wide transition-colors',
          realmName ? 'text-text-muted hover:text-text-silver' : 'text-text-silver',
        )}
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
