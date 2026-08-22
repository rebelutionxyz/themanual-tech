import { COMPOSER_MEASURE, Composer, type ComposerBand } from '@/components/composer/Composer';
import { H24CostPanel } from '@/components/h24/H24CostPanel';
import { type ShellNavGroup, UniversalShell } from '@/components/shell/UniversalShell';
import { type DirectiveCategory, type Tier, isMocked } from '@/lib/atlasoracle/client';
import { formatTokensExact } from '@/lib/atlasoracle/reconcile';
import type { ModelRateRow } from '@/lib/atlasoracle/reconcile';
import { type RoutingLogEntry, fetchRoutingLog } from '@/lib/atlasoracle/routingLog';
import { ORACLE_TOKENS_REFRESH_EVENT, formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleDirective } from '@/lib/atlasoracle/useOracleDirective';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { uploadToLibrary } from '@/lib/media';
import { H24_TOKENS } from '@/lib/shell/astraTokens';
import { cn } from '@/lib/utils';
import { useH24Storefront } from '@/stores/useH24Storefront';
import {
  Activity,
  CalendarClock,
  Download,
  FolderKanban,
  Image as ImageIcon,
  Images,
  Radio,
  SlidersHorizontal,
  SquarePen,
  Wallet,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * THE h24 SURFACE — now wearing the PERFECTED UNIVERSAL SHELL (SHELL v1.5,
 * ops_docs SHELL, owner+lead 2026-08-22). SHELL_PORT1 ports the shell here as
 * the REFERENCE implementation the other astras copy-port.
 *
 * The real machinery is unchanged — directive send/confirm, the live routing
 * log, the cost breakdown (now the CONTENT WINDOW split beside the log), the
 * post-purchase return, the token balance, the CSV export. What changed is the
 * CHROME (UniversalShell) and the COMPOSER SEMANTICS.
 *
 * COMPOSER SEMANTICS (SHELL_PORT1 scope = "shell now, Auto routing → AUTOTIER1",
 * owner-ruled this pass):
 *   - BAND = Auto | free ONLY. `free` is the real no-cost tier. `Auto` maps to
 *     the current best REAL tier (frontier) as a PLACEHOLDER — the "router picks
 *     best" intelligence + company-model mapping lands in AUTOTIER1. So Auto
 *     does a real thing today (routes to the frontier model), just not the smart
 *     one yet. Nothing fake ships.
 *   - MODEL menu (Auto band only): Auto + COMPANY-NAME models. Display-only this
 *     pass; not wired to routing until AUTOTIER1. NO version strings, NO effort
 *     dial (the composer never had one — see Composer.tsx).
 *   - The routing-log "Tier" column is renamed to "Band".
 */

type Band = 'auto' | 'free';
/** Auto → the best real tier (frontier) until AUTOTIER1 wires real routing. */
const bandToTier = (b: Band): Tier => (b === 'free' ? 'free' : 'frontier');

/** Company-name Model menu (Auto band only). NO version strings — SHELL v1.5. */
const MODEL_OPTIONS = ['Auto', 'Claude', 'GPT', 'Grok', 'Llama', 'Mistral', 'DeepSeek'].map(
  (m) => ({ id: m, label: m }),
);

export function OraclePage() {
  const { bee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const openStore = useH24Storefront((s) => s.openStore);

  // POST-PURCHASE RETURN (FRONT81) — unchanged. h24-checkout returns to
  // /h24?tokens=1; the webhook credits asynchronously, so re-read a few times,
  // show an honest banner, strip the flag.
  const [topUpReturn, setTopUpReturn] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once return handler.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tokens') !== '1') return;
    setTopUpReturn(true);
    const fire = () => window.dispatchEvent(new Event(ORACLE_TOKENS_REFRESH_EVENT));
    fire();
    const t1 = setTimeout(fire, 2000);
    const t2 = setTimeout(fire, 5000);
    const t3 = setTimeout(() => setTopUpReturn(false), 12000);
    navigate('/h24', { replace: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const [directive, setDirective] = useState('');
  const [band, setBand] = useState<Band>('free');
  const [model, setModel] = useState('Auto');
  // KIND (category) is a real router param but is NOT on the ruled composer row
  // (SHELL v1.5: [+][add-to-vault][Band][Model][mic][send]). It stays at its
  // default and is still sent to the router; surfacing it returns in a later
  // composer pass. Recorded in REPORT.md.
  const [category] = useState<DirectiveCategory>('suggest');
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(false);
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

  // BAND picker — Auto | free. The model each band routes to is read from the
  // live rate card, so the sublabel is honest about what actually runs.
  const bands: ComposerBand[] = useMemo(() => {
    const modelFor = (t: Tier) => tierRates.find((r) => r.tier === t)?.model;
    return [
      { id: 'auto', label: 'Auto', sublabel: modelFor('frontier') ?? 'h24 picks best' },
      { id: 'free', label: 'free', sublabel: modelFor('free') ?? 'save your tokens' },
    ];
  }, [tierRates]);

  const tier = bandToTier(band);
  const currentRate = tierRates.find((r) => r.tier === tier);
  const selectedEntry = selectedCostId
    ? (log.entries.find((e) => e.id === selectedCostId) ?? null)
    : null;

  function submitDirective() {
    if (!bee || directive.trim().length === 0 || state === 'working') return;
    setHasSent(true);
    void send(directive, { tier, category, astraSlug: 'themanual' });
  }

  async function handleAttach(file: File) {
    if (!bee) return;
    setAttachStatus(`Uploading ${file.name}…`);
    try {
      const asset = await uploadToLibrary(bee.id, file, null);
      setAttachStatus(`Added ${asset.fileName} to your vault.`);
    } catch (e) {
      setAttachStatus(e instanceof Error ? e.message : 'Upload failed.');
    }
  }

  function exportCsv() {
    const header = [
      'when',
      'band',
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
      e.tier === 'free' ? 'free' : 'Auto',
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

  // SIDEBAR NAV (SHELL v1.5: pure nav). Top group = Claude-home shape; astra
  // group = h24's Vault/Activity/Wallet. Items with a live destination navigate;
  // the backendless top-group items are shown as structure with a "soon" hint
  // and no action, per the real-data-only discipline (never a fake control).
  const vaultCount = useMemo(() => log.entries.length, [log.entries.length]);
  const nav: ShellNavGroup[] = [
    {
      id: 'top',
      items: [
        {
          id: 'new',
          label: 'New',
          icon: <SquarePen size={17} />,
          onClick: () => {
            reset();
            setDirective('');
            setHasSent(false);
          },
        },
        { id: 'projects', label: 'Projects', icon: <FolderKanban size={17} />, hint: 'soon' },
        {
          id: 'artifacts',
          label: 'Artifacts',
          icon: <Images size={17} />,
          onClick: () => navigate('/studio'),
        },
        { id: 'scheduled', label: 'Scheduled', icon: <CalendarClock size={17} />, hint: 'soon' },
        {
          id: 'dispatch',
          label: 'Dispatch',
          icon: <Radio size={17} />,
          onClick: () => navigate('/mc'),
        },
        {
          id: 'customize',
          label: 'Customize',
          icon: <SlidersHorizontal size={17} />,
          onClick: () => navigate('/account'),
        },
      ],
    },
    {
      id: 'h24',
      label: 'h24',
      items: [
        {
          id: 'vault',
          label: 'Vault',
          icon: <ImageIcon size={17} />,
          onClick: () => navigate('/studio'),
          hint: bee ? vaultCount : undefined,
        },
        { id: 'activity', label: 'Activity', icon: <Activity size={17} />, active: true },
        {
          id: 'wallet',
          label: 'Wallet',
          icon: <Wallet size={17} />,
          onClick: () => bee && openStore(),
          hint: tokens.balance === null ? undefined : formatTokens(tokens.balance),
        },
      ],
    },
  ];

  // HOME vs DOCKED — home is the centered greeting + composer biased above
  // center; the composer docks to the bottom once the first directive is sent
  // (or the log already has history).
  const docked = Boolean(bee) && (hasSent || log.entries.length > 0 || Boolean(response));

  const composerEl = (
    <>
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
        bandId={band}
        onBandChange={(id) => setBand(id as Band)}
        // MODEL menu shows only in the Auto band (SHELL v1.5). Display-only until
        // AUTOTIER1 — selecting a company name does not re-route yet.
        options={band === 'auto' ? MODEL_OPTIONS : []}
        optionId={model}
        onOptionChange={setModel}
        optionLabel="Model"
        enableMic
      />
    </>
  );

  return (
    <UniversalShell
      tokens={H24_TOKENS}
      breadcrumb={
        <span>
          h24 <span style={{ color: 'var(--mute)' }}>/ Console</span>
        </span>
      }
      nav={nav}
      bling={tokens.balance}
      handle={bee?.handle ?? null}
      onBack={() => navigate(-1)}
      onForward={() => navigate(1)}
      onSearch={() => navigate('/manual')}
      onAvatar={() => navigate('/profile')}
      onSelectAstra={(k) => {
        if (k === 'h24') navigate('/h24');
        else navigate(`/${k}`);
      }}
      renderPanel={(slot) => {
        if (slot === 'bling') {
          return (
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-mono" style={{ color: 'var(--bling-gold)', fontSize: 22 }}>
                  {tokens.balance === null ? '—' : formatTokens(tokens.balance)}
                </div>
                <div style={{ color: 'var(--mute)', fontSize: 11 }}>
                  {tokens.status === 'live' ? 'h24 tokens' : tokens.reason}
                </div>
              </div>
              {bee && (
                <button
                  type="button"
                  onClick={openStore}
                  className="rounded-md px-3 py-1.5 font-semibold transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--buy-green) 16%, transparent)',
                    color: 'var(--buy-green)',
                    fontSize: 12.5,
                  }}
                >
                  Get h24 tokens
                </button>
              )}
            </div>
          );
        }
        if (slot === 'handle') {
          return (
            <div className="flex flex-col gap-2" style={{ fontSize: 12.5 }}>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/studio')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Creator Studio
              </button>
              <button
                type="button"
                onClick={() => navigate('/bookmarks')}
                className="text-left"
                style={{ color: 'var(--body)' }}
              >
                Bookmarks
              </button>
            </div>
          );
        }
        // tasks / security / alerts / notifications — real destinations where
        // they exist; otherwise the shell's honest "backend not live" note.
        if (slot === 'security') {
          return (
            <button
              type="button"
              onClick={() => navigate('/security')}
              style={{ color: 'var(--body)', fontSize: 12.5 }}
            >
              Open the security center →
            </button>
          );
        }
        if (slot === 'notifications') {
          return (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              style={{ color: 'var(--body)', fontSize: 12.5 }}
            >
              Open notifications →
            </button>
          );
        }
        return null; // tasks, alerts — no backend yet; shell shows the honest note
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {topUpReturn && (
          <div
            className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
            style={{
              borderBottom: '1px solid color-mix(in srgb, var(--bling-gold) 40%, transparent)',
              background: 'color-mix(in srgb, var(--bling-gold) 10%, transparent)',
              color: 'var(--bling-gold)',
              fontSize: 12.5,
            }}
            // biome-ignore lint/a11y/useSemanticElements: a polite status banner is a live region.
            role="status"
          >
            <span>
              Top-up received — your h24 token balance updates here as the payment clears.
            </span>
            <button
              type="button"
              onClick={() => setTopUpReturn(false)}
              aria-label="Dismiss"
              className="ml-auto rounded p-0.5"
              style={{ color: 'var(--bling-gold)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* SIGNED OUT — membership pitch, no composer/balance/handle (SHELL v1.5). */}
        {!bee ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6">
            <div
              className="flex max-w-md flex-col items-center gap-4 text-center"
              style={{ marginTop: '-16vh' }}
            >
              <h1
                className="astra-display"
                style={{ color: 'var(--ink)', fontSize: 40, lineHeight: 1.05 }}
              >
                h24
              </h1>
              <p style={{ color: 'var(--body)', fontSize: 14 }}>
                One directive box, every model, routed against this platform's canon. Membership
                unlocks it.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/premium')}
                  className="rounded-md px-4 py-2 font-semibold transition-colors"
                  style={{ background: 'var(--accent)', color: '#000', fontSize: 13 }}
                >
                  GET membership
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="rounded-md px-4 py-2 transition-colors"
                  style={{ border: '1px solid var(--line)', color: 'var(--body)', fontSize: 13 }}
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        ) : !docked ? (
          // HOME — centered greeting + one-line promise + composer, biased ~16vh
          // above center. First send flips `docked`.
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 md:px-8">
            <div
              className={cn(COMPOSER_MEASURE, 'flex flex-col items-stretch gap-5')}
              style={{ marginTop: '-16vh' }}
            >
              <div className="text-center">
                <h1
                  className="astra-display"
                  style={{ color: 'var(--ink)', fontSize: 36, lineHeight: 1.05 }}
                >
                  h24
                </h1>
                <p className="mt-2" style={{ color: 'var(--body)', fontSize: 13.5 }}>
                  Send a directive. h24 routes it to a model against this platform's canon and hands
                  the answer back — the directive and the response are never stored.
                </p>
              </div>
              {isMocked() && <MockNote />}
              {failure && <FailureNote failure={failure} />}
              {attachStatus && (
                <p className="text-center" style={{ color: 'var(--mute)', fontSize: 11.5 }}>
                  {attachStatus}
                </p>
              )}
              {composerEl}
            </div>
          </div>
        ) : (
          // DOCKED — conversation scrolls above, composer pinned at the bottom.
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 md:px-8">
                <div className={cn(COMPOSER_MEASURE, 'flex flex-1 flex-col gap-6')}>
                  {isMocked() && <MockNote />}

                  {state === 'awaiting-confirm' && preview && (
                    <div
                      className="flex flex-col gap-3 rounded-md p-4"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)',
                        background: 'var(--accent-bg)',
                      }}
                    >
                      <p style={{ color: 'var(--ink)', fontSize: 13 }}>
                        This directive is estimated at{' '}
                        <span className="font-mono font-semibold">
                          {formatTokens(preview.estimatedCostTokens)}
                        </span>{' '}
                        h24 tokens on {preview.provider}. Nothing has been spent yet — confirm to
                        route it.
                      </p>
                      <p style={{ color: 'var(--body)', fontSize: 11.5 }}>
                        est. {preview.estimatedInputTokens.toLocaleString()} in ·{' '}
                        {preview.estimatedOutputTokens.toLocaleString()} out
                        {tokens.balance !== null && (
                          <>
                            {' · '}balance {formatTokens(tokens.balance)} → about{' '}
                            {formatTokens(
                              Math.max(0, tokens.balance - preview.estimatedCostTokens),
                            )}{' '}
                            after
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void confirm()}
                          className="rounded-md px-3 py-1 font-semibold transition-colors"
                          style={{ background: 'var(--accent)', color: '#000', fontSize: 12.5 }}
                        >
                          CONFIRM
                        </button>
                        <button
                          type="button"
                          onClick={cancelConfirm}
                          className="rounded-md px-3 py-1 transition-colors"
                          style={{
                            border: '1px solid var(--line)',
                            color: 'var(--body)',
                            fontSize: 12.5,
                          }}
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {failure && <FailureNote failure={failure} />}

                  {state === 'response-ready' && response && (
                    <div className="flex flex-col gap-2">
                      <div
                        className="rounded-md p-4 font-mono"
                        style={{
                          border: '1px solid var(--line)',
                          background: 'var(--raised)',
                          color: 'var(--ink)',
                          fontSize: 13,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {response.response}
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-3"
                        style={{ color: 'var(--body)', fontSize: 11.5 }}
                      >
                        <span>provider · {response.provider}</span>
                        <span>
                          tokens · {response.tokens.input.toLocaleString()} in /{' '}
                          {response.tokens.output.toLocaleString()} out /{' '}
                          {response.tokens.cached.toLocaleString()} cached
                        </span>
                        <span
                          style={{
                            color: response.costTokens > 0 ? 'var(--bling-gold)' : undefined,
                          }}
                        >
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
                          className="ml-auto rounded-md px-2 py-0.5 transition-colors"
                          style={{ border: '1px solid var(--line)', color: 'var(--body)' }}
                        >
                          new directive
                        </button>
                      </div>
                    </div>
                  )}

                  <RoutingLog
                    log={log}
                    signedIn={Boolean(bee)}
                    selectedCostId={selectedCostId}
                    onSelectCost={setSelectedCostId}
                    onRefresh={() => void loadLog()}
                    onExport={exportCsv}
                  />
                </div>
              </div>

              {/* COMPOSER DOCK */}
              <div
                className="flex-shrink-0 px-5 py-3 md:px-8"
                style={{ borderTop: '1px solid var(--hairline)' }}
              >
                <div className={COMPOSER_MEASURE}>
                  {attachStatus && (
                    <p className="mb-2" style={{ color: 'var(--mute)', fontSize: 11.5 }}>
                      {attachStatus}
                    </p>
                  )}
                  {currentRate && band === 'auto' && (
                    <p className="mb-2" style={{ color: 'var(--mute)', fontSize: 11 }}>
                      {currentRate.model} · {formatTokens(currentRate.inputPerM)} in /{' '}
                      {formatTokens(currentRate.outputPerM)} out per 1M tokens
                    </p>
                  )}
                </div>
                {composerEl}
              </div>
            </section>

            {/* CONTENT WINDOW — the cost breakdown, split beside the log. */}
            {selectedEntry && (
              <H24CostPanel
                entry={selectedEntry}
                rates={log.rates}
                onClose={() => setSelectedCostId(null)}
              />
            )}
          </div>
        )}
      </div>
    </UniversalShell>
  );
}

function MockNote() {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{
        border: '1px solid color-mix(in srgb, var(--bling-gold) 50%, transparent)',
        background: 'color-mix(in srgb, var(--bling-gold) 10%, transparent)',
        color: 'var(--bling-gold)',
        fontSize: 12,
      }}
    >
      MOCK MODE — no provider is called and nothing is spent. Directives beginning{' '}
      <code>!preview</code>, <code>!fund</code>, <code>!cap</code> or <code>!fail</code> exercise
      the other response shapes.
    </div>
  );
}

function FailureNote({
  failure,
}: {
  failure: NonNullable<ReturnType<typeof useOracleDirective>['failure']>;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md p-3"
      style={{
        border: '1px solid color-mix(in srgb, var(--error) 60%, transparent)',
        background: 'color-mix(in srgb, var(--error) 10%, transparent)',
        color: 'var(--ink)',
        fontSize: 12.5,
      }}
      role="alert"
    >
      <span>{failure.message}</span>
      {failure.action === 'get-tokens' &&
        failure.requiredTokens !== undefined &&
        failure.availableTokens !== undefined && (
          <span style={{ color: 'var(--body)', fontSize: 11.5 }}>
            needs {formatTokens(failure.requiredTokens)} · you hold{' '}
            {formatTokens(failure.availableTokens)} · short by{' '}
            {formatTokens(Math.max(0, failure.requiredTokens - failure.availableTokens))}
          </span>
        )}
      {failure.action === 'retry-later' && failure.retryAfterSeconds && (
        <span style={{ color: 'var(--body)', fontSize: 11.5 }}>
          Try again in about {failure.retryAfterSeconds}s.
        </span>
      )}
    </div>
  );
}

function RoutingLog({
  log,
  signedIn,
  selectedCostId,
  onSelectCost,
  onRefresh,
  onExport,
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
  onExport: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="astra-display font-semibold" style={{ color: 'var(--ink)', fontSize: 14 }}>
          Your routing log
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

      {log.loaded && !log.error && log.entries.length > 0 && (
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
              {log.entries.map((e) => (
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
