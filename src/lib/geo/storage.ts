// localStorage helpers for the geo lens — Phase C Component C-3.
// All reads silently fall back when the stored value is corrupt, missing, or
// references a deprecated geo. Writes are best-effort (storage may be full or
// disabled in private mode); failures log via console.warn but never throw.
//
// Anonymous Bees fully supported — these helpers do not depend on auth.

import { isKnownCountryCode } from './countries';
import { isKnownUsStateCode } from './us-states';
import type { GeoBarState, GeoLocation, StoredSearchLocation } from './types';

export const STORAGE_KEYS = {
  searchLocation: 'honeycomb:geo:search-location',
  barState: 'honeycomb:geo:bar-state',
  profilePromptShown: 'honeycomb:geo:profile-prompt-shown',
} as const;

/* ------------------------------------------------------------------------- */
/*  Search location                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Validate a parsed object as a GeoLocation. Returns the value (cast) when
 * shape + canonical-data checks pass, or null when corrupted/deprecated.
 * Validation matters because GeoLocation drives feed scoping; an invalid
 * country code stored historically could quietly under-fill feeds otherwise.
 */
function validateGeo(value: unknown): GeoLocation | null {
  if (value === 'Global') return 'Global';
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.country !== 'string') return null;
  if (!isKnownCountryCode(candidate.country)) return null;

  const region = candidate.region;
  if (region !== null && typeof region !== 'string') return null;
  // For US, region must be a known state code OR null. Other countries leave
  // region nullable in v1 (no per-country region lists shipped yet).
  if (candidate.country === 'US' && region !== null && !isKnownUsStateCode(region)) {
    return null;
  }

  const city = candidate.city;
  if (city !== null && typeof city !== 'string') return null;
  const neighborhood = candidate.neighborhood;
  if (neighborhood !== null && typeof neighborhood !== 'string') return null;

  return {
    country: candidate.country,
    region: region as string | null,
    city: city as string | null,
    neighborhood: neighborhood as string | null,
  };
}

/** Read the saved search location; returns null when missing/corrupt. */
export function getSearchLocation(): GeoLocation | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.searchLocation);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSearchLocation> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    return validateGeo(parsed.geo);
  } catch (err) {
    // Corrupted JSON or storage access denied. Caller treats this as Global.
    // eslint-disable-next-line no-console
    console.warn('[geo] failed to read search-location, falling back to Global', err);
    return null;
  }
}

/** Persist the search location. No-op when localStorage unavailable. */
export function setSearchLocation(geo: GeoLocation): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload: StoredSearchLocation = { geo, lastUpdated: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEYS.searchLocation, JSON.stringify(payload));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[geo] failed to persist search-location', err);
  }
}

/** Clear the persisted search location (used by the "Reset to Global" button). */
export function clearSearchLocation(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.searchLocation);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[geo] failed to clear search-location', err);
  }
}

/* ------------------------------------------------------------------------- */
/*  Bar state                                                                */
/* ------------------------------------------------------------------------- */

const BAR_STATE_VALUES: readonly GeoBarState[] = ['expanded', 'collapsed', 'dismissed'];

function isGeoBarState(v: unknown): v is GeoBarState {
  return typeof v === 'string' && (BAR_STATE_VALUES as readonly string[]).includes(v);
}

export function getBarState(): GeoBarState {
  if (typeof window === 'undefined' || !window.localStorage) return 'expanded';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.barState);
    if (!raw) return 'expanded';
    return isGeoBarState(raw) ? raw : 'expanded';
  } catch {
    return 'expanded';
  }
}

export function setBarState(state: GeoBarState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.barState, state);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[geo] failed to persist bar-state', err);
  }
}

/* ------------------------------------------------------------------------- */
/*  Profile-prompt one-time flag                                             */
/* ------------------------------------------------------------------------- */
// The cascade silently sets localStorage from a logged-in Bee's profile when
// no localStorage value exists. We show a one-time discoverable toast then
// flip this flag so subsequent loads don't repeat the toast on the same device.

export function getProfilePromptShown(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.profilePromptShown) === '1';
  } catch {
    return false;
  }
}

export function setProfilePromptShown(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.profilePromptShown, '1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[geo] failed to persist profile-prompt-shown flag', err);
  }
}
