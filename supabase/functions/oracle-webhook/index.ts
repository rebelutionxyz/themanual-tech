// POST /functions/v1/oracle-webhook                     verify_jwt = FALSE
//
// ONE endpoint, ONE signing secret, BOTH oracle event families (OPS48 s3a):
//
//   checkout.session.completed (mode=payment)      pack  -> oracle_credit_token_purchase
//   checkout.session.completed (mode=subscription) plan  -> ack only; invoice.paid grants
//   invoice.paid                                   plan  -> subscription_sync + oracle_grant_plan_tokens
//   customer.subscription.created|updated|deleted  plan  -> subscription_sync only, NO token write
//   charge.refunded                                pack  -> oracle_refund_token_purchase
//
// AUTHN: verify_jwt MUST be false. Stripe calls this; the only trust anchor is
// the Stripe-Signature HMAC against STRIPE_WEBHOOK_SECRET_ORACLE. The _ORACLE
// suffix follows the house convention (_PRESS, _SUBSCRIPTION) -- one Stripe
// endpoint has exactly one signing secret, and one function cannot verify two.
//
// ---------------------------------------------------------------------------
// THE FILTER IS NOT OPTIONAL. Stripe delivers every event of a subscribed type
// from the WHOLE ACCOUNT to this endpoint -- press flyer sessions, venue and
// membership invoices, all of it. Every branch below refuses anything whose
// metadata does not say product_type='oracle', and acks 200 so Stripe stops
// retrying something that will never be ours. This is the exact mirror of the
// F6 collision documented in oracle-checkout, pointed the other way.
// ---------------------------------------------------------------------------
//
// IDEMPOTENCY -- the guarantee is a partial unique index on the money row, never
// this function and never stripe_events (W-9, and OPS35 s2b: the stripe_events
// upsert error is swallowed in the F6 webhook, so it can silently fail to exist):
//   pack purchase  UNIQUE (payment_ref) WHERE entry_type='purchase'    key = cs_...
//   plan grant     UNIQUE (payment_ref) WHERE entry_type='grant'
//                    AND expires_at IS NOT NULL                        key = in_...
//   refund         UNIQUE (payment_ref) WHERE entry_type='adjustment'  key = re_...
// Each RPC catches unique_violation and returns duplicate:true at HTTP 200, so a
// Stripe retry settles instead of hammering a settled payment.
//
// STRIPE API VERSION: the shared client pins 2026-03-25.dahlia. In basil+ the
// Invoice has NO top-level `subscription` and line items expose
// pricing.price_details.price (a STRING id), not an expanded price object; the
// subscription link and its metadata snapshot live at
// invoice.parent.subscription_details.{subscription,metadata}, and
// current_period_end moved onto subscription ITEMS. Every read below uses the
// dahlia path first and falls back to the legacy path.
//
// ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_ORACLE, SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY

import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { invoiceRef } from '../_shared/ids.ts';

const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_ORACLE') ?? '';

const ok = (b: unknown) =>
  new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fail = (b: unknown, status = 500) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

const HANDLED = new Set([
  'checkout.session.completed',
  'invoice.paid',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
]);

