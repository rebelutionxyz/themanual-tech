// POST /functions/v1/h24-route
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
// Tier behavior (current — OPS15 rewired pricing, OPS21 added the free ladder):
//   - free      → llama-3.1-8b-instant on Groq, FALLBACK claude-haiku-4-5. Cost 0.
//   - standard  → claude-sonnet-5,  metered at 3.0x provider cost, rates as data
//   - frontier  → claude-opus-5,    metered at 2.5x provider cost, confirm-cost gate
//
// Prices are NOT in this file. They live in h24_model_rates, newest active
// row per model; a missing rate is a 503, never a guess.
//
// OPS11 (2026-07-27): standard and frontier are GATED OFF at PAID_TIERS_ENABLED
// and return 503 before any provider call — see the const's comment below. The
// pricing machinery under them is left intact and unexercised.
//
// Rate caps (per rate-cap-pricing.md §5.1) enforced server-side via
// h24_check_rate_caps RPC.
//
// Charge-the-lesser (per bling-ledger-interface.md §13 Q8): Bee is debited
// min(estimated, actual). Treasury absorbs underestimates. If actual exceeds
// estimate by >25 %, console.warn for cost-model tuning.
//
// Content-leak posture (per v1 escrow migration + platform_thesis.md): the
// response is returned in the HTTP body and NEVER persisted. h24_directives
// carries metadata only.
//
// Frontier-preview row policy: NO directive row inserted for preview-only
// returns (the request didn't fire Anthropic and didn't debit). Trade-off
// flagged in commit — observability of preview→confirm conversion is the
// cost; can be added later with a dedicated event table or new column.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { isServiceRolePrincipal, verifyAuth } from '../_shared/auth.ts';
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
// OPS11 shut these off because h24_debit could never succeed: it wrote
// two bling_transactions legs sharing one source_ref against a unique index, so
// every paid directive called Anthropic, failed the debit, discarded the answer
// and returned 500. OPS15 does not fix that RPC — it stops calling it. Paid
// tiers now debit h24_token_ledger instead (DB8), append-only, one row.
// h24_debit / _credit are untouched and dormant per OPEN-7.
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

// ─── OPS21: the first non-Anthropic provider. ───
//
// Endpoint and model id verified live 2026-07-28 against console.groq.com/docs
// — NOT from memory, per the dispatch. `llama-3.1-8b-instant` is listed under
// Production Models ("intended for use in your production environments"), not
// Preview ("evaluation purposes only, may be discontinued").
//
// WHY LLAMA 3.1 8B and not gpt-oss-20b: it is both the cheapest route in the
// DOCS1 matrix ($0.12 per 1,000 free directives vs Haiku's $4.14 — 33.9x) AND
// the only candidate whose WEIGHTS LICENCE is VERIFIED training-permissive
// (ORACLE_TOS_VERIFIED v0.2 §1.b.i). That distinction matters because Groq does
// not own the models it serves: clearing Groq's own terms does NOT clear the
// model. Rights and price pointed the same way, which is rare enough to take.
//
// Groq's standing-rule posture (ORACLE_MF v0.11), re-checked this pass against
// the DOCS1 matrix VERIFIED cells: does not train on customer inputs or outputs,
// no retention of inference data by default, self-serve Zero Data Retention.
// Nothing changed, so no stop-and-Q was required.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_FREE_MODEL = 'llama-3.1-8b-instant';

// Free-tier provider ladder. Groq FIRST, Anthropic Haiku as FALLBACK.
//
// The fallback is not decoration. Groq's free plan is rate-limited to 30 RPM /
// 6,000 TPM on this model, and the canon prefix alone is ~1,530 tokens, so the
// ceiling is roughly 3.5 directives/minute PLATFORM-WIDE — about two concurrent
// Bees at the 2/min per-Bee cap. Above that Groq starts returning 429 and the
// free tier would break outright without this ladder. Recorded rather than
// discovered: see REPORT.md § OPS21 and OPS21-Q §2a.
type ProviderKind = 'anthropic' | 'openai-compatible' | 'gemini';
interface ProviderSpec {
  kind:   ProviderKind;
  model:  string;
  url:    string;
  apiKey: string | undefined;
  label:  string;
  // DB77: how this provider reports cached tokens. See OPENAI_COMPAT_REGISTRY.
  cacheSemantics?: 'read' | 'combined';
}

// ─── DB77: THE OPENAI-COMPATIBLE PROVIDER REGISTRY. ───
//
// The industry speaks one dialect — the OpenAI chat-completions wire — and this
// route writes it ONCE (callOpenAICompatible). Every provider is therefore
// CONFIG, not code: a base URL and the NAME of the secret that holds its key.
// The model string comes from the caller. Adding OpenAI, DeepSeek, Mistral or
// xAI is a row here, never a new code path (ORACLE_MF v1.47/v1.48).
//
// cacheSemantics — the v1.49 money rule, four legs {input, output, cache_read,
// cache_write}:
//   'read'     the provider's `prompt_tokens_details.cached_tokens` is a
//              documented cache-READ count (OpenAI's wire). Priced at the cheap
//              cache_read leg.
//   'combined' the provider reports a single, semantically ambiguous cached
//              figure. It is priced at the WORSE leg (cache_write, 1.25x input)
//              until the provider's API distinguishes reads from writes — the
//              platform NEVER absorbs the 12.5x spread again. This is the
//              conservative default for any provider whose cached wire format is
//              not verified.
type OpenAICompatProvider = 'openai' | 'deepseek' | 'mistral' | 'xai' | 'groq';
interface OpenAICompatConfig {
  baseUrl:        string;
  secretName:     string;
  cacheSemantics: 'read' | 'combined';
}
const OPENAI_COMPAT_REGISTRY: Record<OpenAICompatProvider, OpenAICompatConfig> = {
  // OpenAI documents prompt_tokens_details.cached_tokens as a READ count.
  openai:   { baseUrl: 'https://api.openai.com/v1/chat/completions',   secretName: 'OPENAI_API_KEY',   cacheSemantics: 'read' },
  // DeepSeek / Mistral / xAI: their cached-token wire format is NOT verified in
  // this pass, so they take the conservative 'combined' → worse-leg treatment
  // until a later pass confirms each one against its live API. A wrong guess
  // here overcharges the platform's OWN internal spend, never a user, and never
  // in the leak direction.
  deepseek: { baseUrl: 'https://api.deepseek.com/v1/chat/completions', secretName: 'DEEPSEEK_API_KEY', cacheSemantics: 'combined' },
  mistral:  { baseUrl: 'https://api.mistral.ai/v1/chat/completions',   secretName: 'MISTRAL_API_KEY',  cacheSemantics: 'combined' },
  xai:      { baseUrl: 'https://api.x.ai/v1/chat/completions',         secretName: 'XAI_API_KEY',      cacheSemantics: 'combined' },
  // Groq, the existing free-tier provider, folded into the registry so there is
  // exactly one source of provider config. Its wire is OpenAI's (reads).
  groq:     { baseUrl: GROQ_URL,                                       secretName: 'GROQ_API_KEY',     cacheSemantics: 'read' },
};

