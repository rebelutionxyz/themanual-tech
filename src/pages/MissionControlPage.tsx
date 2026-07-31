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

const MARK: Record<string, string> = {
  done: '✓', in_progress: '▶', blocked: '⏸', parked: '·', not_started: '☐',
};

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

  const byAstra = useMemo(() => {
    const m = new Map<string, Step[]>();
    for (const s of steps ?? []) {
      if (!m.has(s.astra)) m.set(s.astra, []);
      m.get(s.astra)?.push(s);
    }
    return [...m.entries()];
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
    return <Gate title="Mission Control needs a Bee sign-in"
                 body="This board reads the internal ops rail. Sign in with an admin Bee to view it." />;
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

      {steps === null ? (
        <p className="text-text-dim" style={{ fontSize: '13px' }}>Reading the rail…</p>
      ) : steps.length === 0 && !error ? (
        <p className="text-text-dim" style={{ fontSize: '13px' }}>
          No build steps are seeded yet. That is a real empty board, not a failed read.
        </p>
      ) : (
        <>
          <ProgressBar done={totals.done} total={totals.total} pct={totals.pct} label="HONEYCOMB" />
          {byAstra.map(([astra, rows]) => {
            const d = rows.filter((r) => r.derived_status === 'done').length;
            return (
              <section key={astra} className="mt-6">
                <ProgressBar done={d} total={rows.length}
                             pct={rows.length ? Math.round((d / rows.length) * 100) : 0} label={astra} />
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
