import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ThreadList } from '@/components/intel/ThreadList';
import { L3Refinement } from '@/components/intel/L3Refinement';
import { InlineComposer } from '@/components/intel/InlineComposer';
import { TimeWindowBar } from '@/components/intel/TimeWindowBar';
import { useIntelStore } from '@/stores/useIntelStore';
import { useAuth } from '@/lib/auth';
import { createThread } from '@/lib/intel';
import { REALM_NAMES, REALM_ID_BY_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const INTEL_COLOR = '#6B94C8';

/**
 * Thread list page. Sidebar + realm bar provided by IntelLayout.
 */
export function IntelPage() {
  const { bee } = useAuth();
  const navigate = useNavigate();

  const {
    selectedRealmId,
    selectedL2,
    selectedL3,
    activeView,
    hotWindow,
    breakingWindow,
    setRealmId,
    setL2,
    setL3,
    setHotWindow,
    setBreakingWindow,
  } = useIntelStore();

  const sortBy: 'hot' | 'new' | 'top' =
    activeView === 'new' ? 'new' : 'hot';

  const activeWindow =
    activeView === 'hot' ? hotWindow : activeView === 'new' ? breakingWindow : 0;

  const realmName = selectedRealmId ? REALM_NAMES[selectedRealmId] : null;

  const crumbs: BreadcrumbSegment[] = [];

  if (!selectedRealmId) {
    crumbs.push({
      label: 'All Realms',
      clickable: false,
      isDeepest: true,
    });
  } else {
    crumbs.push({
      label: realmName ?? selectedRealmId,
      clickable: !!(selectedL2 || selectedL3),
      isDeepest: !selectedL2 && !selectedL3,
      onClick: () => {
        setL2(null);
        setL3(null);
      },
    });

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

  if (activeView === 'forme' || activeView === 'prize' || activeView === 'following') {
    return <ComingSoonView view={activeView} />;
  }

  const subjectLabel = realmName
    ? `${realmName}${selectedL2 ? ` · ${selectedL2}` : ''}`
    : null;

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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

          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:gap-x-1">
            <button
              type="button"
              onClick={() => {
                setRealmId(null);
                setL2(null);
                setL3(null);
              }}
              title="Back to all INTEL"
              className={cn(
                'font-display tracking-wide border-b border-dotted transition-all',
                selectedRealmId
                  ? 'border-transparent text-text-muted hover:border-current hover:text-text-silver-bright hover:brightness-125'
                  : 'cursor-default border-transparent text-text-silver-bright',
                'text-[17px] sm:text-[22px]',
              )}
              disabled={!selectedRealmId}
            >
              Home
            </button>

            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-baseline gap-x-0.5 sm:gap-x-1">
                <ChevronRight
                  className="relative top-[2px] flex-shrink-0 text-text-muted sm:top-[3px] h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]"
                />
                {crumb.clickable && crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    title={`Back to ${crumb.label}`}
                    className={cn(
                      'font-display tracking-wide border-b border-dotted border-transparent transition-all hover:border-current hover:brightness-125 break-words',
                      crumb.isDeepest
                        ? 'text-[20px] sm:text-[26px]'
                        : 'text-[15px] sm:text-[22px]',
                    )}
                    style={{
                      color: crumb.color ?? '#8A94A0',
                      fontWeight: crumb.isDeepest ? 600 : 400,
                    }}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className={cn(
                      'font-display tracking-wide break-words',
                      crumb.isDeepest
                        ? 'text-[20px] sm:text-[26px]'
                        : 'text-[15px] sm:text-[22px]',
                    )}
                    style={{
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

      <div className="mb-4 sm:mx-auto sm:w-2/3">
        <InlineComposer
          mode="thread"
          enabled={!!bee}
          disabledMessage="Sign in to start a thread"
          draftKey="intel-thread-new"
          startCollapsed={true}
          header="Start a thread. Earn BLiNG!"
          subheader={
            subjectLabel ? `Posting in ${subjectLabel}` : 'Posting to INTEL'
          }
          collapsedContextLabel={
            subjectLabel
              ? `Post to INTEL / ${subjectLabel.replace(' · ', ' / ')}`
              : 'Post to INTEL'
          }
          collapsedBodyLine="Share your thought..."
          placeholderCollapsed={
            subjectLabel
              ? `Start a thread in ${subjectLabel}. Earn BLiNG!`
              : 'Start a thread. Earn BLiNG!'
          }
          placeholderTitle="What's on your mind?"
          inheritedContext={{
            realmId: selectedRealmId,
            l2: selectedL2,
          }}
          onSubmit={async ({ title, body, atomIds, categoryPaths, realmId, l2 }) => {
            if (!bee || !title) return false;
            try {
              const newId = await createThread(
                {
                  title,
                  body,
                  primaryRealm: realmId,
                  primaryL2: l2,
                  atomIds,
                  categoryPaths,
                },
                bee.id,
              );
              window.dispatchEvent(new CustomEvent('intel-counts-refresh'));
              navigate(`/intel/t/${newId}`);
              return true;
            } catch (err) {
              console.error(err);
              return false;
            }
          }}
        />
      </div>

      <L3Refinement
        selectedRealmId={selectedRealmId}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        onSelectL3={setL3}
        onSelectPath={(path) => {
          const parts = path.split(' / ').map((s) => s.trim()).filter(Boolean);
          if (parts.length === 0) return;

          const realmId = REALM_ID_BY_NAME[parts[0]];
          if (!realmId) return;

          setRealmId(realmId);
          setL2(null);
          setL3(null);

          if (parts.length >= 2) setL2(parts[1]);
          if (parts.length >= 3) setL3(parts[2]);
        }}
      />

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

      <ThreadList
        selectedRealmId={selectedRealmId}
        selectedL2={selectedL2}
        selectedL3={selectedL3}
        sortBy={sortBy}
        timeWindowHours={activeWindow}
        savedMode={activeView === 'saved'}
        myThreadsMode={activeView === 'mythreads'}
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
        'Subscribe to realms (Justice, Tech, Religion, etc.)',
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
        'Combines with realm filters (follow a Bee, view their Justice threads)',
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
          {info.bullets.map((b) => (
            <li
              key={b}
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
