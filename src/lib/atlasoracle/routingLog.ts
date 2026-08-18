// Per-Bee routing log — metadata only.
//
// h24_directives holds NO directive text and NO response text (the
// sovereignty rule is enforced structurally: the columns do not exist). This
// reader therefore cannot leak content even if it tried.
//
// RLS: h24_directives carries a select-own policy, so a Bee's own JWT
// returns only that Bee's rows. No service-role key is involved.
//
// FRONT18 (2026-07-31): the log now also carries what each directive COST.
// Cost does not live on the directives table — DB9 dropped `cost_bling` and the
// charge moved to `h24_token_ledger`, joined by `directive_id`. Three reads
// therefore make the log reconcilable:
//
//   1. h24_directives  — the metadata and token counts (select-own)
//   2. h24_token_ledger     — the actual debit (select-own, verified in
//                                pg_policies: `auth.uid() = bee_id`)
//   3. h24_model_rates      — the rate card, to price the legs
//
// All three are the Bee's own or public rate data. No service-role key, no new
// RPC, and nothing here can read another Bee's spend.

import { supabase } from '@/lib/supabase';
import { isMocked } from './client';
import type { ModelRateRow } from './reconcile';

export interface RoutingLogEntry {
  id: string;
  tier: string;
  category: string;
  provider: string | null;
  status: string;
  success: boolean | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  /**
   * Oracle Tokens debited for this directive, as a POSITIVE magnitude.
   *
   * null means NO LEDGER ROW EXISTS, which is a real and different state from
   * zero: the free tier never debits, and a directive that failed after the
   * provider billed us is deliberately not charged to the Bee — the absence of
   * a debit row IS the record of that (see the router's markFailed comment).
   * Rendering both as "0" would erase that distinction.
   */
  costTokens: number | null;
}

export interface RoutingLogPage {
  entries: RoutingLogEntry[];
  /** Active rate rows, for re-deriving each row's cost legs. */
  rates: ModelRateRow[];
}

interface DirectiveRow {
  id: string;
  tier: string;
  directive_category: string;
  provider_selected: string | null;
  status: string;
  success: boolean | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
  error_message: string | null;
  created_at: string;
}

// Mock rate card — mirrors the shape of production's h24_model_rates,
// including the two-row claude-sonnet-5 history that makes `rateLiveAt`'s
// time filter observable in the harness.
const MOCK_RATES: ModelRateRow[] = [
  {
    modelName: 'claude-sonnet-5',
    tier: 'standard',
    inputPerM: 9000,
    outputPerM: 45000,
    cachedPerM: 900,
    effectiveFrom: '2026-07-27T20:04:26Z',
  },
  {
    modelName: 'claude-sonnet-5',
    tier: 'standard',
    inputPerM: 4000,
    outputPerM: 20000,
    cachedPerM: 400,
    effectiveFrom: '2026-07-27T16:21:04Z',
  },
  {
    modelName: 'claude-haiku-4-5',
    tier: 'free',
    inputPerM: 0,
    outputPerM: 0,
    cachedPerM: 0,
    effectiveFrom: '2026-07-27T20:04:26Z',
  },
];

const MOCK_LOG: RoutingLogEntry[] = [
  {
    id: 'mock-0001',
    tier: 'free',
    category: 'suggest',
    provider: 'claude-haiku-4-5',
    status: 'success',
    success: true,
    latencyMs: 1234,
    inputTokens: 1637,
    outputTokens: 43,
    cachedTokens: 0,
    errorMessage: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    costTokens: null,
  },
  {
    id: 'mock-0002',
    tier: 'standard',
    category: 'analyze',
    provider: null,
    status: 'failed',
    success: false,
    latencyMs: 1728,
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    errorMessage: 'mock failure row',
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    costTokens: null,
  },
  // The FRONT18 defect itself, reproduced so the reconciliation panel is
  // exercisable without production data. These are the real figures from
  // directive d37a7032: 0.1240 + 5.2200 + 0.9028 = 6.2468.
  {
    id: 'mock-0003',
    tier: 'standard',
    category: 'suggest',
    provider: 'claude-sonnet-5',
    status: 'success',
    success: true,
    latencyMs: 5649,
    inputTokens: 31,
    outputTokens: 261,
    cachedTokens: 2257,
    errorMessage: null,
    createdAt: '2026-07-27T19:49:31Z',
    costTokens: 6.2468,
  },
];

/** Active rate rows. Readable from the browser — this is published price data. */
async function fetchModelRates(): Promise<ModelRateRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('h24_model_rates')
    .select(
      'model_name, tier, input_tokens_per_m, output_tokens_per_m, cached_input_per_m, effective_from',
    )
    .eq('active', true)
    .order('effective_from', { ascending: false });

  // A missing rate card costs the breakdown, not the log: the Bee still sees
  // the debit, just without the legs. Same posture as the router, which refuses
  // to price rather than guessing a rate.
  if (error || !data) return [];

  return data.map((r) => ({
    modelName: String(r.model_name),
    tier: String(r.tier),
    inputPerM: Number(r.input_tokens_per_m),
    outputPerM: Number(r.output_tokens_per_m),
    cachedPerM: r.cached_input_per_m === null ? null : Number(r.cached_input_per_m),
    effectiveFrom: String(r.effective_from),
  }));
}

/**
 * Debits keyed by directive id, as positive magnitudes.
 *
 * SUMMED rather than taken as one row on purpose. The ledger is append-only and
 * corrects itself with reversing entries, never edits — OPS15 corrected two bad
 * test debits exactly that way. A directive with a correction therefore has more
 * than one row, and its true cost is the sum.
 */
async function fetchDirectiveDebits(directiveIds: string[]): Promise<Map<string, number>> {
  const costs = new Map<string, number>();
  if (!supabase || directiveIds.length === 0) return costs;

  const { data, error } = await supabase
    .from('h24_token_ledger')
    .select('directive_id, amount_tokens')
    .in('directive_id', directiveIds);

  if (error || !data) return costs;

  for (const row of data) {
    const id = String(row.directive_id);
    // Ledger stores debits negative; the UI works in positive magnitudes.
    costs.set(id, (costs.get(id) ?? 0) - Number(row.amount_tokens));
  }
  return costs;
}

export async function fetchRoutingLog(limit = 25): Promise<RoutingLogPage> {
  if (isMocked()) {
    return { entries: MOCK_LOG.slice(0, limit), rates: MOCK_RATES };
  }
  if (!supabase) throw new Error('Supabase client not configured.');

  const { data, error } = await supabase
    .from('h24_directives')
    .select(
      'id, tier, directive_category, provider_selected, status, success, latency_ms, input_tokens, output_tokens, cached_tokens, error_message, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DirectiveRow[];

  // Costs and rates are additive detail — a failure in either must not cost the
  // Bee her log. Both readers already return empty rather than throwing.
  const [debits, rates] = await Promise.all([
    fetchDirectiveDebits(rows.map((r) => r.id)),
    fetchModelRates(),
  ]);

  const entries = rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    category: r.directive_category,
    provider: r.provider_selected,
    status: r.status,
    success: r.success,
    latencyMs: r.latency_ms,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cachedTokens: r.cached_tokens,
    errorMessage: r.error_message,
    createdAt: r.created_at,
    costTokens: debits.get(r.id) ?? null,
  }));

  return { entries, rates };
}
