// Oracle Token balance + rate card, shared by the badge and the /oracle console.
//
// Why a hook rather than each surface fetching: the running balance has to
// update the instant a directive is charged, and it has to update the same way
// in both places. The router already returns the authoritative post-debit
// figure (`balance_after_tokens`), so `applyBalanceAfter` writes that straight
// in — no refetch, no window where the screen disagrees with the ledger.
//
// `refresh()` stays available for the cases the response cannot cover: first
// mount, sign-in, and a future GET-tokens purchase completing.

import { useCallback, useEffect, useState } from 'react';
import {
  type OracleTokenBalance,
  type TierRate,
  fetchOracleTokenBalance,
  fetchTierRates,
} from './tokens';

export interface UseOracleTokens {
  balance: OracleTokenBalance;
  rates: TierRate[];
  loading: boolean;
  /** Re-reads the balance from the ledger view. */
  refresh: () => Promise<void>;
  /** Applies the router's post-debit balance without a round trip. */
  applyBalanceAfter: (balanceAfterTokens: number | null) => void;
}

const INITIAL: OracleTokenBalance = {
  balance: null,
  status: 'unavailable',
  reason: 'Loading balance…',
};

export function useOracleTokens(beeId: string | null): UseOracleTokens {
  const [balance, setBalance] = useState<OracleTokenBalance>(INITIAL);
  const [rates, setRates] = useState<TierRate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchOracleTokenBalance(beeId);
    setBalance(next);
  }, [beeId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [b, r] = await Promise.all([fetchOracleTokenBalance(beeId), fetchTierRates()]);
      // Guard against a resolve landing after the Bee signed out or swapped.
      if (cancelled) return;
      setBalance(b);
      setRates(r);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [beeId]);

  const applyBalanceAfter = useCallback((balanceAfterTokens: number | null) => {
    // Free-tier directives report null — nothing was debited, so the displayed
    // balance is still correct and must not be clobbered.
    if (balanceAfterTokens === null) return;
    setBalance({ balance: balanceAfterTokens, status: 'live', reason: '' });
  }, []);

  return { balance, rates, loading, refresh, applyBalanceAfter };
}
