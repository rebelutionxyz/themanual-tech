// Cost reconciliation — turning a directive's token counts back into the number
// that left the Bee's wallet.
//
// WHY THIS EXISTS (FRONT18, 2026-07-31). The routing log showed `31 / 261`
// tokens for directive d37a7032 while the ledger debited 6.2468 Oracle Tokens.
// Those two numbers cannot produce that third one, because the directive also
// carried 2,257 CACHED input tokens that the log did not render — 14.5 % of the
// bill, invisible. The charge was correct; the disclosure was not.
//
// A platform selling trust cannot show a Bee two numbers that do not reconcile
// to the amount it took. So this module does the arithmetic OUT LOUD: every leg,
// its rate, its subtotal, and any charge-the-lesser adjustment, summing exactly
// to the debit.
//
// ⚠ THIS MODULE IS DISPLAY ONLY. It re-derives what the router already charged;
// it never decides a charge. The authority is `h24_token_ledger.amount_tokens`
// and nothing here may override it — where the re-derivation disagrees with the
// ledger, the UI shows the ledger figure and says the legs could not be
// reconciled. Being visibly unable to explain a charge is honest; quietly
// showing a prettier number than the one taken is not.

/** One active row of `h24_model_rates`, as the router reads it. */
export interface ModelRateRow {
  modelName: string;
  tier: string;
  inputPerM: number;
  outputPerM: number;
  cachedPerM: number | null;
  effectiveFrom: string;
}

/** One priced leg of a directive's cost. */
export interface CostLeg {
  label: 'input' | 'output' | 'cached';
  tokens: number;
  /** Oracle Tokens per 1,000,000 provider tokens. */
  ratePerM: number;
  subtotal: number;
  /**
   * True when this leg fell back to the input rate because the model has no
   * cached rate configured. The router does the same (over-charging slightly is
   * the safe direction for a missing rate) and says so in its own comment; the
   * Bee deserves to see it too.
   */
  rateFallback?: boolean;
}

export interface CostBreakdown {
  legs: CostLeg[];
  /** Sum of the legs — what the tokens are worth at the rates that were live. */
  derivedTotal: number;
  /** What the ledger actually took. Authoritative. */
  debit: number;
  /**
   * debit − derivedTotal. Negative when charge-the-lesser capped the bill at the
   * estimate and the platform absorbed the difference. Zero on an exact match.
   */
  adjustment: number;
  /** True when the legs reconcile to the debit within ledger precision. */
  reconciles: boolean;
  rate: ModelRateRow;
}

/** Ledger precision: `h24_token_ledger.amount_tokens` is numeric(20,6). */
const LEDGER_EPSILON = 0.0000005;

/**
 * Round to six decimals — byte-for-byte the router's rule in
 * `calculateCostTokens`, so the front-end arithmetic cannot drift from the
 * arithmetic that produced the debit.
 */
function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * The rate row that was live for `modelName` at `at`.
 *
 * NOTE ON A DELIBERATE DIFFERENCE FROM THE ROUTER. The router picks the newest
 * active row for the model with no time filter, because at charge time "newest"
 * and "live now" are the same row. Re-deriving a PAST charge is a different
 * question, so this filters `effective_from <= at`. For d37a7032 that matters:
 * two active claude-sonnet-5 rows exist, and only the earlier one (4000 / 20000
 * / 400, effective 2026-07-27 16:21Z) was live when the directive ran at
 * 19:49Z. Using the router's rule here would re-derive 14.05 against a 6.2468
 * debit and wrongly look like a billing bug.
 *
 * Returns null when no row was live yet — the caller must then decline to show a
 * breakdown rather than price the legs at a guess.
 */
export function rateLiveAt(
  rates: ModelRateRow[],
  modelName: string,
  at: string,
): ModelRateRow | null {
  const atMs = new Date(at).getTime();
  if (Number.isNaN(atMs)) return null;

  let best: ModelRateRow | null = null;
  for (const r of rates) {
    if (r.modelName !== modelName) continue;
    const fromMs = new Date(r.effectiveFrom).getTime();
    if (Number.isNaN(fromMs) || fromMs > atMs) continue;
    if (best === null || fromMs > new Date(best.effectiveFrom).getTime()) best = r;
  }
  return best;
}

/**
 * Explain a debit as priced legs.
 *
 * `debit` is the POSITIVE magnitude taken from the wallet (the ledger stores it
 * negative; the caller flips the sign once, at the read).
 */
export function buildCostBreakdown(
  rate: ModelRateRow,
  tokens: { input: number; output: number; cached: number },
  debit: number,
): CostBreakdown {
  // Same fallback the router applies when a model has no cached rate.
  const cachedRate = rate.cachedPerM ?? rate.inputPerM;

  const legs: CostLeg[] = [
    {
      label: 'input',
      tokens: tokens.input,
      ratePerM: rate.inputPerM,
      subtotal: round6((tokens.input / 1_000_000) * rate.inputPerM),
    },
    {
      label: 'output',
      tokens: tokens.output,
      ratePerM: rate.outputPerM,
      subtotal: round6((tokens.output / 1_000_000) * rate.outputPerM),
    },
    {
      label: 'cached',
      tokens: tokens.cached,
      ratePerM: cachedRate,
      subtotal: round6((tokens.cached / 1_000_000) * cachedRate),
      rateFallback: rate.cachedPerM === null,
    },
  ];

  const derivedTotal = round6(legs.reduce((sum, l) => sum + l.subtotal, 0));
  const adjustment = round6(debit - derivedTotal);

  return {
    legs,
    derivedTotal,
    debit,
    adjustment,
    reconciles: Math.abs(adjustment) < LEDGER_EPSILON,
    rate,
  };
}

/**
 * Exact-figure formatter for reconciliation displays.
 *
 * `formatTokens` in tokens.ts is a SUMMARY formatter — it renders 6.2468 as
 * "6.25", which is right for a balance and useless for an audit: two legs of a
 * three-leg sum would each round and the column would not add up on screen. This
 * one trims trailing zeros but never below four decimals, so a Bee can check the
 * arithmetic by eye and a small free-tier figure still keeps its significant
 * digits.
 *
 *   6.246800 → "6.2468"      5.220000 → "5.2200"
 *   0.902800 → "0.9028"      0.000124 → "0.000124"
 */
export function formatTokensExact(value: number): string {
  return value.toFixed(6).replace(/(\.\d{4}\d*?)0+$/, '$1');
}
