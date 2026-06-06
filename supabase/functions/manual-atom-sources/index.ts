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

  // Join bees for a public attribution (handle/name) — NEVER expose raw bee_id.
  const { data: rows, error: srcErr } = await sb
    .from('atom_sources')
    .select('url, title, stance, note, created_at, bees:bee_id(handle, name)')
    .eq('atom_id', slug)
    .order('created_at', { ascending: false });
  if (srcErr) {
    console.error('manual-atom-sources lookup failed', {
      slug, message: srcErr.message,
    });
    return errorResponse('Sources lookup failed', 500);
  }

  type BeeRef = { handle: string | null; name: string | null };
  const sources = (rows ?? []).map((r) => {
    const s = r as {
      url: string;
      title: string | null;
      stance: string;
      note: string | null;
      created_at: string;
      bees: BeeRef | BeeRef[] | null;
    };
    const bee = Array.isArray(s.bees) ? s.bees[0] : s.bees;
    return {
      url: s.url,
      title: s.title,
      stance: s.stance,
      note: s.note,
      added_by_handle: bee?.handle ?? null,
      added_by_name: bee?.name ?? null,
      added_at: s.created_at,
    };
  });

  return jsonResponse({
    atom_slug: slug,
    sources,
  });
});
