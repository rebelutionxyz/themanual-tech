import { useMemo } from 'react';
import { REALM_ORDER, REALM_NAMES, REALM_ID_BY_NAME } from '@/lib/constants';
import { useManualData } from '@/lib/useManualData';
import { cn } from '@/lib/utils';
import type { RealmId, TreeNode } from '@/types/manual';

interface RealmPathPickerProps {
  /** Selected taxonomy path as display names, e.g. ['Justice','Courts','Appeals']. */
  value: string[];
  onChange: (path: string[]) => void;
  label?: string;
  autoDerived?: boolean;
  derivedHint?: string;
  required?: boolean;
  error?: string;
}

/**
 * Full-tree realm picker (dispatch A). Drills atoms.path_parts to any depth and
 * emits the selected node's path (display names) — written to
 * forum_threads.realm_path by the composer. The realm tree is the single source
 * for both the toolbar drill and thread tagging, so keys match.
 */
export function RealmPathPicker({
  value,
  onChange,
  label = 'Realm',
  autoDerived = false,
  derivedHint,
  required,
  error,
}: RealmPathPickerProps) {
  const { tree } = useManualData();

  // Resolve the chain of tree nodes for the current path (for child rows).
  const drillNodes = useMemo(() => {
    const nodes: TreeNode[] = [];
    if (value[0]) {
      const rid = REALM_ID_BY_NAME[value[0]];
      let node: TreeNode | undefined = tree.children.find((c) => c.realmId === rid);
      if (node) {
        nodes.push(node);
        for (let i = 1; i < value.length && node; i++) {
          const child: TreeNode | undefined = node.children.find((c) => c.name === value[i]);
          if (!child) break;
          node = child;
          nodes.push(child);
        }
      }
    }
    return nodes;
  }, [tree, value]);

  const realmNodes = useMemo(
    () =>
      REALM_ORDER.map((id) => tree.children.find((c) => c.realmId === id)).filter(
        (n): n is TreeNode => Boolean(n),
      ),
    [tree],
  );

  const deeperRows: { depth: number; nodes: TreeNode[] }[] = [];
  for (let d = 0; d < drillNodes.length; d++) {
    if (drillNodes[d].children.length > 0) {
      deeperRows.push({ depth: d, nodes: drillNodes[d].children });
    }
  }

  function pickRealm(node: TreeNode) {
    const name = REALM_NAMES[node.realmId as RealmId];
    onChange(value[0] === name ? [] : [name]);
  }

  function pickChild(parentDepth: number, node: TreeNode) {
    const idx = parentDepth + 1; // child sits at this path index
    if (value[idx] === node.name) onChange(value.slice(0, idx)); // toggle off → drill up
    else onChange(value.slice(0, idx).concat(node.name));
  }

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '11px' }}
            data-size="meta"
          >
            {label}
            {required && !autoDerived && <span className="ml-1 text-kettle-unsourced">*</span>}
          </span>
          {autoDerived && (
            <span
              className="rounded bg-kettle-sourced/15 px-1.5 py-0.5 font-mono text-kettle-sourced"
              style={{ fontSize: '10px' }}
              data-size="meta"
            >
              auto
            </span>
          )}
        </div>
      )}

      {autoDerived && derivedHint && (
        <p className="mb-2 font-mono text-text-muted" style={{ fontSize: '11px' }} data-size="meta">
          {derivedHint}
        </p>
      )}

      {/* Realm row */}
      <div className="scrollbar-none flex flex-wrap gap-1">
        <Chip label="— none —" active={value.length === 0} onClick={() => onChange([])} />
        {realmNodes.map((node) => (
          <Chip
            key={node.realmId}
            label={REALM_NAMES[node.realmId as RealmId]}
            active={value[0] === REALM_NAMES[node.realmId as RealmId]}
            onClick={() => pickRealm(node)}
          />
        ))}
      </div>

      {/* Deeper rows — full branch depth */}
      {deeperRows.map((row) => (
        <div key={`row-${row.depth}`} className="mt-2 flex flex-wrap items-center gap-1">
          <span
            className="mr-1 flex items-center font-mono uppercase tracking-wider text-text-muted"
            style={{ fontSize: '10px' }}
            data-size="meta"
          >
            {row.depth === 0 ? 'Sub' : `L${row.depth + 1}`}:
          </span>
          {row.nodes.map((node) => (
            <Chip
              key={node.path}
              label={node.name}
              active={value[row.depth + 1] === node.name}
              onClick={() => pickChild(row.depth, node)}
              subtle
            />
          ))}
        </div>
      ))}

      {error && (
        <p className="mt-1 text-kettle-unsourced" style={{ fontSize: '11px' }} data-size="meta">
          {error}
        </p>
      )}

      {value.length > 0 && (
        <div className="mt-2 font-mono text-text-dim" style={{ fontSize: '11px' }} data-size="meta">
          Tagged: <span className="text-text-silver">{value.join(' / ')}</span>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  subtle,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border tracking-wide transition-all',
        subtle ? 'px-2 py-0.5' : 'px-2.5 py-1',
        active
          ? 'border-text-silver/50 bg-bg-elevated text-text'
          : subtle
            ? 'border-transparent text-text-silver hover:border-border hover:bg-bg-elevated'
            : 'border-border bg-bg text-text-dim hover:border-border-bright hover:text-text-silver',
      )}
      style={{ fontSize: '12px' }}
    >
      {label}
    </button>
  );
}
