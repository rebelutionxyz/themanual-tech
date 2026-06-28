import { TopTickerSlot } from '@/components/promotions/TopTickerSlot';
import { BottomToolbar } from '@/components/shell/BottomToolbar';
import { GlobalSidebar } from '@/components/shell/GlobalSidebar';
import { LensRow } from '@/components/shell/LensRow';
import { RealmChipsBar } from '@/components/shell/RealmChipsBar';
import { RealmStrip } from '@/components/shell/RealmStrip';
import { RealmTreeSlider } from '@/components/shell/RealmTreeSlider';
import { RightRail } from '@/components/shell/RightRail';
import type { SidebarItem } from '@/components/shell/sidebarNav';
import { type CSSProperties, type ReactNode, useState } from 'react';

/**
 * Right "Overview" rail toggle. Hidden this pass across ALL community surfaces;
 * the center column reflows to fill the freed width. Reversible — flip to true
 * to restore the rail (RightRail import is retained on purpose).
 */
const SHOW_RIGHT_RAIL = false;

/**
 * Horizontal 14-realm strip — RETIRED. Realm navigation now lives entirely in
 * the White-Rabbit right-column tree (RealmTreeSlider), which drives the same
 * lens. Component file kept; flip to true to restore the strip.
 */
const SHOW_REALM_STRIP = false;

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
      // OUTER CONTAINER = the shell box. The max-width + centering live HERE, so
      // every child (ticker, the sidebar+content row, and the bottom toolbar) is
      // a full-width child of this ~1290 box. Viewport margin sits OUTSIDE it.
      className="mx-auto flex h-full min-h-0 w-full max-w-[1290px] flex-col bg-white text-zinc-900"
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
      {/* REGION 1 (flex-1) — [ left sidebar | content column ]. Fills the outer
          container's width. The content column (right of the sidebar) is a flex
          flex-col, top → bottom:
            LensRow       — TOP toolbar (Search / Location / Time / Realm)
            <main>        — flex-1 scroller (the realm slide-over overlays it)
            LensChipsBar  — selected-realm chips
          The sidebar runs the full height of REGION 1; REGION 2 (the bottom
          toolbar) sits below, spanning the whole container under both. */}
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <GlobalSidebar
          activeSurface={activeSurface}
          accent={accent}
          items={items}
          activeItemId={activeItemId}
          onSelect={onSelect}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-zinc-200 md:border-l">
          {/* TOP toolbar */}
          <LensRow accent={accent} />
          {/* Content region (flex-1) + the realm slide-over, which overlays ONLY
              this region — never the top/bottom toolbars or the chips. */}
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {SHOW_REALM_STRIP && <RealmStrip />}
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white">
                <div className="min-h-0 flex-1">{children}</div>
              </main>
            </div>
            {/* Cross-Astra Overview rail — hidden on mobile, side column at md+. */}
            {SHOW_RIGHT_RAIL && <RightRail />}
            {/* White-Rabbit realm-tree slide-over — overlays the content region. */}
            <RealmTreeSlider />
          </div>
          {/* Selected-realm chips — bottom of the content column (right of the
              sidebar), above the bottom toolbar. */}
          <RealmChipsBar />
        </div>
      </div>
      {/* REGION 2 — bottom toolbar. A full-width child of the OUTER CONTAINER, so
          it spans the whole ~1290 shell box (under the sidebar AND the content
          column), edges meeting the container edges — NOT the viewport. */}
      <BottomToolbar accent={accent} />
    </div>
  );
}
