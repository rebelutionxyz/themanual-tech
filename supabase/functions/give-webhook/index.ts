// POST /functions/v1/give-webhook
// HONEYCOMB FUND (the Fountain) — Stripe PaymentIntent webhook. DB48.
//
// WHY IT EXISTS. Pledges are manual-capture PaymentIntents (Pattern B,
// charge-at-close) raised as DIRECT charges on the campaign manager's Connect
// account. Stripe voids an uncaptured authorization after about 7 days, and
// before this function nothing told the database — so give_campaigns.raised_cents
// kept counting money that had evaporated and the AON verdict could fire on a
// goal that was never met (FUND_MF v0.1 defect D-2). This is the half of the fix
// that carries Stripe's truth back; the other half is the DB48 migration, which
// derives raised_cents / captured_cents from fountain_pledges so a pledge leaving
// 'authorized' takes its money out of the total automatically.
//
// AUTHN: verify_jwt MUST be false — Stripe calls this and there is no Supabase
// user JWT. The ONLY trust anchor is the Stripe-Signature HMAC, verified async
// (the edge runtime has no Node crypto) BEFORE any row is read or written. An
// unverified body is untrusted input and reaches nothing.
//
// ITS OWN ENDPOINT, ITS OWN SECRET. STRIPE_WEBHOOK_SECRET_GIVE is the whsec_ of
// THIS endpoint and nothing else. It must never be set to the value used by
// STRIPE_WEBHOOK_SECRET_SUBSCRIPTION or STRIPE_WEBHOOK_SECRET_PRESS: sharing a
// signing secret across endpoints means any one of them can forge traffic for
// the others. Because pledges are direct charges on connected accounts, this
// endpoint must be registered as a CONNECT endpoint in Stripe (events arrive with
// event.account set to the manager's account id) — a plain account endpoint will
// never receive them.
//
// EVENTS HANDLED (all four are pledge-lifecycle facts, not money we initiate):
//   payment_intent.amount_capturable_updated → authorization confirmed. Registers
//       the pledge if the /pledge call died between PI create and RPC (the
//       source_ref is refFor('fountain_pledge', pi.id) — the same deterministic
//       uuid the /pledge route computes, so a re-register collapses to one row).
//   payment_intent.succeeded      → captured  → fountain_pledge_captured
//   payment_intent.canceled       → canceled  → fountain_pledge_canceled(false)
//       THIS IS THE D-2 PATH: an expired authorization arrives here.
//   payment_intent.payment_failed → capture_failed → fountain_pledge_canceled(true)
// Everything else is acked 200 and ignored.
//
// IDEMPOTENCY, two layers. (1) stripe_events.event_id is UNIQUE and a row counts
// as done only at status='processed', so a failed event reprocesses on retry
// while a completed one short-circuits. (2) The fountain RPCs are themselves
// idempotent per pledge — fountain_pledge_captured returns {duplicate:true} on an
// already-captured pledge, which is what happens when /close captured it and the
// webhook then arrives.
//
// FIREWALL: this function moves no fiat and frees no BLiNG! itself. It records
// what Stripe already did. The contributor's BLiNG! reward is FREED from the Well
// inside fountain_pledge_captured; nothing here converts fiat to BLiNG!.
//
// ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_GIVE, SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY

import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { refFor } from '../_shared/ids.ts';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_GIVE') ?? '';

