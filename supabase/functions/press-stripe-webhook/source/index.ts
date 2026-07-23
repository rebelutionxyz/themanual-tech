// POST /functions/v1/press-stripe-webhook
// Stripe webhook for PRESS flyer ad installments. On checkout.session.completed
// (mode: payment), reads metadata { hold_id, stage } and settles the installment
// via press_record_payment(hold, stage, amount, 'stripe', session.id).
// press_record_payment advances hold status by cumulative paid_cents and mints
// affiliate credit at the 80% and 100% thresholds — this webhook only records.
//
// AUTHN: verify_jwt = false. Authenticity is the Stripe signature (async verify,
// edge runtime has no Node crypto). Secret name is suffixed _PRESS so it never
// collides with STRIPE_WEBHOOK_SECRET_SUBSCRIPTION used by the F6 webhook.
// ENV: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET_PRESS (whsec_… for THIS endpoint),
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { getStripe, cryptoProvider } from '../_shared/stripe.ts';
import { serviceClient } from '../_shared/supabase.ts';

const VALID_STAGES = new Set(['hold', 'deposit', 'balance']);
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_PRESS') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig || !WEBHOOK_SECRET) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();

  let event: unknown;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (err) {
    console.error('press-stripe-webhook signature verify failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response('Invalid signature', { status: 400 });
  }

  const evt = event as { type: string; data: { object: Record<string, unknown> } };

  if (evt.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true, ignored: evt.type }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = evt.data.object as {
    id: string;
    payment_status?: string;
    amount_total?: number;
    metadata?: Record<string, string>;
  };

  if (session.payment_status && session.payment_status !== 'paid') {
    return new Response(JSON.stringify({ received: true, unpaid: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const holdId = session.metadata?.hold_id;
  const stage = session.metadata?.stage;
  const amount = session.amount_total ?? 0;

  if (!holdId || !stage || !VALID_STAGES.has(stage) || amount <= 0) {
    console.error('press-stripe-webhook missing/invalid metadata', {
      session_id: session.id, holdId, stage, amount,
    });
    return new Response(JSON.stringify({ received: true, skipped: 'bad metadata' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sb = serviceClient();
  const { data, error } = await sb.rpc('press_record_payment', {
    p_hold: holdId,
    p_kind: stage,
    p_amount_cents: amount,
    p_method: 'stripe',
    p_external_ref: session.id,
  });

  if (error) {
    console.error('press_record_payment failed', {
      session_id: session.id, hold_id: holdId, stage, message: error.message,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true, result: data }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
