// POST /functions/v1/atlasoracle-route
//
// Mock directive router. Validates request, picks a provider (tier-based
// fallback or model_preference if valid), logs metadata to
// atlasoracle_directives, returns a stub response.
//
// This is scaffolding only. Real provider dispatch lives in a later session
// once provider partnerships + cost tables are locked.
//
// Body: {
//   directive: string,
//   tier: 'free' | 'standard' | 'frontier',
//   context?: object,
//   canon_paths?: string[],
//   model_preference?: string,
//   astra_slug?: string,            // defaults to 'themanual'
//   nova_slug?: string,             // optional Nova scope
//   directive_category?: string,    // one of 10 routing buckets; defaults to 'analyze'
// }
// Auth: Bearer <supabase-user-jwt>
//
// Response: { response: string, provider: string, cost_bling: number, latency_ms: number, directive_id: string }
//
// Content-leak posture: the `directive` and the mock `response` strings are
// NEVER passed to the audit-log writer. Only metadata fields land in
// atlasoracle_directives.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { logDirective } from '../_shared/atlasoracle/audit-log.ts';

const VALID_CATEGORIES = [
  'scaffold', 'draft', 'integrate', 'refactor', 'analyze',
  'classify', 'translate', 'estimate', 'correlate', 'suggest',
] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const VALID_TIERS = ['free', 'standard', 'frontier'] as const;
type Tier = (typeof VALID_TIERS)[number];

const TIER_DEFAULT_PROVIDER: Record<Tier, string> = {
  free: 'oss-llama-3',
  standard: 'claude-sonnet-4-6',
  frontier: 'claude-opus-4-7',
};

interface RouteBody {
  directive?: unknown;
  tier?: unknown;
  context?: unknown;
  canon_paths?: unknown;
  model_preference?: unknown;
  astra_slug?: unknown;
  nova_slug?: unknown;
  directive_category?: unknown;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: RouteBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const {
    directive,
    tier,
    model_preference,
    astra_slug = 'themanual',
    nova_slug,
    directive_category = 'analyze',
  } = body;

  if (typeof directive !== 'string' || directive.length === 0 || directive.length > 10_000) {
    return errorResponse('directive must be a non-empty string ≤ 10000 chars');
  }
  if (typeof tier !== 'string' || !VALID_TIERS.includes(tier as Tier)) {
    return errorResponse(`tier must be one of: ${VALID_TIERS.join(', ')}`);
  }
  if (typeof astra_slug !== 'string' || astra_slug.length === 0) {
    return errorResponse('astra_slug must be a non-empty string');
  }
  if (nova_slug !== undefined && typeof nova_slug !== 'string') {
    return errorResponse('nova_slug must be a string when provided');
  }
  if (typeof directive_category !== 'string' || !VALID_CATEGORIES.includes(directive_category as Category)) {
    return errorResponse(`directive_category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (model_preference !== undefined && typeof model_preference !== 'string') {
    return errorResponse('model_preference must be a string when provided');
  }

  const sb = serviceClient();

  // Resolve astra_slug → astra_id.
  const { data: astraRow, error: astraErr } = await sb
    .from('astra_registry')
    .select('id')
    .eq('slug', astra_slug)
    .maybeSingle();
  if (astraErr) return errorResponse(`astra lookup failed: ${astraErr.message}`, 500);
  if (!astraRow) return errorResponse(`unknown astra_slug: ${astra_slug}`, 404);

  // Optional nova lookup.
  let novaId: string | null = null;
  if (typeof nova_slug === 'string' && nova_slug.length > 0) {
    const { data: novaRow, error: novaErr } = await sb
      .from('nova_registry')
      .select('id')
      .eq('astra_id', astraRow.id)
      .eq('slug', nova_slug)
      .maybeSingle();
    if (novaErr) return errorResponse(`nova lookup failed: ${novaErr.message}`, 500);
    if (!novaRow) return errorResponse(`unknown nova_slug for astra: ${nova_slug}`, 404);
    novaId = novaRow.id;
  }

  // Provider selection — prefer model_preference if it's an active provider,
  // else fall back to tier default.
  let provider = TIER_DEFAULT_PROVIDER[tier as Tier];
  if (typeof model_preference === 'string' && model_preference.length > 0) {
    const { data: pref } = await sb
      .from('atlasoracle_provider_pool')
      .select('provider_name')
      .eq('provider_name', model_preference)
      .eq('active', true)
      .maybeSingle();
    if (pref) provider = pref.provider_name;
  }

  // ─── Mock dispatch ───────────────────────────────────────────────────
  // Real provider call goes here in a future session.
  const startedAt = performance.now();
  const responseText = `[stub] Routed to ${provider}. Real implementation pending.`;
  const latencyMs = Math.round(performance.now() - startedAt);
  const costBling = 0;
  const success = true;
  // ─────────────────────────────────────────────────────────────────────

  // Log metadata ONLY via the type-checked audit-log helper.
  // The DirectiveMetadata type has no field for directive text or response
  // text — the compiler enforces the no-content guarantee.
  let logged;
  try {
    logged = await logDirective(sb, {
      beeId: auth.userId,
      astraId: astraRow.id,
      novaId,
      directiveCategory: directive_category as Category,
      tier: tier as Tier,
      providerSelected: provider,
      costBling,
      latencyMs,
      success,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errorResponse(msg, 500);
  }

  return jsonResponse({
    response: responseText,
    provider,
    cost_bling: costBling,
    latency_ms: latencyMs,
    directive_id: logged.id,
  });
});
