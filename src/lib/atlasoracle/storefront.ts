// h24 token STOREFRONT seam — FRONT81.
//
// The whole server side (checkout function, webhook, rate-card tables, ledger)
// has been live since 2026-08-01 with nothing calling it. This module is the
// client half: read the rate card, open a Stripe Checkout Session.
//
// TWO RULES CARRIED FROM THE BACKEND, verbatim in behaviour:
//   1. PRICES ARE NEVER NAMED BY THE CLIENT. The storefront reads pack/plan rows
//      from `h24_token_packs` / `h24_token_plans` (public-read, active-only)
//      only to DISPLAY them; checkout names a `pack_code` or `plan_tier` and the
//      edge function reads the amount server-side. "A client that can name an
//      amount can name 1" (h24-checkout/index.ts).
//   2. ONE OF pack_code XOR plan_tier. The function 400s on neither and on both.
//
// Language firewall (CLAUDE.md): user-facing copy uses GET / held / never "buy"
// or "purchase". This module carries no user copy — it is the seam — but the
// display types it returns feed a firewall-swept view.

import { supabase } from '@/lib/supabase';

export interface TokenPack {
  pack_code: string;
  usd_cents: number;
  tokens: number;
  display_name: string;
  sort_order: number;
}

export interface TokenPlan {
  plan_tier: string;
  usd_cents: number;
  tokens_per_cycle: number;
  display_name: string;
  sort_order: number;
}

/**
 * Reads the active packs, cheapest first. Returns [] on any failure — the
 * storefront then shows an honest "rate card unavailable" state rather than an
 * invented price. `tokens` / `usd_cents` are numeric(20,6)/int in the DB and can
 * arrive as strings over PostgREST, so they are coerced with Number().
 */
export async function fetchPacks(): Promise<TokenPack[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('h24_token_packs')
    .select('pack_code, usd_cents, tokens, display_name, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    pack_code: String(r.pack_code),
    usd_cents: Number(r.usd_cents),
    tokens: Number(r.tokens),
    display_name: String(r.display_name),
    sort_order: Number(r.sort_order),
  }));
}

/**
 * Reads the active plan tiers, cheapest first. Returns [] on any failure — same
 * honest-empty posture as fetchPacks.
 */
export async function fetchPlans(): Promise<TokenPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('h24_token_plans')
    .select('plan_tier, usd_cents, tokens_per_cycle, display_name, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    plan_tier: String(r.plan_tier),
    usd_cents: Number(r.usd_cents),
    tokens_per_cycle: Number(r.tokens_per_cycle),
    display_name: String(r.display_name),
    sort_order: Number(r.sort_order),
  }));
}

/** What the caller asked to check out — exactly one is set. */
export type CheckoutSku = { pack_code: string } | { plan_tier: string };

export type CheckoutResult =
  | { kind: 'redirect'; url: string }
  /** A plan is already live (409). current_tier / current_period_end describe it. */
  | { kind: 'plan-exists'; message: string; currentTier?: string; currentPeriodEnd?: string }
  /** Not signed in (401) — the caller should route the user to sign in. */
  | { kind: 'signed-out'; message: string }
  /** Anything else, stated honestly with the server's message when present. */
  | { kind: 'error'; message: string; status: number | null };

/**
 * Opens a Stripe Checkout Session for one pack or plan and hands back the URL to
 * redirect to. `attempt` is an optional idempotency nonce folded into the Stripe
 * Idempotency-Key by the function — the caller passes a fresh one per user
 * initiation so a genuine second GET is not collapsed into the first, while a
 * double-click within the same initiation is.
 *
 * Error parsing mirrors client.ts `unwrapError`: supabase-js hands back a
 * FunctionsHttpError carrying the raw Response on `.context`; without unwrapping
 * it the function's structured 401 / 409 payloads are lost.
 */
export async function startCheckout(sku: CheckoutSku, attempt?: string): Promise<CheckoutResult> {
  if (!supabase) {
    return {
      kind: 'error',
      message: 'h24 is unavailable — Supabase client not configured.',
      status: null,
    };
  }

  const body: Record<string, unknown> = { ...sku };
  if (attempt) body.attempt = attempt;

  const { data, error } = await supabase.functions.invoke('h24-checkout', { body });

  if (error) {
    const ctx = (error as { context?: unknown } | null)?.context;
    const res = ctx instanceof Response ? ctx : null;
    if (!res) {
      const message = error instanceof Error ? error.message : 'Checkout failed.';
      return { kind: 'error', message, status: null };
    }
    let payload: Record<string, unknown> = {};
    try {
      payload = (await res.clone().json()) as Record<string, unknown>;
    } catch {
      // Non-JSON body — fall through with the status alone.
    }
    const message =
      typeof payload.error === 'string' ? payload.error : `Checkout failed (${res.status}).`;

    if (res.status === 401) return { kind: 'signed-out', message };
    if (res.status === 409) {
      return {
        kind: 'plan-exists',
        message,
        currentTier: typeof payload.current_tier === 'string' ? payload.current_tier : undefined,
        currentPeriodEnd:
          typeof payload.current_period_end === 'string' ? payload.current_period_end : undefined,
      };
    }
    return { kind: 'error', message, status: res.status };
  }

  const url = (data as { url?: unknown } | null)?.url;
  if (typeof url !== 'string' || !url) {
    return { kind: 'error', message: 'Checkout returned no redirect URL.', status: null };
  }
  return { kind: 'redirect', url };
}

/** Dollars string from integer cents, e.g. 2900 -> "$29". Whole dollars drop the .00. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
