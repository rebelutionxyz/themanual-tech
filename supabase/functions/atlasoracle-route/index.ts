// POST /functions/v1/atlasoracle-route
// AtlasOracle directive router — v1 completion (tier routing, cost-shape
// pricing, rate caps, frontier cost-preview).
//
// Body:
//   {
//     directive:    string,                                // required, non-empty
//     tier?:        'free' | 'standard' | 'frontier',      // default 'standard'
//     astra_slug?:  string,                                // default themanual
//     category?:    string,                                // default 'suggest'
//     confirm_cost?: boolean,                              // frontier preview override
//   }
//
// Tier behavior:
//   - free      → claude-haiku-4-5, cost 0
//   - standard  → claude-sonnet-4-6, cost-shape pricing (0.5 / 1.0 / 2.0 BLiNG!)
//   - frontier  → claude-opus-4-7, base 5 + surcharges, cap 50, preview > 10
//
// Rate caps (per rate-cap-pricing.md §5.1) enforced server-side via
// atlasoracle_check_rate_caps RPC.
//
// Charge-the-lesser (per bling-ledger-interface.md §13 Q8): Bee is debited
// min(estimated, actual). Treasury absorbs underestimates. If actual exceeds
// estimate by >25 %, console.warn for cost-model tuning.
//
// Content-leak posture (per v1 escrow migration + platform_thesis.md): the
// response is returned in the HTTP body and NEVER persisted. atlasoracle_directives
// carries metadata only.
//
// Frontier-preview row policy: NO directive row inserted for preview-only
// returns (the request didn't fire Anthropic and didn't debit). Trade-off
// flagged in commit — observability of preview→confirm conversion is the
// cost; can be added later with a dedicated event table or new column.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { assembleCrossAstraCanon } from './canon.ts';

const ALLOWED_CATEGORIES = [
  'scaffold', 'draft', 'integrate', 'refactor', 'analyze',
  'classify', 'translate', 'estimate', 'correlate', 'suggest',
] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const ALLOWED_TIERS = ['free', 'standard', 'frontier'] as const;
type Tier = typeof ALLOWED_TIERS[number];

const TIER_PROVIDER_MODEL: Record<Tier, string> = {
  free:     'claude-haiku-4-5',
  standard: 'claude-sonnet-4-6',
  frontier: 'claude-opus-4-7',
};

// Default expected output tokens by tier — used in cost estimation.
const TIER_DEFAULT_OUTPUT_TOKENS: Record<Tier, number> = {
  free:     500,
  standard: 1500,
  frontier: 5000,
};

// max_tokens passed to Anthropic by tier — slightly above expected output
// to give the model headroom.
const TIER_MAX_TOKENS: Record<Tier, number> = {
  free:     800,
  standard: 1500,
  frontier: 5000,
};

const FRONTIER_PREVIEW_THRESHOLD_BLING = 10.0;
const ACTUAL_OVERAGE_WARN_RATIO = 1.25;
const CHARS_PER_TOKEN = 4; // rough English heuristic
const MAX_DIRECTIVE_CHARS = 10_000;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Canon bundle length is fixed — compute once at module init for estimation.
const CANON_BUNDLE_LENGTH = assembleCrossAstraCanon().length;

