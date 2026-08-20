import { useAuth } from '@/lib/auth';
import { MEMBERSHIP_TIERS, type MyMembership, getMyMembership } from '@/lib/premium';
import { cn } from '@/lib/utils';
import { Check, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { Card, MetaLabel, SectionHead, fmtDate } from '../ui';

/** MEMBERSHIPS — current tier + the ladder. Manage/change lives on /premium. */
export function MembershipsTab() {
  const { bee } = useAuth();
  const [mine, setMine] = useState<MyMembership | null | 'loading'>('loading');

  useEffect(() => {
    if (!bee) return;
    let alive = true;
    getMyMembership(bee.id)
      .then((m) => alive && setMine(m))
      .catch(() => alive && setMine(null));
    return () => {
      alive = false;
    };
  }, [bee]);

  // Current tier key: an active membership row, else the free floor.
  const currentKey =
    mine === 'loading' ? null : mine && mine.status === 'active' ? mine.tier : 'free';

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white to-amber-50">
        <div className="flex items-center gap-2" style={{ color: ACCOUNT_ACCENT }}>
          <Crown size={16} />
          <MetaLabel>Your membership</MetaLabel>
        </div>
        {mine === 'loading' ? (
          <p className="mt-2 text-zinc-400">Loading…</p>
        ) : (
          <>
            <p className="mt-2 font-display text-2xl font-semibold text-zinc-900">
              {tierName(currentKey)}
            </p>
            <p className="mt-1 text-zinc-500" style={{ fontSize: '12.5px' }}>
              {mine && mine.status === 'active'
                ? mine.currentPeriodEnd
                  ? `Renews ${fmtDate(mine.currentPeriodEnd)}`
                  : 'Active'
                : 'You are on the Free floor — every commercial slot funds the house.'}
            </p>
          </>
        )}
      </Card>

      <div>
        <SectionHead
          title="The ladder"
          hint="Ad relief rises as you climb."
          right={
            <Link
              to="/premium"
              className="rounded-md px-3 py-1.5 font-mono text-zinc-900 transition-colors"
              style={{ fontSize: '12.5px', background: '#FCD34D' }}
            >
              Manage
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {MEMBERSHIP_TIERS.map((t) => {
            const active = t.key === currentKey;
            return (
              <div
                key={t.key}
                className={cn(
                  'rounded-lg border p-4',
                  active ? 'bg-amber-50' : 'border-zinc-200 bg-white',
                )}
                style={active ? { borderColor: ACCOUNT_ACCENT } : undefined}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-zinc-900">{t.name}</p>
                  {active && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono uppercase tracking-wider text-white"
                      style={{ fontSize: '9.5px', background: ACCOUNT_ACCENT }}
                      data-size="meta"
                    >
                      <Check size={10} /> Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono" style={{ fontSize: '13px', color: ACCOUNT_ACCENT }}>
                  {t.usd === 0 ? 'Free' : `$${t.usd} / month`}
                </p>
                <p className="mt-2 font-medium text-zinc-700" style={{ fontSize: '12.5px' }}>
                  {t.line}
                </p>
                <p className="mt-1 text-zinc-500" style={{ fontSize: '11.5px' }}>
                  {t.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function tierName(key: string | null): string {
  if (!key) return '—';
  return MEMBERSHIP_TIERS.find((t) => t.key === key)?.name ?? key;
}
