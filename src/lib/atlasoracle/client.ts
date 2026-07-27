// AtlasOracle route client — the single seam every AtlasOracle surface calls.
//
// Why a seam: the badge and the /oracle console must not drift in how they
// talk to the edge function. One module owns the request shape, the response
// union, and the dev mock.
//
// REQUEST SHAPE is pinned to the DEPLOYED atlasoracle-route contract, verified
// live against production on 2026-07-27 (pass OPS10):
//
//   { directive, tier?, astra_slug?, category?, confirm_cost? }
//
// The function accepts NOTHING else. Fields the previous badge sent —
// `directive_category`, `nova_slug`, `canon_paths` — were silently dropped by
// the router: `directive_category` is not the accepted name (`category` is),
// so every directive was filed under the server default 'suggest' regardless
// of what the Bee picked. Fixed here.
//
// RESPONSE SHAPE is pinned to the OPS15 contract (Oracle Tokens). `cost_bling`,
// `estimated_cost_bling` and the escrow fields are GONE from the router and
// gone from here:
//
//   200 success  { directive_id, response, cost_tokens, balance_after_tokens,
//                  provider, tier, tokens:{input,output,cached} }
//   200 preview  { cost_preview:true, tier, provider, estimated_cost_tokens,
//                  estimated_input_tokens, estimated_output_tokens,
//                  action:'confirm_cost', hint }
//   402          { error, required_tokens, available_tokens, action:'get_tokens' }
//   429          { error, retry_after_seconds, caps_hit }
//
// Read against the deployed source 2026-07-27 (FRONT17), not assumed from the
// dispatch text.

import { supabase } from '@/lib/supabase';

export type Tier = 'free' | 'standard' | 'frontier';

export type DirectiveCategory =
  | 'scaffold'
  | 'draft'
  | 'integrate'
  | 'refactor'
  | 'analyze'
  | 'classify'
  | 'translate'
  | 'estimate'
  | 'correlate'
  | 'suggest';

export const DIRECTIVE_CATEGORIES: DirectiveCategory[] = [
  'scaffold',
  'draft',
  'integrate',
  'refactor',
  'analyze',
  'classify',
  'translate',
  'estimate',
  'correlate',
  'suggest',
];

/** Successful routed directive. */
export interface RouteSuccess {
  kind: 'response';
  directiveId: string;
  response: string;
  provider: string;
  tier: Tier;
  /** Oracle Tokens charged for this directive. 0 on the free tier. */
  costTokens: number;
  /**
   * Oracle Token balance AFTER the debit, straight from the router — the
   * authoritative post-directive figure. Surfaces let this drive the running
   * balance rather than re-querying, so the number a Bee sees is the number the
   * ledger wrote. null when the router did not report one (free tier, which
   * never debits and never reads a balance).
   */
  balanceAfterTokens: number | null;
  tokens: { input: number; output: number; cached: number };
}

/**
 * Frontier cost preview. The router returns this INSTEAD of routing when the
 * estimate clears its confirm threshold, and expects the same call again with
 * confirm_cost: true.
 *
 * REACHABLE as of OPS15 — this reverses OPS10's "known-unreachable" note, which
 * was true of the old BLiNG! pricing (constant 6.5 estimate vs a threshold of
 * 10). Against the live token rates the frontier estimate scales with directive
 * length: cost ≈ 580.51 + 0.11 × (directive tokens), threshold 700, so anything
 * past roughly 1,090 directive tokens — about 4,300 characters — trips the gate.
 * A pasted document hits it easily. This is a live control, not dead code.
 */
