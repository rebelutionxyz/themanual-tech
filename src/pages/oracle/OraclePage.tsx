import { COMPOSER_MEASURE, Composer, type ComposerBand } from '@/components/composer/Composer';
import { H24CostPanel } from '@/components/h24/H24CostPanel';
import { H24Sidebar } from '@/components/h24/H24Sidebar';
import { RoomsButton } from '@/components/layout/RoomsButton';
import {
  DIRECTIVE_CATEGORIES,
  type DirectiveCategory,
  type Tier,
  isMocked,
} from '@/lib/atlasoracle/client';
import { formatTokensExact } from '@/lib/atlasoracle/reconcile';
import type { ModelRateRow } from '@/lib/atlasoracle/reconcile';
import { type RoutingLogEntry, fetchRoutingLog } from '@/lib/atlasoracle/routingLog';
import { ORACLE_TOKENS_REFRESH_EVENT, formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleDirective } from '@/lib/atlasoracle/useOracleDirective';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { uploadToLibrary } from '@/lib/media';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Download, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * THE h24 SURFACE — the Claude pattern, built from H24_DESIGN_SPEC v1.0
 * (LOCKED, ORACLE_MF v1.46). The 678-line console this replaced was raw
 * material, not sacred: its balance, rate card, directive box and routing log
 * are all here, recomposed into sidebar / conversation / build-panel.
 *
 * ── THE FUND DISCIPLINE GOVERNS: real data only. ────────────────────────────
 * Every control on this surface does a real thing today or it is not here.
 * What that rule removed, and why, is recorded in the FRONT79 report; the load-
 * bearing omissions are marked inline where a reader would expect the control.
 *
 * ── WHERE THE TOOLBAR LIVES ─────────────────────────────────────────────────
 * The spec's toolbar is split across two bars by the existing architecture, and
 * this is deliberate, not an oversight:
 *   - The GLOBAL SiteHeader (black bar above this component) already carries the
 *     h24.tech WORDMARK, the BADGE (h24 + balance, glyphless per FRONT78) and
 *     the AVATAR — the toolbar's identity + right cluster.
 *   - This component adds the h24-SURFACE strip below it: sidebar toggle, back,
 *     forward, the reserved (empty) ROOMS slot FRONT80 owns, the breadcrumb, and
 *     export. Duplicating the badge/avatar/wordmark here would be two of each.
 */
