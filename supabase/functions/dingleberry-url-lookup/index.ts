// POST /functions/v1/dingleberry-url-lookup
//
// DB38 -- URL CHECK RAIL. The sibling of DB33's hash rail: same seam, same
// two-value verdict, same never-say-clean discipline, different input.
//
// Owner ruling 2026-08-08: the website IS the security product for now. Phishing
// links are the most common way ordinary people get hurt, and checking a link is
// something a browser can do honestly.
//
//   Request:  { "urls": ["https://...", ...] }        max 50 per call
//   Response: {
//               "results": [
//                 { url, verdict, threat, tags, url_status, provider }
//               ],
//               "degraded": boolean
//             }
//
// TWO VALUES, NOT THREE. verdict is 'malicious' or 'unknown'. There is no
// 'clean' and no 'safe'. URLhaus lists URLs seen distributing malware; it
// certifies nothing as good, and the overwhelming majority of the honest web is
// simply absent from it. The frontend must word 'unknown' as "not on the
// known-bad list", never "safe" -- on a phishing check a confident false clean
// is the worst failure this feature has.
//
// degraded:true means at least one URL could not be resolved -- provider
// timeout, rate limit, missing key, budget exhausted. Those URLs come back
// 'unknown' too, and are NOT written to the cache: caching an error-derived
// unknown would turn a five-minute outage into days of confident-looking "no
// match" on a live phishing page. (Ratified rule, DB33 section 8d.)
//
// A SIBLING FUNCTION, not an overload of dingleberry-hash-lookup. The dispatch
// preferred this and it is right: the two rails share no input validation, no
// provider API, no cache table and no response shape, so overloading would have
// meant one function branching on payload type -- and every deploy of one rail
// would carry the risk of breaking the other. They share a PATTERN, which is
// duplicated deliberately, not a runtime.
//
// verify_jwt is on (repo has no supabase/config.toml, so the platform default
// applies) and verifyAuth re-resolves the JWT to a bee_id for the rate budget.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { activeProvider, activeProviderName } from './providers/index.ts';
import { type NormalizedUrlVerdict, degradedUrlVerdict } from './providers/types.ts';

const MAX_URLS = 50;
const FRESH_DAYS = 7;

// Wall-clock budget for the whole provider phase. URLhaus is one-url-per-request,
// so 50 misses at 5 concurrent could otherwise run past any sane response time.
// What the budget cuts off degrades.
const PROVIDER_BUDGET_MS = 15_000;

interface Body {
  urls?: unknown;
}

interface CacheRow {
  url_sha256: string;
  url: string;
  verdict: 'malicious' | 'unknown';
  threat: string | null;
  tags: string[] | null;
  url_status: string | null;
  provider: string;
  checked_at: string;
}

/**
 * NORMALISATION -- applied before hashing, before the cache lookup, and before
 * the provider call, so all three agree on what "the same URL" means.
 *
 * Scheme and host are lowercased (WHATWG URL does this for us) and the fragment
 * is stripped: a fragment is never sent to the server, so two URLs differing
 * only after '#' are the same request and must share one cache row.
 *
 * The path and query are left EXACTLY as given. They are case-sensitive on most
 * servers, so lowercasing them would both miss feed listings and misreport what
 * was actually checked. Nothing else is rewritten -- no trailing-slash surgery,
 * no query reordering, no percent-decoding: every one of those can change which
 * resource a URL names, and a link checker that silently checks a different link
 * than the one pasted is worse than useless.
 *
 * Returns null for anything that is not a well-formed http/https URL.
 */
