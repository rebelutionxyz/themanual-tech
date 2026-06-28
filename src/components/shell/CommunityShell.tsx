import { TopTickerSlot } from '@/components/promotions/TopTickerSlot';
import { BottomToolbar } from '@/components/shell/BottomToolbar';
import { GlobalSidebar } from '@/components/shell/GlobalSidebar';
import { LensRow } from '@/components/shell/LensRow';
import { RealmStrip } from '@/components/shell/RealmStrip';
import { RightRail } from '@/components/shell/RightRail';
import type { SidebarItem } from '@/components/shell/sidebarNav';
import { type CSSProperties, type ReactNode, useState } from 'react';

/**
 * Right "Overview" rail toggle. Hidden this pass across ALL community surfaces;
 * the center column reflows to fill the freed width. Reversible — flip to true
 * to restore the rail (RightRail import is retained on purpose).
 */
const SHOW_RIGHT_RAIL = false;

interface CommunityShellProps {
  /** Active surface slug (intel / unite / rule / give) — drives nav + dropdown. */
  activeSurface: string;
  /** Current surface Astra color. */
  accent: string;
  /** Flat per-surface sidebar items. */
  items: SidebarItem[];
  activeItemId?: string;
  onSelect: (id: string) => void;
  /** Center content (the routed surface page). */
  children: ReactNode;
}

/**
 * White X-style three-column frame for the community surfaces. Mounted ONCE by
 * CommunityLayout (a layout route), so the sidebar + right rail persist across
 * navigation — only the center {children} (an <Outlet/>) swaps. The center
 * column is the sole page scroller; sidebar + rail are sticky / own-scroll.
 */
export function CommunityShell({
  activeSurface,
  accent,
  items,
  activeItemId,
  onSelect,
  children,
}: CommunityShellProps) {
  // Default open on tablet+desktop, collapsed on mobile (<md). The manual
  // toggle overrides thereafter — this only seeds the initial state.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-white text-zinc-900"
      // Tints scrollbars to the active surface accent — webkit reads
      // --surface-accent (index.css), Firefox inherits scrollbar-color.
      style={
        {
          '--surface-accent': accent,
          scrollbarColor: `${accent} transparent`,
        } as CSSProperties
      }
    >
      <TopTickerSlot />
      {/* [ left sidebar | center column | right rail ]. The lens toolbar lives
          inside the center column; the bottom toolbar is now a full-width band
          BELOW this row (edge to edge) — it no longer tracks the center width. */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1290px] flex-1 overflow-hidden">
        <GlobalSidebar
          activeSurface={activeSurface}
          accent={accent}
          items={items}
          activeItemId={activeItemId}
          onSelect={onSelect}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 border-zinc-200 md:border-l">
          {/* Center column: lens toolbar · realm strip · feed scroller. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-zinc-200 md:border-r">
            <LensRow accent={accent} />
            <RealmStrip />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
              <div className="min-h-0 flex-1">{children}</div>
            </main>
          </div>
          {/* Cross-Astra Overview rail — hidden on mobile, side column at md+. */}
          {SHOW_RIGHT_RAIL && <RightRail />}
        </div>
      </div>
      {/* Bottom utility toolbar — full-width accent band, flush to both edges. */}
      <BottomToolbar accent={accent} />
    </div>
  );
}
