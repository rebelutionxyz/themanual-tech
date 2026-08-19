// POST /functions/v1/h24-webhook                     verify_jwt = FALSE
//
// ONE endpoint, ONE signing secret, BOTH oracle event families (OPS48 s3a):
//
//   checkout.session.completed (mode=payment)      pack  -> h24_credit_token_purchase
//   checkout.session.completed (mode=subscription) plan  -> ack only; invoice.paid grants
//   invoice.paid                                   plan  -> subscription_sync + h24_grant_plan_tokens
//   customer.subscription.created|updated|deleted  plan  -> subscription_sync only, NO token write
//   charge.refunded                                pack  -> h24_refund_token_purchase
//
// AUTHN: verify_jwt MUST be false. Stripe calls this; the only trust anchor is
// the Stripe-Signature HMAC against STRIPE_WEBHOOK_SECRET_H24 (renamed from
// _ORACLE per DBCODE1; a transition fallback to _ORACLE stays until the owner
// re-adds the secret under _H24). The suffix follows the house convention
// (_PRESS, _SUBSCRIPTION) -- one Stripe endpoint has exactly one signing secret,
// and one function cannot verify two.
//
// ---------------------------------------------------------------------------
// THE FILTER IS NOT OPTIONAL. Stripe delivers every event of a subscribed type
// from the WHOLE ACCOUNT to this endpoint -- press flyer sessions, venue and
// membership invoices, all of it. Every branch below refuses anything whose
// metadata does not say product_type='oracle', and acks 200 so Stripe stops
// retrying something that will never be ours. This is the exact mirror of the
// F6 collision documented in h24-checkout, pointed the other way.
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
// ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_H24 (fallback: _ORACLE),
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { invoiceRef } from '../_shared/ids.ts';

// STRIPEHARDEN1 (a): the signing-secret env var is renamed _ORACLE -> _H24 to match
// the DBCODE1 rename. Read the NEW name first, fall back to the OLD one during the
// transition so the redeploy cannot 401 in the window before the owner has re-added
// the secret under _H24. Once _H24 is set and _ORACLE removed, delete the fallback.
const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_H24')
  ?? Deno.env.get('STRIPE_WEBHOOK_SECRET_ORACLE') ?? '';

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

// subscriptions.status CHECK accepts exactly these. Stripe ALSO emits 'paused'
// (pause_collection), which the CHECK refuses -- proven 23514 in
// db/proofs/ops67_plan_lifecycle_battery.sql s7. Syncing it would make
// subscription_sync throw on every delivery and every retry, i.e. a permanent
// retry storm on an event that moves no Tokens. Unknown statuses are logged and
// acked instead. DEBT: widening the CHECK to include 'paused' is a migration,
// and migrations are gated -- see REPORT.md OPS67 F-3.
const SUB_STATUS = new Set([
  'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid',
]);

