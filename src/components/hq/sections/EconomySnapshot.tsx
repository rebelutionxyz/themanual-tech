// HQ §7 — Economy Snapshot
// Reads bling_system_state (public-read) for total_supply + freedom_price.
// Calls get_treasury_pots() for the OPS umbrella breakdown.
//
// Bonding curve canon (honeycomb-vocabulary-v1.md): $1 floor → +$0.01 per
// 1B BLiNG! freed → $101 ceiling. Hard cap 11,222,333,222,111 BLiNG!.
// `bling_system_state.freedom_price` is the authoritative live price; the
// computed price is shown alongside as a sanity check.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SystemState {
  total_supply: number;
  freedom_price: number;
  free_active: boolean;
  updated_at: string;
}

interface Pot {
  purpose: string;
  balance: number;
}

const HARD_CAP = 11_222_333_222_111; // BLiNG! lifetime mint cap
const PRICE_FLOOR_USD = 1.0;
const PRICE_CEILING_USD = 101.0;
const PRICE_INCREMENT_USD_PER_BILLION = 0.01;

function fmt(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return n.toLocaleString(undefined, opts);
}

function computedPrice(totalFreed: number): number {
  const billions = totalFreed / 1_000_000_000;
  const raw = PRICE_FLOOR_USD + billions * PRICE_INCREMENT_USD_PER_BILLION;
  return Math.min(raw, PRICE_CEILING_USD);
}

export function EconomySnapshot() {
  const [state, setState] = useState<SystemState | null>(null);
  const [pots, setPots] = useState<Pot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setState(null);
      setPots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [stateRes, potsRes] = await Promise.all([
        supabase
          .from('bling_system_state')
          .select('total_supply, freedom_price, free_active, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc('get_treasury_pots'),
      ]);
      if (cancelled) return;
      if (stateRes.error) {
        setError(stateRes.error.message);
      } else if (stateRes.data) {
        const d = stateRes.data as { total_supply: number | string; freedom_price: number | string; free_active: boolean; updated_at: string };
        setState({
          total_supply: typeof d.total_supply === 'string' ? Number(d.total_supply) : d.total_supply,
          freedom_price: typeof d.freedom_price === 'string' ? Number(d.freedom_price) : d.freedom_price,
          free_active: d.free_active,
          updated_at: d.updated_at,
        });
      }
      if (potsRes.error) {
        // Treasury read failure doesn't block the system-state view.
        console.warn('EconomySnapshot get_treasury_pots failed', potsRes.error.message);
        setPots([]);
      } else {
        const rows = (potsRes.data ?? []) as Array<{ purpose: string; balance: number | string }>;
        setPots(rows.map((r) => ({
          purpose: r.purpose,
          balance: typeof r.balance === 'string' ? Number(r.balance) : r.balance,
        })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pctFreed = state ? (state.total_supply / HARD_CAP) * 100 : 0;
  const computed = state ? computedPrice(state.total_supply) : PRICE_FLOOR_USD;
  const treasuryTotal = pots?.reduce((sum, p) => sum + p.balance, 0) ?? 0;

  return (
    <div>
      <header className="mb-4">
        <h2 className="font-display text-2xl font-semibold text-text-silver-bright">Economy Snapshot</h2>
        <p className="mt-1 font-mono text-text-muted" style={{ fontSize: '11px' }}>
          bling_system_state + Treasury pots
        </p>
      </header>

      {state === null && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'].map((k) => (
            <div key={k} className="h-20 animate-pulse-slow rounded-md border border-border bg-bg-elevated/40" />
          ))}
        </div>
      )}

      {state !== null && (
        <>
          {error && (
            <div className="mb-4 rounded-md border border-border bg-bg-elevated/40 px-4 py-2 text-text-dim" style={{ fontSize: '12px' }}>
              system_state load error: {error}
            </div>
          )}

          {/* Headline metrics */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Metric
              label="BLiNG! freed"
              value={fmt(state.total_supply, { maximumFractionDigits: 0 })}
              suffix="BLiNG!"
            />
            <Metric
              label="Hard cap"
              value={fmt(HARD_CAP)}
              suffix="BLiNG!"
            />
            <Metric
              label="% of cap freed"
              value={`${pctFreed.toFixed(4)}%`}
            />
            <Metric
              label="Live price (system)"
              value={`$${state.freedom_price.toFixed(6)}`}
            />
            <Metric
              label="Computed price (canon)"
              value={`$${computed.toFixed(6)}`}
            />
            <Metric
              label="Free active"
              value={state.free_active ? 'YES' : 'NO'}
            />
          </div>

          {/* Treasury sub-section */}
          <div className="mt-6">
            <h3 className="font-display text-lg font-semibold text-text-silver-bright">
              OPS umbrella (Treasury pots)
            </h3>
            <p
              className="mt-1 font-mono text-text-muted"
              style={{ fontSize: '11px' }}
            >
              total: {fmt(treasuryTotal)} BLiNG! across {pots?.length ?? 0} pots
            </p>
            {pots !== null && pots.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {pots.map((p) => {
                  const pct = treasuryTotal > 0 ? (p.balance / treasuryTotal) * 100 : 0;
                  return (
                    <div
                      key={p.purpose}
                      className="rounded-md border border-border bg-bg-elevated/30 px-3 py-2"
                    >
                      <div
                        className="font-mono uppercase text-text-muted"
                        style={{ fontSize: '10px', letterSpacing: '0.08em' }}
                      >
                        {p.purpose}
                      </div>
                      <div className="font-display text-lg font-semibold text-text-silver-bright">
                        {fmt(p.balance)}
                      </div>
                      <div className="font-mono text-text-muted" style={{ fontSize: '10px' }}>
                        {pct.toFixed(1)}% of Treasury
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {pots !== null && pots.length === 0 && (
              <div className="mt-3 rounded-md border border-border bg-bg-elevated/40 px-4 py-3 text-text-dim" style={{ fontSize: '12px' }}>
                Treasury pot data unavailable (RPC failed or no admin auth).
              </div>
            )}
          </div>

          <p
            className="mt-4 font-mono text-text-muted"
            style={{ fontSize: '10px' }}
          >
            system_state updated: {new Date(state.updated_at).toISOString().replace('T', ' ').slice(0, 19)}
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-2">
      <div
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: '10px', letterSpacing: '0.08em' }}
      >
        {label}
      </div>
      <div className="font-display text-xl font-semibold text-text-silver-bright">
        {value}
        {suffix && <span className="ml-1.5 font-sans text-xs font-normal text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
