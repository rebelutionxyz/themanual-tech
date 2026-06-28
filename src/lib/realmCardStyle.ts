import type { CSSProperties } from 'react';

/**
 * Community result-card surface — the single shared knob for box color + ink.
 *
 * Every community result card (PULSE / INTEL / UNITE / RULE / GIVE) fills with a
 * DEEP, saturated shade derived from the accent it already uses (realm color for
 * INTEL/PULSE via main's useRealmColors; surface accent for UNITE/RULE/GIVE),
 * with legible light ink. Centralized here so a future theming patchboard can
 * control the fill darkness + text from one place. We do NOT hardcode per realm
 * and do NOT touch the DB — only derive from the passed accent.
 */

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const channel = (c: number) =>
  Math.max(0, Math.min(255, Math.round(c)))
    .toString(16)
    .padStart(2, '0');

/** Mix a hex color toward black. amount 0 → unchanged, 1 → black. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const k = 1 - amount;
  return `#${channel(r * k)}${channel(g * k)}${channel(b * k)}`;
}

/** Light ink legible on the deep fill. Future patchboard owns these tokens. */
export const CARD_INK = {
  title: '#FFFFFF',
  body: 'rgba(255,255,255,0.86)',
  meta: 'rgba(255,255,255,0.66)',
  faint: 'rgba(255,255,255,0.50)',
} as const;

/** Neutral light pill (realm tag, L2 / category chips, atom chips) on the fill. */
export const cardChipStyle: CSSProperties = {
  color: CARD_INK.title,
  background: 'rgba(255,255,255,0.14)',
  border: '1px solid rgba(255,255,255,0.22)',
};

/**
 * The deep realm/surface fill + hairline of the brighter hue + a light base
 * `color` (so nested text inherits legibly). The full fill makes the old 3px
 * left-spine redundant, so cards drop it. `amount` defaults to a deep 0.7
 * (keeps 30% of the hue) — dark enough that white text clears AA even on the
 * lightest realms (e.g. philosophy gold).
 */
export function realmCardStyle(accent: string, amount = 0.7): CSSProperties {
  return {
    background: darken(accent, amount),
    border: `1px solid ${accent}59`,
    color: CARD_INK.body,
  };
}
