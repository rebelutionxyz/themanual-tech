// Phase C Component D — promotions query + targeting cascade (Code 24).
// Most-specific-match-wins resolution per MMF §19.7 D-3.

import { supabase } from '@/lib/supabase';
import type { Promotion, SlotContext } from './types';

/**
 * Specificity weights. Order: atom > branch > realm > astra > geo > catch-all.
 * Each weight strictly dominates the sum of all lower weights, so a row that
 * matches a higher facet always outranks any combination of lower ones.
 *
 *   atom         32
 *   branch       16
 *   realm         8
 *   astra         4
 *   geo_country   2
 *   catch-all     1   (no facet match — universally applicable row)
 *
 * Within a tier (same total score) we sort by `priority DESC, created_at DESC`
 * per the spec.
 */
const W_ATOM = 32;
const W_BRANCH = 16;
const W_REALM = 8;
const W_ASTRA = 4;
const W_GEO = 2;
const W_CATCHALL = 1;

function specificity(row: Promotion, ctx: SlotContext): number {
  let score = 0;
  let touched = false;
  if (row.atom_id != null && ctx.atomId && row.atom_id === ctx.atomId) {
    score += W_ATOM;
    touched = true;
  }
  if (
    row.branch_path != null &&
    ctx.branchPath &&
    row.branch_path === ctx.branchPath
  ) {
    score += W_BRANCH;
    touched = true;
  }
  if (
    row.realm_slug != null &&
    ctx.realmSlug &&
    row.realm_slug === ctx.realmSlug
  ) {
    score += W_REALM;
    touched = true;
  }
  if (row.astra_slug != null && ctx.astra && row.astra_slug === ctx.astra) {
    score += W_ASTRA;
    touched = true;
  }
  if (
    row.geo_country != null &&
    ctx.geoCountry &&
    row.geo_country === ctx.geoCountry
  ) {
    score += W_GEO;
    touched = true;
  }
  // A row with all NULL facets is a true catch-all. It still gets a small
  // weight so the cascade picks it over nothing — but loses to any specific
  // match, even a single-facet one (W_GEO = 2 > W_CATCHALL = 1).
  if (!touched && isCatchAll(row)) score += W_CATCHALL;
  return score;
}

function isCatchAll(row: Promotion): boolean {
  return (
    row.atom_id == null &&
    row.branch_path == null &&
    row.realm_slug == null &&
    row.astra_slug == null &&
    row.geo_country == null
  );
}

/**
 * Confirm no scope facet on the row contradicts the current context.
 * If a row says `realm_slug = 'justice'` and the current context is the
 * 'science' realm, that row is ineligible.
 *
 * NULL on the row means "any value of that facet is OK" — never disqualifies.
 * v1 only filters geo by country; region/city/neighborhood on the row are
 * inert (the reader doesn't pass them).
 */
function rowMatchesContext(row: Promotion, ctx: SlotContext): boolean {
  if (row.atom_id != null && row.atom_id !== (ctx.atomId ?? '')) return false;
  if (row.branch_path != null && row.branch_path !== (ctx.branchPath ?? ''))
    return false;
  if (row.realm_slug != null && row.realm_slug !== (ctx.realmSlug ?? ''))
    return false;
  if (row.astra_slug != null && row.astra_slug !== (ctx.astra ?? ''))
    return false;
  if (row.geo_country != null && row.geo_country !== (ctx.geoCountry ?? ''))
    return false;
  return true;
}

/**
 * Fetch the winning promotion for a slot in the given context, or null when
 * no row matches the cascade.
 *
 * Trust model: the `promotions_select_active` RLS policy already filters out
 * inactive / future / expired rows for anon, so the query body can SELECT *
 * for the slot_key and the reader picks the winner in JS. (Promotions table is
 * expected to stay small at v1 — Studio-seeded rows only.)
 */
export async function queryPromotionForSlot(
  ctx: SlotContext,
): Promise<Promotion | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('slot_key', ctx.slotKey);

  if (error) {
    if (typeof console !== 'undefined') {
      console.warn('[promotions] query failed:', error.message);
    }
    return null;
  }
  if (!data || data.length === 0) return null;

  const eligible = (data as Promotion[]).filter((row) =>
    rowMatchesContext(row, ctx),
  );
  if (eligible.length === 0) return null;

  // Sort: specificity DESC → priority DESC → created_at DESC
  eligible.sort((a, b) => {
    const sa = specificity(a, ctx);
    const sb = specificity(b, ctx);
    if (sa !== sb) return sb - sa;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.created_at.localeCompare(a.created_at);
  });

  return eligible[0];
}
