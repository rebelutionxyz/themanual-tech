import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessagesSquare, Plus } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { RealmBar } from '@/components/intel/RealmBar';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { ThreadList } from '@/components/intel/ThreadList';
import { REALM_ORDER } from '@/lib/constants';
import type { Front } from '@/types/manual';

/**
 * INTEL surface — where Bees interact with the Realms.
 *
 * Layout:
 *   [Left sidebar: retractable icons]
 *   [Realm bar top — 13 realms, drill-down to L2 / Fronts]
 *   [Content area: thread list, realm-filtered]
 */
export function IntelPage() {
  const navigate = useNavigate();
  const { atoms, loaded } = useManualData();

  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [selectedFront, setSelectedFront] = useState<Front | null>(null);
  const [selectedL2, setSelectedL2] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<IntelView>('home');

  // Compute L2 sub-categories per realm from atoms
  const realmSubs = useMemo(() => {
    if (!loaded) return {};
    const subs: Record<string, Set<string>> = {};
    for (const realm of REALM_ORDER) subs[realm] = new Set<string>();
    for (const atom of atoms) {
      if (atom.L2 && subs[atom.realm]) subs[atom.realm].add(atom.L2);
    }
    const result: Record<string, string[]> = {};
    for (const [realm, set] of Object.entries(subs)) {
      result[realm] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [atoms, loaded]);

  // Sidebar view → sort mapping
  const sortBy: 'hot' | 'new' | 'top' =
    activeView === 'new' ? 'new' : activeView === 'hot' ? 'hot' : 'hot';

  function handleSidebarSelect(view: IntelView) {
    if (view === 'create') {
      navigate(buildNewThreadUrl(selectedRealm, selectedFront, selectedL2));
      return;
    }
    setActiveView(view);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <IntelSidebar activeView={activeView} onSelectView={handleSidebarSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        <RealmBar
          selectedRealm={selectedRealm}
          selectedFront={selectedFront}
          selectedL2={selectedL2}
          onSelectRealm={setSelectedRealm}
          onSelectFront={setSelectedFront}
          onSelectL2={setSelectedL2}
          realmSubs={realmSubs}
        />

        <main className="flex-1 overflow-y-auto">
          <IntelFeedContent
            selectedRealm={selectedRealm}
            selectedFront={selectedFront}
            selectedL2={selectedL2}
            sortBy={sortBy}
          />
        </main>
      </div>
    </div>
  );
}

interface IntelFeedContentProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  sortBy: 'hot' | 'new' | 'top';
}

function IntelFeedContent({
  selectedRealm,
  selectedFront,
  selectedL2,
  sortBy,
}: IntelFeedContentProps) {
  const contextLabel = selectedFront
    ? `${selectedRealm} · ${selectedFront}`
    : selectedL2
      ? `${selectedRealm} · ${selectedL2}`
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

        {/* Quick new thread button — carries current realm/front/l2 context */}
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

      {/* Thread list */}
      <ThreadList
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        sortBy={sortBy}
      />
    </div>
  );
}

/** Build /intel/new URL with optional realm context params */
function buildNewThreadUrl(
  realm: string | null,
  front: Front | null,
  l2: string | null,
): string {
  const params = new URLSearchParams();
  if (realm) params.set('realm', realm);
  if (front) params.set('front', front);
  if (l2) params.set('l2', l2);
  const qs = params.toString();
  return qs ? `/intel/new?${qs}` : '/intel/new';
}
