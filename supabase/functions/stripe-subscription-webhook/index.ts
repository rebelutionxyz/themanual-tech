// POST /functions/v1/stripe-subscription-webhook
// HONEYCOMB F6 — Stripe subscription / invoice webhook → subscription_sync().
//
// FIREWALL: fiat-in for SERVICES ONLY. The payer is NEVER credited BLiNG!.
// On a paid period, subscription_sync() frees the AFFILIATE reward to the
// upline from the Reserve. There is no fiat-out and no fiat→BLiNG! conversion
// anywhere in this function.
//
// AUTHN: verify_jwt MUST be false (Stripe calls this; there is no Supabase user
// JWT). The only trust anchor is the Stripe-Signature HMAC verified against
// STRIPE_WEBHOOK_SECRET_SUBSCRIPTION.
//
// IDEMPOTENCY — two independent layers:
//   1. Event-level — stripe_events.event_id is UNIQUE. A row is only treated as
//      done when status='processed', so a failed-then-retried event reprocesses
//      (self-healing) while a truly-completed event short-circuits to 200.
//   2. Invoice-level — invoiceRef(invoice.id) is a deterministic uuid; inside
//      subscription_sync the affiliate trigger is skipped when an affiliate_hold
//      already exists for that source_ref. Upline freed exactly once per invoice.
//
// EVENTS HANDLED:
//   customer.subscription.created | updated | deleted  → lifecycle/period upsert
//   invoice.paid                                        → period upsert + affiliate
// Unrecognised event types, and subscription items whose Stripe Price carries no
// {product_type, tier} metadata, are ignored + logged (not stored).

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { invoiceRef } from '../_shared/ids.ts';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_SUBSCRIPTION') ?? '';

type ProductType = 'membership' | 'oracle';

interface Product {
  product_type: ProductType;
  tier: string;
}

// {product_type, tier} are read from Stripe Price metadata (D3 — tier CHECK
// stays deferred). Returns null when the price is not a HONEYCOMB service price.
function productFromPrice(price: unknown): Product | null {
  // deno-lint-ignore no-explicit-any
  const md = (price as any)?.metadata ?? {};
  const pt = md.product_type;
  const tier = md.tier;
  if (pt !== 'membership' && pt !== 'oracle') return null;
  if (typeof tier !== 'string' || tier.length === 0) return null;
  return { product_type: pt, tier };
}

function unixToIso(seconds: unknown): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

