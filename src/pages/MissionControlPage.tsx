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

import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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

// OPS51: the queue itself. ops_build_steps is the PLAN; ops_dispatches is what is
// actually moving right now, and until this panel existed /mc showed only the
// former — so a claimed pass was invisible on the web.
//
// ACCESS: ops_dispatches RLS is `authenticated` + is_platform_admin() (migration
// 20260731040000). anon holds NO grant at all — a live anon SELECT returns
// "permission denied for table ops_dispatches", verified 2026-08-01. So this panel
// lives inside the same admin gate as the board below it and NOTHING was loosened
// to render it.
interface Dispatch {
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
}

// FRONT34: stale-claim detection, built by DB41. A claimed row and a dead lock
// look identical on this board -- both render as "claimed Nh ago" -- and that is
// exactly what cost a session on 2026-08-08, when DB39 sat claimed by an ended
// window and blocked SWEEP1's board-quiet gate.
//
// public.ops_stale_claims returns ONLY rows already past the threshold (120 min,
// p99 of 168 clean passes), so presence in this set IS the verdict -- there is no
// client-side threshold logic here, deliberately. `suggested_action` is the
// view's own triage sentence and is rendered verbatim rather than re-derived.
//
// ACCESS: the view is `security_invoker=true` (verified in pg_class.reloptions),
// so it evaluates the underlying ops_dispatches RLS as the CALLER. A non-admin
// reads zero rows through it -- it does not widen what the admin gate already
// allows. Nothing was loosened to render this.
interface StaleClaim {
  pass: string;
  claimed_at: string | null;
  heartbeat_at: string | null;
  minutes_silent: number;
  threshold_minutes: number;
  report_exists: boolean;
  question_filed: boolean;
  suggested_action: string;
}

const DISPATCH_MARK: Record<string, string> = {
  claimed: '▶', queued: '☐', done: '✓',
};

// Minutes since the last sign of life, recomputed from the `now` clock rather
// than read off the view. `minutes_silent` is a server snapshot taken at fetch
// time; printing it raw would freeze on a board left open, which is the same rot
// the elapsedSince clock exists to prevent. The view still decides WHETHER a row
// is stale -- this only keeps the number honest between reads.
function minutesSilent(s: StaleClaim, now: number): number {
  const iso = s.heartbeat_at ?? s.claimed_at;
  if (!iso) return Math.round(s.minutes_silent);
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Math.round(s.minutes_silent);
  return Math.max(0, Math.floor((now - t) / 60000));
}

function silentLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

// How many finished passes to show under the live queue. The queue is often
// empty (everything done) and a panel that renders nothing at all reads as
// broken, so the recent tail is what proves the read worked.
const RECENT_DONE = 5;

const TITLE_MAX = 70;

