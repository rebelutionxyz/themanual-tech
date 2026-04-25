import type { Atom, TreeNode } from '@/types/manual';
import { REALM_ORDER } from './constants';

/**
 * Build a hierarchical tree from the flat atom list.
 * Each internal node aggregates its atoms[] (those whose exact path === this.path)
 * and children[] (nested deeper paths).
 *
 * Sort rules:
 * - Realm roots follow REALM_ORDER (palindrome: justice → religion)
 * - Everything else alphabetical by display name
 */
export function buildTree(atoms: Atom[]): TreeNode {
  const root: TreeNode = {
    name: 'ROOT',
    path: '',
    depth: 0,
    realmId: '',
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
          realmId: atom.realmId,
          atoms: [],
          children: [],
          atomCount: 0,
        };
        nodeMap.set(newPath, node);
        parent.children.push(node);
      }

      if (i === atom.pathParts.length - 1) {
        node.atoms.push(atom);
      }

      currentPath = newPath;
      parent = node;
    }
  }

  sortAndCount(root);
  return root;
}

function sortAndCount(node: TreeNode): number {
  if (node.name === 'ROOT') {
    const orderMap = new Map(REALM_ORDER.map((r, i) => [r, i]));
    node.children.sort(
      (a, b) =>
        (orderMap.get(a.realmId as never) ?? 999) -
        (orderMap.get(b.realmId as never) ?? 999),
    );
  } else {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  node.atoms.sort((a, b) => a.name.localeCompare(b.name));

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
