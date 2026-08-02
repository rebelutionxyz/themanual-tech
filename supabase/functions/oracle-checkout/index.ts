// POST /functions/v1/oracle-checkout                    verify_jwt = TRUE
//
// ONE checkout surface, TWO products (OPS48 s2):
//   { "pack_code": "plus" }        -> mode: 'payment'       one-time Token pack
//   { "plan_tier": "sovereign" }   -> mode: 'subscription'  monthly plan
//
// The client names a PACK or a PLAN, never an amount. Amounts are read
// server-side from oracle_token_packs / oracle_token_plans. A client that can
// name an amount can name 1.
//
// ---------------------------------------------------------------------------
// WHY THERE ARE NO PRE-CREATED STRIPE PRICE OBJECTS -- read before "tidying up"
// ---------------------------------------------------------------------------
// Both SKUs use inline price_data, so Stripe creates an ad-hoc Price with EMPTY
// metadata. That is load-bearing, not laziness.
//
// The live F6 webhook (stripe-subscription-webhook) subscribes to invoice.paid
// and customer.subscription.*, so Stripe delivers EVERY oracle plan event to it
// as well. F6 decides what to do purely from Stripe PRICE metadata:
//
//     if (pt !== 'membership' && pt !== 'oracle') return null;   // index.ts:48
//
// -- it explicitly ACCEPTS product_type 'oracle'. The moment anyone creates a
// Stripe Price carrying {product_type:'oracle', tier:'scout'}, F6 starts calling
// subscription_sync for oracle subscriptions too, and (now that the tier CHECK
// accepts 'scout') actually writes a half-handled row: the subscription is
// recorded but no Tokens are ever granted, because F6 knows nothing about the
// ledger. Two writers, no owner, and the symptom is a paying Bee with no Tokens.
//
// Stripe's API confirms the isolation is structural, not accidental:
// line_items[].price_data accepts currency / product / product_data / recurring /
// tax_behavior / unit_amount / unit_amount_decimal -- and NO metadata field.
// Only product_data.metadata exists, and that lands on the Product, not the
// Price that F6 reads. Verified against the Stripe API reference (OPS50).
//
// RULE: oracle resolves product identity from SESSION and SUBSCRIPTION metadata.
// F6 resolves it from PRICE metadata. Different sources on purpose. Do not
// create Stripe Price objects for oracle SKUs.
// ---------------------------------------------------------------------------
//
// ENV: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
//      SUPABASE_SERVICE_ROLE_KEY, ORACLE_CHECKOUT_SUCCESS_URL,
//      ORACLE_CHECKOUT_CANCEL_URL

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { getStripe } from '../_shared/stripe.ts';

const n = (v: unknown) => Number(v).toLocaleString('en-US');

