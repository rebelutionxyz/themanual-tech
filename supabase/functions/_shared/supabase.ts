// Supabase clients for Edge Functions.
// service_role bypasses RLS — used to call SECURITY DEFINER RPCs.
// anon is used to verify a user JWT and resolve it to a user_id.

import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function anonClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY missing');
  }
  return createClient(url, key);
}

// userClient — anon-keyed Supabase client that forwards the Bee's JWT on
// every request. RLS evaluates as the Bee; auth.uid() inside SECURITY DEFINER
// RPCs resolves to the Bee's UUID. Use this when the RPC body relies on
// auth.uid() rather than taking an explicit p_bee_id argument (e.g. the
// AtlasOracle escrow deposit / withdraw RPCs).
export function userClient(jwt: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY missing');
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
