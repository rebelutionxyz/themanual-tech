import { Link } from 'react-router-dom';
import { MessagesSquare, Plus } from 'lucide-react';
import { ThreadList } from '@/components/intel/ThreadList';
import { L3Refinement } from '@/components/intel/L3Refinement';
import { useIntelStore } from '@/stores/useIntelStore';
import { buildNewThreadUrl } from './IntelLayout';

/**
 * Thread list page. Sidebar + realm bar are provided by IntelLayout wrapper.
 * This component only renders the content that changes: header, filters, list.
 */
export function IntelPage() {
  const {
    selectedRealm,
    selectedFront,
    selectedL2,
    selectedL3,
    activeView,
    setL3,
  } = useIntelStore();

  const sortBy: 'hot' | 'new' | 'top' =
    activeView === 'new' ? 'new' : activeView === 'hot' ? 'hot' : 'hot';

  const contextLabel = selectedL3
    ? `${selectedRealm} · ${selectedL2} · ${selectedL3}`
    : selectedL2
      ? `${selectedRealm} · ${selectedL2}`
      : selectedFront
        ? `${selectedRealm} · ${selectedFront}`
        : selectedRealm ?? 'All Realms';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      {/* Surface header row */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
          style={{ borderColor: '#6B94C840', background: '#6B94C80D' }}
        >
          <MessagesSquare size={22} style={{ color: '#6B94C8' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            INTEL · {contextLabel}
          </div>
          <h1
            className="font-display text-2xl font-semibold tracking-wide"
            style={{ color: '#6B94C8' }}
          >
            {sortBy === 'new' ? 'Newest threads' : 'Discussion'}
          </h1>
        </div>

        <Link
          to={buildNewThreadUrl(selectedRealm, selectedFront, selectedL2)}
          className="flex items-center gap-1.5 rounded-md border border-text-silver/30 bg-bg-elevated px-3 py-1.5 text-text-silver-bright transition-colors hover:border-text-silver/60 hover:bg-panel-2"
          style={{ fontSize: '13px' }}
        >
          <Plus size={14} />
          <span className="hidden md:inline">New Thread</span>
          <span className="md:hidden">New</span>
        </Link>
      </div>

      {/* L3 refinement row — only when L2 is selected */}
      <L3Refinement
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        onSelectL3={setL3}
      />

      {/* Thread list */}
      <ThreadList
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        sortBy={sortBy}
      />
    </div>
  );
}