const OPENAI_COMPAT_PROVIDERS = Object.keys(OPENAI_COMPAT_REGISTRY) as OpenAICompatProvider[];

// Resolve a registry provider to a concrete ProviderSpec, reading its key by
// NAME from the environment. Returns null when the key is ABSENT — the caller
// decides whether that is a hard failure (a directive that named this provider)
// or merely "not available here" (the end-to-end proof probing for the first
// present key). The key value is never logged or returned; only its presence.
function resolveOpenAICompatSpec(
  provider: OpenAICompatProvider,
  model: string,
): ProviderSpec | null {
  const cfg = OPENAI_COMPAT_REGISTRY[provider];
  if (!cfg) return null;
  const apiKey = Deno.env.get(cfg.secretName);
  if (!apiKey) return null;
  return {
    kind: 'openai-compatible',
    model,
    url: cfg.baseUrl,
    apiKey,
    label: `${provider}:${model}`,
    cacheSemantics: cfg.cacheSemantics,
  };
}

// ─── DB78: GEMINI. Its own dialect, the same rules. ───
//
// Google speaks generateContent, not the OpenAI wire, so it gets its own adapter
// (callGemini) rather than a registry row. Everything else is inherited from
// DB77 unchanged: metadata-only logging, one attempt with no retry, FAIL CLOSED
// when usage cannot be read, and the key is read by NAME and never logged.
//
// The model rides in the URL path (`/models/{model}:generateContent`), so the
// base is stored without it and callGemini composes the full URL. The key goes
// in the x-goog-api-key HEADER, never the query string (a key in a URL leaks
// into logs and referrers).
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_SECRET_NAME = 'GEMINI_API_KEY';

function resolveGeminiSpec(model: string): ProviderSpec | null {
  const apiKey = Deno.env.get(GEMINI_SECRET_NAME);
  if (!apiKey) return null;
  return {
    kind: 'gemini',
    model,
    url: GEMINI_BASE_URL,
    apiKey,
    label: `gemini:${model}`,
    // Gemini's cachedContentTokenCount is a context-cache READ count, but it is
    // NOT verified live this pass, so it takes the conservative 'combined' →
    // worse-leg treatment (DB77 rule): a wrong guess overcharges the platform's
    // own internal spend, never a user, never in the leak direction.
    cacheSemantics: 'combined',
  };
}

// Canon bundle length is fixed — compute once at module init for estimation.
const CANON_BUNDLE_LENGTH = assembleCrossAstraCanon().length;

interface RouteBody {
  directive?:    unknown;
  tier?:         unknown;
  astra_slug?:   unknown;
  category?:     unknown;
  confirm_cost?: unknown;
  // DB75 — INTERNAL-CALLER FIELDS. Honoured ONLY when the caller presents the
  // service-role principal (isServiceRolePrincipal); a user cannot reach this
  // path, so these cannot be abused to buy free compute or override a model.
  internal?:     unknown;  // must be === true for the internal path to engage
  caller?:       unknown;  // the true caller label, e.g. 'generate-questions'
  model?:        unknown;  // model override (parity: haiku-gen, sonnet-validate)
  system?:       unknown;  // system-prompt override — REPLACES canon for internal
  max_tokens?:   unknown;  // max-tokens override (parity: gen@4096, validate@256)
  // DB77/DB78: an internal caller may name a provider —
  // openai|deepseek|mistral|xai|groq (OpenAI-wire) or gemini (its own dialect).
  // Requires `model`. Absent = the internal call stays on Anthropic (DB75).
  provider?:     unknown;
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

// OpenAI-wire response shape (Groq, and every other OpenAI-compatible provider
// in the DOCS1 matrix — Together, Fireworks, DeepSeek, xAI, Mistral, Qwen,
// OpenRouter). The adapter below is deliberately written to the WIRE FORMAT and
// not to Groq, so adding any of those is a ProviderSpec, not a new adapter.
interface OpenAIUsage {
  prompt_tokens?:     number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}
interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: OpenAIUsage;
}

// DB78 — Gemini's generateContent wire shape. Google does NOT speak the OpenAI
// wire: the request is contents[]/systemInstruction, the response is
// candidates[].content.parts[].text, and usage is usageMetadata with its own
// field names. usageMetadata.promptTokenCount INCLUDES cachedContentTokenCount
// (nested, like OpenAI), so the adapter subtracts to reach the disjoint
// convention calculateCostTokens expects.
interface GeminiUsage {
  promptTokenCount?:        number;
  candidatesTokenCount?:    number;
  cachedContentTokenCount?: number;
  totalTokenCount?:         number;
}
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: GeminiUsage;
}

