import { useMemo, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { RealmBar } from '@/components/intel/RealmBar';
import { IntelSidebar, type IntelView } from '@/components/intel/IntelSidebar';
import { REALM_ORDER } from '@/lib/constants';

/**
 * INTEL surface — where Bees interact with the Realms.
 * Layout:
 *   [Realm bar top — 13 realms, scrollable, drill-down to L2 / Fronts]
 *   [Left sidebar: retractable] [Content area: realm-filtered feed]
 *
 * This shell has layout wired; content feed comes next turn.
 */
export function IntelPage() {
  const { atoms, loaded } = useManualData();

  // Selection state (lifted here for now; moves to Zustand store later if needed)
  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [selectedFront, setSelectedFront] = useState<string | null>(null);
  const [selectedL2, setSelectedL2] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<IntelView>('home');

  // Compute L2 sub-categories per realm from the loaded atoms
  const realmSubs = useMemo(() => {
    if (!loaded) return {};
    const subs: Record<string, Set<string>> = {};
    for (const realm of REALM_ORDER) {
      subs[realm] = new Set<string>();
    }
    for (const atom of atoms) {
      if (atom.L2 && subs[atom.realm]) {
        subs[atom.realm].add(atom.L2);
      }
    }
    const result: Record<string, string[]> = {};
    for (const [realm, set] of Object.entries(subs)) {
      result[realm] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return result;
  }, [atoms, loaded]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Retractable left sidebar */}
      <IntelSidebar activeView={activeView} onSelectView={setActiveView} />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Realm bar (sticky top) */}
        <RealmBar
          selectedRealm={selectedRealm}
          selectedFront={selectedFront}
          selectedL2={selectedL2}
          onSelectRealm={setSelectedRealm}
          onSelectFront={setSelectedFront}
          onSelectL2={setSelectedL2}
          realmSubs={realmSubs}
        />

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <IntelContent
            selectedRealm={selectedRealm}
            selectedFront={selectedFront}
            selectedL2={selectedL2}
            activeView={activeView}
          />
        </main>
      </div>
    </div>
  );
}

/**
 * INTEL content area - placeholder for now.
 * Shows current selection state so Butch can verify the navigation works.
 */
function IntelContent({
  selectedRealm,
  selectedFront,
  selectedL2,
  activeView,
}: {
  selectedRealm: string | null;
  selectedFront: string | null;
  selectedL2: string | null;
  activeView: IntelView;
}) {
  const contextLabel = selectedFront
    ? `${selectedRealm} · ${selectedFront}`
    : selectedL2
      ? `${selectedRealm} · ${selectedL2}`
      : selectedRealm ?? 'All Realms';

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
      {/* Surface header */}
      <div className="mb-8 flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2"
          style={{
            borderColor: '#6B94C840',
            background: '#6B94C80D',
          }}
        >
          <MessagesSquare size={24} style={{ color: '#6B94C8' }} />
        </div>
        <div>
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            Social · Surface
          </div>
          <h1
            className="font-display text-3xl font-semibold tracking-wide"
            style={{ color: '#6B94C8' }}
          >
            INTEL
          </h1>
          <p
            className="mt-0.5 font-mono text-text-silver"
            style={{ fontSize: '13px' }}
          >
            Forum · where Bees interact with the Realms
          </p>
        </div>
      </div>

      {/* Current selection context — shows what realm/view is active */}
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-6">
        <div
          className="mb-2 font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Current view
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <div className="font-display text-2xl text-text-silver-bright">
            {contextLabel}
          </div>
          <div
            className="font-mono text-text-dim"
            style={{ fontSize: '12px' }}
            data-size="meta"
          >
            {viewLabel(activeView)}
          </div>
        </div>
      </div>

      {/* Empty state placeholder — content feed comes next */}
      <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center">
        <div
          className="mx-auto mb-3 h-1.5 w-12 rounded-full"
          style={{ background: '#6B94C8', opacity: 0.4 }}
        />
        <p className="text-text-silver" style={{ fontSize: '14px' }}>
          No threads in this view yet
        </p>
        <p
          className="mt-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Thread feed renders here next. The first Bees to contribute shape it.
        </p>
      </div>
    </div>
  );
}

function viewLabel(view: IntelView): string {
  switch (view) {
    case 'home':
      return 'feed · recommended';
    case 'hot':
      return 'feed · hot · last 24h';
    case 'new':
      return 'feed · newest first';
    case 'create':
      return 'composer';
    case 'mythreads':
      return 'threads I started';
    case 'following':
      return 'threads I follow';
    case 'saved':
      return 'saved threads';
    default:
      return '';
  }
}
