// Manual types — the shape of the 5,997-atom dataset

export type KettleState =
  | 'Sourced'
  | 'Accepted'
  | 'Contested'
  | 'Emerging'
  | 'Fringe'
  | 'Unsourced';

export type AtomType = 'person' | 'event' | 'document' | 'organization' | 'place';

export type Front =
  | 'UNITE & RULE'
  | 'INVESTIGATE'
  | 'THE NEW WORLD ORDER'
  | 'PROSECUTE'
  | 'THE DEEP STATE';

export interface Atom {
  id: string;
  name: string;
  path: string;
  pathParts: string[];
  realm: string;
  depth: number;
  type: AtomType;
  kettle: KettleState;
  themeTags: string[];
  realmTags: string[];
  pillarTags: string[];
  skinTags: string[];
  isLeaf: boolean;
  L2?: string;
  L3?: string;
  L4?: string;
  L5?: string;
  front?: Front;
}

export interface TreeNode {
  name: string;
  path: string;
  depth: number;
  realm: string;
  atoms: Atom[]; // atoms whose exact path === this node's path
  children: TreeNode[];
  atomCount: number; // total descendant atoms
  front?: Front;
}

// View state
export type ViewMode = 'outlook' | 'list' | 'graph';

export interface FilterState {
  searchQuery: string;
  selectedRealm: string | null;
  selectedKettle: KettleState | null;
  selectedType: AtomType | 'all';
  selectedTags: string[];
}
