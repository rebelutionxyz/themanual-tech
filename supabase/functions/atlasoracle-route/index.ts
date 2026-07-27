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
// OPS11 (2026-07-27): standard and frontier are GATED OFF at PAID_TIERS_ENABLED
// and return 503 before any provider call — see the const's comment below. The
// pricing machinery under them is left intact and unexercised.
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
import { serviceClient } from '../_shared/supabase.ts';
import { assembleCrossAstraCanon } from './canon.ts';

const ALLOWED_CATEGORIES = [
  'scaffold', 'draft', 'integrate', 'refactor', 'analyze',
  'classify', 'translate', 'estimate', 'correlate', 'suggest',
] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const ALLOWED_TIERS = ['free', 'standard', 'frontier'] as const;
type Tier = typeof ALLOWED_TIERS[number];

// Model pins (OPS12, 2026-07-27). Prices re-verified live against
// platform.claude.com/docs/en/about-claude/models/overview.md on the day:
//   free      claude-haiku-4-5  $1 / $5    — still CURRENT, not swapped
//   standard  claude-sonnet-5   $3 / $15, intro $2 / $10 through 2026-08-31
//   frontier  claude-opus-5     $5 / $25   — price-neutral vs the 4.7 it replaces
// claude-sonnet-4-6 and claude-opus-4-7 are both listed Legacy as of that date.
// Reversal is a one-line revert of this map.
//
// OPS15 (2026-07-27) resolved the thinking-baseline prerequisite this comment
// used to carry: `thinking` and `output_config.effort` are now sent explicitly
// per tier and TIER_MAX_TOKENS has been re-baselined. See TIER_THINKING below.
const TIER_PROVIDER_MODEL: Record<Tier, string> = {
  free:     'claude-haiku-4-5',
  standard: 'claude-sonnet-5',
  frontier: 'claude-opus-5',
};

