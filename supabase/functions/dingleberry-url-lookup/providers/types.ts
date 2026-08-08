// DB38 -- THE SWAP SEAM for the URL rail.
//
// Same discipline as DB33's hash seam: this file is the entire contract between
// the url-lookup rail and whatever link feed happens to be behind it. Everything
// downstream -- the cache table, the edge function response, the Security page --
// is written against NormalizedUrlVerdict and has never heard of URLhaus.
//
// ADDING A PROVIDER: write one new providers/<name>.ts implementing UrlProvider,
// register it in providers/index.ts, set URL_CHECK_PROVIDER to its name. NOTHING
// ELSE CHANGES -- no migration, no frontend edit, no change to this file. If a
// new provider cannot be added that way, the seam has been broken and the break
// is the bug.

export type Verdict = 'malicious' | 'unknown';

export interface NormalizedUrlVerdict {
  /** The NORMALISED url that was looked up. */
  url: string;
  /** sha256 of `url`. The cache primary key. */
  url_sha256: string;
  verdict: Verdict;
  /** Feed's threat class, e.g. 'malware_download'. Null when not listed. */
  threat: string | null;
  /** Feed's tags, e.g. ['emotet','doc']. Null when not listed. */
  tags: string[] | null;
  /** Feed liveness for a LISTED url: 'online' | 'offline' | provider value. */
  url_status: string | null;
  /** ISO-8601, or null. When the feed first listed this url. */
  provider_first_seen: string | null;
  /** Feed that produced the verdict. Recorded on the cache row. */
  provider: string;
  /**
   * TRUE means "we could not reach a conclusion" -- timeout, rate limit, bad
   * key, malformed response. It does NOT mean the link is safe.
   *
   * A degraded row is reported to the caller as verdict 'unknown' and is NEVER
   * written to the cache. Caching an error-derived unknown would poison the URL
   * for the whole freshness window: a five-minute provider outage would become
   * days of confident-looking "no match" on a live phishing page.
   */
  degraded: boolean;
  /** Trimmed, allow-listed provider payload. Never the raw response whole. */
  raw: Record<string, unknown>;
}

export interface UrlProvider {
  /** Stable identifier. Written to dingleberry_url_verdicts.provider. */
  readonly name: string;

  /** False when the provider's credentials or config are absent. */
  configured(): boolean;

  /**
   * Resolve normalised URLs to verdicts. MUST return exactly one entry per input
   * url, in any order, and MUST NOT throw -- every failure mode is expressed as
   * a degraded entry. A dead feed degrades the check; it never breaks it.
   *
   * @param urls      normalised http/https URLs, already validated and deduped,
   *                  each paired with the sha256 the cache is keyed on.
   * @param deadline  epoch ms after which the provider should stop starting new
   *                  requests and degrade whatever is left.
   */
  lookup(
    urls: { url: string; url_sha256: string }[],
    deadline: number,
  ): Promise<NormalizedUrlVerdict[]>;
}

/** The one way to build a "we don't know" answer. Never cached. */
export function degradedUrlVerdict(
  url: string,
  url_sha256: string,
  provider: string,
  reason: string,
): NormalizedUrlVerdict {
  return {
    url,
    url_sha256,
    verdict: 'unknown',
    threat: null,
    tags: null,
    url_status: null,
    provider_first_seen: null,
    provider,
    degraded: true,
    raw: { degraded_reason: reason },
  };
}
