import { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { countSavedThreads } from '@/lib/reactions';
import { countThreadsByAuthor } from '@/lib/intel';
import { BEE_COLOR } from '@/lib/constants';

export type IntelView =
  | 'home'
  | 'hot'
  | 'new'
  | 'saved'
  | 'mythreads'
  | 'create'
  | 'following'
  | 'forme'
  | 'prize';

interface IntelSidebarProps {
  activeView: IntelView;
  onSelectView: (view: IntelView) => void;
}

interface NavItem {
  id: IntelView;
  label: string;
  icon: LucideIcon;
  group: 'primary' | 'personal' | 'future';
  isAction?: boolean;
  /** Marks a future/not-yet-implemented item — dimmed, tooltip explains */
  comingSoon?: boolean;
  /** Optional subtitle/hint shown in tooltip */
  comingSoonHint?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'forme', label: 'For Me', icon: Sparkles, group: 'primary', comingSoon: true, comingSoonHint: 'Personalized feed — pick atoms, realms, and pillars to follow' },
  { id: 'home', label: 'Home', icon: Home, group: 'primary' },
  { id: 'hot', label: 'Hot', icon: Flame, group: 'primary' },
  { id: 'new', label: 'Breaking', icon: Clock, group: 'primary' },
  { id: 'create', label: 'Thread', icon: Plus, group: 'primary', isAction: true },
  { id: 'mythreads', label: 'My Threads', icon: MessageSquare, group: 'personal' },
  { id: 'following', label: 'Following', icon: Users, group: 'personal', comingSoon: true, comingSoonHint: 'Threads from Bees you follow' },
  { id: 'saved', label: 'Saved', icon: Bookmark, group: 'personal' },
  { id: 'prize', label: 'Prize', icon: Trophy, group: 'future', comingSoon: true, comingSoonHint: 'blingster.xyz — post bets, match with BLiNG! escrow' },
];

const INTEL_COLOR = '#6B94C8';

/**
 * Left sidebar for INTEL. Always visible on all screen sizes.
 *
 * Desktop: hover on rail → temporarily expand. Click top toggle → pin expanded.
 * Mobile: tap top toggle → expand. Swipe right starting on the rail → expand.
 *         Tap item to navigate (auto-collapse on touch devices).
 */
