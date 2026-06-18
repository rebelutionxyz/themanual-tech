// POST /functions/v1/fountain/pledge | /functions/v1/fountain/close
// HONEYCOMB F5 — The Fountain (crowdfunding) orchestration over the DB layer
// (fountain_register_pledge / fountain_begin_close / fountain_pledge_captured /
//  fountain_pledge_canceled / fountain_finalize_close — all service-role RPCs).
//
// MONEY PATH — NO CUSTODY, 0% PLATFORM FEE (locked Jun 10 2026):
// PaymentIntents are DIRECT CHARGES on the campaign manager's Express Connect
// account ({ stripeAccount: manager_connect_account }). Fiat flows contributor →
// manager; Stripe fees are borne by the manager; the platform holds no fiat and
// takes no application fee.
//
// PATTERN B — CHARGE AT CLOSE: /pledge creates a manual-capture PI (authorize
// only) and registers the pledge. /close runs the AON/KWYR verdict and then
// captures (or cancels) every authorized PI, settling each via RPC. The
// contributor's BLiNG! reward (amount$ × freeing_multiplier) is freed from the
// Well inside fountain_pledge_captured — drain-model, conservation-safe,
// idempotent per pledge. FIREWALL: the contributor's fiat buys nothing; the
// reward is FREED. No fiat→BLiNG! conversion, no fiat-out, no affiliate.

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { getStripe } from '../_shared/stripe.ts';
import { refFor } from '../_shared/ids.ts';

