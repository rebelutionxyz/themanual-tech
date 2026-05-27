// GET /functions/v1/atlasoracle-log?limit=&offset=
//
// Returns the current Bee's AtlasOracle directive history. Metadata only —
// the underlying table holds no directive / response content.
//
// Auth: Bearer <supabase-user-jwt>
//
// Response: { directives: [...], total: number }
//
// Note on RLS: bling-send-pattern uses service_role for trigger consistency.
// Here we use service_role and explicitly filter `.eq('bee_id', auth.userId)`.
// The atlasoracle_directives_select_own RLS policy is the belt-and-suspenders
// second guarantee — if this filter is ever removed, RLS would still block
// cross-Bee reads from an authenticated client.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const url = new URL(req.url);
  const rawLimit = url.searchParams.get('limit');
  const rawOffset = url.searchParams.get('offset');

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return errorResponse(`limit must be 1..${MAX_LIMIT}`);
    }
    limit = parsed;
  }

  let offset = 0;
  if (rawOffset !== null) {
    const parsed = Number.parseInt(rawOffset, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return errorResponse('offset must be ≥ 0');
    }
    offset = parsed;
  }

  const sb = serviceClient();

  const { data, error, count } = await sb
    .from('atlasoracle_directives')
    .select(
      'id, astra_id, nova_id, directive_category, tier, provider_selected, cost_bling, latency_ms, success, created_at',
      { count: 'exact' },
    )
    .eq('bee_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({
    directives: data ?? [],
    total: count ?? 0,
  });
});