// Resolve a Stripe customer id → Bee.
//   1. metadataBeeId (from subscription.metadata.bee_id) is the source of truth
//      on first contact; when present we pin bees.stripe_customer_id.
//   2. otherwise look the customer up in the bees cache.
// Returns null when the customer cannot be mapped to a Bee.
// deno-lint-ignore no-explicit-any
async function resolveBee(
  sb: ReturnType<typeof serviceClient>,
  customerId: string | null,
  metadataBeeId: string | null,
): Promise<string | null> {
  if (metadataBeeId) {
    if (customerId) {
      // Pin the mapping (idempotent; conflict on the partial unique index is fine).
      await sb.from('bees')
        .update({ stripe_customer_id: customerId })
        .eq('id', metadataBeeId)
        .is('stripe_customer_id', null);
    }
    return metadataBeeId;
  }
  if (!customerId) return null;
  const { data } = await sb.from('bees')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  if (!WEBHOOK_SECRET) return errorResponse('Webhook secret not configured', 500);

  // Raw body is REQUIRED for signature verification — do not parse first.
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return errorResponse('Missing stripe-signature', 400);

  const stripe = getStripe();
  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody, sig, WEBHOOK_SECRET, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error('stripe-subscription-webhook bad signature', {
      message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse('Signature verification failed', 400);
  }

  const handled = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
  ]);
  if (!handled.has(event.type)) {
    console.log('stripe-subscription-webhook ignored', { type: event.type, id: event.id });
    return jsonResponse({ received: true, ignored: event.type });
  }

  const sb = serviceClient();
  const obj = event.data.object;

  // --- Derive product + the fields we need, per event family -----------------
  let product: Product | null = null;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let metadataBeeId: string | null = null;
  let invoiceId: string | null = null;
  let amountCents: number | null = null;
  let currency = 'usd';
  let status = 'active';
  let periodEnd: string | null = null;

  if (event.type === 'invoice.paid') {
    const line = obj?.lines?.data?.[0];
    product = productFromPrice(line?.price);
    customerId = obj?.customer ?? null;
    subscriptionId = obj?.subscription ?? null;
    invoiceId = obj?.id ?? null;
    amountCents = typeof obj?.amount_paid === 'number' ? obj.amount_paid : null;
    currency = obj?.currency ?? 'usd';
    status = 'active'; // a paid period implies the subscription is current
    periodEnd = unixToIso(line?.period?.end);
    // invoice doesn't carry subscription.metadata; if the customer isn't cached
    // yet (event ordering), retrieve the subscription to read its bee_id.
    if (!subscriptionId) {
      console.log('stripe-subscription-webhook non-subscription invoice', { id: invoiceId });
      return jsonResponse({ received: true, ignored: 'invoice.paid (no subscription)' });
    }
  } else {
    // customer.subscription.{created,updated,deleted}
    const item = obj?.items?.data?.[0];
    product = productFromPrice(item?.price);
    customerId = obj?.customer ?? null;
    subscriptionId = obj?.id ?? null;
    metadataBeeId = obj?.metadata?.bee_id ?? null;
    status = obj?.status ?? 'active';
    periodEnd = unixToIso(obj?.current_period_end);
  }

  if (!product) {
    console.warn('stripe-subscription-webhook no service-price metadata', {
      type: event.type, id: event.id, subscription: subscriptionId,
    });
    return jsonResponse({ received: true, ignored: 'no product_type/tier metadata' });
  }

  // Resolve Bee. For invoice.paid with a cold cache, fall back to retrieving the
  // subscription so a bee_id in subscription.metadata still resolves regardless
  // of Stripe's event-delivery order.
  let beeId = await resolveBee(sb, customerId, metadataBeeId);
  if (!beeId && event.type === 'invoice.paid' && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      // deno-lint-ignore no-explicit-any
      const subBee = (sub as any)?.metadata?.bee_id ?? null;
      beeId = await resolveBee(sb, customerId, subBee);
    } catch (err) {
      console.error('stripe-subscription-webhook subscription retrieve failed', {
        subscription: subscriptionId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // --- Record the event (idempotent on event_id) -----------------------------
  await sb.from('stripe_events').upsert({
    event_id: event.id,
    event_type: event.type,
    product_type: product.product_type,
    bee_id: beeId,
    amount_cents: amountCents,
    currency,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId,
    status: beeId ? 'received' : 'unresolved',
    payload: event,
  }, { onConflict: 'event_id', ignoreDuplicates: true });

  const { data: existing } = await sb.from('stripe_events')
    .select('status').eq('event_id', event.id).maybeSingle();
  if (existing?.status === 'processed') {
    return jsonResponse({ received: true, duplicate: true });
  }

  if (!beeId) {
    // Stored for reconciliation; a Stripe retry won't supply missing metadata,
    // so ack 200 to stop the retry storm. A replay can reprocess (status≠processed).
    console.error('stripe-subscription-webhook unresolved bee', {
      type: event.type, id: event.id, customer: customerId, subscription: subscriptionId,
    });
    return jsonResponse({ received: true, unresolved: true });
  }

  // --- Sync ------------------------------------------------------------------
  const invRef = invoiceId ? await invoiceRef(invoiceId) : null;
  const startedAt = Date.now();
  const { data, error } = await sb.rpc('subscription_sync', {
    p_bee_id: beeId,
    p_product_type: product.product_type,
    p_tier: product.tier,
    p_stripe_subscription_id: subscriptionId,
    p_stripe_customer_id: customerId,
    p_status: status,
    p_current_period_end: periodEnd,
    p_invoice_amount_cents: amountCents,
    p_invoice_ref: invRef,
  });
  const latencyMs = Date.now() - startedAt;

  if (error) {
    const msg = error.message ?? 'unknown error';
    console.error('stripe-subscription-webhook subscription_sync error', {
      event_id: event.id, type: event.type, bee_id: beeId, latency_ms: latencyMs, message: msg,
    });
    await sb.from('stripe_events')
      .update({ status: 'error' }).eq('event_id', event.id);
    // 500 → Stripe retries; event row stays non-processed so the retry reprocesses.
    return errorResponse('subscription_sync failed', 500);
  }

  await sb.from('stripe_events')
    .update({ status: 'processed', processed_at: new Date().toISOString(), bee_id: beeId })
    .eq('event_id', event.id);

  console.log('stripe-subscription-webhook ok', {
    event_id: event.id, type: event.type, bee_id: beeId,
    product_type: product.product_type, tier: product.tier,
    amount_cents: amountCents, affiliate_fired: !!(amountCents && amountCents > 0),
    latency_ms: latencyMs,
  });
  return jsonResponse({ received: true, result: data });
});