const FUNCTION_NAME = 'fountain';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const beeId = auth.userId;

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.indexOf(FUNCTION_NAME);
  const route = fnIdx >= 0 && parts.length > fnIdx + 1 ? parts[fnIdx + 1] : '';

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const sb = serviceClient();
  const stripe = getStripe();

  // ---------------------------------------------------------------- /pledge
  if (route === 'pledge') {
    const campaignId = body.campaign_id;
    const amountCents = body.amount_cents;
    if (typeof campaignId !== 'string') return errorResponse('campaign_id required');
    if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0) {
      return errorResponse('amount_cents must be a positive integer');
    }

    const { data: campaign, error: cErr } = await sb
      .from('give_campaigns')
      .select('id, slug, status, funding_model, currency, manager_connect_account')
      .eq('id', campaignId)
      .maybeSingle();
    if (cErr) {
      console.error('fountain pledge campaign lookup failed', { campaignId, message: cErr.message });
      return errorResponse('Campaign lookup failed', 500);
    }
    if (!campaign) return errorResponse('Campaign not found', 404);
    if (campaign.status !== 'active') return errorResponse(`Campaign not active (${campaign.status})`);
    if (!campaign.funding_model || !campaign.manager_connect_account) {
      return errorResponse('Campaign is not financially configured');
    }

    // Direct charge on the manager's Connect account, authorize-only (Pattern B).
    let pi;
    try {
      pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: campaign.currency ?? 'usd',
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true },
          metadata: { bee_id: beeId, campaign_id: campaign.id, campaign_slug: campaign.slug },
        },
        { stripeAccount: campaign.manager_connect_account },
      );
    } catch (err) {
      console.error('fountain pledge PI create failed', {
        campaignId, message: err instanceof Error ? err.message : String(err),
      });
      return errorResponse('Payment initialization failed', 502);
    }

    const sourceRef = await refFor('fountain_pledge', pi.id);
    const { data: reg, error: rErr } = await sb.rpc('fountain_register_pledge', {
      p_campaign_id: campaign.id,
      p_bee_id: beeId,
      p_amount_cents: amountCents,
      p_currency: campaign.currency ?? 'usd',
      p_payment_intent_id: pi.id,
      p_source_ref: sourceRef,
    });
    if (rErr) {
      // PI is orphaned — cancel it so no dangling authorization can ever capture.
      console.error('fountain pledge register failed — canceling PI', { pi: pi.id, message: rErr.message });
      try {
        await stripe.paymentIntents.cancel(pi.id, undefined, { stripeAccount: campaign.manager_connect_account });
      } catch (cancelErr) {
        console.error('fountain orphan PI cancel ALSO failed — manual cleanup needed', {
          pi: pi.id, message: cancelErr instanceof Error ? cancelErr.message : String(cancelErr),
        });
      }
      return errorResponse('Pledge registration failed', 500);
    }

    console.log('fountain pledge ok', { campaign: campaign.slug, bee_id: beeId, amount_cents: amountCents, pi: pi.id });
    return jsonResponse({
      ok: true,
      pledge: reg,
      client_secret: pi.client_secret,
      stripe_account: campaign.manager_connect_account,
    });
  }

  // ----------------------------------------------------------------- /close
  if (route === 'close') {
    // Admin-gated: closing a campaign settles money + frees rewards.
    const { data: bee } = await sb.from('bees').select('is_admin').eq('id', beeId).maybeSingle();
    if (!bee?.is_admin) return errorResponse('Admin only', 403);

    const campaignId = body.campaign_id;
    if (typeof campaignId !== 'string') return errorResponse('campaign_id required');

    const { data: campaign, error: cErr } = await sb
      .from('give_campaigns')
      .select('id, slug, manager_connect_account')
      .eq('id', campaignId)
      .maybeSingle();
    if (cErr || !campaign) return errorResponse('Campaign not found', 404);
    const acct = campaign.manager_connect_account as string;

    const { data: close, error: bErr } = await sb.rpc('fountain_begin_close', { p_campaign_id: campaignId });
    if (bErr) {
      console.error('fountain begin_close failed', { campaignId, message: bErr.message });
      return errorResponse(`Close failed: ${bErr.message}`, 500);
    }

    const verdict: string = close.verdict;
    const pledges: Array<{ pledge_id: string; payment_intent: string; amount_cents: number }> = close.pledges ?? [];
    const results: Array<Record<string, unknown>> = [];

    for (const p of pledges) {
      try {
        if (verdict === 'capture') {
          await stripe.paymentIntents.capture(p.payment_intent, undefined, { stripeAccount: acct });
          const { data: settled, error: sErr } = await sb.rpc('fountain_pledge_captured', { p_pledge_id: p.pledge_id });
          if (sErr) throw new Error(`captured on Stripe but settle RPC failed: ${sErr.message}`);
          results.push({ pledge: p.pledge_id, captured: true, reward_freed: settled?.reward_freed });
        } else {
          await stripe.paymentIntents.cancel(p.payment_intent, undefined, { stripeAccount: acct });
          const { error: xErr } = await sb.rpc('fountain_pledge_canceled', { p_pledge_id: p.pledge_id, p_failed: false });
          if (xErr) throw new Error(`canceled on Stripe but RPC failed: ${xErr.message}`);
          results.push({ pledge: p.pledge_id, canceled: true });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('fountain pledge settle failed', { pledge: p.pledge_id, verdict, message: msg });
        if (verdict === 'capture') {
          await sb.rpc('fountain_pledge_canceled', { p_pledge_id: p.pledge_id, p_failed: true });
        }
        results.push({ pledge: p.pledge_id, error: msg });
      }
    }

    const { data: fin, error: fErr } = await sb.rpc('fountain_finalize_close', { p_campaign_id: campaignId });
    if (fErr) {
      // Pledges may remain authorized (e.g. mid-loop crash) — close is re-entrant; rerun /close.
      console.error('fountain finalize failed (re-run /close to resume)', { campaignId, message: fErr.message });
      return jsonResponse({ ok: false, verdict, results, finalize_error: fErr.message }, 500);
    }

    console.log('fountain close ok', { campaign: campaign.slug, verdict, settled: results.length, final: fin?.final_status });
    return jsonResponse({ ok: true, verdict, results, final: fin });
  }

  return errorResponse('Unknown route — use /pledge or /close', 404);
});
