import {
  DIRECTIVE_CATEGORIES,
  type DirectiveCategory,
  type Tier,
  isMocked,
} from '@/lib/atlasoracle/client';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useOracleDirective } from '@/lib/atlasoracle/useOracleDirective';
import { useOracleTokens } from '@/lib/atlasoracle/useOracleTokens';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

// AtlasOracle wallet badge.
//
// Mounts in every Astra spine via UtilityChrome. Three visual states drive
// presentation:
//   idle           — ambient, awaits a tap
//   working        — directive is in-flight to the router
//   response-ready — fresh routed response is available
//
// On tap the badge opens a directive surface. On desktop the surface is a
// centered modal; on mobile (< sm) the same surface fills the viewport as
// a slide-up sheet.
//
// Economics (Butch ruling 2026-07-27): denominated in Oracle Tokens. No BLiNG!
// figure and no escrow control appears on this surface.
//
// Language firewall: copy uses GET / GIVE / SEND / EARN / FREE vocabulary only.
// The banned-vocabulary list lives in CLAUDE.md; every string here was swept
// against it.

export interface SurfacedAction {
  label: string;
  directive: string;
  category?: DirectiveCategory;
}

export interface AtlasOracleWalletBadgeProps {
  astraSlug: string;
  surfacedActions?: SurfacedAction[];
  novaSlug?: string;
  defaultTier?: Tier;
  className?: string;
}

const DEFAULT_TIER: Tier = 'free';
const DEFAULT_CATEGORY: DirectiveCategory = 'suggest';

