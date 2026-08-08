// POST /functions/v1/dingleberry-hash-lookup
//
// DB33 -- HASH LOOKUP RAIL. Turns the device Security page's structural file
// check into a real malware verdict.
//
// The browser hashes files locally (SHA-256 via crypto.subtle -- the bytes
// never leave the device) and posts only hashes here. This function resolves
// each hash against the cache, then against the active malware feed, and
// returns a NORMALIZED verdict the frontend can render without knowing which
// feed answered.
//
//   Request:  { "hashes": ["<64 hex>", ...] }        max 100 per call
//   Response: {
//               "results": [
//                 { sha256, verdict, malware_family, signature, provider }
//               ],
//               "degraded": boolean
//             }
//
// TWO VALUES, NOT THREE. verdict is 'malicious' or 'unknown'. There is no
// 'clean'. A hash the corpus has never seen is UNKNOWN -- the frontend must
// word it "no known-malware match", never "clean" or "safe". Absence of
// evidence is not evidence of absence, and on a security surface a confident
// false "clean" is worse than saying nothing.
//
// degraded:true means at least one hash could not be resolved -- provider
// timeout, rate limit, missing key, budget exhausted. Those hashes come back
// 'unknown' too, and are NOT written to the cache: caching an error-derived
// unknown would turn a five-minute outage into seven days of confident-looking
// "no match" on real malware.
//
// verify_jwt is on (repo has no supabase/config.toml, so the platform default
// applies) and verifyAuth re-resolves the JWT to a bee_id for the rate budget.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { activeProvider, activeProviderName } from './providers/index.ts';
import { type NormalizedVerdict, degradedVerdict } from './providers/types.ts';

const SHA256_RE = /^[a-f0-9]{64}$/;
const MAX_HASHES = 100;
const FRESH_DAYS = 7;

// Wall-clock budget for the whole provider phase. MalwareBazaar's get_info is
// one-hash-per-request, so 100 misses at 5 concurrent could otherwise run well
// past any sane response time. What the budget cuts off degrades.
const PROVIDER_BUDGET_MS = 20_000;

interface Body {
  hashes?: unknown;
}

interface CacheRow {
  sha256: string;
  verdict: 'malicious' | 'unknown';
  malware_family: string | null;
  signature: string | null;
  provider: string;
  checked_at: string;
}

