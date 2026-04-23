import { useMemo, useState } from 'react';
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

  // Build the tree scope: narrow to the current branch
  const treeRoot = useMemo(() => {
    if (!tree || !selectedRealm) return null;
    const realmNode = tree.children.find((c) => c.name === selectedRealm);
    if (!realmNode) return null;

    if (selectedFront) {
      // Find the Front branch under the realm
      // In the data, Fronts are typically at depth 2 (Power / FRONT_NAME)
      const frontNode =
        realmNode.children.find((c) => c.name === selectedFront) ||
        findNodeByPath(realmNode, `${selectedRealm} / ${selectedFront}`);
      return frontNode ?? null;
    }

    if (selectedL2) {
      // Find the L2 branch under realm
      const l2Node = realmNode.children.find((c) => c.name === selectedL2);
      return l2Node ?? null;
    }

    return realmNode;
  }, [tree, selectedRealm, selectedFront, selectedL2]);

  if (l3Options.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {/* Flat L3 scroll bar */}
      <div className="rounded-lg border border-border bg-bg-elevated/40">
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

      {/* Drill deeper toggle */}
      {treeRoot && (
        <div>
          <button
            type="button"
            onClick={() => setTreeOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated/40 px-2.5 py-1 text-text-dim transition-colors hover:border-border-bright hover:text-text-silver"
            style={{ fontSize: '11px' }}
          >
            <Network size={11} />
            <span>Drill deeper</span>
            {treeOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {treeOpen && (
            <div className="mt-2 rounded-lg border border-border bg-bg-elevated/40 p-2">
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
