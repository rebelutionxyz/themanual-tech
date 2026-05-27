// HQ §6 — Treasury Balances
// Calls get_treasury_pots() SECURITY DEFINER RPC. RLS on bling_pots only
// allows a Bee to read THEIR OWN pots; the RPC bypasses RLS after an
// internal is_admin check, returning @combtreasury's pot breakdown.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Pot {
  purpose: string;
  balance: number;
  updated_at: string;
}

// Canonical pot labels + descriptions. Render whatever the RPC returns,
// fall back to title-cased purpose for any unknown pot.
const POT_META: Record<string, { label: string; description: string }> = {
  operational: { label: 'Operational',  description: 'Day-to-day platform operating budget' },
  reserve:     { label: 'Reserve',      description: 'Long-term Treasury Council disbursement reserve' },
  defense:     { label: 'Defense',      description: 'Legal + counter-narrative defense fund' },
  campaign:    { label: 'Campaign',     description: 'Astra Director campaign allocations' },
  promotions:  { label: 'Promotions',   description: 'Astra Director promotional / marketing budget' },
  newbee:      { label: 'NewBEE',       description: 'Newcomer Bee onboarding pool' },
  honeypot:    { label: 'HoneyPOT',     description: 'Threat-detection bounty pool' },
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function TreasuryBalances() {
  const [pots, setPots] = useState<Pot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setPots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: e } = await supabase.rpc('get_treasury_pots');
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setPots([]);
        return;
      }
      const rows = (data ?? []) as Array<{ purpose: string; balance: number | string; updated_at: string }>;
      setPots(rows.map((r) => ({
        purpose: r.purpose,
        balance: typeof r.balance === 'string' ? Number(r.balance) : r.balance,
        updated_at: r.updated_at,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  const total = pots?.reduce((sum, p) => sum + p.balance, 0) ?? 0;

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Treasury Balances</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          @combtreasury · via get_treasury_pots() RPC (admin-only)
        </p>
      </header>

      {pots === null && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse-slow rounded-md border border-border bg-bg-elevated/40" />
          ))}
        </div>
      )}

      {pots !== null && pots.length === 0 && (
        <div className="rounded-md border border-border bg-bg-elevated/40 px-4 py-6 text-center text-text-dim" style={{ fontSize: '13px' }}>
          {error ? `Could not load Treasury pots: ${error}` : 'No Treasury pots seeded.'}
        </div>
      )}

      {pots !== null && pots.length > 0 && (
        <>
          <div className="mb-4 rounded-md border border-border bg-bg-elevated/60 px-4 py-3">
            <div
              className="font-mono uppercase text-text-muted"
              style={{ fontSize: '10px', letterSpacing: '0.08em' }}
            >
              Total across {pots.length} pots
            </div>
            <div className="font-display text-3xl font-semibold text-text-silver-bright">
              {fmt(total)}
              <span className="ml-2 font-sans text-base font-normal text-text-muted">BLiNG!</span>
            </div>
          </div>

          <ul className="space-y-2">
            {pots.map((p) => {
              const meta = POT_META[p.purpose] ?? {
                label: p.purpose.charAt(0).toUpperCase() + p.purpose.slice(1),
                description: '—',
              };
              return (
                <li
                  key={p.purpose}
                  className="rounded-md border border-border bg-bg-elevated/30 px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-display text-base font-semibold text-text-silver-bright">
                        {meta.label}
                      </div>
                      <div
                        className="mt-0.5 font-mono uppercase text-text-muted"
                        style={{ fontSize: '10px', letterSpacing: '0.08em' }}
                      >
                        {p.purpose}
                      </div>
                    </div>
                    <div className="font-display text-xl font-semibold text-text">
                      {fmt(p.balance)}
                      <span className="ml-1.5 font-sans text-xs font-normal text-text-muted">BLiNG!</span>
                    </div>
                  </div>
                  <div className="mt-2 text-text-dim" style={{ fontSize: '12px' }}>
                    {meta.description}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
