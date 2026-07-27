// Oracle Tokens — balance seam + tier rate registry.
//
// Butch ruling 2026-07-27 (dispatch FRONT16 amendment 2): AtlasOracle is NOT
// denominated in BLiNG!. Bees hold Oracle Tokens. BLiNG! escrow is out of
// scope for this Astra, so nothing here touches bling_pots or the
// atlasoracle_* escrow RPCs.
//
// There is no Oracle Token ledger yet — the token design is pending and DB7
// explicitly forbids creating oracle_* tables ahead of it. So the balance is
// reported as UNAVAILABLE rather than faked as a number. A zero would read as
// "you have none"; null reads as "not live yet", which is the truth.

export type TokenBalanceStatus = 'design-pending' | 'signed-out';

export interface OracleTokenBalance {
  /** Always null until the token ledger ships. Never render a stand-in digit. */
  balance: number | null;
  status: TokenBalanceStatus;
  /** Plain-language reason, surfaced as a tooltip. */
  reason: string;
}

export function readOracleTokenBalance(signedIn: boolean): OracleTokenBalance {
  if (!signedIn) {
    return {
      balance: null,
      status: 'signed-out',
      reason: 'Sign in to see your Oracle Token balance.',
    };
  }
  return {
    balance: null,
    status: 'design-pending',
    reason: 'The Oracle Token ledger is not live yet — balance unavailable.',
  };
}

/**
 * Tier → model registry. Model ids mirror the DEPLOYED router's tier map,
 * verified live 2026-07-27 (OPS10). Rates are PLACEHOLDERS: Oracle Token
 * denomination is undesigned, so these are shape, not truth, and every surface
 * that shows them must label them as provisional.
 */
export interface TierRate {
  tier: 'free' | 'standard' | 'frontier';
  model: string;
  /** Provisional tokens-per-directive. null = always free, no rate applies. */
  ratePlaceholder: number | null;
  note: string;
}

export const TIER_RATES: TierRate[] = [
  {
    tier: 'free',
    model: 'claude-haiku-4-5',
    ratePlaceholder: null,
    note: 'Always free. Rate caps apply.',
  },
  {
    tier: 'standard',
    model: 'claude-sonnet-4-6',
    ratePlaceholder: 2,
    note: 'Provisional rate — token denomination pending.',
  },
  {
    tier: 'frontier',
    model: 'claude-opus-4-7',
    ratePlaceholder: 7,
    note: 'Provisional rate — token denomination pending.',
  },
];

export const RATES_ARE_PLACEHOLDER = true;
