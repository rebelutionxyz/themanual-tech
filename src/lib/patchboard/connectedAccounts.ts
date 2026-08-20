// PATCHBOARD1 — CONNECTED ACCOUNTS (MMF §36.4).
//
// A provider decomposes into three things (§36.4.1):
//   1. Offer switch     — is the provider offered in a scope? (a Patchboard
//                          switch, key `connect_offer:<providerId>`)
//   2. Use switch        — does THIS user surface their connection in a given
//                          (bee, astra)? (a Patchboard switch, key
//                          `connect_use:<providerId>`)
//   3. Connection record — the token / account id / address. NOT a switch —
//                          RLS-private account data in `connected_accounts`.
//
// Dormancy, not deletion (§36.4.2): flipping an Offer switch OFF dormates the
// connection; it is never deleted and reactivates if switched back on.
//
// READ side is fully implemented and floor-safe. WRITE side is PROPOSE-FIRST:
// the mutators call the db-lane RPCs that the proposed migration defines. Until
// that migration lands the RPCs 404 and these return a typed error — the UI
// surfaces "pending" rather than pretending the write happened.

import { supabase } from '@/lib/supabase';
import { getProvider } from './registry';
import type { ConnectedAccount, Provider, ProviderSwitchState } from './types';

/** The two switch-key builders. Keys are stable and mirror the migration seed. */
export function offerSwitchKey(providerId: string): string {
  return `connect_offer:${providerId}`;
}
export function useSwitchKey(providerId: string): string {
  return `connect_use:${providerId}`;
}

/** Parse a connect_* switch key back to its provider id, or null. */
export function providerIdFromSwitchKey(key: string): string | null {
  const m = /^connect_(?:offer|use):(.+)$/.exec(key);
  return m ? m[1] : null;
}

type WriteError = { ok: false; error: string; pending: boolean };
type WriteResult = { ok: true } | WriteError;

/**
 * A user's connection records, floor-safe. Returns [] when the client is
 * unconfigured or the table is absent (propose-first). The token column is never
 * selected — only the metadata envelope.
 */
export async function listConnections(beeId: string): Promise<ConnectedAccount[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('id, bee_id, provider_id, external_label, status, connected_at')
      .eq('bee_id', beeId);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      beeId: r.bee_id as string,
      providerId: r.provider_id as string,
      externalLabel: (r.external_label as string | null) ?? null,
      status: (r.status as 'active' | 'dormant') ?? 'active',
      connectedAt: r.connected_at as string,
    }));
  } catch {
    return [];
  }
}

/**
 * Combine the registry, the offer/use switch states, and the connection records
 * into the per-provider view the Bee-scope UI renders. `offeredKeys`/`usedKeys`
 * are effective booleans resolved by the switch resolver upstream.
 */
export function composeProviderStates(
  connections: ConnectedAccount[],
  offered: Record<string, boolean>,
  used: Record<string, boolean>,
  providers: readonly Provider[],
): ProviderSwitchState[] {
  const connByProvider = new Map(connections.map((c) => [c.providerId, c]));
  return providers.map((p) => ({
    providerId: p.id,
    offered: offered[p.id] ?? true, // registry providers default-offered (ON)
    used: used[p.id] ?? true,
    connection: connByProvider.get(p.id) ?? null,
  }));
}

// ── PROPOSE-FIRST WRITE PATH ────────────────────────────────────────────────
// These call RPCs the db-lane migration defines. They fail soft with a typed,
// user-legible error so a caller can show "pending — connection RPC not yet
// deployed" instead of a raw 404.

function wrapWriteError(message: string): WriteError {
  // A missing function / relation means the propose-first migration has not been
  // applied yet — surface that as `pending`, not a hard failure.
  const pending =
    /could not find|does not exist|not found|schema cache|function .* does not exist/i.test(
      message,
    );
  return { ok: false, error: message, pending };
}

/**
 * Set this user's USE switch for a provider in a (bee, astra) scope. Propose-first
 * — routes through `patchboard_set_use` (db lane).
 */
export async function setUse(
  providerId: string,
  astraId: string | null,
  used: boolean,
): Promise<WriteResult> {
  if (!getProvider(providerId)) return { ok: false, error: 'Unknown provider', pending: false };
  if (!supabase) return { ok: false, error: 'Not configured', pending: false };
  try {
    const { error } = await supabase.rpc('patchboard_set_use', {
      p_provider_id: providerId,
      p_astra_id: astraId,
      p_used: used,
    });
    return error ? wrapWriteError(error.message) : { ok: true };
  } catch (e) {
    return wrapWriteError(e instanceof Error ? e.message : 'unknown');
  }
}

/**
 * Begin an OAuth/connection flow for a provider. Propose-first — routes through
 * `patchboard_connect_begin` (db lane), which returns the redirect/authorize URL.
 * The token itself is written server-side; the browser never sees it.
 */
export async function beginConnect(
  providerId: string,
): Promise<
  { ok: true; redirectUrl: string | null } | { ok: false; error: string; pending: boolean }
> {
  if (!getProvider(providerId)) return { ok: false, error: 'Unknown provider', pending: false };
  if (!supabase) return { ok: false, error: 'Not configured', pending: false };
  try {
    const { data, error } = await supabase.rpc('patchboard_connect_begin', {
      p_provider_id: providerId,
    });
    if (error) return wrapWriteError(error.message);
    return {
      ok: true,
      redirectUrl: (data as { redirect_url?: string } | null)?.redirect_url ?? null,
    };
  } catch (e) {
    return wrapWriteError(e instanceof Error ? e.message : 'unknown');
  }
}

/**
 * Disconnect (dormate, never delete) a provider for this user. Propose-first —
 * routes through `patchboard_disconnect` (db lane), which sets status='dormant'.
 */
export async function disconnect(providerId: string): Promise<WriteResult> {
  if (!supabase) return { ok: false, error: 'Not configured', pending: false };
  try {
    const { error } = await supabase.rpc('patchboard_disconnect', {
      p_provider_id: providerId,
    });
    return error ? wrapWriteError(error.message) : { ok: true };
  } catch (e) {
    return wrapWriteError(e instanceof Error ? e.message : 'unknown');
  }
}
