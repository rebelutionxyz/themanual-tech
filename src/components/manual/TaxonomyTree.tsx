import { useState, memo, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Atom, TreeNode } from '@/types/manual';
import { KETTLE_COLORS } from '@/lib/constants';
import { cn, formatCount } from '@/lib/utils';

export type TreeSelectMode = 'single-path' | 'multi-atom';

export interface TaxonomyTreeProps {
  /** Root node to render children from. Typically a single realm or a sub-branch. */
  root: TreeNode;
  /** Single-path mode: used for filter (pick one branch). Multi-atom: used for composer (pick many atoms). */
  mode: TreeSelectMode;
  /** Selected path (single-path mode) — e.g. "Justice / Government / Accountability" */
  selectedPath?: string;
  /** Selected atom IDs (multi-atom mode) */
  selectedAtomIds?: Set<string>;
  /** Called in single-path mode when a branch/atom is selected */
  onSelectPath?: (path: string, node: TreeNode | null, atom: Atom | null) => void;
  /** Called in multi-atom mode when an atom is toggled */
  onToggleAtom?: (atom: Atom) => void;
  /** Path strings that should be expanded on mount (otherwise 1 level). Format: set of paths. */
  initialExpanded?: Set<string>;
  /** Whether to hide the root node itself, only showing its children */
  hideRoot?: boolean;
  /** Max render depth from root — 0=unlimited, 1=root's children only, etc. */
  maxDepth?: number;
  /** Compact mode: smaller text/padding for inline use */
  compact?: boolean;
}

/**
 * Reusable Manual taxonomy tree. Renders a TreeNode hierarchy with expand/collapse.
 *
 * Single-path mode: click a branch/atom → sets the selected path. One selection at a time.
 * Multi-atom mode: click atom → toggles in the selected set. Multiple atoms can be selected.
 */
export function TaxonomyTree({
  root,
  mode,
  selectedPath,
  selectedAtomIds,
  onSelectPath,
  onToggleAtom,
  initialExpanded,
  hideRoot = false,
  maxDepth = 0,
  compact = false,
}: TaxonomyTreeProps) {
  // Local expansion state (not using store — this is a self-contained component)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (initialExpanded) return new Set(initialExpanded);
    // Default: expand the root itself so children are visible by default
    return new Set([root.path]);
  });

  const toggleExpanded = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (hideRoot) {
    // Render only root's children + atoms
    return (
      <div className={cn('taxonomy-tree', compact ? 'text-sm' : '')}>
        {root.children.map((child) => (
          <TreeBranch
            key={child.path}
            node={child}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpanded}
            selectedPath={selectedPath}
            selectedAtomIds={selectedAtomIds}
            onSelectPath={onSelectPath}
            onToggleAtom={onToggleAtom}
            mode={mode}
            maxDepth={maxDepth}
            compact={compact}
          />
        ))}
        {root.atoms.map((atom) => (
          <AtomRow
            key={atom.id}
            atom={atom}
            depth={0}
            mode={mode}
            selected={
              mode === 'multi-atom'
                ? selectedAtomIds?.has(atom.id) ?? false
                : selectedPath === atom.path
            }
            onSelectPath={onSelectPath}
            onToggleAtom={onToggleAtom}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('taxonomy-tree', compact ? 'text-sm' : '')}>
      <TreeBranch
        node={root}
        depth={0}
        expanded={expanded}
        onToggle={toggleExpanded}
        selectedPath={selectedPath}
        selectedAtomIds={selectedAtomIds}
        onSelectPath={onSelectPath}
        onToggleAtom={onToggleAtom}
        mode={mode}
        maxDepth={maxDepth}
        compact={compact}
      />
    </div>
  );
}

interface TreeBranchProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath?: string;
  selectedAtomIds?: Set<string>;
  onSelectPath?: (path: string, node: TreeNode | null, atom: Atom | null) => void;
  onToggleAtom?: (atom: Atom) => void;
  mode: TreeSelectMode;
  maxDepth: number;
  compact: boolean;
}

