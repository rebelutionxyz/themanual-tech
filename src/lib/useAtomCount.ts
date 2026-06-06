import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Live count of atoms in The Manual — a lightweight HEAD `count(*)` (no rows
 * fetched). Fetched on every mount so it always reflects the current total,
 * which grows with every Bee contribution. count(*) on a few thousand rows is
 * trivial; add a cached/matview source here if it ever gets heavy at scale.
 *
 * Returns `null` while loading OR if the count can't be fetched. Callers MUST
 * render a neutral fallback on `null` — never a stale hardcoded number.
 */
export function useAtomCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!supabase) return;
        const { count: c, error } = await supabase
          .from('atoms')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        if (c != null && !cancelled) setCount(c);
      } catch {
        // leave null → caller shows its neutral fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
