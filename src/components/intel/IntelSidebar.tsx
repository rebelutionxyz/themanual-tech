import { useState } from 'react';
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
  { id: 'create', label: 'New Thread', icon: Plus, group: 'primary', isAction: true },
  { id: 'mythreads', label: 'My Threads', icon: MessageSquare, group: 'personal' },
  { id: 'following', label: 'Following', icon: Users, group: 'personal' },
  { id: 'saved', label: 'Saved', icon: Bookmark, group: 'personal' },
];

/**
 * Retractable left sidebar for INTEL surface.
 * - Collapsed: ~56px icon rail
 * - Expanded: ~240px with labels
 * - Toggle persists between views
 */
export function IntelSidebar({ activeView, onSelectView }: IntelSidebarProps) {
  const [expanded, setExpanded] = useState(false);

  const primaryItems = NAV_ITEMS.filter((n) => n.group === 'primary');
  const personalItems = NAV_ITEMS.filter((n) => n.group === 'personal');

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-bg-elevated/60 transition-[width] duration-200 ease-out',
        expanded ? 'w-44' : 'w-14',
      )}
    >
      {/* Toggle button at top */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
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
            INTEL
          </span>
        )}
        {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <SidebarGroup
          items={primaryItems}
          activeView={activeView}
          expanded={expanded}
          onSelectView={onSelectView}
        />

        {/* Divider */}
        <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />

        <SidebarGroup
          items={personalItems}
          activeView={activeView}
          expanded={expanded}
          onSelectView={onSelectView}
        />
      </nav>

      {/* Settings pinned to bottom */}
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
  );
}

function SidebarGroup({
  items,
  activeView,
  expanded,
  onSelectView,
}: {
  items: NavItem[];
  activeView: IntelView;
  expanded: boolean;
  onSelectView: (view: IntelView) => void;
}) {
  return (
    <ul className="space-y-0.5 px-2">
      {items.map((item) => (
        <li key={item.id}>
          <SidebarItem
            id={item.id}
            label={item.label}
            icon={item.icon}
            active={activeView === item.id}
            expanded={expanded}
            isAction={item.isAction}
            onClick={() => onSelectView(item.id)}
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
    >
      <Icon
        size={16}
        className={cn(
          'flex-shrink-0',
          isAction && 'text-honey',
          !isAction && !active && 'text-text-muted group-hover:text-text-silver',
        )}
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
