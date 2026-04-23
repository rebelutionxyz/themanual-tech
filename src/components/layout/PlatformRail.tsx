import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronRight, PanelRightOpen, PanelRightClose } from 'lucide-react';
import {
  SURFACES,
  SURFACE_GROUPS,
  getSurfacesByGroup,
  type SurfaceDef,
} from '@/lib/surfaces';
import { cn } from '@/lib/utils';

/**
 * Right-side platform rail.
 *
 * Desktop:
 * - Default: ~56px icon rail, always visible
 * - Click top toggle → expands to ~180px with labels (like left sidebar)
 * - Click any surface icon in expanded mode → navigate + auto-collapse
 * - Hover an icon in collapsed mode → surface popup peeks
 * - Click an icon in collapsed mode → surface popup pins
 *
 * Mobile:
 * - Rail hidden
 * - Swipe from right edge OR tap small tab → drawer slides in showing all surfaces
 */
export function PlatformRail() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSlug =
    location.pathname.length > 1 ? location.pathname.slice(1).split('/')[0] : null;

  const [expanded, setExpanded] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const railRef = useRef<HTMLDivElement>(null);

  // Popups only apply in COLLAPSED mode
  const popupSlug = !expanded ? pinnedSlug ?? hoveredSlug : null;
  const popupSurface = popupSlug ? SURFACES.find((s) => s.slug === popupSlug) : null;

  // Close popup pin when clicking outside
  useEffect(() => {
    if (!pinnedSlug) return;
    const onDown = (e: MouseEvent) => {
      if (!railRef.current?.contains(e.target as Node)) {
        setPinnedSlug(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pinnedSlug]);

  // ESC closes anything open
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pinnedSlug) setPinnedSlug(null);
      if (drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [pinnedSlug, drawerOpen]);

  // Swipe-from-right gesture (mobile)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const onStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = touchStartX - endX;
      const dy = Math.abs(touchStartY - endY);
      if (!drawerOpen && touchStartX > window.innerWidth - 30 && dx > 40 && dy < 40) {
        setDrawerOpen(true);
      }
      if (drawerOpen && dx < -40 && dy < 40) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [drawerOpen]);

  // Listen for UtilityChrome's sidebar-opener event (mobile only)
  useEffect(() => {
    const onOpen = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) setDrawerOpen(true);
    };
    window.addEventListener('open-surfaces-drawer', onOpen);
    return () => window.removeEventListener('open-surfaces-drawer', onOpen);
  }, []);

  function handleIconClick(slug: string) {
    if (expanded) {
      // Expanded mode: clicking navigates and auto-collapses
      navigate(`/${slug}`);
      setExpanded(false);
      setPinnedSlug(null);
    } else {
      // Collapsed mode: clicking toggles pin popup
      setPinnedSlug((current) => (current === slug ? null : slug));
    }
  }

  return (
    <>
      {/* Desktop rail */}
      <div
        ref={railRef}
        className="relative z-40 hidden md:block"
        onMouseLeave={() => !pinnedSlug && setHoveredSlug(null)}
      >
        <aside
          className={cn(
            'flex h-full flex-col overflow-y-auto border-l border-border bg-bg-elevated/60 transition-[width] duration-200 ease-out',
            expanded ? 'w-48' : 'w-14',
          )}
          aria-label="Platform surfaces"
        >
          {/* Expand/collapse toggle */}
          <button
            type="button"
            onClick={() => {
              setExpanded((e) => !e);
              setPinnedSlug(null);
              setHoveredSlug(null);
            }}
            aria-label={expanded ? 'Collapse surfaces' : 'Expand surfaces'}
            className={cn(
              'flex h-12 flex-shrink-0 items-center border-b border-border text-text-silver hover:bg-bg hover:text-text',
              expanded ? 'justify-between px-3' : 'justify-center',
            )}
          >
            {expanded && (
              <span
                className="font-mono uppercase tracking-widest text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                Surfaces
              </span>
            )}
            {expanded ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* Surface list grouped */}
          <div className="flex-1">
            {SURFACE_GROUPS.map((group) => {
              const surfaces = getSurfacesByGroup(group);
              return (
                <div key={group} className="py-1.5">
                  {expanded ? (
                    <div
                      className="px-3 pb-1 font-mono uppercase tracking-wider text-text-muted"
                      style={{ fontSize: '10px' }}
                      data-size="meta"
                    >
                      {group}
                    </div>
                  ) : (
                    <div
                      className="mx-auto mb-1 h-px w-6 bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <ul className="space-y-0.5 px-2">
                    {surfaces.map((s) => (
                      <li key={s.slug}>
                        <RailItem
                          surface={s}
                          active={activeSlug === s.slug}
                          expanded={expanded}
                          hovered={hoveredSlug === s.slug}
                          pinned={pinnedSlug === s.slug}
                          onHover={() =>
                            !expanded && !pinnedSlug && setHoveredSlug(s.slug)
                          }
                          onClick={() => handleIconClick(s.slug)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Popup (collapsed mode only) — slides out to LEFT of rail */}
        {popupSurface && (
          <SurfacePopup
            surface={popupSurface}
            pinned={pinnedSlug === popupSurface.slug}
            onClose={() => {
              setPinnedSlug(null);
              setHoveredSlug(null);
            }}
            onMouseEnter={() => setHoveredSlug(popupSurface.slug)}
            onMouseLeave={() => !pinnedSlug && setHoveredSlug(null)}
          />
        )}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeSlug={activeSlug}
      />

      {/* Mobile: small tab hint when drawer is closed */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open surfaces menu"
          className="fixed right-0 top-1/2 z-30 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-l-md border-y border-l border-border bg-bg-elevated text-text-muted hover:text-text md:hidden"
        >
          <ChevronRight size={12} className="rotate-180" />
        </button>
      )}
    </>
  );
}

function RailItem({
  surface,
  active,
  expanded,
  hovered,
  pinned,
  onHover,
  onClick,
}: {
  surface: SurfaceDef;
  active: boolean;
  expanded: boolean;
  hovered: boolean;
  pinned: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const Icon = surface.icon;
  const highlighted = active || hovered || pinned;
  const isBling = surface.special === 'bling';

  if (expanded) {
    // Expanded = Link-like row with icon + name
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHover}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
          active
            ? 'bg-bg text-text'
            : 'text-text-dim hover:bg-bg hover:text-text-silver',
        )}
        title={surface.function}
      >
        <Icon
          size={16}
          className="flex-shrink-0 transition-colors"
          style={active ? { color: surface.color } : undefined}
        />
        <span
          className={cn(
            'flex-1 truncate font-medium tracking-wide',
            isBling && 'bling',
          )}
          style={{ fontSize: '13px' }}
        >
          {surface.name}
        </span>
      </button>
    );
  }

  // Collapsed = icon only
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      title={`${surface.name} — ${surface.function}`}
      className={cn(
        'group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
        highlighted
          ? 'bg-bg text-text'
          : 'text-text-muted hover:bg-bg hover:text-text-silver',
      )}
    >
      <Icon
        size={18}
        className="flex-shrink-0 transition-colors"
        style={highlighted ? { color: surface.color } : undefined}
      />
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full"
          style={{ background: surface.color }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function SurfacePopup({
  surface,
  pinned,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  surface: SurfaceDef;
  pinned: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const Icon = surface.icon;
  const isBling = surface.special === 'bling';

  return (
    <div
      className="absolute right-14 top-12 z-50 w-64 animate-slide-in-right"
      style={{ maxHeight: 'calc(100vh - 56px - 48px)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="overflow-hidden rounded-l-lg border border-r-0 shadow-lg"
        style={{
          borderColor: surface.color + '50',
          background: 'rgba(15, 18, 23, 0.98)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="flex items-center gap-2.5 border-b px-3 py-2.5"
          style={{
            borderColor: surface.color + '30',
            background: surface.color + '0F',
          }}
        >
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: surface.color + '22',
              border: `1px solid ${surface.color}40`,
            }}
          >
            <Icon size={18} style={{ color: surface.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-display tracking-wide"
              style={{ fontSize: '15px', color: surface.color }}
            >
              <span className={cn(isBling && 'bling')}>{surface.name}</span>
            </div>
            <div
              className="truncate font-mono text-text-muted"
              style={{ fontSize: '10.5px' }}
              data-size="meta"
            >
              {surface.function}
            </div>
          </div>
          {pinned && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-elevated hover:text-text"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="p-3">
          <Link
            to={`/${surface.slug}`}
            className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
            style={{ borderColor: surface.color + '30', color: surface.color }}
          >
            <span className="font-display tracking-wide" style={{ fontSize: '13px' }}>
              Open {surface.name}
            </span>
            <ChevronRight size={14} />
          </Link>

          <div
            className="mt-3 font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            Quick actions
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {getQuickActions(surface).map((qa) => (
              <li key={qa.label}>
                <Link
                  to={qa.to}
                  className="block rounded px-2 py-1 text-text-silver hover:bg-bg-elevated hover:text-text"
                  style={{ fontSize: '12.5px' }}
                >
                  {qa.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="border-t px-3 py-2"
          style={{ borderColor: surface.color + '20' }}
        >
          <p
            className="font-mono text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {pinned ? 'Pinned · Esc to close' : 'Hover · click to pin'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  activeSlug,
}: {
  open: boolean;
  onClose: () => void;
  activeSlug: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />
      <aside className="absolute right-0 top-0 flex h-full w-[82vw] max-w-sm flex-col overflow-y-auto border-l border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div
              className="font-mono uppercase tracking-wider text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              HoneyComb
            </div>
            <div className="font-display text-lg text-text-silver-bright">
              {SURFACES.length} Surfaces
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-silver hover:bg-bg-elevated"
          >
            <X size={18} />
          </button>
        </div>
        {SURFACE_GROUPS.map((group) => {
          const surfaces = getSurfacesByGroup(group);
          return (
            <div key={group} className="py-2">
              <div
                className="px-4 pb-1.5 font-mono uppercase tracking-wider text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {group}
              </div>
              <ul className="space-y-0.5 px-2">
                {surfaces.map((s) => (
                  <li key={s.slug}>
                    <Link
                      to={`/${s.slug}`}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                        activeSlug === s.slug
                          ? 'bg-bg-elevated text-text'
                          : 'text-text-dim hover:bg-bg-elevated hover:text-text-silver',
                      )}
                    >
                      <s.icon
                        size={18}
                        style={activeSlug === s.slug ? { color: s.color } : undefined}
                      />
                      <span
                        className={cn(
                          'flex-1 font-medium tracking-wide',
                          s.special === 'bling' && 'bling',
                        )}
                        style={{ fontSize: '14px' }}
                      >
                        {s.name}
                      </span>
                      <ChevronRight size={14} className="text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </aside>
    </div>
  );
}

function getQuickActions(surface: SurfaceDef): { label: string; to: string }[] {
  switch (surface.slug) {
    case 'intel':
      return [
        { label: 'Start new thread', to: '/intel/new' },
        { label: 'Hot discussions', to: '/intel' },
      ];
    case 'manual':
      return [
        { label: 'Browse realms', to: '/manual' },
        { label: 'Search atoms', to: '/manual' },
      ];
    case 'unite':
      return [
        { label: 'Discover groups', to: '/unite' },
        { label: 'My groups', to: '/unite' },
      ];
    case 'bling':
      return [
        { label: 'View balance', to: '/bling' },
        { label: 'Send BLiNG!', to: '/bling' },
      ];
    case 'bazaar':
      return [
        { label: 'Browse listings', to: '/bazaar' },
        { label: 'Create listing', to: '/bazaar' },
      ];
    default:
      return [{ label: `Open ${surface.name}`, to: `/${surface.slug}` }];
  }
}
