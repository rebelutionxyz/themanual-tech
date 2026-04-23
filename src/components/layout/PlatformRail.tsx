import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import {
  SURFACES,
  SURFACE_GROUPS,
  getSurfacesByGroup,
  type SurfaceDef,
} from '@/lib/surfaces';
import { cn } from '@/lib/utils';

/**
 * Right-side platform rail.
 * - Icon rail (~56px wide, always visible on desktop)
 * - Hover an icon → peek popup (temporary)
 * - Click an icon → pin popup (persists until dismissed or another opened)
 * - Popup is color-coded with that surface's accent color
 * - Mobile: rail hidden, swipe-from-right reveals drawer with all surfaces
 */
export function PlatformRail() {
  const location = useLocation();
  const activeSlug =
    location.pathname.length > 1 ? location.pathname.slice(1).split('/')[0] : null;

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Which popup to show: pinned takes priority, else hovered
  const popupSlug = pinnedSlug ?? hoveredSlug;
  const popupSurface = popupSlug ? SURFACES.find((s) => s.slug === popupSlug) : null;

  // Close pin when clicking outside
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pinnedSlug) return;
    const onDown = (e: MouseEvent) => {
      if (!railRef.current) return;
      if (!railRef.current.contains(e.target as Node)) {
        setPinnedSlug(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pinnedSlug]);

  // ESC closes pinned popup
  useEffect(() => {
    if (!pinnedSlug && !drawerOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedSlug(null);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [pinnedSlug, drawerOpen]);

  // Swipe-from-right gesture for mobile
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
      const dx = touchStartX - endX; // positive = swipe left
      const dy = Math.abs(touchStartY - endY);

      // Open drawer: swipe from right edge leftward, horizontal dominant
      if (!drawerOpen && touchStartX > window.innerWidth - 30 && dx > 40 && dy < 40) {
        setDrawerOpen(true);
      }
      // Close drawer: swipe rightward when drawer is open
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

  const handleIconClick = useCallback(
    (slug: string) => {
      setPinnedSlug((current) => (current === slug ? null : slug));
    },
    [],
  );

  return (
    <>
      {/* Desktop rail — always visible */}
      <div
        ref={railRef}
        className="relative z-40 hidden md:block"
        onMouseLeave={() => {
          if (!pinnedSlug) setHoveredSlug(null);
        }}
      >
        <aside
          className="flex h-full w-14 flex-col overflow-y-auto border-l border-border bg-bg-elevated/60"
          aria-label="Platform surfaces"
        >
          {SURFACE_GROUPS.map((group) => {
            const surfaces = getSurfacesByGroup(group);
            return (
              <div key={group} className="py-2">
                <div className="mx-auto mb-1 h-px w-6 bg-border" aria-hidden="true" />
                <ul className="space-y-0.5 px-2">
                  {surfaces.map((s) => (
                    <li key={s.slug}>
                      <RailIcon
                        surface={s}
                        active={activeSlug === s.slug}
                        hovered={hoveredSlug === s.slug}
                        pinned={pinnedSlug === s.slug}
                        onHover={() => !pinnedSlug && setHoveredSlug(s.slug)}
                        onClick={() => handleIconClick(s.slug)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>

        {/* Popup — slides out from LEFT of the rail (toward content) */}
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

      {/* Mobile drawer — hidden until swipe */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeSlug={activeSlug}
      />

      {/* Mobile swipe hint tab */}
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

function RailIcon({
  surface,
  active,
  hovered,
  pinned,
  onHover,
  onClick,
}: {
  surface: SurfaceDef;
  active: boolean;
  hovered: boolean;
  pinned: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const Icon = surface.icon;
  const highlighted = active || hovered || pinned;

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
      {/* Active indicator — small dot on left edge */}
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
      className="absolute right-14 top-0 z-50 w-64 animate-slide-in-right"
      style={{ maxHeight: 'calc(100vh - 56px)' }}
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
        {/* Header with surface color */}
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
              style={{
                fontSize: '15px',
                color: surface.color,
              }}
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

        {/* Body: primary action + quick links */}
        <div className="p-3">
          <Link
            to={`/${surface.slug}`}
            className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
            style={{
              borderColor: surface.color + '30',
              color: surface.color,
            }}
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

        {/* Footer */}
        <div
          className="border-t px-3 py-2"
          style={{ borderColor: surface.color + '20' }}
        >
          <p
            className="font-mono text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {pinned ? 'Pinned · click icon or press Esc to close' : 'Hover · click to pin'}
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Drawer from right */}
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
                        style={
                          activeSlug === s.slug ? { color: s.color } : undefined
                        }
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

/** Quick actions shown per surface in the popup */
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
