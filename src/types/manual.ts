// Manual types — the shape of the 4,860-atom dataset (LOCKED April 25, 2026)
//
// 14 realms in palindrome display order:
//   Justice → Reference → Human activities → Self → Geography → Health
//   → Society → Math → Science → Philosophy → Tech → History → Culture → Religion
//
// Pairings (1↔14, 2↔13, 3↔12, 4↔11, 5↔10, 6↔9, 7↔8) are intentional —
// scrolling either direction passes through a coherent arc.

export type KettleState =
  | 'Accepted'
  | 'Contested'
  | 'Emerging'
  | 'Fringe';

export type AtomType = 'person' | 'event' | 'document' | 'organization' | 'place';

// Atom — matches the atoms table in Supabase (see supabase/02_create_new_taxonomy.sql)
export interface Atom {
  id: string;                  // slug, e.g. "justice-accountability-outcomes"
  name: string;                // display name, e.g. "Accountability outcomes"
  path: string;                // full path string, e.g. "Justice / Accountability outcomes"
  pathParts: string[];         // path as array, e.g. ["Justice", "Accountability outcomes"]
  realmId: RealmId;            // FK to realms.id, e.g. "justice"
  realmName: string;           // display realm name, e.g. "Justice"
  depth: number;               // 1..9, where 1 = realm itself
  type: AtomType;
  kettle: KettleState;
  isLeaf: boolean;
  themeTags: string[];
  realmTags: string[];
  pillarTags: string[];
  skinTags: string[];
  geo?: Record<string, unknown> | null;
  note?: string | null;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// Realm — matches the realms table
export interface Realm {
  id: RealmId;
  name: string;
  displayOrder: number;
  atomCount: number;
}

// RealmId is the lowercase slug used as PK in the realms table
export type RealmId =
  | 'justice'
  | 'reference'
  | 'human_activities'
  | 'self'
  | 'geography'
  | 'health'
  | 'society'
  | 'math'
  | 'science'
  | 'philosophy'
  | 'tech'
  | 'history'
  | 'culture'
  | 'religion';

// Tree view node (computed in lib/tree.ts from atoms array).
// realmId is '' on the synthetic ROOT only; every real node has a RealmId.
export interface TreeNode {
  name: string;
  path: string;
  depth: number;
  realmId: RealmId | '';
  atoms: Atom[];               // atoms whose exact path === this node's path
  children: TreeNode[];
  atomCount: number;           // total descendant atoms
}

// View state
export type ViewMode = 'outlook' | 'list' | 'graph';

export interface FilterState {
  searchQuery: string;
  selectedRealmId: RealmId | null;
  selectedKettle: KettleState | null;
  selectedType: AtomType | 'all';
  selectedTags: string[];
}