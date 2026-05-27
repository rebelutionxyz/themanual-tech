// POST /functions/v1/atlasoracle-route
// AtlasOracle minimal-viable directive router.
// Hardcoded tier='standard', provider='claude-sonnet-4-6', cost=1.0 BLiNG! flat.
// Full tier routing + rate caps + frontier cost preview come in follow-up
// dispatches.
//
// Body:
//   {
//     directive:   string,   // required, the directive text
//     astra_slug?: string,   // optional; resolved against astra_registry
//     category?:   string,   // optional; one of the 10 directive categories
//   }
//
// On success (200):
//   {
//     directive_id, response, cost_bling, provider, tokens, escrow_balance_after
//   }
//
// Content-leak posture (per v1 escrow migration + platform_thesis.md):
//   The response is returned in the HTTP body and NEVER persisted.
//   atlasoracle_directives carries metadata only (cost, tokens, latency,
//   status). error_message captures SYSTEM-level errors, never directive or
//   response content.
//
// Replaces the prior scaffold mock dispatch. logDirective() helper from
// audit-log.ts was designed for one-shot INSERT after directive completion;
// the dispatch's pending-then-UPDATE lifecycle needs direct INSERT/UPDATE.
// The no-content-column guarantee is preserved by explicit column listing
// in both calls below — no directive_text or response_text references
// anywhere in this file.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { assembleCrossAstraCanon } from './canon.ts';

