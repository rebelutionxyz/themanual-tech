import {
  type CheckoutSku,
  type TokenPack,
  type TokenPlan,
  fetchPacks,
  fetchPlans,
  formatUsd,
  startCheckout,
} from '@/lib/atlasoracle/storefront';
import { formatTokens } from '@/lib/atlasoracle/tokens';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useH24Storefront } from '@/stores/useH24Storefront';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * THE h24 TOKEN STOREFRONT — FRONT81. Board P2.6: revenue was unreachable until
 * this existed; the checkout + webhook have waited since 2026-08-01.
 *
 * On-demand modal, opened from the wallet badge and the h24 sidebar via
 * `useH24Storefront`. Mounted ONCE (UtilityChrome) so a single modal serves
 * every GET control. Transport to Stripe Checkout — it names a pack or plan, the
 * edge function prices it server-side, we redirect to the returned Stripe URL.
 *
 * LANGUAGE FIREWALL (CLAUDE.md): copy uses GET / held / never "buy" or
 * "purchase". Users are addressed as "you", not "Bees" (dispatch: "users not
 * Bees"). USD amounts are shown because h24 tokens are a real paid product — the
 * banned words are the vocabulary, not the concept of paying for tokens.
 *
 * THE LEDGER TRUTH, SAID ON THE SURFACE (dispatch item 1): plan tokens reset each
 * cycle and are spent first; held tokens from a top-up never expire and are spent
 * after. This is not a promise — it is what `h24_debit_tokens` does.
 */
export function H24Storefront() {
  const open = useH24Storefront((s) => s.open);
  const closeStore = useH24Storefront((s) => s.closeStore);
  const { bee } = useAuth();

  const [packs, setPacks] = useState<TokenPack[] | null>(null);
  const [plans, setPlans] = useState<TokenPlan[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The sku currently opening checkout (its code/tier), or null. Disables its
  // button and blocks a second concurrent checkout.
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A signed-out visitor may BROWSE the rate card (it is public), but GET needs a
  // session — the button flips this instead of round-tripping to a 401.
  const [needSignIn, setNeedSignIn] = useState(false);

  // Load the rate card each time the modal opens (cheap, and keeps a long-lived
  // tab honest if the card changes).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadFailed(false);
    setNotice(null);
    setNeedSignIn(false);
    void Promise.all([fetchPacks(), fetchPlans()]).then(([p, pl]) => {
      if (cancelled) return;
      setPacks(p);
      setPlans(pl);
      if (p.length === 0 && pl.length === 0) setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStore();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeStore]);

  const go = useCallback(
    async (sku: CheckoutSku, key: string) => {
      if (pending) return;
      if (!bee) {
        setNeedSignIn(true);
        return;
      }
      setPending(key);
      setNotice(null);
      // A fresh nonce per initiation: a genuine second GET is its own charge, a
      // double-click within this initiation collapses into one.
      const attempt =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
      const result = await startCheckout(sku, attempt);
      switch (result.kind) {
        case 'redirect':
          // Full navigation to Stripe Checkout. No state to preserve.
          window.location.href = result.url;
          return;
        case 'plan-exists': {
          const when = result.currentPeriodEnd
            ? ` It renews ${new Date(result.currentPeriodEnd).toLocaleDateString()}.`
            : '';
          setNotice(
            `You already hold an active ${result.currentTier ?? ''} plan.${when} Top up with a pack instead, or change your plan from your account.`,
          );
          break;
        }
        case 'signed-out':
          setNotice('Sign in to GET h24 tokens.');
          break;
        default:
          setNotice(result.message);
          break;
      }
      setPending(null);
    },
    [pending, bee],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 py-10 md:py-16"
      aria-modal="true"
      aria-label="GET h24 tokens"
      // biome-ignore lint/a11y/useSemanticElements: div+role=dialog for manual focus + backdrop handling, matching the platform's other overlays.
      role="dialog"
    >
      <button
        type="button"
        onClick={closeStore}
        aria-label="Close"
        className="fixed inset-0 z-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border-bright bg-bg-elevated text-text shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-semibold text-honey" style={{ fontSize: '13px' }}>
              h24
            </span>
            <span className="text-text-silver" style={{ fontSize: '13px' }}>
              GET tokens
            </span>
          </div>
          <button
            type="button"
            onClick={closeStore}
            aria-label="Close"
            className="rounded-md p-1 text-text-silver transition-colors hover:bg-panel-2 hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loadFailed ? (
            <p className="py-8 text-center text-text-silver" style={{ fontSize: '13px' }}>
              The rate card is unavailable right now. Please try again shortly.
            </p>
          ) : (
            <>
              {needSignIn && (
                <div
                  className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-honey/50 bg-honey/10 p-3 text-text"
                  style={{ fontSize: '12.5px' }}
                >
                  <span>Sign in to GET h24 tokens — you'll come right back here.</span>
                  <Link
                    to="/login"
                    onClick={closeStore}
                    className="ml-auto rounded-md border border-honey/60 bg-honey/20 px-3 py-1 font-semibold text-honey transition-colors hover:bg-honey/30"
                  >
                    Sign in
                  </Link>
                </div>
              )}
              {notice && (
                <div
                  className="mb-4 rounded-md border border-kettle-unsourced/60 bg-kettle-unsourced/10 p-3 text-text"
                  style={{ fontSize: '12.5px' }}
                  role="alert"
                >
                  {notice}
                </div>
              )}

              {/* PACKS — one-time top-up */}
              <SectionHeading title="Top up" sub="one-time · these tokens never expire" />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {packs === null ? (
                  <SkeletonCards n={4} />
                ) : (
                  packs.map((p) => (
                    <SkuCard
                      key={p.pack_code}
                      title={p.display_name}
                      tokens={p.tokens}
                      priceLabel={formatUsd(p.usd_cents)}
                      subLabel="one-time"
                      pending={pending === `pack:${p.pack_code}`}
                      disabled={pending !== null}
                      onGet={() => void go({ pack_code: p.pack_code }, `pack:${p.pack_code}`)}
                    />
                  ))
                )}
              </div>

              {/* PLANS — monthly */}
              <div className="mt-6">
                <SectionHeading
                  title="Monthly plan"
                  sub="renews each month · plan tokens reset each cycle"
                />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {plans === null ? (
                    <SkeletonCards n={3} />
                  ) : (
                    plans.map((p) => (
                      <SkuCard
                        key={p.plan_tier}
                        title={p.display_name}
                        tokens={p.tokens_per_cycle}
                        priceLabel={`${formatUsd(p.usd_cents)}/mo`}
                        subLabel="per month"
                        pending={pending === `plan:${p.plan_tier}`}
                        disabled={pending !== null}
                        onGet={() => void go({ plan_tier: p.plan_tier }, `plan:${p.plan_tier}`)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* THE LEDGER TRUTH — dispatch item 1, said where the GET buttons are. */}
              <p className="mt-6 text-text-muted" style={{ fontSize: '11.5px', lineHeight: 1.6 }}>
                Plan tokens reset each cycle and are spent first. Held tokens from a top-up never
                expire and are spent after. Payment is handled by Stripe; nothing is charged until
                you complete checkout there, and a token only appears once payment clears.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h3 className="font-display font-semibold text-text" style={{ fontSize: '14px' }}>
        {title}
      </h3>
      <span className="font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
        {sub}
      </span>
    </div>
  );
}

function SkuCard({
  title,
  tokens,
  priceLabel,
  subLabel,
  pending,
  disabled,
  onGet,
}: {
  title: string;
  tokens: number;
  priceLabel: string;
  subLabel: string;
  pending: boolean;
  disabled: boolean;
  onGet: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-bright bg-panel-2 p-3">
      <div>
        <div className="font-display font-semibold text-text" style={{ fontSize: '13.5px' }}>
          {title}
        </div>
        <div className="font-mono text-honey" style={{ fontSize: '15px' }}>
          {formatTokens(tokens)}
        </div>
        <div className="font-mono text-text-muted" style={{ fontSize: '10.5px' }} data-size="meta">
          h24 tokens
        </div>
      </div>
      <div className="mt-auto">
        <div className="mb-1.5 text-text-silver" style={{ fontSize: '12px' }}>
          {priceLabel}
          <span className="ml-1 text-text-muted" style={{ fontSize: '10.5px' }}>
            {subLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onGet}
          disabled={disabled}
          className={cn(
            'w-full rounded-md border border-honey/60 bg-honey/10 px-2 py-1 font-semibold text-honey transition-colors',
            'hover:border-honey/90 hover:bg-honey/20',
            disabled && 'cursor-not-allowed opacity-40',
          )}
          style={{ fontSize: '12px' }}
        >
          {pending ? 'Opening…' : 'GET'}
        </button>
      </div>
    </div>
  );
}

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4'];

function SkeletonCards({ n }: { n: number }) {
  return (
    <>
      {SKELETON_KEYS.slice(0, n).map((k) => (
        <div key={k} className="h-32 animate-pulse rounded-lg border border-border bg-panel-2/50" />
      ))}
    </>
  );
}
