// BYOK — Bring-Your-Own-Key capture for the h24 composer (H24_COMPOSER1).
//
// DISCIPLINE (VOTE_APIS v1.2, applied to the client seam):
//   - A provider key entered here NEVER enters the model context and is NEVER
//     sent as directive text. It is destined for the routing PROCESS only.
//   - It is NEVER logged, echoed, or returned in plaintext by any read API in
//     this module — the getters expose PRESENCE + last-4 (masked at rest) and
//     nothing more, so a stray `console.log(getByokState(...))` cannot leak it.
//   - The one raw read (`readByokRawForRouting`) exists solely for the future
//     AUTOTIER1 routing layer to hand the key to the edge function; it is not
//     called anywhere in the composer today.
//
// HONEST PLACEHOLDER (this pass): the deployed `h24-route` contract accepts only
// { directive, tier, category, astra_slug, confirm_cost } — it has no key slot —
// so a captured BYOK key is MARKED on the model chip but does NOT route yet.
// Real per-key routing lands with AUTOTIER1.
//
// STORAGE CHOICE: sessionStorage, not localStorage. A plaintext provider secret
// should not sit on disk indefinitely; tab-scoped lifetime is the safer resting
// place for a placeholder. AUTOTIER1 must replace this with secure server-side
// handling (a real secret store), NOT persist the key client-side. Flagged in
// the H24_COMPOSER1 report as an open decision for Butch.

/** Provider slugs behind the company-name Model menu. */
export type ByokProvider = 'anthropic' | 'openai' | 'xai' | 'meta' | 'mistral' | 'deepseek';

/**
 * Company-name Model menu → provider slug. `Auto` maps to null: Auto routes for
 * the Bee, so BYOK does not apply until a specific company is picked.
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
  /** Last 4 characters, for a "•••• 1234" hint. null when absent or too short. */
  last4: string | null;
}

const ABSENT: ByokState = { present: false, last4: null };
const KEY_PREFIX = 'h24:byok:';

function store(): Storage | null {
  // sessionStorage can throw or be absent (SSR, privacy mode). Fail closed.
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Masked presence for one provider. Safe to log — carries no secret. */
export function getByokState(provider: ByokProvider): ByokState {
  const s = store();
  if (!s) return ABSENT;
  try {
    const raw = s.getItem(KEY_PREFIX + provider);
    if (!raw) return ABSENT;
    return { present: true, last4: raw.length >= 4 ? raw.slice(-4) : null };
  } catch {
    return ABSENT;
  }
}

/**
 * Capture a key for a provider. Trims surrounding whitespace; an empty string
 * clears the slot. Returns the resulting masked state. Never logs the value.
 */
export function setByokKey(provider: ByokProvider, rawInput: string): ByokState {
  const s = store();
  const raw = rawInput.trim();
  if (!s) return raw ? { present: true, last4: raw.length >= 4 ? raw.slice(-4) : null } : ABSENT;
  try {
    if (!raw) {
      s.removeItem(KEY_PREFIX + provider);
      return ABSENT;
    }
    s.setItem(KEY_PREFIX + provider, raw);
    return { present: true, last4: raw.length >= 4 ? raw.slice(-4) : null };
  } catch {
    return ABSENT;
  }
}

/** Remove a stored key. No-op when storage is unavailable. */
export function clearByokKey(provider: ByokProvider): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY_PREFIX + provider);
  } catch {
    /* best-effort */
  }
}

/**
 * The ONLY raw read. Reserved for the AUTOTIER1 routing layer to pass the key to
 * the edge function's process — never for display and never for logging. Not
 * referenced by the composer today. Returns null when absent.
 */
export function readByokRawForRouting(provider: ByokProvider): string | null {
  const s = store();
  if (!s) return null;
  try {
    return s.getItem(KEY_PREFIX + provider);
  } catch {
    return null;
  }
}
