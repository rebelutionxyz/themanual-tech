import type { Atom, TreeNode, Front } from '@/types/manual';
import { FRONT_ORDER, REALM_ORDER } from './constants';
import { isFront } from './utils';

/**
 * Build a hierarchical tree from the flat atom list.
 * Each internal node aggregates its atoms[] (those whose exact path === this.path)
 * and children[] (nested deeper paths).
 *
 * Sort rules:
 * - Realm roots follow REALM_ORDER (Body → Power)
 * - Under Power L2, structural categories alphabetical, 5 Fronts at bottom in FRONT_ORDER
 * - Everything else alphabetical
 */
export function buildTree(atoms: Atom[]): TreeNode {
  const root: TreeNode = {
    name: 'ROOT',
    path: '',
    depth: 0,
    realm: '',
    atoms: [],
    children: [],
    atomCount: 0,
  };

  const nodeMap = new Map<string, TreeNode>();
  nodeMap.set('', root);

  for (const atom of atoms) {
    let currentPath = '';
    let parent = root;

    for (let i = 0; i < atom.pathParts.length; i++) {
      const part = atom.pathParts[i];
      const newPath = currentPath ? `${currentPath} / ${part}` : part;

      let node = nodeMap.get(newPath);
      if (!node) {
        node = {
          name: part,
          path: newPath,
          depth: i + 1,
          realm: atom.pathParts[0],
          atoms: [],
          children: [],
          atomCount: 0,
          front: isFront(part) ? (part as Front) : undefined,
        };
        nodeMap.set(newPath, node);
        parent.children.push(node);
      }

      // If this is the final path segment, attach the atom here
      if (i === atom.pathParts.length - 1) {
        node.atoms.push(atom);
      }

      currentPath = newPath;
      parent = node;
    }
  }

  // Sort children recursively + aggregate atomCount
  sortAndCount(root);

  return root;
}

function sortAndCount(node: TreeNode): number {
  // Children sort
  if (node.name === 'ROOT') {
    const orderMap = new Map(REALM_ORDER.map((r, i) => [r as string, i]));
    node.children.sort(
      (a, b) => (orderMap.get(a.name) ?? 999) - (orderMap.get(b.name) ?? 999),
    );
  } else if (node.name === 'Power') {
    const frontsSet = new Set<string>(FRONT_ORDER);
    const structural = node.children
      .filter((c) => !frontsSet.has(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const fronts = FRONT_ORDER.map((f) => node.children.find((c) => c.name === f)).filter(
      (x): x is TreeNode => !!x,
    );
    node.children = [...structural, ...fronts];
  } else {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sort atoms in this node alphabetically
  node.atoms.sort((a, b) => a.name.localeCompare(b.name));

  // Count recursively
  let total = node.atoms.length;
  for (const child of node.children) {
    total += sortAndCount(child);
  }
  node.atomCount = total;
  return total;
}

/**
 * Find a node in the tree by path.
 */
export function findNode(root: TreeNode, path: string): TreeNode | null {
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

/**
 * Flatten tree into paths for breadcrumb navigation.
 */
export function getPathSegments(path: string): Array<{ name: string; path: string }> {
  const parts = path.split(' / ');
  const segments: Array<{ name: string; path: string }> = [];
  for (let i = 0; i < parts.length; i++) {
    segments.push({
      name: parts[i],
      path: parts.slice(0, i + 1).join(' / '),
    });
  }
  return segments;
}
