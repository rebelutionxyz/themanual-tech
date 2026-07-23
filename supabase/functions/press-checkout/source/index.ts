// POST /functions/v1/press-checkout
// Creates a Stripe Checkout Session (mode: payment) for one installment of a
// PRESS flyer ad hold: the 20% hold, the 60% deposit, or the final 20% balance.
// Amount is computed server-side from press_holds; client never names a price.
// Product name + description narrate the FULL context (slots, sheet, total, and
// the remaining payment schedule) so the buyer always knows where they stand.
// Pins session.metadata = { hold_id, stage } so press-stripe-webhook settles
// deterministically via press_record_payment.
//
// AUTHN: verify_jwt = true. Caller must be the advertiser who owns the hold.
// ENV: STRIPE_SECRET_KEY, PRESS_CHECKOUT_SUCCESS_URL, PRESS_CHECKOUT_CANCEL_URL
// Body: { "hold_id": uuid, "stage": "hold" | "deposit" | "balance" }

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { getStripe } from '../_shared/stripe.ts';

const STAGE_FIELD: Record<string, string> = {
  hold: 'hold_cents',
  deposit: 'deposit_cents',
  balance: 'balance_cents',
};

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return errorResponse('Auth required', 401);
  const asUser = userClient(jwt);
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return errorResponse('Auth required', 401);
  const uid = userData.user.id;

  let body: { hold_id?: string; stage?: string };
  try { body = await req.json(); } catch { return errorResponse('Bad JSON', 400); }

  const holdId = body.hold_id ?? '';
  const stage = body.stage ?? '';
  const field = STAGE_FIELD[stage];
  if (!holdId || !field) return errorResponse('hold_id and valid stage required', 400);

  const sb = serviceClient();

  const { data: hold } = await sb
    .from('press_holds')
    .select('id, edition_id, advertiser_id, total_cents, hold_cents, deposit_cents, balance_cents, status')
    .eq('id', holdId)
    .maybeSingle();
  if (!hold) return errorResponse('Hold not found', 404);

  const { data: adv } = await sb
    .from('press_advertisers')
    .select('id, auth_user_id, contact_email, business_name')
    .eq('id', hold.advertiser_id)
    .maybeSingle();
  if (!adv || adv.auth_user_id !== uid) return errorResponse('Not your hold', 403);

  const amount = (hold as unknown as Record<string, number>)[field];
  if (!amount || amount <= 0) return errorResponse('Nothing due for this stage', 400);

  const { data: ed } = await sb
    .from('press_editions')
    .select('slug, city, side_a_category, side_b_category, trigger_pct')
    .eq('id', hold.edition_id)
    .maybeSingle();

  // Slot labels + sq-in for the description
  const { data: slotRows } = await sb
    .from('press_hold_slots')
    .select('press_slots!inner(press_slot_templates!inner(label, w_in, h_in, side, quadrant))')
    .eq('hold_id', holdId);

  type SlotT = { label: string; w_in: number; h_in: number };
  const slots: SlotT[] = (slotRows ?? []).map((r: Record<string, unknown>) => {
    const s = r.press_slots as Record<string, unknown>;
    return s.press_slot_templates as unknown as SlotT;
  });
  const sqin = slots.reduce((t, s) => t + Number(s.w_in) * Number(s.h_in), 0);
  const nSlots = slots.length;
  const sizeDesc = nSlots === 1
    ? `${Number(slots[0].w_in)}×${Number(slots[0].h_in)} spot`
    : `${nSlots} merged spots (${sqin} sq in)`;

  const city = ed?.city ?? 'Flyer';
  const total = money(hold.total_cents);
  const holdAmt = money(hold.hold_cents);
  const depAmt = money(hold.deposit_cents);
  const balAmt = money(hold.balance_cents);
  const trigger = Number(ed?.trigger_pct ?? 95);

  let name: string;
  let description: string;

  if (stage === 'hold') {
    name = `${city} flyer — ${sizeDesc} · ${total} total`;
    description =
      `Step 1 of 3: ${holdAmt} reservation (20%) locks your spot on the ${city} sheet. ` +
      `Then: ${depAmt} (60%) when the sheet reaches ${trigger}% — we email you. ` +
      `Final ${balAmt} (20%) only after it prints and we show you the USPS mailing receipts. ` +
      `Reservation is non-refundable but counts toward your ${total} total.`;
  } else if (stage === 'deposit') {
    name = `${city} flyer — deposit · ${sizeDesc}`;
    description =
      `Step 2 of 3: ${depAmt} (60%) — the ${city} sheet hit ${trigger}% and is headed to print. ` +
      `You've paid ${holdAmt}; after this only ${balAmt} remains, due once we mail and show you the USPS receipts. ` +
      `Total: ${total}.`;
  } else {
    name = `${city} flyer — final balance · ${sizeDesc}`;
    description =
      `Step 3 of 3: ${balAmt} (20%) settles your ${total} total. ` +
      `Your ad printed and mailed to every ${city} door — mailing receipts are on your hold page.`;
  }

  const stripe = getStripe();
  const successUrl = (Deno.env.get('PRESS_CHECKOUT_SUCCESS_URL') ?? 'https://406flyer.com/hold/{HOLD}?paid=1')
    .replace('{HOLD}', holdId);
  const cancelUrl = (Deno.env.get('PRESS_CHECKOUT_CANCEL_URL') ?? 'https://406flyer.com/hold/{HOLD}')
    .replace('{HOLD}', holdId);

  const metadata: Record<string, string> = { hold_id: holdId, stage };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name, description },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      payment_intent_data: { metadata },
      metadata,
      ...(adv.contact_email ? { customer_email: adv.contact_email } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
    });
    return jsonResponse({ url: session.url, amount_cents: amount, stage });
  } catch (err) {
    console.error('press-checkout session create failed', {
      hold_id: holdId, stage, message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse('Checkout session failed', 500);
  }
});
