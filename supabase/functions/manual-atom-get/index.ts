// GET /functions/v1/manual-atom-get/:slug
// Returns a single atom by slug (atoms.id IS the slug) with tier_vote_counts
// aggregated from atom_kettle_votes.
//
// Per shared/canon/manual-spine-api-v1-amendment-1.md §2.3.
// verify_jwt = false (public read).

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

const FUNCTION_NAME = 'manual-atom-get';
const TIERS = ['Sourced', 'Accepted', 'Emerging', 'Fringe', 'Unsourced'] as const;

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

  const { data: atom, error: atomErr } = await sb
    .from('atoms')
    .select('id, name, realm_id, path, path_parts, kettle, created_at, updated_at')
    .eq('id', slug)
    .maybeSingle();
  if (atomErr) {
    console.error('manual-atom-get atom lookup failed', {
      slug, message: atomErr.message,
    });
    return errorResponse('Atom lookup failed', 500);
  }
  if (!atom) return errorResponse('Atom not found', 404);

  const { data: voteRows, error: voteErr } = await sb
    .from('atom_kettle_votes')
    .select('kettle')
    .eq('atom_id', slug);
  if (voteErr) {
    console.error('manual-atom-get vote count failed', {
      slug, message: voteErr.message,
    });
    return errorResponse('Vote count lookup failed', 500);
  }

  const tierVoteCounts: Record<string, number> = Object.fromEntries(
    TIERS.map((t) => [t, 0]),
  );
  for (const row of voteRows ?? []) {
    const k = (row as { kettle?: string }).kettle;
    if (k && k in tierVoteCounts) tierVoteCounts[k]++;
  }
  const totalVotes = (voteRows ?? []).length;

  const pathParts: string[] = Array.isArray(atom.path_parts) ? atom.path_parts : [];

  return jsonResponse({
    id: atom.id,
    name: atom.name,
    realm: atom.realm_id,
    l2: pathParts[1] ?? null,
    l3: pathParts[2] ?? null,
    path_parts: pathParts,
    current_tier: atom.kettle,
    tier_vote_counts: tierVoteCounts,
    total_votes: totalVotes,
    created_at: atom.created_at,
    updated_at: atom.updated_at,
  });
});
