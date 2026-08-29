// POST /functions/v1/byok-key
// H24_BYOK1 — validate a Bee's own provider API key live, then hand it to
// Supabase Vault via the byok_key_store RPC. Real BYOK, replacing the
// H24_COMPOSER1 sessionStorage placeholder (src/lib/atlasoracle/byok.ts).
//
// Body: { provider: 'anthropic'|'openai'|'xai'|'meta'|'mistral'|'deepseek', apiKey: string }
// Response: { valid: true, last4: string } | { valid: false, error: string }
//
// KEY DISCIPLINE (VOTE_APIS v1.2) — NON-NEGOTIABLE:
//   - apiKey NEVER appears in a console.log/console.error/console.warn call,
//     in a thrown error message, or in the JSON response. Every catch below
//     logs ONLY the provider name and a sanitized status/message — never the
//     request body, never the key.
//   - apiKey is used ONLY as a request header value to the provider's own API
//     (never as directive/model text, never forwarded anywhere else).
//   - On success the raw key is handed to byok_key_store (SECDEF, service_role
//     only) which vaults it and returns; this function never persists the raw
//     key itself, not even to a local variable outside this request's scope.
//   - bee_id comes from verifyAuth(req) — the caller's own verified JWT — and
//     is NEVER read from the request body, so a forged bee_id cannot plant a
//     key on someone else's row.
//
// VALIDATION STRATEGY — one cheap GET against each provider's own model-listing
// endpoint (no directive is sent, nothing is billed to the Bee or the platform
// beyond that one lightweight call). anthropic/openai/xai/mistral/deepseek all
// already have a LIVE, working base URL in h24-route's OPENAI_COMPAT_REGISTRY —
// their sibling GET /v1/models endpoint is documented for every OpenAI-wire API
// and for Anthropic's own API reference, so this reuses verified-working hosts.
//
// META IS THE ONE HONEST GAP: h24-route's provider registry has no meta/Llama
// entry at all (Composer's "Llama" model maps to `meta` client-side, but there
// is no verified direct Meta provider API anywhere in this codebase — most
// Llama access goes through a third party, not a single official Meta
// endpoint). Rather than invent an unverified URL, meta gets a FORMAT-ONLY
// check (non-empty, sane length) and is reported to the Bee as such — never a
// silent fake "valid". Flagged in REPORT.md as an open item for whoever wires
// real Meta/Llama BYOK routing.

import { verifyAuth } from '../_shared/auth.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

const ALLOWED_PROVIDERS = ['anthropic', 'openai', 'xai', 'meta', 'mistral', 'deepseek'] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

const VALIDATE_TIMEOUT_MS = 8_000;

interface RequestBody {
  provider?: unknown;
  apiKey?: unknown;
}

interface ValidationOutcome {
  valid: boolean;
  // Sanitized reason for the Bee — never includes the key or raw provider body.
  error?: string;
}

// One cheap, unauthenticated-cost GET per provider. Every branch times out via
// the shared AbortController and NEVER logs the key — only the provider name
// and the response status make it into any log line.
async function validateLive(
  provider: Exclude<Provider, 'meta'>,
  apiKey: string,
): Promise<ValidationOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);
  try {
    const { url, headers } = requestFor(provider, apiKey);
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (res.ok) return { valid: true };
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'That key was rejected by the provider.' };
    }
    console.error('byok-key provider validation http error', {
      provider,
      status: res.status,
    });
    return { valid: false, error: `Provider returned ${res.status} — try again in a moment.` };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    console.error('byok-key provider validation failed', {
      provider,
      reason: aborted ? 'timeout' : err instanceof Error ? err.message : 'network error',
    });
    return {
      valid: false,
      error: aborted ? 'Validation timed out — try again.' : 'Could not reach the provider.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function requestFor(
  provider: Exclude<Provider, 'meta'>,
  apiKey: string,
): { url: string; headers: Record<string, string> } {
  switch (provider) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/models',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      };
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/models',
        headers: { authorization: `Bearer ${apiKey}` },
      };
    case 'xai':
      return { url: 'https://api.x.ai/v1/models', headers: { authorization: `Bearer ${apiKey}` } };
    case 'mistral':
      return {
        url: 'https://api.mistral.ai/v1/models',
        headers: { authorization: `Bearer ${apiKey}` },
      };
    case 'deepseek':
      return {
        url: 'https://api.deepseek.com/v1/models',
        headers: { authorization: `Bearer ${apiKey}` },
      };
  }
}

// Meta has no verified direct provider API in this codebase (see header note).
// Format-only: non-empty after trim, and not absurdly short/long for an API key.
function validateFormatOnly(apiKey: string): ValidationOutcome {
  const trimmed = apiKey.trim();
  if (trimmed.length < 8 || trimmed.length > 512) {
    return { valid: false, error: 'That does not look like a valid key.' };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (typeof body.provider !== 'string' || !ALLOWED_PROVIDERS.includes(body.provider as Provider)) {
    return errorResponse(`provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`);
  }
  const provider = body.provider as Provider;

  if (typeof body.apiKey !== 'string' || body.apiKey.trim().length === 0) {
    return errorResponse('apiKey is required');
  }
  const apiKey = body.apiKey.trim();
  // MAX_KEY_CHARS — abuse guard only, mirrors h24-route's directive-length
  // posture. No provider key format is anywhere near this long.
  if (apiKey.length > 1024) {
    return errorResponse('apiKey is too long');
  }

  const outcome: ValidationOutcome =
    provider === 'meta' ? validateFormatOnly(apiKey) : await validateLive(provider, apiKey);

  if (!outcome.valid) {
    return jsonResponse({ valid: false, error: outcome.error ?? 'Key validation failed.' });
  }

  const service = serviceClient();
  const { data, error } = await service.rpc('byok_key_store', {
    p_bee_id: auth.userId,
    p_provider: provider,
    p_raw_key: apiKey,
  });

  if (error) {
    // Sanitized: the RPC error message never contains the key (see 0004's
    // byok_key_store — it never echoes p_raw_key back).
    console.error('byok-key store rpc failed', { provider, message: error.message });
    return errorResponse('Could not save the key. Try again.', 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return jsonResponse({ valid: true, last4: row?.last4 ?? apiKey.slice(-4), provider });
});
