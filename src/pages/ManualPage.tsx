import { useState } from 'react';
import { Search, LayoutList, Network, TreePine, X, Filter } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { useManualStore } from '@/stores/useManualStore';
import { RealmSidebar } from '@/components/manual/RealmSidebar';
import { OutlookView } from '@/components/manual/OutlookView';
import { ListView } from '@/components/manual/ListView';
import { GraphView } from '@/components/manual/GraphView';
import { AtomDetailPanel } from '@/components/manual/AtomDetailPanel';
import { cn } from '@/lib/utils';
import { KETTLE_STATES, KETTLE_ABBREV } from '@/lib/constants';
import type { KettleState } from '@/types/manual';

export function ManualPage() {
  const { loaded, error, tree } = useManualData();
  const view = useManualStore((s) => s.view);
  const setView = useManualStore((s) => s.setView);
  const searchQuery = useManualStore((s) => s.searchQuery);
  const setSearchQuery = useManualStore((s) => s.setSearchQuery);
  const selectedKettle = useManualStore((s) => s.selectedKettle);
  const setSelectedKettle = useManualStore((s) => s.setSelectedKettle);
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const clearFilters = useManualStore((s) => s.clearFilters);

  const [showFilters, setShowFilters] = useState(false);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-kettle-unsourced/30 bg-bg-elevated p-6">
          <p className="text-kettle-unsourced">Failed to load Manual data.</p>
          <p
            className="mt-2 font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
          <p
            className="mt-4 font-mono text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            loading 5,997 atoms...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Realm Sidebar (13 realms — inside the MANUAL surface) */}
      <aside className="hidden w-16 flex-shrink-0 md:block">
        <RealmSidebar />
      </aside>

      {/* Center: Search/filter toolbar + current view */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border bg-bg-elevated/50 px-3 py-2">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search atoms..."
              className={cn(
                'w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-8 text-sm',
                'text-text placeholder:text-text-muted',
                'focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30',
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-silver"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm',
              showFilters
                ? 'border-text-silver/50 bg-bg-elevated text-text'
                : 'border-border bg-bg text-text-silver hover:text-text',
            )}
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>

          <div className="flex-1 md:hidden" />

          {/* View toggle */}
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Filter bar (kettle chips) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg-elevated/30 px-3 py-2">
            <span
              className="font-mono text-text-muted"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              kettle:
            </span>
            {KETTLE_STATES.map((k) => (
              <KettleChip
                key={k}
                kettle={k}
                active={selectedKettle === k}
                onClick={() => setSelectedKettle(selectedKettle === k ? null : k)}
              />
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto font-mono text-text-muted hover:text-text-silver"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              clear all
            </button>
          </div>
        )}

        {/* View area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === 'outlook' && <OutlookView tree={tree} />}
          {view === 'list' && <ListView />}
          {view === 'graph' && <GraphView />}
        </div>
      </div>

      {/* Right: Atom detail panel (slides in when atom selected) */}
      <aside
        className={cn(
          'hidden border-l border-border bg-bg-elevated/50 transition-all lg:block',
          selectedAtomId ? 'w-[400px]' : 'w-[320px]',
        )}
      >
        <AtomDetailPanel />
      </aside>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: 'outlook' | 'list' | 'graph';
  onChange: (v: 'outlook' | 'list' | 'graph') => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg p-0.5">
      <ViewBtn active={view === 'outlook'} onClick={() => onChange('outlook')} label="Outlook">
        <TreePine size={14} />
      </ViewBtn>
      <ViewBtn active={view === 'list'} onClick={() => onChange('list')} label="List">
        <LayoutList size={14} />
      </ViewBtn>
      <ViewBtn active={view === 'graph'} onClick={() => onChange('graph')} label="Graph">
        <Network size={14} />
      </ViewBtn>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
        active
          ? 'bg-bg-elevated text-text'
          : 'text-text-muted hover:bg-bg-elevated hover:text-text-silver',
      )}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function KettleChip({
  kettle,
  active,
  onClick,
}: {
  kettle: KettleState;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'kettle-pill transition-opacity',
        `kettle-${kettle}`,
        !active && 'opacity-50 hover:opacity-100',
        active && 'ring-1 ring-current',
      )}
    >
      {KETTLE_ABBREV[kettle]}
    </button>
  );
}
