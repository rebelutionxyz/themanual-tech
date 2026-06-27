import { useAuth } from '@/lib/auth';
import { type ReportRow, forumReportsByMe, forumReportsOnMine } from '@/lib/forumMod';
import { relativeTime } from '@/lib/intel';
import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const INTEL_COLOR = '#1D9BF0';

type Tab = 'byme' | 'onmine';

/**
 * Personal moderation surface (pass 13). Two directions:
 *   • By me   — flags this Bee filed (outgoing).
 *   • On mine — flags on content this Bee authored (reporter anonymized).
 * Both auth-scoped server-side. Rows deep-link to the (parent) thread.
 */
export function ReportedPage() {
  const { bee } = useAuth();
  const [tab, setTab] = useState<Tab>('byme');
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bee?.id) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setRows(null);
    setError(null);
    const load = tab === 'byme' ? forumReportsByMe : forumReportsOnMine;
    load()
      .then((r) => !cancelled && setRows(r))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load reports');
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, bee?.id]);

  return (
    <div className="safe-pad-x mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <h1
        className="mb-1 flex items-center gap-2 font-display tracking-wide text-zinc-900"
        style={{ fontSize: '24px' }}
      >
        <Flag size={22} style={{ color: INTEL_COLOR }} />
        Reported
      </h1>
      <p className="mb-5 text-[13px] text-zinc-500">
        Flags you filed, and flags raised on what you posted.
      </p>

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
        <TabButton active={tab === 'byme'} onClick={() => setTab('byme')}>
          By me
        </TabButton>
        <TabButton active={tab === 'onmine'} onClick={() => setTab('onmine')}>
          On mine
        </TabButton>
      </div>

      {!bee ? (
        <EmptyCard line="Sign in to see your reports." />
      ) : error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-600"
          style={{ fontSize: '13px' }}
        >
          {error}
        </div>
      ) : rows === null ? (
        <EmptyCard line="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyCard
          line={
            tab === 'byme'
              ? "You haven't reported anything yet."
              : 'Nothing you posted has been reported.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <ReportCard key={r.flagId} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportCard({ row }: { row: ReportRow }) {
  const card = (
    <div
      className="block overflow-hidden rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50"
      style={{ borderLeft: `3px solid ${INTEL_COLOR}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[14px] font-medium text-zinc-900">
            {row.threadTitle ?? 'Untitled thread'}
          </p>
          {row.snippet && (
            <p className="mt-0.5 line-clamp-2 text-[12.5px] text-zinc-500">{row.snippet}</p>
          )}
        </div>
        <StatusPill status={row.status} />
      </div>
      <div
        className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500"
        data-size="meta"
      >
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 uppercase tracking-wider">
          {row.targetKind}
        </span>
        {row.reason && <span>Reason: {row.reason}</span>}
        {row.createdAt && <span>{relativeTime(row.createdAt)}</span>}
      </div>
    </div>
  );

  // thread_id is always the navigation target (a flagged post → its thread).
  return <li>{row.threadId ? <Link to={`/intel/t/${row.threadId}`}>{card}</Link> : card}</li>;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === 'open' || s === 'pending'
      ? { color: '#B45309', bg: '#FEF3C7' }
      : s === 'dismissed'
        ? { color: '#52525B', bg: '#F4F4F5' }
        : { color: '#15803D', bg: '#DCFCE7' };
  return (
    <span
      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
      style={{ color: tone.color, background: tone.bg }}
      data-size="meta"
    >
      {status || 'open'}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm px-3 py-1 text-[13px] font-medium transition-all',
        !active && 'text-zinc-500 hover:text-zinc-800',
      )}
      style={
        active ? { color: INTEL_COLOR, background: `${INTEL_COLOR}18`, fontWeight: 600 } : undefined
      }
    >
      {children}
    </button>
  );
}

function EmptyCard({ line }: { line: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-8 text-center text-[13px] text-zinc-500">
      {line}
    </div>
  );
}
