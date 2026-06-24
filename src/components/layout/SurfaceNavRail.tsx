import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: 'primary' | 'personal';
  /** Action item (e.g. Create) — honey icon, no active state. */
  isAction?: boolean;
  /** Silent when 0/undefined (per INTEL badge convention). */
  badge?: number;
}

interface SurfaceNavRailProps {
  /** Short uppercase surface label shown in the expanded header. */
  title: string;
  /** Surface accent (hex) — drives active color, badges, and the rail tint. */
  accent: string;
  items: NavRailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Optional content pinned to the bottom of the rail (e.g. INTEL "All threads"). */
  footer?: ReactNode;
}

/**
 * Generic per-Astra left nav rail. Copied from IntelSidebar's interaction shell
 * (pin/hover expand, mobile swipe, Esc/click-away, silent badge counts) and
 * parameterized by surface accent + items. No realm facet rail — that's
 * INTEL-only. The rail background is tinted with the surface accent.
 */
export function SurfaceNavRail({ title, accent, items, activeId, onSelect, footer }: SurfaceNavRailProps) {
  const [pinned, setPinned] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [hovered, setHovered] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const expanded = pinned || hovered;

  // Mobile swipe-right-to-pin / swipe-left-to-collapse, started on the rail.
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    let startX = 0;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (!pinned && dx > 30 && dy < 30) setPinned(true);
      else if (pinned && dx < -30 && dy < 30) setPinned(false);
    };
    aside.addEventListener('touchstart', onStart, { passive: true });
    aside.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      aside.removeEventListener('touchstart', onStart);
      aside.removeEventListener('touchend', onEnd);
    };
  }, [pinned]);

  // Esc unpins.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned]);

  // Click-away closes on mobile when pinned.
  useEffect(() => {
    if (!pinned || window.innerWidth >= 768) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const aside = asideRef.current;
      if (!aside || aside.contains(e.target as Node)) return;
      setPinned(false);
    };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('touchstart', onDocClick, { passive: true });
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [pinned]);

  function handleSelect(id: string) {
    onSelect(id);
    if (!window.matchMedia('(hover: hover)').matches) setPinned(false);
  }

  const primary = items.filter((i) => i.group === 'primary');
  const personal = items.filter((i) => i.group === 'personal');

  return (
    <>
      {pinned && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim is aria-hidden; keyboard users dismiss via Escape
        <div className="fixed inset-0 z-10 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setPinned(false)} aria-hidden="true" />
      )}

      <aside
        ref={asideRef}
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => !pinned && setHovered(false)}
        className={cn(
          'relative z-20 flex h-full flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-out',
          expanded ? 'w-44' : 'w-12',
        )}
        // Accent tint painted over the elevated panel (kept faint for legibility).
        style={{ backgroundImage: `linear-gradient(${accent}1F, ${accent}1F)` }}
      >
        <button
          type="button"
          onClick={() => {
            setPinned((p) => !p);
            setHovered(false);
          }}
          aria-label={pinned ? `Collapse ${title} menu` : `Expand ${title} menu`}
          className={cn(
            'flex h-11 flex-shrink-0 items-center border-b border-border text-text-silver hover:bg-bg/40 hover:text-text',
            expanded ? 'justify-between px-3' : 'justify-center',
          )}
        >
          {expanded && (
            <span className="font-mono uppercase tracking-widest" style={{ fontSize: '11px', color: accent }} data-size="meta">
              {title}
            </span>
          )}
          {expanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        <nav className="flex-1 overflow-y-auto py-2">
          <RailGroup items={primary} activeId={activeId} expanded={expanded} accent={accent} onSelect={handleSelect} />
          {personal.length > 0 && (
            <>
              <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
              <RailGroup items={personal} activeId={activeId} expanded={expanded} accent={accent} onSelect={handleSelect} />
            </>
          )}
        </nav>

        {footer && <div className="mt-auto border-t border-border">{footer}</div>}
      </aside>
    </>
  );
}

function RailGroup({
  items,
  activeId,
  expanded,
  accent,
  onSelect,
}: {
  items: NavRailItem[];
  activeId: string;
  expanded: boolean;
  accent: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-0.5 px-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <RailItem item={item} active={activeId === item.id} expanded={expanded} accent={accent} onClick={() => onSelect(item.id)} />
        </li>
      ))}
    </ul>
  );
}

function RailItem({
  item,
  active,
  expanded,
  accent,
  onClick,
}: {
  item: NavRailItem;
  active: boolean;
  expanded: boolean;
  accent: string;
  onClick: () => void;
}) {
  const { icon: Icon, label, isAction, badge } = item;
  const hasBadge = typeof badge === 'number' && badge > 0;
  const badgeText = hasBadge ? (badge > 99 ? '99+' : String(badge)) : '';
  const tooltip = expanded ? undefined : hasBadge ? `${label} (${badge})` : label;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={cn(
        'group flex w-full items-center rounded-md transition-colors',
        expanded ? 'gap-2.5 px-2 py-2' : 'justify-center py-2',
        active && 'bg-bg/60 text-text',
        !active && 'text-text-dim hover:bg-bg/40 hover:text-text-silver',
        isAction && !active && 'text-text-silver',
      )}
      style={active ? { color: accent } : undefined}
    >
      <span className="relative flex-shrink-0">
        <Icon
          size={16}
          className={cn('flex-shrink-0', isAction && 'text-honey', !isAction && !active && 'text-text-muted group-hover:text-text-silver')}
          style={active ? { color: accent } : undefined}
        />
        {!expanded && hasBadge && (
          <span
            className="absolute -right-0.5 -top-0.5 block h-[6px] w-[6px] rounded-full ring-1 ring-bg-elevated"
            style={{ background: accent }}
            aria-hidden="true"
          />
        )}
      </span>
      {expanded && (
        <span className={cn('truncate tracking-wide', isAction && 'font-medium')} style={{ fontSize: '13px' }}>
          {label}
        </span>
      )}
      {expanded && hasBadge && (
        <span
          className="ml-auto flex-shrink-0 rounded px-1.5 py-0.5 font-mono tabular-nums"
          style={{ fontSize: '10px', color: accent, background: `${accent}18`, border: `1px solid ${accent}35`, fontWeight: 600 }}
          data-size="meta"
          aria-label={`${badge} items`}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
}
