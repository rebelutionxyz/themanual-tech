// Oracle Tokens — balance seam + tier rate registry.
//
// Butch ruling 2026-07-27: AtlasOracle is NOT denominated in BLiNG!. Bees hold
// Oracle Tokens. BLiNG! escrow is out of scope for this Astra, so nothing here
// touches bling_pots or the atlasoracle_* escrow RPCs.
//
// FRONT17 (2026-07-27): the ledger SHIPPED (DB8) and the router charges against
// it (OPS15), so both halves of this module went from stub to live:
//
//   * Balance was a hard-coded null with status 'design-pending'. It now reads
//     `oracle_token_balances`, the DB8 view over the append-only ledger.
//   * TIER_RATES carried invented placeholder numbers (2 and 7 tokens per
//     directive) with RATES_ARE_PLACEHOLDER = true. Those are deleted. The
//     router prices off `oracle_model_rates` rows, so showing a Bee a different
//     number than the one they get charged would have been a lie the moment
//     paid tiers went live.
//
// SECURITY NOTE — why reading the view from the browser is safe. It is defined
// `security_invoker=true`, so it evaluates the underlying
// `oracle_token_ledger` RLS as the caller, and that policy is select-own.
// A signed-in Bee therefore sees exactly one row: theirs. Verified against
// production 2026-07-27 (pg_class.reloptions + pg_policies). Without
// security_invoker this query would leak every Bee's balance and would have to
// move server-side.

import { supabase } from '@/lib/supabase';

export type TokenBalanceStatus = 'live' | 'signed-out' | 'unavailable';

export interface OracleTokenBalance {
  /** Oracle Tokens available. null when not readable — never a stand-in digit. */
  balance: number | null;
  status: TokenBalanceStatus;
  /** Plain-language reason, surfaced as a tooltip. Empty when status is 'live'. */
  reason: string;
}

const SIGNED_OUT: OracleTokenBalance = {
  balance: null,
  status: 'signed-out',
  reason: 'Sign in to see your Oracle Token balance.',
};

/**
 * Reads the Bee's Oracle Token balance.
 *
 * A Bee with no ledger entries has no view row. That is zero, not an error —
 * `maybeSingle()` returns null data with no error and we report 0. A genuine
 * query failure reports null with status 'unavailable', so "you have none" and
 * "we could not check" never render as the same thing.
 */
export async function fetchOracleTokenBalance(beeId: string | null): Promise<OracleTokenBalance> {
  if (!beeId) return SIGNED_OUT;
  if (!supabase) {
    return {
      balance: null,
      status: 'unavailable',
      reason: 'Balance unavailable — Supabase client not configured.',
    };
  }

  const { data, error } = await supabase
    .from('oracle_token_balances')
    .select('balance_tokens')
    .eq('bee_id', beeId)
    .maybeSingle();

  if (error) {
    return {
      balance: null,
      status: 'unavailable',
      reason: `Balance unavailable — ${error.message}`,
    };
  }

  return {
    balance: Number(data?.balance_tokens ?? 0),
    status: 'live',
    reason: '',
  };
}

/**
 * Tier → model + live rate. Mirrors `oracle_model_rates`, which is the same
 * table the router prices from, so the rate a Bee is quoted is the rate they
 * are charged. Rates are Oracle Tokens per 1,000,000 provider tokens.
 */
export interface TierRate {
  tier: 'free' | 'standard' | 'frontier';
  model: string;
  inputPerM: number;
  outputPerM: number;
  cachedPerM: number | null;
  note: string;
}

const TIER_NOTE: Record<TierRate['tier'], string> = {
  free: 'Always free. Rate caps apply.',
  standard: 'Charged per token used.',
  frontier: 'Charged per token used. Large directives ask you to confirm first.',
};

/**
 * Reads the live rate card. Returns [] on failure — surfaces render the tier
 * picker without prices rather than inventing them, which is the same posture
 * the router takes when a rate row is missing (it refuses with a 503 instead of
 * guessing a price).
 */
export async function fetchTierRates(): Promise<TierRate[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('oracle_model_rates')
    .select('model_name, tier, input_tokens_per_m, output_tokens_per_m, cached_input_per_m')
    .eq('active', true)
    .order('effective_from', { ascending: false });

  if (error || !data) return [];

  // Newest active row per tier wins — same rule the router applies.
  const seen = new Set<string>();
  const rates: TierRate[] = [];
  for (const row of data) {
    const tier = row.tier as TierRate['tier'];
    if (seen.has(tier)) continue;
    seen.add(tier);
    rates.push({
      tier,
      model: String(row.model_name),
      inputPerM: Number(row.input_tokens_per_m),
      outputPerM: Number(row.output_tokens_per_m),
      cachedPerM: row.cached_input_per_m === null ? null : Number(row.cached_input_per_m),
      note: TIER_NOTE[tier] ?? '',
    });
  }

  const order: TierRate['tier'][] = ['free', 'standard', 'frontier'];
  rates.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return rates;
}

/**
 * Display helper. Token costs run from ~0.0001 (a cached free-tier read) to
 * hundreds (a frontier directive), so a fixed decimal count is wrong at both
 * ends: 2dp renders a real charge as "0.00", and 6dp renders 855.5 as noise.
 */
export function formatTokens(value: number): string {
  if (value === 0) return '0';
  if (value < 0.01) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  if (value < 1000) return value.toFixed(2);
  return Math.round(value).toLocaleString();
}
