import { WatchedGroupsRow } from '@/components/groups/WatchedGroupsRow';
import { L3Refinement } from '@/components/intel/L3Refinement';
import { PostConsole } from '@/components/intel/PostConsole';
import { ReportsQueue } from '@/components/intel/ReportsQueue';
import { ThreadList } from '@/components/intel/ThreadList';
import { PLACES_ROOT } from '@/components/shell/LocationPanel';
import { RealmChips } from '@/components/shell/RealmChipsBar';
import { REALM_ID_BY_NAME } from '@/lib/constants';
import { SURFACE_BY_SLUG } from '@/lib/surfaces';
import { useIntelStore } from '@/stores/useIntelStore';
import { useLensStore } from '@/stores/useLensStore';

const INTEL_NAME = SURFACE_BY_SLUG.get('intel')?.name ?? 'INTEL';

/**
 * Thread list page. Sidebar + realm bar provided by IntelLayout.
 */
export function IntelPage() {
  const { activeView, feedSort } = useIntelStore();
  // The realm lens is the shared prefix (display-name segments on realm_path).
  const prefix = useLensStore((s) => s.path);
  const setPrefix = useLensStore((s) => s.setPrefix);
  const clearRealms = useLensStore((s) => s.clearRealms);
  const selectedCount = useLensStore((s) => s.selectedRealms.length);

  const selectedRealmId = prefix[0] ? (REALM_ID_BY_NAME[prefix[0]] ?? null) : null;
  const selectedL2 = prefix[1] ?? null;

  // Breadcrumb trail DELETED (Butch 2026-07-18): the header is the Astra
  // name with the selected-realm chips (closeable buttons) right behind it.
  const showHeader = prefix.length > 0 || selectedCount > 0;

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
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={() => {
              setPrefix([]);
              clearRealms();
            }}
            title="Back to all INTEL"
            className="border-b border-dotted border-transparent font-display text-[17px] tracking-wide text-zinc-900 transition-all hover:border-current sm:text-[22px]"
          >
            {INTEL_NAME}
          </button>
          {/* Selected realms as closeable buttons, right behind the Astra
              name — replaces the breadcrumb trail (Butch 2026-07-18).
              A place pick shows in the LocationBadge, not here. */}
          <RealmChips excludePrefixes={[PLACES_ROOT]} />
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

      {/* Bookmarked = Watching: watched groups ride above the saved threads. */}
      {activeView === 'saved' && <WatchedGroupsRow />}

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
