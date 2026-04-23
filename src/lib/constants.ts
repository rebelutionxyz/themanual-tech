import type { Front, KettleState } from '@/types/manual';

// Flow order — Body inside-out to Power (LOCKED April 21)
export const REALM_ORDER = [
  'Body',
  'Mind',
  'Spirit',
  'Nature',
  'Home',
  'Craft',
  'Play',
  'Gear',
  'Work',
  'Money',
  'Tech',
  'World',
  'Power',
] as const;

export type Realm = (typeof REALM_ORDER)[number];

// Fronts at the BOTTOM of Power's L2 sort (in this specified order)
export const FRONT_ORDER: Front[] = [
  'UNITE & RULE',
  'INVESTIGATE',
  'THE NEW WORLD ORDER',
  'PROSECUTE',
  'THE DEEP STATE',
];

export const FRONT_CLASS: Record<Front, string> = {
  'UNITE & RULE': 'front-ur',
  INVESTIGATE: 'front-inv',
  'THE NEW WORLD ORDER': 'front-nwo',
  PROSECUTE: 'front-pros',
  'THE DEEP STATE': 'front-ds',
};

export const FRONT_COLORS: Record<Front, string> = {
  'UNITE & RULE': '#FAD15E',
  INVESTIGATE: '#E88938',
  'THE NEW WORLD ORDER': '#9B7FC8',
  PROSECUTE: '#6FCF8F',
  'THE DEEP STATE': '#C94C4C',
};

// Realm colors — used for card accents, realm chips, breadcrumb highlights.
// Chosen to evoke each realm's essence while staying harmonious as a palette.
export const REALM_COLORS: Record<Realm, string> = {
  Body: '#E88AB8',    // rose — vitality, physical
  Mind: '#B8A8F0',    // lavender — thought, cognition
  Spirit: '#F0C878',  // gold — soul, transcendence
  Nature: '#6FCF8F',  // green — earth, living systems
  Home: '#D4A574',    // warm tan — hearth, shelter
  Craft: '#E8A868',   // terracotta — making, skill
  Play: '#F78FB3',    // coral — joy, games
  Gear: '#8A94A0',    // gunmetal — tools, equipment
  Work: '#7AA8D4',    // steel blue — labor, production
  Money: '#FAD15E',   // honey — currency, exchange
  Tech: '#4FC3E8',    // cyan — digital, systems
  World: '#9AC97A',   // sage — global, geography
  Power: '#C94C4C',   // crimson — authority, sovereignty
};

export const KETTLE_STATES: KettleState[] = [
  'Sourced',
  'Accepted',
  'Contested',
  'Emerging',
  'Fringe',
  'Unsourced',
];

export const KETTLE_COLORS: Record<KettleState, string> = {
  Sourced: '#6FCF8F',
  Accepted: '#6B94C8',
  Contested: '#E8A838',
  Emerging: '#E88938',
  Fringe: '#9B7FC8',
  Unsourced: '#C94C4C',
};

export const KETTLE_ABBREV: Record<KettleState, string> = {
  Sourced: 'SOU',
  Accepted: 'ACC',
  Contested: 'CON',
  Emerging: 'EME',
  Fringe: 'FRI',
  Unsourced: 'UNS',
};

export const KETTLE_DESCRIPTIONS: Record<KettleState, string> = {
  Sourced: 'Whistling kettle — verified fact',
  Accepted: 'Rolling boil — mainstream acknowledged',
  Contested: 'Disputed — evidence on both sides',
  Emerging: 'Bubbling — gaining credibility',
  Fringe: 'Steam — minority claim with evidence',
  Unsourced: 'Cold water — claim without sources',
};

export const ATOM_TYPE_COLORS = {
  person: '#6B94C8',
  event: '#E88938',
  document: '#6FCF8F',
  organization: '#C94C4C',
  place: '#9B7FC8',
};