/** The client-facing shape. Provider-specific fields never reach it. */
function toClient(v: {
  sha256: string;
  verdict: string;
  malware_family: string | null;
  signature: string | null;
  provider: string;
}) {
  return {
    sha256: v.sha256,
    verdict: v.verdict,
    malware_family: v.malware_family,
    signature: v.signature,
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

  if (!Array.isArray(body.hashes)) {
    return errorResponse('hashes must be an array of sha256 strings');
  }

  // Normalise, validate, dedupe. A malformed hash is a client bug and is
  // rejected outright rather than silently dropped -- a scan that quietly
  // skipped a file would report "all checked" on an unchecked file.
  const seen = new Set<string>();
  const hashes: string[] = [];
  for (const raw of body.hashes) {
    if (typeof raw !== 'string') {
      return errorResponse('hashes must be an array of sha256 strings');
    }
    const h = raw.trim().toLowerCase();
    if (!SHA256_RE.test(h)) {
      return errorResponse('each hash must be 64 lowercase hex characters');
    }
    if (!seen.has(h)) {
      seen.add(h);
      hashes.push(h);
    }
  }

  if (hashes.length === 0) {
    return jsonResponse({ results: [], degraded: false });
  }
  if (hashes.length > MAX_HASHES) {
    return errorResponse(`at most ${MAX_HASHES} hashes per call`, 413);
  }

  const sb = serviceClient();
  const providerName = activeProviderName();

  // ---- 1. cache ----------------------------------------------------------
  const freshAfter = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
  const resolved = new Map<string, ReturnType<typeof toClient>>();
  let degraded = false;

  {
    const { data, error } = await sb
      .from('dingleberry_hash_verdicts')
      .select('sha256, verdict, malware_family, signature, provider, checked_at')
      .in('sha256', hashes)
      .gte('checked_at', freshAfter);

    if (error) {
      // A cache read failure is not fatal -- fall through to the provider for
      // everything. Slower, still correct.
      console.error('[dingleberry-hash-lookup] cache read failed:', error.message);
    } else {
      for (const row of (data ?? []) as CacheRow[]) {
        resolved.set(row.sha256, toClient(row));
      }
    }
  }

  const misses = hashes.filter((h) => !resolved.has(h));

  // ---- 2. budget ---------------------------------------------------------
  // Counts provider-bound hashes only; cache hits are free because they never
  // touch the feed. Partial grants are normal -- the tail degrades.
  let granted = 0;
  if (misses.length > 0) {
    const { data, error } = await sb.rpc('dingleberry_hash_rate_check', {
      p_bee_id: auth.userId,
      p_lookups: misses.length,
    });

    if (error) {
      console.error('[dingleberry-hash-lookup] rate check failed:', error.message);
      granted = 0;
      degraded = true;
    } else {
      const verdictBudget = data as { allowed?: boolean; granted?: number };
      granted = verdictBudget.allowed === true
        ? Number(verdictBudget.granted ?? 0)
        : 0;
      if (granted < misses.length) degraded = true;
    }
  }

  const toQuery = misses.slice(0, Math.max(granted, 0));
  const overBudget = misses.slice(Math.max(granted, 0));

  for (const h of overBudget) {
    resolved.set(h, toClient(degradedVerdict(h, providerName, 'rate_budget')));
  }

  // ---- 3. provider -------------------------------------------------------
  let fetched: NormalizedVerdict[] = [];
  if (toQuery.length > 0) {
    const provider = activeProvider();
    if (!provider) {
      console.error(
        `[dingleberry-hash-lookup] MALWARE_HASH_PROVIDER names an unregistered provider: ${providerName}`,
      );
      fetched = toQuery.map((h) =>
        degradedVerdict(h, providerName, 'provider_unregistered')
      );
    } else if (!provider.configured()) {
      // The documented no-key path. Degrade, do not throw: a missing secret
      // must never surface as "clean" and must never 500 the security page.
      console.error(
        `[dingleberry-hash-lookup] provider ${provider.name} is not configured (missing key)`,
      );
      fetched = toQuery.map((h) =>
        degradedVerdict(h, provider.name, 'provider_unconfigured')
      );
    } else {
      try {
        fetched = await provider.lookup(toQuery, Date.now() + PROVIDER_BUDGET_MS);
      } catch (e) {
        // Belt and braces: HashProvider.lookup is contracted not to throw.
        console.error('[dingleberry-hash-lookup] provider threw:', String(e));
        fetched = toQuery.map((h) =>
          degradedVerdict(h, provider.name, 'provider_exception')
        );
      }
    }
  }

  for (const v of fetched) {
    if (v.degraded) degraded = true;
    resolved.set(v.sha256, toClient(v));
  }

  // ---- 4. cache write ----------------------------------------------------
  // Negatives ARE cached -- a genuine hash_not_found is a real answer and
  // caching it is what keeps repeat scans cheap. Degraded rows are NOT: see
  // the header note on outage poisoning.
  const cacheable = fetched.filter((v) => !v.degraded);
  if (cacheable.length > 0) {
    const nowIso = new Date().toISOString();
    const { error } = await sb
      .from('dingleberry_hash_verdicts')
      .upsert(
        cacheable.map((v) => ({
          sha256: v.sha256,
          verdict: v.verdict,
          provider: v.provider,
          malware_family: v.malware_family,
          signature: v.signature,
          file_type: v.file_type,
          provider_first_seen: v.provider_first_seen,
          checked_at: nowIso,
          raw: v.raw,
        })),
        { onConflict: 'sha256' },
      );
    if (error) {
      // The verdicts are already correct in `resolved`; a failed cache write
      // costs speed on the next call, not accuracy on this one.
      console.error('[dingleberry-hash-lookup] cache write failed:', error.message);
    }
  }

  // Preserve request order so the client can zip results back onto its files.
  // Every hash gets a row: an unresolved one degrades rather than going missing,
  // because a dropped entry would silently shift the client's zip by one.
  const results = hashes.map((h) => {
    const hit = resolved.get(h);
    if (hit) return hit;
    degraded = true;
    return toClient(degradedVerdict(h, providerName, 'unresolved'));
  });

  return jsonResponse({ results, degraded });
});