// Normalized result of one provider attempt. `failureKind` is null on success
// and otherwise carries the sanitized reason already used by markFailed, so a
// failed rung of the ladder reads identically to the old inline failure path.
// `cached` is the SUM of both cache buckets and is kept for the existing
// cached_tokens column and every reader of it. `cacheWrite` / `cacheRead` are
// the DB27 split: they are priced at different tariffs (OPS64 3c) and must
// never be re-summed before pricing.
interface ProviderAttempt {
  ok:          boolean;
  responseText: string;
  input:       number;
  output:      number;
  cached:      number;
  cacheWrite:  number;
  cacheRead:   number;
  latencyMs:   number;
  failureKind: string | null;
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
// Per-model Oracle Token rates live in h24_model_rates (DB8), not in code,
// so re-pricing is an INSERT rather than a deploy. Current row per model =
// newest active row by effective_from, which preserves rate history: a debit
// can always be re-derived against the rate that was live when it happened.
interface ModelRate {
  input_tokens_per_m:  number;
  output_tokens_per_m: number;
  cached_input_per_m:  number | null;
  cache_write_per_m:   number | null;
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
//
// ⚠ THE CACHE BUCKETS ARE TWO TARIFFS, NOT ONE (DB27, executing OPS64 3c).
// Anthropic prices cache READ at 0.1x base input and cache CREATION at 1.25x —
// a 12.5x spread. Until 2026-08-03 this function took one summed `cachedTokens`
// and priced the whole thing at the read rate, under-charging every cache-write
// leg by 12.5x: 32.43 Oracle Tokens per cold call on opus, 23.36 on sonnet,
// against directives charged 58.4 and 6.2 respectively. It was a margin leak,
// never a Bee overcharge, and it was unauditable because only the sum was
// stored. The two legs are now priced separately and MUST NOT be re-summed.
//
// cache_write_per_m falls back to input_tokens_per_m — NOT to the cached rate —
// when unconfigured. Same principle as above: over-charge on a missing rate,
// visibly, rather than silently reinstating the bug this fix exists to remove.
function calculateCostTokens(
  rate: ModelRate,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): number {
  const cacheReadRate  = rate.cached_input_per_m ?? rate.input_tokens_per_m;
  const cacheWriteRate = rate.cache_write_per_m  ?? rate.input_tokens_per_m;

  const cost =
      (inputTokens      / 1_000_000) * rate.input_tokens_per_m
    + (cacheReadTokens  / 1_000_000) * cacheReadRate
    + (cacheWriteTokens / 1_000_000) * cacheWriteRate
    + (outputTokens     / 1_000_000) * rate.output_tokens_per_m;

  // Six decimals matches h24_token_ledger.amount_tokens numeric(20,6).
  return Math.round(cost * 1_000_000) / 1_000_000;
}

// ─── Provider adapters (OPS21). ───
//
// One attempt against one provider. NEVER throws: every failure mode comes back
// as `ok: false` with a sanitized `failureKind`, because the caller walks a
// ladder and a thrown error would take the fallback down with the primary.
//
// ⚠ THE TOKEN-COUNTING TRAP, and it is the mirror image of OPS15 Bug 2.
// Anthropic reports input and cache buckets as DISJOINT: `input_tokens` already
// excludes cached. OpenAI-wire reports them NESTED: `prompt_tokens` INCLUDES
// `prompt_tokens_details.cached_tokens`. OPS15 lost ~10x by assuming nested
// where it was disjoint; assuming disjoint where it is nested would double-count
// every cached token in the opposite direction. The OpenAI adapter therefore
// SUBTRACTS cached from prompt_tokens and returns Anthropic's disjoint
// convention, so calculateCostTokens stays correct for both wires without
// knowing which one it is fed.
//
// This costs nothing today — the free tier is 0 to the Bee either way — but it
// is wrong-by-default the instant a paid tier points at an OpenAI-wire provider,
// and that is exactly the kind of bug that ships silently.
async function callAnthropic(
  spec: ProviderSpec,
  canonText: string,
  directive: string,
  maxTokens: number,
  thinkingCfg: ThinkingConfig,
): Promise<ProviderAttempt> {
  const body: Record<string, unknown> = {
    model: spec.model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: canonText, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: directive }],
  };
  if (thinkingCfg.thinking) body.thinking = thinkingCfg.thinking;
  if (thinkingCfg.effort)   body.output_config = { effort: thinkingCfg.effort };

  const startedAt = Date.now();
  const empty = (kind: string): ProviderAttempt => ({
    ok: false, responseText: '', input: 0, output: 0, cached: 0, cacheWrite: 0, cacheRead: 0,
    latencyMs: Date.now() - startedAt, failureKind: kind,
  });

  let res: Response;
  try {
    res = await fetch(spec.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': spec.apiKey ?? '',
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network failure';
    return empty(`provider_network: ${msg}`);
  }
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    let excerpt = '';
    try { excerpt = (await res.text()).slice(0, 200); } catch { excerpt = '<unreadable>'; }
    console.error('h24-route provider http error', {
      provider: spec.label, status: res.status, body_excerpt: excerpt,
    });
    return { ...empty(`provider_http_${res.status}`), latencyMs };
  }

  let payload: AnthropicResponse;
  try { payload = await res.json(); }
  catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown parse error';
    return { ...empty(`provider_parse: ${msg}`), latencyMs };
  }

  // Usage is read BEFORE the empty-content check (OPS11): the provider has
  // already billed us by this point, so the counts must reach every path.
  const usage = payload.usage ?? {};
  const input  = usage.input_tokens  ?? 0;
  const output = usage.output_tokens ?? 0;
  // DB27: kept SEPARATE, because they are priced 12.5x apart. `cached` is still
  // the sum for the cached_tokens column and its existing readers, but pricing
  // now takes the two legs individually — see calculateCostTokens.
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead  = usage.cache_read_input_tokens ?? 0;
  const cached = cacheWrite + cacheRead;

  const responseText = (payload.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('\n');

  return {
    ok: responseText.length > 0,
    responseText, input, output, cached, cacheWrite, cacheRead, latencyMs,
    failureKind: responseText.length > 0 ? null : 'provider_empty_content',
  };
}

