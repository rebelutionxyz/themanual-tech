// ============================================================================
// RECOVERED FROM DEPLOYMENT - NOT VERIFIED AGAINST ANY ORIGINAL
//
//   slug            venue-checkout
//   version         13 (status ACTIVE at time of recovery)
//   function id     f7e8ccad-634f-4aaa-af2a-0108a8ab8fb2
//   project         anxmqiehpyznifqgskzc
//   ezbr_sha256     c3fe70f5e6a5d2ac299e5b5e42e8e699cc07972f6825210b9d1c4696b37565ed
//   deployed        1783693477577 (created_at == updated_at)
//   recovered       2026-08-02, pass OPS55, read-only get_edge_function
//
// This file is a transcription of the source carried inside the deployed
// bundle. It has NOT been deployed, edited, reformatted, or reconciled with
// any original. Nothing below this banner was authored in this pass.
//
// Corroboration: a copy of this source, differing ONLY in its 8-line header
// comment (executable code byte-identical), was found at
//   TheHoneycomb.games/apps/trivia/edge-proposed/venue-checkout/index.ts
// dated 2026-07-10 and labelled "PROPOSED ... (NOT deployed; Butch ratifies)".
// That label is FALSE - this code takes money in production today.
//
// The three ../_shared/*.ts modules bundled with the deployed version were
// diffed against this repo's supabase/functions/_shared/: cors.ts identical;
// supabase.ts and stripe.ts differ in COMMENTS ONLY (this repo carries the
// longer comment), executable code identical.
//
// DO NOT DEPLOY FROM THIS FILE without an explicit dispatch under the root
// CLAUDE.md DEPLOY AMENDMENT.
// ============================================================================

// POST /functions/v1/venue-checkout
// Creates a Stripe Checkout Session for a venue subscription (F6 services
// fiat-in, canon thetrivia-venue-v2 A1). The session pins
// subscription_data.metadata = { bee_id, venue_id? }, so bee resolution in
// stripe-subscription-webhook is deterministic on first contact and
// bees.stripe_customer_id gets pinned automatically.
//
// AUTHN: verify_jwt = true. Caller must be a signed-in Bee; if a venue_id is
// supplied the caller must own it. This function never touches BLiNG!.
//
// ENV (Supabase secrets):
//   STRIPE_SECRET_KEY                — same key the webhook uses
//   VENUE_PRICE_FOUNDING_MONTHLY     — price_… id ($49/mo, first 20 Montana venues)
//   VENUE_PRICE_STANDARD_MONTHLY     — price_… id ($99/mo)
//   VENUE_PRICE_STANDARD_ANNUAL      — price_… id ($999/yr)
//   CHECKOUT_SUCCESS_URL             — e.g. https://thetrivia.app/#hq/ops?activated=1
//   CHECKOUT_CANCEL_URL              — e.g. https://thetrivia.app/
//
// Plan choice arrives as {"plan": "founding" | "standard" | "annual",
// "venue_id"?: uuid}. Price ids live in env, not the client — the client can
// never name an arbitrary price. Mode is subscription-only today; a one-time
// (mode: 'payment') branch can ride the same function later.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { getStripe } from '../_shared/stripe.ts';

const PLAN_ENV: Record<string, string> = {
  founding: 'VENUE_PRICE_FOUNDING_MONTHLY',
  standard: 'VENUE_PRICE_STANDARD_MONTHLY',
  annual: 'VENUE_PRICE_STANDARD_ANNUAL',
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  // Resolve the signed-in Bee from the forwarded JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return errorResponse('Auth required', 401);
  const asUser = userClient(jwt);
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return errorResponse('Auth required', 401);
  const beeId = userData.user.id;

  let body: { plan?: string; venue_id?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Bad JSON', 400);
  }

  const plan = body.plan ?? '';
  const envKey = PLAN_ENV[plan];
  if (!envKey) return errorResponse('Unknown plan', 400);
  const priceId = Deno.env.get(envKey);
  if (!priceId) return errorResponse(`Plan not configured (${envKey})`, 500);

  // Optional venue binding — caller must own the venue.
  const sb = serviceClient();
  let venueId: string | null = null;
  if (body.venue_id) {
    const { data: venue } = await sb
      .from('trivia_venues')
      .select('id, owner_bee_id')
      .eq('id', body.venue_id)
      .maybeSingle();
    if (!venue) return errorResponse('Venue not found', 404);
    if (venue.owner_bee_id !== beeId) return errorResponse('Not venue owner', 403);
    venueId = venue.id;
  }

  // Reuse the Bee's Stripe customer when we already have one pinned.
  const { data: bee } = await sb
    .from('bees')
    .select('stripe_customer_id')
    .eq('id', beeId)
    .maybeSingle();

  const stripe = getStripe();
  const metadata: Record<string, string> = { bee_id: beeId };
  if (venueId) metadata.venue_id = venueId;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata },
      metadata,
      ...(bee?.stripe_customer_id ? { customer: bee.stripe_customer_id } : {}),
      success_url: Deno.env.get('CHECKOUT_SUCCESS_URL') ?? 'https://thetrivia.app/',
      cancel_url: Deno.env.get('CHECKOUT_CANCEL_URL') ?? 'https://thetrivia.app/',
      allow_promotion_codes: false,
    });
    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error('venue-checkout session create failed', {
      bee_id: beeId, plan, message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse('Checkout session failed', 500);
  }
});
