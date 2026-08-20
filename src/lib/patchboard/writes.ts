// PATCHBOARD1 — switch writes (PROPOSE-FIRST).
//
// Setting a switch value routes through db-lane RPCs the proposed migration
// defines. Until that migration lands the RPC 404s and this returns a typed
// `pending` result, so the UI can show "pending — not yet deployed" rather than
// silently claiming success. RLS on the write side (a user may only write their
// own Bee-scope rows) is enforced in the RPC, never trusted from the client.

import { supabase } from '@/lib/supabase';
import { isHardSwitch } from './types';

export type SwitchWriteResult = { ok: true } | { ok: false; error: string; pending: boolean };

function classify(message: string): SwitchWriteResult {
  const pending =
    /could not find|does not exist|not found|schema cache|function .* does not exist/i.test(
      message,
    );
  return { ok: false, error: message, pending };
}

/**
 * Set a Bee-scope switch (platform-wide when astraId is null, or a per-Astra
 * override when set). Hard switches are refused client-side — they are immutable
 * platform floors (MMF §36.3) and no write path should ever offer to flip one.
 */
export async function setBeeSwitch(
  switchKey: string,
  astraId: string | null,
  enabled: boolean,
): Promise<SwitchWriteResult> {
  if (isHardSwitch(switchKey)) {
    return { ok: false, error: 'Hard switches cannot be changed', pending: false };
  }
  if (!supabase) return { ok: false, error: 'Not configured', pending: false };
  try {
    const { error } = await supabase.rpc('patchboard_set_bee_switch', {
      p_switch_key: switchKey,
      p_astra_id: astraId,
      p_enabled: enabled,
    });
    return error ? classify(error.message) : { ok: true };
  } catch (e) {
    return classify(e instanceof Error ? e.message : 'unknown');
  }
}

/**
 * Set a Master-scope default (HQ only). Also used to flip a provider's Master
 * offer, whose switch key is `connect_offer:<providerId>`. Propose-first, and
 * the RPC enforces is_admin server-side — the client gate is convenience only.
 * The Three-Switches subset (§36 / §31) never routes through here; it keeps its
 * own multi-party flow.
 */
export async function setMasterSwitch(
  switchKey: string,
  enabled: boolean,
): Promise<SwitchWriteResult> {
  if (isHardSwitch(switchKey)) {
    return { ok: false, error: 'Hard switches are immutable floors', pending: false };
  }
  if (!supabase) return { ok: false, error: 'Not configured', pending: false };
  try {
    const { error } = await supabase.rpc('patchboard_set_master_switch', {
      p_switch_key: switchKey,
      p_enabled: enabled,
    });
    return error ? classify(error.message) : { ok: true };
  } catch (e) {
    return classify(e instanceof Error ? e.message : 'unknown');
  }
}
