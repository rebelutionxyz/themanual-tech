/**
 * FRONT28 -- platform posture board data.
 *
 * Reads DB32's posture scan: the per-astra rollup view, the individual
 * findings behind it, and the run record that says WHEN the scan last ran.
 *
 * THIS IS DATABASE POSTURE ONLY. Every row here describes a Postgres object --
 * a table, a view, a routine, an RLS policy. None of it says anything about a
 * Bee's device, the security agent, or malware. The device half lives at
 * /security and the two must never be conflated in copy.
 *
 * ACCESS: all three sources are admin-read (RLS `is_platform_admin()`). A
 * non-admin gets ZERO ROWS, not an error, so `denied` is inferred from "no
 * findings AND no runs" rather than from an error code. The surrounding
 * DingleberryLayout already gates on bees.is_admin; this is defence in depth so
 * the hook cannot explode if it is ever mounted somewhere ungated.
 */

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingStatus = 'open' | 'resolved' | 'accepted';

/** Worst-first ordering. Lower sorts earlier. */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  info: 5,
};

export interface AstraPosture {
  astra: string;
  open_total: number;
  open_critical: number;
  open_high: number;
  open_medium: number;
  open_low: number;
  open_info: number;
  accepted_total: number;
  resolved_total: number;
  worst_severity: Severity | null;
  last_scanned: string | null;
}

export interface PostureFinding {
  id: string;
  astra: string;
  check_code: string;
  severity: Severity;
  object_schema: string;
  object_name: string;
  object_type: string | null;
  detail: string;
  status: FindingStatus;
  accepted_reason: string | null;
  first_seen: string;
  last_seen: string;
}

export interface PostureRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  checks_run: number;
  findings_open: number;
}

export interface PostureBoard {
  rows: AstraPosture[];
  findings: PostureFinding[];
  lastRun: PostureRun | null;
  /** Newest `last_seen` across findings -- the fallback when no run row exists. */
  lastScanned: string | null;
  totals: {
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    accepted: number;
    worst: Severity | null;
  };
}

interface State {
  board: PostureBoard | null;
  loading: boolean;
  /** True when the reader is not a platform admin (or signed out): no rows at all. */
  denied: boolean;
  /** A real failure -- network, client missing. Distinct from "no access". */
  error: string | null;
}

const EMPTY_TOTALS: PostureBoard['totals'] = {
  open: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
  accepted: 0,
  worst: null,
};

/** Milliseconds after which a scan counts as stale. A stale scan is a finding. */
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export function isStale(lastScanned: string | null, now: number = Date.now()): boolean {
  if (!lastScanned) return true;
  const t = new Date(lastScanned).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > STALE_AFTER_MS;
}

export function usePostureBoard(): State & { reload: () => void } {
  const [state, setState] = useState<State>({
    board: null,
    loading: true,
    denied: false,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `nonce` IS the dependency - bumping it is what `reload()` does, and it is read nowhere inside the effect by design
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!supabase) {
        if (alive)
          setState({
            board: null,
            loading: false,
            denied: false,
            error: 'Supabase not configured',
          });
        return;
      }

      const [rowsRes, findingsRes, runRes] = await Promise.all([
        supabase.from('dingleberry_posture_by_astra').select('*'),
        supabase
          .from('dingleberry_posture_findings')
          .select(
            'id, astra, check_code, severity, object_schema, object_name, object_type, detail, status, accepted_reason, first_seen, last_seen',
          )
          .in('status', ['open', 'accepted']),
        supabase
          .from('dingleberry_posture_runs')
          .select('id, started_at, finished_at, checks_run, findings_open')
          .order('started_at', { ascending: false })
          .limit(1),
      ]);

      if (!alive) return;

      const firstError = rowsRes.error || findingsRes.error || runRes.error;
      if (firstError) {
        setState({ board: null, loading: false, denied: false, error: firstError.message });
        return;
      }

      const rows = (rowsRes.data ?? []) as AstraPosture[];
      const findings = (findingsRes.data ?? []) as PostureFinding[];
      const lastRun = ((runRes.data ?? [])[0] ?? null) as PostureRun | null;

      // RLS hides everything from a non-admin, so "nothing anywhere" means no
      // access rather than a clean platform. A genuinely clean platform still
      // has a run row, and an unscanned one is reported as "never scanned".
      if (rows.length === 0 && findings.length === 0 && !lastRun) {
        setState({ board: null, loading: false, denied: true, error: null });
        return;
      }

      rows.sort((a, b) => {
        const ra = a.worst_severity ? SEVERITY_RANK[a.worst_severity] : 99;
        const rb = b.worst_severity ? SEVERITY_RANK[b.worst_severity] : 99;
        if (ra !== rb) return ra - rb;
        if (b.open_total !== a.open_total) return b.open_total - a.open_total;
        return a.astra.localeCompare(b.astra);
      });

      const totals = rows.reduce<PostureBoard['totals']>(
        (acc, r) => ({
          open: acc.open + r.open_total,
          critical: acc.critical + r.open_critical,
          high: acc.high + r.open_high,
          medium: acc.medium + r.open_medium,
          low: acc.low + r.open_low,
          info: acc.info + r.open_info,
          accepted: acc.accepted + r.accepted_total,
          worst: acc.worst,
        }),
        { ...EMPTY_TOTALS },
      );
      totals.worst =
        totals.critical > 0
          ? 'critical'
          : totals.high > 0
            ? 'high'
            : totals.medium > 0
              ? 'medium'
              : totals.low > 0
                ? 'low'
                : totals.info > 0
                  ? 'info'
                  : null;

      // Prefer the run record; fall back to the newest finding timestamp.
      const fromRows =
        rows
          .map((r) => r.last_scanned)
          .filter((s): s is string => Boolean(s))
          .sort()
          .pop() ?? null;
      const lastScanned = lastRun?.finished_at ?? lastRun?.started_at ?? fromRows;

      setState({
        board: { rows, findings, lastRun, lastScanned, totals },
        loading: false,
        denied: false,
        error: null,
      });
    }

    setState((s) => ({ ...s, loading: true }));
    void load();
    return () => {
      alive = false;
    };
  }, [nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
