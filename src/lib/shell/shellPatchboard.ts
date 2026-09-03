/* THE SHELL ON THE PATCHBOARD — owner ruling 2026-09-03.
 *
 *   "and every icon can be turned on and off in the patch. Every menu item.
 *    Every astra in the astra menu. The patchboard controls every item on the
 *    shell divisible from master to astra to bee."
 *
 * This SUPERSEDES the static reading of SHELL v1.6 §3, where an astra's header
 * icon set was a config constant the astra declared. It is now a resolved
 * value: every addressable element of the shell — each toolbar icon, each
 * sidebar entry, each row in the astra switcher — is a Patchboard soft switch
 * resolving Master → Astra → Bee like everything else.
 *
 * WHAT DOES NOT CHANGE: the shell is still never forked. SHELL v1.6 §2 says a
 * pass that finds itself editing shell internals to hide something is doing it
 * wrong. That still holds — this module means nobody has to. Hiding is now
 * data, resolved outside the component, and the shell just renders what it is
 * handed.
 *
 * DEFAULTS ARE ON. These are ordinary soft switches, so registry.systemDefaultFor()
 * returns true and a constellation with zero rows behaves exactly as it does
 * today. Every astra keeps everything until someone deliberately turns a thing
 * off — which is the only safe direction for a switch that can hide UI.
 *
 * ONE FLAG, RECORDED RATHER THAN ENFORCED (SHELL v1.7 §4): `handle` and
 * `avatar` are how a Bee reaches their account and sees who they are signed in
 * as, and `notifications` is the only channel that tells them something
 * happened. Turning those three off at Master scope leaves a Bee with no path
 * to their own account from that astra. The owner ruled that EVERY icon is
 * switchable, so they are soft switches like the rest and this module does not
 * block it — but the Patchboard admin UI should warn on those three rather than
 * let them go off silently.
 *
 * FLOOR-SAFE, like every other patchboard read: no Supabase, no table, or any
 * error, and everything resolves visible.
 */

import { loadSettings, resolveSwitch } from '@/lib/patchboard/resolver';
import type { PatchboardSetting } from '@/lib/patchboard/types';

/** Namespaces, so shell switches are greppable and never collide with feature switches. */
export const SHELL_SWITCH = {
  /** A right-toolbar icon: shell.icon.tasks, shell.icon.bling, … */
  icon: (key: string) => `shell.icon.${key}`,
  /** A left-sidebar entry, keyed by its ShellNavItem id: shell.nav.vault, … */
  nav: (id: string) => `shell.nav.${id}`,
  /** A row in the astra switcher, keyed by astra slug: shell.astra.justice, … */
  astra: (slug: string) => `shell.astra.${slug}`,
} as const;

/** The three icons whose absence strands a Bee. Warned on, not blocked. */
export const ACCOUNT_CRITICAL_ICONS: readonly string[] = ['notifications', 'handle', 'avatar'];

/** True when hiding this icon should raise a warning in the Patchboard UI. */
export function isAccountCritical(iconKey: string): boolean {
  return ACCOUNT_CRITICAL_ICONS.includes(iconKey);
}

/**
 * A synchronous visibility predicate over already-loaded settings. The shell
 * takes one of these so it stays a pure render with no async inside it — the
 * page resolves once and hands the result down.
 */
export type ShellVisibility = (switchKey: string) => boolean;

/** Everything visible — the floor, and the default when no resolver is supplied. */
export const ALL_VISIBLE: ShellVisibility = () => true;

/**
 * Build the predicate from settings rows already in hand. Pure; the cascade is
 * resolveSwitch(), so shell elements and feature switches can never disagree
 * about what Master → Astra → Bee means.
 */
export function shellVisibilityFrom(
  rows: PatchboardSetting[],
  beeId: string | null,
  astraId: string | null,
): ShellVisibility {
  return (switchKey: string) => {
    const input = { switchKey } as Parameters<typeof resolveSwitch>[0];
    for (const r of rows) {
      if (r.switchKey !== switchKey) continue;
      if (r.beeId === beeId && r.astraId === astraId) input.beeAstra = r.enabled;
      else if (r.beeId === beeId && r.astraId === null) input.beePlatform = r.enabled;
      else if (r.beeId === null && r.astraId === astraId) input.astraDefault = r.enabled;
      else if (r.beeId === null && r.astraId === null) input.masterDefault = r.enabled;
    }
    return resolveSwitch(input).enabled;
  };
}

/**
 * The async convenience: one round-trip, then a predicate the shell can call
 * as many times as it renders. Floor-safe — ALL_VISIBLE on any failure.
 */
export async function loadShellVisibility(
  beeId: string | null,
  astraId: string | null,
): Promise<ShellVisibility> {
  try {
    const rows = await loadSettings(beeId);
    if (!rows.length) return ALL_VISIBLE;
    return shellVisibilityFrom(rows, beeId, astraId);
  } catch {
    return ALL_VISIBLE;
  }
}
