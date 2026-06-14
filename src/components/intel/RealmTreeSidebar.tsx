import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import { useManualData } from '@/lib/useManualData';
import { useLensStore } from '@/stores/useLensStore';
import { REALM_ORDER, REALM_NAMES, REALM_COLORS } from '@/lib/constants';
import { cn, formatCount } from '@/lib/utils';
import type { RealmId, TreeNode } from '@/types/manual';

/** Max children rendered per expanded node — deep guard for large realms
 *  (Society is ~1,175 atoms and growing). Overflow drills via the toolbar. */
const CHILD_CAP = 60;

interface RealmTreeSidebarProps {
  realmId: RealmId;
  /** Switch to another realm (id) or exit to all realms (null). */
  onSwitchRealm: (realmId: RealmId | null) => void;
}

/**
 * Left rail for the realm-lens feed (/realm/:realmId). Drills the CURRENT
 * realm's own taxonomy (L2 → L3 → deeper), fully data-driven from the runtime
 * `tree` (built from `atoms`, so it reflects whatever the live taxonomy holds).
 *
 * Clicking a node sets useLensStore to that node's path_parts — the same store
 * the toolbar Realm popup + breadcrumb use, so all three stay in sync and the
 * feed narrows. Lazy-expand (L2 collapsed by default), active path highlighted,
 * children capped per node.
 */
export function RealmTreeSidebar({ realmId, onSwitchRealm }: RealmTreeSidebarProps) {
  const { tree } = useManualData();
  const lensRealmId = useLensStore((s) => s.realmId);
  const lensPath = useLensStore((s) => s.path);
  const setLens = useLensStore((s) => s.setLens);

  const realmName = REALM_NAMES[realmId];
  const accent = REALM_COLORS[realmId] ?? '#6B94C8';
  const realmNode = useMemo(
    () => tree.children.find((c) => c.realmId === realmId) ?? null,
    [tree, realmId],
  );

  // Active path within THIS realm (lens may point at another realm).
  const activePath = lensRealmId === realmId ? lensPath.join(' / ') : '';

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [switchOpen, setSwitchOpen] = useState(false);

  // Auto-expand the ancestors of the active node so it's visible.
  useEffect(() => {
    if (lensRealmId !== realmId || lensPath.length < 2) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (let i = 2; i < lensPath.length; i++) {
        next.add(lensPath.slice(0, i).join(' / '));
      }
      return next;
    });
  }, [lensRealmId, realmId, lensPath]);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectNode(node: TreeNode) {
    setLens(realmId, node.path.split(' / '));
    if (node.children.length > 0) {
      setExpanded((prev) => new Set(prev).add(node.path));
    }
  }

  return (
    <nav
      className="flex h-full flex-col overflow-hidden border-r border-border bg-bg-elevated/40"
      aria-label={`${realmName} taxonomy`}
    >
      {/* Realm header — switch affordance (the rail is no longer the switcher) */}
      <div className="relative flex-shrink-0 border-b border-border px-2.5 py-2">
        <button
          type="button"
          onClick={() => onSwitchRealm(null)}
          className="mb-1 flex items-center gap-1 font-mono uppercase tracking-wider text-text-muted transition-colors hover:text-text-silver"
          style={{ fontSize: '10px' }}
          data-size="meta"
        >
          <ArrowLeft size={10} /> All realms
        </button>
        <button
          type="button"
          onClick={() => setSwitchOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-bg"
          aria-expanded={switchOpen}
          title="Switch realm"
        >
          <span className="truncate font-display tracking-wide" style={{ fontSize: '15px', color: accent, fontWeight: 600 }}>
            {realmName}
          </span>
          <ChevronDown size={13} className={cn('flex-shrink-0 text-text-muted transition-transform', switchOpen && 'rotate-180')} />
        </button>

        {switchOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop scrim; dropdown items are keyboard-reachable, Esc not required for a click-away */}
            <div className="fixed inset-0 z-40" onClick={() => setSwitchOpen(false)} aria-hidden="true" />
            <div className="absolute left-2 right-2 z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-xl">
              {REALM_ORDER.map((rid) => (
                <button
                  key={rid}
                  type="button"
                  onClick={() => {
                    setSwitchOpen(false);
                    onSwitchRealm(rid);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-bg',
                    rid === realmId ? 'text-text' : 'text-text-silver',
                  )}
                  style={{ fontSize: '12.5px' }}
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: REALM_COLORS[rid] }} />
                  {REALM_NAMES[rid]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tree */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {/* Whole-realm row */}
        <Row
          label={`All ${realmName}`}
          depth={0}
          active={activePath === realmName}
          accent={accent}
          hasChildren={false}
          expanded={false}
          onToggle={() => {}}
          onSelect={() => setLens(realmId, [realmName])}
        />

        {realmNode?.children.length ? (
          realmNode.children.map((node) => (
            <TreeNodeRow
              key={node.path}
              node={node}
              depth={1}
              expandedSet={expanded}
              activePath={activePath}
              accent={accent}
              onToggle={toggle}
              onSelect={selectNode}
            />
          ))
        ) : (
          <p className="px-3 py-2 text-text-muted" style={{ fontSize: '11px' }}>
            No sub-topics in this realm yet.
          </p>
        )}
      </div>
    </nav>
  );
}

function TreeNodeRow({
  node,
  depth,
  expandedSet,
  activePath,
  accent,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expandedSet: Set<string>;
  activePath: string;
  accent: string;
  onToggle: (path: string) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedSet.has(node.path);
  const isActive = activePath === node.path;
  const onPath = activePath.startsWith(`${node.path} / `);
  const shown = hasChildren && isExpanded ? node.children.slice(0, CHILD_CAP) : [];
  const overflow = hasChildren && isExpanded ? node.children.length - shown.length : 0;

  return (
    <>
      <Row
        label={node.name}
        depth={depth}
        count={node.atomCount}
        active={isActive}
        onPath={onPath}
        accent={accent}
        hasChildren={hasChildren}
        expanded={isExpanded}
        onToggle={() => onToggle(node.path)}
        onSelect={() => onSelect(node)}
      />
      {shown.map((child) => (
        <TreeNodeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedSet={expandedSet}
          activePath={activePath}
          accent={accent}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
      {overflow > 0 && (
        <div
          className="truncate py-0.5 font-mono text-text-muted"
          style={{ fontSize: '10px', paddingLeft: `${(depth + 1) * 12 + 22}px` }}
          data-size="meta"
        >
          +{overflow} more — drill via the Realm toolbar
        </div>
      )}
    </>
  );
}

function Row({
  label,
  depth,
  count,
  active,
  onPath,
  accent,
  hasChildren,
  expanded,
  onToggle,
  onSelect,
}: {
  label: string;
  depth: number;
  count?: number;
  active: boolean;
  onPath?: boolean;
  accent: string;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-0.5 pr-2 transition-colors',
        active ? 'bg-bg' : 'hover:bg-bg/60',
      )}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-text-muted hover:text-text-silver"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      ) : (
        <span className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-left"
        style={{ fontSize: '12.5px' }}
      >
        <span
          className={cn('truncate tracking-wide', !active && !onPath && 'text-text-silver')}
          style={active ? { color: accent, fontWeight: 600 } : onPath ? { color: '#C8D1DA' } : undefined}
        >
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="flex-shrink-0 font-mono tabular-nums text-text-muted" style={{ fontSize: '10px' }} data-size="meta">
            {formatCount(count)}
          </span>
        )}
      </button>
    </div>
  );
}
