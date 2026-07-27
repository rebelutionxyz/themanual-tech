import {
  DIRECTIVE_CATEGORIES,
  type DirectiveCategory,
  type Tier,
  isMocked,
} from '@/lib/atlasoracle/client';
import { type RoutingLogEntry, fetchRoutingLog } from '@/lib/atlasoracle/routingLog';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleDirective } from '@/lib/atlasoracle/useOracleDirective';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/**
 * AtlasOracle console — themanual.tech/oracle.
 *
 * The full-surface counterpart to the spine badge: Oracle Token balance, tier
 * rate card, directive box, and the Bee's own routing log (metadata only —
 * directive and response text are never stored).
 *
 * NOTE ON NAMING: /dingleberry/oracle is a different screen entirely (the
 * DingleBERRY security copilot demo). This is the AtlasOracle Astra console,
 * registered top-level ahead of the /:slug catch-all.
 *
 * Economics per Butch ruling 2026-07-27: Oracle Tokens, not BLiNG!. No escrow
 * control appears on this surface.
 */
export function OraclePage() {
  const { bee } = useAuth();
  const [directive, setDirective] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [category, setCategory] = useState<DirectiveCategory>('suggest');
  const [tokenNotice, setTokenNotice] = useState(false);

  const { state, response, preview, failure, send, confirm, cancelConfirm, reset } =
    useOracleDirective();

  const { balance: tokens, rates, applyBalanceAfter } = useOracleTokens(bee?.id ?? null);

  const [log, setLog] = useState<{
    loaded: boolean;
    error: string | null;
    entries: RoutingLogEntry[];
  }>({ loaded: false, error: null, entries: [] });

  const loadLog = useCallback(async () => {
    if (!bee) {
      setLog({ loaded: true, error: null, entries: [] });
      return;
    }
    try {
      const entries = await fetchRoutingLog();
      setLog({ loaded: true, error: null, entries });
    } catch (e) {
      setLog({
        loaded: true,
        error: e instanceof Error ? e.message : String(e),
        entries: [],
      });
    }
  }, [bee]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  // A completed directive adds a row and moves the balance — refresh the log,
  // and take the post-debit balance straight from the router's response so the
  // running total matches the ledger without a second round trip.
  useEffect(() => {
    if (state !== 'response-ready') return;
    void loadLog();
    if (response) applyBalanceAfter(response.balanceAfterTokens);
  }, [state, loadLog, response, applyBalanceAfter]);

  const canSubmit = directive.trim().length > 0 && state !== 'working';
  const tierRate = rates.find((r) => r.tier === tier);
  const balanceLabel = tokens.balance === null ? '—' : formatTokens(tokens.balance);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
        <header className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border-2 border-border bg-bg-elevated/40">
            <Sparkles size={30} className="text-honey" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">AtlasOracle</h1>
            <p className="mt-1 text-text-silver" style={{ fontSize: '13px' }}>
              Send a directive. AtlasOracle routes it to a provider against this platform's canon
              and hands the answer straight back to you — the directive and the response are never
              stored.
            </p>
          </div>
        </header>

        {isMocked() && (
          <div
            className="rounded-md border border-honey/50 bg-honey/10 px-3 py-2 text-honey"
            style={{ fontSize: '12px' }}
          >
            MOCK MODE — no provider is called and nothing is spent. Directives beginning{' '}
            <code>!preview</code>, <code>!fund</code>, <code>!cap</code> or <code>!fail</code>{' '}
            exercise the other response shapes.
          </div>
        )}

        {!bee && (
          <div
            className="rounded-md border border-border-bright bg-panel-2 p-4 text-text-silver"
            style={{ fontSize: '13px' }}
          >
            Sign in to send directives and see your routing log.
          </div>
        )}

        {/* Oracle Tokens */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-semibold text-text" style={{ fontSize: '15px' }}>
            Oracle Tokens
          </h2>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-bright bg-bg-elevated p-4">
            <div>
              <div className="font-mono text-2xl text-text">{balanceLabel}</div>
              <div className="text-text-silver" style={{ fontSize: '11.5px' }}>
                {tokens.status === 'live' ? 'available to route with' : tokens.reason}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTokenNotice((v) => !v)}
              aria-expanded={tokenNotice}
              className="ml-auto rounded-md border border-honey/60 bg-honey/10 px-3 py-1.5 font-semibold text-honey transition-colors hover:border-honey/90 hover:bg-honey/20"
              style={{ fontSize: '12.5px' }}
            >
              GET Oracle Tokens
            </button>
          </div>
          {tokenNotice && (
            <p
              className="rounded-md border border-border-bright bg-panel-2 p-3 text-text-silver"
              style={{ fontSize: '12.5px' }}
            >
              Your balance above is live and directives are charged against it. What there is not
              yet is a way to GET more — how Oracle Tokens are offered has not been ruled on, so
              this control has nothing to hand you. The free tier routes today at no token cost.
            </p>
          )}
        </section>

        {/* Tier rates */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-semibold text-text" style={{ fontSize: '15px' }}>
            Tiers
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border-bright">
            <table className="w-full" style={{ fontSize: '12.5px' }}>
              <thead className="bg-panel-2 text-text-silver">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tier</th>
                  <th className="px-3 py-2 text-left font-medium">Provider</th>
                  <th className="px-3 py-2 text-left font-medium">In / 1M</th>
                  <th className="px-3 py-2 text-left font-medium">Out / 1M</th>
                  <th className="px-3 py-2 text-left font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {rates.length === 0 && (
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-text-silver" colSpan={5}>
                      Rate card unavailable right now.
                    </td>
                  </tr>
                )}
                {rates.map((r) => (
                  <tr key={r.tier} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{r.tier}</td>
                    <td className="px-3 py-2 font-mono text-text-silver">{r.model}</td>
                    <td className="px-3 py-2 font-mono">
                      {r.tier === 'free' ? 'FREE' : formatTokens(r.inputPerM)}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {r.tier === 'free' ? 'FREE' : formatTokens(r.outputPerM)}
                    </td>
                    <td className="px-3 py-2 text-text-silver">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-text-silver" style={{ fontSize: '11px' }}>
            Oracle Tokens per 1,000,000 provider tokens, read live from the same rate card the
            router charges against. Cached input, where a provider reports it, bills at a lower rate
            again.
          </p>
        </section>

        {/* Directive box */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-semibold text-text" style={{ fontSize: '15px' }}>
            Directive
          </h2>

          {(state === 'idle' || state === 'working') && (
            <>
              <textarea
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                placeholder="Type a directive…"
                rows={5}
                disabled={!bee || state === 'working'}
                className="w-full rounded-md border border-border-bright bg-bg p-3 font-mono text-text placeholder:text-text-silver/60 focus:border-honey/70 focus:outline-none disabled:opacity-50"
                style={{ fontSize: '13px' }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="oracle-tier"
                  className="text-text-silver"
                  style={{ fontSize: '12px' }}
                >
                  Tier
                </label>
                <select
                  id="oracle-tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as Tier)}
                  disabled={!bee || state === 'working'}
                  className="rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text"
                  style={{ fontSize: '12px' }}
                >
                  <option value="free">free</option>
                  <option value="standard">standard</option>
                  <option value="frontier">frontier</option>
                </select>

                <label
                  htmlFor="oracle-category"
                  className="text-text-silver"
                  style={{ fontSize: '12px' }}
                >
                  Kind
                </label>
                <select
                  id="oracle-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DirectiveCategory)}
                  disabled={!bee || state === 'working'}
                  className="rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text"
                  style={{ fontSize: '12px' }}
                >
                  {DIRECTIVE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!bee || !canSubmit}
                  onClick={() => void send(directive, { tier, category, astraSlug: 'themanual' })}
                  className={cn(
                    'ml-auto rounded-md border border-honey/60 bg-honey/10 px-4 py-1.5 font-semibold text-honey transition-colors',
                    'hover:border-honey/90 hover:bg-honey/20',
                    (!bee || !canSubmit) && 'cursor-not-allowed opacity-40',
                  )}
                  style={{ fontSize: '12.5px' }}
                >
                  {state === 'working' ? 'Routing…' : 'SEND'}
                </button>
              </div>
              {tierRate && (
                <p className="text-text-silver" style={{ fontSize: '11px' }}>
                  {tierRate.model} ·{' '}
                  {tierRate.tier === 'free'
                    ? 'FREE'
                    : `${formatTokens(tierRate.inputPerM)} in / ${formatTokens(tierRate.outputPerM)} out per 1M tokens`}
                </p>
              )}
            </>
          )}

          {state === 'awaiting-confirm' && preview && (
            <div className="flex flex-col gap-3 rounded-md border border-honey/60 bg-honey/10 p-4">
              <p className="text-text" style={{ fontSize: '13px' }}>
                This directive is estimated at{' '}
                <span className="font-mono font-semibold">
                  {formatTokens(preview.estimatedCostTokens)}
                </span>{' '}
                Oracle Tokens on {preview.provider}. Nothing has been spent yet — confirm to route
                it.
              </p>
              <p className="text-text-silver" style={{ fontSize: '11.5px' }}>
                est. {preview.estimatedInputTokens.toLocaleString()} in ·{' '}
                {preview.estimatedOutputTokens.toLocaleString()} out
                {tokens.balance !== null && (
                  <>
                    {' · '}balance {formatTokens(tokens.balance)} → about{' '}
                    {formatTokens(Math.max(0, tokens.balance - preview.estimatedCostTokens))} after
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void confirm()}
                  className="rounded-md border border-honey/60 bg-honey/20 px-3 py-1 font-semibold text-honey transition-colors hover:border-honey/90"
                  style={{ fontSize: '12.5px' }}
                >
                  CONFIRM
                </button>
                <button
                  type="button"
                  onClick={cancelConfirm}
                  className="rounded-md border border-border-bright px-3 py-1 text-text-silver transition-colors hover:text-text"
                  style={{ fontSize: '12.5px' }}
                >
                  cancel
                </button>
              </div>
            </div>
          )}

          {failure && (
            <div
              className="flex flex-col gap-2 rounded-md border border-kettle-unsourced/60 bg-kettle-unsourced/10 p-3 text-text"
              style={{ fontSize: '12.5px' }}
              role="alert"
            >
              <span>{failure.message}</span>
              {failure.action === 'get-tokens' && (
                <>
                  {failure.requiredTokens !== undefined &&
                    failure.availableTokens !== undefined && (
                      <span className="text-text-silver" style={{ fontSize: '11.5px' }}>
                        needs {formatTokens(failure.requiredTokens)} · you hold{' '}
                        {formatTokens(failure.availableTokens)} · short by{' '}
                        {formatTokens(
                          Math.max(0, failure.requiredTokens - failure.availableTokens),
                        )}
                      </span>
                    )}
                  <button
                    type="button"
                    onClick={() => setTokenNotice(true)}
                    className="self-start rounded-md border border-border-bright px-2 py-0.5 text-text-silver transition-colors hover:border-honey/70 hover:text-text"
                    style={{ fontSize: '11.5px' }}
                  >
                    GET Oracle Tokens
                  </button>
                </>
              )}
              {failure.action === 'retry-later' && failure.retryAfterSeconds && (
                <span className="text-text-silver" style={{ fontSize: '11.5px' }}>
                  Try again in about {failure.retryAfterSeconds}s.
                </span>
              )}
            </div>
          )}

          {state === 'response-ready' && response && (
            <div className="flex flex-col gap-2">
              <div
                className="rounded-md border border-border-bright bg-bg p-4 font-mono text-text"
                style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}
              >
                {response.response}
              </div>
              <div
                className="flex flex-wrap items-center gap-3 text-text-silver"
                style={{ fontSize: '11.5px' }}
              >
                <span>provider · {response.provider}</span>
                <span>
                  tokens · {response.tokens.input.toLocaleString()} in /{' '}
                  {response.tokens.output.toLocaleString()} out
                  {response.tokens.cached > 0
                    ? ` / ${response.tokens.cached.toLocaleString()} cached`
                    : ''}
                </span>
                <span className={response.costTokens > 0 ? 'text-honey' : undefined}>
                  cost ·{' '}
                  {response.costTokens === 0
                    ? 'FREE'
                    : `${formatTokens(response.costTokens)} Oracle Tokens`}
                </span>
                {response.balanceAfterTokens !== null && (
                  <span>balance · {formatTokens(response.balanceAfterTokens)}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setDirective('');
                  }}
                  className="ml-auto rounded-md border border-border-bright px-2 py-0.5 text-text-silver transition-colors hover:border-honey/70 hover:text-text"
                >
                  new directive
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Routing log */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-semibold text-text" style={{ fontSize: '15px' }}>
              Your routing log
            </h2>
            <button
              type="button"
              onClick={() => void loadLog()}
              className="rounded-md border border-border-bright px-2 py-0.5 text-text-silver transition-colors hover:border-honey/70 hover:text-text"
              style={{ fontSize: '11.5px' }}
            >
              refresh
            </button>
          </div>

          {!log.loaded && (
            <p className="text-text-silver" style={{ fontSize: '12.5px' }}>
              Loading…
            </p>
          )}

          {log.loaded && log.error && (
            <p
              className="rounded-md border border-kettle-unsourced/60 bg-kettle-unsourced/10 p-3 text-text"
              style={{ fontSize: '12.5px' }}
              role="alert"
            >
              Could not load the routing log: {log.error}
            </p>
          )}

          {log.loaded && !log.error && log.entries.length === 0 && (
            <p
              className="rounded-md border border-border-bright bg-panel-2 p-3 text-text-silver"
              style={{ fontSize: '12.5px' }}
            >
              {bee ? 'No directives routed yet.' : 'Sign in to see your routing log.'}
            </p>
          )}

          {log.loaded && !log.error && log.entries.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-bright">
              <table className="w-full" style={{ fontSize: '12px' }}>
                <thead className="bg-panel-2 text-text-silver">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">When</th>
                    <th className="px-3 py-2 text-left font-medium">Tier</th>
                    <th className="px-3 py-2 text-left font-medium">Kind</th>
                    <th className="px-3 py-2 text-left font-medium">Provider</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Tokens</th>
                    <th className="px-3 py-2 text-left font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="text-text">
                  {log.entries.map((e) => (
                    <tr key={e.id} className="border-t border-border align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-text-silver">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono">{e.tier}</td>
                      <td className="px-3 py-2 font-mono text-text-silver">{e.category}</td>
                      <td className="px-3 py-2 font-mono text-text-silver">{e.provider ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'font-mono',
                            e.success === true && 'text-kettle-sourced',
                            e.success === false && 'text-kettle-unsourced',
                          )}
                          title={e.errorMessage ?? undefined}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-text-silver">
                        {e.inputTokens === null && e.outputTokens === null
                          ? '—'
                          : `${(e.inputTokens ?? 0).toLocaleString()} / ${(e.outputTokens ?? 0).toLocaleString()}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-text-silver">
                        {e.latencyMs === null ? '—' : `${e.latencyMs}ms`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-text-silver" style={{ fontSize: '11px' }}>
            Metadata only. Directive text and routed responses are never stored — the columns do not
            exist.
          </p>
        </section>
      </div>
    </div>
  );
}
