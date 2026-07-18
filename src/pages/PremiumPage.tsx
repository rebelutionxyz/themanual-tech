import { useAuth } from '@/lib/auth';
import { MEMBERSHIP_TIERS, type MyMembership, getMyMembership } from '@/lib/premium';
import { cn } from '@/lib/utils';
import { Check, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

const GOLD = '#FAD15E'; // fills (dark ink on top)
const GOLD_TEXT = '#B45309'; // text/borders on white

/**
 * PREMIUM — the membership ladder (/premium).
 * Canon §6 UNLOCKED (Butch 2026-07-18): the ad-relief framing predates the
 * FreedomBlings v9 renovation and no longer applies as written. Premium is
 * being re-based on storage + services (addon allowances at tiers); the
 * explainer copy is gone — the levels explain themselves. Ladder pricing
 * stands as placeholder until the rework lands.
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

      {!bee && (
        <p
          className="mt-8 text-center font-mono text-[11.5px] text-zinc-500"
          data-size="meta"
        >
          Sign in to see your tier.
        </p>
      )}
    </div>
  );
}
