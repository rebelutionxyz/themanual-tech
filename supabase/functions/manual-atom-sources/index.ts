// GET /functions/v1/manual-atom-sources/:slug
// Returns sources attached to an atom. cov_score deferred to DingleBERRY per
// amendment §2.6.
//
// Per shared/canon/manual-spine-api-v1-amendment-1.md §2.6.
// verify_jwt = false (public read).

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

const FUNCTION_NAME = 'manual-atom-sources';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.indexOf(FUNCTION_NAME);
  const slug = fnIdx >= 0 && parts.length > fnIdx + 1 ? parts[fnIdx + 1] : '';
  if (!slug) return errorResponse('slug required in path');

  const sb = serviceClient();

  // Confirm atom exists so we can return 404 cleanly (otherwise an empty
  // sources array for a non-existent atom is misleading).
  const { data: atom, error: atomErr } = await sb
    .from('atoms')
    .select('id')
    .eq('id', slug)
    .maybeSingle();
  if (atomErr) {
    console.error('manual-atom-sources atom lookup failed', {
      slug, message: atomErr.message,
    });
    return errorResponse('Atom lookup failed', 500);
  }
  if (!atom) return errorResponse('Atom not found', 404);

  const { data: rows, error: srcErr } = await sb
    .from('atom_sources')
    .select('url, title, stance, note, bee_id, created_at')
    .eq('atom_id', slug)
    .order('created_at', { ascending: false });
  if (srcErr) {
    console.error('manual-atom-sources lookup failed', {
      slug, message: srcErr.message,
    });
    return errorResponse('Sources lookup failed', 500);
  }

  const sources = (rows ?? []).map((r) => {
    const s = r as {
      url: string;
      title: string | null;
      stance: string;
      note: string | null;
      bee_id: string;
      created_at: string;
    };
    return {
      url: s.url,
      title: s.title,
      stance: s.stance,
      note: s.note,
      added_by_bee_id: s.bee_id,
      added_at: s.created_at,
    };
  });

  return jsonResponse({
    atom_slug: slug,
    sources,
  });
});
