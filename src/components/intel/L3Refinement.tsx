import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Network } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { FRONT_ORDER } from '@/lib/constants';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { TaxonomyTree, findNodeByPath } from '@/components/manual/TaxonomyTree';
import { cn } from '@/lib/utils';
import type { Front } from '@/types/manual';

const FRONT_SET = new Set<string>(FRONT_ORDER);

interface L3RefinementProps {
  selectedRealm: string | null;
  selectedFront: Front | null;
  selectedL2: string | null;
  selectedL3: string | null;
  onSelectL3: (l3: string | null) => void;
  onSelectPath?: (path: string) => void;
}

/**
 * L3 refinement row + optional tree drill.
 *
 * Flat scroll bar (always shown when context has L3 options).
 * Tree toggle opens an inline tree scoped to the current context below the scroll bar.
 */
export function L3Refinement({
  selectedRealm,
  selectedFront,
  selectedL2,
  selectedL3,
  onSelectL3,
  onSelectPath,
}: L3RefinementProps) {
  const { atoms, tree } = useManualData();
  const [treeOpen, setTreeOpen] = useState(false);

  // Auto-close the tree if L3 gets deselected (no L3 = no drill context)
  useEffect(() => {
    if (!selectedL3 && treeOpen) setTreeOpen(false);
  }, [selectedL3, treeOpen]);

  const l3Options = useMemo(() => {
    // Flat L3 list for either L2 OR Front context (no double-counting — they're exclusive)
    const hasL2Context = selectedRealm && selectedL2;
    const hasFrontContext = selectedRealm && selectedFront && !selectedL2;
    if (!hasL2Context && !hasFrontContext) return [] as string[];

    const set = new Set<string>();
    for (const a of atoms) {
      if (a.realm !== selectedRealm) continue;
      if (selectedFront && a.front !== selectedFront) continue;
      if (selectedL2 && a.L2 !== selectedL2) continue;
      if (!a.L3) continue;
      if (FRONT_SET.has(a.L3)) continue;
      set.add(a.L3);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, selectedRealm, selectedFront, selectedL2]);

  // Build the tree scope: scope to the deepest selected level.
  //  - If L3 is selected → show L3 node (children are L4s)
  //  - Else if Front or L2 is selected → show that node (children are L3s)
  //  - Else if only realm is selected → show realm (children are L2s + Fronts)
  //  - Else (no realm) → null (no scope)
  //
  // We use path-based lookup instead of name-based to avoid ambiguity
  // (e.g., "Tools" appears in many L2s — name alone isn't unique).
  const treeRoot = useMemo(() => {
    if (!tree || !selectedRealm) return null;
    const realmNode = tree.children.find((c) => c.name === selectedRealm);
    if (!realmNode) return null;

    // Build the deepest unambiguous path from selected context
    let scopePath = selectedRealm;
    if (selectedFront) {
      scopePath = `${selectedRealm} / ${selectedFront}`;
    } else if (selectedL2) {
      scopePath = `${selectedRealm} / ${selectedL2}`;
    }
    if (selectedL3) {
      scopePath = `${scopePath} / ${selectedL3}`;
    }

    // Try exact path lookup (most reliable)
    const exact = findNodeByPath(tree, scopePath);
    if (exact) return exact;

    // Fallback: if path lookup fails (rare — L3 under Front might nest differently),
    // walk down from realm using best-effort name matching
    function findByName(
      node: import('@/types/manual').TreeNode,
      name: string,
    ): import('@/types/manual').TreeNode | null {
      if (node.name === name) return node;
      for (const child of node.children) {
        const found = findByName(child, name);
        if (found) return found;
      }
      return null;
    }

    let scope: import('@/types/manual').TreeNode = realmNode;
    if (selectedFront) {
      const frontNode = realmNode.children.find((c) => c.name === selectedFront);
      if (frontNode) scope = frontNode;
    } else if (selectedL2) {
      const direct = realmNode.children.find((c) => c.name === selectedL2);
      scope = direct ?? findByName(realmNode, selectedL2) ?? realmNode;
    }

    if (selectedL3) {
      const l3Node = findByName(scope, selectedL3);
      if (l3Node) return l3Node;
    }
    return scope;
  }, [tree, selectedRealm, selectedFront, selectedL2, selectedL3]);

  // Don't render if no flat options AND no tree root (i.e., no realm/front/l2 context)
  if (l3Options.length === 0 && !treeRoot) return null;

  // Drill Deeper should only appear if the tree actually shows something
  // NEW beyond the flat bar — i.e., at least one of treeRoot's children has its
  // own children. Otherwise the tree just duplicates what's already in the
  // flat bar, which is noise.
  const hasDrillableContent = Boolean(
    treeRoot &&
      treeRoot.children.length > 0 &&
      treeRoot.children.some((c) => c.children.length > 0),
  );

  return (
    <div className="mb-4 space-y-2">
      {/* Flat L3 scroll bar — only if we have L3 options for the context */}
      {l3Options.length > 0 && (
      <div className="rounded-lg border border-border bg-bg-elevated">
        <ScrollRow>
          <button
            type="button"
            onClick={() => onSelectL3(null)}
            className={cn(
              'flex-shrink-0 rounded-md border px-2.5 py-1 transition-colors',
              selectedL3 === null
                ? 'border-text-silver/40 bg-bg text-text'
                : 'border-transparent text-text-dim hover:border-border hover:text-text-silver',
            )}
            style={{ fontSize: '12px' }}
          >
            All
          </button>
          {l3Options.map((l3) => (
            <button
              key={l3}
              type="button"
              onClick={() => onSelectL3(selectedL3 === l3 ? null : l3)}
              className={cn(
                'flex-shrink-0 rounded-md border px-2.5 py-1 transition-colors',
                selectedL3 === l3
                  ? 'border-text-silver/40 bg-bg text-text'
                  : 'border-transparent text-text-silver hover:border-border hover:bg-bg',
              )}
              style={{ fontSize: '12px' }}
            >
              {l3}
            </button>
          ))}
        </ScrollRow>
      </div>
      )}

      {/* Drill deeper — only when tree has content that goes deeper than the flat bar */}
      {hasDrillableContent && treeRoot && (
        <div>
          <button
            type="button"
            onClick={() => setTreeOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-text-dim transition-colors hover:border-border-bright hover:text-text-silver"
            style={{ fontSize: '11px' }}
          >
            <Network size={11} />
            <span>Drill deeper into {treeRoot.name}</span>
            {treeOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {treeOpen && (
            <div className="mt-2 rounded-lg border border-border bg-bg-elevated p-2">
              <TaxonomyTree
                root={treeRoot}
                mode="single-path"
                selectedPath={undefined}
                onSelectPath={(path) => {
                  if (onSelectPath) onSelectPath(path);
                }}
                hideRoot={true}
                compact={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
