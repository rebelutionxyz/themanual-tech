import { useCallback, useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { REALM_ID_BY_NAME, REALM_NAMES } from '@/lib/constants';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_COLOR_FALLBACK, useRealmColors } from '@/stores/useRealmColors';
import type { RealmId } from '@/types/manual';
import {
  pulseLiveNow,
  pulseUpcoming,
  pulseLibrary,
  type PulseLive,
  type PulseUpcoming,
  type PulseLibraryItem,
} from '@/lib/pulse';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { PulseSearch } from '@/components/pulse/PulseSearch';
import {
  LiveNowCard,
  UpcomingCard,
  LibraryCard,
  PULSE_RED,
} from '@/components/pulse/cards';

const LIBRARY_PAGE = 24;

// Stable keys for fixed-length loading skeletons (avoids array-index keys).
const SKELETON_KEYS = ['sk0', 'sk1', 'sk2', 'sk3', 'sk4', 'sk5'];

export function PulseHome() {
  // Realm filter comes from the platform lens, driven by the community shell's
  // RealmStrip (PULSE mounts under CommunityLayout). `path` is the display-name
  // prefix on realm_path — exactly what the pulse_* RPCs expect as p_realm_prefix.
  const realmId = useLensStore((s) => s.realmId);
  const path = useLensStore((s) => s.path);
  const realmName = realmId ? REALM_NAMES[realmId] : null;
  const realmPrefix = path;
  const realmKey = path.join(' / '); // stable effect dep

  // Realm tint comes from main's canonical DB-driven realm-color store.
  // CommunityLayout already triggers the one-time load on mount.
  const realmColors = useRealmColors((s) => s.colors);
  const colorFor = useCallback(
    (raw: string | null | undefined): string => {
      if (!raw) return REALM_COLOR_FALLBACK;
      const name = raw.trim();
      // pulse rows carry the realm DISPLAY name ("Society"); map → RealmId.
      // 'Technology' is a known seed variant of the 'tech' realm.
      const id =
        REALM_ID_BY_NAME[name] ??
        (name.toLowerCase() === 'technology' ? 'tech' : name.toLowerCase());
      return realmColors[id as RealmId] ?? REALM_COLOR_FALLBACK;
    },
    [realmColors],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 md:px-8">
      <PulseHeader realm={realmName} />

      <div className="mt-6">
        <PulseSearch />
      </div>

      <LiveNowSection realmPrefix={realmPrefix} realmKey={realmKey} colorFor={colorFor} />
      <UpcomingSection colorFor={colorFor} />
      <LibrarySection realmPrefix={realmPrefix} realmKey={realmKey} colorFor={colorFor} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────

function PulseHeader({ realm }: { realm: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
        style={{ borderColor: `${PULSE_RED}40`, background: `${PULSE_RED}0D` }}
      >
        <Radio size={22} style={{ color: PULSE_RED }} />
      </div>
      <div>
        <h1
          className="font-display text-3xl font-semibold tracking-wide"
          style={{ color: PULSE_RED }}
        >
          PULSE
        </h1>
        <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }}>
          Live News Network{realm ? ` · ${realm}` : ''} · free to watch
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section scaffolding
// ─────────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-1 rounded-full" style={{ background: PULSE_RED }} />
      <h2 className="font-display text-lg tracking-wide text-zinc-900">{children}</h2>
    </div>
  );
}

function StateLine({ tone, children }: { tone?: 'error' | 'muted'; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center font-mono"
      style={{ fontSize: '12px' }}
    >
      <span className={tone === 'error' ? 'text-red-600' : 'text-zinc-500'}>{children}</span>
    </div>
  );
}

function GridSkeleton({ count, aspect = true }: { count: number; aspect?: boolean }) {
  return (
    <>
      {SKELETON_KEYS.slice(0, count).map((key) => (
        <div key={key} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {aspect && <div className="aspect-video w-full animate-pulse bg-zinc-100" />}
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </>
  );
}

type ColorFn = (realmNameOrId: string | null | undefined) => string;

// ─────────────────────────────────────────────────────────────────────────
// Live now
// ─────────────────────────────────────────────────────────────────────────

function LiveNowSection({
  realmPrefix,
  realmKey,
  colorFor,
}: {
  realmPrefix: string[];
  realmKey: string;
  colorFor: ColorFn;
}) {
  const [items, setItems] = useState<PulseLive[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: realmKey is the stable serialization of realmPrefix
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    pulseLiveNow(realmPrefix)
      .then((res) => !cancelled && setItems(res))
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [realmKey]);

  return (
    <section className="mt-8">
      <SectionTitle>Live now</SectionTitle>
      {error ? (
        <StateLine tone="error">{error}</StateLine>
      ) : items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GridSkeleton count={3} />
        </div>
      ) : items.length === 0 ? (
        <StateLine>
          {realmKey
            ? `Nothing live in ${realmKey} right now.`
            : 'No live broadcasts right now. Check the schedule below.'}
        </StateLine>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <LiveNowCard key={item.broadcastId} item={item} colorFor={colorFor} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Upcoming
// ─────────────────────────────────────────────────────────────────────────

function UpcomingSection({ colorFor }: { colorFor: ColorFn }) {
  const [items, setItems] = useState<PulseUpcoming[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    pulseUpcoming()
      .then((res) => !cancelled && setItems(res))
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the section entirely when there's nothing scheduled — keeps the page
  // from looking broken on sparse seed data.
  if (error) return null;
  if (items !== null && items.length === 0) return null;

  return (
    <section className="mt-8">
      <SectionTitle>Upcoming</SectionTitle>
      {items === null ? (
        <div className="flex gap-3">
          {SKELETON_KEYS.slice(0, 3).map((key) => (
            <div
              key={key}
              className="h-28 w-64 flex-shrink-0 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
            />
          ))}
        </div>
      ) : (
        <ScrollRow>
          {items.map((item) => (
            <UpcomingCard key={item.broadcastId} item={item} colorFor={colorFor} />
          ))}
        </ScrollRow>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Library
// ─────────────────────────────────────────────────────────────────────────

function LibrarySection({
  realmPrefix,
  realmKey,
  colorFor,
}: {
  realmPrefix: string[];
  realmKey: string;
  colorFor: ColorFn;
}) {
  const [items, setItems] = useState<PulseLibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const offset = items?.length ?? 0;
      const page = await pulseLibrary(realmPrefix, LIBRARY_PAGE, offset);
      setItems((prev) => [...(prev ?? []), ...page]);
      if (page.length < LIBRARY_PAGE) setExhausted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoadingMore(false);
    }
    // realmPrefix is reflected via realmKey in the resetting effect below
  }, [items, realmPrefix]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: realmKey is the stable serialization of realmPrefix; first page only
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    setExhausted(false);
    pulseLibrary(realmPrefix, LIBRARY_PAGE, 0)
      .then((page) => {
        if (cancelled) return;
        setItems(page);
        if (page.length < LIBRARY_PAGE) setExhausted(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [realmKey]);

  return (
    <section className="mt-8">
      <SectionTitle>Library</SectionTitle>
      {error ? (
        <StateLine tone="error">{error}</StateLine>
      ) : items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <GridSkeleton count={4} />
        </div>
      ) : items.length === 0 ? (
        <StateLine>
          {realmKey
            ? `No recordings in ${realmKey} yet.`
            : 'No recordings yet. The first broadcasts will land here.'}
        </StateLine>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <LibraryCard key={item.broadcastId} item={item} colorFor={colorFor} />
            ))}
          </div>
          {!exhausted && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-zinc-200 bg-white px-5 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