interface RouteBody {
  directive?:    unknown;
  tier?:         unknown;
  astra_slug?:   unknown;
  category?:     unknown;
  confirm_cost?: unknown;
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

// Token estimation from text length. Coarse but predictable.
function estimateInputTokens(directive: string): number {
  return Math.ceil(directive.length / CHARS_PER_TOKEN)
    + Math.ceil(CANON_BUNDLE_LENGTH / CHARS_PER_TOKEN);
}

// Cost calculation in BLiNG! per rate-cap-pricing.md §4.
//
// Standard cost-shape boundaries from the dispatch overlap (e.g. input=5000
// output=2000 matches both medium and large). Resolution: largest shape
// wins. Check large first, then medium, default short.
function calculateCostBling(
  tier: Tier,
  inputTokens: number,
  outputTokens: number,
): number {
  if (tier === 'free') return 0;

  if (tier === 'standard') {
    if (inputTokens >= 10000 || outputTokens >= 1500) return 2.0; // large
    if (inputTokens >= 3000  || outputTokens >= 500)  return 1.0; // medium
    return 0.5;                                                    // short
  }

  // frontier
  let cost = 5.0;
  if (inputTokens > 10000) {
    cost += Math.ceil((inputTokens - 10000) / 1000) * 0.1;
  }
  if (outputTokens > 2000) {
    cost += Math.ceil((outputTokens - 2000) / 1000) * 0.5;
  }
  return Math.min(cost, 50.0);
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

  // Tier (default 'standard').
  let tier: Tier = 'standard';
  if (body.tier !== undefined) {
    if (typeof body.tier !== 'string' || !ALLOWED_TIERS.includes(body.tier as Tier)) {
      return errorResponse(`tier must be one of: ${ALLOWED_TIERS.join(', ')}`);
    }
    tier = body.tier as Tier;
  }

  // Category (default 'suggest').
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

  const confirmCost = body.confirm_cost === true;
  const astraSlug =
    typeof body.astra_slug === 'string' && body.astra_slug.length > 0
      ? body.astra_slug
      : null;

  const jwt = req.headers.get('Authorization')!.slice('Bearer '.length);
  const userSb = userClient(jwt);
  const service = serviceClient();

  // ─── Rate cap check (BEFORE astra lookup / escrow check / directive insert). ───
  const { data: rateCapResult, error: rateCapErr } = await service.rpc(
    'atlasoracle_check_rate_caps',
    { p_bee_id: beeId, p_tier: tier },
  );
  if (rateCapErr) {
    console.error('atlasoracle-route rate cap check failed', {
      bee_id: beeId, tier, message: rateCapErr.message,
    });
    return errorResponse('Rate cap check failed', 500);
  }
  if (rateCapResult?.allowed === false) {
    console.log('atlasoracle-route rate capped', {
      bee_id: beeId, tier, caps_hit: rateCapResult.caps_hit,
    });
    return jsonResponse({
      error: 'Rate cap reached. Try again later.',
      retry_after_seconds: rateCapResult.retry_after_seconds ?? 60,
      caps_hit: rateCapResult.caps_hit ?? [],
    }, 429);
  }

  // ─── Resolve astra_id (themanual fallback per OG HUMAN direction). ───
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

  // ─── Cost estimation. ───
  const estimatedInputTokens  = estimateInputTokens(directive);
  const estimatedOutputTokens = TIER_DEFAULT_OUTPUT_TOKENS[tier];
  const estimatedCostBling = calculateCostBling(
    tier, estimatedInputTokens, estimatedOutputTokens,
  );

  // ─── Frontier cost-preview gate. ───
  if (
    tier === 'frontier'
    && estimatedCostBling > FRONTIER_PREVIEW_THRESHOLD_BLING
    && !confirmCost
  ) {
    console.log('atlasoracle-route frontier preview', {
      bee_id: beeId,
      estimated_cost_bling: estimatedCostBling,
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: estimatedOutputTokens,
    });
    return jsonResponse({
      cost_preview: true,
      tier,
      provider: TIER_PROVIDER_MODEL[tier],
      estimated_cost_bling: estimatedCostBling,
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: estimatedOutputTokens,
      action: 'confirm_cost',
      hint: 'Re-call with confirm_cost: true to execute this directive.',
    });
  }

  // ─── Escrow pre-check (using ESTIMATED cost). ───
  // Free tier (cost 0) skips the pre-check entirely.
  if (estimatedCostBling > 0) {
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
    if (escrowBalance < estimatedCostBling) {
      return jsonResponse({
        error: 'Insufficient AtlasOracle escrow. Fund your escrow to continue.',
        escrow_balance: escrowBalance,
        cost_bling: estimatedCostBling,
        action: 'fund_escrow',
      }, 402);
    }
  }

  // ─── Insert pending directive row (metadata only, no content). ───
  const { data: pendingRow, error: insertErr } = await service
    .from('atlasoracle_directives')
    .insert({
      bee_id: beeId,
      astra_id: astraId,
      directive_category: category,
      tier,
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
    directive_id: directiveId, bee_id: beeId, tier, category,
    astra_slug: astraSlug,
    estimated_cost_bling: estimatedCostBling,
  });

  // ─── Call Anthropic. ───
  const providerModel = TIER_PROVIDER_MODEL[tier];
  const maxTokens = TIER_MAX_TOKENS[tier];
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
        model: providerModel,
        max_tokens: maxTokens,
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
    try { providerBodyText = await providerResponse.text(); }
    catch { providerBodyText = '<unreadable>'; }
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
  const inputTokens  = usage.input_tokens  ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cachedTokens =
    (usage.cache_creation_input_tokens ?? 0)
    + (usage.cache_read_input_tokens ?? 0);

  // ─── Charge-the-lesser cost. ───
  const actualCostBling = calculateCostBling(tier, inputTokens, outputTokens);
  const finalCostBling = Math.min(estimatedCostBling, actualCostBling);
  if (
    estimatedCostBling > 0
    && actualCostBling > estimatedCostBling * ACTUAL_OVERAGE_WARN_RATIO
  ) {
    console.warn('atlasoracle-route actual cost exceeded estimate >25%', {
      directive_id: directiveId,
      tier,
      estimated_cost_bling: estimatedCostBling,
      actual_cost_bling: actualCostBling,
      treasury_absorbed_bling: actualCostBling - estimatedCostBling,
      estimated_input_tokens: estimatedInputTokens,
      actual_input_tokens: inputTokens,
      estimated_output_tokens: estimatedOutputTokens,
      actual_output_tokens: outputTokens,
    });
  }

  // ─── Debit (skip for free tier / zero cost). ───
  let escrowBalanceAfter: number | null = null;
  if (finalCostBling > 0) {
    const { data: debitResult, error: debitErr } = await service.rpc(
      'atlasoracle_debit',
      {
        p_bee_id: beeId,
        p_amount: finalCostBling,
        p_source_ref: directiveId,
      },
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
    escrowBalanceAfter = Number(debitResult?.escrow_balance_after ?? 0);
  }

  // ─── Finalize directive row. ───
  const { error: finalizeErr } = await service
    .from('atlasoracle_directives')
    .update({
      provider_selected: providerModel,
      cost_bling: finalCostBling,
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
    console.error('atlasoracle-route directive finalize failed', {
      directive_id: directiveId, message: finalizeErr.message,
    });
  }

  console.log('atlasoracle-route directive ok', {
    directive_id: directiveId,
    bee_id: beeId,
    tier,
    category,
    provider: providerModel,
    estimated_cost_bling: estimatedCostBling,
    actual_cost_bling: actualCostBling,
    final_cost_bling: finalCostBling,
    latency_ms: latencyMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
    escrow_balance_after: escrowBalanceAfter,
  });

  return jsonResponse({
    directive_id: directiveId,
    response: responseText,
    cost_bling: finalCostBling,
    provider: providerModel,
    tier,
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
