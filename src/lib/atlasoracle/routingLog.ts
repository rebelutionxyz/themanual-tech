// Per-Bee routing log — metadata only.
//
// atlasoracle_directives holds NO directive text and NO response text (the
// sovereignty rule is enforced structurally: the columns do not exist). This
// reader therefore cannot leak content even if it tried.
//
// RLS: atlasoracle_directives carries a select-own policy, so a Bee's own JWT
// returns only that Bee's rows. No service-role key is involved.

import { supabase } from '@/lib/supabase';
import { isMocked } from './client';

export interface RoutingLogEntry {
  id: string;
  tier: string;
  category: string;
  provider: string | null;
  status: string;
  success: boolean | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface DirectiveRow {
  id: string;
  tier: string;
  directive_category: string;
  provider_selected: string | null;
  status: string;
  success: boolean | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
  error_message: string | null;
  created_at: string;
}

const MOCK_LOG: RoutingLogEntry[] = [
  {
    id: 'mock-0001',
    tier: 'free',
    category: 'suggest',
    provider: 'claude-haiku-4-5',
    status: 'success',
    success: true,
    latencyMs: 1234,
    inputTokens: 1637,
    outputTokens: 43,
    cachedTokens: 0,
    errorMessage: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'mock-0002',
    tier: 'standard',
    category: 'analyze',
    provider: null,
    status: 'failed',
    success: false,
    latencyMs: 1728,
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    errorMessage: 'mock failure row',
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
];

export async function fetchRoutingLog(limit = 25): Promise<RoutingLogEntry[]> {
  if (isMocked()) return MOCK_LOG.slice(0, limit);
  if (!supabase) throw new Error('Supabase client not configured.');

  const { data, error } = await supabase
    .from('atlasoracle_directives')
    .select(
      'id, tier, directive_category, provider_selected, status, success, latency_ms, input_tokens, output_tokens, cached_tokens, error_message, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as DirectiveRow[]).map((r) => ({
    id: r.id,
    tier: r.tier,
    category: r.directive_category,
    provider: r.provider_selected,
    status: r.status,
    success: r.success,
    latencyMs: r.latency_ms,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    cachedTokens: r.cached_tokens,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}
