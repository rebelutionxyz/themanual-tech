import { type RealmTreeRow, fetchRealmChildren } from '@/lib/realmTree';
import { useLensStore } from '@/stores/useLensStore';
import { MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// The PLACES subtree — Geography's first level is the academic taxonomy
// (Branches / Concepts / …); the geonames places live under Countries:
// Geography → Countries → Continent → Country → State → City → Neighborhood.
// Exported so the rabbit's Realm tree + chips can EXCLUDE exactly this
// subtree (places belong to Location; academic Geography stays a topic).
export const PLACES_ROOT = ['Geography', 'Countries'];
const ROOT = PLACES_ROOT;
const LEVEL_LABELS = ['Continent', 'Country', 'Region / State', 'City', 'Neighborhood'];

/** Children cache per parent path — locations are stable per session. */
const childCache = new Map<string, RealmTreeRow[]>();
async function childrenOf(parent: string[]): Promise<RealmTreeRow[]> {
  const key = parent.join('|');
  const hit = childCache.get(key);
  if (hit) return hit;
  const rows = await fetchRealmChildren(parent);
  childCache.set(key, rows);
  return rows;
}

/**
 * Location lens panel v3 (Butch 2026-07-18): cascading selects — pick a
 * Country, the Region/State select appears, then City, then Neighborhood
 * as each level exists — SOURCED from the Geography realm tree (the
 * geonames import), so the depth is real: USA → New York → New York City
 * → SoHo. The pick is a SINGLE location driving the shared lens (replaces
 * any previous location) and displays in the LocationBadge under the
 * toolbar, upper right — not on the button.
 */
export function LocationPanel() {
  const selectedRealms = useLensStore((s) => s.selectedRealms);
  const toggleRealm = useLensStore((s) => s.toggleRealm);
  const removeRealm = useLensStore((s) => s.removeRealm);

  const current = selectedRealms.find((r) => ROOT.every((seg, i) => r.pathParts[i] === seg));
  const path = current ? current.pathParts.slice(ROOT.length) : [];
  const pathKey = path.join('|');

  // Option lists per depth: children of ROOT + path[0..depth). One level
  // beyond the current path renders when it has options ("if available").
  const [levels, setLevels] = useState<RealmTreeRow[][] | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathKey encodes path
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const built: RealmTreeRow[][] = [];
        for (let depth = 0; depth <= path.length; depth++) {
          const options = await childrenOf([...ROOT, ...path.slice(0, depth)]);
          if (options.length === 0) break;
          built.push(options);
        }
        if (!cancelled) setLevels(built);
      } catch {
        if (!cancelled) setLevels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathKey]);

  /** Set the path down to `depth` (name '' pops back to that depth). */
  function pick(depth: number, name: string) {
    const next = name ? [...path.slice(0, depth), name] : path.slice(0, depth);
    if (current) removeRealm(current.key);
    if (next.length > 0) toggleRealm([...ROOT, ...next]);
  }

  return (
    <div className="w-full p-3">
      {levels === null ? (
        <p className="font-mono text-[11px] text-zinc-400" data-size="meta">
          Loading…
        </p>
      ) : (
        levels.map((options, depth) => {
          const label = LEVEL_LABELS[depth] ?? `Level ${depth + 1}`;
          const id = `lens-loc-${depth}`;
          return (
            <div key={id}>
              <label
                className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-500"
                data-size="meta"
                htmlFor={id}
              >
                {label}
              </label>
              <select
                id={id}
                value={path[depth] ?? ''}
                onChange={(e) => pick(depth, e.target.value)}
                className="mb-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[13px] text-zinc-800"
              >
                <option value="">{depth === 0 ? 'Anywhere' : 'Any'}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })
      )}
      {path.length > 0 && (
        <button
          type="button"
          onClick={() => pick(0, '')}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <X size={12} /> Clear location
        </button>
      )}
    </div>
  );
}

/**
 * Selected-location display — upper RIGHT, directly below the toolbar
 * (Butch 2026-07-18: shown here instead of on the Location button).
 * Self-hides when no location is picked.
 *
 * The crumbs are CLICKABLE (Butch 2026-07-18): clicking "New York" pops the
 * pick back to state depth — listings from all of New York, a quick
 * click-back. The row wraps + each crumb truncates on its own, so a deep
 * pick (… · New York City · Manhattan) shows every level.
 */
export function LocationBadge() {
  const selectedRealms = useLensStore((s) => s.selectedRealms);
  const toggleRealm = useLensStore((s) => s.toggleRealm);
  const removeRealm = useLensStore((s) => s.removeRealm);
  const geo = selectedRealms.find((r) => ROOT.every((seg, i) => r.pathParts[i] === seg));
  if (!geo) return null;

  // Country · State · City · Neighborhood (drop Geography/Countries/Continent
  // noise); a continent-only pick falls back to showing the continent.
  const tailStart = ROOT.length + 1;
  const crumbs =
    geo.pathParts.length > tailStart
      ? geo.pathParts.slice(tailStart)
      : geo.pathParts.slice(ROOT.length);
  // Full-path prefix length the crumb at index i represents.
  const depthOf = (i: number) => geo.pathParts.length - crumbs.length + i + 1;

  /** Pop the location back to crumb i's depth (re-pick the shorter path). */
  const popTo = (i: number) => {
    const prefix = geo.pathParts.slice(0, depthOf(i));
    if (prefix.length >= geo.pathParts.length) return; // already the pick
    removeRealm(geo.key);
    toggleRealm(prefix);
  };

  return (
    <div className="flex flex-shrink-0 justify-end border-b border-zinc-200 bg-white px-3 py-1">
      <span
        title={geo.pathParts.join(' / ')}
        className="inline-flex min-w-0 flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-[12px] text-zinc-600"
      >
        <MapPin size={12} className="flex-shrink-0 text-zinc-400" />
        {crumbs.map((name, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span
              key={geo.pathParts.slice(0, depthOf(i)).join('|')}
              className="inline-flex min-w-0 items-center gap-x-1"
            >
              {i > 0 && (
                <span className="flex-shrink-0 text-zinc-300" aria-hidden="true">
                  ·
                </span>
              )}
              <button
                type="button"
                disabled={last}
                onClick={() => popTo(i)}
                title={last ? name : `Show all of ${name}`}
                className={
                  last
                    ? 'block max-w-[150px] cursor-default truncate font-medium text-zinc-800'
                    : 'block max-w-[150px] truncate text-zinc-500 decoration-dotted underline-offset-2 transition-colors hover:text-zinc-800 hover:underline'
                }
              >
                {name}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => removeRealm(geo.key)}
          aria-label="Clear location"
          title="Clear location"
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/10 hover:text-zinc-700"
        >
          <X size={11} />
        </button>
      </span>
    </div>
  );
}