export function OraclePage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // POST-PURCHASE RETURN (FRONT81). h24-checkout sends the user back to
  // /h24?tokens=1 after Stripe. The webhook credits the ledger asynchronously,
  // so we re-read the balance a few times (never optimistic math — a token only
  // shows once the webhook wrote it), show an honest banner, and strip the flag.
  const [topUpReturn, setTopUpReturn] = useState(false);
  // Empty deps ON PURPOSE: this must fire exactly once on the flagged return.
  // Stripping the flag (navigate below) changes location.search, so re-running
  // would cancel the delayed refreshes via cleanup before they ever fire.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once return handler; see note.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tokens') !== '1') return;
    setTopUpReturn(true);
    const fire = () => window.dispatchEvent(new Event(ORACLE_TOKENS_REFRESH_EVENT));
    fire();
    const t1 = setTimeout(fire, 2000);
    const t2 = setTimeout(fire, 5000);
    const t3 = setTimeout(() => setTopUpReturn(false), 12000);
    // Drop the query flag so a refresh or Back doesn't re-trigger the banner.
    navigate('/h24', { replace: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const [directive, setDirective] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [category, setCategory] = useState<DirectiveCategory>('suggest');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const { state, response, preview, failure, send, confirm, cancelConfirm, reset } =
    useOracleDirective();
  const { balance: tokens, rates: tierRates, applyBalanceAfter } = useOracleTokens(bee?.id ?? null);

  const [log, setLog] = useState<{
    loaded: boolean;
    error: string | null;
    entries: RoutingLogEntry[];
    rates: ModelRateRow[];
  }>({ loaded: false, error: null, entries: [], rates: [] });

  // The build panel's tenant: the log row whose cost is open. null = panel
  // closed and the conversation takes the full width back.
  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);

  const loadLog = useCallback(async () => {
    if (!bee) {
      setLog({ loaded: true, error: null, entries: [], rates: [] });
      return;
    }
    try {
      const { entries, rates } = await fetchRoutingLog();
      setLog({ loaded: true, error: null, entries, rates });
    } catch (e) {
      setLog({
        loaded: true,
        error: e instanceof Error ? e.message : String(e),
        entries: [],
        rates: [],
      });
    }
  }, [bee]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  useEffect(() => {
    if (state !== 'response-ready') return;
    void loadLog();
    if (response) applyBalanceAfter(response.balanceAfterTokens);
  }, [state, loadLog, response, applyBalanceAfter]);

  // MODEL PICKER = band + the model each band routes to (tiers-are-bands,
  // surfaced to the user for the first time). The model name is read from the
  // live rate card, so the sublabel is the real model the router will use.
  const bands: ComposerBand[] = useMemo(() => {
    const modelFor = (t: Tier) => tierRates.find((r) => r.tier === t)?.model;
    return (['free', 'standard', 'frontier'] as Tier[]).map((t) => ({
      id: t,
      label: t,
      sublabel: t === 'free' ? (modelFor(t) ?? 'no token cost') : modelFor(t),
    }));
  }, [tierRates]);

  // KIND folds into the composer as its secondary selector. It is a REAL router
  // parameter (`category`), so it stays; that is the whole test for whether a
  // control belongs on this surface.
  const kindOptions = useMemo(() => DIRECTIVE_CATEGORIES.map((c) => ({ id: c, label: c })), []);

  const currentModel = tierRates.find((r) => r.tier === tier);
  const selectedEntry = selectedCostId
    ? (log.entries.find((e) => e.id === selectedCostId) ?? null)
    : null;

  function submitDirective() {
    if (!bee || directive.trim().length === 0 || state === 'working') return;
    void send(directive, { tier, category, astraSlug: 'themanual' });
  }

  // [+] — REAL PATH ONLY. It uploads the chosen file INTO the Creator Studio
  // Library (the file is persisted; the sidebar Vault count reflects it on the
  // next load). It does NOT attach the file to the directive: the router accepts
  // `{ directive, tier, astra_slug, category, confirm_cost }` and no file
  // parameter, so a directive-attachment would be a control that submits
  // nothing. The honest action [+] can perform today is "add to your library",
  // and that is what it does — stated in the confirmation line, not implied.
  async function handleAttach(file: File) {
    if (!bee) return;
    setAttachStatus(`Uploading ${file.name}…`);
    try {
      const asset = await uploadToLibrary(bee.id, file, null);
      setAttachStatus(`Added ${asset.fileName} to your library.`);
    } catch (e) {
      setAttachStatus(e instanceof Error ? e.message : 'Upload failed.');
    }
  }

  function exportCsv() {
    // A real export of what is on screen — the user's own routing-log metadata,
    // generated client-side, no content columns because none exist.
    const header = [
      'when',
      'tier',
      'kind',
      'provider',
      'status',
      'input_tokens',
      'output_tokens',
      'cached_tokens',
      'cost_h24_tokens',
      'latency_ms',
    ];
    const rows = log.entries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.tier,
      e.category,
      e.provider ?? '',
      e.status,
      e.inputTokens ?? '',
      e.outputTokens ?? '',
      e.cachedTokens ?? '',
      e.costTokens === null ? '' : formatTokensExact(e.costTokens),
      e.latencyMs ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'h24-routing-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg">
      {/* POST-PURCHASE RETURN BANNER (FRONT81). Honest: the webhook credits
          asynchronously, so this says the top-up is received and the balance
          updates as it clears — it never asserts a number the ledger hasn't. */}
      {topUpReturn && (
        <div
          className="flex flex-shrink-0 items-center gap-2 border-b border-honey/40 bg-honey/10 px-4 py-2 text-honey"
          style={{ fontSize: '12.5px' }}
          // biome-ignore lint/a11y/useSemanticElements: a polite status banner is a live region, not an <output> form result.
          role="status"
        >
          <span>Top-up received — your h24 token balance updates here as the payment clears.</span>
          <button
            type="button"
            onClick={() => setTopUpReturn(false)}
            aria-label="Dismiss"
            className="ml-auto rounded p-0.5 text-honey/80 transition-colors hover:bg-honey/20 hover:text-honey"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* h24 SURFACE TOOLBAR STRIP — the controls the global header lacks. */}
      <div className="flex h-11 flex-shrink-0 items-center gap-1 border-b border-border px-3">
        <ToolbarButton
          label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((v) => !v)}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </ToolbarButton>
        <ToolbarButton label="Back" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} />
        </ToolbarButton>
        <ToolbarButton label="Forward" onClick={() => navigate(1)}>
          <ArrowRight size={17} />
        </ToolbarButton>

        {/* ROOMS — now the h24 shell's own transport (FRONTHDR1). The shared
            SiteHeader that used to carry the Rooms button no longer renders on
            /h24 (the pre-h24 Manual header was removed per ORACLE_MF v1.61 R2),
            so the reserved slot is filled here — the one Rooms control on this
            surface, still the FRONT80 component. */}
        <RoomsButton />

        {/* Breadcrumb. With no session store yet (sessions-are-content is an
            OPEN ruling — no chat persistence), the title is the static surface
            name, not a live session title. */}
        <span
          className="ml-2 truncate font-mono text-text-silver"
          style={{ fontSize: '12px' }}
          data-testid="h24-breadcrumb"
        >
          h24.tech <span className="text-text-muted">/ Console</span>
        </span>

        <div className="flex-1" />

        {/* EXPORT = download the routing log as CSV. Real. SEARCH and SHARE are
            omitted: there is no session store to search (site search is platform
            navigation, out of h24 scope per spec v0.6), and sharing a session is
            not a real action today. */}
        <ToolbarButton
          label="Export routing log (CSV)"
          onClick={exportCsv}
          disabled={log.entries.length === 0}
        >
          <Download size={16} />
        </ToolbarButton>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <H24Sidebar
          collapsed={sidebarCollapsed}
          balance={tokens}
          entries={log.entries}
          signedIn={Boolean(bee)}
        />

        {/* CENTER — conversation scrolls above, composer docked at the bottom.
            FRONT84: the message column and the composer share COMPOSER_MEASURE, a
            centered readable cap (like the Claude chat) instead of full-bleed. */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 md:px-8">
            <div className={cn(COMPOSER_MEASURE, 'flex flex-1 flex-col gap-6')}>
              <header>
                <h1 className="font-display text-xl font-semibold text-text">h24</h1>
                <p className="mt-1 text-text-silver" style={{ fontSize: '13px' }}>
                  Send a directive. h24 routes it to a provider against this platform's canon and
                  hands the answer back — the directive and the response are never stored.
                </p>
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

              {state === 'awaiting-confirm' && preview && (
                <div className="flex flex-col gap-3 rounded-md border border-honey/60 bg-honey/10 p-4">
                  <p className="text-text" style={{ fontSize: '13px' }}>
                    This directive is estimated at{' '}
                    <span className="font-mono font-semibold">
                      {formatTokens(preview.estimatedCostTokens)}
                    </span>{' '}
                    h24 tokens on {preview.provider}. Nothing has been spent yet — confirm to route
                    it.
                  </p>
                  <p className="text-text-silver" style={{ fontSize: '11.5px' }}>
                    est. {preview.estimatedInputTokens.toLocaleString()} in ·{' '}
                    {preview.estimatedOutputTokens.toLocaleString()} out
                    {tokens.balance !== null && (
                      <>
                        {' · '}balance {formatTokens(tokens.balance)} → about{' '}
                        {formatTokens(Math.max(0, tokens.balance - preview.estimatedCostTokens))}{' '}
                        after
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
                  {failure.action === 'get-tokens' &&
                    failure.requiredTokens !== undefined &&
                    failure.availableTokens !== undefined && (
                      <span className="text-text-silver" style={{ fontSize: '11.5px' }}>
                        needs {formatTokens(failure.requiredTokens)} · you hold{' '}
                        {formatTokens(failure.availableTokens)} · short by{' '}
                        {formatTokens(
                          Math.max(0, failure.requiredTokens - failure.availableTokens),
                        )}
                      </span>
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
                    className="rounded-md border border-border-bright bg-bg-elevated p-4 font-mono text-text"
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
                      {response.tokens.output.toLocaleString()} out /{' '}
                      {response.tokens.cached.toLocaleString()} cached
                    </span>
                    <span className={response.costTokens > 0 ? 'text-honey' : undefined}>
                      cost ·{' '}
                      {response.costTokens === 0
                        ? 'FREE'
                        : `${formatTokens(response.costTokens)} h24 tokens`}
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

              {/* ROUTING LOG — the conversation history. The cost is the panel's
                trigger: clicking it opens the build panel rather than expanding
                the row in place. */}
              <RoutingLog
                log={log}
                signedIn={Boolean(bee)}
                selectedCostId={selectedCostId}
                onSelectCost={setSelectedCostId}
                onRefresh={() => void loadLog()}
              />
            </div>
          </div>

          {/* COMPOSER DOCK — pinned to the bottom of the conversation column. The
              Composer self-caps to COMPOSER_MEASURE; the notes above it use the
              same measure so they align with the input, not the dock edge. */}
          <div className="flex-shrink-0 border-t border-border px-5 py-3 md:px-8">
            <div className={COMPOSER_MEASURE}>
              {attachStatus && (
                <p className="mb-2 text-text-muted" style={{ fontSize: '11.5px' }}>
                  {attachStatus}
                </p>
              )}
              {currentModel && tier !== 'free' && (
                <p className="mb-2 text-text-muted" style={{ fontSize: '11px' }}>
                  {currentModel.model} · {formatTokens(currentModel.inputPerM)} in /{' '}
                  {formatTokens(currentModel.outputPerM)} out per 1M tokens
                </p>
              )}
            </div>
            <input
              ref={attachInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAttach(f);
                e.target.value = '';
              }}
            />
            <Composer
              value={directive}
              onChange={setDirective}
              onSubmit={submitDirective}
              busy={state === 'working'}
              disabled={!bee}
              placeholder={bee ? 'Type a directive…' : 'Sign in to send a directive'}
              onAttach={() => attachInputRef.current?.click()}
              bands={bands}
              bandId={tier}
              onBandChange={(id) => setTier(id as Tier)}
              options={kindOptions}
              optionId={category}
              onOptionChange={(id) => setCategory(id as DirectiveCategory)}
              optionLabel="Kind"
              enableMic
            />
          </div>
        </section>

        {selectedEntry && (
          <H24CostPanel
            entry={selectedEntry}
            rates={log.rates}
            onClose={() => setSelectedCostId(null)}
          />
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-text-silver transition-colors hover:bg-bg-elevated hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function RoutingLog({
  log,
  signedIn,
  selectedCostId,
  onSelectCost,
  onRefresh,
}: {
  log: {
    loaded: boolean;
    error: string | null;
    entries: RoutingLogEntry[];
    rates: ModelRateRow[];
  };
  signedIn: boolean;
  selectedCostId: string | null;
  onSelectCost: (id: string | null) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display font-semibold text-text" style={{ fontSize: '14px' }}>
          Your routing log
        </h2>
        <button
          type="button"
          onClick={onRefresh}
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
          {signedIn ? 'No directives routed yet.' : 'Sign in to see your routing log.'}
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
                <th className="px-3 py-2 text-left font-medium">
                  Tokens
                  <span className="ml-1 font-normal opacity-70">in / out / cached</span>
                </th>
                <th className="px-3 py-2 text-left font-medium">Cost</th>
                <th className="px-3 py-2 text-left font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {log.entries.map((e) => (
                <tr
                  key={e.id}
                  className={cn(
                    'border-t border-border align-top',
                    selectedCostId === e.id && 'bg-honey/5',
                  )}
                >
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
                    {e.inputTokens === null && e.outputTokens === null && e.cachedTokens === null
                      ? '—'
                      : `${(e.inputTokens ?? 0).toLocaleString()} / ${(e.outputTokens ?? 0).toLocaleString()} / ${(e.cachedTokens ?? 0).toLocaleString()}`}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">
                    {e.costTokens === null ? (
                      <span
                        className="text-text-silver"
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
                        className="text-honey underline decoration-dotted underline-offset-2 transition-colors hover:text-text"
                        title="Open the cost breakdown in the side panel"
                      >
                        {formatTokensExact(e.costTokens)}
                      </button>
                    )}
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

      <p className="text-text-muted" style={{ fontSize: '11px' }}>
        Metadata only. Directive text and routed responses are never stored — the columns do not
        exist. Click a cost to open its breakdown: each leg, its rate, and the subtotals adding up
        to the amount debited.
      </p>
    </section>
  );
}
