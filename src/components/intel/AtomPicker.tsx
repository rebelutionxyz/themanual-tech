import { useMemo, useState } from 'react';
import { Search, X, Plus, Check, Network } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { KETTLE_COLORS } from '@/lib/constants';
import { TaxonomyTree } from '@/components/manual/TaxonomyTree';
import type { Atom, RealmId } from '@/types/manual';
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
  /** Error message to display */
  error?: string;
  /**
   * Context to prioritize atoms from a specific realm/l2.
   * These don't restrict selection — they just rank them higher when user types.
   */
  realmContext?: {
    realmId?: RealmId | null;
    l2?: string | null;
  };
  /** Hide suggestions panel until user starts typing */
  searchOnly?: boolean;
}

/**
 * Universal atom picker — used in every composer UI where Bees link to the Manual.
 */
export function AtomPicker({
  value,
  onChange,
  max,
  placeholder = 'Search atoms (e.g. "jfk" or "fed")...',
  label,
  error,
  realmContext,
  searchOnly = true,
}: AtomPickerProps) {
  const { atoms, loaded, tree } = useManualData();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const [treeMode, setTreeMode] = useState(false);

  const atomById = useMemo(() => {
    const m = new Map<string, Atom>();
    for (const a of atoms) m.set(a.id, a);
    return m;
  }, [atoms]);

  const selectedAtoms = useMemo(
    () => value.map((id) => atomById.get(id)).filter((a): a is Atom => !!a),
    [value, atomById],
  );

  function scoreAtom(atom: Atom, q: string): number {
    const nameLower = atom.name.toLowerCase();
    let score = 0;

    if (q) {
      if (nameLower === q) score += 1000;
      else if (nameLower.startsWith(q)) score += 600;
      else if (nameLower.includes(q)) score += 300;
      if (atom.path.toLowerCase().includes(q)) score += 100;
      if (atom.themeTags.some((t) => t.toLowerCase().includes(q))) score += 50;
    }

    if (realmContext?.realmId && atom.realmId === realmContext.realmId) score += 40;
    if (realmContext?.l2 && atom.pathParts[1] === realmContext.l2) score += 20;

    if (atom.isLeaf) score += 5;
    if (atom.kettle === 'Accepted') score += 3;

    return score;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: scoreAtom is component-scoped and re-created each render; deps list captures all reactive inputs intentionally
  const suggestions = useMemo(() => {
    if (!loaded) return [];

    const q = query.trim().toLowerCase();

    if (searchOnly && !q) return [];

    let pool = atoms;
    if (!q && realmContext?.realmId) {
      pool = pool.filter((a) => a.realmId === realmContext.realmId);
      if (realmContext.l2) pool = pool.filter((a) => a.pathParts[1] === realmContext.l2);
    }

    if (!q) {
      return pool
        .filter((a) => a.isLeaf)
        .sort((a, b) => scoreAtom(b, '') - scoreAtom(a, ''))
        .slice(0, 20);
    }

    return atoms
      .map((a) => ({ atom: a, score: scoreAtom(a, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.atom);
  }, [atoms, loaded, query, searchOnly, realmContext?.realmId, realmContext?.l2]);

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

  const hasContextHint =
    !searchOnly === false &&
    realmContext?.realmId &&
    !query.trim();

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <div
            className="font-mono uppercase tracking-wider text-text-muted"
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
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-elevated p-0.5">
            <button
              type="button"
              onClick={() => setTreeMode(false)}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
                !treeMode
                  ? 'bg-bg text-text'
                  : 'text-text-muted hover:text-text-silver',
              )}
              style={{ fontSize: '11px' }}
            >
              <Search size={10} />
              Search
            </button>
            <button
              type="button"
              onClick={() => setTreeMode(true)}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
                treeMode
                  ? 'bg-bg text-text'
                  : 'text-text-muted hover:text-text-silver',
              )}
              style={{ fontSize: '11px' }}
            >
              <Network size={10} />
              Browse
            </button>
          </div>
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

      {/* SEARCH MODE */}
      {!treeMode && (
        <>
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
              onFocus={() => {
                setFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => {
                setFocused(false);
                setTimeout(() => setShowSuggestions(false), 150);
          }}
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

      {hasContextHint && (
        <p
          className="mt-1 font-mono text-text-dim"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Showing atoms from{' '}
          <span className="text-text-silver">
            {realmContext!.realmId}
            {realmContext!.l2 && ` · ${realmContext!.l2}`}
          </span>
          . Type to search all atoms.
        </p>
      )}

      {searchOnly && !query.trim() && focused && suggestions.length === 0 && !atMax && (
        <div className="mt-1 rounded-md border border-border bg-bg-elevated px-3 py-2">
          <p className="text-text-muted" style={{ fontSize: '12px' }}>
            Type to search 4,860 Manual atoms
          </p>
        </div>
      )}

      {error && (
        <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '11px' }} data-size="meta">
          {error}
        </p>
      )}

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
                  <div className="path-mono truncate" style={{ fontSize: '10.5px' }}>
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

      {showSuggestions && query.trim() && suggestions.length === 0 && (
        <div className="mt-1 rounded-md border border-border bg-bg-elevated px-3 py-2">
          <p className="text-text-muted" style={{ fontSize: '12px' }}>
            No atoms match "{query}"
          </p>
        </div>
      )}
        </>
      )}

      {/* TREE MODE */}
      {treeMode && tree && loaded && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-bg-elevated p-2">
          {tree.children.map((realmNode) => (
            <TaxonomyTree
              key={realmNode.path}
              root={realmNode}
              mode="multi-atom"
              selectedAtomIds={new Set(value)}
              onToggleAtom={(atom) => {
                if (value.includes(atom.id)) {
                  removeAtom(atom.id);
                } else if (!atMax) {
                  addAtom(atom);
                }
              }}
              compact={true}
              maxDepth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
