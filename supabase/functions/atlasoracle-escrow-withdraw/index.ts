// POST /functions/v1/atlasoracle-escrow-withdraw
// Move BLiNG! from the caller's AtlasOracle escrow pot back into their main
// wallet.
// Body: { amount: number }   (minimum 0.1 BLiNG!)
// Auth: Bearer <supabase-user-jwt>
//
// Wraps public.atlasoracle_withdraw_from_escrow(numeric). The RPC uses
// auth.uid() to identify the caller — see deposit handler for the rationale
// behind userClient(jwt).

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { userClient } from '../_shared/supabase.ts';

interface WithdrawBody {
  amount?: unknown;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: WithdrawBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { amount } = body;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0.1) {
    return errorResponse('amount must be a number ≥ 0.1');
  }

  const jwt = req.headers.get('Authorization')!.slice('Bearer '.length);
  const sb = userClient(jwt);

  const startedAt = Date.now();
  const { data, error } = await sb.rpc('atlasoracle_withdraw_from_escrow', {
    p_amount: amount,
  });
  const latencyMs = Date.now() - startedAt;

  if (error) {
    const msg = error.message ?? 'unknown error';
    console.error('atlasoracle-escrow-withdraw error', {
      bee_id: auth.userId, amount, latency_ms: latencyMs, message: msg,
    });
    if (/insufficient|no atlasoracle escrow pot/i.test(msg)) {
      return errorResponse(msg, 402);
    }
    if (/authentication required/i.test(msg)) {
      return errorResponse(msg, 401);
    }
    return errorResponse(msg, 400);
  }

  console.log('atlasoracle-escrow-withdraw ok', {
    bee_id: auth.userId, amount, latency_ms: latencyMs,
  });
  return jsonResponse(data);
});
