import { useMemo, useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { KETTLE_COLORS } from '@/lib/constants';
import type { Atom } from '@/types/manual';
import { cn } from '@/lib/utils';

interface AtomPickerProps {
  /** Currently-selected atom ids */
  value: string[];
  /** Called when selection changes */
  onChange: (atomIds: string[]) => void;
  /** Max atoms user can select. Default: unlimited */
  max?: number;
  /** Placeholder search text */
  placeholder?: string;
  /** Label shown above picker */
  label?: string;
  /** Hide unselected suggestions until user types */
  searchOnly?: boolean;
  /** Bind to a specific realm (pre-filter) */
  realmFilter?: string | null;
  /** Error message to display */
  error?: string;
}

/**
 * Universal atom picker — used in every composer UI where Bees link to the Manual.
 *
 * Shows:
 * - Chips for currently-selected atoms (removable)
 * - Search input with live filtering
 * - Suggestion list under search (top 20 matches)
 *
 * Uses atoms.json loaded in memory (no network calls).
 */
export function AtomPicker({
  value,
  onChange,
  max,
  placeholder = 'Search atoms...',
  label,
  searchOnly = false,
  realmFilter,
  error,
}: AtomPickerProps) {
  const { atoms, loaded } = useManualData();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const atomById = useMemo(() => {
    const m = new Map<string, Atom>();
    for (const a of atoms) m.set(a.id, a);
    return m;
  }, [atoms]);

  const selectedAtoms = useMemo(
    () => value.map((id) => atomById.get(id)).filter((a): a is Atom => !!a),
    [value, atomById],
  );

  // Search logic — name + path match, optionally pre-filtered by realm
  const suggestions = useMemo(() => {
    if (!loaded) return [];
    if (searchOnly && !query.trim()) return [];

    const q = query.trim().toLowerCase();
    let pool = atoms;
    if (realmFilter) pool = pool.filter((a) => a.realm === realmFilter);

    if (!q) {
      // No query — return curated defaults (leaves only, sourced kettle state preferred)
      return pool
        .filter((a) => a.isLeaf)
        .sort((a, b) => {
          // Sourced atoms first
          if (a.kettle === 'Sourced' && b.kettle !== 'Sourced') return -1;
          if (b.kettle === 'Sourced' && a.kettle !== 'Sourced') return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 20);
    }

    // Query present — score + filter
    return pool
      .map((a) => {
        const nameLower = a.name.toLowerCase();
        let score = 0;
        if (nameLower === q) score += 100;
        else if (nameLower.startsWith(q)) score += 60;
        else if (nameLower.includes(q)) score += 30;
        if (a.path.toLowerCase().includes(q)) score += 10;
        if (a.themeTags.some((t) => t.toLowerCase().includes(q))) score += 5;
        return { atom: a, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.atom);
  }, [atoms, loaded, query, realmFilter, searchOnly]);

  const atMax = typeof max === 'number' && value.length >= max;

  function addAtom(atom: Atom) {
    if (value.includes(atom.id)) return;
    if (atMax) return;
    onChange([...value, atom.id]);
    setQuery('');
  }

  function removeAtom(atomId: string) {
    onChange(value.filter((id) => id !== atomId));
  }

  return (
    <div className="w-full">
      {label && (
        <div
          className="mb-1.5 font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {label}
          {typeof max === 'number' && (
            <span className="ml-2 text-text-dim">
              ({value.length}/{max})
            </span>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selectedAtoms.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedAtoms.map((atom) => (
            <button
              key={atom.id}
              type="button"
              onClick={() => removeAtom(atom.id)}
              className="group flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-text-silver hover:border-kettle-unsourced/40 hover:text-text"
              style={{ fontSize: '12px' }}
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: KETTLE_COLORS[atom.kettle] }}
              />
              <span className="max-w-[200px] truncate">{atom.name}</span>
              <X size={12} className="text-text-muted group-hover:text-text" />
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={atMax ? `Max ${max} atoms selected` : placeholder}
          disabled={atMax}
          className={cn(
            'w-full rounded-md border bg-bg py-2 pl-8 pr-3 text-sm text-text placeholder:text-text-muted',
            'focus:outline-none focus:ring-1',
            error
              ? 'border-kettle-unsourced/50 focus:border-kettle-unsourced/70 focus:ring-kettle-unsourced/40'
              : 'border-border focus:border-text-silver/50 focus:ring-text-silver/30',
            atMax && 'cursor-not-allowed opacity-60',
          )}
        />
      </div>

      {error && (
        <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '11px' }} data-size="meta">
          {error}
        </p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !atMax && (
        <div className="mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
          {suggestions.map((atom) => {
            const isSelected = value.includes(atom.id);
            return (
              <button
                key={atom.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!isSelected) addAtom(atom);
                }}
                className={cn(
                  'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-b-0',
                  'hover:bg-bg',
                  isSelected && 'cursor-default opacity-50',
                )}
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: KETTLE_COLORS[atom.kettle] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-text-silver" style={{ fontSize: '13px' }}>
                    {atom.name}
                  </div>
                  <div
                    className="path-mono truncate"
                    style={{ fontSize: '10.5px' }}
                  >
                    {atom.path}
                  </div>
                </div>
                {isSelected ? (
                  <Check size={14} className="flex-shrink-0 text-kettle-sourced" />
                ) : (
                  <Plus size={14} className="flex-shrink-0 text-text-muted" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && query.trim() && (
        <div className="mt-1 rounded-md border border-border bg-bg-elevated px-3 py-2">
          <p className="text-text-muted" style={{ fontSize: '12px' }}>
            No atoms match "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
