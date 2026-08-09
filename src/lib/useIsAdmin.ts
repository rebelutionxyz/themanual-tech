import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

/**
 * FRONT31 — the bees.is_admin lookup, as a hook.
 *
 * This is NOT a new pattern. It is the EXACT query HQControlRoom,
 * MissionControlPage and DingleberryLayout already each run inline:
 *
 *   supabase.from('bees').select('is_admin').eq('id', bee.id).maybeSingle()
 *
 * useAuth's bee object does not carry is_admin, so it has to be looked up.
 * RLS lets a Bee read their own row. It exists as a hook because PlatformLayout
 * needs the same answer to decide whether to mount the ConstellationRail, and a
 * layout cannot reach into a page component's local state.
 *
 * The three existing inline copies are deliberately NOT refactored onto this
 * hook in FRONT31 — that would put three working admin gates in the blast
 * radius of a presentation pass. Recorded as follow-up work instead.
 *
 * NOT A SECURITY BOUNDARY. This decides what the UI renders. Real enforcement
 * is RLS on the underlying tables. Anything genuinely secret must not be in the
 * client bundle in the first place.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { bee, loading: authLoading } = useAuth();
  const [state, setState] = useState<{ checked: boolean; isAdmin: boolean }>({
    checked: false,
    isAdmin: false,
  });

  useEffect(() => {
    if (authLoading) return;

    // Signed out, or no client: settled, and not an admin.
    if (!bee || !supabase) {
      setState({ checked: true, isAdmin: false });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('bees')
        .select('is_admin')
        .eq('id', bee.id)
        .maybeSingle();
      if (cancelled) return;
      // Fail closed: a lookup error is not admin.
      setState({ checked: true, isAdmin: !error && !!data?.is_admin });
    })();

    return () => {
      cancelled = true;
    };
  }, [bee, authLoading]);

  return { isAdmin: state.isAdmin, loading: authLoading || !state.checked };
}
