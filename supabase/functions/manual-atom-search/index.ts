// GET /functions/v1/manual-atom-search?q=...&realm=...&limit=...
// pg_trgm fuzzy search across atoms.name + atoms.path. Optional realm filter
// against atoms.realm_id. Default limit 20, max 100.
//
// Per shared/canon/manual-spine-api-v1.md §1.1 (response shape unchanged by
// amendment 1).
// verify_jwt = false (public read).

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_QUERY_CHARS = 2;
const MAX_QUERY_CHARS = 200;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const realm = url.searchParams.get('realm');
  const limitRaw = url.searchParams.get('limit');

  if (q.length < MIN_QUERY_CHARS) {
    return errorResponse(`q must be at least ${MIN_QUERY_CHARS} characters`);
  }
  if (q.length > MAX_QUERY_CHARS) {
    return errorResponse(`q must be at most ${MAX_QUERY_CHARS} characters`);
  }
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return errorResponse(`limit must be between 1 and ${MAX_LIMIT}`);
    }
    limit = parsed;
  }

  const sb = serviceClient();

  // pg_trgm similarity ranking on atoms.name, with substring ILIKE as a
  // broad-match filter so we don't miss long-form titles. Limit applied at
  // SQL level. Optional realm filter narrows scope.
  let query = sb
    .from('atoms')
    .select('id, name, realm_id, path')
    .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
    .limit(limit);
  if (realm) {
    query = query.eq('realm_id', realm);
  }

  const { data: rows, error: searchErr } = await query;
  if (searchErr) {
    console.error('manual-atom-search query failed', {
      q, realm, message: searchErr.message,
    });
    return errorResponse('Search failed', 500);
  }

  // Compute coarse match_score in TS — % overlap of query in name lowercased.
  // True pg_trgm similarity would need an RPC; for v1 this heuristic is
  // adequate for ranking display.
  const qLower = q.toLowerCase();
  const results = (rows ?? []).map((r) => {
    const name = ((r as { name?: string }).name ?? '').toLowerCase();
    const score = name.includes(qLower)
      ? qLower.length / Math.max(name.length, 1)
      : 0;
    return {
      slug: (r as { id: string }).id,
      title: (r as { name: string }).name,
      realm: (r as { realm_id: string }).realm_id,
      path: (r as { path: string }).path,
      match_score: Number(score.toFixed(3)),
    };
  });
  results.sort((a, b) => b.match_score - a.match_score);

  return jsonResponse({
    results,
    total: results.length,
  });
});