export interface RoutePreview {
  kind: 'preview';
  tier: Tier;
  provider: string;
  /** Estimated Oracle Tokens for the directive the Bee is about to confirm. */
  estimatedCostTokens: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

/** Structured, actionable failure. `action` drives which control the UI offers. */
export interface RouteFailure {
  kind: 'error';
  message: string;
  status: number | null;
  action: 'get-tokens' | 'retry-later' | 'none';
  retryAfterSeconds?: number;
  /** 402 only — what the directive needed, and what the Bee actually holds. */
  requiredTokens?: number;
  availableTokens?: number;
}

export type RouteResult = RouteSuccess | RoutePreview | RouteFailure;

export interface InvokeArgs {
  directive: string;
  tier: Tier;
  category: DirectiveCategory;
  astraSlug?: string;
  confirmCost?: boolean;
}

/**
 * Dev mock. When on, NO request leaves the browser and NO provider is billed.
 * Enable with VITE_ATLASORACLE_MOCK=1. Gated on DEV as well as the flag so a
 * stray production env var cannot silently serve fake answers to Bees.
 */
export const isMocked = (): boolean =>
  import.meta.env.DEV && import.meta.env.VITE_ATLASORACLE_MOCK === '1';

const MOCK_LATENCY_MS = 400;

function mockResult(args: InvokeArgs): RouteResult {
  // Deterministic branch keys off the directive text so every response shape
  // is reachable in the harness without a live endpoint.
  const probe = args.directive.trim().toLowerCase();

  if (probe.startsWith('!preview')) {
    return {
      kind: 'preview',
      tier: args.tier,
      provider: 'claude-opus-5',
      estimatedCostTokens: 855.5,
      estimatedInputTokens: 4_141,
      estimatedOutputTokens: 16_282,
    };
  }
  if (probe.startsWith('!fund')) {
    return {
      kind: 'error',
      message: 'Insufficient Oracle Tokens.',
      status: 402,
      action: 'get-tokens',
      requiredTokens: 580.51,
      availableTokens: 12.5,
    };
  }
  if (probe.startsWith('!cap')) {
    return {
      kind: 'error',
      message: 'Directive rate cap reached. Try again shortly.',
      status: 429,
      action: 'retry-later',
      retryAfterSeconds: 60,
    };
  }
  if (probe.startsWith('!fail')) {
    return {
      kind: 'error',
      message: 'Router returned an error.',
      status: 500,
      action: 'none',
    };
  }

  return {
    kind: 'response',
    directiveId: `mock-${Math.random().toString(36).slice(2, 10)}`,
    response: `[MOCK — no provider was called]\n\ntier: ${args.tier} · category: ${args.category}\n\nEcho of your directive:\n${args.directive}`,
    provider:
      args.tier === 'free'
        ? 'claude-haiku-4-5'
        : args.tier === 'standard'
          ? 'claude-sonnet-5'
          : 'claude-opus-5',
    tier: args.tier,
    costTokens: args.tier === 'free' ? 0 : args.tier === 'standard' ? 1.0668 : 2.667,
    balanceAfterTokens: args.tier === 'free' ? null : 498.9332,
    tokens: { input: 1637, output: 43, cached: 2_256 },
  };
}

/**
 * Reads the JSON body off a non-2xx functions.invoke error. supabase-js hands
 * back a FunctionsHttpError carrying the raw Response on `.context`; without
 * unwrapping it the router's structured 402 / 429 payloads are lost and every
 * failure collapses into "Edge Function returned a non-2xx status code".
 */
async function unwrapError(err: unknown): Promise<RouteFailure> {
  const ctx = (err as { context?: unknown } | null)?.context;
  const res = ctx instanceof Response ? ctx : null;

  if (!res) {
    const message = err instanceof Error ? err.message : 'Routing failed.';
    return { kind: 'error', message, status: null, action: 'none' };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.clone().json()) as Record<string, unknown>;
  } catch {
    // Non-JSON body — fall through with the status alone.
  }

  const message =
    typeof payload.error === 'string' ? payload.error : `Routing failed (${res.status}).`;

  // 402 = not enough Oracle Tokens. The router names the gap explicitly
  // (`required_tokens` / `available_tokens`), so the UI can say how short the
  // Bee is rather than just that they are short.
  if (res.status === 402 || payload.action === 'get_tokens') {
    const required = payload.required_tokens;
    const available = payload.available_tokens;
    return {
      kind: 'error',
      message,
      status: res.status,
      action: 'get-tokens',
      requiredTokens: typeof required === 'number' ? required : undefined,
      availableTokens: typeof available === 'number' ? available : undefined,
    };
  }
  if (res.status === 429) {
    const retry = payload.retry_after_seconds;
    return {
      kind: 'error',
      message,
      status: 429,
      action: 'retry-later',
      retryAfterSeconds: typeof retry === 'number' ? retry : 60,
    };
  }
  return { kind: 'error', message, status: res.status, action: 'none' };
}

export async function invokeDirective(args: InvokeArgs): Promise<RouteResult> {
  if (isMocked()) {
    await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
    return mockResult(args);
  }

  if (!supabase) {
    return {
      kind: 'error',
      message: 'AtlasOracle is unavailable — Supabase client not configured.',
      status: null,
      action: 'none',
    };
  }

  const body: Record<string, unknown> = {
    directive: args.directive,
    tier: args.tier,
    category: args.category,
  };
  if (args.astraSlug) body.astra_slug = args.astraSlug;
  if (args.confirmCost) body.confirm_cost = true;

  const { data, error } = await supabase.functions.invoke('atlasoracle-route', { body });

  if (error) return unwrapError(error);
  if (!data) {
    return { kind: 'error', message: 'Router returned no response.', status: null, action: 'none' };
  }

  const d = data as Record<string, unknown>;

  if (d.cost_preview === true) {
    return {
      kind: 'preview',
      tier: (d.tier as Tier) ?? args.tier,
      provider: String(d.provider ?? ''),
      estimatedCostTokens: Number(d.estimated_cost_tokens ?? 0),
      estimatedInputTokens: Number(d.estimated_input_tokens ?? 0),
      estimatedOutputTokens: Number(d.estimated_output_tokens ?? 0),
    };
  }

  const tokens = (d.tokens ?? {}) as Record<string, unknown>;
  return {
    kind: 'response',
    directiveId: String(d.directive_id ?? ''),
    response: String(d.response ?? ''),
    provider: String(d.provider ?? ''),
    tier: (d.tier as Tier) ?? args.tier,
    costTokens: Number(d.cost_tokens ?? 0),
    // Absent on the free tier, which never debits. `?? null` rather than `?? 0`
    // so the UI can tell "no balance was touched" from "balance is now zero".
    balanceAfterTokens:
      d.balance_after_tokens === null || d.balance_after_tokens === undefined
        ? null
        : Number(d.balance_after_tokens),
    tokens: {
      input: Number(tokens.input ?? 0),
      output: Number(tokens.output ?? 0),
      cached: Number(tokens.cached ?? 0),
    },
  };
}
