// POST /functions/v1/bling-send
// Atomic peer-to-peer BLiNG! transfer. Calls public.bling_send RPC.
// Body: { recipient_id: uuid, amount: number, category?: string, memo?: string }
// Auth: Bearer <supabase-user-jwt>

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_CATEGORIES = ['general', 'kindness', 'productivity', 'learning'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

interface SendBody {
  recipient_id?: unknown;
  amount?: unknown;
  category?: unknown;
  memo?: unknown;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { recipient_id, amount, category = 'general', memo } = body;

  if (typeof recipient_id !== 'string' || !UUID_RE.test(recipient_id)) {
    return errorResponse('recipient_id must be a UUID');
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0.001) {
    return errorResponse('amount must be a number ≥ 0.001');
  }
  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category)) {
    return errorResponse(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (memo !== undefined && memo !== null && (typeof memo !== 'string' || memo.length > 500)) {
    return errorResponse('memo must be a string ≤ 500 chars');
  }

  const sb = serviceClient();
  const { data, error } = await sb.rpc('bling_send', {
    p_sender_id: auth.userId,
    p_recipient_id: recipient_id,
    p_amount: amount,
    p_category: category,
    p_memo: typeof memo === 'string' ? memo : null,
  });

  if (error) {
    // RPC RAISE EXCEPTION surfaces as error.message. Pass through.
    return errorResponse(error.message, 400);
  }
  return jsonResponse(data);
});
