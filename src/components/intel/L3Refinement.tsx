import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Network } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { TaxonomyTree, findNodeByPath } from '@/components/manual/TaxonomyTree';
import type { RealmId, TreeNode } from '@/types/manual';

interface L3RefinementProps {
  selectedRealmId: RealmId | null;
  selectedL2: string | null;
  selectedL3: string | null;
  onSelectPath?: (path: string) => void;
}

/**
 * Optional "drill deeper" tree affordance.
 *
 * The L1/L2/L3 level bars live in the stacked taxonomy toolbar (RealmBar).
 * This component preserves the drill-into-tree path: once an L3 topic is
 * selected, it offers an inline tree scoped to the current context so a Bee
 * can keep drilling past L3.
 */
export function L3Refinement({
  selectedRealmId,
  selectedL2,
  selectedL3,
  onSelectPath,
}: L3RefinementProps) {
  const { tree } = useManualData();
  const [treeOpen, setTreeOpen] = useState(false);

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

  const hasDrillableContent = Boolean(
    selectedRealmId &&
      selectedL3 &&
      treeRoot &&
      treeRoot.children.length > 0,
  );

  if (!hasDrillableContent || !treeRoot) return null;

  return (
    <div className="mb-4">
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
  );
}
