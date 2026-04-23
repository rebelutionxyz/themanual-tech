import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ThreadList } from '@/components/intel/ThreadList';
import { L3Refinement } from '@/components/intel/L3Refinement';
import { InlineComposer } from '@/components/intel/InlineComposer';
import { useIntelStore } from '@/stores/useIntelStore';
import { useAuth } from '@/lib/auth';
import { createThread } from '@/lib/intel';
import { FRONT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const INTEL_COLOR = '#6B94C8';

/**
 * Thread list page. Sidebar + realm bar provided by IntelLayout.
 * Renders a breadcrumb-style header (no redundant "Discussion" title).
 */
export function IntelPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();

  const {
    selectedRealm,
    selectedFront,
    selectedL2,
    selectedL3,
    activeView,
    setRealm,
    setFront,
    setL2,
    setL3,
  } = useIntelStore();

  const sortBy: 'hot' | 'new' | 'top' =
    activeView === 'new' ? 'new' : 'hot';

  // Build breadcrumb segments based on what's selected
  const crumbs: BreadcrumbSegment[] = [];

  if (!selectedRealm) {
    crumbs.push({
      label: 'All Realms',
      clickable: false,
      isDeepest: true,
    });
  } else {
    crumbs.push({
      label: selectedRealm,
      clickable: !!(selectedFront || selectedL2 || selectedL3),
      isDeepest: !selectedFront && !selectedL2 && !selectedL3,
      onClick: () => {
        setFront(null);
        setL2(null);
      },
    });

    if (selectedFront) {
      crumbs.push({
        label: selectedFront,
        color: FRONT_COLORS[selectedFront],
        clickable: !!(selectedL2 || selectedL3),
        isDeepest: !selectedL2 && !selectedL3,
        onClick: () => {
          setL2(null);
          setL3(null);
        },
      });
    }

    if (selectedL2) {
      crumbs.push({
        label: selectedL2,
        clickable: !!selectedL3,
        isDeepest: !selectedL3,
        onClick: () => {
          setL3(null);
        },
      });
    }

    if (selectedL3) {
      crumbs.push({
        label: selectedL3,
        clickable: false,
        isDeepest: true,
      });
    }
  }

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      {/* Breadcrumb header row */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Small surface meta */}
          <div
            className="mb-1 font-mono uppercase tracking-widest"
            style={{ fontSize: '11px', color: INTEL_COLOR, opacity: 0.7 }}
            data-size="meta"
          >
            INTEL {activeView === 'new' && '· New'}
            {activeView === 'mythreads' && '· My threads'}
            {activeView === 'following' && '· Following'}
            {activeView === 'saved' && '· Saved'}
          </div>

          {/* Big breadcrumb */}
          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <button
              type="button"
              onClick={() => {
                setRealm(null);
                setFront(null);
                setL2(null);
                setL3(null);
              }}
              className={cn(
                'font-display tracking-wide transition-colors hover:text-text',
                selectedRealm
                  ? 'text-text-muted hover:text-text-silver'
                  : 'cursor-default text-text-silver-bright',
              )}
              style={{ fontSize: '22px' }}
              disabled={!selectedRealm}
            >
              Home
            </button>

            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-baseline gap-x-1">
                <ChevronRight
                  size={18}
                  className="relative top-[3px] flex-shrink-0 text-text-muted"
                />
                {crumb.clickable && crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="font-display tracking-wide text-text-silver transition-colors hover:text-text"
                    style={{
                      fontSize: crumb.isDeepest ? '26px' : '22px',
                      color: crumb.color,
                      fontWeight: crumb.isDeepest ? 600 : 400,
                    }}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className="font-display tracking-wide"
                    style={{
                      fontSize: crumb.isDeepest ? '26px' : '22px',
                      color: crumb.isDeepest
                        ? crumb.color ?? '#E0E6EC'
                        : crumb.color ?? '#8A94A0',
                      fontWeight: crumb.isDeepest ? 600 : 400,
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Inline composer (replaces "+ Thread" button) */}
      <div className="mb-4">
        <InlineComposer
          mode="thread"
          enabled={!!bee}
          disabledMessage="Sign in to start a thread"
          draftKey="intel-thread-new"
          allowExpand={true}
          expandUrl="/intel/new"
          header="Start a thread. Earn BLiNG!"
          subheader={
            selectedRealm
              ? `Posting in ${selectedRealm}${selectedFront ? ` · ${selectedFront}` : ''}${selectedL2 ? ` · ${selectedL2}` : ''}`
              : 'Posting to INTEL'
          }
          placeholderTitle="What's on your mind?"
          inheritedContext={{
            realm: selectedRealm,
            front: selectedFront,
            l2: selectedL2,
          }}
          onSubmit={async ({ title, body, atomIds }) => {
            if (!bee || !title) return false;
            try {
              const newId = await createThread(
                {
                  title,
                  body,
                  primaryRealm: selectedRealm ?? null,
                  primaryFront: selectedFront ?? null,
                  primaryL2: selectedL2 ?? null,
                  atomIds,
                },
                bee.id,
              );
              navigate(`/intel/t/${newId}`);
              return true;
            } catch (err) {
              console.error(err);
              return false;
            }
          }}
        />
      </div>

      {/* L3 refinement row + optional tree drill */}
      <L3Refinement
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        onSelectL3={setL3}
        onSelectPath={(path) => {
          // Parse "Realm / L2 / L3 / L4 / ..." — update store based on depth
          const parts = path.split(' / ').map((s) => s.trim());
          // Skip root (parts[0] is already selectedRealm)
          if (parts.length >= 2) {
            const second = parts[1];
            // If second part is a Front, set Front; else set L2
            const FRONTS = ['UNITE & RULE', 'INVESTIGATE', 'THE NEW WORLD ORDER', 'PROSECUTE', 'THE DEEP STATE'];
            if (FRONTS.includes(second)) {
              // Path is Realm / Front / L3 / ...
              if (parts.length >= 3) setL3(parts[2]);
              else setL3(null);
            } else {
              // Path is Realm / L2 / L3 / ...
              if (parts.length >= 3) setL3(parts[2]);
              else setL3(null);
            }
          }
        }}
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

interface BreadcrumbSegment {
  label: string;
  color?: string;
  clickable: boolean;
  isDeepest: boolean;
  onClick?: () => void;
}
