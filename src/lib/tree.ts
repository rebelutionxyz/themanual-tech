import type { Atom, RealmId, TreeNode } from '@/types/manual';

/**
 * Build a hierarchical tree from the flat atom list.
 * Each internal node aggregates its atoms[] (those whose exact path === this.path)
 * and children[] (nested deeper paths).
 *
 * Sort rules:
 * - Realm roots follow `realmOrder` (DB-driven realms.display_order)
 * - Everything else alphabetical by display name
 *
 * @param realmOrder realm slugs in display order; roots not listed sort last.
 */
export function buildTree(atoms: Atom[], realmOrder: RealmId[] = []): TreeNode {
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

  const orderMap = new Map(realmOrder.map((r, i) => [r, i]));
  sortAndCount(root, orderMap);
  return root;
}

function sortAndCount(node: TreeNode, orderMap: Map<RealmId, number>): number {
  if (node.name === 'ROOT') {
    node.children.sort(
      (a, b) =>
        (orderMap.get(a.realmId as RealmId) ?? 999) -
        (orderMap.get(b.realmId as RealmId) ?? 999),
    );
  } else {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  node.atoms.sort((a, b) => a.name.localeCompare(b.name));

  let total = node.atoms.length;
  for (const child of node.children) {
    total += sortAndCount(child, orderMap);
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
