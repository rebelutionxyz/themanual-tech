import { KETTLE_COLORS } from '@/lib/constants';
import { realmDepth, realmDepthTone } from '@/lib/spine';
import { cn, formatCount } from '@/lib/utils';
import { useManualStore } from '@/stores/useManualStore';
import type { Atom, TreeNode } from '@/types/manual';
import { ChevronRight, Network } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

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
      <div className="group flex w-full items-center gap-2 rounded px-1.5 hover:bg-bg-elevated transition-colors">
        <button
          type="button"
          onClick={() => toggleExpanded(node.path)}
          className="flex flex-1 items-center gap-2 py-1.5 text-left"
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
        <GraphLaunch path={node.path} />
      </div>
      {/* SPINE 4 — THE L1–L4 TONAL DEPTH GRADIENT. This is the realm outline on
          /manual: the realm toolbar a reader actually meets. A realm root is L1,
          so the children it wraps are L2. Deeper taxonomy = lighter tone, drawn
          from the locked April-20 palette ladder, so depth is legible from the
          fill before any label is read. */}
      {isExpanded && (
        <div
          className="ml-3 mt-1 rounded-r border-l pl-3"
          style={realmDepthTone(2)}
          data-spine="realm-depth"
          data-depth-level={realmDepth(2)}
        >
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

function GraphLaunch({ path }: { path: string }) {
  const setView = useManualStore((s) => s.setView);
  const setGraphCenter = useManualStore((s) => s.setGraphCenter);
  return (
    <button
      type="button"
      title="Launch graph from here"
      onClick={(e) => {
        e.stopPropagation();
        setGraphCenter({ path });
        setView('graph');
      }}
      className="shrink-0 rounded p-1 text-text-muted opacity-0 transition-opacity hover:text-text-silver group-hover:opacity-100"
    >
      <Network size={13} />
    </button>
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
      <div className="group flex w-full items-center gap-1.5 rounded px-1.5 hover:bg-bg-elevated transition-colors">
        <button
          type="button"
          onClick={() => hasChildren && toggleExpanded(node.path)}
          className="flex flex-1 items-center gap-1.5 py-1 text-left"
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
        {hasChildren && <GraphLaunch path={node.path} />}
      </div>
      {/* SPINE 4 — one step further up the ramp per nesting level. A node at
          `depth` wraps children at depth+1, which are taxonomy level depth+2.
          `realmDepthTone` clamps past L4: the fill is a depth CUE, not a
          counter, and a fifth distinguishable step does not exist here. */}
      {isExpanded && hasChildren && (
        <div
          className="ml-3 rounded-r border-l pl-3"
          style={realmDepthTone(depth + 2)}
          data-spine="realm-depth"
          data-depth-level={realmDepth(depth + 2)}
        >
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
  // Alias ghosts resolve to the one canonical atom on click + for selection.
  const targetId = atom.canonicalId ?? atom.id;
  const isSelected = selectedAtomId === targetId;

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => selectAtom(targetId)}
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
      <span
        className={cn(
          'truncate text-sm group-hover:text-text',
          atom.isAlias ? 'italic text-text-muted' : 'text-text-silver',
        )}
      >
        {atom.name}
      </span>
      {atom.isAlias && (
        <span
          className="flex-shrink-0 font-mono text-text-muted"
          style={{ fontSize: '10px' }}
          data-size="meta"
          title="Alias — this atom's canonical home is in another realm"
        >
          ↳ alias
        </span>
      )}
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
