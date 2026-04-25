import { memo, useCallback, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Atom, TreeNode } from '@/types/manual';
import { useManualStore } from '@/stores/useManualStore';
import { cn, formatCount } from '@/lib/utils';
import { KETTLE_COLORS } from '@/lib/constants';

interface OutlookViewProps {
  tree: TreeNode;
}

export function OutlookView({ tree }: OutlookViewProps) {
  const searchQuery = useManualStore((s) => s.searchQuery);
  const selectedRealmId = useManualStore((s) => s.selectedRealmId);
  const selectedKettle = useManualStore((s) => s.selectedKettle);
  const selectedTags = useManualStore((s) => s.selectedTags);

  const roots = useMemo(() => {
    if (selectedRealmId) {
      return tree.children.filter((c) => c.realmId === selectedRealmId);
    }
    return tree.children;
  }, [tree, selectedRealmId]);

  const matches = useCallback(
    (atom: Atom): boolean => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !atom.name.toLowerCase().includes(q) &&
          !atom.path.toLowerCase().includes(q) &&
          !atom.themeTags.some((t) => t.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (selectedKettle && atom.kettle !== selectedKettle) return false;
      if (selectedTags.length > 0) {
        const hasAll = selectedTags.every((t) => atom.themeTags.includes(t));
        if (!hasAll) return false;
      }
      return true;
    },
    [searchQuery, selectedKettle, selectedTags],
  );

  return (
    <div className="px-4 py-3 md:px-6 md:py-4">
      {roots.map((root) => (
        <RealmBranch key={root.path} node={root} matches={matches} />
      ))}
    </div>
  );
}

interface BranchProps {
  node: TreeNode;
  matches: (atom: Atom) => boolean;
}

function RealmBranch({ node, matches }: BranchProps) {
  const expandedPaths = useManualStore((s) => s.expandedPaths);
  const toggleExpanded = useManualStore((s) => s.toggleExpanded);
  const isExpanded = expandedPaths.has(node.path);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => toggleExpanded(node.path)}
        className={cn(
          'group flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left',
          'hover:bg-bg-elevated transition-colors',
        )}
      >
        <Caret expanded={isExpanded} />
        <span className="font-display text-xl font-semibold text-text-silver-bright tracking-wide">
          {node.name}
        </span>
        <span
          className="ml-auto font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {formatCount(node.atomCount)}
        </span>
      </button>
      {isExpanded && (
        <div className="ml-3 mt-1 border-l border-border pl-3">
          {node.children.map((c) => (
            <TreeBranch key={c.path} node={c} matches={matches} depth={1} />
          ))}
          {node.atoms.map((a) => (
            <AtomRow key={a.id} atom={a} visible={matches(a)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeBranchProps extends BranchProps {
  depth: number;
}

const TreeBranch = memo(function TreeBranch({ node, matches, depth }: TreeBranchProps) {
  const expandedPaths = useManualStore((s) => s.expandedPaths);
  const toggleExpanded = useManualStore((s) => s.toggleExpanded);
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children.length > 0 || node.atoms.length > 0;

  return (
    <div className="my-0.5">
      <button
        type="button"
        onClick={() => hasChildren && toggleExpanded(node.path)}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left',
          'hover:bg-bg-elevated transition-colors',
        )}
      >
        <Caret expanded={isExpanded} hidden={!hasChildren} />
        <span
          className={cn(
            depth === 1 && 'text-[15px] font-medium text-text',
            depth === 2 && 'text-sm text-text-silver',
            depth >= 3 && 'text-sm text-text-dim',
          )}
        >
          {node.name}
        </span>
        <span
          className="ml-auto font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {formatCount(node.atomCount)}
        </span>
      </button>
      {isExpanded && hasChildren && (
        <div className="ml-3 border-l border-border pl-3">
          {node.children.map((c) => (
            <TreeBranch key={c.path} node={c} matches={matches} depth={depth + 1} />
          ))}
          {node.atoms.map((a) => (
            <AtomRow key={a.id} atom={a} visible={matches(a)} />
          ))}
        </div>
      )}
    </div>
  );
});

interface AtomRowProps {
  atom: Atom;
  visible: boolean;
}

function AtomRow({ atom, visible }: AtomRowProps) {
  const selectAtom = useManualStore((s) => s.selectAtom);
  const selectedAtomId = useManualStore((s) => s.selectedAtomId);
  const isSelected = selectedAtomId === atom.id;

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => selectAtom(atom.id)}
      className={cn(
        'group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left',
        'hover:bg-bg-elevated transition-colors',
        isSelected && 'bg-text-silver/10 ring-1 ring-text-silver/30',
      )}
    >
      <span className="w-3 flex-shrink-0 text-center">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: KETTLE_COLORS[atom.kettle] }}
        />
      </span>
      <span className="truncate text-sm text-text-silver group-hover:text-text">
        {atom.name}
      </span>
      {atom.themeTags.length > 0 && (
        <span
          className="ml-auto truncate font-mono text-text-muted"
          style={{ fontSize: '11px', maxWidth: '260px' }}
          data-size="meta"
        >
          {atom.themeTags.slice(0, 3).join(' · ')}
        </span>
      )}
    </button>
  );
}

function Caret({ expanded, hidden }: { expanded: boolean; hidden?: boolean }) {
  return (
    <ChevronRight
      size={14}
      className={cn(
        'flex-shrink-0 text-text-muted transition-transform',
        expanded && 'rotate-90',
        hidden && 'invisible',
      )}
    />
  );
}
