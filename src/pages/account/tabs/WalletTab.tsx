import { useAuth } from '@/lib/auth';
import { TAG_LABEL, toMicros, useFreedomblingsBalance } from '@/lib/freedomblings/ledger';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_ACCENT } from '../accent';
import { Card, MetaLabel, SectionHead, StateLine } from '../ui';

export function WalletTab() {
  const { bee } = useAuth();
  const fb = useFreedomblingsBalance();
  const [h24, setH24] = useState<{ tokens: string; status: 'loading' | 'ready' | 'none' }>({
    tokens: '0',
    status: 'loading',
  });

  useEffect(() => {
    if (!supabase || !bee) {
      setH24({ tokens: '0', status: 'none' });
      return;
    }
    let alive = true;
    void (async () => {
      // Net token position = Σ amount_tokens across the member's own ledger
      // (::text guard — token amounts are numeric and can be large).
      const { data, error } = await supabase!
        .from('h24_token_ledger')
        .select('amount_tokens::text')
        .eq('bee_id', bee.id);
      if (!alive) return;
      if (error || !data) {
        setH24({ tokens: '0', status: 'none' });
        return;
      }
      let micros = 0n;
      for (const r of data as Record<string, unknown>[]) {
        micros += toMicros(String(r.amount_tokens ?? '0'));
      }
      const whole = micros / 1_000_000n;
      setH24({ tokens: whole.toString(), status: 'ready' });
    })();
    return () => {
      alive = false;
    };
  }, [bee]);

  if (!bee) return null;

  return (
    <div className="space-y-6">
      {/* Balance hero */}
      <Card className="bg-gradient-to-br from-white to-amber-50">
        <div className="flex items-center gap-2" style={{ color: ACCOUNT_ACCENT }}>
          <Wallet size={16} />
          <MetaLabel>Your BLiNG!</MetaLabel>
        </div>
        <p className="mt-2 font-display text-4xl font-semibold" style={{ color: ACCOUNT_ACCENT }}>
          {fb.status === 'loading' ? '—' : fb.balance}
        </p>
        <p className="mt-1 text-zinc-500" style={{ fontSize: '12px' }}>
          Your spendable balance across the comb, to the FNU.
        </p>
      </Card>

      {/* This season tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SeasonTile label="FREEd" value={fb.freed} />
        <SeasonTile label="GOT" value={fb.got} />
        <SeasonTile label="GAVE" value={fb.gave} />
      </div>

      {/* h24 tokens */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Sparkles size={14} />
              <MetaLabel>h24 Oracle tokens</MetaLabel>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-zinc-900">
              {h24.status === 'loading' ? '—' : h24.tokens}
            </p>
          </div>
          <Link
            to="/h24"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-50"
            style={{ fontSize: '12.5px' }}
          >
            Open h24
          </Link>
        </div>
        <p className="mt-2 text-zinc-400" style={{ fontSize: '11.5px' }}>
          Oracle tokens fuel h24 directives. Separate from BLiNG!.
        </p>
      </Card>

      {/* Recent movement */}
      <Card>
        <SectionHead
          title="Recent movement"
          right={
            <Link
              to="/freedomblings/ledger"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-600 transition-colors hover:bg-zinc-50"
              style={{ fontSize: '12px' }}
            >
              Full ledger
            </Link>
          }
        />
        {fb.status === 'loading' ? (
          <StateLine>Loading…</StateLine>
        ) : fb.status === 'signed-out' ? (
          <StateLine>Sign in to see your ledger.</StateLine>
        ) : fb.recent.length === 0 ? (
          <StateLine>No movement yet — your ledger starts at 0.000000, with dignity.</StateLine>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {fb.recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                    m.dir === 'pos' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600',
                  )}
                >
                  {m.dir === 'pos' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-zinc-900" style={{ fontSize: '13.5px' }}>
                    {m.desc}
                  </p>
                  <p
                    className="font-mono text-zinc-400"
                    style={{ fontSize: '10.5px' }}
                    data-size="meta"
                  >
                    {TAG_LABEL[m.kind] ?? m.kind}
                    {m.who ? ` · ${m.who}` : ''}
                    {m.when ? ` · ${m.when}` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 font-mono',
                    m.dir === 'pos' ? 'text-green-600' : 'text-red-600',
                  )}
                  style={{ fontSize: '13px' }}
                >
                  {m.dir === 'pos' ? '+' : '−'}
                  {m.amt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SeasonTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <MetaLabel>{label} this season</MetaLabel>
      <p className="mt-1.5 font-display text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
