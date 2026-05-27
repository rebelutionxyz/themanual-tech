// AtlasOracle canon reader — server-side only (service_role required).
//
// Reads master_plan/* canon files from the canonical Supabase storage
// bucket and caches them in atlasoracle_canon_reads. Returns a single
// concatenated string with section headers — directly usable as Claude
// `system` content or as `context` for a routed directive.
//
// Storage layout:
//   themanual-canonical/
//     master_plan/
//       honeycomb/            ← platform-wide canon (loads by default)
//         platform_thesis.md
//         economic_constitution.md
//         language_firewall.md
//         categorization.md
//       <astra-slug>/         ← per-Astra canon (themanual, atlasintel, ...)
//         <canon-file>.md
//
// Path inputs are SHORT paths relative to the master_plan/ root, e.g.:
//   ['honeycomb/platform_thesis.md', 'themanual/economic_constitution.md']
//
// Cache freshness (scaffolding posture):
//   * Cache lookup is by (canon_path, content_hash). If we've ever cached
//     the exact bytes we just fetched, we update last_read_at and reuse;
//     otherwise we INSERT a new row.
//   * No freshness check on the storage object — caller is responsible
//     for invalidation if canon changes. A future revision should add
//     ETag / If-None-Match support, or a TTL.

import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CANON_BUCKET = 'themanual-canonical';
const CANON_PREFIX = 'master_plan';

export async function readCanon(
  sb: SupabaseClient,
  canonPaths: string[],
): Promise<string> {
  if (!Array.isArray(canonPaths) || canonPaths.length === 0) {
    return '';
  }

  const sections: string[] = [];

  for (const path of canonPaths) {
    if (typeof path !== 'string' || path.length === 0) continue;
    const safePath = sanitizePath(path);
    const content = await readOne(sb, safePath);
    sections.push(`## Canon: ${safePath}\n\n${content}`);
  }

  return sections.join('\n\n');
}

async function readOne(sb: SupabaseClient, path: string): Promise<string> {
  const storageKey = `${CANON_PREFIX}/${path}`;
  const { data: blob, error: dlErr } = await sb.storage
    .from(CANON_BUCKET)
    .download(storageKey);
  if (dlErr || !blob) {
    throw new Error(`canon download failed for ${storageKey}: ${dlErr?.message ?? 'no data'}`);
  }

  const content = await blob.text();
  const hash = await sha256Hex(content);

  // Cache check by (path, hash) pair.
  const { data: existing } = await sb
    .from('atlasoracle_canon_reads')
    .select('id')
    .eq('canon_path', path)
    .eq('canon_hash', hash)
    .maybeSingle();

  if (existing) {
    // Touch last_read_at for cache-hit analytics.
    await sb
      .from('atlasoracle_canon_reads')
      .update({ last_read_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    // Insert. Errors here are non-fatal — caching is best-effort.
    await sb
      .from('atlasoracle_canon_reads')
      .insert({ canon_path: path, canon_hash: hash, content });
  }

  return content;
}

// Disallow path traversal / absolute paths. Canon paths must be relative
// and contained under master_plan/.
function sanitizePath(path: string): string {
  if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
    throw new Error(`invalid canon path: ${path}`);
  }
  return path;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convenience export — caller can use this if they're not already holding
// a service client.
export function defaultServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
