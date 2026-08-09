/**
 * FRONT30 -- link checking against DB38's `dingleberry-url-lookup` rail.
 *
 * Sibling of malwareHash.ts, same discipline, different input. The Bee pastes a
 * link; the rail answers from a feed of URLs seen distributing malware.
 *
 * TWO VERDICTS, NEVER THREE. 'malicious' or 'unknown'. There is no 'clean' and
 * no 'safe'. A blocklist certifies nothing as good -- the overwhelming majority
 * of the honest web is simply absent from it, and so is most brand-new phishing.
 * The UI must word 'unknown' as "not on the known-bad list", never "safe",
 * never a green tick. On a phishing check a confident false clean is the worst
 * failure this feature can have.
 *
 * DEGRADED IS NOT A VERDICT. If the rail could not reach the feed the caller
 * gets degraded:true and must say so rather than rendering a no-match.
 */

import { supabase } from '@/lib/supabase';

export type UrlVerdictValue = 'malicious' | 'unknown';

export interface UrlVerdict {
  url: string;
  verdict: UrlVerdictValue;
  threat: string | null;
  tags: string[] | null;
  url_status: string | null;
  provider: string;
}

export interface UrlLookupOutcome {
  results: UrlVerdict[];
  /** TRUE when the lookup could not reach a conclusion. NOT a no-match. */
  degraded: boolean;
}

/**
 * Client-side shape check, mirroring the rail's own rule: http/https only, and
 * a hostname is required. Done here so an obvious typo is caught without a
 * round-trip -- the rail validates again and is the authority.
 */
export function looksLikeUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Accept what a person actually pastes. A bare `example.com/login` has no
 * scheme; assume https rather than rejecting it, and return the exact string
 * that will be checked so the UI can show what it really looked at.
 */
export function coerceUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (looksLikeUrl(s)) return new URL(s).toString();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null; // some other scheme - refuse
  const withScheme = `https://${s}`;
  return looksLikeUrl(withScheme) ? new URL(withScheme).toString() : null;
}

interface RailResponse {
  results?: unknown;
  degraded?: unknown;
}

function isUrlVerdictRow(v: unknown): v is UrlVerdict {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.url === 'string' && (r.verdict === 'malicious' || r.verdict === 'unknown');
}

/**
 * Check links against the rail.
 *
 * FAILS DEGRADED, NEVER CLEAN. Every error path -- no client, not signed in,
 * network down, malformed response -- sets degraded:true and yields no
 * verdicts, so the caller can never mistake a failure for a no-match.
 */
export async function lookupUrls(urls: string[]): Promise<UrlLookupOutcome> {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return { results: [], degraded: false };
  if (!supabase) return { results: [], degraded: true };

  try {
    const { data, error } = await supabase.functions.invoke<RailResponse>(
      'dingleberry-url-lookup',
      { body: { urls: unique } },
    );

    if (error || !data || !Array.isArray(data.results)) {
      return { results: [], degraded: true };
    }

    const results = data.results.filter(isUrlVerdictRow);
    // A URL we sent but got no row back for is unresolved, not unlisted.
    const degraded = data.degraded === true || results.length < unique.length;
    return { results, degraded };
  } catch {
    return { results: [], degraded: true };
  }
}

/** The one place a malicious link verdict becomes user-facing words. */
export function urlFindingTitle(v: UrlVerdict): string {
  return v.threat ? `Known malicious link: ${v.threat}` : 'Known malicious link';
}

export function urlFindingDetail(v: UrlVerdict): string {
  const tags = v.tags?.length ? ` Tagged: ${v.tags.join(', ')}.` : '';
  const status =
    v.url_status === 'online'
      ? ' The feed currently lists it as ONLINE and still serving.'
      : v.url_status === 'offline'
        ? ' The feed lists it as offline, but the link was hostile when it was seen.'
        : '';
  const advice =
    'Do not open it, and do not enter anything into it. If someone sent it to you, treat the message as hostile too.';
  return `This link is listed in a feed of addresses seen distributing malware.${tags}${status} ${advice}`;
}
