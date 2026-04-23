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

  // Build the tree scope: scope to the SELECTED L3's branch only.
  // The tree answers "what's under the L3 you picked?"
  const treeRoot = useMemo(() => {
    if (!tree || !selectedRealm || !selectedL3) return null;
    const realmNode = tree.children.find((c) => c.name === selectedRealm);
    if (!realmNode) return null;

    // Walk down to find the L3 node. L3 sits under either Front/L2 or realm directly.
    // Strategy: find any node in the realm subtree whose name === selectedL3 AND whose
    // parent chain matches the front/L2 context.
    function findL3(node: import('@/types/manual').TreeNode): import('@/types/manual').TreeNode | null {
      // match by name at depth >= 2
      if (node.name === selectedL3 && node.depth >= 2) return node;
      for (const child of node.children) {
        const found = findL3(child);
        if (found) return found;
      }
      return null;
    }

    // If a Front or L2 is selected, narrow search to that branch first for accuracy
    let searchRoot: import('@/types/manual').TreeNode = realmNode;
    if (selectedFront) {
      const frontNode =
        realmNode.children.find((c) => c.name === selectedFront) ||
        findNodeByPath(realmNode, `${selectedRealm} / ${selectedFront}`);
      if (frontNode) searchRoot = frontNode;
    } else if (selectedL2) {
      const l2Node = realmNode.children.find((c) => c.name === selectedL2);
      if (l2Node) searchRoot = l2Node;
    }

    return findL3(searchRoot);
  }, [tree, selectedRealm, selectedFront, selectedL2, selectedL3]);

  if (l3Options.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {/* Flat L3 scroll bar */}
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

      {/* Drill deeper — only when L3 is selected and has children to drill into */}
      {treeRoot && treeRoot.children.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setTreeOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-text-dim transition-colors hover:border-border-bright hover:text-text-silver"
            style={{ fontSize: '11px' }}
          >
            <Network size={11} />
            <span>Drill deeper into {selectedL3}</span>
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
