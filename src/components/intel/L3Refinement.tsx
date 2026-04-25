import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Network } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { ScrollRow } from '@/components/ui/ScrollRow';
import { TaxonomyTree, findNodeByPath } from '@/components/manual/TaxonomyTree';
import { cn } from '@/lib/utils';
import type { RealmId, TreeNode } from '@/types/manual';

interface L3RefinementProps {
  selectedRealmId: RealmId | null;
  selectedL2: string | null;
  selectedL3: string | null;
  onSelectL3: (l3: string | null) => void;
  onSelectPath?: (path: string) => void;
}

/**
 * L3 refinement row + optional tree drill.
 *
 * Shown when realm + L2 are selected — flat list of L3 options under that L2.
 * Tree toggle opens an inline tree scoped to the current context below the bar.
 */
export function L3Refinement({
  selectedRealmId,
  selectedL2,
  selectedL3,
  onSelectL3,
  onSelectPath,
}: L3RefinementProps) {
  const { atoms, tree } = useManualData();
  const [treeOpen, setTreeOpen] = useState(false);

  const l3Options = useMemo(() => {
    if (!selectedRealmId || !selectedL2) return [] as string[];
    const set = new Set<string>();
    for (const a of atoms) {
      if (a.realmId !== selectedRealmId) continue;
      if (a.pathParts[1] !== selectedL2) continue;
      const l3 = a.pathParts[2];
      if (l3) set.add(l3);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [atoms, selectedRealmId, selectedL2]);

  const treeRoot = useMemo<TreeNode | null>(() => {
    if (!tree || !selectedRealmId) return null;
    const realmNode = tree.children.find((c) => c.realmId === selectedRealmId);
    if (!realmNode) return null;

    let scopePath = realmNode.path;
    if (selectedL2) scopePath = `${scopePath} / ${selectedL2}`;
    if (selectedL3) scopePath = `${scopePath} / ${selectedL3}`;

    const exact = findNodeByPath(tree, scopePath);
    if (exact) return exact;

    function findByName(node: TreeNode, name: string): TreeNode | null {
      if (node.name === name) return node;
      for (const child of node.children) {
        const found = findByName(child, name);
        if (found) return found;
      }
      return null;
    }

    let scope: TreeNode = realmNode;
    if (selectedL2) {
      const direct = realmNode.children.find((c) => c.name === selectedL2);
      scope = direct ?? findByName(realmNode, selectedL2) ?? realmNode;
    }
    if (selectedL3) {
      const l3Node = findByName(scope, selectedL3);
      if (l3Node) return l3Node;
    }
    return scope;
  }, [tree, selectedRealmId, selectedL2, selectedL3]);

  if (l3Options.length === 0 && !treeRoot) return null;

  const hasDrillableContent = Boolean(
    selectedRealmId &&
      selectedL3 &&
      treeRoot &&
      treeRoot.children.length > 0,
  );

  return (
    <div className="mb-4 space-y-2">
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
