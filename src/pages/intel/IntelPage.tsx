import { L3Refinement } from '@/components/intel/L3Refinement';
import { PostConsole } from '@/components/intel/PostConsole';
import { ReportsQueue } from '@/components/intel/ReportsQueue';
import { ThreadList } from '@/components/intel/ThreadList';
import { REALM_ID_BY_NAME } from '@/lib/constants';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';
import { ChevronRight } from 'lucide-react';

const INTEL_NAME = SURFACE_BY_SLUG.get('intel')?.name ?? 'INTEL';

/**
 * Thread list page. Sidebar + realm bar provided by IntelLayout.
 */
export function IntelPage() {
  const { activeView, feedSort } = useIntelStore();
  // The realm lens is the shared prefix (display-name segments on realm_path).
  const prefix = useLensStore((s) => s.path);
  const setPrefix = useLensStore((s) => s.setPrefix);

  const selectedRealmId = prefix[0] ? (REALM_ID_BY_NAME[prefix[0]] ?? null) : null;
  const selectedL2 = prefix[1] ?? null;

  // Breadcrumb segments are driven straight from the active prefix (work order
  // §1): INTEL › {realm_path joined by ›}. Each segment pops the lens to that
  // depth; the deepest is the current position.
  const crumbs: BreadcrumbSegment[] = [];
  // Root (no realm selected) shows NO header — just composer + feed. The
  // breadcrumb appears only once a realm IS picked.
  prefix.forEach((seg, i) => {
    const deepest = i === prefix.length - 1;
    crumbs.push({
      label: seg,
      clickable: !deepest,
      isDeepest: deepest,
      onClick: deepest ? undefined : () => setPrefix(prefix.slice(0, i + 1)),
    });
  });
  const showHeader = prefix.length > 0;

  if (activeView === 'forme') {
    return <ComingSoonView view={activeView} />;
  }

  // Following — threads authored by Bees you follow (bee_follows_v1).
  if (activeView === 'following') {
    return (
      <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
        <ThreadList prefix={[]} feedSort={feedSort} followingMode />
      </div>
    );
  }

  if (activeView === 'reports') {
    return <ReportsQueue />;
  }

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      {showHeader && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:gap-x-1">
              <button
                type="button"
                onClick={() => setPrefix([])}
                title="Back to all INTEL"
                className={cn(
                  'font-display tracking-wide border-b border-dotted transition-all',
                  prefix.length > 0
                    ? 'border-transparent text-zinc-500 hover:border-current hover:text-zinc-900'
                    : 'cursor-default border-transparent text-zinc-900',
                  'text-[17px] sm:text-[22px]',
                )}
                disabled={prefix.length === 0}
              >
                {INTEL_NAME}
              </button>

              {crumbs.map((crumb, i) => (
                <span
                  key={`${crumb.label}-${i}`}
                  className="flex items-baseline gap-x-0.5 sm:gap-x-1"
                >
                  <ChevronRight className="relative top-[2px] flex-shrink-0 text-zinc-400 sm:top-[3px] h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
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
                        color: crumb.color ?? '#71717A',
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
                          ? (crumb.color ?? '#18181B')
                          : (crumb.color ?? '#71717A'),
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
      )}

      <PostConsole />

      <L3Refinement
        selectedRealmId={selectedRealmId}
        selectedL2={selectedL2}
        selectedL3={prefix[2] ?? null}
        onSelectPath={(path) => {
          const parts = path
            .split(' / ')
            .map((s) => s.trim())
            .filter(Boolean);
          if (parts.length === 0 || !REALM_ID_BY_NAME[parts[0]]) return;
          setPrefix(parts);
        }}
      />

      {/* Recency window control folded into the toolbar's Time popup
          (dispatch §5). hotWindow/breakingWindow still drive the list below. */}
      <ThreadList
        prefix={prefix}
        feedSort={feedSort}
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

function ComingSoonView({ view }: { view: 'forme' | 'following' }) {
  const info = {
    forme: {
      title: 'For Me',
      description:
        'Your personalized INTEL feed. Pick the atoms, realms, and astras you want to follow — your "For Me" view will be the union of everything you subscribe to.',
      bullets: [
        'Subscribe to atoms (9/11, JFK, Epstein, Fed, etc.)',
        'Subscribe to realms (Justice, Tech, Religion, etc.)',
        'Subscribe to astras (Rebelution, FreedomBLiNGs)',
        'Follow specific Bees (coming with Following)',
      ],
      cta: 'Set up preferences',
      note: 'No algorithm deciding what you see. You decide.',
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
      note: "No one's voice is amplified automatically. You choose who you hear.",
    },
  }[view];

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div
        className="rounded-lg border bg-white p-6 shadow-sm md:p-8"
        style={{
          borderColor: '#1D9BF040',
          boxShadow: '0 0 0 1px #1D9BF014, 0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        <div className="mb-2">
          <span
            className="font-mono uppercase tracking-widest"
            style={{ fontSize: '10.5px', color: '#1D9BF0' }}
            data-size="meta"
          >
            Coming soon
          </span>
        </div>
        <h1
          className="mb-3 font-display tracking-wide"
          style={{ fontSize: '28px', color: '#1D9BF0', fontWeight: 600 }}
        >
          {info.title}
        </h1>
        <p className="mb-4 text-zinc-700" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {info.description}
        </p>
        <ul className="mb-5 space-y-1.5">
          {info.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-zinc-700"
              style={{ fontSize: '13px' }}
            >
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                style={{ background: '#1D9BF0' }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div
          className="rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-zinc-500"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {info.note}
        </div>
      </div>
    </div>
  );
}
