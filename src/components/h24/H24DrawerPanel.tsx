// H24_DRAWER1 — the h24 icon-drawer panel, wired to REAL data.
//
// SHELL v1.5.1 + the dispatch: this is the h24 quick-look panel (opened from the
// toolbar's h24 icon). THREE tabs, each a Quick-Look — pertinent details only,
// with the FULL PAGE as the exit (Quick-Look Law):
//
//   Routing  — the last directives this Bee routed: when / provider / cost.
//              Reads the routing log already fetched by OraclePage (passed in),
//              so the drawer adds no second fetch. Exit: the full routing log in
//              the page content.
//   Rail     — live ops_dispatches: queue depth, claims, heartbeat health.
//              READ-ONLY, admin-gated (useRailBoard's RLS returns zero rows to a
//              non-admin, and we do not even poll unless the tab is open AND the
//              Bee is admin). Exit: the /mc board.
//   Billing  — the latest directive's token-leg breakdown + session spend.
//              Exit: pick a row in the page's routing log to open its full cost
//              panel.
//
// REAL-DATA-ONLY: nothing here fabricates a number. An empty state says "empty",
// a failed read says "failed", and a non-admin Rail tab says so plainly.

import type { RoutingLogEntry } from '@/lib/atlasoracle/routingLog';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { heartbeatState, shortDuration, silentMinutes, useRailBoard } from '@/lib/useRailBoard';
import { type ReactNode, useState } from 'react';

type Tab = 'routing' | 'rail' | 'billing';

const TABS: { id: Tab; label: string }[] = [
  { id: 'routing', label: 'Routing' },
  { id: 'rail', label: 'Rail' },
  { id: 'billing', label: 'Billing' },
];

/** "3m ago" / "2h 4m ago" from an ISO timestamp, or "—" when unparseable. */
function ago(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  return `${shortDuration(mins)} ago`;
}

const HEARTBEAT_COLOR: Record<ReturnType<typeof heartbeatState>, string> = {
  current: '#3fbf6a', // green — pinging
  quiet: '#e0a23a', // amber — drifting
  'past-threshold': '#e5484d', // red — a suspicion
};

export function H24DrawerPanel({
  entries,
  signedIn,
  onOpenBoard,
  onOpenLog,
}: {
  entries: RoutingLogEntry[];
  signedIn: boolean;
  /** Navigate to the /mc board — the Rail tab's full-page exit. */
  onOpenBoard: () => void;
  /** Navigate to /h24/log — the Routing tab's full-page exit (H24_FIX1). */
  onOpenLog: () => void;
}) {
  const [tab, setTab] = useState<Tab>('routing');

  return (
    <div className="flex flex-col gap-3">
      {/* TAB BAR */}
      <div className="flex items-center gap-1" role="tablist" aria-label="h24 activity">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="rounded-md px-2.5 py-1 font-mono transition-colors"
              style={{
                fontSize: 12,
                color: active ? 'var(--ink)' : 'var(--mute)',
                background: active
                  ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
                  : 'transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'routing' && (
        <RoutingTab entries={entries} signedIn={signedIn} onOpenLog={onOpenLog} />
      )}
      {tab === 'rail' && <RailTab onOpenBoard={onOpenBoard} />}
      {tab === 'billing' && <BillingTab entries={entries} signedIn={signedIn} />}
    </div>
  );
}