async function callOpenAICompatible(
  spec: ProviderSpec,
  canonText: string,
  directive: string,
  maxTokens: number,
): Promise<ProviderAttempt> {
  // Deliberately minimal: no temperature, no logprobs, no logit_bias, no
  // top_logprobs, no messages[].name, no n. Groq 400s on the last five, and
  // sending nothing we do not need keeps this portable across the whole
  // OpenAI-wire family rather than tuned to one vendor.
  const body: Record<string, unknown> = {
    model: spec.model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: canonText },
      { role: 'user',   content: directive },
    ],
  };

  const startedAt = Date.now();
  const empty = (kind: string): ProviderAttempt => ({
    ok: false, responseText: '', input: 0, output: 0, cached: 0, cacheWrite: 0, cacheRead: 0,
    latencyMs: Date.now() - startedAt, failureKind: kind,
  });

  let res: Response;
  try {
    res = await fetch(spec.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${spec.apiKey ?? ''}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network failure';
    return empty(`provider_network: ${msg}`);
  }
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    let excerpt = '';
    try { excerpt = (await res.text()).slice(0, 200); } catch { excerpt = '<unreadable>'; }
    console.error('h24-route provider http error', {
      provider: spec.label, status: res.status, body_excerpt: excerpt,
    });
    return { ...empty(`provider_http_${res.status}`), latencyMs };
  }

  let payload: OpenAIResponse;
  try { payload = await res.json(); }
  catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown parse error';
    return { ...empty(`provider_parse: ${msg}`), latencyMs };
  }

  // DB77 — FAIL CLOSED, THE MONEY RULE. A response whose tokens cannot be
  // counted does not return to anyone. If the provider omitted usage entirely,
  // or reported neither a prompt nor a completion count, the ledger math has
  // nothing to bill and the sovereignty audit has no counts to record — so this
  // is a provider FAILURE, not a free directive. Before this, missing usage
  // defaulted to 0/0 and the response was returned uncounted; that was the leak.
  const usage = payload.usage;
  if (
    !usage
    || (usage.prompt_tokens === undefined && usage.completion_tokens === undefined)
  ) {
    console.error('atlasoracle-route provider usage missing', {
      provider: spec.label, // metadata only — no directive or response text
    });
    return { ...empty('provider_usage_missing'), latencyMs };
  }

  const cachedRaw = usage.prompt_tokens_details?.cached_tokens ?? 0;
  // Nested → disjoint. See the trap note above. Math.max guards a provider that
  // reports cached > prompt_tokens rather than letting a negative leg through.
  const input  = Math.max(0, (usage.prompt_tokens ?? 0) - cachedRaw);
  const output = usage.completion_tokens ?? 0;

  const responseText = payload.choices?.[0]?.message?.content ?? '';

  // DB77 / v1.49 — FOUR LEGS. Where the cached figure is a verified READ count
  // (OpenAI's wire) it prices at the cheap cache_read leg; where it is a single
  // ambiguous 'combined' figure it prices at the WORSE cache_write leg, so the
  // platform never absorbs the 12.5x spread. `cached` stays the SUM for the
  // cached_tokens column and its existing readers.
  const semantics = spec.cacheSemantics ?? 'combined';
  const cacheRead  = semantics === 'read'     ? cachedRaw : 0;
  const cacheWrite = semantics === 'combined' ? cachedRaw : 0;

  return {
    ok: responseText.length > 0,
    responseText, input, output, cached: cachedRaw,
    cacheWrite, cacheRead, latencyMs,
    failureKind: responseText.length > 0 ? null : 'provider_empty_content',
  };
}