const HANDLED = new Set([
  'payment_intent.amount_capturable_updated',
  'payment_intent.succeeded',
  'payment_intent.canceled',
  'payment_intent.payment_failed',
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// A pledge that is already in a terminal state cannot take the transition this
// event describes. Stripe retrying will never change that, so those are acked 200
// and left in the events table un-processed for a human to reconcile.
const isTerminalStateError = (msg: string) =>
  /cannot (capture|cancel) pledge in status/i.test(msg) || /pledge not found/i.test(msg);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET) {
    console.error('give-webhook STRIPE_WEBHOOK_SECRET_GIVE not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  // Raw body is REQUIRED for signature verification — do not parse first.
  const rawBody = await req.text();
  const stripe = getStripe();

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody, sig, WEBHOOK_SECRET, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error('give-webhook signature verify failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response('Invalid signature', { status: 400 });
  }

  // ---- everything below this line is verified Stripe data --------------------

  if (!HANDLED.has(event.type)) {
    console.log('give-webhook ignored', { type: event.type, id: event.id });
    return json({ received: true, ignored: event.type });
  }

  const pi = event.data.object as {
    id: string;
    amount?: number;
    amount_capturable?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
  const connectedAccount: string | null = event.account ?? null;

  if (typeof pi?.id !== 'string' || !pi.id.startsWith('pi_')) {
    console.error('give-webhook event carried no PaymentIntent id', { type: event.type, id: event.id });
    return json({ received: true, skipped: 'no payment_intent id' });
  }

  const sb = serviceClient();

  const { data: pledge, error: lookupErr } = await sb
    .from('fountain_pledges')
    .select('id, bee_id, campaign_id, amount_cents, status')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle();
  if (lookupErr) {
    // Transient — 500 so Stripe retries rather than losing the fact.
    console.error('give-webhook pledge lookup failed', { pi: pi.id, message: lookupErr.message });
    return json({ error: 'pledge lookup failed' }, 500);
  }

  const beeId = pledge?.bee_id ?? pi.metadata?.bee_id ?? null;
  const amountCents = typeof pi.amount === 'number' ? pi.amount : (pledge?.amount_cents ?? null);

  // ---- event-level idempotency ----------------------------------------------

  await sb.from('stripe_events').upsert({
    event_id: event.id,
    event_type: event.type,
    product_type: 'fund',
    bee_id: beeId,
    amount_cents: amountCents,
    currency: pi.currency ?? 'usd',
    status: 'received',
    payload: event,
  }, { onConflict: 'event_id', ignoreDuplicates: true });

  const { data: existing } = await sb.from('stripe_events')
    .select('status').eq('event_id', event.id).maybeSingle();
  if (existing?.status === 'processed') {
    return json({ received: true, duplicate: true });
  }

  const fail = async (status: 'failed' | 'unresolved' | 'error', log: Record<string, unknown>) => {
    console.error('give-webhook ' + status, { event_id: event.id, type: event.type, pi: pi.id, ...log });
    await sb.from('stripe_events').update({ status }).eq('event_id', event.id);
  };

  const done = async (result: unknown) => {
    await sb.from('stripe_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), bee_id: beeId })
      .eq('event_id', event.id);
    console.log('give-webhook ok', {
      event_id: event.id, type: event.type, pi: pi.id,
      pledge: pledge?.id ?? null, account: connectedAccount, amount_cents: amountCents,
    });
    return json({ received: true, result });
  };

  // ---- authorization confirmed ----------------------------------------------

  if (event.type === 'payment_intent.amount_capturable_updated') {
    if (pledge) return await done({ already_registered: true, pledge_id: pledge.id, status: pledge.status });

    // Self-heal: /pledge created the PI but died before fountain_register_pledge.
    // Without this the authorization exists at Stripe and the database has no idea.
    const campaignId = pi.metadata?.campaign_id;
    const metaBeeId = pi.metadata?.bee_id;
    if (!campaignId || !metaBeeId || !amountCents || amountCents <= 0) {
      await fail('unresolved', { reason: 'no pledge row and metadata insufficient to register', metadata: pi.metadata });
      return json({ received: true, unresolved: true });
    }

    const sourceRef = await refFor('fountain_pledge', pi.id);
    const { data: reg, error: regErr } = await sb.rpc('fountain_register_pledge', {
      p_campaign_id: campaignId,
      p_bee_id: metaBeeId,
      p_amount_cents: amountCents,
      p_currency: pi.currency ?? 'usd',
      p_payment_intent_id: pi.id,
      p_source_ref: sourceRef,
    });
    if (regErr) {
      // 'campaign not active' / 'campaign not found' are terminal — a retry cannot
      // fix them and the authorization needs a human. Anything else is transient.
      const msg = regErr.message ?? 'unknown error';
      if (/campaign (not found|not active|has no funding model)/i.test(msg)) {
        await fail('unresolved', { reason: 'late authorization for an unpledgeable campaign', message: msg });
        return json({ received: true, unresolved: true });
      }
      await fail('error', { message: msg });
      return json({ error: msg }, 500);
    }
    return await done({ registered: true, ...(reg as Record<string, unknown>) });
  }

  // ---- the three settlement paths -------------------------------------------

  if (!pledge) {
    // Stripe settled a PaymentIntent this platform has no record of. Never guess a
    // pledge into existence from a settlement event — record it and stop.
    await fail('unresolved', { reason: 'settlement event for an unknown PaymentIntent' });
    return json({ received: true, unresolved: true });
  }

  const call = event.type === 'payment_intent.succeeded'
    ? { fn: 'fountain_pledge_captured', args: { p_pledge_id: pledge.id } }
    : {
        fn: 'fountain_pledge_canceled',
        args: { p_pledge_id: pledge.id, p_failed: event.type === 'payment_intent.payment_failed' },
      };

  const { data, error } = await sb.rpc(call.fn, call.args);
  if (error) {
    const msg = error.message ?? 'unknown error';
    if (isTerminalStateError(msg)) {
      // e.g. Stripe says succeeded but the row already reads 'canceled'. That is a
      // real discrepancy between Stripe and this database, and a retry cannot mend
      // it — ack so the retry storm stops and leave the row for reconciliation.
      await fail('unresolved', { pledge: pledge.id, pledge_status: pledge.status, message: msg });
      return json({ received: true, unresolved: true, message: msg });
    }
    await fail('error', { pledge: pledge.id, message: msg });
    return json({ error: msg }, 500); // 500 → Stripe retries, row stays un-processed
  }

  return await done(data);
});