const TreeBranch = memo(function TreeBranch({
  node,
  depth,
  expanded,
  onToggle,
  selectedPath,
  selectedAtomIds,
  onSelectPath,
  onToggleAtom,
  mode,
  maxDepth,
  compact,
}: TreeBranchProps) {
  const isExpanded = expanded.has(node.path);
  const hasChildren = node.children.length > 0 || node.atoms.length > 0;
  const reachedDepthLimit = maxDepth > 0 && depth >= maxDepth;

  const isSelectedInPath = mode === 'single-path' && selectedPath === node.path;

  const fontSize = compact
    ? depth === 0
      ? '14px'
      : depth === 1
        ? '13px'
        : '12px'
    : depth === 0
      ? '15px'
      : depth === 1
        ? '14px'
        : '13px';

  function handleBranchClick() {
    if (mode === 'single-path' && onSelectPath) {
      onSelectPath(node.path, node, null);
    }
    if (hasChildren && !reachedDepthLimit) {
      onToggle(node.path);
    }
  }

  return (
    <div className="my-0.5">
      <button
        type="button"
        onClick={handleBranchClick}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors',
          'hover:bg-bg-elevated',
          isSelectedInPath && 'bg-bg-elevated',
        )}
      >
        <Caret expanded={isExpanded} hidden={!hasChildren || reachedDepthLimit} />
        <span
          className={cn(
            'truncate',
            depth === 0 && 'font-medium text-text',
            depth === 1 && 'text-text-silver',
            depth >= 2 && 'text-text-dim',
            isSelectedInPath && 'text-text',
          )}
          style={{ fontSize }}
        >
          {node.name}
        </span>
        <span
          className="ml-auto flex-shrink-0 font-mono text-text-muted"
          style={{ fontSize: '10.5px' }}
          data-size="meta"
        >
          {formatCount(node.atomCount)}
        </span>
      </button>

      {isExpanded && hasChildren && !reachedDepthLimit && (
        <div className="ml-3 border-l border-border pl-2">
          {node.children.map((c) => (
            <TreeBranch
              key={c.path}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              selectedAtomIds={selectedAtomIds}
              onSelectPath={onSelectPath}
              onToggleAtom={onToggleAtom}
              mode={mode}
              maxDepth={maxDepth}
              compact={compact}
            />
          ))}
          {node.atoms.map((atom) => (
            <AtomRow
              key={atom.id}
              atom={atom}
              depth={depth + 1}
              mode={mode}
              selected={
                mode === 'multi-atom'
                  ? selectedAtomIds?.has(atom.id) ?? false
                  : selectedPath === atom.path
              }
              onSelectPath={onSelectPath}
              onToggleAtom={onToggleAtom}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface AtomRowProps {
  atom: Atom;
  depth: number;
  mode: TreeSelectMode;
  selected: boolean;
  onSelectPath?: (path: string, node: TreeNode | null, atom: Atom | null) => void;
  onToggleAtom?: (atom: Atom) => void;
  compact: boolean;
}

function AtomRow({ atom, mode, selected, onSelectPath, onToggleAtom, compact }: AtomRowProps) {
  const kettleColor = KETTLE_COLORS[atom.kettle] ?? '#C8D1DA';

  function handleClick() {
    if (mode === 'multi-atom' && onToggleAtom) {
      onToggleAtom(atom);
    } else if (mode === 'single-path' && onSelectPath) {
      onSelectPath(atom.path, null, atom);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors',
        'hover:bg-bg-elevated',
        selected && 'bg-bg-elevated',
      )}
    >
      {/* Indent to align with branch label (no chevron for atoms) */}
      <span className="w-3 flex-shrink-0" aria-hidden="true" />
      {/* Kettle dot */}
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: kettleColor }}
        aria-hidden="true"
      />
      <span
        className={cn('truncate text-text-silver', selected && 'text-text')}
        style={{ fontSize: compact ? '12px' : '13px' }}
      >
        {atom.name}
      </span>
      {mode === 'multi-atom' && selected && (
        <span
          className="ml-auto flex-shrink-0 font-mono text-honey"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          ✓
        </span>
      )}
    </button>
  );
}

function Caret({ expanded, hidden }: { expanded: boolean; hidden?: boolean }) {
  if (hidden) return <span className="w-3 flex-shrink-0" aria-hidden="true" />;
  return (
    <ChevronRight
      size={12}
      className={cn(
        'flex-shrink-0 text-text-muted transition-transform',
        expanded && 'rotate-90',
      )}
    />
  );
}

/**
 * Utility: find a node in the tree by path.
 */
export function findNodeByPath(root: TreeNode, path: string): TreeNode | null {
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findNodeByPath(child, path);
    if (found) return found;
  }
  return null;
}