type Meta = Record<string, string | undefined>;
// deno-lint-ignore no-explicit-any
const asMeta = (v: any): Meta => (v && typeof v === 'object' ? v as Meta : {});
const isOracle = (m: Meta) => m.product_type === 'oracle';
const unixToIso = (s: unknown): string | null =>
  typeof s === 'number' && Number.isFinite(s) ? new Date(s * 1000).toISOString() : null;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SECRET) return fail({ error: 'Webhook secret not configured' });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  // Raw body is REQUIRED for signature verification -- do not parse first.
  const raw = await req.text();
  const stripe = getStripe();
  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, SECRET, undefined, cryptoProvider);
  } catch (err) {
    console.error('oracle-webhook signature verify failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response('Invalid signature', { status: 400 });
  }

  if (!HANDLED.has(event.type)) return ok({ received: true, ignored: event.type });

  const sb = serviceClient();
  const obj = event.data.object;

  // --- Resolve identity + shape per family, and refuse anything not ours -----
  let meta: Meta = {};
  let beeId: string | null = null;
  let subscriptionId: string | null = null;
  let invoiceId: string | null = null;
  let customerId: string | null = null;
  let amountCents: number | null = null;
  let currency = 'usd';
  let status = 'active';
  let periodEnd: string | null = null;

  if (event.type === 'invoice.paid') {
    const sd = obj?.parent?.subscription_details ?? null;
    meta = asMeta(sd?.metadata);
    subscriptionId = (typeof sd?.subscription === 'string' ? sd.subscription : null)
      ?? (typeof obj?.subscription === 'string' ? obj.subscription : null);
    invoiceId = obj?.id ?? null;
    customerId = typeof obj?.customer === 'string' ? obj.customer : null;
    amountCents = typeof obj?.amount_paid === 'number' ? obj.amount_paid : null;
    currency = obj?.currency ?? 'usd';
    periodEnd = unixToIso(obj?.lines?.data?.[0]?.period?.end);

    if (!subscriptionId) return ok({ received: true, ignored: 'invoice.paid (no subscription)' });

    // Cold path: metadata snapshots only exist for invoices finalized after
    // 2023-06-29, so fall back to reading the live subscription.
    if (!isOracle(meta)) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        // deno-lint-ignore no-explicit-any
        meta = asMeta((sub as any)?.metadata);
      } catch (err) {
        console.error('oracle-webhook subscription retrieve failed', {
          subscription: subscriptionId, message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (!isOracle(meta)) return ok({ received: true, ignored: 'not an oracle subscription' });
    status = 'active';   // a paid period implies the subscription is current
    beeId = meta.bee_id ?? null;

  } else if (event.type.startsWith('customer.subscription.')) {
    meta = asMeta(obj?.metadata);
    if (!isOracle(meta)) return ok({ received: true, ignored: 'not an oracle subscription' });
    subscriptionId = obj?.id ?? null;
    customerId = typeof obj?.customer === 'string' ? obj.customer : null;
    beeId = meta.bee_id ?? null;
    status = event.type === 'customer.subscription.deleted' ? 'canceled' : (obj?.status ?? 'active');
    // basil+ moved current_period_end onto the item; legacy path kept as fallback.
    periodEnd = unixToIso(obj?.items?.data?.[0]?.current_period_end)
      ?? unixToIso(obj?.current_period_end);

  } else if (event.type === 'checkout.session.completed') {
    meta = asMeta(obj?.metadata);
    if (!isOracle(meta)) return ok({ received: true, ignored: 'not an oracle session' });
    beeId = meta.bee_id ?? null;
    customerId = typeof obj?.customer === 'string' ? obj.customer : null;
    amountCents = typeof obj?.amount_total === 'number' ? obj.amount_total : null;
    currency = obj?.currency ?? 'usd';

  } else {   // charge.refunded
    meta = asMeta(obj?.metadata);
    const pi = typeof obj?.payment_intent === 'string' ? obj.payment_intent : null;
    if (!isOracle(meta) && pi) {
      try {
        const intent = await stripe.paymentIntents.retrieve(pi);
        // deno-lint-ignore no-explicit-any
        meta = asMeta((intent as any)?.metadata);
      } catch (err) {
        console.error('oracle-webhook payment intent retrieve failed', {
          payment_intent: pi, message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (!isOracle(meta)) return ok({ received: true, ignored: 'not an oracle charge' });
    beeId = meta.bee_id ?? null;
    customerId = typeof obj?.customer === 'string' ? obj.customer : null;
    currency = obj?.currency ?? 'usd';
  }

  if (!beeId) {
    // A Stripe retry will never supply missing metadata, so ack 200 rather than
    // start a retry storm. The event row stays non-processed for reconciliation.
    console.error('oracle-webhook unresolved bee', { type: event.type, id: event.id });
    await recordEvent(sb, event, { beeId: null, amountCents, currency, customerId, subscriptionId, invoiceId, status: 'unresolved' });
    return ok({ received: true, unresolved: true });
  }

  // --- Audit trail. Written BEFORE the money write and its error IS CHECKED --
  // (the F6 webhook discards this error -- OPS35 s2b. A failure here must not
  // silently proceed unnoticed, but it must also not block the credit, which
  // carries its own database-level guard.)
  await recordEvent(sb, event, { beeId, amountCents, currency, customerId, subscriptionId, invoiceId, status: 'received' });

  const { data: seen } = await sb.from('stripe_events')
    .select('status').eq('event_id', event.id).maybeSingle();
  if (seen?.status === 'processed') return ok({ received: true, duplicate: true });

  try {
    // ---------------- PACK: one-time payment ----------------
    if (event.type === 'checkout.session.completed') {
      if (obj?.mode === 'subscription') {
        // The plan's Tokens are granted by invoice.paid, keyed on the invoice id.
        // Granting here too would be a second grant on a different key.
        await markProcessed(sb, event.id, beeId);
        return ok({ received: true, noted: 'plan session; grant follows on invoice.paid' });
      }
      if (obj?.payment_status && obj.payment_status !== 'paid') {
        return ok({ received: true, unpaid: true });
      }
      const packCode = meta.pack_code;
      if (!packCode) return ok({ received: true, skipped: 'no pack_code' });

      const { data, error } = await sb.rpc('oracle_credit_token_purchase', {
        p_bee_id: beeId, p_pack_code: packCode, p_payment_ref: obj.id,
        p_amount_cents: obj.amount_total ?? 0, p_method: 'stripe',
      });
      if (error) throw new Error(`oracle_credit_token_purchase: ${error.message}`);
      await markProcessed(sb, event.id, beeId);
      return ok({ received: true, result: data });
    }

    // ---------------- PLAN: recurring grant ----------------
    if (event.type === 'invoice.paid') {
      const planTier = meta.plan_tier ?? meta.tier;
      if (!planTier) return ok({ received: true, skipped: 'no plan_tier' });
      if (!periodEnd) throw new Error('invoice.paid carried no line period end');

      const { error: syncErr } = await sb.rpc('subscription_sync', {
        p_bee_id: beeId, p_product_type: 'oracle', p_tier: planTier,
        p_stripe_subscription_id: subscriptionId, p_stripe_customer_id: customerId,
        p_status: status, p_current_period_end: periodEnd,
        p_invoice_amount_cents: amountCents,
        p_invoice_ref: invoiceId ? await invoiceRef(invoiceId) : null,
      });
      if (syncErr) throw new Error(`subscription_sync: ${syncErr.message}`);

      const { data, error } = await sb.rpc('oracle_grant_plan_tokens', {
        p_bee_id: beeId, p_plan_tier: planTier, p_invoice_ref: invoiceId,
        p_period_end: periodEnd, p_amount_cents: amountCents,
      });
      if (error) throw new Error(`oracle_grant_plan_tokens: ${error.message}`);
      await markProcessed(sb, event.id, beeId);
      return ok({ received: true, result: data });
    }

    // ---------------- PLAN lifecycle: no token write ----------------
    if (event.type.startsWith('customer.subscription.')) {
      const planTier = meta.plan_tier ?? meta.tier;
      if (!planTier) return ok({ received: true, skipped: 'no plan_tier' });

      // Cancel / lapse writes NOTHING to the ledger. The cycle's grant already
      // carries expires_at = period end and simply stops counting when it
      // passes -- "you keep them until the end of the month you paid for",
      // implemented as the absence of a clawback.
      const { data, error } = await sb.rpc('subscription_sync', {
        p_bee_id: beeId, p_product_type: 'oracle', p_tier: planTier,
        p_stripe_subscription_id: subscriptionId, p_stripe_customer_id: customerId,
        p_status: status, p_current_period_end: periodEnd,
        p_invoice_amount_cents: null, p_invoice_ref: null,
      });
      if (error) throw new Error(`subscription_sync: ${error.message}`);
      await markProcessed(sb, event.id, beeId);
      return ok({ received: true, result: data });
    }

    // ---------------- REFUND: unspent balance only ----------------
    // ORACLE_MF v0.26 s2. The clamp lives in oracle_refund_token_purchase; this
    // branch only supplies the proportional cap for a PARTIAL refund, because
    // the ledger stores Tokens and Stripe stores cents.
    const pi = typeof obj?.payment_intent === 'string' ? obj.payment_intent : null;
    if (!pi) return ok({ received: true, skipped: 'refund without payment_intent' });

    const refundRef: string | null = obj?.refunds?.data?.[0]?.id
      ?? (obj?.id ? `${obj.id}:${obj.amount_refunded}` : null);
    if (!refundRef) return ok({ received: true, skipped: 'refund without a stable ref' });

    // The purchase row is keyed on the Checkout Session id, not the payment
    // intent (OPS35 s5), so walk back to the session that raised this charge.
    const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
    const sessionId = sessions?.data?.[0]?.id ?? null;
    if (!sessionId) return ok({ received: true, skipped: 'no checkout session for payment_intent' });

    let maxTokens: number | null = null;
    const charged = typeof obj?.amount === 'number' ? obj.amount : null;
    const refunded = typeof obj?.amount_refunded === 'number' ? obj.amount_refunded : null;
    if (meta.pack_code && charged && refunded && refunded < charged) {
      const { data: pack } = await sb.from('oracle_token_packs')
        .select('tokens').eq('pack_code', meta.pack_code).maybeSingle();
      if (pack?.tokens) maxTokens = (Number(pack.tokens) * refunded) / charged;
    }

    const { data, error } = await sb.rpc('oracle_refund_token_purchase', {
      p_payment_ref: sessionId, p_refund_ref: refundRef,
      p_max_tokens: maxTokens, p_memo: null,
    });
    if (error) throw new Error(`oracle_refund_token_purchase: ${error.message}`);
    await markProcessed(sb, event.id, beeId);
    return ok({ received: true, result: data });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('oracle-webhook handler failed', { event_id: event.id, type: event.type, message });
    await sb.from('stripe_events').update({ status: 'error' }).eq('event_id', event.id);
    // 500 -> Stripe retries. The retry is safe: every money write is guarded by
    // a partial unique index, and the event row stays non-processed so a replay
    // reprocesses rather than short-circuiting.
    return fail({ error: message });
  }
});

// deno-lint-ignore no-explicit-any
async function recordEvent(sb: any, event: any, f: {
  beeId: string | null; amountCents: number | null; currency: string;
  customerId: string | null; subscriptionId: string | null; invoiceId: string | null;
  status: string;
}) {
  const { error } = await sb.from('stripe_events').upsert({
    event_id: event.id,
    event_type: event.type,
    product_type: 'oracle',
    bee_id: f.beeId,
    amount_cents: f.amountCents,
    currency: f.currency,
    stripe_customer_id: f.customerId,
    stripe_subscription_id: f.subscriptionId,
    stripe_invoice_id: f.invoiceId,
    status: f.status,
    payload: event,
  }, { onConflict: 'event_id', ignoreDuplicates: true });
  if (error) {
    console.error('oracle-webhook stripe_events write FAILED -- audit gap, money path continues', {
      event_id: event.id, message: error.message,
    });
  }
}

// deno-lint-ignore no-explicit-any
async function markProcessed(sb: any, eventId: string, beeId: string | null) {
  await sb.from('stripe_events')
    .update({ status: 'processed', processed_at: new Date().toISOString(), bee_id: beeId })
    .eq('event_id', eventId);
}
