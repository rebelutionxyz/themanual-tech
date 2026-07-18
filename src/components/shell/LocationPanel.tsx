import { COUNTRIES } from '@/lib/geo/countries';
import {
  clearSearchLocation,
  getSearchLocation,
  setSearchLocation,
} from '@/lib/geo/storage';
import type { GeoLocation } from '@/lib/geo/types';
import { US_STATES } from '@/lib/geo/us-states';
import { Globe2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Location lens panel — completes the old stub (Butch 2026-07-18). Pick a
 * country (+ US state) as the search location; the selection persists via
 * the Phase-C geo storage (honeycomb:geo:search-location) that the
 * promotions cascade and feeds already read, and shows inline on the
 * Location button. v1 = country + US state, matching the geo types;
 * city/neighborhood remain profile-editor-only.
 */
export function LocationPanel({ onChanged }: { onChanged: () => void }) {
  const [geo, setGeoState] = useState<GeoLocation | null>(() => getSearchLocation());
  const country = geo && geo !== 'Global' ? geo.country : '';
  const region = geo && geo !== 'Global' ? (geo.region ?? '') : '';

  function commit(next: GeoLocation | null) {
    if (next === null) clearSearchLocation();
    else setSearchLocation(next);
    setGeoState(next);
    onChanged();
  }

  function onCountry(code: string) {
    if (!code) {
      commit(null); // Global — everywhere
      return;
    }
    commit({ country: code, region: null, city: null, neighborhood: null });
  }

  function onRegion(code: string) {
    if (!country) return;
    commit({ country, region: code || null, city: null, neighborhood: null });
  }

  return (
    <div className="w-full p-3">
      <label
        className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-500"
        data-size="meta"
        htmlFor="lens-geo-country"
      >
        Country
      </label>
      <select
        id="lens-geo-country"
        value={country}
        onChange={(e) => onCountry(e.target.value)}
        className="mb-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-800"
      >
        <option value="">Global — everywhere</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>

      {country === 'US' && (
        <>
          <label
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-500"
            data-size="meta"
            htmlFor="lens-geo-state"
          >
            State
          </label>
          <select
            id="lens-geo-state"
            value={region}
            onChange={(e) => onRegion(e.target.value)}
            className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-800"
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}

      {geo && geo !== 'Global' && (
        <button
          type="button"
          onClick={() => commit(null)}
          className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <Globe2 size={13} />
          Reset to Global
        </button>
      )}
    </div>
  );
}