// ─── Thinking baseline (OPS15, 2026-07-27). ───
//
// Anthropic's effort doc, live-verified this day: max_tokens is "a hard limit
// on total output, thinking plus response text". Sending no `thinking` field
// means thinking OFF on Opus 4.7 / Sonnet 4.6 but ADAPTIVE THINKING ON at
// effort=high on Opus 5 / Sonnet 5. That mismatch, against the old tight
// max_tokens, is what OPS12 flagged as a blocker. Both are now explicit.
//
//   free      Haiku 4.5 supports NEITHER adaptive thinking NOR effort, so both
//             fields are omitted for that tier. Behaviour is unchanged — this
//             is why free was never at risk.
//   standard  Sonnet 5, adaptive + effort=medium. The docs describe medium as
//             "comparable to Claude Sonnet 4.6 at high effort", i.e. it holds
//             the quality the standard tier already had, more cheaply.
//   frontier  Opus 5, adaptive + effort=high (the API default, stated openly
//             rather than inherited).
interface ThinkingConfig {
  thinking?: { type: 'adaptive' };
  effort?:   'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
const TIER_THINKING: Record<Tier, ThinkingConfig> = {
  free:     {},
  standard: { thinking: { type: 'adaptive' }, effort: 'medium' },
  frontier: { thinking: { type: 'adaptive' }, effort: 'high' },
};

// Expected output tokens = base + (input × scale), capped at TIER_MAX_TOKENS.
//
// Two jobs. First, the estimate must now cover THINKING as well as response
// text, so the bases are far above the old response-only figures. Second,
// making the estimate scale with directive size is what makes the frontier
// confirm_cost gate reachable at all — see FRONTIER_PREVIEW_THRESHOLD_TOKENS.
const TIER_BASE_OUTPUT_TOKENS: Record<Tier, number> = {
  free:     500,    // unchanged: Haiku 4.5 does not think
  standard: 3000,   // ~1500 response + ~1500 thinking headroom
  frontier: 8000,   // ~5000 response + ~3000 thinking headroom
};
const TIER_OUTPUT_SCALE: Record<Tier, number> = {
  free:     0,      // flat — keeps the free tier's estimate predictable
  standard: 1,
  frontier: 2,
};

// max_tokens: a ceiling, not a reservation — unused headroom costs nothing,
// while too little truncates mid-thought and lands on provider_empty_content
// AFTER the provider has billed. Sized generously on purpose.
const TIER_MAX_TOKENS: Record<Tier, number> = {
  free:     800,     // unchanged
  standard: 8_000,
  frontier: 32_000,
};

// ─── Paid tiers (OPS11 gate, re-opened by OPS15). ───
//
// OPS11 shut these off because atlasoracle_debit could never succeed: it wrote
// two bling_transactions legs sharing one source_ref against a unique index, so
// every paid directive called Anthropic, failed the debit, discarded the answer
// and returned 500. OPS15 does not fix that RPC — it stops calling it. Paid
// tiers now debit oracle_token_ledger instead (DB8), append-only, one row.
// atlasoracle_debit / _credit are untouched and dormant per OPEN-7.
const PAID_TIERS_ENABLED = true;

// Frontier confirm_cost gate, in Oracle Tokens.
//
// OPS10 finding 2: the old gate was arithmetically unreachable — the frontier
// estimate was a constant 6.5 BLiNG! against a threshold of 10, so it could
// never fire for any input. A gate that NEVER fires and a gate that ALWAYS
// fires are the same bug wearing different clothes, so both bounds matter:
//
//   cost(input) = input/1e6 × 10000                       (input leg)
//               + min(32000, 8000 + 2·input)/1e6 × 50000  (output leg)
// For input < 12000 tokens that reduces to  400 + 0.11·input
//
// The canon prefix is 1,529 tokens (6,116 chars, measured 2026-07-27), and it
// rides on EVERY request, so the frontier estimate can never fall below
//   400 + 0.11 × 1530 ≈ 568.
// A threshold at 550 therefore fires on every frontier directive including an
// empty one — verified live in the OPS15 battery before this constant was
// retuned. 700 puts the gate inside the real range:
//   floor  (empty directive)      input ≈ 1,530 ⇒ cost ≈ 568  → no gate
//   gate   fires when input > 2,727 ⇒ ≈ 4,792 directive chars
//   ceiling (MAX_DIRECTIVE_CHARS)  input ≈ 4,029 ⇒ cost ≈ 843  → gate
// So it covers roughly the upper half of the permitted directive range and is
// clear of both bounds. Proof reproduced in REPORT.md.
const FRONTIER_PREVIEW_THRESHOLD_TOKENS = 700;
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

// Expected output tokens for a tier, given the estimated input size.
function estimateOutputTokens(tier: Tier, inputTokens: number): number {
  return Math.min(
    TIER_MAX_TOKENS[tier],
    TIER_BASE_OUTPUT_TOKENS[tier] + inputTokens * TIER_OUTPUT_SCALE[tier],
  );
}

// ─── Rates as DATA (OPS15). ───
//
// Per-model Oracle Token rates live in oracle_model_rates (DB8), not in code,
// so re-pricing is an INSERT rather than a deploy. Current row per model =
// newest active row by effective_from, which preserves rate history: a debit
// can always be re-derived against the rate that was live when it happened.
interface ModelRate {
  input_tokens_per_m:  number;
  output_tokens_per_m: number;
  cached_input_per_m:  number | null;
}

// Cost in Oracle Tokens.
//
// ⚠ Anthropic reports these counts as DISJOINT, not nested. `input_tokens` is
// the UNCACHED input only; `cache_read_input_tokens` and
// `cache_creation_input_tokens` are separate buckets that it already excludes.
// Total input = input_tokens + cached. They are therefore billed on separate
// legs and must NOT be subtracted from one another.
//
// The first cut of this function treated cached as a subset of input and did
// `min(cached, input)`, which billed ~16 cached tokens instead of ~2,256 and
// undercharged by roughly 10x. Caught by the OPS15 live battery (B1: charged
// 0.1064 where the correct figure was 1.0668); the two affected test debits
// were corrected with reversing adjustment entries rather than edited.
//
// If a model has no cached rate configured, cached tokens fall back to the full
// input rate — over-charging the Bee slightly is the safe direction for a
// missing rate, and it is visible rather than silent.
function calculateCostTokens(
  rate: ModelRate,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number,
): number {
  const cachedRate = rate.cached_input_per_m ?? rate.input_tokens_per_m;

  const cost =
      (inputTokens  / 1_000_000) * rate.input_tokens_per_m
    + (cachedTokens / 1_000_000) * cachedRate
    + (outputTokens / 1_000_000) * rate.output_tokens_per_m;

  // Six decimals matches oracle_token_ledger.amount_tokens numeric(20,6).
  return Math.round(cost * 1_000_000) / 1_000_000;
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

  // ─── Paid-tier guard (OPS11). ───
  // Refused as early as tier is known — ahead of the rate-cap RPC, the astra
  // lookup, the escrow pre-check, the directive row insert and, above all, the
  // provider call. Zero spend, zero orphan rows. Free tier is untouched.
  if (!PAID_TIERS_ENABLED && tier !== 'free') {
    console.log('atlasoracle-route paid tier refused', { bee_id: beeId, tier });
    return jsonResponse({
      error: 'tier_unavailable',
      message: 'paid tiers temporarily offline',
    }, 503);
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

  // OPS15: the user-scoped client is gone with the escrow path — it existed
  // only to call atlasoracle_get_escrow_balance as the Bee. Token balances are
  // read server-side from the oracle_token_balances view instead.
  const service = serviceClient();

  // ─── Rate cap check (BEFORE astra lookup / balance check / directive insert). ───
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

  // ─── Rate lookup (rates as data — OPS15). ───
  const providerModelForRate = TIER_PROVIDER_MODEL[tier];
  let rate: ModelRate | null = null;
  if (tier !== 'free') {
    const { data: rateRow, error: rateErr } = await service
      .from('oracle_model_rates')
      .select('input_tokens_per_m, output_tokens_per_m, cached_input_per_m')
      .eq('model_name', providerModelForRate)
      .eq('active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rateErr || !rateRow) {
      // Refuse rather than guess. Charging an invented rate is worse than a 503.
      console.error('atlasoracle-route rate lookup failed', {
        bee_id: beeId, model: providerModelForRate,
        message: rateErr?.message ?? 'no active rate row',
      });
      return errorResponse('Pricing not configured for this tier', 503);
    }
    rate = {
      input_tokens_per_m:  Number(rateRow.input_tokens_per_m),
      output_tokens_per_m: Number(rateRow.output_tokens_per_m),
      cached_input_per_m:  rateRow.cached_input_per_m === null
        ? null : Number(rateRow.cached_input_per_m),
    };
  }

  // ─── Cost estimation, in Oracle Tokens. ───
  const estimatedInputTokens  = estimateInputTokens(directive);
  const estimatedOutputTokens = estimateOutputTokens(tier, estimatedInputTokens);
  const estimatedCostTokens = rate === null
    ? 0
    : calculateCostTokens(rate, estimatedInputTokens, estimatedOutputTokens, 0);

  // ─── Frontier cost-preview gate (now reachable — see the constant). ───
  if (
    tier === 'frontier'
    && estimatedCostTokens > FRONTIER_PREVIEW_THRESHOLD_TOKENS
    && !confirmCost
  ) {
    console.log('atlasoracle-route frontier preview', {
      bee_id: beeId,
      estimated_cost_tokens: estimatedCostTokens,
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: estimatedOutputTokens,
    });
    return jsonResponse({
      cost_preview: true,
      tier,
      provider: TIER_PROVIDER_MODEL[tier],
      estimated_cost_tokens: estimatedCostTokens,
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: estimatedOutputTokens,
      action: 'confirm_cost',
      hint: 'Re-call with confirm_cost: true to execute this directive.',
    });
  }

  // ─── Oracle Token balance pre-check (using ESTIMATED cost). ───
  //
  // Reads the oracle_token_balances view (DB8). Free tier costs 0 and skips it.
  // This runs BEFORE the directive row insert and before the provider call, so
  // an underfunded Bee costs the platform nothing.
  let balanceBefore = 0;
  if (estimatedCostTokens > 0) {
    const { data: balRow, error: balErr } = await service
      .from('oracle_token_balances')
      .select('balance_tokens')
      .eq('bee_id', beeId)
      .maybeSingle();
    if (balErr) {
      console.error('atlasoracle-route token balance lookup failed', {
        bee_id: beeId, message: balErr.message,
      });
      return errorResponse('Token balance lookup failed', 500);
    }
    // No ledger rows yet = no view row = zero balance, not an error.
    balanceBefore = Number(balRow?.balance_tokens ?? 0);

    if (balanceBefore < estimatedCostTokens) {
      console.log('atlasoracle-route insufficient tokens', {
        bee_id: beeId, tier,
        required_tokens: estimatedCostTokens,
        available_tokens: balanceBefore,
      });
      return jsonResponse({
        error: 'Insufficient Oracle Tokens.',
        required_tokens: estimatedCostTokens,
        available_tokens: balanceBefore,
        action: 'get_tokens',
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
    estimated_cost_tokens: estimatedCostTokens,
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
  // Thinking + effort per tier (OPS15). Omitted entirely for free, because
  // Haiku 4.5 supports neither and would reject them.
  const thinkingCfg = TIER_THINKING[tier];
  const providerBody: Record<string, unknown> = {
    model: providerModel,
    max_tokens: maxTokens,
    system: systemBlock,
    messages: [{ role: 'user', content: directive }],
  };
  if (thinkingCfg.thinking) providerBody.thinking = thinkingCfg.thinking;
  if (thinkingCfg.effort)   providerBody.output_config = { effort: thinkingCfg.effort };

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
      body: JSON.stringify(providerBody),
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : 'network failure';
    await markFailed(
      service, directiveId, latencyMs, `provider_network: ${msg}`,
      { providerModel },
    );
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
    await markFailed(
      service, directiveId, latencyMs, sanitized, { providerModel },
    );
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
    await markFailed(
      service, directiveId, latencyMs, `provider_parse: ${msg}`,
      { providerModel },
    );
    console.error('atlasoracle-route provider parse error', {
      directive_id: directiveId, message: msg,
    });
    return errorResponse('Provider response malformed', 502);
  }

  // Usage is read BEFORE the empty-content check (OPS11) — the provider has
  // already billed us by this point, so the token counts must be available to
  // every failure path below, not just the success path.
  const usage = payload.usage ?? {};
  const inputTokens  = usage.input_tokens  ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cachedTokens =
    (usage.cache_creation_input_tokens ?? 0)
    + (usage.cache_read_input_tokens ?? 0);
  const spendTelemetry: FailureTelemetry = {
    providerModel, inputTokens, outputTokens, cachedTokens,
  };

  const responseText = (payload.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text!)
    .join('\n');
  if (responseText.length === 0) {
    await markFailed(
      service, directiveId, latencyMs, 'provider_empty_content', spendTelemetry,
    );
    console.error('atlasoracle-route provider empty content', {
      directive_id: directiveId,
    });
    return errorResponse('Provider returned empty content', 502);
  }

  // ─── Charge-the-lesser cost, in Oracle Tokens. ───
  //
  // Survives the rewire unchanged in spirit: the Bee pays min(estimate, actual)
  // and the platform absorbs any underestimate. What changed is the unit and
  // the fact that cached input is now priced at its own cheaper rate.
  const actualCostTokens = rate === null
    ? 0
    : calculateCostTokens(rate, inputTokens, outputTokens, cachedTokens);
  const finalCostTokens = Math.min(estimatedCostTokens, actualCostTokens);
  if (
    estimatedCostTokens > 0
    && actualCostTokens > estimatedCostTokens * ACTUAL_OVERAGE_WARN_RATIO
  ) {
    console.warn('atlasoracle-route actual cost exceeded estimate >25%', {
      directive_id: directiveId,
      tier,
      estimated_cost_tokens: estimatedCostTokens,
      actual_cost_tokens: actualCostTokens,
      platform_absorbed_tokens: actualCostTokens - estimatedCostTokens,
      estimated_input_tokens: estimatedInputTokens,
      actual_input_tokens: inputTokens,
      estimated_output_tokens: estimatedOutputTokens,
      actual_output_tokens: outputTokens,
    });
  }

  // ─── Debit: ONE append-only row in oracle_token_ledger. ───
  //
  // Lead design ruling (OPS15): no second/treasury leg. Revenue is the sum of
  // debit rows, queryable directly; double-entry buys nothing in an append-only
  // ledger whose corrections are reversing entries. This is also what makes the
  // write safe — the defect that killed atlasoracle_debit was precisely its
  // second leg colliding with a one-row-per-source_ref unique index.
  //
  // amount_tokens is NEGATIVE for a debit; the ledger CHECK enforces the sign.
  // atlasoracle_debit / _credit are NOT called and NOT modified (OPEN-7).
  let balanceAfter: number | null = null;
  if (finalCostTokens > 0) {
    const { error: debitErr } = await service
      .from('oracle_token_ledger')
      .insert({
        bee_id: beeId,
        entry_type: 'debit',
        amount_tokens: -finalCostTokens,
        directive_id: directiveId,
        memo: `${tier} directive via ${providerModel}`,
      });
    if (debitErr) {
      // The provider has already been paid at this point, so the token counts
      // are carried onto the failure row — that is OPS11's telemetry earning
      // its keep. The Bee is not charged.
      const msg = debitErr.message ?? 'ledger debit failed';
      await markFailed(
        service, directiveId, latencyMs, `token_debit: ${msg}`, spendTelemetry,
      );
      console.error('atlasoracle-route token debit failed', {
        directive_id: directiveId, message: msg,
      });
      return errorResponse('Failed to debit Oracle Tokens', 500);
    }

    const { data: afterRow } = await service
      .from('oracle_token_balances')
      .select('balance_tokens')
      .eq('bee_id', beeId)
      .maybeSingle();
    balanceAfter = Number(afterRow?.balance_tokens ?? 0);
  }

  // ─── Finalize directive row. ───
  //
  // cost_bling is gone entirely (DB7 write-stop, DB9 column DROP). Cost now
  // lives where it belongs: as a signed row in oracle_token_ledger, joinable to
  // this directive by directive_id. The directives table keeps the token counts
  // and the provider, which is what a spend audit should read anyway.
  const { error: finalizeErr } = await service
    .from('atlasoracle_directives')
    .update({
      provider_selected: providerModel,
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
    estimated_cost_tokens: estimatedCostTokens,
    actual_cost_tokens: actualCostTokens,
    final_cost_tokens: finalCostTokens,
    latency_ms: latencyMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
    balance_after_tokens: balanceAfter,
  });

  // Response shape (OPS15). `cost_bling` and `estimated_cost_bling` are GONE,
  // replaced by `cost_tokens` / `estimated_cost_tokens` + `balance_after_tokens`.
  // Verified non-breaking against src/lib/atlasoracle/client.ts: both call sites
  // read `Number(d.cost_bling ?? 0)` / `Number(d.estimated_cost_bling ?? 0)`, so
  // an absent field coalesces to 0 rather than throwing. The badge therefore
  // shows a cost of 0 until FRONT17 reads the new fields — cosmetic and
  // transitional, not a crash. Emitting `cost_bling: 0` instead would produce
  // the identical 0 in the UI while keeping a dead BLiNG!-named field alive, so
  // removal is strictly cleaner.
  return jsonResponse({
    directive_id: directiveId,
    response: responseText,
    cost_tokens: finalCostTokens,
    balance_after_tokens: balanceAfter,
    provider: providerModel,
    tier,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      cached: cachedTokens,
    },
  });
});

// Spend telemetry carried onto the failure path (OPS11). Every field is
// optional: a directive that died before reaching the provider writes none of
// them, so a null column keeps meaning "never got that far" rather than
// "unknown".
interface FailureTelemetry {
  providerModel?: string;
  inputTokens?:   number;
  outputTokens?:  number;
  cachedTokens?:  number;
}

async function markFailed(
  // deno-lint-ignore no-explicit-any
  service: any,
  directiveId: string,
  latencyMs: number,
  errorMessage: string,
  telemetry?: FailureTelemetry,
): Promise<void> {
  // Before OPS11 a directive that called Anthropic and then died recorded null
  // tokens and null provider, so real provider spend was invisible. It is now
  // carried here. No ledger row is written on this path, deliberately: the Bee
  // was not charged, and the absence of a debit row IS the record of that.
  const patch: Record<string, unknown> = {
    status: 'failed',
    success: false,
    latency_ms: latencyMs,
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  };
  if (telemetry?.providerModel !== undefined) {
    patch.provider_selected = telemetry.providerModel;
  }
  if (telemetry?.inputTokens !== undefined) {
    patch.input_tokens = telemetry.inputTokens;
  }
  if (telemetry?.outputTokens !== undefined) {
    patch.output_tokens = telemetry.outputTokens;
  }
  if (telemetry?.cachedTokens !== undefined) {
    patch.cached_tokens = telemetry.cachedTokens;
  }

  const { error } = await service
    .from('atlasoracle_directives')
    .update(patch)
    .eq('id', directiveId);
  if (error) {
    console.error('atlasoracle-route markFailed update error', {
      directive_id: directiveId, message: error.message,
    });
  }
}
