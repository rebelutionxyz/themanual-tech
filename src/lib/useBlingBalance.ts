/* useBlingBalance — the Bee's BLiNG! balance for the shell header.
 *
 * SHELL v1.8 (owner 2026-09-03): "The bling amount and icon are in the top
 * utility bar." Until now the h24 pages put h24 TOKENS into the header's BLiNG
 * slot (blingDisplay/blingUnit) because nothing loaded real BLiNG. This hook is
 * what loads it, so the header slot can show the currency it is named for and
 * h24 tokens can move to the top of the left sidebar.
 *
 * Reads via the lockdown-safe my_bling_balance() RPC — never a direct bees
 * select. HandleSettingsPage established this as the canonical pattern.
 * Floor-safe: null until loaded, null on any failure, null when signed out.
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export function useBlingBalance(signedIn: boolean): {
  balance: number | null;
  refresh: () => Promise<void>;
} {
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !signedIn) {
      setBalance(null);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('my_bling_balance');
      if (error || data === null || data === undefined) return;
      setBalance(Number(data));
    } catch {
      /* floor-safe: keep whatever we had */
    }
  }, [signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, refresh };
}
