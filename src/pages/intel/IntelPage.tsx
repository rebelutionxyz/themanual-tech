import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ThreadList } from '@/components/intel/ThreadList';
import { L3Refinement } from '@/components/intel/L3Refinement';
import { InlineComposer } from '@/components/intel/InlineComposer';
import { TimeWindowBar } from '@/components/intel/TimeWindowBar';
import { useIntelStore } from '@/stores/useIntelStore';
import { useAuth } from '@/lib/auth';
import { createThread } from '@/lib/intel';
import { FRONT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

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
    hotWindow,
    breakingWindow,
    setRealm,
    setFront,
    setL2,
    setL3,
    setHotWindow,
    setBreakingWindow,
  } = useIntelStore();

  const sortBy: 'hot' | 'new' | 'top' =
    activeView === 'new' ? 'new' : 'hot';

  // Active time window depends on view. Home/following/saved/etc. use 0 (all-time).
  const activeWindow =
    activeView === 'hot' ? hotWindow : activeView === 'new' ? breakingWindow : 0;

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

  // Placeholder screens for coming-soon views
  if (activeView === 'forme' || activeView === 'prize' || activeView === 'following') {
    return <ComingSoonView view={activeView} />;
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
            INTEL {activeView === 'new' && '· Breaking'}
            {activeView === 'hot' && '· Hot'}
            {activeView === 'mythreads' && '· My threads'}
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

      {/* Inline composer — collapsed by default, click to expand. 2/3 width on ≥sm.
          Positioned first in the body (right under breadcrumb) — posting is the
          primary action on INTEL. Filtering/browsing tools (L3Refinement, time
          window) live below, closer to the results they affect. */}
      <div className="mb-4 sm:mx-auto sm:w-2/3">
        <InlineComposer
          mode="thread"
          enabled={!!bee}
          disabledMessage="Sign in to start a thread"
          draftKey="intel-thread-new"
          startCollapsed={true}
          header="Start a thread. Earn BLiNG!"
          subheader={
            selectedRealm
              ? `Posting in ${selectedRealm}${selectedFront ? ` · ${selectedFront}` : ''}${selectedL2 ? ` · ${selectedL2}` : ''}`
              : 'Posting to INTEL'
          }
          collapsedContextLabel={
            selectedRealm
              ? `Post to INTEL / ${selectedRealm}${selectedFront ? ` / ${selectedFront}` : ''}${selectedL2 ? ` / ${selectedL2}` : ''}`
              : 'Post to INTEL'
          }
          collapsedBodyLine="Share your thought..."
          placeholderCollapsed={
            selectedRealm
              ? `Start a thread in ${selectedRealm}${selectedFront ? ` · ${selectedFront}` : ''}. Earn BLiNG!`
              : 'Start a thread. Earn BLiNG!'
          }
          placeholderTitle="What's on your mind?"
          inheritedContext={{
            realm: selectedRealm,
            front: selectedFront,
            l2: selectedL2,
          }}
          onSubmit={async ({ title, body, atomIds, categoryPaths, realm, front, l2 }) => {
            if (!bee || !title) return false;
            try {
              const newId = await createThread(
                {
                  title,
                  body,
                  primaryRealm: realm,
                  primaryFront: front,
                  primaryL2: l2,
                  atomIds,
                  categoryPaths,
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

      {/* L3 refinement row + optional tree drill — below composer, closer to results */}
      <L3Refinement
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        onSelectL3={setL3}
        onSelectPath={(path) => {
          // Parse "Realm / Something / L3 / ..." and update the store so the
          // whole UI (breadcrumb, realm bar, flat L3 bar, composer context)
          // reflects the drilled-to position.
          //
          // Path shapes we handle:
          //   "Power"                              → realm only
          //   "Power / Activism"                   → realm + L2
          //   "Power / INVESTIGATE"                → realm + Front
          //   "Power / Activism / Civic Education" → realm + L2 + L3
          //   "Power / INVESTIGATE / 9/11"         → realm + Front + L3
          //   "Body / Nutrition / Hydration"       → realm + L2 + L3
          //   Anything deeper → keep L3 at parts[2], ignore deeper for filter
          const parts = path.split(' / ').map((s) => s.trim()).filter(Boolean);
          if (parts.length === 0) return;

          const FRONTS = [
            'UNITE & RULE',
            'INVESTIGATE',
            'THE NEW WORLD ORDER',
            'PROSECUTE',
            'THE DEEP STATE',
          ];

          // Always set the realm
          setRealm(parts[0]);

          // Clear deeper selections first, then reapply based on path depth
          setFront(null);
          setL2(null);
          setL3(null);

          if (parts.length >= 2) {
            const second = parts[1];
            if (FRONTS.includes(second)) {
              setFront(second as Front);
            } else {
              setL2(second);
            }
          }
          if (parts.length >= 3) {
            setL3(parts[2]);
          }
        }}
      />

      {/* Time window dropdown — above thread list, only for Hot/Breaking views */}
      {(activeView === 'hot' || activeView === 'new') && (
        <TimeWindowBar
          value={activeView === 'hot' ? hotWindow : breakingWindow}
          onChange={(h) => {
            if (activeView === 'hot') setHotWindow(h);
            else setBreakingWindow(h);
          }}
          mode={activeView === 'hot' ? 'hot' : 'breaking'}
        />
      )}

      {/* Thread list */}
      <ThreadList
        selectedRealm={selectedRealm}
        selectedFront={selectedFront}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        sortBy={sortBy}
        timeWindowHours={activeWindow}
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

function ComingSoonView({ view }: { view: 'forme' | 'prize' | 'following' }) {
  const info = {
    forme: {
      title: 'For Me',
      description:
        'Your personalized INTEL feed. Pick the atoms, realms, and pillars you want to follow — your "For Me" view will be the union of everything you subscribe to.',
      bullets: [
        'Subscribe to atoms (9/11, JFK, Epstein, Fed, etc.)',
        'Subscribe to realms or Fronts (Power · INVESTIGATE)',
        'Subscribe to pillars (Rebelution, FreedomBLiNGs)',
        'Follow specific Bees (coming with Following)',
      ],
      cta: 'Set up preferences',
      note: 'No algorithm deciding what you see. You decide.',
    },
    prize: {
      title: 'Prize',
      description:
        'Post bets with defined grounds. Another Bee matches your BLiNG! in escrow. Winner takes the pot when conditions resolve.',
      bullets: [
        'Bet on predictions (Fed decisions, election outcomes, market moves)',
        'Bet on verifiable facts, sports outcomes, proposition trades',
        'BLiNG! locked in escrow until resolution',
        'Community or verifiable oracle decides outcome',
      ],
      cta: 'Learn more',
      note: 'Lives at blingster.xyz · sovereign prediction market',
    },
    following: {
      title: 'Following',
      description:
        'Threads from Bees you follow. Curate your own timeline by choosing whose voices you want to hear.',
      bullets: [
        'Follow any Bee from their profile',
        'See only threads authored by Bees you follow',
        'Combines with realm filters (follow a Bee, view their Power threads)',
        'Unfollow anytime',
      ],
      cta: 'Browse Bees',
      note: 'No one\'s voice is amplified automatically. You choose who you hear.',
    },
  }[view];

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div
        className="rounded-lg border-2 bg-bg-elevated p-6 md:p-8 shadow-lg"
        style={{
          borderColor: '#6B94C880',
          boxShadow: '0 0 0 1px #6B94C825, 0 4px 14px rgba(0,0,0,0.35), 0 0 16px #6B94C820',
        }}
      >
        <div className="mb-2">
          <span
            className="font-mono uppercase tracking-widest text-honey/70"
            style={{ fontSize: '10.5px' }}
            data-size="meta"
          >
            Coming soon
          </span>
        </div>
        <h1
          className="mb-3 font-display tracking-wide"
          style={{ fontSize: '28px', color: '#6B94C8', fontWeight: 600 }}
        >
          {info.title}
        </h1>
        <p className="mb-4 text-text-silver" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {info.description}
        </p>
        <ul className="mb-5 space-y-1.5">
          {info.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-text-silver"
              style={{ fontSize: '13px' }}
            >
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full" style={{ background: '#6B94C8' }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div
          className="rounded-md border border-border bg-bg/60 p-3 font-mono text-text-dim"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {info.note}
        </div>
      </div>
    </div>
  );
}
