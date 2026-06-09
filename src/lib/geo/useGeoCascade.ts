// useGeoCascade — Phase C Component C-5 resolution hook.
//
// Resolution order (most-specific first):
//   1. localStorage `honeycomb:geo:search-location`              source: 'storage'
//   2. authenticated bee_profiles.location_country/_region        source: 'profile'
//   3. AstraConfig.defaultGeo (current astra)                    source: 'astra'
//   4. 'Global'                                                   source: 'global'
//
// On first hit of (2) — logged-in Bee with profile location and no localStorage
// value — the hook silently writes the profile location to localStorage and
// fires `onProfilePromotedToStorage` once per device (gated by the
// honeycomb:geo:profile-prompt-shown flag). The consuming GeoLensBar shows the
// discoverable toast: "We've set your location to {label} — change anytime."

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAstra } from '@/lib/astras/AstraContext';
import { supabase } from '@/lib/supabase';
import {
  getProfilePromptShown,
  getSearchLocation,
  setProfilePromptShown,
  setSearchLocation,
} from './storage';
import type {
  BeeProfileLocation,
  GeoLocation,
  GeoSource,
} from './types';

interface CascadeResult {
  geo: GeoLocation;
  source: GeoSource;
  /** Imperatively set the search location (writes to localStorage + state). */
  setGeo: (next: GeoLocation) => void;
  /**
   * One-shot signal: when the cascade promotes a profile location into
   * localStorage and the prompt has not been shown before, this string
   * carries the human-readable label to display in a toast. Becomes null
   * after the consumer acknowledges via `dismissPromotionToast()`.
   */
  promotionToastLabel: string | null;
  dismissPromotionToast: () => void;
}

/**
 * Build a human label for a GeoLocation. Used in the toast; intentionally
 * minimal so callers don't need to import country/state lookup helpers
 * separately. Caller may override for richer rendering.
 */
function geoToLabel(geo: GeoLocation): string {
  if (geo === 'Global') return 'Global';
  // Most-specific facet first — city > region > country.
  if (geo.city) return geo.city;
  if (geo.region) return `${geo.region}, ${geo.country}`;
  return geo.country;
}

function profileRowToGeo(row: BeeProfileLocation): GeoLocation | null {
  if (!row.location_country) return null;
  return {
    country: row.location_country,
    region: row.location_region,
    city: row.location_city,
    neighborhood: row.location_neighborhood,
  };
}

export function useGeoCascade(): CascadeResult {
  const { bee } = useAuth();
  const astra = useAstra();

  // Initialize synchronously from localStorage + astra fallback so the bottom
  // bar paints with the correct value on first render.
  const [geo, setGeoState] = useState<GeoLocation>(() => {
    const stored = getSearchLocation();
    if (stored !== null) return stored;
    return astra?.defaultGeo ?? 'Global';
  });
  const [source, setSource] = useState<GeoSource>(() =>
    getSearchLocation() !== null
      ? 'storage'
      : astra?.defaultGeo
        ? 'astra'
        : 'global',
  );
  const [promotionToastLabel, setPromotionToastLabel] = useState<string | null>(null);

  // Profile cascade: only runs when (a) authenticated Bee, (b) Supabase wired,
  // and (c) localStorage was empty at mount (source !== 'storage'). We do not
  // overwrite a Bee's manual selector choice with their profile.
  useEffect(() => {
    let cancelled = false;
    if (!bee || !supabase) return;
    if (source === 'storage') return;

    void (async () => {
      const { data, error } = await supabase!
        .from('bee_profiles')
        .select('location_country, location_region, location_city, location_neighborhood')
        .eq('bee_id', bee.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[geo] failed to load bee_profiles for cascade', error);
        return;
      }
      const profileGeo = data ? profileRowToGeo(data as BeeProfileLocation) : null;
      if (!profileGeo) return;

      // Promote profile to localStorage so subsequent loads short-circuit at
      // step (1). This is intentional silent persistence per C-5.
      setSearchLocation(profileGeo);
      setGeoState(profileGeo);
      setSource('profile');

      if (!getProfilePromptShown()) {
        setPromotionToastLabel(geoToLabel(profileGeo));
        setProfilePromptShown();
      }
    })();

    return () => {
      cancelled = true;
    };
    // bee.id is the meaningful identity key; the bee object reference may change
    // on re-render even when id is stable. source is included so the effect
    // re-evaluates if the user clears localStorage mid-session.
  }, [bee?.id, source, bee]);

  const setGeo = useCallback((next: GeoLocation) => {
    setSearchLocation(next);
    setGeoState(next);
    setSource('storage');
  }, []);

  const dismissPromotionToast = useCallback(() => {
    setPromotionToastLabel(null);
  }, []);

  return { geo, source, setGeo, promotionToastLabel, dismissPromotionToast };
}

export { geoToLabel };
