// BYOK platform fee — CALCULATION ONLY (H24_BYOK1). MONEY IS GATED: this file
// computes what the platform fee WOULD be; nothing here charges anyone or
// touches bling_transactions / h24_token_ledger. KNOW_SPEC v0.2 fee schedule
// (LEAD PROPOSAL, owner to ratify): "BYOK platform fee: 10% of metered
// provider-equivalent spend."
//
// METERING STATUS (flagged, not built this pass): computing a real fee needs
// a real meteredSpendUsd per directive, which needs BYOK usage to actually
// flow through h24-route with the Bee's own key — that is AUTOTIER1's job
// (routing through a BYOK key is still marked "lands with AUTOTIER1"
// everywhere else in this codebase, e.g. OraclePage's COMPOSER SEMANTICS
// note). h24_directives has no metered-spend column today, and adding one is
// schema — gated, proposed only when AUTOTIER1 needs it. This module is the
// calculator AUTOTIER1 plugs a real number into; it does not itself meter
// anything.
export const BYOK_PLATFORM_FEE_RATE = 0.1; // KNOW_SPEC v0.2 §1 — owner to ratify

export interface ByokFeeBreakdown {
  meteredSpendUsd: number;
  feeUsd: number;
  totalUsd: number;
  ratePct: number;
}

/**
 * meteredSpendUsd = what the Bee's own provider would have billed for this
 * usage (their published per-token price × the tokens the directive used) —
 * NOT h24 token pricing, since BYOK usage bypasses the h24 token ledger
 * entirely. Returns the platform's cut and the notional total. Pure function;
 * never called anywhere that charges a Bee.
 */
export function computeByokPlatformFee(meteredSpendUsd: number): ByokFeeBreakdown {
  const spend = Math.max(0, meteredSpendUsd);
  const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
  const fee = round6(spend * BYOK_PLATFORM_FEE_RATE);
  return {
    meteredSpendUsd: spend,
    feeUsd: fee,
    totalUsd: round6(spend + fee),
    ratePct: BYOK_PLATFORM_FEE_RATE * 100,
  };
}
