import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#F0F0F5';
const TEXT_MUTED = '#5A7BAA';
const HEADER_TEXT = '#3A2400'; // high-contrast on honey gold

// Hard cap from Lock 7 (federation-tier-1-scoping.md). Constant in code,
// not stored in bling_system_state.
const BLING_HARD_CAP = 11_222_333_222_111;

interface State {
  beeCount: number | null;
  astraCount: number | null;
  novaCount: number | null;
  mintActive: boolean | null;
  totalSupply: string | null;
  mintPrice: string | null;
}

const INITIAL: State = {
  beeCount: null,
  astraCount: null,
  novaCount: null,
  mintActive: null,
  totalSupply: null,
  mintPrice: null,
};

async function safeCount(table: string): Promise<number | null> {
  if (!supabase) return null;
  const { count, error } = await supabase
    .from(table)
    .select('*', { head: true, count: 'exact' });
  if (error) return null;
  return count ?? 0;
}

export function SystemStateSection() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const [beeCount, astraCount, novaCount, sysRes] = await Promise.all([
        safeCount('bees'),
        safeCount('astra_registry'),
        safeCount('nova_registry'),
        supabase
          .from('bling_system_state')
          .select('mint_active, total_supply, mint_price')
          .eq('id', 1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      const sys = sysRes.data as
        | { mint_active: boolean; total_supply: string; mint_price: string }
        | null;
      setState({
        beeCount,
        astraCount,
        novaCount,
        mintActive: sys?.mint_active ?? null,
        totalSupply: sys?.total_supply ?? null,
        mintPrice: sys?.mint_price ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <h1
        className="font-display text-3xl font-semibold"
        style={{ color: HEADER_TEXT }}
      >
        System State
      </h1>

      <div>
        <SectionLabel>Population</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Total Bees" value={fmt(state.beeCount)} />
          <Metric label="Astras" value={fmt(state.astraCount)} />
          <Metric label="Novas" value={fmt(state.novaCount)} />
        </div>
      </div>

      <div>
        <SectionLabel>BLiNG! Economy</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="FREE active"
            value={
              state.mintActive === null
                ? '—'
                : state.mintActive
                  ? 'YES'
                  : 'PAUSED'
            }
            tone={
              state.mintActive === false ? 'warn' : state.mintActive ? 'ok' : 'neutral'
            }
          />
          <Metric label="Total supply" value={fmtAmount(state.totalSupply)} />
          <Metric label="Curve price" value={fmtAmount(state.mintPrice)} />
          <Metric label="Hard cap" value={fmt(BLING_HARD_CAP)} />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 text-xs font-semibold uppercase tracking-wider"
      style={{ color: HEADER_TEXT }}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const valueColor =
    tone === 'warn' ? '#E8A838' : tone === 'ok' ? '#6FCF8F' : TEXT_PRIMARY;
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg p-4"
      style={{ background: PANEL_BG }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: TEXT_MUTED }}
      >
        {label}
      </span>
      <span
        className="font-display text-xl font-semibold tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString();
}

function fmtAmount(s: string | null): string {
  if (s === null) return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
