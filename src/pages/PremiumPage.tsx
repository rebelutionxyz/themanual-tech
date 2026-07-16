import { useAuth } from '@/lib/auth';
import { MEMBERSHIP_TIERS, type MyMembership, getMyMembership } from '@/lib/premium';
import { cn } from '@/lib/utils';
import { Check, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

const GOLD = '#FAD15E'; // fills (dark ink on top)
const GOLD_TEXT = '#B45309'; // text/borders on white

/**
 * PREMIUM — the ad-relief membership ladder (/premium).
 * Canon §6 [LOCKED]: $0 full slots · $3 reduced · $8 ticker-only ·
 * $13 Royal Jelly = commercial-ad-free. Member promotions remain at all
 * tiers — relief targets commercial ads only. Monthly DONATION goes live
 * with Stripe activation; until then the ladder reads, the CTA waits.
 */
export function PremiumPage() {
  const { bee } = useAuth();
  const [membership, setMembership] = useState<MyMembership | null>(null);

  useEffect(() => {
    if (!bee?.id) {
      setMembership(null);
      return;
    }
    getMyMembership(bee.id)
      .then(setMembership)
      .catch(() => setMembership(null));
  }, [bee?.id]);

  const activeTier =
    membership && (membership.status === 'active' || membership.status === 'trialing')
      ? membership.tier
      : 'free';

  return (
    <div className="safe-pad-x mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-8 text-center">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
          style={{ borderColor: `${GOLD_TEXT}40`, color: GOLD_TEXT }}
          data-size="meta"
        >
          <Crown size={13} /> Premium
        </div>
        <h1 className="mb-2 font-display text-3xl font-semibold text-zinc-900">
          Less noise. Same honey.
        </h1>
        <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-zinc-500">
          A monthly DONATION dials commercial advertising down — all the way to zero. Every user
          funds the house one way: by seeing ads, or by direct support. Member promotions stay at
          every tier; relief targets <em>commercial</em> ads only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MEMBERSHIP_TIERS.map((tier) => {
          const isCurrent = activeTier === tier.key || (tier.key === 'free' && activeTier === 'free');
          const isTop = tier.key === 'royal_jelly';
          return (
            <div
              key={tier.key}
              className={cn(
                'relative flex flex-col rounded-xl border p-5',
                isTop ? 'shadow-lg' : 'border-zinc-200 bg-white',
              )}
              style={
                isTop
                  ? { borderColor: `${GOLD}70`, background: `${GOLD}0C` }
                  : undefined
              }
            >
              {isTop && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-widest"
                  style={{ background: GOLD, color: '#18181b' }}
                  data-size="meta"
                >
                  The full comb
                </span>
              )}
              <p
                className="font-display text-[17px] font-semibold"
                style={{ color: isTop ? GOLD_TEXT : undefined }}
              >
                <span className={isTop ? '' : 'text-zinc-900'}>{tier.name}</span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-zinc-600">{tier.line}</p>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-zinc-500">
                {tier.detail}
              </p>
              <p className="mt-4 font-display text-2xl font-semibold text-zinc-900">
                ${tier.usd}
                <span className="ml-1 font-sans text-[12px] font-normal text-zinc-500">
                  / month
                </span>
              </p>
              {isCurrent ? (
                <span
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] font-semibold"
                  style={{ borderColor: `${GOLD_TEXT}50`, color: GOLD_TEXT }}
                >
                  <Check size={14} /> Your tier
                </span>
              ) : tier.usd === 0 ? (
                <span className="mt-3 inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-2 text-[12.5px] text-zinc-500">
                  Always available
                </span>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Monthly DONATIONS open with fiat rail activation"
                  className="mt-3 cursor-not-allowed rounded-md px-3 py-2 text-[12.5px] font-semibold opacity-60"
                  style={{ background: isTop ? GOLD : '#E4E4E7', color: isTop ? '#18181b' : '#71717A' }}
                >
                  DONATE monthly — opening soon
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 text-center">
        <p className="font-mono text-[11.5px] leading-relaxed text-zinc-500" data-size="meta">
          89% of platform revenue flows back to Bees; 11% to R&D. Ad-relief simply moves you
          between funding buckets — no freeloader gap, no pressure to over-saturate.
          {!bee && ' Sign in to see your tier.'}
        </p>
      </div>
    </div>
  );
}