export function AtlasOracleWalletBadge({
  astraSlug,
  surfacedActions = [],
  novaSlug,
  defaultTier = DEFAULT_TIER,
  className,
}: AtlasOracleWalletBadgeProps) {
  const { bee } = useAuth();
  const [open, setOpen] = useState(false);
  const [directive, setDirective] = useState('');
  const [tier, setTier] = useState<Tier>(defaultTier);
  const [category, setCategory] = useState<DirectiveCategory>(DEFAULT_CATEGORY);
  const [tokenNotice, setTokenNotice] = useState(false);

  const { state, response, preview, failure, send, confirm, cancelConfirm, reset } =
    useOracleDirective();

  const { balance: tokens, split, rates, applyBalanceAfter } = useOracleTokens(bee?.id ?? null);

  // The router returns the post-debit balance with the response, so the badge
  // updates from the ledger's own figure the moment a directive lands rather
  // than refetching and briefly showing a stale number.
  useEffect(() => {
    if (state === 'response-ready' && response) {
      applyBalanceAfter(response.balanceAfterTokens);
    }
  }, [state, response, applyBalanceAfter]);

  const badgeState =
    state === 'working' ? 'working' : state === 'response-ready' ? 'response-ready' : 'idle';

  const canSubmit = useMemo(
    () => directive.trim().length > 0 && state !== 'working',
    [directive, state],
  );

  const submit = useCallback(
    (text: string, cat: DirectiveCategory) => {
      void send(text, { tier, category: cat, astraSlug });
    },
    [send, tier, astraSlug],
  );

  const close = useCallback(() => {
    setOpen(false);
    setTokenNotice(false);
    if (state === 'response-ready') {
      reset();
      setDirective('');
    }
  }, [state, reset]);

  // ESC dismisses the surface.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!bee) return null;

  const tierRate = rates.find((r) => r.tier === tier);
  const balanceLabel = tokens.balance === null ? '—' : formatTokens(tokens.balance);
  const badgeTitle =
    tokens.status === 'live'
      ? `here24 · ${balanceLabel} Oracle Tokens`
      : `here24 · ${tokens.reason}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={badgeTitle}
        aria-label="Open here24"
        className={cn(
          'flex items-center gap-2 rounded-full border bg-bg-elevated px-2.5 py-1 transition-colors',
          badgeState === 'idle' && 'border-honey/40 hover:border-honey/70',
          badgeState === 'working' && 'border-honey/70 animate-pulse',
          badgeState === 'response-ready' && 'border-kettle-sourced/70',
          className,
        )}
      >
        <span
          className="font-mono font-semibold tracking-tight text-honey"
          style={{ fontSize: '12px' }}
        >
          A⊕O
        </span>
        {/* Live Oracle Token balance (FRONT17). An em dash still means "could
            not read", never "zero" — a Bee with an empty wallet sees 0. */}
        <span className="font-mono tracking-wide text-text-silver" style={{ fontSize: '11.5px' }}>
          {balanceLabel}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={close}
            aria-label="Close here24"
            className="fixed inset-0 z-40 cursor-default bg-black/60"
          />
          <dialog
            open
            aria-label="here24 directive"
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 m-0 flex w-full flex-col gap-4 border border-border-bright bg-bg-elevated p-5 text-text',
              'rounded-t-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-honey">A⊕O</span>
                <span className="text-text-silver" style={{ fontSize: '12.5px' }}>
                  here24 · {astraSlug}
                  {novaSlug ? ` / ${novaSlug}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-md p-1 text-text-silver transition-colors hover:bg-panel-2 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            {isMocked() && (
              <div
                className="rounded-md border border-honey/50 bg-honey/10 px-3 py-2 text-honey"
                style={{ fontSize: '11.5px' }}
              >
                MOCK MODE — no provider is called and nothing is spent.
              </div>
            )}

            {/* Oracle Tokens strip: balance + the GET control (stubbed). */}
            <div
              className="flex flex-wrap items-center gap-3 rounded-md border border-border-bright bg-panel-2 px-3 py-2"
              style={{ fontSize: '11.5px' }}
            >
              <span className="text-text-silver">
                Oracle Tokens · <span className="font-mono text-text">{balanceLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setTokenNotice((v) => !v)}
                aria-expanded={tokenNotice}
                className="rounded-md border border-border-bright px-2 py-0.5 text-text-silver transition-colors hover:border-honey/70 hover:text-text"
              >
                GET Oracle Tokens
              </button>
              <Link
                to="/oracle"
                onClick={close}
                className="ml-auto text-text-silver underline decoration-dotted underline-offset-2 transition-colors hover:text-honey"
              >
                console
              </Link>
            </div>

            {/* PLAN vs PURCHASED — FRONT75. Shown only when the split is
                readable AND there is something in at least one bucket: a user
                holding nothing learns nothing from "plan 0 · purchased 0", and
                the total above already said it.

                "Plan is spent first" is not a design intention stated here — it
                is what `oracle_debit_tokens` actually does: it walks live plan
                grants FIFO by soonest expiry, then falls through to the durable
                pool, and records the split it took in `oracle_token_consumption`.
                The line is safe to print because the server enforces it. */}
            {split && (split.plan > 0 || split.purchased > 0) && (
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-bright bg-bg px-3 py-2 text-text-silver"
                style={{ fontSize: '11.5px' }}
                data-token-split=""
              >
                <span>
                  plan · <span className="font-mono text-text">{formatTokens(split.plan)}</span>
                </span>
                {/* LABELLED "held", NOT "purchased". Two reasons, both real:
                    `purchase` is banned platform vocabulary (CLAUDE.md language
                    firewall) and this component already uses the approved verb
                    everywhere else — "GET Oracle Tokens". And "held" names the
                    property that actually matters to a reader: this bucket does
                    not expire. The data field stays `purchased` because that is
                    what the ledger calls it. */}
                <span>
                  held · <span className="font-mono text-text">{formatTokens(split.purchased)}</span>
                </span>
                {split.plan > 0 && (
                  <span className="text-text-muted">
                    plan tokens are spent first, and they expire
                  </span>
                )}
              </div>
            )}

            {tokenNotice && (
              <div
                className="rounded-md border border-border-bright bg-bg p-3 text-text-silver"
                style={{ fontSize: '12px' }}
              >
                Your balance is live, but there is no way to GET more yet — how Oracle Tokens are
                offered has not been ruled on, so this control has nothing to hand you. The free
                tier routes today at no token cost.
              </div>
            )}

            {surfacedActions.length > 0 && state === 'idle' && (
              <div className="flex flex-wrap gap-2">
                {surfacedActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => submit(a.directive, a.category ?? DEFAULT_CATEGORY)}
                    className={cn(
                      'rounded-full border border-border-bright bg-panel-2 px-3 py-1 text-text-silver transition-colors',
                      'hover:border-honey/70 hover:text-text',
                    )}
                    style={{ fontSize: '12.5px' }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {(state === 'idle' || state === 'working') && (
              <>
                <textarea
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  placeholder="Type a directive…"
                  rows={4}
                  disabled={state === 'working'}
                  className="w-full rounded-md border border-border-bright bg-bg p-3 font-mono text-text placeholder:text-text-silver/60 focus:border-honey/70 focus:outline-none"
                  style={{ fontSize: '13px' }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="atlasoracle-tier"
                    className="text-text-silver"
                    style={{ fontSize: '12px' }}
                  >
                    Tier
                  </label>
                  <select
                    id="atlasoracle-tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as Tier)}
                    disabled={state === 'working'}
                    className="rounded-md border border-border-bright bg-panel-2 px-2 py-1 text-text"
                    style={{ fontSize: '12px' }}
                  >
                    <option value="free">free</option>
                    <option value="standard">standard</option>
                    <option value="frontier">frontier</option>
                  </select>

                  <label
                    htmlFor="atlasoracle-category"
                    className="text-text-silver"
                    style={{ fontSize: '12px' }}
                  >
                    Kind
                  </label>
                  <select
                    id="atlasoracle-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DirectiveCategory)}
                    disabled={state === 'working'}
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
                    disabled={!canSubmit}
                    onClick={() => submit(directive, category)}
                    className={cn(
                      'ml-auto rounded-md border border-honey/60 bg-honey/10 px-3 py-1 font-semibold text-honey transition-colors',
                      'hover:border-honey/90 hover:bg-honey/20',
                      !canSubmit && 'cursor-not-allowed opacity-40',
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

            {/* Confirm-cost gate. The router returns a preview instead of routing
                when its estimate clears the confirm threshold; nothing is spent
                until the Bee accepts. */}
            {state === 'awaiting-confirm' && preview && (
              <div className="flex flex-col gap-3 rounded-md border border-honey/60 bg-honey/10 p-3">
                <p className="text-text" style={{ fontSize: '12.5px' }}>
                  This directive is estimated at{' '}
                  <span className="font-mono font-semibold">
                    {formatTokens(preview.estimatedCostTokens)}
                  </span>{' '}
                  Oracle Tokens on {preview.provider}. Confirm to route it.
                </p>
                {tokens.balance !== null && (
                  <p className="text-text-silver" style={{ fontSize: '11px' }}>
                    balance {formatTokens(tokens.balance)} → about{' '}
                    {formatTokens(Math.max(0, tokens.balance - preview.estimatedCostTokens))} after
                  </p>
                )}
                <p className="text-text-silver" style={{ fontSize: '11px' }}>
                  est. {preview.estimatedInputTokens.toLocaleString()} in ·{' '}
                  {preview.estimatedOutputTokens.toLocaleString()} out
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
                      onClick={() => {
                        setOpen(true);
                        setTokenNotice(true);
                      }}
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
                  className="rounded-md border border-border-bright bg-bg p-3 font-mono text-text"
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
                    {response.tokens.cached > 0 &&
                      ` / ${response.tokens.cached.toLocaleString()} cached`}
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
          </dialog>
        </>
      )}
    </>
  );
}
