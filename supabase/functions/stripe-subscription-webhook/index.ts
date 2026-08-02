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
// API SHAPE: account is on 2026-03-25.dahlia (basil+). Two fields moved, so we
// read the new locations (with fallbacks to the legacy ones):
//   - period end:    subscription.items.data[0].current_period_end
//                    (was subscription.current_period_end)
//   - invoice → sub: invoice.parent.subscription_details.subscription
//                    (was invoice.subscription)
// For invoice.paid we therefore RETRIEVE the subscription once and read
// product/tier/status/period/customer/bee off that single object — same shape as
// the subscription.* events, and it makes bee-resolution order-independent.
//
// IDEMPOTENCY — two independent layers:
//   1. Event-level — stripe_events.event_id is UNIQUE. A row counts as done only
//      at status='processed', so a failed-then-retried event reprocesses
//      (self-healing) while a completed event short-circuits to 200.
//   2. Invoice-level — invoiceRef(invoice.id) is a deterministic uuid; inside
//      subscription_sync the affiliate trigger is skipped when an affiliate_hold
//      already exists for that source_ref. Upline freed exactly once per invoice.
//
// EVENTS HANDLED:
//   customer.subscription.created | updated | deleted  → lifecycle/period upsert
//   invoice.paid                                        → period upsert + affiliate
// Unrecognised event types, and subscriptions whose Price/Product carries no
// {product_type, tier} metadata, are ignored + logged (not stored).
//
// VENUE (2026-07-10): product_type 'venue' added — TheTRIVIA.app venue
// subscriptions (F6 rail, canon thetrivia-venue-v2 A1). When checkout carried
// metadata.venue_id, the trivia_venues row is linked to the subscription after
// a successful sync (best-effort; sync is the source of truth).

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { invoiceRef } from '../_shared/ids.ts';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_SUBSCRIPTION') ?? '';

type ProductType = 'membership' | 'oracle' | 'venue';

interface Product {
  product_type: ProductType;
  tier: string;
}

// {product_type, tier} come from Stripe Price metadata, falling back to the
// Price's Product metadata (D3 — tier CHECK stays deferred). A Price that's been
// used in a transaction can't take new metadata, so the Product is often the
// editable surface; we read both, per-key. Returns null when neither carries a
// HONEYCOMB service classification.
// deno-lint-ignore no-explicit-any
async function resolveProduct(stripe: ReturnType<typeof getStripe>, price: any): Promise<Product | null> {
  if (!price) return null;
  let pt = price?.metadata?.product_type;
  let tier = price?.metadata?.tier;
  if (!pt || !tier) {
    try {
      const product = (price.product && typeof price.product === 'object')
        ? price.product
        : await stripe.products.retrieve(price.product);
      pt = pt ?? product?.metadata?.product_type;
      tier = tier ?? product?.metadata?.tier;
    } catch (err) {
      console.error('stripe-subscription-webhook product retrieve failed', {
        price: price?.id, message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (pt !== 'membership' && pt !== 'oracle' && pt !== 'venue') return null;
  if (typeof tier !== 'string' || tier.length === 0) return null;
  return { product_type: pt as ProductType, tier };
}

function unixToIso(seconds: unknown): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

// dahlia: period end lives on the first subscription item; fall back to the
// legacy top-level field for safety across versions.
// deno-lint-ignore no-explicit-any
function periodEndOf(sub: any): string | null {
  const item = sub?.items?.data?.[0];
  return unixToIso(item?.current_period_end ?? sub?.current_period_end);
}

// deno-lint-ignore no-explicit-any
function customerIdOf(customer: any): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : (customer.id ?? null);
}

// Resolve a Stripe customer id → Bee.
//   1. metadataBeeId (subscription.metadata.bee_id) is the source of truth on
//      first contact; when present we pin bees.stripe_customer_id.
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

  let product: Product | null = null;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let metadataBeeId: string | null = null;
  let metadataVenueId: string | null = null;
  let invoiceId: string | null = null;
  let amountCents: number | null = null;
  let currency = 'usd';
  let status = 'active';
  let periodEnd: string | null = null;

  if (event.type === 'invoice.paid') {
    invoiceId = obj?.id ?? null;
    amountCents = typeof obj?.amount_paid === 'number' ? obj.amount_paid : null;
    currency = obj?.currency ?? 'usd';
    // dahlia: subscription id sits under parent.subscription_details; legacy fallback.
    subscriptionId =
      obj?.parent?.subscription_details?.subscription ?? obj?.subscription ?? null;
    if (!subscriptionId) {
      console.log('stripe-subscription-webhook non-subscription invoice', { id: invoiceId });
      return jsonResponse({ received: true, ignored: 'invoice.paid (no subscription)' });
    }
    // Retrieve the subscription for a consistent shape + product + period + bee.
    // deno-lint-ignore no-explicit-any
    let sub: any;
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err) {
      console.error('stripe-subscription-webhook subscription retrieve failed', {
        subscription: subscriptionId,
        message: err instanceof Error ? err.message : String(err),
      });
      return errorResponse('subscription retrieve failed', 500); // transient → Stripe retries
    }
    product = await resolveProduct(stripe, sub?.items?.data?.[0]?.price);
    customerId = customerIdOf(sub?.customer) ?? customerIdOf(obj?.customer);
    metadataBeeId = sub?.metadata?.bee_id ?? null;
    metadataVenueId = sub?.metadata?.venue_id ?? null;
    // Real subscription status — a $0 trial-start invoice keeps the sub 'trialing',
    // so it never occupies the (bee_id, product_type) WHERE status='active' slot.
    status = sub?.status ?? 'active';
    periodEnd = periodEndOf(sub);
  } else {
    // customer.subscription.{created,updated,deleted} — object IS the subscription.
    product = await resolveProduct(stripe, obj?.items?.data?.[0]?.price);
    customerId = customerIdOf(obj?.customer);
    subscriptionId = obj?.id ?? null;
    metadataBeeId = obj?.metadata?.bee_id ?? null;
    metadataVenueId = obj?.metadata?.venue_id ?? null;
    status = obj?.status ?? 'active';
    periodEnd = periodEndOf(obj);
  }

  if (!product) {
    console.warn('stripe-subscription-webhook no service-price metadata', {
      type: event.type, id: event.id, subscription: subscriptionId,
    });
    return jsonResponse({ received: true, ignored: 'no product_type/tier metadata' });
  }

  const beeId = await resolveBee(sb, customerId, metadataBeeId);

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
    await sb.from('stripe_events').update({ status: 'error' }).eq('event_id', event.id);
    // 500 → Stripe retries; event row stays non-processed so the retry reprocesses.
    return errorResponse('subscription_sync failed', 500);
  }

  // --- Venue linkage (best-effort; sync above is the source of truth) --------
  if (product.product_type === 'venue' && metadataVenueId) {
    const syncedSubId = (data && typeof data === 'object' && 'subscription_id' in data)
      ? (data as { subscription_id: string }).subscription_id
      : null;
    if (syncedSubId) {
      const { error: linkErr } = await sb.from('trivia_venues')
        .update({ subscription_id: syncedSubId })
        .eq('id', metadataVenueId)
        .eq('owner_bee_id', beeId);
      if (linkErr) {
        console.error('stripe-subscription-webhook venue link failed', {
          event_id: event.id, venue_id: metadataVenueId, message: linkErr.message,
        });
      }
    }
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