// DB78 — the Gemini adapter. Same contract as the other two: one attempt, never
// throws, metadata-only, FAIL CLOSED on unreadable usage.
async function callGemini(
  spec: ProviderSpec,
  systemText: string,
  directive: string,
  maxTokens: number,
): Promise<ProviderAttempt> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: directive }] }],
    systemInstruction: { parts: [{ text: systemText }] },
    generationConfig: { maxOutputTokens: maxTokens },
  };

  const startedAt = Date.now();
  const empty = (kind: string): ProviderAttempt => ({
    ok: false, responseText: '', input: 0, output: 0, cached: 0, cacheWrite: 0, cacheRead: 0,
    latencyMs: Date.now() - startedAt, failureKind: kind,
  });

  let res: Response;
  try {
    res = await fetch(`${spec.url}/${spec.model}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': spec.apiKey ?? '',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network failure';
    return empty(`provider_network: ${msg}`);
  }
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    let excerpt = '';
    try { excerpt = (await res.text()).slice(0, 200); } catch { excerpt = '<unreadable>'; }
    console.error('atlasoracle-route provider http error', {
      provider: spec.label, status: res.status, body_excerpt: excerpt,
    });
    return { ...empty(`provider_http_${res.status}`), latencyMs };
  }

  let payload: GeminiResponse;
  try { payload = await res.json(); }
  catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown parse error';
    return { ...empty(`provider_parse: ${msg}`), latencyMs };
  }

  // FAIL CLOSED (DB77 rule, inherited): a response whose usage cannot be read is
  // not returned. Gemini reports usageMetadata; if it is absent or carries
  // neither a prompt nor a candidate count, there is nothing to bill and nothing
  // to audit — a provider failure, not a free directive.
  const usage = payload.usageMetadata;
  if (
    !usage
    || (usage.promptTokenCount === undefined && usage.candidatesTokenCount === undefined)
  ) {
    console.error('atlasoracle-route provider usage missing', { provider: spec.label });
    return { ...empty('provider_usage_missing'), latencyMs };
  }

  // Nested → disjoint: promptTokenCount INCLUDES cachedContentTokenCount, so
  // subtract to reach the convention calculateCostTokens expects.
  const cached = usage.cachedContentTokenCount ?? 0;
  const input  = Math.max(0, (usage.promptTokenCount ?? 0) - cached);
  const output = usage.candidatesTokenCount ?? 0;

  // 'combined' semantics (see resolveGeminiSpec) → the whole cached figure prices
  // at the worse cache_write leg until verified.
  const semantics = spec.cacheSemantics ?? 'combined';
  const cacheRead  = semantics === 'read'     ? cached : 0;
  const cacheWrite = semantics === 'combined' ? cached : 0;

  const responseText = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  return {
    ok: responseText.length > 0,
    responseText, input, output, cached, cacheWrite, cacheRead, latencyMs,
    failureKind: responseText.length > 0 ? null : 'provider_empty_content',
  };
}

function callProvider(
  spec: ProviderSpec,
  canonText: string,
  directive: string,
  maxTokens: number,
  thinkingCfg: ThinkingConfig,
): Promise<ProviderAttempt> {
  if (spec.kind === 'anthropic') return callAnthropic(spec, canonText, directive, maxTokens, thinkingCfg);
  if (spec.kind === 'gemini')    return callGemini(spec, canonText, directive, maxTokens);
  return callOpenAICompatible(spec, canonText, directive, maxTokens);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // ─── AUTH: user directive, or DB75 INTERNAL astra-to-engine call. ───
  //
  // The internal path is detected FIRST, because verifyAuth 401s a service-role
  // token (a service role is not a user). An internal call is gated on BOTH the
  // service-role principal AND an explicit `internal: true` in the body, so an
  // ordinary service-role invocation is never silently metered as an astra call.
  // Everything below that reads `isInternal` is additive: with isInternal false
  // the user directive path is byte-for-byte what it was.
  let beeId: string | null;
  let isInternal = false;
  let internalCaller: string | null = null;
  if (isServiceRolePrincipal(req)) {
    // Body is needed to confirm the internal intent; parse it once here and
    // reuse it below (the user path parses at the same point).
    let peek: RouteBody;
    try {
      peek = await req.clone().json();
    } catch {
      return errorResponse('Invalid JSON body');
    }
    if (peek.internal === true) {
      if (typeof peek.caller !== 'string' || peek.caller.trim().length === 0) {
        return errorResponse('internal call requires a non-empty caller label');
      }
      isInternal = true;
      internalCaller = peek.caller.trim().slice(0, 80);
      beeId = null;
    } else {
      // A service-role call that is not declared internal is not a supported
      // shape — the route serves user directives and internal astra calls, and
      // a service principal is never a user.
      return errorResponse('service-role calls must set internal:true', 400);
    }
  } else {
    const auth = await verifyAuth(req);
    if (!auth.ok) return errorResponse(auth.error, auth.status);
    beeId = auth.userId;
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('h24-route fatal', {
      reason: 'ANTHROPIC_API_KEY not configured',
    });
    return errorResponse('Provider integration not configured', 503);
  }
  // OPS21: Groq is OPTIONAL by design. Absent key = the free-tier ladder is just
  // Haiku, exactly as before this pass. A missing second provider must degrade
  // to the previous behaviour, never to an outage.
  const groqKey = Deno.env.get('GROQ_API_KEY');

  let body: RouteBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (
    typeof body.directive !== 'string'
    || body.directive.trim().length === 0
    // The 10k char cap is a user-abuse guard. An internal caller's prompt is
    // trusted platform text (a question-generation batch prompt can exceed it),
    // so the cap is bypassed for the service principal only.
    || (!isInternal && body.directive.length > MAX_DIRECTIVE_CHARS)
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
  // The paid-tier gate is a USER-billing gate; an internal call is never billed a
  // user's way, so it is not subject to it. Internal parity needs the paid
  // models (sonnet for validation) regardless of the user-facing paid-tier flag.
  if (!isInternal && !PAID_TIERS_ENABLED && tier !== 'free') {
    console.log('h24-route paid tier refused', { bee_id: beeId, tier });
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
  // only to call h24_get_escrow_balance as the Bee. Token balances are
  // read server-side via the h24_token_available RPC instead (OPS49; it was
  // the h24_token_balances view until that view was found expiry-blind).
  const service = serviceClient();

  // ─── Rate cap check (BEFORE astra lookup / balance check / directive insert). ───
  //
  // Bee-scoped, so it does not apply to an internal caller: a 3,246-row question
  // batch is not a Bee's usage shape and h24_check_rate_caps would 429 it.
  // Internal callers are trusted platform code; their throttling is the batch
  // job's own concern, not this per-Bee cap.
  if (!isInternal) {
    const { data: rateCapResult, error: rateCapErr } = await service.rpc(
      'h24_check_rate_caps',
      { p_bee_id: beeId, p_tier: tier },
    );
    if (rateCapErr) {
      console.error('h24-route rate cap check failed', {
        bee_id: beeId, tier, message: rateCapErr.message,
      });
      return errorResponse('Rate cap check failed', 500);
    }
    if (rateCapResult?.allowed === false) {
      console.log('h24-route rate capped', {
        bee_id: beeId, tier, caps_hit: rateCapResult.caps_hit,
      });
      return jsonResponse({
        error: 'Rate cap reached. Try again later.',
        retry_after_seconds: rateCapResult.retry_after_seconds ?? 60,
        caps_hit: rateCapResult.caps_hit ?? [],
      }, 429);
    }
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
      console.error('h24-route fatal', {
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
        // For an internal caller this is EXPECTED, not a warning: 'trivia' /
        // 'games' have no astra_registry row (minting one is DB73's job), so the
        // FK stays pointed at themanual and the true caller is recorded in
        // caller_astra on the row below. For a user directive an unknown slug is
        // still just a soft warning, unchanged.
        if (!isInternal) {
          console.warn('h24-route astra_slug unknown', {
            bee_id: beeId, astra_slug: astraSlug,
          });
        }
      }
    }
  }

  // ─── Rate lookup (rates as data — OPS15). ───
  const providerModelForRate = TIER_PROVIDER_MODEL[tier];
  let rate: ModelRate | null = null;
  // Internal callers skip pricing: they name their own model (which need not be
  // the tier's model), so pricing against TIER_PROVIDER_MODEL[tier] would record
  // a cost for the wrong model. Internal rows carry accurate token COUNTS; an
  // audit prices those against the real provider from the rate card if it wants a
  // number, exactly as the routing log does. rate === null ⇒ cost 0, debit
  // skipped, balance skipped — all already guarded.
  if (tier !== 'free' && !isInternal) {
    const { data: rateRow, error: rateErr } = await service
      .from('h24_model_rates')
      .select('input_tokens_per_m, output_tokens_per_m, cached_input_per_m, cache_write_per_m')
      .eq('model_name', providerModelForRate)
      .eq('active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rateErr || !rateRow) {
      // Refuse rather than guess. Charging an invented rate is worse than a 503.
      console.error('h24-route rate lookup failed', {
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
      // DB27. Absent (pre-F-2 rate row, or a model never re-rated) falls back to
      // the full input rate inside calculateCostTokens — over-charge visibly
      // rather than silently restoring the 12.5x under-charge.
      cache_write_per_m:   rateRow.cache_write_per_m === null
        || rateRow.cache_write_per_m === undefined
        ? null : Number(rateRow.cache_write_per_m),
    };
  }

  // ─── Cost estimation, in Oracle Tokens. ───
  const estimatedInputTokens  = estimateInputTokens(directive);
  const estimatedOutputTokens = estimateOutputTokens(tier, estimatedInputTokens);
  const estimatedCostTokens = rate === null
    ? 0
    // Both cache legs are quoted at ZERO, so the whole canon prefix is priced at
    // full input rate in the estimate. That over-states the quote, which under
    // charge-the-lesser is conservative in the Bee's favour (OPS64 3c closing
    // note). Deliberate — do not "fix" it by pricing the cache legs here.
    : calculateCostTokens(rate, estimatedInputTokens, estimatedOutputTokens, 0, 0);

  // ─── Frontier cost-preview gate (now reachable — see the constant). ───
  if (
    !isInternal
    && tier === 'frontier'
    && estimatedCostTokens > FRONTIER_PREVIEW_THRESHOLD_TOKENS
    && !confirmCost
  ) {
    console.log('h24-route frontier preview', {
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
  // Calls h24_token_available (OPS49). Free tier costs 0 and skips it.
  // This runs BEFORE the directive row insert and before the provider call, so
  // an underfunded Bee costs the platform nothing.
  // Internal callers have no token balance and are not billed, so the pre-check
  // is skipped for them — the debit is skipped too (below), keeping the two in
  // lockstep: metered (counts recorded), never billed (no ledger row).
  let balanceBefore = 0;
  if (estimatedCostTokens > 0 && !isInternal) {
    // OPS49: read through h24_token_available, NOT h24_token_balances.
    // The view sums every 'grant' row forever and has no notion of expires_at,
    // so for a Bee whose plan cycle has ended it reports the expired plan
    // tokens as spendable. Proven in the OPS49 dry run: same fixture, view
    // says 800, truth is 100. Gating on the view would hand out 700 tokens
    // of free compute before the debit refused it.
    const { data: availRows, error: balErr } = await service
      .rpc('h24_token_available', { p_bee: beeId });
    if (balErr) {
      console.error('h24-route token balance lookup failed', {
        bee_id: beeId, message: balErr.message,
      });
      return errorResponse('Token balance lookup failed', 500);
    }
    // No ledger rows yet = zeros, not an error. The RPC returns a one-row set.
    const avail = Array.isArray(availRows) ? availRows[0] : availRows;
    balanceBefore = Number(avail?.total_available ?? 0);

    if (balanceBefore < estimatedCostTokens) {
      console.log('h24-route insufficient tokens', {
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
    .from('h24_directives')
    .insert({
      // bee_id is NULL for an internal call (DB75 migration made it nullable);
      // caller_kind/caller_astra carry the attribution instead.
      bee_id: beeId,
      astra_id: astraId,
      directive_category: category,
      tier,
      status: 'pending',
      caller_kind: isInternal ? 'internal' : 'user',
      caller_astra: isInternal ? internalCaller : null,
    })
    .select('id')
    .single();
  if (insertErr || !pendingRow) {
    console.error('h24-route directive insert failed', {
      bee_id: beeId, message: insertErr?.message ?? 'no row',
    });
    return errorResponse('Failed to create directive record', 500);
  }
  const directiveId: string = pendingRow.id;
  console.log('h24-route directive created', {
    directive_id: directiveId, bee_id: beeId, tier, category,
    astra_slug: astraSlug,
    estimated_cost_tokens: estimatedCostTokens,
  });

  // ─── Call the provider ladder (OPS21). ───
  //
  // Free tier: Groq first, Haiku fallback. Every other tier: a one-rung ladder,
  // byte-for-byte the behaviour that shipped in v19 — the paid path does not
  // change in this pass, and the hash-diff done-test turns on that.
  //
  // The sentinel below is a test affordance, not a feature: a directive whose
  // text begins with `[OPS21-FORCE-FALLBACK]` skips the primary rung. It exists
  // because done-test 2 requires proving the fallback fires, and the honest way
  // to prove that is to fire it — not to reason that it would. It cannot change
  // pricing, tier, or which providers are eligible; the worst a Bee can do by
  // typing it is get Haiku instead of Groq on a tier that costs them nothing.
  // DB75 — INTERNAL OVERRIDES, service-principal only. Parity requires that
  // generate-questions keeps its own models (haiku for generation, sonnet for
  // validation), its own max_tokens (4096 / 256), and above all its own SYSTEM
  // PROMPT — the route's whole value-add for a user directive is grounding it in
  // platform canon, which is exactly WRONG for a question-generation prompt. So
  // for an internal caller: skip canon, use the caller's system; use the caller's
  // model and max_tokens where given. Non-internal path is untouched.
  const internalModel =
    isInternal && typeof body.model === 'string' && body.model.length > 0
      ? body.model
      : null;
  const internalSystem =
    isInternal && typeof body.system === 'string' ? body.system : null;
  const internalMaxTokens =
    isInternal && typeof body.max_tokens === 'number' && body.max_tokens > 0
      ? Math.min(body.max_tokens, 8192)
      : null;
  // DB77: an internal caller may name a registry provider. Validated against the
  // registry keys; anything else is ignored (falls through to Anthropic).
  const internalProvider =
    isInternal
    && typeof body.provider === 'string'
    && (OPENAI_COMPAT_PROVIDERS as string[]).includes(body.provider)
      ? (body.provider as OpenAICompatProvider)
      : null;
  // DB78: Gemini is its own dialect, not a registry (OpenAI-compat) provider.
  const internalGemini = isInternal && body.provider === 'gemini';

  const maxTokens = internalMaxTokens ?? TIER_MAX_TOKENS[tier];
  const thinkingCfg = TIER_THINKING[tier];
  // The system prompt: the caller's for an internal call, platform canon for a
  // user directive.
  const canonText = internalSystem ?? assembleCrossAstraCanon();
  const forceFallback = directive.startsWith('[OPS21-FORCE-FALLBACK]');

  const ladder: ProviderSpec[] = [];
  if (isInternal && internalGemini) {
    // DB78: route to Gemini. Requires a model; fails closed if GEMINI_API_KEY is
    // absent — never a silent fall-through, same rule as DB77's providers.
    if (!internalModel) {
      return errorResponse('internal gemini call requires a model', 400);
    }
    const spec = resolveGeminiSpec(internalModel);
    if (!spec) {
      console.error('atlasoracle-route internal provider key absent', {
        provider: 'gemini', secret_name: GEMINI_SECRET_NAME,
      });
      return jsonResponse({
        error: 'provider_key_absent',
        provider: 'gemini',
        secret_name: GEMINI_SECRET_NAME,
        message: `no key configured for gemini (${GEMINI_SECRET_NAME})`,
      }, 503);
    }
    ladder.push(spec);
  } else if (isInternal && internalProvider) {
    // DB77: route to a registry OpenAI-compatible provider. Requires a model,
    // and FAILS CLOSED if the named provider has no key — never a silent
    // fall-through to Anthropic, which would mis-attribute the spend and the
    // provider. One rung: internal calls name exactly the provider they want.
    if (!internalModel) {
      return errorResponse('internal provider call requires a model', 400);
    }
    const spec = resolveOpenAICompatSpec(internalProvider, internalModel);
    if (!spec) {
      const secretName = OPENAI_COMPAT_REGISTRY[internalProvider].secretName;
      console.error('atlasoracle-route internal provider key absent', {
        provider: internalProvider, secret_name: secretName,
      });
      return jsonResponse({
        error: 'provider_key_absent',
        provider: internalProvider,
        secret_name: secretName,
        message: `no key configured for ${internalProvider} (${secretName})`,
      }, 503);
    }
    ladder.push(spec);
  } else if (isInternal && internalModel) {
    // One rung, the caller's chosen Anthropic model. Internal calls do not use
    // the free-tier Groq ladder — they name the model they need for parity.
    ladder.push({
      kind: 'anthropic',
      model: internalModel,
      url: ANTHROPIC_URL,
      apiKey,
      label: internalModel,
    });
  } else {
    if (tier === 'free' && groqKey && !forceFallback) {
      ladder.push({
        kind: 'openai-compatible',
        model: GROQ_FREE_MODEL,
        url: GROQ_URL,
        apiKey: groqKey,
        label: GROQ_FREE_MODEL,
      });
    }
    ladder.push({
      kind: 'anthropic',
      model: TIER_PROVIDER_MODEL[tier],
      url: ANTHROPIC_URL,
      apiKey,
      label: TIER_PROVIDER_MODEL[tier],
    });
  }

  let attempt: ProviderAttempt | null = null;
  let providerModel = ladder[0].model;
  let latencyMs = 0;
  const ladderTrail: Array<{ provider: string; failure: string }> = [];

  for (let i = 0; i < ladder.length; i++) {
    const spec = ladder[i];
    const result = await callProvider(
      spec, canonText, directive, maxTokens, thinkingCfg,
    );
    providerModel = spec.model;
    latencyMs = result.latencyMs;
    if (result.ok) { attempt = result; break; }

    ladderTrail.push({ provider: spec.label, failure: result.failureKind ?? 'unknown' });
    const isLast = i === ladder.length - 1;
    console.warn('h24-route provider rung failed', {
      directive_id: directiveId,
      provider: spec.label,
      failure: result.failureKind,
      falling_back_to: isLast ? null : ladder[i + 1].label,
    });
    // A failed rung still burned provider tokens in some cases. Carry them.
    if (isLast) {
      await markFailed(
        service, directiveId, result.latencyMs,
        result.failureKind ?? 'provider_unknown',
        {
          providerModel: spec.model,
          inputTokens: result.input,
          outputTokens: result.output,
          cachedTokens: result.cached,
        },
      );
      console.error('h24-route all provider rungs failed', {
        directive_id: directiveId, ladder: ladderTrail,
      });
      return errorResponse('Provider returned an error', 502);
    }
  }

  // Unreachable — the loop either breaks with a result or returns on the last
  // rung. Narrowed explicitly so the compiler agrees rather than being told to.
  if (attempt === null) {
    await markFailed(service, directiveId, latencyMs, 'provider_unknown');
    return errorResponse('Provider returned an error', 502);
  }

  const inputTokens      = attempt.input;
  const outputTokens     = attempt.output;
  const cachedTokens     = attempt.cached;
  const cacheWriteTokens = attempt.cacheWrite;
  const cacheReadTokens  = attempt.cacheRead;
  const responseText = attempt.responseText;
  const spendTelemetry: FailureTelemetry = {
    providerModel, inputTokens, outputTokens, cachedTokens, cacheWriteTokens,
  };
  if (ladderTrail.length > 0) {
    console.log('h24-route served via fallback', {
      directive_id: directiveId,
      served_by: providerModel,
      skipped: ladderTrail,
    });
  }

  // ─── Charge-the-lesser cost, in Oracle Tokens. ───
  //
  // Survives the rewire unchanged in spirit: the Bee pays min(estimate, actual)
  // and the platform absorbs any underestimate. What changed is the unit and
  // the fact that cached input is now priced at its own cheaper rate.
  const actualCostTokens = rate === null
    ? 0
    : calculateCostTokens(
        rate, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens);
  const finalCostTokens = Math.min(estimatedCostTokens, actualCostTokens);
  if (
    estimatedCostTokens > 0
    && actualCostTokens > estimatedCostTokens * ACTUAL_OVERAGE_WARN_RATIO
  ) {
    console.warn('h24-route actual cost exceeded estimate >25%', {
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

  // ─── Debit: ONE append-only row in h24_token_ledger. ───
  //
  // Lead design ruling (OPS15): no second/treasury leg. Revenue is the sum of
  // debit rows, queryable directly; double-entry buys nothing in an append-only
  // ledger whose corrections are reversing entries. This is also what makes the
  // write safe — the defect that killed h24_debit was precisely its
  // second leg colliding with a one-row-per-source_ref unique index.
  //
  // amount_tokens is NEGATIVE for a debit; the ledger CHECK enforces the sign.
  // h24_debit / _credit are NOT called and NOT modified (OPEN-7).
  // DB75: INTERNAL IS METERED, NOT BILLED. The token counts and provider land on
  // the directive row in the finalize below (visibility — "the platform sees
  // every token", ORACLE_MF v1.51), but NO h24_token_ledger debit is written:
  // an internal caller has no Bee to charge. balanceAfter stays null, exactly as
  // it does for a free-tier user directive.
  let balanceAfter: number | null = null;
  if (finalCostTokens > 0 && !isInternal) {
    // OPS49: the debit is no longer written here. h24_debit_tokens owns it.
    //
    // It computes availability server-side under a per-bee advisory lock,
    // refuses an overdraft, and is idempotent per directive (the partial
    // unique index is the backstop). TB-1 spend-plan-first is therefore
    // un-bypassable from this file: there is no bucket for the route to
    // choose and no balance for it to compute.
    const { data: debitRes, error: debitErr } = await service
      .rpc('h24_debit_tokens', {
        p_bee: beeId,
        p_directive: directiveId,
        p_amount_tokens: finalCostTokens,
        p_memo: `${tier} directive via ${providerModel}`,
      });
    if (debitErr) {
      // The provider has already been paid at this point, so the token counts
      // are carried onto the failure row — that is OPS11's telemetry earning
      // its keep. The Bee is not charged.
      const msg = debitErr.message ?? 'ledger debit failed';
      await markFailed(
        service, directiveId, latencyMs, `token_debit: ${msg}`, spendTelemetry,
      );
      console.error('h24-route token debit failed', {
        directive_id: directiveId, message: msg,
      });
      return errorResponse('Failed to debit Oracle Tokens', 500);
    }

    // The RPC already returned the post-debit position. No second read, and
    // in particular NOT another read of h24_token_balances, which does not
    // understand expiry (OPS49: it reports 800 where the truth is 100).
    balanceAfter = Number((debitRes as any)?.total_available ?? 0);
  }

  // ─── Finalize directive row. ───
  //
  // cost_bling is gone entirely (DB7 write-stop, DB9 column DROP). Cost now
  // lives where it belongs: as a signed row in h24_token_ledger, joinable to
  // this directive by directive_id. The directives table keeps the token counts
  // and the provider, which is what a spend audit should read anyway.
  const { error: finalizeErr } = await service
    .from('h24_directives')
    .update({
      provider_selected: providerModel,
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      // DB27: the auditable half of the F-2 fix. cached_tokens stays the SUM so
      // existing readers are untouched; this column makes the split recoverable
      // from here on. NULL on every pre-2026-08-03 row means unknown, not zero.
      cache_write_tokens: cacheWriteTokens,
      status: 'success',
      success: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', directiveId);
  if (finalizeErr) {
    console.error('h24-route directive finalize failed', {
      directive_id: directiveId, message: finalizeErr.message,
    });
  }

  console.log('h24-route directive ok', {
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
  providerModel?:    string;
  inputTokens?:      number;
  outputTokens?:     number;
  cachedTokens?:     number;
  cacheWriteTokens?: number;
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
  // DB27: a failed directive still consumed a cache write the provider billed
  // us for. Recording it here is what keeps the margin picture honest on the
  // paths where the Bee is deliberately NOT charged.
  if (telemetry?.cacheWriteTokens !== undefined) {
    patch.cache_write_tokens = telemetry.cacheWriteTokens;
  }

  const { error } = await service
    .from('h24_directives')
    .update(patch)
    .eq('id', directiveId);
  if (error) {
    console.error('h24-route markFailed update error', {
      directive_id: directiveId, message: error.message,
    });
  }
}