function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!u.hostname) return null;
  u.hash = '';
  return u.toString();
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** The client-facing shape. Provider-specific fields never reach it. */
function toClient(v: {
  url: string;
  verdict: string;
  threat: string | null;
  tags: string[] | null;
  url_status: string | null;
  provider: string;
}) {
  return {
    url: v.url,
    verdict: v.verdict,
    threat: v.threat,
    tags: v.tags,
    url_status: v.url_status,
    provider: v.provider,
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!Array.isArray(body.urls)) {
    return errorResponse('urls must be an array of http/https URL strings');
  }

  // Normalise, validate, dedupe. A malformed URL is rejected outright rather
  // than silently dropped -- a check that quietly skipped a link would report
  // "all checked" on an unchecked link, which is the same lie as a false clean.
  const seen = new Set<string>();
  const targets: { url: string; url_sha256: string }[] = [];
  const order: string[] = [];
  for (const rawEntry of body.urls) {
    if (typeof rawEntry !== 'string') {
      return errorResponse('urls must be an array of http/https URL strings');
    }
    const normalized = normalizeUrl(rawEntry);
    if (normalized === null) {
      return errorResponse('each url must be a well-formed http or https URL');
    }
    order.push(normalized);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      targets.push({ url: normalized, url_sha256: await sha256Hex(normalized) });
    }
  }

  if (targets.length === 0) {
    return jsonResponse({ results: [], degraded: false });
  }
  if (targets.length > MAX_URLS) {
    return errorResponse(`at most ${MAX_URLS} urls per call`, 413);
  }

  const sb = serviceClient();
  const providerName = activeProviderName();

  // ---- 1. cache ----------------------------------------------------------
  const freshAfter = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
  const resolved = new Map<string, ReturnType<typeof toClient>>();
  let degraded = false;

  {
    const { data, error } = await sb
      .from('dingleberry_url_verdicts')
      .select('url_sha256, url, verdict, threat, tags, url_status, provider, checked_at')
      .in('url_sha256', targets.map((t) => t.url_sha256))
      .gte('checked_at', freshAfter);

    if (error) {
      // A cache read failure is not fatal -- fall through to the provider for
      // everything. Slower, still correct.
      console.error('[dingleberry-url-lookup] cache read failed:', error.message);
    } else {
      for (const row of (data ?? []) as CacheRow[]) {
        resolved.set(row.url_sha256, toClient(row));
      }
    }
  }

  const misses = targets.filter((t) => !resolved.has(t.url_sha256));

  // ---- 2. budget ---------------------------------------------------------
  // Counts provider-bound URLs only; cache hits are free because they never
  // touch the feed. Partial grants are normal -- the tail degrades.
  let granted = 0;
  if (misses.length > 0) {
    const { data, error } = await sb.rpc('dingleberry_url_rate_check', {
      p_bee_id: auth.userId,
      p_lookups: misses.length,
    });

    if (error) {
      console.error('[dingleberry-url-lookup] rate check failed:', error.message);
      granted = 0;
      degraded = true;
    } else {
      const budget = data as { allowed?: boolean; granted?: number };
      granted = budget.allowed === true ? Number(budget.granted ?? 0) : 0;
      if (granted < misses.length) degraded = true;
    }
  }

  const toQuery = misses.slice(0, Math.max(granted, 0));
  const overBudget = misses.slice(Math.max(granted, 0));

  for (const t of overBudget) {
    resolved.set(
      t.url_sha256,
      toClient(degradedUrlVerdict(t.url, t.url_sha256, providerName, 'rate_budget')),
    );
  }

  // ---- 3. provider -------------------------------------------------------
  let fetched: NormalizedUrlVerdict[] = [];
  if (toQuery.length > 0) {
    const provider = activeProvider();
    if (!provider) {
      console.error(
        `[dingleberry-url-lookup] URL_CHECK_PROVIDER names an unregistered provider: ${providerName}`,
      );
      fetched = toQuery.map((t) =>
        degradedUrlVerdict(t.url, t.url_sha256, providerName, 'provider_unregistered')
      );
    } else if (!provider.configured()) {
      // The documented no-key path. Degrade, do not throw: a missing secret must
      // never surface as "safe" and must never 500 the security page.
      console.error(
        `[dingleberry-url-lookup] provider ${provider.name} is not configured (missing key)`,
      );
      fetched = toQuery.map((t) =>
        degradedUrlVerdict(t.url, t.url_sha256, provider.name, 'provider_unconfigured')
      );
    } else {
      try {
        fetched = await provider.lookup(toQuery, Date.now() + PROVIDER_BUDGET_MS);
      } catch (e) {
        // Belt and braces: UrlProvider.lookup is contracted not to throw.
        console.error('[dingleberry-url-lookup] provider threw:', String(e));
        fetched = toQuery.map((t) =>
          degradedUrlVerdict(t.url, t.url_sha256, provider.name, 'provider_exception')
        );
      }
    }
  }

  for (const v of fetched) {
    if (v.degraded) degraded = true;
    resolved.set(v.url_sha256, toClient(v));
  }

  // ---- 4. cache write ----------------------------------------------------
  // Genuine negatives ARE cached -- a real no_results is a real answer and
  // caching it is what keeps repeat checks cheap. Degraded rows are NOT: see the
  // header note on outage poisoning.
  const cacheable = fetched.filter((v) => !v.degraded);
  if (cacheable.length > 0) {
    const nowIso = new Date().toISOString();
    const { error } = await sb
      .from('dingleberry_url_verdicts')
      .upsert(
        cacheable.map((v) => ({
          url_sha256: v.url_sha256,
          url: v.url,
          verdict: v.verdict,
          provider: v.provider,
          threat: v.threat,
          tags: v.tags,
          url_status: v.url_status,
          provider_first_seen: v.provider_first_seen,
          checked_at: nowIso,
          raw: v.raw,
        })),
        { onConflict: 'url_sha256' },
      );
    if (error) {
      // The verdicts are already correct in `resolved`; a failed cache write
      // costs speed on the next call, not accuracy on this one.
      console.error('[dingleberry-url-lookup] cache write failed:', error.message);
    }
  }

  // Preserve request order (including duplicates) so the client can zip results
  // back onto what it sent. Every url gets a row: an unresolved one degrades
  // rather than going missing, because a dropped entry would silently shift the
  // client's zip by one.
  const byHash = new Map(targets.map((t) => [t.url, t.url_sha256]));
  const results = order.map((u) => {
    const hit = resolved.get(byHash.get(u) ?? '');
    if (hit) return hit;
    degraded = true;
    return toClient(degradedUrlVerdict(u, '', providerName, 'unresolved'));
  });

  return jsonResponse({ results, degraded });
});
