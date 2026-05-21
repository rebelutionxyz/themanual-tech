// AtlasOracle audit-log writer — server-side only.
//
// Wraps the INSERT into atlasoracle_directives behind a type-checked
// metadata-only interface. The shape EXCLUDES directive text and response
// text by design — the compiler will refuse any call that tries to pass
// content alongside metadata.
//
// Content-leak posture: there is NO directive_text / response_text field
// in DirectiveMetadata. If you find yourself wanting to add one, stop and
// re-read whitepaper.md §"NO retention of directives or responses."

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
  costBling: number;
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
    .from('atlasoracle_directives')
    .insert({
      bee_id: metadata.beeId,
      astra_id: metadata.astraId,
      nova_id: metadata.novaId ?? null,
      directive_category: metadata.directiveCategory,
      tier: metadata.tier,
      provider_selected: metadata.providerSelected,
      cost_bling: metadata.costBling,
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
