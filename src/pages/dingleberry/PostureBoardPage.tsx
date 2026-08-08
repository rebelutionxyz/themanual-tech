/* DingleBERRY -- Database posture board (FRONT28).
   ---------------------------------------------------------------------------
   Surfaces DB32's platform posture scan, which until now nobody could see.

   SCOPE DISCIPLINE, the point of this screen: everything here describes
   POSTGRES OBJECTS -- tables, views, routines, RLS policies. It says NOTHING
   about a Bee's device, the security agent, or malware. The device half is the
   Bee-facing page at /security. A visitor must never read a quiet board here as
   "my laptop is clean", so the scope line is stated at the top and the word
   "device" appears nowhere as a subject.

   PALETTE: the DingleBERRY tone tokens, which ban honey/amber/gold outright
   (tone.ts). Severity therefore runs red -> lighter red -> blue -> grey rather
   than the usual red/amber/green ramp. `high` gets red-400 so it stays legible
   against `critical` red-600 without reaching for an amber the skin forbids. */

import { DbCard, Eyebrow, StatusPill } from '@/components/dingleberry/primitives';
import { TONE } from '@/components/dingleberry/tone';
import {
  type AstraPosture,
  type PostureFinding,
  SEVERITY_RANK,
  type Severity,
  isStale,
  usePostureBoard,
} from '@/lib/dingleberry/usePostureBoard';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

/* Severity colours. Red ramp + blues + grey; no amber, no gold (tone.ts). */
const SEV: Record<Severity, { c: string; tint: string; border: string }> = {
  critical: { c: '#DC2626', tint: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.45)' },
  high: { c: '#F87171', tint: 'rgba(248,113,113,0.13)', border: 'rgba(248,113,113,0.40)' },
  medium: { c: '#60A5FA', tint: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.42)' },
  low: { c: '#8A94A0', tint: 'rgba(138,148,160,0.10)', border: '#2A3138' },
  info: { c: '#6B7580', tint: 'rgba(107,117,128,0.10)', border: '#2A3138' },
};

