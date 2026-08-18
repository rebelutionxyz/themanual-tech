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
  type OracleTokenSplit,
  type TierRate,
  fetchOracleTokenBalance,
  fetchOracleTokenSplit,
  fetchTierRates,
} from './tokens';

export interface UseOracleTokens {
  balance: OracleTokenBalance;
  /**
   * Plan vs purchased, or null when unreadable — the surface then shows the
   * total alone rather than a split it had to guess at. See `fetchOracleTokenSplit`.
   */
  split: OracleTokenSplit | null;
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
  const [split, setSplit] = useState<OracleTokenSplit | null>(null);
  const [rates, setRates] = useState<TierRate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [next, nextSplit] = await Promise.all([
      fetchOracleTokenBalance(beeId),
      fetchOracleTokenSplit(beeId),
    ]);
    setBalance(next);
    setSplit(nextSplit);
  }, [beeId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [b, s, r] = await Promise.all([
        fetchOracleTokenBalance(beeId),
        fetchOracleTokenSplit(beeId),
        fetchTierRates(),
      ]);
      // Guard against a resolve landing after the user signed out or swapped.
      if (cancelled) return;
      setBalance(b);
      setSplit(s);
      setRates(r);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [beeId]);

  const applyBalanceAfter = useCallback(
    (balanceAfterTokens: number | null) => {
      // Free-tier directives report null — nothing was debited, so the displayed
      // balance is still correct and must not be clobbered.
      if (balanceAfterTokens === null) return;
      setBalance({ balance: balanceAfterTokens, status: 'live', reason: '' });

      // THE TOTAL IS AUTHORITATIVE IMMEDIATELY; THE SPLIT IS NOT. The router
      // returns only the post-debit total, and which bucket the debit came out
      // of is recorded server-side by `oracle_debit_tokens` (plan grants first,
      // FIFO by soonest expiry, then the durable pool). Rather than re-derive
      // that split here — two definitions of the same number is exactly the bug
      // the debit RPC's own comment records as F-1 — the stale split is dropped
      // and refetched. The total never flickers; the split briefly reads as
      // unavailable, which is honest.
      setSplit(null);
      void fetchOracleTokenSplit(beeId).then(setSplit);
    },
    [beeId],
  );

  return { balance, split, rates, loading, refresh, applyBalanceAfter };
}
