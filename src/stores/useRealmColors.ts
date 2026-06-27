import { REALM_COLORS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { RealmId } from '@/types/manual';
import { create } from 'zustand';

/**
 * Realm accent colors — single source of truth is the DB `realms.color` column;
 * the baked {@link REALM_COLORS} map is the FALLBACK for any NULL (pass-16
 * addendum). Until the column is seeded, every row is NULL → fallback wins, so
 * nothing changes visually. Once seeded, the DB value overrides per realm.
 *
 * NOTE: realm color ≠ Astra color. A post's spine uses the realm color; the
 * INTEL/Justice surface chrome uses the Astra color (astraColor()).
 */
interface RealmColorState {
  colors: Record<RealmId, string>;
  loaded: boolean;
  load: () => Promise<void>;
}

export const useRealmColors = create<RealmColorState>()((set, get) => ({
  colors: { ...REALM_COLORS },
  loaded: false,
  load: async () => {
    if (get().loaded || !supabase) return;
    set({ loaded: true });
    const { data, error } = await supabase.from('realms').select('id, color');
    if (error || !data) return;
    const next = { ...REALM_COLORS };
    for (const row of data as { id: string; color: string | null }[]) {
      if (row.color && row.id in next) next[row.id as RealmId] = row.color;
    }
    set({ colors: next });
  },
}));

/** Default realm color when a thread carries no realm. */
export const REALM_COLOR_FALLBACK = '#6B94C8';
