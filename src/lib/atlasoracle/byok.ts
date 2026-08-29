// BYOK — Bring-Your-Own-Key, the REAL thing (H24_BYOK1).
//
// Supersedes the H24_COMPOSER1 placeholder that lived entirely in browser
// sessionStorage (flagged there as an open decision, not the real thing). The
// raw key now never rests anywhere this module controls — not in
// sessionStorage, not in React state beyond the one in-flight request. It
// goes once, over HTTPS, to the `byok-key` Edge Function, which validates it
// LIVE against the provider and hands it to Supabase Vault. Everything this
// module reads back afterward is masked (presence + last4 + status) — see
// db/proposals/0004_byok_keys.sql for the storage discipline.
//
// KEY DISCIPLINE (VOTE_APIS v1.2), applied to this client seam:
//   - A provider key entered here goes to the routing PROCESS only — it is
//     never sent as directive text, never logged, and this module's own
//     getters (listByokStates) can only ever return masked shapes, so a stray
//     `console.log(await listByokStates())` cannot leak anything.
//   - The one place a raw key exists client-side is the argument to
//     submitByokKey, for the duration of that one fetch. It is not retained,
//     not echoed back by the Edge Function, and not written to any storage.
//
// SCHEMA / DEPLOY STATUS (H24_BYOK1, 2026-08-29): db/proposals/0004_byok_keys.sql
// is PROPOSE-FIRST — authored, not yet applied — and supabase/functions/byok-key
// is written but NOT YET DEPLOYED (Edge Function deploys are gated per CLAUDE.md,
// never auto-deployed). Until both land, every call below degrades to an honest
// failure rather than a fake success — real-data-only discipline, same posture
// as the routing log and drawer panels. isMocked() (VITE_ATLASORACLE_MOCK=1)
// exercises the full flow against an in-memory fake so the composer stays
// demoable today.

import { supabase } from '@/lib/supabase';
import { isMocked } from './client';

/** Provider slugs behind the company-name Model menu. */
export type ByokProvider = 'anthropic' | 'openai' | 'xai' | 'meta' | 'mistral' | 'deepseek';

const ALL_PROVIDERS: ByokProvider[] = ['anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek'];

/**
 * Company-name Model menu → provider slug. `Auto` maps to null: Auto routes
 * for the Bee, so BYOK does not apply until a specific company is picked.
 */
export const MODEL_PROVIDER: Record<string, ByokProvider | null> = {
  Auto: null,
  Claude: 'anthropic',
  GPT: 'openai',
  Grok: 'xai',
  Llama: 'meta',
  Mistral: 'mistral',
  DeepSeek: 'deepseek',
};

/** Human label for a provider, for the BYOK panel copy. */
export const PROVIDER_LABEL: Record<ByokProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  xai: 'xAI',
  meta: 'Meta',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
};

/** Masked view of a stored key. The raw value is NEVER part of this shape. */
export interface ByokState {
  present: boolean;
  /** Last 4 characters, for a "•••• 1234" hint. null when absent. */
  last4: string | null;
  status: 'unvalidated' | 'valid' | 'invalid' | null;
}

const ABSENT: ByokState = { present: false, last4: null, status: null };

export interface ByokSubmitResult {
  valid: boolean;
  last4?: string;
  error?: string;
}

interface ByokKeyRow {
  provider: string;
  last4: string | null;
  status: string;
}

// Tab-lifetime mock store — mirrors the real shape (masked-only) so the demo
// never has a raw key to leak in the first place.
const mockStore = new Map<ByokProvider, { last4: string }>();

function emptyStates(): Record<ByokProvider, ByokState> {
  return {
    anthropic: ABSENT,
    openai: ABSENT,
    xai: ABSENT,
    meta: ABSENT,
    mistral: ABSENT,
    deepseek: ABSENT,
  };
}

/** Every provider's masked state for the signed-in Bee, in one read. */
export async function listByokStates(): Promise<Record<ByokProvider, ByokState>> {
  const states = emptyStates();
  if (isMocked()) {
    for (const [p, v] of mockStore) states[p] = { present: true, last4: v.last4, status: 'valid' };
    return states;
  }
  if (!supabase) return states;

  const { data, error } = await supabase.from('bee_byok_keys').select('provider, last4, status');
  // Table not yet applied (propose-first), RLS denial, or a transient read
  // failure all land here — an honest "nothing on file" rather than a throw,
  // matching the drawer panels' real-data-only posture.
  if (error || !data) return states;

  for (const row of data as ByokKeyRow[]) {
    if ((ALL_PROVIDERS as string[]).includes(row.provider)) {
      states[row.provider as ByokProvider] = {
        present: true,
        last4: row.last4,
        status: row.status as ByokState['status'],
      };
    }
  }
  return states;
}

/**
 * Validate a key live and store it. The raw value lives only for the duration
 * of this call — it is never written back to any local state by this
 * function; the caller re-reads masked state via listByokStates() on success.
 */
export async function submitByokKey(
  provider: ByokProvider,
  rawKey: string,
): Promise<ByokSubmitResult> {
  const trimmed = rawKey.trim();
  if (!trimmed) return { valid: false, error: 'Enter a key.' };
  if (trimmed.length > 1024) return { valid: false, error: 'That key is too long.' };

  if (isMocked()) {
    await new Promise((r) => setTimeout(r, 300));
    if (trimmed.length < 8) return { valid: false, error: 'That does not look like a valid key.' };
    const last4 = trimmed.slice(-4);
    mockStore.set(provider, { last4 });
    return { valid: true, last4 };
  }

  if (!supabase) return { valid: false, error: 'Sign in to add a key.' };

  const { data, error } = await supabase.functions.invoke('byok-key', {
    body: { provider, apiKey: trimmed },
  });

  if (error) {
    const ctx = (error as { context?: unknown } | null)?.context;
    const res = ctx instanceof Response ? ctx : null;
    if (res) {
      try {
        const payload = (await res.clone().json()) as { error?: string };
        if (payload.error) return { valid: false, error: payload.error };
      } catch {
        // Non-JSON body — fall through to the generic message below.
      }
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Key validation is not available yet.',
    };
  }

  const d = data as { valid?: boolean; last4?: string; error?: string } | null;
  if (!d?.valid) return { valid: false, error: d?.error ?? 'Key validation failed.' };
  return { valid: true, last4: d.last4 };
}

/** Revoke a stored key. Self-serve RPC — no Edge Function round-trip needed. */
export async function revokeByokKey(
  provider: ByokProvider,
): Promise<{ ok: boolean; error?: string }> {
  if (isMocked()) {
    mockStore.delete(provider);
    return { ok: true };
  }
  if (!supabase) return { ok: false, error: 'Sign in to manage keys.' };

  const { error } = await supabase.rpc('byok_key_revoke', { p_provider: provider });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
