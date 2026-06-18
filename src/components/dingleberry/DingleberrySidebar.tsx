import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dbIcon } from './icons';
import { DINGLEBERRY_COLOR, STATUS_BLUE } from './tone';

/**
 * Left sidebar for the DingleBERRY surface. Mirrors IntelSidebar's collapsible
 * rail (hover → expand, click toggle → pin, Esc → unpin) but is router-driven:
 * each nav item maps to a /dingleberry/* route and is active by pathname.
 *
 * Re-skin: JUSTICE navy/gold sidebar → repo dark tokens + red identity accent.
 */

interface NavItem {
  key: string;
  icon: string; // artifact icon-name → dbIcon()
  label: string;
  /** static mock count, as in the artifact NAV */
  count: string;
  /** route under /dingleberry (empty = index) */
  to: string;
}

const NAV: NavItem[] = [
  { key: 'overview', icon: 'radar', label: 'Command center', count: '', to: '/dingleberry' },
  { key: 'infra', icon: 'server', label: 'Infra health', count: '142', to: '/dingleberry/infra' },
  { key: 'txn', icon: 'lock', label: 'Transactions', count: '1.2M', to: '/dingleberry/txn' },
  { key: 'source', icon: 'fingerprint', label: 'Source verification', count: '2.1k', to: '/dingleberry/source' },
  { key: 'shill', icon: 'users', label: 'Shill / abuse', count: '2', to: '/dingleberry/shill' },
  { key: 'dispatch', icon: 'zap', label: 'Dispatch auth', count: '3.4k', to: '/dingleberry/dispatch' },
  { key: 'threat', icon: 'shieldCheck', label: 'Threat interception', count: '1', to: '/dingleberry/threat' },
  { key: 'mesh', icon: 'network', label: 'Member mesh', count: '4.1k', to: '/dingleberry/mesh' },
  { key: 'karma', icon: 'scale', label: 'Karma Read', count: 'AI', to: '/dingleberry/karma' },
  { key: 'godark', icon: 'wifiOff', label: 'Go Dark monitor', count: '', to: '/dingleberry/godark' },
];

export function DingleberrySidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Open by default on tablet + desktop (dispatch B); mobile (<768px) starts
  // collapsed as a hover/touch sticky rail.
  const [pinned, setPinned] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  // Esc unpins (mirror IntelSidebar)
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pinned]);

  function isActive(item: NavItem) {
    if (item.to === '/dingleberry') return pathname === '/dingleberry';
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }

  return (
    <aside
      onMouseEnter={() => !pinned && setHovered(true)}
      onMouseLeave={() => !pinned && setHovered(false)}
      className={cn(
        'relative z-20 flex h-full flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-out',
        expanded ? 'w-52' : 'w-12',
      )}
    >
      {/* Toggle / brand */}
      <button
        type="button"
        onClick={() => {
          setPinned((p) => !p);
          setHovered(false);
        }}
        aria-label={pinned ? 'Collapse DingleBERRY menu' : 'Expand DingleBERRY menu'}
        className={cn(
          'flex h-11 flex-shrink-0 items-center border-b border-border text-text-silver hover:bg-bg hover:text-text',
          expanded ? 'justify-between px-3' : 'justify-center',
        )}
      >
        {expanded && (
          <span
            className="font-serif font-bold tracking-wide"
            style={{ fontSize: '15px', color: DINGLEBERRY_COLOR }}
          >
            DingleBERRY
          </span>
        )}
        {expanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
      </button>

      {expanded && (
        <div
          className="px-3 pt-3 pb-1 font-mono uppercase text-text-muted"
          style={{ fontSize: '9.5px', letterSpacing: '0.14em' }}
        >
          Surfaces under watch
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-1.5">
          {NAV.map((item) => (
            <li key={item.key}>
              <SidebarItem
                icon={dbIcon(item.icon)}
                label={item.label}
                count={item.count}
                active={isActive(item)}
                expanded={expanded}
                onClick={() => {
                  navigate(item.to);
                  if (!window.matchMedia('(hover: hover)').matches) setPinned(false);
                }}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Comb posture footer — static mock label */}
      <div className="mt-auto border-t border-border p-2">
        {expanded ? (
          <div className="rounded-md border border-border bg-bg-panel px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 flex-none rounded-full" style={{ background: STATUS_BLUE }} />
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: '9px', letterSpacing: '0.08em' }}
              >
                Comb posture
              </span>
            </div>
            <div className="mt-1 font-serif font-bold text-text" style={{ fontSize: '15px', lineHeight: 1.1 }}>
              VIGILANT
            </div>
            <div className="text-text-muted" style={{ fontSize: '11px' }}>
              Funded · @combtreasury.defense
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <span className="block h-2 w-2 rounded-full" style={{ background: STATUS_BLUE }} />
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  count,
  active,
  expanded,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: string;
  active: boolean;
  expanded: boolean;
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
      )}
      style={active ? { color: DINGLEBERRY_COLOR } : undefined}
    >
      <span className="relative flex-shrink-0">
        <Icon
          size={16}
          className={cn('flex-shrink-0', !active && 'text-text-muted group-hover:text-text-silver')}
          style={active ? { color: DINGLEBERRY_COLOR } : undefined}
        />
      </span>
      {expanded && (
        <>
          <span className="flex-1 truncate text-left tracking-wide" style={{ fontSize: '13px' }}>
            {label}
          </span>
          {count && (
            <span
              className="ml-auto flex-shrink-0 font-mono tabular-nums text-text-muted"
              style={{ fontSize: '10px', color: active ? DINGLEBERRY_COLOR : undefined }}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
