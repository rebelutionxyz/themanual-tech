// FRONT58 — the /mc live board's data hook.
//
// OWNER REQUEST 2026-08-17: "the rail should auto update when there are active
// jobs". /mc was a snapshot: it read once at mount and then sat there while
// passes were claimed, heartbeated and closed underneath it.
//
// WHY A POLL AND NOT REALTIME. `postgres_changes` on the ops tables would need
// those tables added to the supabase_realtime publication, and a public-safe
// read view first (the DB47 justice_entities_public pattern) — a database-shaped
// decision with a security surface. Owner ruled polling now, Realtime later, and
// this file deliberately does not reach for it.
//
// WHY IT STOPS. An idle board must not hammer the database all night. The rail
// is quiet far more often than it is busy, and a 5-second poll left open
// overnight is ~17,000 pointless round trips. So the cadence follows the board:
//
//   any pass claimed  -> LIVE_MS, because that is when the numbers move
//   nothing claimed   -> IDLE_MS, purely to notice a new claim appearing
//   tab hidden        -> nothing at all, and one immediate read on return
//
// A setTimeout CHAIN, NOT setInterval. The next read is scheduled only after the
// previous one lands, so a slow response can never stack requests on a laggy
// connection — the failure mode of an interval-driven poller.
//
// ACCESS. Every read here goes through the path /mc already uses: the anon
// client carrying the signed-in Bee's session, against tables whose RLS is
// `authenticated` + is_platform_admin() (migration 20260731040000). NOTHING here
// loosens RLS, adds a policy, or ships a service key to the browser. A non-admin
// reading through this hook gets zero rows, which is the correct answer.

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Poll cadence while at least one pass is claimed. */
const LIVE_MS = 8_000;

/**
 * Poll cadence while nothing is claimed.
 *
 * The dispatch says stop polling when the board goes quiet and allows a slow
 * background check to notice a claim appearing. A minute is that check: on a
 * quiet board it is 60 reads an hour instead of 450, and a pass that starts is
 * visible within a minute — well inside the time it takes anyone to look up.
 */
const IDLE_MS = 60_000;

/** How many finished passes trail the live queue. */
export const RECENT_DONE = 5;

export interface RailDispatch {
  id: string;
  pass: string;
  title: string;
  status: string;
  lane: string | null;
  priority: number | null;
  after_pass: string | null;
  claimed_by: string | null;
  created_at: string;
  claimed_at: string | null;
  /** Last sign of life from the holding session. NULL until the first ping. */
  heartbeat_at: string | null;
}

/**
 * One row of public.ops_dispatch_location — the pass-to-folder join that already
 * exists. The dispatch is explicit: do not create a new view and do not build a
 * second join. This reads that view as it stands.
 */
export interface RailLocation {
  pass: string;
  workdir_slug: string | null;
  rel_path: string | null;
  repo: string | null;
  is_git_repo: boolean | null;
  workdir_active: boolean | null;
}

export interface StaleClaim {
  pass: string;
  claimed_at: string | null;
  heartbeat_at: string | null;
  minutes_silent: number;
  threshold_minutes: number;
  report_exists: boolean;
  question_filed: boolean;
  suggested_action: string;
}

export interface RailBoard {
  queue: RailDispatch[] | null;
  recentDone: RailDispatch[] | null;
  /** Folder per pass. Empty map + `locationError` set means the read failed. */
  locations: Map<string, RailLocation>;
  stale: Map<string, StaleClaim>;
  /**
   * Minutes of silence at which a claim becomes a suspicion. Read from
   * public.ops_stale_threshold_minutes(), never hardcoded — the number is the
   * database's to change and a copy here would rot the first time it did.
   */
  thresholdMinutes: number | null;
  queueError: string | null;
  staleError: string | null;
  locationError: string | null;
  /** True while the fast cadence is running, i.e. something is claimed. */
  live: boolean;
  /** Epoch ms of the last completed read, for the "updated Ns ago" line. */
  lastReadAt: number | null;
}

