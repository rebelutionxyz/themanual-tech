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

import { supabase } from '@/lib/supabase';

export type Tier = 'free' | 'standard' | 'frontier';

export type DirectiveCategory =
  | 'scaffold' | 'draft' | 'integrate' | 'refactor' | 'analyze'
  | 'classify' | 'translate' | 'estimate' | 'correlate' | 'suggest';

export const DIRECTIVE_CATEGORIES: DirectiveCategory[] = [
  'scaffold', 'draft', 'integrate', 'refactor', 'analyze',
  'classify', 'translate', 'estimate', 'correlate', 'suggest',
];

/** Successful routed directive. */
export interface RouteSuccess {
  kind: 'response';
  directiveId: string;
  response: string;
  provider: string;
  tier: Tier;
  /** Router still reports this field as `cost_bling`; token ledger is undesigned. */
  costRaw: number;
  tokens: { input: number; output: number; cached: number };
}

/**
 * Frontier cost preview. The router returns this INSTEAD of routing when the
 * estimate clears its confirm threshold, and expects the same call again with
 * confirm_cost: true.
 *
 * KNOWN-UNREACHABLE as deployed (verified OPS10): the frontier estimate is a
 * constant 6.5 against a threshold of 10, so the router never emits this
 * branch today. The gate is implemented here anyway — it is the contract, and
 * a threshold or estimate change server-side turns it on with no UI work.
 */
export interface RoutePreview {
  kind: 'preview';
  tier: Tier;
  provider: string;
  estimatedCost: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

/** Structured, actionable failure. `action` drives which control the UI offers. */
export interface RouteFailure {
  kind: 'error';
  message: string;
  status: number | null;
  action: 'fund' | 'retry-later' | 'none';
  retryAfterSeconds?: number;
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
      provider: 'claude-opus-4-7',
      estimatedCost: 12.5,
      estimatedInputTokens: 42_000,
      estimatedOutputTokens: 5_000,
    };
  }
  if (probe.startsWith('!fund')) {
    return {
      kind: 'error',
      message: 'Not enough Oracle Tokens to route this directive.',
      status: 402,
      action: 'fund',
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
    provider: args.tier === 'free'
      ? 'claude-haiku-4-5'
      : args.tier === 'standard' ? 'claude-sonnet-4-6' : 'claude-opus-4-7',
    tier: args.tier,
    costRaw: args.tier === 'free' ? 0 : 2,
    tokens: { input: 1637, output: 43, cached: 0 },
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

  if (res.status === 402 || payload.action === 'fund_escrow') {
    return { kind: 'error', message, status: res.status, action: 'fund' };
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
      estimatedCost: Number(d.estimated_cost_bling ?? 0),
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
    costRaw: Number(d.cost_bling ?? 0),
    tokens: {
      input: Number(tokens.input ?? 0),
      output: Number(tokens.output ?? 0),
      cached: Number(tokens.cached ?? 0),
    },
  };
}
