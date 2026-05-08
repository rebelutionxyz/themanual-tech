// Geo lens shared types — Component C of Phase C (MMF §19.7).
// v1 ships country + region (US states). city + neighborhood are schema-only,
// rendered as inert fields in the profile editor; the bottom-bar selector
// only exposes country + region.

/**
 * `'Global'` is the universal fallback (no facets set).
 * Otherwise we carry up to four hierarchical facets — any unset facet is null.
 * v1 only populates `country` (and `region` when country === 'US').
 */
export type GeoLocation =
  | 'Global'
  | {
      country: string;            // ISO 3166-1 alpha-2 (e.g. 'US', 'GB')
      region: string | null;      // US state code in v1 (e.g. 'TX'); null for non-US
      city: string | null;        // schema-only v1 (free-form text via profile editor)
      neighborhood: string | null;// schema-only v1
    };

/** localStorage payload shape for honeycomb:geo:search-location. */
export interface StoredSearchLocation {
  geo: GeoLocation;
  lastUpdated: string; // ISO timestamp
}

export type GeoBarState = 'expanded' | 'collapsed' | 'dismissed';

/** Source of the resolved geo, returned by useGeoCascade so callers can debug. */
export type GeoSource = 'storage' | 'profile' | 'astra' | 'global';

export interface BeeProfileLocation {
  location_country: string | null;
  location_region: string | null;
  location_city: string | null;
  location_neighborhood: string | null;
}
