import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { REALM_COLORS, REALM_NAMES, SILVER } from './constants';
import type { RealmId } from '@/types/manual';

/**
 * DB-driven realm color resolution.
 *
 * The canonical realm palette lives in the `realms` table (`realms.color`).
 * `src/lib/constants.ts` mirrors it as REALM_COLORS for the rest of the app;
 * here we read the live table so FN cards tint from the source of truth, with
 * the constant as an offline / loading fallback.
 *
 * `primary_realm` / `realm_path` arrive from the pulse_* RPCs as display
 * names ("Society"), so the resolver accepts either a realm name or a realm id
 * and normalizes a couple of known seed-name variants.
 */

interface RealmRow {
  id: string;
  name: string;
  color: string;
}

// Known seed-data variants that don't match a canonical realm name/id.
const NAME_ALIASES: Record<string, string> = {
  technology: 'tech',
};

// Constant fallback keyed by both lowercased id and lowercased display name.
const FALLBACK = new Map<string, string>();
for (const id of Object.keys(REALM_COLORS) as RealmId[]) {
  FALLBACK.set(id.toLowerCase(), REALM_COLORS[id]);
  FALLBACK.set(REALM_NAMES[id].toLowerCase(), REALM_COLORS[id]);
}

// Session-level cache so we fetch the realms table at most once.
let cache: RealmRow[] | null = null;
let inflight: Promise<RealmRow[]> | null = null;

function fetchRealms(): Promise<RealmRow[]> {
  if (cache) return Promise.resolve(cache);
  const sb = supabase;
  if (!sb) return Promise.resolve([]);
  if (!inflight) {
    inflight = (async () => {
      const { data, error } = await sb.from('realms').select('id, name, color');
      if (error || !data) return [];
      cache = data as RealmRow[];
      return cache;
    })();
  }
  return inflight;
}

export interface RealmColorResolver {
  /** Resolve a realm name or id to a hex color (SILVER when unknown/null). */
  colorFor: (realmNameOrId: string | null | undefined) => string;
  /** True once the live realms table has resolved (fallback used before). */
  loaded: boolean;
}

export function useRealmColors(): RealmColorResolver {
  const [rows, setRows] = useState<RealmRow[] | null>(cache);

  useEffect(() => {
    if (rows) return;
    let cancelled = false;
    fetchRealms().then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  return useMemo<RealmColorResolver>(() => {
    const dbMap = new Map<string, string>();
    for (const r of rows ?? []) {
      if (r.color) {
        dbMap.set(r.id.toLowerCase(), r.color);
        dbMap.set(r.name.toLowerCase(), r.color);
      }
    }
    const colorFor = (raw: string | null | undefined): string => {
      if (!raw) return SILVER;
      let key = raw.trim().toLowerCase();
      if (NAME_ALIASES[key]) key = NAME_ALIASES[key];
      return dbMap.get(key) ?? FALLBACK.get(key) ?? SILVER;
    };
    return { colorFor, loaded: rows !== null };
  }, [rows]);
}
