/* h24 RIGHT BUILD PANEL — its first real tenant: the cost breakdown.
 *
 * H24_DESIGN_SPEC: "the frame plus its FIRST REAL TENANT — tap any cost in the
 * routing log and the panel opens with that charge's legs, rate, subtotals.
 * Close returns full width. This makes the panel real on day one."
 *
 * The arithmetic is NOT re-implemented here. `buildCostBreakdown` /
 * `rateLiveAt` are the same functions the routing-log row expansion used, and
 * they price each directive at the rate that was LIVE WHEN IT RAN — never
 * today's card, which would invent a number that never happened. The panel is
 * a second presentation of a proven computation, not a new one.
 */

import {
  type ModelRateRow,
  buildCostBreakdown,
  formatTokensExact,
  rateLiveAt,
} from '@/lib/atlasoracle/reconcile';
import type { RoutingLogEntry } from '@/lib/atlasoracle/routingLog';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { X } from 'lucide-react';

export interface H24CostPanelProps {
  entry: RoutingLogEntry;
  rates: ModelRateRow[];
  onClose: () => void;
}

export function H24CostPanel({ entry, rates, onClose }: H24CostPanelProps) {
  const rate = entry.provider === null ? null : rateLiveAt(rates, entry.provider, entry.createdAt);
  const breakdown =
    rate === null || entry.costTokens === null
      ? null
      : buildCostBreakdown(
          rate,
          {
            input: entry.inputTokens ?? 0,
            output: entry.outputTokens ?? 0,
            cached: entry.cachedTokens ?? 0,
          },
          entry.costTokens,
        );

  return (
    <aside
      aria-label="Cost breakdown"
      className="flex w-80 flex-shrink-0 flex-col border-l border-border bg-bg-elevated/40"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-display font-semibold text-text" style={{ fontSize: '14px' }}>
            Cost breakdown
          </h2>
          <p className="text-text-muted" style={{ fontSize: '11px' }}>
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cost breakdown"
          className="rounded-md p-1 text-text-silver transition-colors hover:bg-panel-2 hover:text-text"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5" style={{ fontSize: '12px' }}>
          <dt className="text-text-muted">Provider</dt>
          <dd className="text-right font-mono text-text">{entry.provider ?? '—'}</dd>
          <dt className="text-text-muted">Tier</dt>
          <dd className="text-right font-mono text-text">{entry.tier}</dd>
          <dt className="text-text-muted">Kind</dt>
          <dd className="text-right font-mono text-text-silver">{entry.category}</dd>
        </dl>

        {breakdown === null ? (
          <p
            className="rounded-md border border-border-bright bg-panel-2 p-3 text-text-silver"
            style={{ fontSize: '11.5px' }}
          >
            Charged {formatTokensExact(entry.costTokens ?? 0)} h24 tokens. The rate that was live
            for {entry.provider ?? 'this provider'} at that moment is not on the current rate card,
            so the legs cannot be shown — the debit is the ledger's own figure and stands.
          </p>
        ) : (
          <>
            <table className="w-full font-mono" style={{ fontSize: '11.5px' }}>
              <thead className="text-text-muted">
                <tr>
                  <th className="py-1 text-left font-medium">Leg</th>
                  <th className="py-1 text-right font-medium">Tokens</th>
                  <th className="py-1 text-right font-medium">Rate/1M</th>
                  <th className="py-1 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {breakdown.legs.map((leg) => (
                  <tr key={leg.label} className="border-t border-border">
                    <td className="py-1 text-text-silver">
                      {leg.label}
                      {leg.rateFallback && (
                        <span
                          className="ml-1 text-honey"
                          title="No cached rate is configured for this model, so cached tokens bill at the full input rate."
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right">{leg.tokens.toLocaleString()}</td>
                    <td className="py-1 text-right text-text-silver">
                      {formatTokens(leg.ratePerM)}
                    </td>
                    <td className="py-1 text-right">{formatTokensExact(leg.subtotal)}</td>
                  </tr>
                ))}
                {!breakdown.reconciles && (
                  <tr className="border-t border-border">
                    <td className="py-1 text-text-silver" colSpan={3}>
                      {breakdown.adjustment < 0
                        ? 'capped at the estimate — platform absorbed the rest'
                        : 'adjustment'}
                    </td>
                    <td className="py-1 text-right text-honey">
                      {formatTokensExact(breakdown.adjustment)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-border-bright">
                  <td className="py-1 font-semibold" colSpan={3}>
                    debited
                  </td>
                  <td className="py-1 text-right font-semibold text-honey">
                    {formatTokensExact(breakdown.debit)}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-text-muted" style={{ fontSize: '11px' }}>
              Priced at the rate card live on{' '}
              {new Date(breakdown.rate.effectiveFrom).toLocaleString()}, the one in force when this
              directive ran.
              {breakdown.legs.some((l) => l.rateFallback) &&
                ' * cached tokens billed at the input rate — no cached rate is configured for this model.'}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