export function IntelSidebar({ activeView, onSelectView }: IntelSidebarProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const { bee } = useAuth();

  // Personal badge counts — fetched when signed in, refreshed on
  // intel-counts-refresh event (fired by ThreadList on save/unsave + IntelPage
  // on thread create). Silent when 0 (per UX spec B).
  const [savedCount, setSavedCount] = useState(0);
  const [myThreadsCount, setMyThreadsCount] = useState(0);

  useEffect(() => {
    if (!bee?.id) {
      setSavedCount(0);
      setMyThreadsCount(0);
      return;
    }
    let cancelled = false;
    async function refreshCounts() {
      if (!bee?.id) return;
      try {
        const [saved, authored] = await Promise.all([
          countSavedThreads(bee.id),
          countThreadsByAuthor(bee.id),
        ]);
        if (!cancelled) {
          setSavedCount(saved);
          setMyThreadsCount(authored);
        }
      } catch {
        // Non-fatal — tables may not be migrated yet. Leave counts at 0.
      }
    }
    refreshCounts();
    const onRefresh = () => refreshCounts();
    window.addEventListener('intel-counts-refresh', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('intel-counts-refresh', onRefresh);
    };
  }, [bee?.id]);

  const expanded = pinned || hovered;

  // External open event (kept for compatibility if anything still fires it)
  useEffect(() => {
    const onOpen = () => setPinned(true);
    window.addEventListener('open-intel-sidebar', onOpen);
    return () => window.removeEventListener('open-intel-sidebar', onOpen);
  }, []);

  // Swipe-right-on-rail gesture (mobile) — starts on the sidebar element itself
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
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
      const dx = endX - touchStartX; // positive = swipe right
      const dy = Math.abs(touchStartY - endY);
      // Swipe right to pin expanded; swipe left to collapse.
      if (!pinned && dx > 30 && dy < 30) {
        setPinned(true);
      } else if (pinned && dx < -30 && dy < 30) {
        setPinned(false);
      }
    };
    aside.addEventListener('touchstart', onStart, { passive: true });
    aside.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      aside.removeEventListener('touchstart', onStart);
      aside.removeEventListener('touchend', onEnd);
    };
  }, [pinned]);

  // Esc unpins
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned]);

  // Click-outside to close on mobile (when sidebar is pinned expanded)
  useEffect(() => {
    if (!pinned) return;
    // Only on mobile
    if (window.innerWidth >= 768) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const aside = asideRef.current;
      if (!aside) return;
      const target = e.target as Node;
      if (aside.contains(target)) return; // click inside — ignore
      setPinned(false);
    };
    // Delay registration to avoid catching the very click/touch that pinned it
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

  function handleSelect(view: IntelView) {
    onSelectView(view);
    // On touch (no hover), auto-collapse after selection
    if (!window.matchMedia('(hover: hover)').matches) {
      setPinned(false);
    }
  }

  const primaryItems = NAV_ITEMS.filter((n) => n.group === 'primary');
  const personalItems = NAV_ITEMS.filter((n) => n.group === 'personal');
  const futureItems = NAV_ITEMS.filter((n) => n.group === 'future');

  // Per-view badge counts + colors. Silent when 0 (item.id omitted from map).
  const badgeMap: Partial<Record<IntelView, { count: number; color: string }>> = {};
  if (myThreadsCount > 0) {
    badgeMap.mythreads = { count: myThreadsCount, color: BEE_COLOR };
  }
  if (savedCount > 0) {
    badgeMap.saved = { count: savedCount, color: '#FAD15E' };
  }

  return (
    <>
      {/* Mobile overlay — only when pinned open (tap anywhere dims/closes) */}
      {pinned && (
        <div
          className="fixed inset-0 z-10 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setPinned(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => !pinned && setHovered(false)}
        className={cn(
          'relative z-20 flex h-full flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-out',
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
        aria-label={pinned ? 'Collapse INTEL menu' : 'Expand INTEL menu'}
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

      <nav className="flex-1 overflow-y-auto py-2">
        <SidebarGroup
          items={primaryItems}
          activeView={activeView}
          expanded={expanded}
          onSelect={handleSelect}
          badgeMap={badgeMap}
        />
        <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
        <SidebarGroup
          items={personalItems}
          activeView={activeView}
          expanded={expanded}
          onSelect={handleSelect}
          badgeMap={badgeMap}
        />
        {futureItems.length > 0 && (
          <>
            <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
            <SidebarGroup
              items={futureItems}
              activeView={activeView}
              expanded={expanded}
              onSelect={handleSelect}
              badgeMap={badgeMap}
            />
          </>
        )}
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
    </aside>
    </>
  );
}

function SidebarGroup({
  items,
  activeView,
  expanded,
  onSelect,
  badgeMap,
}: {
  items: NavItem[];
  activeView: IntelView;
  expanded: boolean;
  onSelect: (view: IntelView) => void;
  badgeMap: Partial<Record<IntelView, { count: number; color: string }>>;
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
            comingSoon={item.comingSoon}
            comingSoonHint={item.comingSoonHint}
            badge={badgeMap[item.id]}
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
  comingSoon,
  comingSoonHint,
  badge,
  onClick,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
  isAction?: boolean;
  comingSoon?: boolean;
  comingSoonHint?: string;
  badge?: { count: number; color: string };
  onClick: () => void;
}) {
  const tooltip = comingSoon
    ? comingSoonHint
      ? `${label} — ${comingSoonHint}`
      : `${label} — coming soon`
    : expanded
      ? undefined
      : badge
        ? `${label} (${badge.count})`
        : label;

  // Format badge count compactly: 99+ cap for UI space
  const badgeText = badge ? (badge.count > 99 ? '99+' : String(badge.count)) : '';

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={cn(
        'group flex w-full items-center rounded-md transition-colors',
        expanded ? 'gap-2.5 px-2 py-2' : 'justify-center py-2',
        active && 'bg-bg text-text',
        !active && 'text-text-dim hover:bg-bg hover:text-text-silver',
        isAction && !active && 'text-text-silver',
        comingSoon && 'opacity-60',
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
      {expanded && comingSoon && (
        <span
          className="ml-auto flex-shrink-0 rounded border border-honey/30 px-1 py-0.5 font-mono uppercase tracking-wider text-honey/70"
          style={{ fontSize: '8.5px' }}
          data-size="meta"
        >
          Soon
        </span>
      )}
      {expanded && badge && !comingSoon && (
        <span
          className="ml-auto flex-shrink-0 rounded px-1.5 py-0.5 font-mono tabular-nums"
          style={{
            fontSize: '10px',
            color: badge.color,
            background: `${badge.color}18`,
            border: `1px solid ${badge.color}35`,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
          data-size="meta"
          aria-label={`${badge.count} items`}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
}
