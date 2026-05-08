import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Globe2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, countryName } from '@/lib/geo/countries';
import { US_STATES, usStateName } from '@/lib/geo/us-states';
import {
  getBarState,
  setBarState as persistBarState,
} from '@/lib/geo/storage';
import { geoToLabel, useGeoCascade } from '@/lib/geo/useGeoCascade';
import type { GeoBarState, GeoLocation } from '@/lib/geo/types';

const GLOBAL_OPTION_VALUE = '__GLOBAL__';

/**
 * Sticky bottom bar for the geo lens. Three states:
 *   - expanded: full bar with country/region selectors and a Reset button
 *   - collapsed: thin pill showing the current geo label
 *   - dismissed: nothing rendered (a tiny floating "Geo" reopener returns it)
 *
 * State persists across navigation via localStorage. Visible on every page.
 */
export function GeoLensBar() {
  const { geo, setGeo, promotionToastLabel, dismissPromotionToast } = useGeoCascade();
  const [barState, setBarStateValue] = useState<GeoBarState>(() => getBarState());

  // Persist bar state on every transition. Wrapping setBarStateValue lets
  // callers stay terse (no manual storage write at every site).
  const updateBarState = (next: GeoBarState) => {
    setBarStateValue(next);
    persistBarState(next);
  };

  // ---------- Selector state ----------
  // Country dropdown: synthetic 'GLOBAL' entry maps to GeoLocation === 'Global'.
  const currentCountry = geo === 'Global' ? GLOBAL_OPTION_VALUE : geo.country;
  const currentRegion =
    geo !== 'Global' && geo.country === 'US' && geo.region ? geo.region : '';

  const onCountryChange = (raw: string) => {
    if (raw === GLOBAL_OPTION_VALUE) {
      setGeo('Global');
      return;
    }
    // Country switch: drop region/city/neighborhood. Selecting US shows the
    // region picker; user must pick a state separately if they want one.
    setGeo({ country: raw, region: null, city: null, neighborhood: null });
  };

  const onRegionChange = (raw: string) => {
    if (geo === 'Global' || geo.country !== 'US') return;
    setGeo({
      country: geo.country,
      region: raw === '' ? null : raw,
      city: geo.city,
      neighborhood: geo.neighborhood,
    });
  };

  const resetToGlobal = () => setGeo('Global');

  // Discoverable toast — shows once when cascade silently promoted a profile
  // location into localStorage. Auto-dismiss after 8s if the Bee ignores it.
  const dismissTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!promotionToastLabel) return;
    if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => {
      dismissPromotionToast();
    }, 8_000);
    return () => {
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    };
  }, [promotionToastLabel, dismissPromotionToast]);

  // ---------- Render ----------
  if (barState === 'dismissed') {
    return (
      <ReopenChip
        onReopen={() => updateBarState('expanded')}
        label={geoToLabel(geo)}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'pointer-events-auto fixed bottom-0 left-0 right-0 z-30',
          'border-t border-border bg-bg/95 backdrop-blur-md',
          'transition-[height] duration-150',
        )}
        data-geo-bar={barState}
      >
        {barState === 'collapsed' ? (
          <CollapsedBar
            label={geoToLabel(geo)}
            onExpand={() => updateBarState('expanded')}
            onDismiss={() => updateBarState('dismissed')}
          />
        ) : (
          <ExpandedBar
            currentCountry={currentCountry}
            currentRegion={currentRegion}
            onCountryChange={onCountryChange}
            onRegionChange={onRegionChange}
            onResetToGlobal={resetToGlobal}
            onCollapse={() => updateBarState('collapsed')}
            onDismiss={() => updateBarState('dismissed')}
            geo={geo}
          />
        )}
      </div>
      {promotionToastLabel && (
        <PromotionToast label={promotionToastLabel} onDismiss={dismissPromotionToast} />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

interface ExpandedBarProps {
  currentCountry: string;
  currentRegion: string;
  onCountryChange: (next: string) => void;
  onRegionChange: (next: string) => void;
  onResetToGlobal: () => void;
  onCollapse: () => void;
  onDismiss: () => void;
  geo: GeoLocation;
}

function ExpandedBar({
  currentCountry,
  currentRegion,
  onCountryChange,
  onRegionChange,
  onResetToGlobal,
  onCollapse,
  onDismiss,
  geo,
}: ExpandedBarProps) {
  const showRegion = geo !== 'Global' && geo.country === 'US';
  return (
    <div className="safe-pad-x flex h-12 items-center gap-3 px-4 md:px-6">
      <Globe2 size={14} className="flex-shrink-0 text-text-dim" aria-hidden />
      <span
        className="hidden font-mono text-text-muted sm:inline"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        Geo lens
      </span>

      {/* Country selector */}
      <label className="flex min-w-0 flex-shrink items-center gap-1.5">
        <span className="sr-only">Country</span>
        <select
          value={currentCountry}
          onChange={(e) => onCountryChange(e.target.value)}
          className={cn(
            'min-w-0 max-w-[14rem] truncate rounded-md border border-border bg-bg-elevated px-2 py-1',
            'font-mono text-text-silver hover:border-border-bright focus:border-border-bright focus:outline-none',
          )}
          style={{ fontSize: '12px' }}
          aria-label="Country"
        >
          <option value={GLOBAL_OPTION_VALUE}>Global</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Region (US states v1) */}
      {showRegion && (
        <label className="flex min-w-0 flex-shrink items-center gap-1.5">
          <span className="sr-only">State</span>
          <select
            value={currentRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className={cn(
              'min-w-0 max-w-[12rem] truncate rounded-md border border-border bg-bg-elevated px-2 py-1',
              'font-mono text-text-silver hover:border-border-bright focus:border-border-bright focus:outline-none',
            )}
            style={{ fontSize: '12px' }}
            aria-label="State"
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Current label echo (helps Bees confirm the selection without parsing the dropdowns) */}
      <span
        className="hidden truncate font-mono text-text-dim md:inline"
        style={{ fontSize: '11px' }}
        data-size="meta"
        title="Active search lens"
      >
        Showing {prettyGeo(geo)}
      </span>

      <div className="flex-1" />

      {/* Reset to Global — only useful when not already Global */}
      {geo !== 'Global' && (
        <button
          type="button"
          onClick={onResetToGlobal}
          className={cn(
            'rounded-md border border-border px-2 py-1 font-mono text-text-dim',
            'hover:border-border-bright hover:bg-bg-elevated hover:text-text-silver',
          )}
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Reset
        </button>
      )}

      {/* Collapse + dismiss */}
      <button
        type="button"
        onClick={onCollapse}
        aria-label="Collapse geo lens"
        className="rounded-md p-1.5 text-text-dim hover:bg-bg-elevated hover:text-text-silver"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss geo lens"
        className="rounded-md p-1.5 text-text-dim hover:bg-bg-elevated hover:text-text-silver"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface CollapsedBarProps {
  label: string;
  onExpand: () => void;
  onDismiss: () => void;
}

function CollapsedBar({ label, onExpand, onDismiss }: CollapsedBarProps) {
  return (
    <div className="safe-pad-x flex h-7 items-center gap-2 px-4 md:px-6">
      <button
        type="button"
        onClick={onExpand}
        className="flex flex-1 items-center gap-1.5 truncate text-left text-text-dim hover:text-text-silver"
        aria-label="Expand geo lens"
      >
        <Globe2 size={12} className="flex-shrink-0" aria-hidden />
        <span
          className="truncate font-mono"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {label}
        </span>
        <ChevronUp size={12} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss geo lens"
        className="rounded-md p-1 text-text-dim hover:text-text-silver"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface ReopenChipProps {
  onReopen: () => void;
  label: string;
}

function ReopenChip({ onReopen, label }: ReopenChipProps) {
  return (
    <button
      type="button"
      onClick={onReopen}
      className={cn(
        'fixed bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full',
        'border border-border bg-bg-elevated px-3 py-1.5 text-text-dim shadow-md',
        'hover:border-border-bright hover:text-text-silver',
      )}
      aria-label={`Reopen geo lens (currently ${label})`}
    >
      <Globe2 size={12} aria-hidden />
      <span className="font-mono" style={{ fontSize: '11px' }} data-size="meta">
        Geo
      </span>
    </button>
  );
}

interface PromotionToastProps {
  label: string;
  onDismiss: () => void;
}

function PromotionToast({ label, onDismiss }: PromotionToastProps) {
  return (
    <output
      aria-live="polite"
      className={cn(
        'pointer-events-auto fixed bottom-16 left-1/2 z-40 -translate-x-1/2',
        'rounded-md border border-border bg-bg-elevated px-3 py-2 shadow-lg',
        'flex items-center gap-2',
      )}
    >
      <span
        className="font-mono text-text-silver"
        style={{ fontSize: '12px' }}
      >
        We've set your location to {label} — change anytime in the bottom bar.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-1 text-text-dim hover:text-text-silver"
      >
        <X size={12} />
      </button>
    </output>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function prettyGeo(geo: GeoLocation): string {
  if (geo === 'Global') return 'Global';
  const country = countryName(geo.country) ?? geo.country;
  if (geo.country === 'US' && geo.region) {
    const region = usStateName(geo.region) ?? geo.region;
    return `${region}, US`;
  }
  return country;
}
