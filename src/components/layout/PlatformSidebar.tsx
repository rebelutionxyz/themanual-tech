import { Link, useLocation } from 'react-router-dom';
import {
  SURFACES,
  SURFACE_GROUPS,
  getSurfacesByGroup,
  type SurfaceDef,
} from '@/lib/surfaces';
import { cn } from '@/lib/utils';

interface PlatformSidebarProps {
  collapsed?: boolean;
}

export function PlatformSidebar({ collapsed = false }: PlatformSidebarProps) {
  const location = useLocation();
  const activeSlug =
    location.pathname.length > 1 ? location.pathname.slice(1).split('/')[0] : null;

  return (
    <nav
      className={cn(
        'flex h-full flex-col overflow-y-auto border-r border-border bg-bg-elevated',
        collapsed ? 'w-16' : 'w-56',
      )}
      aria-label="Platform surfaces"
    >
      {SURFACE_GROUPS.map((group) => {
        const surfaces = getSurfacesByGroup(group);
        return (
          <div key={group} className="py-2">
            {!collapsed && (
              <div
                className="px-3 pb-1.5 font-mono uppercase tracking-wider text-text-muted"
                style={{ fontSize: '11px' }}
                data-size="meta"
              >
                {group}
              </div>
            )}
            {collapsed && (
              <div className="mx-auto mb-1 h-px w-6 bg-border" aria-hidden="true" />
            )}
            <ul className="space-y-0.5 px-2">
              {surfaces.map((s) => (
                <li key={s.slug}>
                  <SurfaceLink
                    surface={s}
                    active={activeSlug === s.slug}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {!collapsed && (
        <div className="mt-auto border-t border-border px-3 py-3">
          <p
            className="font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {SURFACES.length} surfaces · 1 HoneyComb
          </p>
        </div>
      )}
    </nav>
  );
}

function SurfaceLink({
  surface,
  active,
  collapsed,
}: {
  surface: SurfaceDef;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = surface.icon;
  const isBling = surface.special === 'bling';

  return (
    <Link
      to={`/${surface.slug}`}
      title={`${surface.name} — ${surface.function}`}
      className={cn(
        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
        'text-text-dim hover:bg-bg hover:text-text-silver',
        active && 'bg-bg text-text',
        collapsed && 'justify-center',
      )}
    >
      <Icon
        size={16}
        className={cn(
          'flex-shrink-0 transition-colors',
          active ? '' : 'text-text-muted group-hover:text-text-silver',
        )}
        style={active ? { color: surface.color } : undefined}
      />
      {!collapsed && (
        <>
          <span
            className={cn(
              'flex-1 truncate font-medium tracking-wide',
              isBling && 'bling',
            )}
            style={{ fontSize: '13px' }}
          >
            {surface.name}
          </span>
          <span
            className="font-mono text-text-muted"
            style={{ fontSize: '10.5px' }}
            data-size="meta"
          >
            {surface.function.split(' ')[0].slice(0, 6)}
          </span>
        </>
      )}
    </Link>
  );
}
