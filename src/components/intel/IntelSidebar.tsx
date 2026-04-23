import { useState, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Flame,
  Clock,
  Bookmark,
  MessageSquare,
  Plus,
  Users,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntelView =
  | 'home'
  | 'hot'
  | 'new'
  | 'saved'
  | 'mythreads'
  | 'create'
  | 'following';

interface IntelSidebarProps {
  activeView: IntelView;
  onSelectView: (view: IntelView) => void;
}

interface NavItem {
  id: IntelView;
  label: string;
  icon: LucideIcon;
  group: 'primary' | 'personal';
  isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, group: 'primary' },
  { id: 'hot', label: 'Hot', icon: Flame, group: 'primary' },
  { id: 'new', label: 'New', icon: Clock, group: 'primary' },
  { id: 'create', label: 'Thread', icon: Plus, group: 'primary', isAction: true },
  { id: 'mythreads', label: 'My Threads', icon: MessageSquare, group: 'personal' },
  { id: 'following', label: 'Following', icon: Users, group: 'personal' },
  { id: 'saved', label: 'Saved', icon: Bookmark, group: 'personal' },
];

const INTEL_COLOR = '#6B94C8';

/**
 * Left sidebar for INTEL.
 *
 * Desktop / tablet (≥768px): always visible as 48px icon rail.
 * Hover → peek expansion. Click toggle → pin.
 *
 * Mobile (<768px): hidden. Opens as drawer via:
 * - swipe-from-left-edge gesture, OR
 * - tap "open-intel-sidebar" event from utility chrome button
 */
export function IntelSidebar({ activeView, onSelectView }: IntelSidebarProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const expanded = pinned || hovered;

  // External open event (from UtilityChrome button on mobile)
  useEffect(() => {
    const onOpen = () => {
      if (window.innerWidth < 768) {
        setDrawerOpen(true);
      } else {
        setPinned(true);
      }
    };
    window.addEventListener('open-intel-sidebar', onOpen);
    return () => window.removeEventListener('open-intel-sidebar', onOpen);
  }, []);

  // Swipe-from-left gesture (mobile only)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const onStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      if (window.innerWidth >= 768) return; // only on mobile
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStartX; // positive = swipe right
      const dy = Math.abs(touchStartY - endY);

      // Open: swipe right from within 30px of left edge
      if (!drawerOpen && touchStartX < 30 && dx > 40 && dy < 40) {
        setDrawerOpen(true);
      }
      // Close: swipe left when drawer is open
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

  // Esc closes drawer / unpins
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawerOpen) setDrawerOpen(false);
      if (pinned) setPinned(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, pinned]);

  function handleSelect(view: IntelView) {
    onSelectView(view);
    if (drawerOpen) setDrawerOpen(false);
  }

  const primaryItems = NAV_ITEMS.filter((n) => n.group === 'primary');
  const personalItems = NAV_ITEMS.filter((n) => n.group === 'personal');

  return (
    <>
      {/* Desktop / tablet sidebar (≥768px): always visible */}
      <aside
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => !pinned && setHovered(false)}
        className={cn(
          'relative z-20 hidden h-full flex-col border-r border-border bg-bg-elevated/60 transition-[width] duration-200 ease-out md:flex',
          expanded ? 'w-44' : 'w-12',
        )}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={() => {
            setPinned((p) => !p);
            setHovered(false);
          }}
          aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          className={cn(
            'flex h-11 flex-shrink-0 items-center border-b border-border text-text-silver hover:bg-bg hover:text-text',
            expanded ? 'justify-between px-3' : 'justify-center',
          )}
        >
          {expanded && (
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: '11px', color: INTEL_COLOR }}
              data-size="meta"
            >
              INTEL
            </span>
          )}
          {expanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>

        <SidebarBody
          activeView={activeView}
          expanded={expanded}
          primaryItems={primaryItems}
          personalItems={personalItems}
          onSelect={handleSelect}
        />
      </aside>

      {/* Mobile drawer (<768px) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute left-0 top-0 flex h-full w-60 flex-col border-r border-border bg-bg shadow-xl">
            <div
              className="flex items-center justify-between border-b border-border px-3 py-3"
              style={{ borderBottomColor: INTEL_COLOR + '40' }}
            >
              <span
                className="font-mono uppercase tracking-widest"
                style={{ fontSize: '11px', color: INTEL_COLOR }}
                data-size="meta"
              >
                INTEL
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded text-text-silver hover:bg-bg-elevated hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
            <SidebarBody
              activeView={activeView}
              expanded={true}
              primaryItems={primaryItems}
              personalItems={personalItems}
              onSelect={handleSelect}
            />
          </aside>
        </div>
      )}

      {/* Mobile: small left-edge tab hint when drawer is closed */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open INTEL menu"
          className="fixed left-0 top-1/2 z-30 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-r-md border-y border-r border-border bg-bg-elevated text-text-muted hover:text-text md:hidden"
          style={{ color: INTEL_COLOR }}
        >
          <PanelLeftOpen size={12} />
        </button>
      )}
    </>
  );
}

function SidebarBody({
  activeView,
  expanded,
  primaryItems,
  personalItems,
  onSelect,
}: {
  activeView: IntelView;
  expanded: boolean;
  primaryItems: NavItem[];
  personalItems: NavItem[];
  onSelect: (view: IntelView) => void;
}) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto py-2">
        <SidebarGroup
          items={primaryItems}
          activeView={activeView}
          expanded={expanded}
          onSelect={onSelect}
        />
        <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
        <SidebarGroup
          items={personalItems}
          activeView={activeView}
          expanded={expanded}
          onSelect={onSelect}
        />
      </nav>
      <div className="mt-auto border-t border-border py-2">
        <SidebarItem
          id="settings"
          label="Settings"
          icon={Settings}
          active={false}
          expanded={expanded}
          onClick={() => {
            /* future: open intel preferences */
          }}
        />
      </div>
    </>
  );
}

function SidebarGroup({
  items,
  activeView,
  expanded,
  onSelect,
}: {
  items: NavItem[];
  activeView: IntelView;
  expanded: boolean;
  onSelect: (view: IntelView) => void;
}) {
  return (
    <ul className="space-y-0.5 px-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <SidebarItem
            id={item.id}
            label={item.label}
            icon={item.icon}
            active={activeView === item.id}
            expanded={expanded}
            isAction={item.isAction}
            onClick={() => onSelect(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function SidebarItem({
  label,
  icon: Icon,
  active,
  expanded,
  isAction,
  onClick,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
  isAction?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : label}
      className={cn(
        'group flex w-full items-center rounded-md transition-colors',
        expanded ? 'gap-2.5 px-2 py-2' : 'justify-center py-2',
        active && 'bg-bg text-text',
        !active && 'text-text-dim hover:bg-bg hover:text-text-silver',
        isAction && !active && 'text-text-silver',
      )}
      style={active ? { color: INTEL_COLOR } : undefined}
    >
      <Icon
        size={16}
        className={cn(
          'flex-shrink-0',
          isAction && 'text-honey',
          !isAction && !active && 'text-text-muted group-hover:text-text-silver',
        )}
        style={active ? { color: INTEL_COLOR } : undefined}
      />
      {expanded && (
        <span
          className={cn('truncate tracking-wide', isAction && 'font-medium')}
          style={{ fontSize: '13px' }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