// OPS38 P1: without a Stripe Idempotency-Key a double-click creates TWO
// Checkout Sessions with two different cs_ ids. Both can be paid, both are
// legal ledger rows, and no database constraint can see it -- that is not a
// replay. The key collapses a double-submit to ONE session. The caller may pin
// its own attempt nonce; otherwise a 10-minute bucket covers the double-click
// window without freezing a Bee out of a deliberate second GET.
function idempotencyKey(beeId: string, sku: string, attempt: string | undefined): string {
  const nonce = attempt && attempt.length <= 64
    ? attempt
    : String(Math.floor(Date.now() / 600_000));
  return `oracle-checkout:${beeId}:${sku}:${nonce}`;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return errorResponse('Auth required', 401);
  const { data: u, error: uErr } = await userClient(jwt).auth.getUser();
  if (uErr || !u?.user) return errorResponse('Auth required', 401);
  const beeId = u.user.id;

  let body: { pack_code?: string; plan_tier?: string; attempt?: string };
  try { body = await req.json(); } catch { return errorResponse('Bad JSON', 400); }

  const packCode = body.pack_code ?? '';
  const planTier = body.plan_tier ?? '';
  if (!packCode && !planTier) return errorResponse('pack_code or plan_tier required', 400);
  if (packCode && planTier) return errorResponse('Name a pack OR a plan, not both', 400);

  const sb = serviceClient();

  // Reuse the Bee's Stripe customer across both SKUs so a plan and a pack do
  // not fan out into two Stripe records for one Bee.
  const { data: bee } = await sb.from('bees')
    .select('id, stripe_customer_id').eq('id', beeId).maybeSingle();
  const existingCustomer: string | null = bee?.stripe_customer_id ?? null;

  const stripe = getStripe();
  const successUrl = Deno.env.get('ORACLE_CHECKOUT_SUCCESS_URL')
    ?? 'https://themanual.tech/oracle?tokens=1';
  const cancelUrl = Deno.env.get('ORACLE_CHECKOUT_CANCEL_URL')
    ?? 'https://themanual.tech/oracle';

  // Shared: identity travels on the SESSION and, for plans, on the SUBSCRIPTION.
  // subscription_data.metadata is copied onto the Subscription object when
  // checkout completes, and Stripe snapshots it onto every invoice this
  // subscription raises (invoice.parent.subscription_details.metadata), which is
  // how oracle-webhook routes invoice.paid without any Price metadata.
  const base = { bee_id: beeId, product_type: 'oracle' };

  try {
    if (packCode) {
      const { data: pack, error: pErr } = await sb.from('oracle_token_packs')
        .select('pack_code, usd_cents, tokens, display_name')
        .eq('pack_code', packCode).eq('active', true).maybeSingle();
      if (pErr) {
        console.error('oracle-checkout pack lookup failed', { message: pErr.message });
        return errorResponse('Lookup failed', 500);
      }
      if (!pack) return errorResponse('Unknown pack', 404);

      const metadata = { ...base, sku_kind: 'pack', pack_code: pack.pack_code };

      // LANGUAGE FIREWALL: this copy renders to the Bee on Stripe's page.
      // GET, never buy. "Tokens", never "Oracle Tokens" (W-10).
      const name = `GET ${n(pack.tokens)} Tokens`;
      const description =
        `${pack.display_name} pack -- ${n(pack.tokens)} Tokens credited to your Bee the ` +
        `moment payment clears. These Tokens never expire and there is nothing recurring.`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: { currency: 'usd', product_data: { name, description }, unit_amount: pack.usd_cents },
          quantity: 1,
        }],
        payment_intent_data: { metadata },
        metadata,
        ...(existingCustomer
          ? { customer: existingCustomer }
          : (u.user.email ? { customer_email: u.user.email } : {})),
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
      }, { idempotencyKey: idempotencyKey(beeId, `pack:${pack.pack_code}`, body.attempt) });

      return jsonResponse({
        url: session.url, sku_kind: 'pack',
        pack_code: pack.pack_code, tokens: pack.tokens, usd_cents: pack.usd_cents,
      });
    }

    const { data: plan, error: plErr } = await sb.from('oracle_token_plans')
      .select('plan_tier, usd_cents, tokens_per_cycle, display_name')
      .eq('plan_tier', planTier).eq('active', true).maybeSingle();
    if (plErr) {
      console.error('oracle-checkout plan lookup failed', { message: plErr.message });
      return errorResponse('Lookup failed', 500);
    }
    if (!plan) return errorResponse('Unknown plan', 404);

    const metadata = { ...base, sku_kind: 'plan', plan_tier: plan.plan_tier };

    // LANGUAGE FIREWALL + the cancellation rule stated where the Bee decides.
    const name = `${plan.display_name} -- ${n(plan.tokens_per_cycle)} Tokens each month`;
    const description =
      `${n(plan.tokens_per_cycle)} Tokens land in your Bee every month, and they reach ` +
      `every model -- no tier is locked behind a higher plan. Plan Tokens belong to the ` +
      `month that granted them and do not roll over. Stop any time; you keep that month's ` +
      `Tokens until it ends. Tokens you GET in a pack are separate and never expire.`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name, description },
          unit_amount: plan.usd_cents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: { metadata },
      metadata,
      ...(existingCustomer
        ? { customer: existingCustomer }
        : (u.user.email ? { customer_email: u.user.email } : {})),
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
    }, { idempotencyKey: idempotencyKey(beeId, `plan:${plan.plan_tier}`, body.attempt) });

    return jsonResponse({
      url: session.url, sku_kind: 'plan',
      plan_tier: plan.plan_tier, tokens_per_cycle: plan.tokens_per_cycle,
      usd_cents: plan.usd_cents,
    });
  } catch (err) {
    console.error('oracle-checkout session create failed', {
      pack_code: packCode || null, plan_tier: planTier || null,
      message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse('Checkout session failed', 500);
  }
});
