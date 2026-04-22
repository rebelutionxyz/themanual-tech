import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FRONT_ORDER, REALM_ORDER, type Realm } from './constants';
import type { Front } from '@/types/manual';

/** Tailwind class merger */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Sort realm root names by flow order (Body first → Power last) */
export function sortRealms<T extends { name: string }>(items: T[]): T[] {
  const order = new Map(REALM_ORDER.map((r, i) => [r as string, i]));
  return [...items].sort(
    (a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999),
  );
}

/** Sort Power's L2 so structural categories are alphabetical, 5 Fronts at bottom in order */
export function sortPowerL2<T extends { name: string }>(items: T[]): T[] {
  const frontsSet = new Set<string>(FRONT_ORDER);
  const structural = items
    .filter((i) => !frontsSet.has(i.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const fronts = FRONT_ORDER.map((f) => items.find((i) => i.name === f)).filter(
    (x): x is T => !!x,
  );
  return [...structural, ...fronts];
}

/** Check if a name is one of the 5 Fronts */
export function isFront(name: string): name is Front {
  return FRONT_ORDER.includes(name as Front);
}

/** Check if a name is one of the 13 Realms */
export function isRealm(name: string): name is Realm {
  return REALM_ORDER.includes(name as Realm);
}

/** Format large numbers */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

/** Debounce helper */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}
