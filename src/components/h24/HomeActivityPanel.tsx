// H24_FIX2 — the routing log's THIRD surface. H24_FIX1 already built (a) the
// icon-drawer "Routing" tab (H24DrawerPanel) and (c) the full /h24/log page
// (RoutingLogTable + H24RoutingLogPage). This is (b): on a fresh/undocked h24
// session (no transcript exchanged yet THIS visit) the record shows in a
// MINIMIZABLE side panel, so a returning Bee sees their history before typing
// anything — rather than the console looking blank until they act.
//
// ONE SOURCE OF TRUTH (dispatch: "three views, never three queries that can
// drift"): this takes the SAME `log` state OraclePage already fetched via
// fetchRoutingLog — no second query, so it can never disagree with the drawer
// tab or the full page showing the same data.
//
// SHELL v1.5.1 CHROME-OVERLAY LAW: floats OVER the content (absolute, no
// reflow) — same footing as the icon drawer / astra picker — and closes on an
// outside click, mirroring IconDrawer exactly. "Minimizable, not fixed":
// closing leaves a slim re-open tab at the same edge rather than vanishing
// with no way back.

import { History } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type RoutingLogData, RoutingLogTable } from './RoutingLogTable';

export function HomeActivityPanel({
  log,
  signedIn,
  onOpenLog,
  onRefresh,
  onExport,
}: {
  log: RoutingLogData;
  signedIn: boolean;
  /** Navigate to /h24/log — this panel's full-page exit (Quick-Look Law). */
  onOpenLog: () => void;
  onRefresh: () => void;
  onExport: () => void;
}) {
  // Expanded by default — "visible before there is a transcript to read" means
  // a Bee should not have to click anything to see their own history.
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (collapsed) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCollapsed(true);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [collapsed]);

  if (!signedIn) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show recent activity"
        title="Recent activity"
        className="absolute right-0 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-l-md shadow-lg transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, #06070a)',
          border: '1px solid var(--line)',
          borderRight: 'none',
          color: 'var(--icon)',
        }}
      >
        <History size={16} />
      </button>
    );
  }

  return (
    <aside
      ref={ref}
      aria-label="Recent activity"
      className="absolute right-0 top-0 z-30 flex h-full w-80 max-w-[85vw] flex-col shadow-2xl"
      style={{
        background: 'color-mix(in srgb, var(--accent) 10%, #06070a)',
        borderLeft: '1px solid var(--line)',
      }}
    >
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4"
        style={{ height: 44, borderBottom: '1px solid var(--hairline)' }}
      >
        <h2 className="font-mono" style={{ color: 'var(--ink)', fontSize: 13 }}>
          Recent activity
        </h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Minimize"
          title="Minimize"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--icon)' }}
        >
          <History size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <RoutingLogTable
          log={log}
          signedIn={signedIn}
          selectedCostId={null}
          // Quick-Look Law: any cost drill-down exits to the full page, which
          // already owns the H24CostPanel side-by-side breakdown.
          onSelectCost={() => onOpenLog()}
          onRefresh={onRefresh}
          onExport={onExport}
          title="Recent"
        />
      </div>
    </aside>
  );
}
