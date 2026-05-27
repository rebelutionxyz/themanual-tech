// POST /functions/v1/manual-atom-kettle-vote/:slug
// Body: { tier: 'Sourced'|'Accepted'|'Emerging'|'Fringe'|'Unsourced', weight?: number }
//
// Per shared/canon/manual-spine-api-v1-amendment-1.md §2.2.
// verify_jwt = true (Bee-auth required).
// Inserts a tier-classification vote for the caller (auth.uid()) on the atom.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';

const FUNCTION_NAME = 'manual-atom-kettle-vote';
const TIERS = ['Sourced', 'Accepted', 'Emerging', 'Fringe', 'Unsourced'] as const;
type Tier = typeof TIERS[number];

interface VoteBody {
  tier?: unknown;
  weight?: unknown;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const beeId = auth.userId;

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.indexOf(FUNCTION_NAME);
  const slug = fnIdx >= 0 && parts.length > fnIdx + 1 ? parts[fnIdx + 1] : '';
  if (!slug) return errorResponse('slug required in path');

  let body: VoteBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (typeof body.tier !== 'string' || !TIERS.includes(body.tier as Tier)) {
    return errorResponse(`tier must be one of: ${TIERS.join(', ')}`);
  }
  const tier = body.tier as Tier;

  let weight = 1.0;
  if (body.weight !== undefined) {
    if (typeof body.weight !== 'number' || !Number.isFinite(body.weight) || body.weight <= 0) {
      return errorResponse('weight must be a positive number');
    }
    weight = body.weight;
  }

  const sb = serviceClient();

  // Confirm atom exists.
  const { data: atom, error: atomErr } = await sb
    .from('atoms')
    .select('id')
    .eq('id', slug)
    .maybeSingle();
  if (atomErr) {
    console.error('manual-atom-kettle-vote atom lookup failed', {
      slug, message: atomErr.message,
    });
    return errorResponse('Atom lookup failed', 500);
  }
  if (!atom) return errorResponse('Atom not found', 404);

  const { data: insertRow, error: insertErr } = await sb
    .from('atom_kettle_votes')
    .insert({
      atom_id: slug,
      bee_id: beeId,
      kettle: tier,
      weight,
    })
    .select('id')
    .single();
  if (insertErr || !insertRow) {
    console.error('manual-atom-kettle-vote insert failed', {
      slug, bee_id: beeId, tier, weight,
      message: insertErr?.message ?? 'no row',
    });
    return errorResponse('Vote insert failed', 500);
  }

  // Recompute tier_vote_counts post-insert (lightweight; one query).
  const { data: voteRows, error: voteErr } = await sb
    .from('atom_kettle_votes')
    .select('kettle')
    .eq('atom_id', slug);
  if (voteErr) {
    console.error('manual-atom-kettle-vote post-vote count failed', {
      slug, message: voteErr.message,
    });
    // Vote landed; return success with counts unavailable.
    return jsonResponse({
      ok: true,
      vote_id: insertRow.id,
      atom_slug: slug,
      tier,
      weight,
    });
  }

  const tierVoteCounts: Record<string, number> = Object.fromEntries(
    TIERS.map((t) => [t, 0]),
  );
  for (const row of voteRows ?? []) {
    const k = (row as { kettle?: string }).kettle;
    if (k && k in tierVoteCounts) tierVoteCounts[k]++;
  }

  console.log('manual-atom-kettle-vote ok', {
    vote_id: insertRow.id, atom_slug: slug, bee_id: beeId, tier, weight,
  });

  return jsonResponse({
    ok: true,
    vote_id: insertRow.id,
    atom_slug: slug,
    tier,
    weight,
    tier_vote_counts: tierVoteCounts,
    total_votes: (voteRows ?? []).length,
  });
});
