import { useMemo, useState } from 'react';
import { Search, X, Plus, Check, Network, FolderTree } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { REALM_ORDER, FRONT_COLORS } from '@/lib/constants';
import { TaxonomyTree } from '@/components/manual/TaxonomyTree';
import type { TreeNode } from '@/types/manual';
import { cn } from '@/lib/utils';

interface CategoryPickerProps {
  /** Selected category paths (full paths like "Power / INVESTIGATE / 9/11") */
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
  placeholder?: string;
  label?: string;
  error?: string;
}

/**
 * Multi-select picker for Manual categories (non-leaf branches).
 *
 * Categories = any non-leaf node (L2, L3, L4, L5). Gives posts additive
 * discoverability beyond the single primary realm/front/l2.
 *
 * Two modes:
 * - Search: type to find categories by name (ranked by path specificity)
 * - Browse: tree view, click branches to add
 */
export function CategoryPicker({
  value,
  onChange,
  max = 5,
  placeholder = 'Search categories (e.g. "9/11" or "nutrition")...',
  label = 'Categories',
  error,
}: CategoryPickerProps) {
  const { tree, loaded } = useManualData();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const [treeMode, setTreeMode] = useState(false);

  // Flatten all non-leaf nodes into a list of searchable categories
  const allCategories = useMemo(() => {
    if (!loaded || !tree) return [] as { path: string; name: string; node: TreeNode }[];
    const results: { path: string; name: string; node: TreeNode }[] = [];

    function walk(node: TreeNode) {
      // Depth 1+ (below ROOT) and has children → it's a category branch
      if (node.depth >= 1 && (node.children.length > 0 || node.depth <= 4)) {
        results.push({ path: node.path, name: node.name, node });
      }
      for (const child of node.children) walk(child);
    }
    walk(tree);
    return results;
  }, [tree, loaded]);

  // Suggestion scoring
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as typeof allCategories;
    return allCategories
      .map((cat) => {
        const nameLower = cat.name.toLowerCase();
        const pathLower = cat.path.toLowerCase();
        let score = 0;
        if (nameLower === q) score += 1000;
        else if (nameLower.startsWith(q)) score += 600;
        else if (nameLower.includes(q)) score += 300;
        if (pathLower.includes(q)) score += 80;
        // Prefer shallower categories (more general)
        score -= cat.node.depth * 5;
        return { ...cat, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [allCategories, query]);

  const atMax = value.length >= max;

  function addCategory(path: string) {
    if (value.includes(path)) return;
    if (atMax) return;
    onChange([...value, path]);
    setQuery('');
  }

  function removeCategory(path: string) {
    onChange(value.filter((p) => p !== path));
  }

  // Resolve each selected path to its node for display (badge color if Front)
  const selectedChips = useMemo(() => {
    if (!tree) return value.map((p) => ({ path: p, name: p.split(' / ').pop() ?? p, front: undefined as undefined | string }));
    return value.map((path) => {
      const findNode = (n: TreeNode): TreeNode | null => {
        if (n.path === path) return n;
        for (const c of n.children) {
          const f = findNode(c);
          if (f) return f;
        }
        return null;
      };
      const node = findNode(tree);
      return {
        path,
        name: node?.name ?? path.split(' / ').pop() ?? path,
        front: node?.front,
      };
    });
  }, [value, tree]);

  return (
    <div className="w-full">
      {/* Label + mode toggle */}
      <div className="mb-1.5 flex items-center justify-between">
        <div
          className="font-mono uppercase tracking-wider text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {label}
          <span className="ml-2 text-text-dim">
            ({value.length}/{max})
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-elevated p-0.5">
          <button
            type="button"
            onClick={() => setTreeMode(false)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 transition-colors',
              !treeMode ? 'bg-bg text-text' : 'text-text-muted hover:text-text-silver',
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
              treeMode ? 'bg-bg text-text' : 'text-text-muted hover:text-text-silver',
            )}
            style={{ fontSize: '11px' }}
          >
            <Network size={10} />
            Browse
          </button>
        </div>
      </div>

      {/* Selected chips */}
      {selectedChips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedChips.map((chip) => (
            <button
              key={chip.path}
              type="button"
              onClick={() => removeCategory(chip.path)}
              className="group flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-text-silver hover:border-kettle-unsourced/40 hover:text-text"
              style={{ fontSize: '12px' }}
              title={chip.path}
            >
              <FolderTree size={11} className="flex-shrink-0 text-text-muted" />
              <span
                className="max-w-[200px] truncate"
                style={chip.front ? { color: FRONT_COLORS[chip.front as keyof typeof FRONT_COLORS] } : undefined}
              >
                {chip.name}
              </span>
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
              placeholder={atMax ? `Max ${max} categories selected` : placeholder}
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

          {!query.trim() && focused && !atMax && (
            <p
              className="mt-1 font-mono text-text-dim"
              style={{ fontSize: '11px' }}
              data-size="meta"
            >
              Search categories (L2 and deeper). Click "Browse" to explore the tree.
            </p>
          )}

          {error && (
            <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '11px' }} data-size="meta">
              {error}
            </p>
          )}

          {showSuggestions && suggestions.length > 0 && !atMax && (
            <div className="mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-lg">
              {suggestions.map((cat) => {
                const isSelected = value.includes(cat.path);
                return (
                  <button
                    key={cat.path}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isSelected) addCategory(cat.path);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-b-0',
                      'hover:bg-bg',
                      isSelected && 'cursor-default opacity-50',
                    )}
                  >
                    <FolderTree size={12} className="flex-shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-text-silver"
                        style={{
                          fontSize: '13px',
                          ...(cat.node.front
                            ? { color: FRONT_COLORS[cat.node.front] }
                            : {}),
                        }}
                      >
                        {cat.name}
                      </div>
                      <div className="path-mono truncate" style={{ fontSize: '10.5px' }}>
                        {cat.path}
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
                No categories match "{query}"
              </p>
            </div>
          )}
        </>
      )}

      {/* BROWSE MODE */}
      {treeMode && tree && loaded && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-bg-elevated p-2">
          {REALM_ORDER.map((realmName) => {
            const realmNode = tree.children.find((c) => c.name === realmName);
            if (!realmNode) return null;
            return (
              <TaxonomyTree
                key={realmName}
                root={realmNode}
                mode="single-path"
                onSelectPath={(path, node) => {
                  if (!node) return; // only add branches, not atoms
                  if (node.children.length === 0) return; // skip leaves
                  if (value.includes(path)) removeCategory(path);
                  else if (!atMax) addCategory(path);
                }}
                compact={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