function shortTitle(t: string): string {
  return t.length <= TITLE_MAX ? t : `${t.slice(0, TITLE_MAX - 1)}…`;
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const MARK: Record<string, string> = {
  done: '✓', in_progress: '▶', blocked: '⏸', parked: '·', not_started: '☐',
};

// OPS53. `astra` is a lowercase key ('oracle'); the board printed it raw and the
// ProgressBar's `uppercase` class turned it into "ORACLE" — correct-ish, but not
// the brand, and alphabetical order buried it under 37 games+ops rows. Both are
// fixed here: real display names, and the astra under active build sorts first.
const ASTRA_LABEL: Record<string, string> = {
  oracle: 'here24', games: 'Games', ops: 'Ops',
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
  if (mins < 60) return `claimed ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `claimed ${hrs}h ${mins % 60}m ago`;
  return `claimed ${Math.floor(hrs / 24)}d ${hrs % 24}h ago`;
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
  const [queue, setQueue] = useState<Dispatch[] | null>(null);
  const [recentDone, setRecentDone] = useState<Dispatch[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  // FRONT34: kept in its own state with its own error, so a failed stale read
  // degrades to "the queue without stale markers" rather than blanking the queue.
  // Silently showing no markers would be the worst outcome -- it reads as "no
  // stale claims", which is the exact false-clear this pass exists to prevent.
  const [stale, setStale] = useState<StaleClaim[] | null>(null);
  const [staleError, setStaleError] = useState<string | null>(null);
  // OPS53: a clock, not a data refresh. "claimed 12m ago" rendered once at mount
  // would quietly rot into a lie on a page left open; this re-renders the elapsed
  // strings every minute and issues no queries.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Same lookup HQ uses: useAuth's bee does not carry is_admin.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bee || !supabase) { if (!cancelled) setIsAdmin(false); return; }
      const { data, error: e } = await supabase
        .from('bees').select('is_admin').eq('id', bee.id).maybeSingle();
      if (cancelled) return;
      if (e) { setIsAdmin(false); setError(e.message); return; }
      setIsAdmin(!!data?.is_admin);
    })();
    return () => { cancelled = true; };
  }, [bee]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdmin || !supabase) return;
      const { data, error: e } = await supabase
        .from('ops_build_progress')
        .select('astra, phase_no, phase, step_no, title, dispatch_pass, effort, derived_status, est_p25, est_median, est_p75, est_sample_n')
        .order('astra').order('phase_no').order('step_no');
      if (cancelled) return;
      // OPS43's lesson: an empty panel looks like "nothing to build", which is a
      // lie. Distinguish "no rows" from "could not read" and say which.
      if (e) { setError(e.message); setSteps([]); return; }
      setSteps((data ?? []) as Step[]);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // The queue. Two reads rather than one: the live queue is ordered by urgency
  // (claimed first, then priority), the finished tail by recency — different
  // sorts, and combining them in one query would mean sorting the whole 130-row
  // history client-side to show five.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdmin || !supabase) return;
      const COLS = 'id, pass, title, status, lane, priority, after_pass, claimed_by, created_at, claimed_at';

      const live = await supabase
        .from('ops_dispatches')
        .select(COLS)
        .in('status', ['queued', 'claimed'])
        .order('priority', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (live.error) {
        // Same rule as the board: a failed read must never render as an empty queue.
        setQueueError(live.error.message);
        setQueue([]);
      } else {
        // claimed above queued — PostgREST cannot order on an expression, so the
        // one derived key is applied here rather than faked in the query.
        const rows = ((live.data ?? []) as Dispatch[]).slice().sort((a, b) => {
          const ac = a.status === 'claimed' ? 0 : 1;
          const bc = b.status === 'claimed' ? 0 : 1;
          if (ac !== bc) return ac - bc;
          return (a.priority ?? 100) - (b.priority ?? 100);
        });
        setQueue(rows);
      }

      const done = await supabase
        .from('ops_dispatches')
        .select(COLS)
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(RECENT_DONE);
      if (cancelled) return;
      setRecentDone(done.error ? [] : ((done.data ?? []) as Dispatch[]));

      // FRONT34. A third read rather than a join: the view already does the
      // threshold arithmetic and the triage, and PostgREST cannot join a view to
      // a table anyway. Rows are matched to the queue by `pass`, which is UNIQUE
      // (ops_dispatches_pass_uidx) -- the same guarantee after_pass relies on.
      const staleRows = await supabase
        .from('ops_stale_claims')
        .select('pass, claimed_at, heartbeat_at, minutes_silent, threshold_minutes, report_exists, question_filed, suggested_action')
        .order('minutes_silent', { ascending: false });
      if (cancelled) return;
      if (staleRows.error) {
        setStaleError(staleRows.error.message);
        setStale([]);
      } else {
        setStale((staleRows.data ?? []) as StaleClaim[]);
      }
    })();
    return () => { cancelled = true; };
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
    return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }, [steps]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse-slow rounded-full border-2 border-text-silver/30 border-t-text-silver" />
      </div>
    );
  }

  if (!bee) {
    return <Gate title="Mission Control needs a sign-in"
                 body="This board reads the internal ops rail. Sign in with an admin username to view it." />;
  }
  if (!isAdmin) {
    return <Gate title="Mission Control is admin-only"
                 body="Access is restricted to bees.is_admin = true, enforced by database policy — not just by this screen. If you believe you should have it, ask Butch." />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-5">
        <h1 className="font-display text-xl font-semibold text-text-silver-bright">Mission Control — build progress</h1>
        <p className="mt-1 flex items-center gap-1.5 text-text-dim" style={{ fontSize: '12px' }}>
          <Lock size={12} aria-hidden />
          READ-ONLY. Spawning terminals stays in local mission control — a page on a public
          domain cannot open a window on your desk.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200" style={{ fontSize: '12px' }}>
          Rail read failed: {error}
        </div>
      )}

      <DispatchQueue queue={queue} recentDone={recentDone} error={queueError}
                     stale={stale} staleError={staleError} now={now} />


      {steps === null ? (
        <p className="text-text-dim" style={{ fontSize: '13px' }}>Reading the rail…</p>
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
                <ProgressBar done={d} total={rows.length}
                             pct={rows.length ? Math.round((d / rows.length) * 100) : 0}
                             label={astraLabel(astra)} />
                <table className="mt-2 w-full border-collapse" style={{ fontSize: '12.5px' }}>
                  <tbody>
                    {rows.map((s, i) => {
                      const newPhase = i === 0 || rows[i - 1].phase_no !== s.phase_no;
                      return (
                        <tr key={`${s.astra}-${s.phase_no}-${s.step_no}`} className="border-t border-border/60">
                          <td className="w-8 py-1.5 text-center text-text-silver">{MARK[s.derived_status] ?? '☐'}</td>
                          <td className="py-1.5 text-text-silver-bright">
                            {newPhase && (
                              <div className="pt-1 font-display text-text-dim" style={{ fontSize: '11px' }}>
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
// database policy as the board.
function DispatchQueue({ queue, recentDone, error, stale, staleError, now }: {
  queue: Dispatch[] | null;
  recentDone: Dispatch[] | null;
  error: string | null;
  stale: StaleClaim[] | null;
  staleError: string | null;
  now: number;
}) {
  const claimed = (queue ?? []).filter((d) => d.status === 'claimed').length;
  const queued = (queue ?? []).filter((d) => d.status === 'queued').length;

  // Keyed by pass, which is UNIQUE on ops_dispatches.
  const staleByPass = useMemo(() => {
    const m = new Map<string, StaleClaim>();
    for (const s of stale ?? []) m.set(s.pass, s);
    return m;
  }, [stale]);

  // Only count stale rows that are actually ON this board. The view is scoped to
  // claimed rows already, but counting its length directly would let a row the
  // queue read missed inflate the parenthetical past the claimed count.
  const staleCount = (queue ?? []).filter(
    (d) => d.status === 'claimed' && staleByPass.has(d.pass),
  ).length;

  return (
    <section className="mb-7">
      <div className="flex items-baseline justify-between text-text-dim" style={{ fontSize: '11.5px' }}>
        <span className="font-display uppercase tracking-wide">Dispatch queue</span>
        <span>
          {queue === null ? 'reading…' : (
            <>
              {claimed} claimed
              {staleCount > 0 && (
                <span className="font-semibold text-amber-300"> ({staleCount} stale)</span>
              )}
              {` · ${queued} queued`}
            </>
          )}
        </span>
      </div>

      {error && (
        <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200" style={{ fontSize: '12px' }}>
          Queue read failed: {error}
        </div>
      )}

      {/* Say it out loud. An absent marker is indistinguishable from "nothing is
          stale", and this panel exists precisely because that false clear is
          expensive. */}
      {staleError && (
        <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200" style={{ fontSize: '12px' }}>
          Stale-claim check failed: {staleError} — claims below are UNCHECKED for staleness.
        </div>
      )}

      {queue === null ? (
        <p className="mt-2 text-text-dim" style={{ fontSize: '13px' }}>Reading the queue…</p>
      ) : (
        <table className="mt-2 w-full border-collapse" style={{ fontSize: '12.5px' }}>
          <tbody>
            {queue.length === 0 && !error && (
              <tr className="border-t border-border/60">
                <td className="py-2 text-text-dim" colSpan={2} style={{ fontSize: '12px' }}>
                  Queue empty — nothing queued or claimed. That is a real empty queue, not a failed read.
                </td>
              </tr>
            )}
            {queue.map((d) => (
              <DispatchRow key={d.id} d={d} now={now} stale={staleByPass.get(d.pass) ?? null} />
            ))}
            {(recentDone?.length ?? 0) > 0 && (
              <tr className="border-t border-border/60">
                <td />
                <td className="pt-3 font-display text-text-dim" style={{ fontSize: '11px' }}>
                  LAST {recentDone?.length} DONE
                </td>
              </tr>
            )}
            {(recentDone ?? []).map((d) => <DispatchRow key={d.id} d={d} now={now} dim />)}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DispatchRow({ d, now, stale = null, dim = false }: {
  d: Dispatch;
  now: number;
  stale?: StaleClaim | null;
  dim?: boolean;
}) {
  const live = d.status === 'claimed';
  // Elapsed is shown ONLY while claimed — on a finished pass it would be the age
  // of a closed row, which means nothing.
  const elapsed = live ? elapsedSince(d.claimed_at, now) : null;
  // A row can only be stale while claimed. Guarding here as well as at the call
  // site means a future caller cannot accidentally flag a finished pass.
  const isStale = live && stale !== null;
  const silent = isStale ? minutesSilent(stale, now) : 0;

  return (
    <tr className={`border-t border-border/60 ${isStale ? 'bg-amber-500/[0.07]' : ''}`}>
      <td className={`w-8 py-1.5 align-top text-center ${isStale ? 'text-amber-300' : 'text-text-silver'}`}>
        {/* The pulse says "alive". A dead lock must not pulse — that animation is
            the single strongest signal on the row and it would be lying. */}
        <span className={live && !isStale ? 'inline-block animate-pulse-slow' : undefined}>
          {isStale ? '⚠' : DISPATCH_MARK[d.status] ?? '·'}
        </span>
      </td>
      <td className={`py-1.5 ${dim ? 'text-text-dim' : 'text-text-silver-bright'}`}>
        <span className="font-display">{d.pass}</span>
        {d.lane && <span className="text-text-dim"> · {d.lane}</span>}
        {' '}{shortTitle(d.title)}
        {isStale && (
          <span className="ml-1.5 inline-block whitespace-nowrap rounded border border-amber-400/60 bg-amber-500/15 px-1.5 align-[1px] font-display font-semibold uppercase tracking-wide text-amber-300"
                style={{ fontSize: '10px' }}>
            Stale · silent {silentLabel(silent)}
          </span>
        )}
        <div className="text-text-dim" style={{ fontSize: '11px' }}>
          {d.status}
          {d.priority != null && ` · p${d.priority}`}
          {d.after_pass && ` · waits on ${d.after_pass}`}
          {d.claimed_by && ` · ${d.claimed_by}`}
          {' · '}{shortWhen(d.created_at)}
          {elapsed && <span className="text-text-silver"> · {elapsed}</span>}
        </div>
        {isStale && (
          // The view's own triage sentence, verbatim. It already distinguishes
          // "a -Q is filed, answer it" from "R3 half-ran, just close it" from
          // "release candidate" — re-deriving any of that here would be a second
          // source of truth for the same judgement.
          <div className="mt-0.5 text-amber-300/90" style={{ fontSize: '11px' }}>
            past {stale.threshold_minutes}m threshold · {stale.suggested_action}
          </div>
        )}
      </td>
    </tr>
  );
}

function ProgressBar({ done, total, pct, label }: { done: number; total: number; pct: number; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-text-dim" style={{ fontSize: '11.5px' }}>
        <span className="font-display uppercase tracking-wide">{label}</span>
        <span>{done}/{total} steps · {pct}%</span>
      </div>
      {/* tabIndex so a keyboard/screen-reader user can actually land on the
          progressbar role — a role nobody can reach announces nothing. */}
      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-bg-elevated" role="progressbar"
           tabIndex={0}
           aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} build progress`}>
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
        <p className="mt-3 text-text-dim" style={{ fontSize: '13px' }}>{body}</p>
      </div>
    </div>
  );
}
