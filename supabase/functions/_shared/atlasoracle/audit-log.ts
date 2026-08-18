// AtlasOracle audit-log writer — server-side only.
//
// Wraps the INSERT into h24_directives behind a type-checked
// metadata-only interface. The shape EXCLUDES directive text and response
// text by design — the compiler will refuse any call that tries to pass
// content alongside metadata.
//
// Content-leak posture: there is NO directive_text / response_text field
// in DirectiveMetadata. If you find yourself wanting to add one, stop and
// re-read whitepaper.md §"NO retention of directives or responses."
//
// cost_bling WRITE-STOP (DB7, 2026-07-27): costBling removed from both the
// interface and the INSERT, so this helper cannot resurrect the write after
// the column is dropped. NOTE — nothing imports this module today;
// h24-route writes h24_directives inline. It is kept in step
// with the retirement rather than left as a landmine for whoever wires it up.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type DirectiveCategory =
  | 'scaffold' | 'draft' | 'integrate' | 'refactor' | 'analyze'
  | 'classify' | 'translate' | 'estimate' | 'correlate' | 'suggest';

export type Tier = 'free' | 'standard' | 'frontier';

export interface DirectiveMetadata {
  beeId: string;
  astraId: string;
  novaId?: string | null;
  directiveCategory: DirectiveCategory;
  tier: Tier;
  providerSelected: string | null;
  latencyMs: number | null;
  success: boolean;
}

export interface LoggedDirective {
  id: string;
}

export async function logDirective(
  sb: SupabaseClient,
  metadata: DirectiveMetadata,
): Promise<LoggedDirective> {
  const { data, error } = await sb
    .from('h24_directives')
    .insert({
      bee_id: metadata.beeId,
      astra_id: metadata.astraId,
      nova_id: metadata.novaId ?? null,
      directive_category: metadata.directiveCategory,
      tier: metadata.tier,
      provider_selected: metadata.providerSelected,
      latency_ms: metadata.latencyMs,
      success: metadata.success,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`atlasoracle audit-log insert failed: ${error.message}`);
  }
  return { id: data.id };
}