/* ── Routing: last directives — when / provider / cost ──────────────────────*/
function RoutingTab({
  entries,
  signedIn,
  onOpenLog,
}: {
  entries: RoutingLogEntry[];
  signedIn: boolean;
  onOpenLog: () => void;
}) {
  const now = Date.now();
  const recent = entries.slice(0, 6);

  if (!signedIn) {
    return <Empty>Sign in to see your routing log.</Empty>;
  }
  if (recent.length === 0) {
    return <Empty>No directives routed yet.</Empty>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {recent.map((e) => (
        <div
          key={e.id}
          className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5"
          style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
        >
          <div className="min-w-0">
            <div className="truncate font-mono" style={{ color: 'var(--body)', fontSize: 12 }}>
              {e.provider ?? (e.tier === 'free' ? 'free' : 'Auto')}
            </div>
            <div style={{ color: 'var(--mute)', fontSize: 10.5 }}>{ago(e.createdAt, now)}</div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="font-mono" style={{ color: 'var(--bling-gold)', fontSize: 12 }}>
              {/* null cost = no ledger row (free tier, or a failure we did not
                  charge). "FREE"/"—" says that apart from a real zero. */}
              {e.costTokens === null
                ? e.tier === 'free'
                  ? 'FREE'
                  : '—'
                : formatTokens(e.costTokens)}
            </div>
            <div style={{ color: 'var(--mute)', fontSize: 10 }}>{e.status}</div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpenLog}
        className="mt-1 self-start underline-offset-2 hover:underline"
        style={{ color: 'var(--body)', fontSize: 10.5 }}
      >
        Open the full routing log →
      </button>
    </div>
  );
}

/* ── Rail: live ops_dispatches, read-only, admin-gated ──────────────────────*/
function RailTab({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { isAdmin, loading } = useIsAdmin();
  // Poll only while this tab is mounted AND the Bee is admin. A non-admin never
  // issues a query — the RLS would return nothing anyway.
  const board = useRailBoard(isAdmin);
  const now = Date.now();

  if (loading) return <Empty>Checking access…</Empty>;
  if (!isAdmin) return <Empty>The rail board is admin-only.</Empty>;
  if (board.queueError) return <Empty>Rail read failed: {board.queueError}</Empty>;

  const queue = board.queue ?? [];
  const queued = queue.filter((d) => d.status === 'queued').length;
  const claimedRows = queue.filter((d) => d.status === 'claimed');

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 font-mono" style={{ fontSize: 12 }}>
        <span style={{ color: 'var(--body)' }}>{queued} queued</span>
        <span style={{ color: 'var(--body)' }}>{claimedRows.length} claimed</span>
        <span
          style={{ color: board.stale.size > 0 ? '#e5484d' : 'var(--mute)' }}
          title="Claims silent past the threshold"
        >
          {board.stale.size} stale
        </span>
        <span className="ml-auto flex items-center gap-1" style={{ color: 'var(--mute)' }}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: board.live ? '#3fbf6a' : 'var(--mute)' }}
          />
          {board.lastReadAt ? `${Math.max(0, Math.floor((now - board.lastReadAt) / 1000))}s` : '—'}
        </span>
      </div>

      {claimedRows.length > 0 ? (
        <div className="flex flex-col gap-1">
          {claimedRows.slice(0, 5).map((d) => {
            const mins = silentMinutes(d, now);
            const hb = heartbeatState(mins ?? 0, board.thresholdMinutes);
            return (
              <div
                key={d.id}
                className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1"
                style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}
              >
                <span
                  className="min-w-0 truncate font-mono"
                  style={{ color: 'var(--body)', fontSize: 11.5 }}
                >
                  {d.pass}
                  <span style={{ color: 'var(--mute)' }}> · {d.lane ?? '—'}</span>
                </span>
                <span
                  className="flex-shrink-0 font-mono"
                  style={{ color: HEARTBEAT_COLOR[hb], fontSize: 11 }}
                  title="Minutes since last heartbeat"
                >
                  {mins === null ? '—' : shortDuration(mins)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Nothing claimed right now.</Empty>
      )}

      <button
        type="button"
        onClick={onOpenBoard}
        className="self-start underline-offset-2 hover:underline"
        style={{ color: 'var(--body)', fontSize: 12 }}
      >
        Open the board →
      </button>
    </div>
  );
}

/* ── Billing: latest directive's token legs + session spend ─────────────────*/
function BillingTab({ entries, signedIn }: { entries: RoutingLogEntry[]; signedIn: boolean }) {
  if (!signedIn) return <Empty>Sign in to see billing.</Empty>;
  if (entries.length === 0) return <Empty>No directives to bill yet.</Empty>;

  // Session spend across the loaded log. Only rows with a real ledger row count.
  const spent = entries.reduce((sum, e) => sum + (e.costTokens ?? 0), 0);
  const billed = entries.filter((e) => e.costTokens !== null);
  const latest = billed[0] ?? entries[0];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="font-mono" style={{ color: 'var(--bling-gold)', fontSize: 20 }}>
          {formatTokens(spent)}
        </div>
        <div style={{ color: 'var(--mute)', fontSize: 11 }}>
          h24 tokens across {entries.length} directive{entries.length === 1 ? '' : 's'}
        </div>
      </div>

      <div>
        <div className="mb-1 font-mono" style={{ color: 'var(--body)', fontSize: 11.5 }}>
          Latest — {latest.provider ?? (latest.tier === 'free' ? 'free' : 'Auto')}
        </div>
        <Leg label="input" value={latest.inputTokens} />
        <Leg label="output" value={latest.outputTokens} />
        <Leg label="cached" value={latest.cachedTokens} />
        <div
          className="mt-1 flex items-baseline justify-between border-t pt-1"
          style={{ borderColor: 'var(--hairline)' }}
        >
          <span style={{ color: 'var(--body)', fontSize: 11.5 }}>cost</span>
          <span className="font-mono" style={{ color: 'var(--bling-gold)', fontSize: 11.5 }}>
            {latest.costTokens === null
              ? latest.tier === 'free'
                ? 'FREE'
                : '—'
              : formatTokens(latest.costTokens)}
          </span>
        </div>
      </div>

      <p style={{ color: 'var(--mute)', fontSize: 10.5 }}>
        Pick a row in the console's routing log for the full per-leg cost.
      </p>
    </div>
  );
}

function Leg({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between" style={{ fontSize: 11.5 }}>
      <span style={{ color: 'var(--mute)' }}>{label}</span>
      <span className="font-mono" style={{ color: 'var(--body)' }}>
        {value === null ? '—' : value.toLocaleString()}
      </span>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p style={{ color: 'var(--mute)', fontSize: 12 }}>{children}</p>;
}