const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function fmtWhen(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtAgo(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min ago`;
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export function PostureBoardPage() {
  const { board, loading, denied, error, reload } = usePostureBoard();
  const [openAstra, setOpenAstra] = useState<string | null>(null);

  const findingsByAstra = useMemo(() => {
    const m = new Map<string, PostureFinding[]>();
    for (const f of board?.findings ?? []) {
      const list = m.get(f.astra) ?? [];
      list.push(f);
      m.set(f.astra, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => {
        // Open before accepted, then worst severity, then check code.
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        return r !== 0 ? r : a.check_code.localeCompare(b.check_code);
      });
    }
    return m;
  }, [board]);

  if (loading) {
    return (
      <Shell>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Reading platform posture...
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <DbCard className="p-5">
          <Eyebrow>Posture unavailable</Eyebrow>
          <p className="mt-2 text-text-silver" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            The posture scan could not be read. This is a read failure, not a clean result -- it
            says nothing about the platform's actual posture.
          </p>
          <p className="mt-2 font-mono text-text-muted" style={{ fontSize: 11 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 rounded-md border border-border-bright px-3 py-1.5 font-sans font-semibold text-text-silver"
            style={{ fontSize: 12.5 }}
          >
            Try again
          </button>
        </DbCard>
      </Shell>
    );
  }

  if (denied || !board) {
    return (
      <Shell>
        <DbCard className="p-5">
          <Eyebrow>Not authorised</Eyebrow>
          <p className="mt-2 text-text-silver" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            Platform posture is readable by operator (admin) Bees only. Nothing here is hidden
            because of a problem -- your account simply does not carry operator rights.
          </p>
        </DbCard>
      </Shell>
    );
  }

  const { totals, rows, lastRun, lastScanned } = board;
  const stale = isStale(lastScanned);

  return (
    <Shell>
      {/* ---- scope line: the anti-conflation guard ------------------------- */}
      <Eyebrow>Database posture</Eyebrow>
      <h1 className="mt-1 font-serif font-bold text-text" style={{ fontSize: 24, lineHeight: 1.1 }}>
        Platform posture
      </h1>
      <p className="mt-1.5 max-w-2xl text-text-silver" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
        Every finding below is about a <b className="text-text">database object</b> -- a table,
        view, routine, or access policy on this platform's own Postgres. This board says nothing
        about any Bee's device, and nothing about malware. Device security is a separate surface.
      </p>

      {/* ---- stale banner: a stale scan is itself a finding ---------------- */}
      {stale && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3"
          style={{ background: SEV.high.tint, borderColor: SEV.high.border }}
        >
          <span
            className="mt-px flex-none rounded-full px-2 py-0.5 font-mono font-semibold uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.08em',
              background: SEV.high.c,
              color: '#07080a',
            }}
          >
            stale
          </span>
          <span className="text-text-silver" style={{ fontSize: 13, lineHeight: 1.5 }}>
            <b className="text-text">
              {lastScanned
                ? `The last scan ran ${fmtAgo(lastScanned)}.`
                : 'This platform has never been scanned.'}
            </b>{' '}
            Posture older than 48 hours is not a current answer. The counts below describe the
            platform as it was at that moment, not as it is now.
          </span>
        </div>
      )}

      {/* ---- headline ------------------------------------------------------ */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DbCard className="p-4">
          <Eyebrow>Open findings</Eyebrow>
          <div
            className="mt-1.5 font-serif font-bold text-text"
            style={{ fontSize: 30, lineHeight: 1 }}
          >
            {totals.open}
          </div>
          <div className="mt-1 text-text-muted" style={{ fontSize: 11.5 }}>
            across {rows.length} astra{rows.length === 1 ? '' : 's'}
          </div>
        </DbCard>

        {/* 0 critical must READ as reassuring, not as a broken empty state. */}
        <DbCard className="p-4">
          <Eyebrow>Critical</Eyebrow>
          <div
            className="mt-1.5 font-serif font-bold"
            style={{
              fontSize: 30,
              lineHeight: 1,
              color: totals.critical > 0 ? SEV.critical.c : TONE.secure.c,
            }}
          >
            {totals.critical}
          </div>
          <div
            className="mt-1"
            style={{ fontSize: 11.5, color: totals.critical > 0 ? SEV.critical.c : TONE.secure.c }}
          >
            {totals.critical > 0 ? 'needs a human now' : 'none open - holding'}
          </div>
        </DbCard>

        <DbCard className="p-4">
          <Eyebrow>Worst open severity</Eyebrow>
          <div className="mt-2">
            {totals.worst ? (
              <SevPill sev={totals.worst} />
            ) : (
              <StatusPill tone="secure">all clear</StatusPill>
            )}
          </div>
          <div className="mt-2 text-text-muted" style={{ fontSize: 11.5 }}>
            {totals.accepted} accepted {totals.accepted === 1 ? 'finding' : 'findings'}
          </div>
        </DbCard>

        <DbCard className="p-4">
          <Eyebrow>Last scan</Eyebrow>
          <div
            className="mt-1.5 font-serif font-bold"
            style={{ fontSize: 17, lineHeight: 1.15, color: stale ? SEV.high.c : 'var(--text)' }}
          >
            {fmtWhen(lastScanned)}
          </div>
          <div className="mt-1 text-text-muted" style={{ fontSize: 11.5 }}>
            {lastScanned ? fmtAgo(lastScanned) : 'no scan on record'}
            {lastRun ? ` · ${lastRun.checks_run} checks` : ''}
          </div>
        </DbCard>
      </div>

      {/* ---- severity spread ---------------------------------------------- */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SEV_ORDER.map((s) => {
          const n = totals[s];
          if (!n) return null;
          return <SevPill key={s} sev={s} count={n} />;
        })}
        {totals.open === 0 && (
          <span className="text-text-muted" style={{ fontSize: 12.5 }}>
            No open findings on any astra.
          </span>
        )}
      </div>

      {/* ---- per-astra rows, worst first ----------------------------------- */}
      <div className="mt-6">
        <Eyebrow>By astra · worst first</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <AstraRow
              key={r.astra}
              row={r}
              expanded={openAstra === r.astra}
              findings={findingsByAstra.get(r.astra) ?? []}
              onToggle={() => setOpenAstra((cur) => (cur === r.astra ? null : r.astra))}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-text-muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
        Findings are written by the posture scan and are read-only here. Resolving one means
        changing the database object it names; accepting one means recording a reason against it.
        Neither is done from this screen.
      </p>
    </Shell>
  );
}

/* ---- per-astra row + drill-in ---------------------------------------- */

function AstraRow({
  row,
  findings,
  expanded,
  onToggle,
}: {
  row: AstraPosture;
  findings: PostureFinding[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const accepted = findings.filter((f) => f.status === 'accepted');
  const open = findings.filter((f) => f.status === 'open');

  return (
    <DbCard>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-bg"
      >
        <ChevronRight
          size={15}
          className="flex-none text-text-muted transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
        />
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-sans font-semibold text-text"
            style={{ fontSize: 14 }}
          >
            {row.astra}
          </span>
          <span className="mt-0.5 block font-mono text-text-muted" style={{ fontSize: 10.5 }}>
            {row.open_total} open
            {row.accepted_total > 0 ? ` · ${row.accepted_total} accepted` : ''}
          </span>
        </span>

        <span className="hidden flex-none items-center gap-1.5 sm:flex">
          {SEV_ORDER.map((s) => {
            const n = row[`open_${s}` as keyof AstraPosture] as number;
            if (!n) return null;
            return <CountChip key={s} sev={s} n={n} />;
          })}
        </span>

        <span className="flex-none">
          {row.worst_severity ? (
            <SevPill sev={row.worst_severity} />
          ) : (
            <StatusPill tone="secure">clear</StatusPill>
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 py-3">
          {open.length === 0 && accepted.length === 0 && (
            <div className="text-text-muted" style={{ fontSize: 12.5 }}>
              No open or accepted findings recorded for this astra.
            </div>
          )}

          {open.map((f) => (
            <FindingCard key={f.id} f={f} />
          ))}

          {accepted.length > 0 && (
            <>
              {/* Accepted findings stay VISIBLE with their reason. That is the
                  entire point of accepting one rather than deleting it. */}
              <div className="mb-2 mt-3 border-t border-border pt-3">
                <Eyebrow>Accepted · not open, still on the record</Eyebrow>
              </div>
              {accepted.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </>
          )}
        </div>
      )}
    </DbCard>
  );
}

function FindingCard({ f }: { f: PostureFinding }) {
  const k = SEV[f.severity];
  const isAccepted = f.status === 'accepted';
  return (
    <div
      className="mb-1.5 rounded-md border px-3 py-2.5"
      style={{
        background: 'var(--bg-elevated, #0F1216)',
        borderColor: isAccepted ? 'var(--border)' : k.border,
        opacity: isAccepted ? 0.85 : 1,
      }}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <SevPill sev={f.severity} />
        <span className="font-mono font-semibold text-text-silver-bright" style={{ fontSize: 12 }}>
          {f.check_code}
        </span>
        {isAccepted && (
          <span
            className="rounded-md border px-1.5 py-0.5 font-mono font-semibold uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              color: TONE.secure.c,
              borderColor: TONE.secure.border,
            }}
          >
            accepted
          </span>
        )}
      </div>

      <div
        className="mt-1.5 inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-text-silver"
        style={{
          fontSize: 10.5,
          background: 'var(--bg-panel2, #14171C)',
          borderColor: 'var(--border)',
        }}
      >
        {f.object_schema}.{f.object_name}
        {f.object_type ? ` · ${f.object_type}` : ''}
      </div>

      <p className="mb-0 mt-1.5 text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
        {f.detail}
      </p>

      {isAccepted && f.accepted_reason && (
        <p className="mb-0 mt-1.5" style={{ fontSize: 12, lineHeight: 1.5, color: TONE.secure.c }}>
          <b>Accepted because:</b> {f.accepted_reason}
        </p>
      )}
    </div>
  );
}

function SevPill({ sev, count }: { sev: Severity; count?: number }) {
  const k = SEV[sev];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-semibold uppercase"
      style={{
        height: 20,
        padding: '0 8px',
        fontSize: 10,
        letterSpacing: '0.08em',
        borderRadius: 999,
        lineHeight: 1,
        color: k.c,
        background: k.tint,
        border: `1px solid ${k.border}`,
      }}
    >
      <span
        className="block flex-none rounded-full"
        style={{ width: 5, height: 5, background: k.c }}
      />
      {count !== undefined ? `${count} ${sev}` : sev}
    </span>
  );
}

function CountChip({ sev, n }: { sev: Severity; n: number }) {
  const k = SEV[sev];
  return (
    <span
      className="font-mono tabular-nums"
      style={{ fontSize: 10.5, color: k.c }}
      title={`${n} ${sev}`}
    >
      {n}
      <span style={{ opacity: 0.6 }}>{sev[0].toUpperCase()}</span>
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-5 py-5">{children}</div>;
}

export default PostureBoardPage;
