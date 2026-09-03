/* PATCHBOARD-RESOLVED ASTRA COLOURS — owner ruling 2026-09-03:
 *   "All colors can be changed in the patchboard for all astras."
 *   "[Bee scope] can also be turned on and off for each level in the
 *    patchboard — like all settings."
 *
 * So astraTokens.ts stops being the source of truth for colour and becomes the
 * FLOOR: the value the cascade falls back to when nobody has set anything. The
 * live value resolves through the Patchboard (MMF §36) exactly like a switch,
 * with one difference — a switch carries a boolean, a colour carries a value.
 *
 * THE CASCADE (first hit wins, mirroring lib/patchboard/resolver.ts):
 *   Bee-Astra → Bee-platform → Astra-default → Master-default → astraTokens.ts
 *
 * ...with the owner's second ruling layered on top: EACH LEVEL HAS ITS OWN
 * ON/OFF SWITCH. A level whose switch resolves OFF is SKIPPED — its rows stay
 * in the table but stop participating, so turning Bee-scope recolouring off
 * platform-wide is one switch flip, not a delete. The switches are ordinary
 * Patchboard soft switches and therefore themselves resolve per Astra and per
 * Bee, which is what "like all settings" buys you.
 *
 * SCOPE ENCODING (patchboard-pattern §8.2, same cardinality as the switches):
 *   (bee_id, astra_id)  → this Bee's override for this astra
 *   (bee_id, null)      → this Bee's platform-wide preference
 *   (null,   astra_id)  → that astra's colours (written by Master admin OR by
 *                         its Director — authority is an RLS/RPC question, not
 *                         a row-shape one, exactly as fee_schedule does it)
 *   (null,   null)      → the Master baseline across every astra
 *
 * FLOOR-SAFE, like the switch resolver: if Supabase is unconfigured, or the
 * patchboard_values table does not exist yet (the migration is PROPOSE-FIRST
 * and has NOT been applied — see supabase/migrations/_drafts), or the query
 * errors, every read returns the astraTokens.ts value. Colour must never be the
 * reason a surface fails to render.
 */

import { getEffectiveSwitchState } from '@/lib/patchboard/resolver';
import { supabase } from '@/lib/supabase';
import type { AstraTokens } from './astraTokens';

/** The four colour-ish tokens a scope may override. All optional. */
export interface AstraColorOverride {
  accent?: string;
  accentDim?: string;
  accentBg?: string;
  displayFace?: string;
}

/** Which cascade term supplied each field — the "why" behind a rendered colour. */
export type ColorTerm = 'bee-astra' | 'bee-platform' | 'astra' | 'master' | 'default';

export interface ResolvedAstraColors {
  tokens: AstraTokens;
  /** Per-field provenance, so the Patchboard UI can show what is overriding what. */
  terms: Record<keyof AstraColorOverride, ColorTerm>;
}

/**
 * The per-level enable switches. Ordinary soft switches, so they default ON
 * (registry.systemDefaultFor) — which is what the owner ruling says: colours
 * are changeable at every level unless someone turns a level off.
 */
export const COLOR_SWITCH = {
  bee: 'astra_colors.bee_override',
  astra: 'astra_colors.astra_override',
  master: 'astra_colors.master_override',
} as const;

/** One row of the value table, already camel-cased. */
export interface PatchboardColorRow {
  beeId: string | null;
  astraId: string | null;
  value: AstraColorOverride;
}

/** Which levels are live for this (bee, astra) pair. */
export interface ColorLevels {
  bee: boolean;
  astra: boolean;
  master: boolean;
}

const FIELDS: (keyof AstraColorOverride)[] = ['accent', 'accentDim', 'accentBg', 'displayFace'];

/**
 * THE PURE RESOLVER — a plain function over already-loaded rows, so it is
 * trivially testable and has no Supabase dependency. Resolution is PER FIELD,
 * not per row: a Bee who sets only `accent` still inherits the astra's
 * `displayFace` rather than silently reverting it to the code floor.
 */
export function resolveAstraColors(
  floor: AstraTokens,
  rows: PatchboardColorRow[],
  beeId: string | null,
  astraId: string | null,
  levels: ColorLevels,
): ResolvedAstraColors {
  const pick = (b: string | null, a: string | null) =>
    rows.find((r) => r.beeId === b && r.astraId === a)?.value;

  // Each term is consulted only when its level switch is on.
  const ladder: { term: ColorTerm; value?: AstraColorOverride }[] = [
    { term: 'bee-astra', value: levels.bee && beeId ? pick(beeId, astraId) : undefined },
    { term: 'bee-platform', value: levels.bee && beeId ? pick(beeId, null) : undefined },
    { term: 'astra', value: levels.astra ? pick(null, astraId) : undefined },
    { term: 'master', value: levels.master ? pick(null, null) : undefined },
  ];

  const tokens: AstraTokens = { ...floor };
  const terms = {} as Record<keyof AstraColorOverride, ColorTerm>;

  for (const field of FIELDS) {
    const hit = ladder.find((l) => l.value?.[field] !== undefined);
    if (hit?.value?.[field]) {
      tokens[field] = hit.value[field] as string;
      terms[field] = hit.term;
    } else {
      terms[field] = 'default';
    }
  }

  // A patchboard override never promotes an unratified palette row to ratified,
  // and never demotes a ratified one — `proposed` describes where the FLOOR came
  // from (ASTRA_COLORS), not who last painted it.
  tokens.proposed = floor.proposed;
  return { tokens, terms };
}

/**
 * Read every colour row that could affect this Bee in one round-trip, the same
 * shape as loadSettings(). Floor-safe: [] on any failure.
 */
export async function loadColorRows(beeId: string | null): Promise<PatchboardColorRow[]> {
  if (!supabase) return [];
  try {
    const orClause = [beeId ? `bee_id.eq.${beeId}` : null, 'bee_id.is.null']
      .filter(Boolean)
      .join(',');
    const { data, error } = await supabase
      .from('patchboard_values')
      .select('bee_id, astra_id, value')
      .eq('value_key', 'astra_colors')
      .or(orClause);
    if (error || !data) return [];
    return data.map((r) => ({
      beeId: (r.bee_id as string | null) ?? null,
      astraId: (r.astra_id as string | null) ?? null,
      value: (r.value ?? {}) as AstraColorOverride,
    }));
  } catch {
    // Table absent (propose-first migration not applied) or any other fault.
    return [];
  }
}

/**
 * The async convenience: resolve one astra's live colours for one Bee. Mirrors
 * getEffectiveSwitchState(). Returns the code floor unchanged if anything at
 * all is missing, so a caller can render its result unconditionally.
 */
export async function getAstraColors(
  floor: AstraTokens,
  beeId: string | null,
  astraId: string | null,
): Promise<ResolvedAstraColors> {
  const [rows, bee, astra, master] = await Promise.all([
    loadColorRows(beeId),
    getEffectiveSwitchState(COLOR_SWITCH.bee, beeId, astraId),
    getEffectiveSwitchState(COLOR_SWITCH.astra, beeId, astraId),
    getEffectiveSwitchState(COLOR_SWITCH.master, beeId, astraId),
  ]);
  return resolveAstraColors(floor, rows, beeId, astraId, {
    bee: bee.enabled,
    astra: astra.enabled,
    master: master.enabled,
  });
}