// An invoice can carry several lines (proration on an upgrade, a credit line,
// the subscription line). lines.data[0] is NOT reliably the subscription line,
// and its period.end can be the PRORATION window rather than the cycle -- which
// would become the expiry stamped on the Tokens. The cycle this invoice paid for
// is the LATEST period end on the invoice.
// deno-lint-ignore no-explicit-any
const latestLinePeriodEnd = (o: any): string | null => {
  const ends: number[] = (o?.lines?.data ?? [])
    // deno-lint-ignore no-explicit-any
    .map((l: any) => l?.period?.end)
    .filter((e: unknown): e is number => typeof e === 'number' && Number.isFinite(e));
  return ends.length ? unixToIso(Math.max(...ends)) : null;
};

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
    console.error('h24-webhook signature verify failed', {
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
    periodEnd = latestLinePeriodEnd(obj);

    if (!subscriptionId) return ok({ received: true, ignored: 'invoice.paid (no subscription)' });

    // Cold path: metadata snapshots only exist for invoices finalized after
    // 2023-06-29, so fall back to reading the live subscription. The same read
    // supplies the period end when the invoice carried no usable line period --
    // in basil+ that value lives on the subscription ITEM.
    if (!isOracle(meta) || !periodEnd) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        // deno-lint-ignore no-explicit-any
        const s = sub as any;
        if (!isOracle(meta)) meta = asMeta(s?.metadata);
        periodEnd = periodEnd
          ?? unixToIso(s?.items?.data?.[0]?.current_period_end)
          ?? unixToIso(s?.current_period_end);
      } catch (err) {
        console.error('h24-webhook subscription retrieve failed', {
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
        console.error('h24-webhook payment intent retrieve failed', {
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
    console.error('h24-webhook unresolved bee', { type: event.type, id: event.id });
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

      const { data, error } = await sb.rpc('h24_credit_token_purchase', {
        p_bee_id: beeId, p_pack_code: packCode, p_payment_ref: obj.id,
        p_amount_cents: obj.amount_total ?? 0, p_method: 'stripe',
      });
      if (error) throw new Error(`h24_credit_token_purchase: ${error.message}`);
      await markProcessed(sb, event.id, beeId);
      return ok({ received: true, result: data });
    }

    // ---------------- PLAN: recurring grant ----------------
    if (event.type === 'invoice.paid') {
      const planTier = meta.plan_tier ?? meta.tier;
      if (!planTier) return ok({ received: true, skipped: 'no plan_tier' });
      if (!periodEnd) throw new Error('invoice.paid carried no period end');

      // -------------------------------------------------------------------
      // ORDER IS LOAD-BEARING (OPS67). GRANT FIRST, BOOKKEEPING SECOND.
      //
      // subscription_sync can fail PERMANENTLY: two partial unique indexes,
      // subscriptions_one_active_per_product and
      // subscriptions_one_active_oracle_per_bee_uidx, make a second live oracle
      // subscription row unrepresentable -- and Stripe Checkout always CREATES a
      // new subscription rather than modifying one, so an upgrade or a
      // re-subscribe raises a second id by design. With the sync running first,
      // that 23505 threw before the grant ever ran: a Bee paid and received
      // nothing, on every retry, forever. Proven in
      // db/proofs/ops67_plan_lifecycle_battery.sql s6 -- along with the fact
      // that h24_grant_plan_tokens has NO dependency on the subscriptions
      // row, which is what makes this order safe.
      //
      // The grant is idempotent on the invoice id (W-9), so a Stripe retry that
      // gets this far a second time settles as duplicate:true.
      // -------------------------------------------------------------------
      const { data, error } = await sb.rpc('h24_grant_plan_tokens', {
        p_bee_id: beeId, p_plan_tier: planTier, p_invoice_ref: invoiceId,
        p_period_end: periodEnd, p_amount_cents: amountCents,
      });
      if (error) throw new Error(`h24_grant_plan_tokens: ${error.message}`);

      // Stripe just took money for THIS subscription, so any OTHER oracle
      // subscription row still marked live for this Bee is stale by definition.
      // Retiring it is what lets the sync below record an upgrade at all. Rows
      // with a NULL stripe_subscription_id are left alone (neq skips NULLs).
      const { error: staleErr } = await sb.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('bee_id', beeId).eq('product_type', 'oracle')
        .in('status', ['active', 'trialing'])
        .neq('stripe_subscription_id', subscriptionId);
      if (staleErr) {
        console.error('h24-webhook stale subscription retire failed', {
          bee_id: beeId, subscription: subscriptionId, message: staleErr.message,
        });
      }

      const { error: syncErr } = await sb.rpc('subscription_sync', {
        p_bee_id: beeId, p_product_type: 'oracle', p_tier: planTier,
        p_stripe_subscription_id: subscriptionId, p_stripe_customer_id: customerId,
        p_status: status, p_current_period_end: periodEnd,
        p_invoice_amount_cents: amountCents,
        p_invoice_ref: invoiceId ? await invoiceRef(invoiceId) : null,
      });
      if (syncErr) {
        // The Tokens ARE granted. A 500 here would have Stripe retry a failure
        // that may be permanent, so settle at 200 and flag the row instead:
        // status 'error' with processed_at still NULL is exactly what a
        // reconciliation sweep looks for. Money first, bookkeeping visible.
        console.error('h24-webhook subscription_sync failed AFTER a successful grant', {
          event_id: event.id, bee_id: beeId, subscription: subscriptionId,
          message: syncErr.message,
        });
        await sb.from('stripe_events').update({ status: 'error' }).eq('event_id', event.id);
        return ok({ received: true, result: data, subscription_sync_failed: syncErr.message });
      }
      await markProcessed(sb, event.id, beeId);
      return ok({ received: true, result: data });
    }

    // ---------------- PLAN lifecycle: no token write ----------------
    if (event.type.startsWith('customer.subscription.')) {
      const planTier = meta.plan_tier ?? meta.tier;
      if (!planTier) return ok({ received: true, skipped: 'no plan_tier' });
      if (!SUB_STATUS.has(status)) {
        // No Tokens ride on this branch, so refusing the sync costs nothing but
        // a stale status column -- and it avoids an endless retry on a CHECK
        // that will refuse this value on every delivery. The event row stays
        // 'received' for reconciliation.
        console.error('h24-webhook unsupported Stripe subscription status', {
          event_id: event.id, status, subscription: subscriptionId,
        });
        return ok({ received: true, skipped: `unsupported status ${status}` });
      }

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
    // ORACLE_MF v0.26 s2. The clamp lives in h24_refund_token_purchase; this
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
      const { data: pack } = await sb.from('h24_token_packs')
        .select('tokens').eq('pack_code', meta.pack_code).maybeSingle();
      if (pack?.tokens) maxTokens = (Number(pack.tokens) * refunded) / charged;
    }

    const { data, error } = await sb.rpc('h24_refund_token_purchase', {
      p_payment_ref: sessionId, p_refund_ref: refundRef,
      p_max_tokens: maxTokens, p_memo: null,
    });
    if (error) throw new Error(`h24_refund_token_purchase: ${error.message}`);
    await markProcessed(sb, event.id, beeId);
    return ok({ received: true, result: data });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('h24-webhook handler failed', { event_id: event.id, type: event.type, message });
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
    console.error('h24-webhook stripe_events write FAILED -- audit gap, money path continues', {
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
