// GET /functions/v1/atlasoracle-providers
//
// Public listing of active AtlasOracle providers. No auth required —
// the provider pool is operator information surfaced for transparency.
//
// Response: { providers: [...] }

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const sb = serviceClient();

  const { data, error } = await sb
    .from('atlasoracle_provider_pool')
    .select('provider_name, provider_category, selection_weight, drift_flag, last_drift_check_at')
    .eq('active', true)
    .order('provider_category', { ascending: true })
    .order('provider_name', { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ providers: data ?? [] });
});