const ALLOWED_CATEGORIES = [
  'scaffold', 'draft', 'integrate', 'refactor', 'analyze',
  'classify', 'translate', 'estimate', 'correlate', 'suggest',
] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const PROVIDER_MODEL = 'claude-sonnet-4-6';
const PROVIDER_NAME = 'claude-sonnet-4-6';
const TIER = 'standard';
const COST_BLING = 1.0;
const MAX_TOKENS = 1500;
const MAX_DIRECTIVE_CHARS = 10_000;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface RouteBody {
  directive?: unknown;
  astra_slug?: unknown;
  category?: unknown;
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AnthropicMessageBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicMessageBlock[];
  usage?: AnthropicUsage;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const beeId = auth.userId;

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('atlasoracle-route fatal', {
      reason: 'ANTHROPIC_API_KEY not configured',
    });
    return errorResponse('Provider integration not configured', 503);
  }

  let body: RouteBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (
    typeof body.directive !== 'string'
    || body.directive.trim().length === 0
    || body.directive.length > MAX_DIRECTIVE_CHARS
  ) {
    return errorResponse(
      `directive must be a non-empty string ≤ ${MAX_DIRECTIVE_CHARS} chars`,
    );
  }
  const directive = body.directive.trim();

  let category: Category = 'suggest';
  if (body.category !== undefined) {
    if (
      typeof body.category !== 'string'
      || !ALLOWED_CATEGORIES.includes(body.category as Category)
    ) {
      return errorResponse(
        `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
      );
    }
    category = body.category as Category;
  }

  const astraSlug =
    typeof body.astra_slug === 'string' && body.astra_slug.length > 0
      ? body.astra_slug
      : null;

  const jwt = req.headers.get('Authorization')!.slice('Bearer '.length);
  const userSb = userClient(jwt);
  const service = serviceClient();

  // Resolve astra_id. Per OG HUMAN direction: missing or unknown slug falls
  // back to the themanual row + log a warning for unknown.
  let astraId: string | null = null;
  {
    const { data: fallback } = await service
      .from('astra_registry')
      .select('id')
      .eq('slug', 'themanual')
      .maybeSingle();
    if (!fallback) {
      console.error('atlasoracle-route fatal', {
        reason: 'themanual astra_registry row missing',
      });
      return errorResponse('Astra registry not configured', 500);
    }
    astraId = fallback.id;

    if (astraSlug) {
      const { data: match } = await service
        .from('astra_registry')
        .select('id')
        .eq('slug', astraSlug)
        .maybeSingle();
      if (match) {
        astraId = match.id;
      } else {
        console.warn('atlasoracle-route astra_slug unknown', {
          bee_id: beeId, astra_slug: astraSlug,
        });
      }
    }
  }

  // Pre-flight escrow balance check (cold-start UX cue, not a debit guarantee).
  const { data: balanceResult, error: balanceErr } = await userSb.rpc(
    'atlasoracle_get_escrow_balance',
    { p_bee_id: beeId },
  );
  if (balanceErr) {
    console.error('atlasoracle-route balance lookup failed', {
      bee_id: beeId, message: balanceErr.message,
    });
    return errorResponse('Escrow balance lookup failed', 500);
  }
  const escrowBalance = Number(balanceResult?.balance ?? 0);
  if (escrowBalance < COST_BLING) {
    return jsonResponse({
      error: 'Insufficient AtlasOracle escrow. Fund your escrow to continue.',
      escrow_balance: escrowBalance,
      cost_bling: COST_BLING,
      action: 'fund_escrow',
    }, 402);
  }

  // Insert pending directive row. Metadata only — no directive content.
  const { data: pendingRow, error: insertErr } = await service
    .from('atlasoracle_directives')
    .insert({
      bee_id: beeId,
      astra_id: astraId,
      directive_category: category,
      tier: TIER,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertErr || !pendingRow) {
    console.error('atlasoracle-route directive insert failed', {
      bee_id: beeId, message: insertErr?.message ?? 'no row',
    });
    return errorResponse('Failed to create directive record', 500);
  }
  const directiveId: string = pendingRow.id;
  console.log('atlasoracle-route directive created', {
    directive_id: directiveId, bee_id: beeId, category, astra_slug: astraSlug,
  });

  // Call Anthropic.
  const systemBlock = [
    {
      type: 'text',
      text: assembleCrossAstraCanon(),
      cache_control: { type: 'ephemeral' },
    },
  ];
  const startedAt = Date.now();
  let providerResponse: Response;
  try {
    providerResponse = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: PROVIDER_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemBlock,
        messages: [{ role: 'user', content: directive }],
      }),
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : 'network failure';
    await markFailed(service, directiveId, latencyMs, `provider_network: ${msg}`);
    console.error('atlasoracle-route provider network error', {
      directive_id: directiveId, message: msg,
    });
    return errorResponse('Provider unreachable', 502);
  }
  const latencyMs = Date.now() - startedAt;

  if (!providerResponse.ok) {
    let providerBodyText = '';
    try {
      providerBodyText = await providerResponse.text();
    } catch {
      providerBodyText = '<unreadable>';
    }
    const sanitized = `provider_http_${providerResponse.status}`;
    await markFailed(service, directiveId, latencyMs, sanitized);
    console.error('atlasoracle-route provider http error', {
      directive_id: directiveId,
      status: providerResponse.status,
      body_excerpt: providerBodyText.slice(0, 200),
    });
    return errorResponse('Provider returned an error', 502);
  }

  let payload: AnthropicResponse;
  try {
    payload = await providerResponse.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown parse error';
    await markFailed(service, directiveId, latencyMs, `provider_parse: ${msg}`);
    console.error('atlasoracle-route provider parse error', {
      directive_id: directiveId, message: msg,
    });
    return errorResponse('Provider response malformed', 502);
  }

  const responseText = (payload.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text!)
    .join('\n');
  if (responseText.length === 0) {
    await markFailed(service, directiveId, latencyMs, 'provider_empty_content');
    console.error('atlasoracle-route provider empty content', {
      directive_id: directiveId,
    });
    return errorResponse('Provider returned empty content', 502);
  }

  const usage = payload.usage ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cachedTokens =
    (usage.cache_creation_input_tokens ?? 0)
    + (usage.cache_read_input_tokens ?? 0);

  // Debit escrow. May fail on race (escrow drained between pre-check and
  // debit) — handle the 402 case explicitly.
  const { data: debitResult, error: debitErr } = await service.rpc(
    'atlasoracle_debit',
    { p_bee_id: beeId, p_amount: COST_BLING, p_source_ref: directiveId },
  );
  if (debitErr) {
    const msg = debitErr.message ?? 'debit failed';
    await markFailed(service, directiveId, latencyMs, `debit: ${msg}`);
    console.error('atlasoracle-route debit failed', {
      directive_id: directiveId, message: msg,
    });
    if (/insufficient/i.test(msg)) {
      return jsonResponse({
        error: 'Escrow drained during directive execution. Fund and retry.',
        action: 'fund_escrow',
      }, 402);
    }
    return errorResponse('Failed to debit escrow', 500);
  }
  const escrowBalanceAfter = Number(debitResult?.escrow_balance_after ?? 0);

  // Finalize directive row.
  const { error: finalizeErr } = await service
    .from('atlasoracle_directives')
    .update({
      provider_selected: PROVIDER_NAME,
      cost_bling: COST_BLING,
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      status: 'success',
      success: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', directiveId);
  if (finalizeErr) {
    // Debit landed; log but don't fail the request. Bee paid for the
    // directive — best-effort audit-row cleanup at this stage.
    console.error('atlasoracle-route directive finalize failed', {
      directive_id: directiveId, message: finalizeErr.message,
    });
  }

  console.log('atlasoracle-route directive ok', {
    directive_id: directiveId,
    bee_id: beeId,
    category,
    provider: PROVIDER_NAME,
    cost_bling: COST_BLING,
    latency_ms: latencyMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
    escrow_balance_after: escrowBalanceAfter,
  });

  return jsonResponse({
    directive_id: directiveId,
    response: responseText,
    cost_bling: COST_BLING,
    provider: PROVIDER_NAME,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      cached: cachedTokens,
    },
    escrow_balance_after: escrowBalanceAfter,
  });
});

async function markFailed(
  // deno-lint-ignore no-explicit-any
  service: any,
  directiveId: string,
  latencyMs: number,
  errorMessage: string,
): Promise<void> {
  const { error } = await service
    .from('atlasoracle_directives')
    .update({
      status: 'failed',
      success: false,
      latency_ms: latencyMs,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', directiveId);
  if (error) {
    console.error('atlasoracle-route markFailed update error', {
      directive_id: directiveId, message: error.message,
    });
  }
}
