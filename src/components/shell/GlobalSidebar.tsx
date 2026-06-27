import {
  ASTRA_SWITCHER,
  SURFACE_FRIENDLY,
  type SidebarItem,
  astraColor,
} from '@/components/shell/sidebarNav';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { cn } from '@/lib/utils';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface GlobalSidebarProps {
  /** Active surface slug (intel / unite / rule / give). */
  activeSurface: string;
  /** Current surface Astra color. */
  accent: string;
  /** Flat per-surface item list. */
  items: SidebarItem[];
  activeItemId?: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function GlobalSidebar({
  activeSurface,
  accent,
  items,
  activeItemId,
  onSelect,
  collapsed,
  onToggleCollapse,
}: GlobalSidebarProps) {
  // Hover-to-peek while collapsed — desktop/tablet pointer affordance only
  // (matchMedia '(hover: hover)' excludes touch, where the toggle drives state).
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches === true,
  );
  const [hovering, setHovering] = useState(false);
  const peeking = collapsed && hovering && canHover;
  const shown = collapsed && !peeking; // effective collapsed for layout/content

  // Mobile (<md) drives the sidebar by tap, not by the toggle button: tap the
  // collapsed rail to open, tap the backdrop to close. Tablet + desktop keep the
  // explicit minimize toggle + hover-peek exactly as built.
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches === true,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const mobileCollapsed = isMobile && shown; // collapsed rail on mobile → tap opens
  const mobileOpen = isMobile && !shown; // expanded on mobile → tap backdrop closes
  const lockInner = mobileCollapsed ? 'pointer-events-none' : undefined;

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: mobile-only tap-to-open on the collapsed rail; keyboard users reach the same toggle via the md+ minimize button */}
      <aside
        onMouseEnter={() => canHover && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={mobileCollapsed ? onToggleCollapse : undefined}
        className={cn(
          // No float/overlap: the sidebar sits in the row ABOVE the bottom toolbar
          // (pass-9 option b), so its height is already viewport − ticker − toolbar.
          'flex h-full flex-shrink-0 flex-col bg-white transition-[width] duration-150 ease-out',
          shown ? 'w-14' : 'w-[240px]',
          mobileCollapsed && 'cursor-pointer',
          mobileOpen && 'relative z-40', // sit above the mobile close-backdrop
        )}
      >
        {/* Pinned: logo + minimize toggle, then the Astra selector. */}
        <div className={cn('flex-shrink-0 px-2 pt-3', lockInner)}>
          <div className={cn('mb-3 flex items-center gap-1.5', shown ? 'flex-col' : 'px-1')}>
            <Link
              to="/"
              className="group flex min-w-0 flex-1 items-center gap-2.5"
              aria-label="Home"
            >
              <ManualLogo size={26} className="transition-opacity group-hover:opacity-90" />
              {!shown && (
                <span className="truncate font-display text-[15px] font-semibold tracking-wide text-zinc-900">
                  HoneyComb
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
              // Hidden on mobile — tap-to-open / backdrop-to-close drives it there.
              className="hidden h-8 w-8 flex-shrink-0 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 md:flex"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          {/* Astra dropdown */}
          {!shown && <AstraDropdown activeSurface={activeSurface} accent={accent} />}
        </div>

        {/* Scrolls: the per-surface item list (between the Astra selector and the
          bottom toolbar). Logo + dropdown stay pinned. */}
        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 pb-2 pt-1',
            lockInner,
          )}
        >
          {items.map((item) => (
            <SidebarRow
              key={item.id}
              item={item}
              active={item.id === activeItemId}
              accent={accent}
              collapsed={shown}
              onSelect={onSelect}
            />
          ))}
        </nav>
        {/* Account lives in the bottom toolbar (pass 8) — not the sidebar. */}
      </aside>
      {/* Mobile-only close affordance: tap anywhere outside the open sidebar. */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onToggleCollapse}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}
    </>
  );
}

/* ───────────────────────── Astra dropdown ───────────────────────── */

function AstraDropdown({ activeSurface, accent }: { activeSurface: string; accent: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = (SURFACE_FRIENDLY[activeSurface] ?? activeSurface).toUpperCase();
  const CurrentIcon = ASTRA_SWITCHER.find((a) => a.slug === activeSurface)?.icon;

  return (
    <div ref={ref} className="relative mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border border-zinc-200 px-3 py-2 text-left transition-colors hover:bg-zinc-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {CurrentIcon && (
            <CurrentIcon size={17} className="flex-shrink-0" style={{ color: accent }} />
          )}
          <span
            className="truncate font-display text-[15px] font-bold tracking-wide"
            style={{ color: accent }}
          >
            {current}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn('flex-shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-px max-h-[60vh] overflow-y-auto border border-zinc-200 bg-white shadow-lg">
          {ASTRA_SWITCHER.map((a) => {
            const color = astraColor(a.slug);
            const isCurrent = a.slug === activeSurface;
            const Icon = a.icon;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) navigate(a.to);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] transition-colors hover:bg-zinc-50"
                style={{
                  color,
                  fontWeight: isCurrent ? 700 : 500,
                  background: isCurrent ? `${color}14` : undefined,
                }}
              >
                <Icon size={17} className="flex-shrink-0" style={{ color }} aria-hidden="true" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Sidebar row ───────────────────────── */

function SidebarRow({
  item,
  active,
  accent,
  collapsed,
  onSelect,
}: {
  item: SidebarItem;
  active: boolean;
  accent: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = item.icon;
  const base = cn(
    'flex items-center gap-3 px-3 py-2 text-left text-[14px] transition-colors',
    collapsed && 'justify-center px-0',
  );

  const label = !collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>;
  const badge =
    !collapsed && typeof item.badge === 'number' && item.badge > 0 ? (
      <span
        className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold text-white"
        style={{ background: accent }}
      >
        {item.badge}
      </span>
    ) : null;

  if (item.soon) {
    return (
      <div
        className={cn(base, 'cursor-default text-zinc-400')}
        title={`${item.label} — coming soon`}
      >
        <Icon size={19} className="flex-shrink-0" />
        {label}
        {!collapsed && (
          <span
            className="ml-auto font-mono text-[8.5px] uppercase tracking-wider text-zinc-400"
            data-size="meta"
          >
            soon
          </span>
        )}
      </div>
    );
  }

  const style = active ? { color: accent, background: `${accent}14` } : { color: accent };

  if (item.to) {
    return (
      <Link
        to={item.to}
        className={cn(base, 'hover:bg-zinc-100', active && 'font-semibold')}
        style={style}
        title={item.label}
        aria-label={item.label}
      >
        <Icon size={19} className="flex-shrink-0" />
        {label}
        {badge}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(base, 'hover:bg-zinc-100', active && 'font-semibold')}
      style={style}
      title={item.label}
      aria-label={item.label}
    >
      <Icon size={19} className="flex-shrink-0" />
      {label}
      {badge}
    </button>
  );
}
