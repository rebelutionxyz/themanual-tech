// H24_FIX1 — the routing-log table, extracted out of OraclePage so the SAME
// rendering serves both the console's compact inline view and the dedicated
// /h24/log page (H24_FIX1 defect 9: the log needed its own page, not just an
// inline block). `filters` is opt-in: the console keeps rendering the plain
// table it always has, and only the full page turns filtering on.

import type { ModelRateRow } from '@/lib/atlasoracle/reconcile';
import { formatTokensExact } from '@/lib/atlasoracle/reconcile';
import type { RoutingLogEntry } from '@/lib/atlasoracle/routingLog';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface RoutingLogData {
  loaded: boolean;
  error: string | null;
  entries: RoutingLogEntry[];
  rates: ModelRateRow[];
}

interface Filters {
  band: 'all' | 'auto' | 'free';
  kind: string;
  provider: string;
  status: string;
}

const EMPTY_FILTERS: Filters = { band: 'all', kind: 'all', provider: 'all', status: 'all' };

export function RoutingLogTable({
  log,
  signedIn,
  selectedCostId,
  onSelectCost,
  onRefresh,
  onExport,
  showFilters = false,
  title = 'Your routing log',
}: {
  log: RoutingLogData;
  signedIn: boolean;
  selectedCostId: string | null;
  onSelectCost: (id: string | null) => void;
  onRefresh: () => void;
  onExport: () => void;
  /** H24_FIX1 defect 9 — filterable by band/kind/provider/status. Off by
   *  default so the console's compact inline view is unchanged. */
  showFilters?: boolean;
  title?: string;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const kinds = useMemo(
    () => Array.from(new Set(log.entries.map((e) => e.category))).sort(),
    [log.entries],
  );
  const providers = useMemo(
    () =>
      Array.from(new Set(log.entries.map((e) => e.provider).filter((p): p is string => !!p))).sort(),
    [log.entries],
  );
  const statuses = useMemo(
    () => Array.from(new Set(log.entries.map((e) => e.status))).sort(),
    [log.entries],
  );

  const visible = useMemo(() => {
    if (!showFilters) return log.entries;
    return log.entries.filter((e) => {
      if (filters.band !== 'all') {
        const bandOfEntry = e.tier === 'free' ? 'free' : 'auto';
        if (bandOfEntry !== filters.band) return false;
      }
      if (filters.kind !== 'all' && e.category !== filters.kind) return false;
      if (filters.provider !== 'all' && e.provider !== filters.provider) return false;
      if (filters.status !== 'all' && e.status !== filters.status) return false;
      return true;
    });
  }, [log.entries, filters, showFilters]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="astra-display font-semibold" style={{ color: 'var(--ink)', fontSize: 14 }}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md px-2 py-0.5 transition-colors"
          style={{ border: '1px solid var(--line)', color: 'var(--body)', fontSize: 11.5 }}
        >
          refresh
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={log.entries.length === 0}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors disabled:opacity-30"
          style={{ border: '1px solid var(--line)', color: 'var(--body)', fontSize: 11.5 }}
          title="Export routing log (CSV)"
        >
          <Download size={13} /> export
        </button>
      </div>

      {showFilters && log.entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Band"
            value={filters.band}
            onChange={(v) => setFilters((f) => ({ ...f, band: v as Filters['band'] }))}
            options={[
              { id: 'all', label: 'All' },
              { id: 'auto', label: 'Auto' },
              { id: 'free', label: 'free' },
            ]}
          />
          <FilterSelect
            label="Kind"
            value={filters.kind}
            onChange={(v) => setFilters((f) => ({ ...f, kind: v }))}
            options={[{ id: 'all', label: 'All' }, ...kinds.map((k) => ({ id: k, label: k }))]}
          />
          <FilterSelect
            label="Provider"
            value={filters.provider}
            onChange={(v) => setFilters((f) => ({ ...f, provider: v }))}
            options={[{ id: 'all', label: 'All' }, ...providers.map((p) => ({ id: p, label: p }))]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[{ id: 'all', label: 'All' }, ...statuses.map((s) => ({ id: s, label: s }))]}
          />
          {(filters.band !== 'all' ||
            filters.kind !== 'all' ||
            filters.provider !== 'all' ||
            filters.status !== 'all') && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="underline-offset-2 hover:underline"
              style={{ color: 'var(--mute)', fontSize: 11.5 }}
            >
              clear filters
            </button>
          )}
        </div>
      )}

      {!log.loaded && <p style={{ color: 'var(--body)', fontSize: 12.5 }}>Loading…</p>}

      {log.loaded && log.error && (
        <p
          className="rounded-md p-3"
          style={{
            border: '1px solid color-mix(in srgb, var(--error) 60%, transparent)',
            background: 'color-mix(in srgb, var(--error) 10%, transparent)',
            color: 'var(--ink)',
            fontSize: 12.5,
          }}
          role="alert"
        >
          Could not load the routing log: {log.error}
        </p>
      )}

      {log.loaded && !log.error && log.entries.length === 0 && (
        <p
          className="rounded-md p-3"
          style={{
            border: '1px solid var(--line)',
            background: 'var(--raised)',
            color: 'var(--body)',
            fontSize: 12.5,
          }}
        >
          {signedIn ? 'No directives routed yet.' : 'Sign in to see your routing log.'}
        </p>
      )}

      {log.loaded && !log.error && log.entries.length > 0 && visible.length === 0 && (
        <p
          className="rounded-md p-3"
          style={{
            border: '1px solid var(--line)',
            background: 'var(--raised)',
            color: 'var(--body)',
            fontSize: 12.5,
          }}
        >
          No directives match these filters.
        </p>
      )}

      {log.loaded && !log.error && visible.length > 0 && (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--line)' }}>
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead style={{ background: 'var(--raised)', color: 'var(--body)' }}>
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                {/* SHELL v1.5: the "Tier" column is renamed to Band. */}
                <th className="px-3 py-2 text-left font-medium">Band</th>
                <th className="px-3 py-2 text-left font-medium">Kind</th>
                <th className="px-3 py-2 text-left font-medium">Provider</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">
                  Tokens
                  <span className="ml-1 font-normal opacity-70">in / out / cached</span>
                </th>
                <th className="px-3 py-2 text-left font-medium">Cost</th>
                <th className="px-3 py-2 text-left font-medium">Latency</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--ink)' }}>
              {visible.map((e) => (
                <tr
                  key={e.id}
                  style={{
                    borderTop: '1px solid var(--hairline)',
                    background:
                      selectedCostId === e.id
                        ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
                        : undefined,
                    verticalAlign: 'top',
                  }}
                >
                  <td className="whitespace-nowrap px-3 py-2" style={{ color: 'var(--body)' }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  {/* Band vocabulary: free stays free; everything else is Auto. */}
                  <td className="px-3 py-2 font-mono">{e.tier === 'free' ? 'free' : 'Auto'}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--body)' }}>
                    {e.category}
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--body)' }}>
                    {e.provider ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="font-mono"
                      style={{
                        color:
                          e.success === true
                            ? 'var(--buy-green)'
                            : e.success === false
                              ? 'var(--error)'
                              : undefined,
                      }}
                      title={e.errorMessage ?? undefined}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 font-mono"
                    style={{ color: 'var(--body)' }}
                  >
                    {e.inputTokens === null && e.outputTokens === null && e.cachedTokens === null
                      ? '—'
                      : `${(e.inputTokens ?? 0).toLocaleString()} / ${(e.outputTokens ?? 0).toLocaleString()} / ${(e.cachedTokens ?? 0).toLocaleString()}`}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">
                    {e.costTokens === null ? (
                      <span
                        style={{ color: 'var(--body)' }}
                        title={
                          e.tier === 'free'
                            ? 'The free tier never debits.'
                            : 'No debit was written for this directive.'
                        }
                      >
                        {e.tier === 'free' ? 'FREE' : '—'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectCost(selectedCostId === e.id ? null : e.id)}
                        aria-expanded={selectedCostId === e.id}
                        className="underline decoration-dotted underline-offset-2 transition-colors"
                        style={{ color: 'var(--bling-gold)' }}
                        title="Open the cost breakdown in the side panel"
                      >
                        {formatTokensExact(e.costTokens)}
                      </button>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 font-mono"
                    style={{ color: 'var(--body)' }}
                  >
                    {e.latencyMs === null ? '—' : `${e.latencyMs}ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: 'var(--mute)', fontSize: 11 }}>
        Metadata only. Directive text and routed responses are never stored — the columns do not
        exist. Click a cost to open its breakdown: each leg, its rate, and the subtotals adding up
        to the amount debited.
      </p>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md px-1.5 py-0.5"
        style={{
          background: 'var(--raised)',
          border: '1px solid var(--line)',
          color: 'var(--body)',
          fontSize: 11.5,
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
