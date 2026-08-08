// DB38 -- URLhaus (abuse.ch) provider.
//
// API: POST https://urlhaus-api.abuse.ch/v1/url/
//      form body  url=<normalised url>
//      header     Auth-Key: <abuse.ch account key>
//
// THE KEY. abuse.ch has required an Auth-Key on EVERY service since
// 2025-06-30, and their documentation states a personal Auth-Key "can be used to
// query any abuse.ch APIs". URLhaus and MalwareBazaar are both abuse.ch, so the
// key DB33 already provisioned covers this rail -- no new secret is required.
//
// Read from ABUSECH_AUTH_KEY first, falling back to DB33's MALWARE_HASH_API_KEY.
// The fallback is what makes this work TODAY with the secret that is already set;
// the primary name exists because MALWARE_HASH_API_KEY is a misnomer for an
// account-wide credential, and an operator should be able to rename it without a
// code change. Set ABUSECH_AUTH_KEY and the fallback stops mattering.
//
// The key is read here and nowhere else, and is never logged, never returned,
// and never written to a row.
//
// URLhaus takes ONE url per request -- there is no bulk form. So this module fans
// out, bounded on three axes so a large paste cannot hammer a free community
// feed: CONCURRENCY at a time, PER_REQUEST_TIMEOUT_MS each, and a hard wall-clock
// deadline handed down by the caller. Whatever the deadline cuts off comes back
// degraded, not clean.
//
// WHAT A LISTING MEANS. URLhaus lists URLs observed distributing malware. It is
// an allegation-of-bad feed, not a certification-of-good one: absence means only
// "not listed here", which is why no_results maps to 'unknown' and never to
// 'clean'. A listing whose url_status is 'offline' is still a listing -- the
// verdict stays 'malicious' and url_status is reported alongside it as a
// qualifier. Hosts come back.

import {
  type NormalizedUrlVerdict,
  type UrlProvider,
  degradedUrlVerdict,
} from './types.ts';

const NAME = 'urlhaus';
const URLHAUS_URL = 'https://urlhaus-api.abuse.ch/v1/url/';
const PER_REQUEST_TIMEOUT_MS = 5000;
const CONCURRENCY = 5;

// Allow-listed fields copied into dingleberry_url_verdicts.raw. The response is
// deliberately NOT stored whole: URLhaus entries carry a `payloads` array with
// sample file names and hashes, and `reporter` handles. Add to this list only
// after checking the new field the same way.
const RAW_FIELDS = [
  'id',
  'url_status',
  'threat',
  'tags',
  'date_added',
  'last_online',
  'urlhaus_reference',
  'blacklists',
] as const;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function strArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  return out.length > 0 ? out : null;
}

// URLhaus timestamps look like "2024-05-01 09:12:33 UTC".
function toIso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const cleaned = s.replace(/\s+UTC$/i, '').replace(' ', 'T');
  const d = new Date(cleaned.endsWith('Z') ? cleaned : `${cleaned}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function trimRaw(entry: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of RAW_FIELDS) {
    if (entry[k] !== undefined && entry[k] !== null) out[k] = entry[k];
  }
  return out;
}

function readKey(): string {
  return (
    Deno.env.get('ABUSECH_AUTH_KEY') ??
    Deno.env.get('MALWARE_HASH_API_KEY') ??
    ''
  ).trim();
}

async function lookupOne(
  target: { url: string; url_sha256: string },
  key: string,
): Promise<NormalizedUrlVerdict> {
  const { url, url_sha256 } = target;

  let res: Response;
  try {
    res = await fetch(URLHAUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Auth-Key': key,
      },
      body: new URLSearchParams({ url }),
      signal: AbortSignal.timeout(PER_REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    const reason = e instanceof DOMException && e.name === 'TimeoutError'
      ? 'timeout'
      : 'network_error';
    return degradedUrlVerdict(url, url_sha256, NAME, reason);
  }

  if (res.status === 429) {
    await res.text().catch(() => undefined);
    return degradedUrlVerdict(url, url_sha256, NAME, 'rate_limited');
  }
  if (!res.ok) {
    await res.text().catch(() => undefined);
    return degradedUrlVerdict(url, url_sha256, NAME, `http_${res.status}`);
  }

  let body: Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    return degradedUrlVerdict(url, url_sha256, NAME, 'bad_json');
  }

  const status = str(body.query_status) ?? 'missing_query_status';

  if (status === 'ok') {
    // A listing. URLhaus returns the entry fields at the top level for /url/.
    return {
      url,
      url_sha256,
      verdict: 'malicious',
      threat: str(body.threat),
      tags: strArray(body.tags),
      url_status: str(body.url_status),
      provider_first_seen: toIso(body.date_added),
      provider: NAME,
      degraded: false,
      raw: { query_status: status, ...trimRaw(body) },
    };
  }

  // A genuine miss. This is a real answer and it IS cacheable -- but it is
  // 'unknown', not 'clean'. URLhaus has never listed this URL; that is all it
  // means, and most of the honest web is in exactly this state.
  if (status === 'no_results') {
    return {
      url,
      url_sha256,
      verdict: 'unknown',
      threat: null,
      tags: null,
      url_status: null,
      provider_first_seen: null,
      provider: NAME,
      degraded: false,
      raw: { query_status: status },
    };
  }

  // Everything else -- invalid_url, http_post_expected, an auth failure, an
  // unrecognised status -- is our fault or the feed's, not a verdict.
  return degradedUrlVerdict(url, url_sha256, NAME, `query_status_${status}`);
}

export const urlhaus: UrlProvider = {
  name: NAME,

  configured(): boolean {
    return readKey().length > 0;
  },

  async lookup(
    urls: { url: string; url_sha256: string }[],
    deadline: number,
  ): Promise<NormalizedUrlVerdict[]> {
    const key = readKey();
    if (!key) {
      return urls.map((u) =>
        degradedUrlVerdict(u.url, u.url_sha256, NAME, 'provider_unconfigured')
      );
    }

    const out: NormalizedUrlVerdict[] = new Array(urls.length);
    let next = 0;

    const worker = async () => {
      for (;;) {
        const i = next++;
        if (i >= urls.length) return;
        if (Date.now() >= deadline) {
          out[i] = degradedUrlVerdict(
            urls[i].url,
            urls[i].url_sha256,
            NAME,
            'deadline_exceeded',
          );
          continue;
        }
        out[i] = await lookupOne(urls[i], key);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker),
    );

    return out;
  },
};
