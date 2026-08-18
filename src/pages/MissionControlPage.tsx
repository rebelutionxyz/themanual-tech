// /mc — build progress on the web. READ-ONLY.
//
// Butch, 2026-07-29: "we couldn't add mission control like that? It is nice to
// have." Half of it can move and half of it cannot:
//
//   * THE BOARD moves. It is a SELECT against the rail, and the app already
//     ships a Supabase client talking to the same database.
//   * THE SPAWN CANNOT. Local mission control opens Windows Terminal windows via
//     node:child_process. A page on a public domain cannot open a terminal on
//     anyone's desk, and bridging https -> localhost would be the wrong thing to
//     build. server.mjs keeps spawn; this route says so out loud so nobody hunts
//     for buttons that cannot exist here.
//
// ACCESS (Butch ruling 2026-07-31, "wide step titles and progress bar"):
// admin-only, enforced in the DATABASE by RLS policies using is_platform_admin()
// — see migration 20260731040000_ops_rail_admin_read_v1.sql. The gate below is
// courtesy, not security: a non-admin who bypassed it would still read zero rows.
//
// STANDING CONDITION: wide is safe BECAUSE the admin set is one person. A second
// bees.is_admin Bee gets the entire rail. Revisit when that happens.
//
// FRONT58 — THE BOARD IS LIVE AND IT SHOWS THE FOLDER. Owner, 2026-08-17: "the
// rail should auto update when there are active jobs". Two display defects, one
// pass: the page was a snapshot that never refreshed while work ran, and it
// never said WHICH FOLDER a pass belonged to, so the only way to know was to run
// SQL by hand. Polling and cadence live in `useRailBoard`; this file is the
// board it draws. Realtime is deliberately not used — owner ruled polling now.
//
// NEVER RENDER A BODY. `ops_dispatches.body` and `ops_reports.body` carry
// operational instructions and are not board data. Titles only, and nothing on
// this page selects a body column.

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  type RailBoard,
  type RailDispatch,
  type RailLocation,
  type StaleClaim,
  heartbeatState,
  shortDuration,
  silentMinutes,
  useRailBoard,
} from '@/lib/useRailBoard';
import { Lock, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Step {
  astra: string;
  phase_no: number;
  phase: string;
  step_no: number;
  title: string;
  dispatch_pass: string | null;
  effort: string | null;
  derived_status: string;
  est_p25: number | null;
  est_median: number | null;
  est_p75: number | null;
  est_sample_n: number | null;
}

const DISPATCH_MARK: Record<string, string> = {
  claimed: '▶',
  queued: '☐',
  done: '✓',
};

const TITLE_MAX = 70;

function shortTitle(t: string): string {
  return t.length <= TITLE_MAX ? t : `${t.slice(0, TITLE_MAX - 1)}…`;
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clockTime(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const MARK: Record<string, string> = {
  done: '✓',
  in_progress: '▶',
  blocked: '⏸',
  parked: '·',
  not_started: '☐',
};

// OPS53. `astra` is a lowercase key ('oracle'); the board printed it raw and the
// ProgressBar's `uppercase` class turned it into "ORACLE" — correct-ish, but not
// the brand, and alphabetical order buried it under 37 games+ops rows. Both are
// fixed here: real display names, and the astra under active build sorts first.
const ASTRA_LABEL: Record<string, string> = {
  oracle: 'h24',
  games: 'Games',
  ops: 'Ops',
};

// Lower sorts earlier. Anything unlisted lands after these, alphabetically.
const ASTRA_ORDER: Record<string, number> = { oracle: 0, games: 1, ops: 2 };

function astraLabel(astra: string): string {
  return ASTRA_LABEL[astra] ?? astra;
}

function astraRank(astra: string): number {
  return ASTRA_ORDER[astra] ?? 50;
}

// Elapsed for a claimed dispatch. Deliberately coarse: no seconds, no percentage.
// A pass has no measurable "percent complete" and inventing one would be fake
// precision (ruled out) — elapsed-since-claim is the honest signal.
function elapsedSince(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return 'just claimed';
  return `claimed ${shortDuration(mins)} ago`;
}

// A range is only honest with enough samples behind it. Below this the panel
// says so rather than printing a number that looks authoritative (OPS33 §2).
const MIN_SAMPLE_FOR_RANGE = 5;

function estimate(s: Step): string {
  const n = s.est_sample_n ?? 0;
  if (n < MIN_SAMPLE_FOR_RANGE) return `not calibrated (n=${n})`;
  if (s.est_p25 == null || s.est_p75 == null) return `n=${n}`;
  return `${Math.round(s.est_p25)}–${Math.round(s.est_p75)} min · n=${n}`;
}

export default function MissionControlPage() {
  const { bee, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // OPS53: a clock, not a data refresh. "claimed 12m ago" rendered once at mount
  // would quietly rot into a lie on a page left open; this re-renders the elapsed
  // strings every minute and issues no queries. It is deliberately SEPARATE from
  // the FRONT58 poll — one moves numbers already on screen, the other fetches.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // FRONT58: the live board. Inert until the admin gate passes, so a signed-out
  // visitor issues no queries at all.
  const board = useRailBoard(isAdmin === true);

  // Same lookup HQ uses: useAuth's bee does not carry is_admin.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bee || !supabase) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error: e } = await supabase
        .from('bees')
        .select('is_admin')
        .eq('id', bee.id)
        .maybeSingle();
      if (cancelled) return;
      if (e) {
        setIsAdmin(false);
        setError(e.message);
        return;
      }
      setIsAdmin(!!data?.is_admin);
    })();
    return () => {
      cancelled = true;
    };
  }, [bee]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdmin || !supabase) return;
      const { data, error: e } = await supabase
        .from('ops_build_progress')
        .select(
          'astra, phase_no, phase, step_no, title, dispatch_pass, effort, derived_status, est_p25, est_median, est_p75, est_sample_n',
        )
        .order('astra')
        .order('phase_no')
        .order('step_no');
      if (cancelled) return;
      // OPS43's lesson: an empty panel looks like "nothing to build", which is a
      // lie. Distinguish "no rows" from "could not read" and say which.
      if (e) {
        setError(e.message);
        setSteps([]);
        return;
      }
      setSteps((data ?? []) as Step[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const byAstra = useMemo(() => {
    const m = new Map<string, Step[]>();
    for (const s of steps ?? []) {
      if (!m.has(s.astra)) m.set(s.astra, []);
      m.get(s.astra)?.push(s);
    }
    // OPS53: the astra under active build goes first. Alphabetical put oracle
    // last, behind 37 games+ops rows, which is why it read as "not rendered".
    return [...m.entries()].sort(([a], [b]) => astraRank(a) - astraRank(b) || a.localeCompare(b));
  }, [steps]);

  const totals = useMemo(() => {
    const all = steps ?? [];
    const done = all.filter((s) => s.derived_status === 'done').length;
    return {
      done,
      total: all.length,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
    };
  }, [steps]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!bee) {
    return (
      <Gate
        title="Mission Control needs a sign-in"
        body="This board reads the internal ops rail. Sign in with an admin username to view it."
      />
    );
  }
  if (!isAdmin) {
    return (
      <Gate
        title="Mission Control is admin-only"
        body="Access is restricted to bees.is_admin = true, enforced by database policy — not just by this screen. If you believe you should have it, ask Butch."
      />
    );
  }

  return (
    // FRONT58 widened this from max-w-4xl: the queue is a seven-column table now
    // and the folder column is the reason this pass exists — truncating it to fit
    // the old width would defeat the point.
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <h1 className="font-display text-xl font-semibold text-text-silver-bright">
          Mission Control — build progress
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-text-dim" style={{ fontSize: '12px' }}>
          <Lock size={12} aria-hidden />
          READ-ONLY. Spawning terminals stays in local mission control — a page on a public domain
          cannot open a window on your desk.
        </p>
      </header>

      {error && (
        <div
          className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200"
          style={{ fontSize: '12px' }}
        >
          Rail read failed: {error}
        </div>
      )}

      <DispatchQueue board={board} now={now} />

      {steps === null ? (
        <p className="text-text-dim" style={{ fontSize: '13px' }}>
          Reading the rail…
        </p>
      ) : steps.length === 0 && !error ? (
        <p className="text-text-dim" style={{ fontSize: '13px' }}>
          No build steps are seeded yet. That is a real empty board, not a failed read.
        </p>
      ) : (
        <>
          <ProgressBar done={totals.done} total={totals.total} pct={totals.pct} label="PLATFORM" />
          {byAstra.map(([astra, rows]) => {
            const d = rows.filter((r) => r.derived_status === 'done').length;
            return (
              <section key={astra} className="mt-6">
                <ProgressBar
                  done={d}
                  total={rows.length}
                  pct={rows.length ? Math.round((d / rows.length) * 100) : 0}
                  label={astraLabel(astra)}
                />
                <table className="mt-2 w-full border-collapse" style={{ fontSize: '12.5px' }}>
                  <tbody>
                    {rows.map((s, i) => {
                      const newPhase = i === 0 || rows[i - 1].phase_no !== s.phase_no;
                      return (
                        <tr
                          key={`${s.astra}-${s.phase_no}-${s.step_no}`}
                          className="border-t border-border/60"
                        >
                          <td className="w-8 py-1.5 text-center text-text-silver">
                            {MARK[s.derived_status] ?? '☐'}
                          </td>
                          <td className="py-1.5 text-text-silver-bright">
                            {newPhase && (
                              <div
                                className="pt-1 font-display text-text-dim"
                                style={{ fontSize: '11px' }}
                              >
                                PHASE {s.phase_no} · {s.phase}
                              </div>
                            )}
                            {s.title}
                            <div className="text-text-dim" style={{ fontSize: '11px' }}>
                              {s.dispatch_pass ?? '—'} · {estimate(s)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

// OPS51 — the panel Butch asked for twice. Read-only, admin-gated by the same
// database policy as the board. FRONT58 turned it into a real column board and
// put it on a poll.
function DispatchQueue({ board, now }: { board: RailBoard; now: number }) {
  const {
    queue,
    recentDone,
    locations,
    stale,
    thresholdMinutes,
    queueError,
    staleError,
    locationError,
    live,
    lastReadAt,
  } = board;

  const claimed = (queue ?? []).filter((d) => d.status === 'claimed').length;
  const queued = (queue ?? []).filter((d) => d.status === 'queued').length;

  // Only count stale rows that are actually ON this board. The view is scoped to
  // claimed rows already, but counting its size directly would let a row the
  // queue read missed inflate the parenthetical past the claimed count.
  const staleCount = (queue ?? []).filter(
    (d) => d.status === 'claimed' && stale.has(d.pass),
  ).length;

  return (
    <section className="mb-7">
      <div
        className="flex items-baseline justify-between text-text-dim"
        style={{ fontSize: '11.5px' }}
      >
        <span className="font-display uppercase tracking-wide">Dispatch queue</span>
        <span>
          {queue === null ? (
            'reading…'
          ) : (
            <>
              {claimed} claimed
              {staleCount > 0 && (
                <span className="font-semibold text-amber-300"> ({staleCount} suspect)</span>
              )}
              {` · ${queued} queued`}
            </>
          )}
        </span>
      </div>

      {/* The cadence, said out loud. A board that refreshes silently is
          indistinguishable from one that has frozen, and "why is this number
          not moving" is the question this line answers before it is asked. */}
      <div className="mt-0.5 text-text-dim" style={{ fontSize: '11px' }}>
        {live ? (
          <>
            <span className="inline-block animate-pulse-slow text-text-silver">●</span> live —
            refreshing every 8s while a pass is claimed
          </>
        ) : (
          <>○ idle — nothing is claimed, checking once a minute for a new claim</>
        )}
        {' · last read '}
        {clockTime(lastReadAt)}
        {' · paused while this tab is hidden'}
      </div>

      {queueError && (
        <div
          className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200"
          style={{ fontSize: '12px' }}
        >
          Queue read failed: {queueError}
        </div>
      )}

      {/* Say it out loud. An absent marker is indistinguishable from "nothing is
          stale", and this panel exists precisely because that false clear is
          expensive. */}
      {staleError && (
        <div
          className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200"
          style={{ fontSize: '12px' }}
        >
          Stale-claim check failed: {staleError} — claims below are UNCHECKED for staleness.
        </div>
      )}

      {/* The same rule for the folder. Every FOLDER cell reading "—" because the
          view could not be read looks exactly like every pass having no folder,
          and the folder is the point of this board. */}
      {locationError && (
        <div
          className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200"
          style={{ fontSize: '12px' }}
        >
          FOLDER unavailable — public.ops_dispatch_location returned nothing ({locationError}).
          Every folder cell below reads “—” for that reason, NOT because the pass has no folder.
        </div>
      )}

      {queue === null ? (
        <p className="mt-2 text-text-dim" style={{ fontSize: '13px' }}>
          Reading the queue…
        </p>
      ) : (
        <table className="mt-2 w-full border-collapse text-left" style={{ fontSize: '12.5px' }}>
          <thead>
            <tr className="font-display text-text-dim" style={{ fontSize: '10.5px' }}>
              <th className="w-8" aria-label="state" />
              <th className="py-1 font-normal uppercase tracking-wide">Pass</th>
              <th className="py-1 font-normal uppercase tracking-wide">Lane</th>
              <th className="py-1 font-normal uppercase tracking-wide">Status</th>
              <th className="py-1 font-normal uppercase tracking-wide">Folder</th>
              <th className="py-1 font-normal uppercase tracking-wide">Waits on</th>
              <th className="py-1 font-normal uppercase tracking-wide">Claimed by</th>
              <th className="py-1 font-normal uppercase tracking-wide">Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 && !queueError && (
              <tr className="border-t border-border/60">
                <td className="py-2 text-text-dim" colSpan={8} style={{ fontSize: '12px' }}>
                  Queue empty — nothing queued or claimed. That is a real empty queue, not a failed
                  read.
                </td>
              </tr>
            )}
            {queue.map((d) => (
              <DispatchRow
                key={d.id}
                d={d}
                now={now}
                location={locations.get(d.pass) ?? null}
                locationReadable={locationError === null}
                stale={stale.get(d.pass) ?? null}
                thresholdMinutes={thresholdMinutes}
              />
            ))}
            {(recentDone?.length ?? 0) > 0 && (
              <tr className="border-t border-border/60">
                <td />
                <td
                  className="pt-3 font-display text-text-dim"
                  colSpan={7}
                  style={{ fontSize: '11px' }}
                >
                  LAST {recentDone?.length} DONE
                </td>
              </tr>
            )}
            {(recentDone ?? []).map((d) => (
              <DispatchRow
                key={d.id}
                d={d}
                now={now}
                location={locations.get(d.pass) ?? null}
                locationReadable={locationError === null}
                thresholdMinutes={thresholdMinutes}
                dim
              />
            ))}
          </tbody>
        </table>
      )}

      {/* RAIL_BOOTSTRAP, stated on the surface that shows the marker: a silent
          claim is NOT a dead claim. Releasing a live claim puts two terminals on
          the same tree and the same database, which is strictly worse than a lock
          left sitting — which is why there is no release control on this page and
          will not be one. Release is admin-gated at the database and takes a
          mandatory reason. */}
      {thresholdMinutes !== null && (
        <p className="mt-2 text-text-dim" style={{ fontSize: '11px' }}>
          A claim silent past {thresholdMinutes}m raises a <em>suspicion</em>, not a verdict. This
          board never releases one — ask the window first.
        </p>
      )}
    </section>
  );
}

/**
 * The folder cell — the reason FRONT58 exists.
 *
 * Three different facts, three different renderings, because on a board they
 * would otherwise all be one dash:
 *   a path      the workdir this pass belongs to
 *   "—" + note  the view could not be read (banner above says so)
 *   "unregistered"  the view WAS read and holds no row for this pass, which
 *                   means its workdir is not in ops_workdirs — a real state
 *                   worth seeing, since the view's join drops such a row.
 */
function FolderCell({
  location,
  readable,
}: {
  location: RailLocation | null;
  readable: boolean;
}) {
  if (!readable) {
    return <span className="text-text-dim">—</span>;
  }
  if (!location) {
    return (
      <span className="text-amber-300/80" title="No matching row in ops_workdirs">
        unregistered
      </span>
    );
  }
  const path = location.rel_path === '.' ? 'workspace root' : (location.rel_path ?? '—');
  return (
    <span className="text-text-silver-bright">
      {path}
      {location.workdir_active === false && (
        <span className="text-amber-300/80" title="Workdir is marked inactive">
          {' '}
          (retired)
        </span>
      )}
    </span>
  );
}

function DispatchRow({
  d,
  now,
  location,
  locationReadable,
  stale = null,
  thresholdMinutes,
  dim = false,
}: {
  d: RailDispatch;
  now: number;
  location: RailLocation | null;
  locationReadable: boolean;
  stale?: StaleClaim | null;
  thresholdMinutes: number | null;
  dim?: boolean;
}) {
  const isClaimed = d.status === 'claimed';
  // Elapsed is shown ONLY while claimed — on a finished pass it would be the age
  // of a closed row, which means nothing.
  const elapsed = isClaimed ? elapsedSince(d.claimed_at, now) : null;
  // A row can only be a suspect while claimed. Guarding here as well as at the
  // call site means a future caller cannot accidentally flag a finished pass.
  const suspect = isClaimed && stale !== null;

  const silent = isClaimed ? silentMinutes(d, now) : null;
  const hbState = silent === null ? null : heartbeatState(silent, thresholdMinutes);
  const hbClass =
    hbState === 'past-threshold'
      ? 'text-amber-300'
      : hbState === 'quiet'
        ? 'text-amber-200/70'
        : 'text-text-silver';

  return (
    <>
      <tr className={`border-t border-border/60 align-top ${suspect ? 'bg-amber-500/[0.07]' : ''}`}>
        <td className={`w-8 py-1.5 text-center ${suspect ? 'text-amber-300' : 'text-text-silver'}`}>
          {/* The pulse says "alive". A claim past the threshold must not pulse —
              that animation is the strongest signal on the row and it would be
              lying. */}
          <span
            className={
              isClaimed && hbState === 'current' ? 'inline-block animate-pulse-slow' : undefined
            }
          >
            {suspect ? '⚠' : (DISPATCH_MARK[d.status] ?? '·')}
          </span>
        </td>
        <td className={`py-1.5 ${dim ? 'text-text-dim' : 'text-text-silver-bright'}`}>
          <span className="font-display">{d.pass}</span>
        </td>
        <td className="py-1.5 text-text-dim">{d.lane ?? '—'}</td>
        <td className="py-1.5 text-text-dim">
          {d.status}
          {d.priority != null && <span className="text-text-dim/70"> · p{d.priority}</span>}
        </td>
        <td className="py-1.5">
          <FolderCell location={location} readable={locationReadable} />
        </td>
        <td className="py-1.5 text-text-dim">{d.after_pass ?? '—'}</td>
        <td className="py-1.5 text-text-dim">{d.claimed_by ?? '—'}</td>
        <td className={`py-1.5 ${hbClass}`}>
          {silent === null ? (
            <span className="text-text-dim">—</span>
          ) : (
            <>
              {shortDuration(silent)}
              {d.heartbeat_at === null && (
                <span
                  className="text-amber-300/80"
                  title="No heartbeat has ever been sent; measured from the claim"
                >
                  {' '}
                  no ping
                </span>
              )}
            </>
          )}
        </td>
      </tr>
      {/* Title and timing on their own line rather than in a ninth column: at
          seventy characters it would squeeze every other column to nothing. It
          is the TITLE only — never a body. */}
      <tr className={suspect ? 'bg-amber-500/[0.07]' : ''}>
        <td />
        <td colSpan={7} className="pb-1.5 text-text-dim" style={{ fontSize: '11px' }}>
          {shortTitle(d.title)}
          {' · '}
          {shortWhen(d.created_at)}
          {elapsed && <span className="text-text-silver"> · {elapsed}</span>}
          {suspect && stale && (
            // The view's own triage sentence, verbatim. It already distinguishes
            // "a -Q is filed, answer it" from "R3 half-ran, just close it" from
            // "release candidate" — re-deriving any of that here would be a second
            // source of truth for the same judgement.
            <div className="mt-0.5 text-amber-300/90">
              silent past {stale.threshold_minutes}m · {stale.suggested_action}
            </div>
          )}
        </td>
      </tr>
    </>
  );
}

function ProgressBar({
  done,
  total,
  pct,
  label,
}: {
  done: number;
  total: number;
  pct: number;
  label: string;
}) {
  return (
    <div>
      <div
        className="flex items-baseline justify-between text-text-dim"
        style={{ fontSize: '11.5px' }}
      >
        <span className="font-display uppercase tracking-wide">{label}</span>
        <span>
          {done}/{total} steps · {pct}%
        </span>
      </div>
      {/* tabIndex so a keyboard/screen-reader user can actually land on the
          progressbar role — a role nobody can reach announces nothing. */}
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded bg-bg-elevated"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} build progress`}
      >
        <div className="h-full bg-text-silver/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg rounded-lg border border-border bg-bg-elevated p-8 text-center">
        <ShieldAlert size={28} className="mx-auto mb-4 text-text-silver/60" aria-hidden />
        <h1 className="font-display text-xl font-semibold text-text-silver-bright">{title}</h1>
        <p className="mt-3 text-text-dim" style={{ fontSize: '13px' }}>
          {body}
        </p>
      </div>
    </div>
  );
}
