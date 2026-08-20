// PATCHBOARD1 — THE SWITCH RESOLVER (MMF §36.2, patchboard-pattern §5).
//
// The cascade, first hit wins:
//   hard switch (above cascade) → Bee-Astra → Bee-platform → Astra-default
//   → Master-default → ON
//
// Two entry points:
//  - resolveSwitch(): a PURE function over already-loaded settings. The unit of
//    truth; trivially testable.
//  - getEffectiveSwitchState(): the async convenience that reads the settings
//    from Supabase and then calls the pure resolver.
//
// RESOLVER FLOOR: reads are floor-safe. If Supabase is unconfigured, or the
// patchboard_* tables do not exist yet (db-lane migration is propose-first and
// has not landed), or the query errors, the resolver returns the canon DEFAULT
// rather than throwing — a soft switch reads ON (or OFF if sensitive), and a
// hard switch reads ON-and-locked. The platform never breaks because a switch
// row is missing; missing simply means "the default holds".

import { supabase } from '@/lib/supabase';
import { systemDefaultFor } from './registry';
import type { EffectiveState, PatchboardSetting, ResolutionTerm } from './types';
import { isHardSwitch } from './types';

/** Inputs to the pure cascade for one switch. `undefined` = the term is unset. */
export interface CascadeInput {
  switchKey: string;
  /** Bee's per-Astra override (highest cascade term). */
  beeAstra?: boolean;
  /** Bee's platform-wide setting. */
  beePlatform?: boolean;
  /** The Astra's default. */
  astraDefault?: boolean;
  /** The Master default (nullable in canon; undefined falls through to ON). */
  masterDefault?: boolean;
}

/**
 * The pure resolver (MMF §36.2). Hard switches short-circuit to ON+locked and
 * ignore every scope term. Soft switches walk the cascade; the first defined
 * term wins, and the terminal fallback is ON (or the sensitive default OFF when
 * no term at all is set).
 */
export function resolveSwitch(input: CascadeInput): EffectiveState {
  const { switchKey } = input;

  // Hard switches sit ABOVE the cascade and cannot be overridden (§36.3).
  if (isHardSwitch(switchKey)) {
    return { switchKey, enabled: true, term: 'hard', locked: true };
  }

  const term = (value: boolean, which: ResolutionTerm): EffectiveState => ({
    switchKey,
    enabled: value,
    term: which,
    locked: false,
  });

  if (input.beeAstra !== undefined) return term(input.beeAstra, 'bee-astra');
  if (input.beePlatform !== undefined) return term(input.beePlatform, 'bee-platform');
  if (input.astraDefault !== undefined) return term(input.astraDefault, 'astra-default');
  if (input.masterDefault !== undefined) return term(input.masterDefault, 'master-default');

  // Terminal fallback. The cascade ends "→ ON", but a sensitive category with no
  // term set holds its opt-in default of OFF (patchboard-pattern §4). Either way
  // this term is the system default, reported as fallback-on for the "why".
  return term(systemDefaultFor(switchKey), 'fallback-on');
}

/**
 * Fold a flat list of settings rows into the four cascade terms for one
 * (bee, astra, switch). Rows are matched by the (bee_id, astra_id) cardinality
 * that encodes scope (patchboard-pattern §8.2).
 */
function foldSettings(
  rows: PatchboardSetting[],
  switchKey: string,
  beeId: string | null,
  astraId: string | null,
): CascadeInput {
  const input: CascadeInput = { switchKey };
  for (const r of rows) {
    if (r.switchKey !== switchKey) continue;
    if (r.beeId === beeId && r.astraId === astraId) input.beeAstra = r.enabled;
    else if (r.beeId === beeId && r.astraId === null) input.beePlatform = r.enabled;
    else if (r.beeId === null && r.astraId === astraId) input.astraDefault = r.enabled;
    else if (r.beeId === null && r.astraId === null) input.masterDefault = r.enabled;
  }
  return input;
}

/**
 * Read every setting that could affect a given user, in one round-trip: their
 * own rows (both Bee scopes) plus the non-Bee (Astra / Master) rows. The
 * astra_id filtering happens in foldSettings, not here — one query serves every
 * astra context. Floor-safe: returns [] on any failure (unconfigured client,
 * missing table, RLS, network) so the caller falls through to canon defaults.
 */
export async function loadSettings(beeId: string | null): Promise<PatchboardSetting[]> {
  if (!supabase) return [];
  try {
    // Rows that can affect this pair: the user's own (any of their two scopes),
    // the Astra default, and the Master default. `.or` keeps it one round-trip.
    const orClause = [beeId ? `bee_id.eq.${beeId}` : null, 'bee_id.is.null']
      .filter(Boolean)
      .join(',');
    const { data, error } = await supabase
      .from('patchboard_settings')
      .select('switch_key, bee_id, astra_id, enabled')
      .or(orClause);
    if (error || !data) return [];
    return data.map((r) => ({
      switchKey: r.switch_key as string,
      beeId: (r.bee_id as string | null) ?? null,
      astraId: (r.astra_id as string | null) ?? null,
      enabled: !!r.enabled,
    }));
  } catch {
    // Table absent (propose-first migration not applied) or any other fault —
    // fall to the floor.
    return [];
  }
}

/** Resolve ONE switch for a (user, astra) pair against live settings. */
export async function getEffectiveSwitchState(
  switchKey: string,
  beeId: string | null,
  astraId: string | null,
): Promise<EffectiveState> {
  if (isHardSwitch(switchKey)) {
    return { switchKey, enabled: true, term: 'hard', locked: true };
  }
  const rows = await loadSettings(beeId);
  return resolveSwitch(foldSettings(rows, switchKey, beeId, astraId));
}

/**
 * Resolve MANY switches in a single round-trip (the store's loader). Returns a
 * map keyed by switch_key. Hard switches are injected as locked-ON without a
 * query term.
 */
export async function getEffectiveSwitchStates(
  switchKeys: string[],
  beeId: string | null,
  astraId: string | null,
): Promise<Record<string, EffectiveState>> {
  const rows = await loadSettings(beeId);
  const out: Record<string, EffectiveState> = {};
  for (const key of switchKeys) {
    out[key] = isHardSwitch(key)
      ? { switchKey: key, enabled: true, term: 'hard', locked: true }
      : resolveSwitch(foldSettings(rows, key, beeId, astraId));
  }
  return out;
}

/** Convenience: the effective boolean only, for a gate. Defaults hold on error. */
export async function isSwitchOn(
  switchKey: string,
  beeId: string | null,
  astraId: string | null,
): Promise<boolean> {
  return (await getEffectiveSwitchState(switchKey, beeId, astraId)).enabled;
}