const EMPTY: RailBoard = {
  queue: null,
  recentDone: null,
  locations: new Map(),
  stale: new Map(),
  thresholdMinutes: null,
  queueError: null,
  staleError: null,
  locationError: null,
  live: false,
  lastReadAt: null,
};

const DISPATCH_COLS =
  'id, pass, title, status, lane, priority, after_pass, claimed_by, created_at, claimed_at, heartbeat_at';

const LOCATION_COLS = 'pass, workdir_slug, rel_path, repo, is_git_repo, workdir_active';

const STALE_COLS =
  'pass, claimed_at, heartbeat_at, minutes_silent, threshold_minutes, report_exists, question_filed, suggested_action';

/**
 * The live board.
 *
 * `enabled` is the admin gate: false keeps the hook completely inert, so a
 * signed-out or non-admin visitor issues no queries at all rather than a stream
 * of reads that would each return nothing.
 */
export function useRailBoard(enabled: boolean): RailBoard {
  const [board, setBoard] = useState<RailBoard>(EMPTY);

  // Held in a ref rather than state: the scheduler reads it to pick the next
  // delay, and routing that through a re-render would make the cadence depend on
  // React's timing instead of on the board's.
  const liveRef = useRef(false);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readOnce = useCallback(async () => {
    if (!supabase) return;

    // Four independent reads, deliberately not one. The live queue is ordered by
    // urgency and the finished tail by recency (different sorts); the stale view
    // and the location view cannot be joined to a table by PostgREST anyway.
    // They are matched client-side on `pass`, which is UNIQUE on ops_dispatches
    // (ops_dispatches_pass_uidx) — the same guarantee after_pass relies on.
    const [live, done, staleRows, locationRows] = await Promise.all([
      supabase
        .from('ops_dispatches')
        .select(DISPATCH_COLS)
        .in('status', ['queued', 'claimed'])
        .order('priority', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('ops_dispatches')
        .select(DISPATCH_COLS)
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(RECENT_DONE),
      supabase
        .from('ops_stale_claims')
        .select(STALE_COLS)
        .order('minutes_silent', { ascending: false }),
      // The whole view, not a filtered slice. It is one narrow row per dispatch
      // and carries no bodies; filtering it by the passes on screen would mean
      // waiting for the queue read first, turning a parallel fetch into a serial
      // one to save a few hundred bytes.
      supabase
        .from('ops_dispatch_location')
        .select(LOCATION_COLS),
    ]);

    if (cancelled.current) return;

    // OPS43's rule, applied to all four: an empty panel reads as "nothing is
    // happening", which is a lie when the truth is "the read failed". Every
    // branch below keeps the failure visible instead of degrading to empty.
    let queue: RailDispatch[] = [];
    let queueError: string | null = null;
    if (live.error) {
      queueError = live.error.message;
    } else {
      // FRONTMC1 — a fixed, predictable board order so a lane is always in the
      // same spot and a watcher can track it without re-reading. PostgREST cannot
      // order on the derived status key, so the whole comparison lives here:
      //   1. CLAIMED/active group first, then QUEUED (LAST N DONE trails
      //      separately in `recentDone`).
      //   2. within a group, LANE alphabetically — the owner's ask, so a lane
      //      never moves under you; a null lane sorts last.
      //   3. then priority, then age — stable tie-breakers.
      queue = ((live.data ?? []) as RailDispatch[]).slice().sort((a, b) => {
        const ac = a.status === 'claimed' ? 0 : 1;
        const bc = b.status === 'claimed' ? 0 : 1;
        if (ac !== bc) return ac - bc;
        if (a.lane !== b.lane) {
          if (a.lane === null) return 1;
          if (b.lane === null) return -1;
          return a.lane.localeCompare(b.lane);
        }
        const ap = a.priority ?? 100;
        const bp = b.priority ?? 100;
        if (ap !== bp) return ap - bp;
        return a.created_at.localeCompare(b.created_at);
      });
    }

    const locations = new Map<string, RailLocation>();
    if (!locationRows.error) {
      for (const row of (locationRows.data ?? []) as RailLocation[]) locations.set(row.pass, row);
    }

    const stale = new Map<string, StaleClaim>();
    if (!staleRows.error) {
      for (const row of (staleRows.data ?? []) as StaleClaim[]) stale.set(row.pass, row);
    }

    const claimed = queue.some((d) => d.status === 'claimed');
    liveRef.current = claimed;

    setBoard((prev) => ({
      queue,
      recentDone: done.error ? [] : ((done.data ?? []) as RailDispatch[]),
      locations,
      stale,
      // Fetched once and kept: the threshold is configuration, not board state.
      thresholdMinutes: prev.thresholdMinutes,
      queueError,
      staleError: staleRows.error ? staleRows.error.message : null,
      // An EMPTY view is not the same fact as a FAILED view, and on this board
      // they would look identical — every folder cell would read "—". The two
      // are kept apart here and said apart on screen.
      locationError: locationRows.error
        ? locationRows.error.message
        : locations.size === 0 && queue.length > 0
          ? 'ops_dispatch_location returned zero rows'
          : null,
      live: claimed,
      lastReadAt: Date.now(),
    }));
  }, []);

  // The threshold, read once. It is a function call rather than a column, and
  // `authenticated` holds EXECUTE on it, so it needs no admin gate of its own.
  useEffect(() => {
    if (!enabled || !supabase) return;
    let dead = false;
    (async () => {
      const { data, error } = await supabase.rpc('ops_stale_threshold_minutes');
      if (dead || error) return;
      const mins = typeof data === 'number' ? data : Number(data);
      if (Number.isFinite(mins)) setBoard((prev) => ({ ...prev, thresholdMinutes: mins }));
    })();
    return () => {
      dead = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    cancelled.current = false;

    const clear = () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const tick = async () => {
      // A hidden tab reads nothing. The board is a thing you look at; a
      // background tab left open for a week is exactly the "hammer the database
      // all night" case, and it cannot be seen while it happens.
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(IDLE_MS);
        return;
      }
      await readOnce();
      if (cancelled.current) return;
      schedule(liveRef.current ? LIVE_MS : IDLE_MS);
    };

    const schedule = (ms: number) => {
      clear();
      timer.current = setTimeout(tick, ms);
    };

    // One read immediately, then the chain takes over.
    void tick();

    // Coming back to the tab should show current data, not whatever was on
    // screen when it was hidden — so the return fires a read rather than waiting
    // out the remaining delay.
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled.current = true;
      clear();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, readOnce]);

  return board;
}

/** The three states a claim's silence can be in. */
export type HeartbeatState = 'current' | 'quiet' | 'past-threshold';

/**
 * Where a claim sits against the threshold.
 *
 * `quiet` starts at half the threshold. That fraction is a display choice, not a
 * rule: the database owns the one number that means anything (past it, a claim
 * becomes a suspicion), and the middle band exists only so a board watcher sees
 * a pass drifting before it crosses. Nothing acts on `quiet`.
 */
export function heartbeatState(minutes: number, threshold: number | null): HeartbeatState {
  if (threshold === null) return 'current';
  if (minutes >= threshold) return 'past-threshold';
  if (minutes >= threshold / 2) return 'quiet';
  return 'current';
}

/**
 * Minutes since the last sign of life, measured from the `now` clock rather than
 * read off a server snapshot — a number fetched once would freeze on a board
 * left open, which is the same rot the elapsed clock exists to prevent.
 *
 * Falls back to `claimed_at`: a claim that has never pinged is silent from the
 * moment it was taken, which is exactly what R2c says.
 */
export function silentMinutes(d: RailDispatch, now: number): number | null {
  const iso = d.heartbeat_at ?? d.claimed_at;
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 60000));
}

export function shortDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
