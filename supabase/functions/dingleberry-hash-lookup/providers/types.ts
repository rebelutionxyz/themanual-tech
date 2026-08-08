// DB33 -- THE SWAP SEAM.
//
// This file is the entire contract between the hash-lookup rail and whatever
// malware feed happens to be behind it. Everything downstream -- the cache
// table, the edge function response, the Security page -- is written against
// NormalizedVerdict and has never heard of MalwareBazaar.
//
// ADDING A PROVIDER: write one new providers/<name>.ts implementing
// HashProvider, register it in providers/index.ts, set MALWARE_HASH_PROVIDER
// to its name. NOTHING ELSE CHANGES -- no migration, no frontend edit, no
// change to this file. If a new provider cannot be added that way, the seam
// has been broken and the break is the bug.

export type Verdict = 'malicious' | 'unknown';

export interface NormalizedVerdict {
  sha256: string;
  verdict: Verdict;
  malware_family: string | null;
  signature: string | null;
  file_type: string | null;
  /** ISO-8601, or null. When the feed first saw this sample. */
  provider_first_seen: string | null;
  /** Feed that produced the verdict. Recorded on the cache row. */
  provider: string;
  /**
   * TRUE means "we could not reach a conclusion" -- timeout, rate limit, bad
   * key, malformed response. It does NOT mean the hash is safe.
   *
   * A degraded row is reported to the caller as verdict 'unknown' and is NEVER
   * written to the cache. Caching an error-derived unknown would poison the
   * hash for the whole freshness window: a five-minute provider outage would
   * become seven days of confident-looking "no match" on real malware.
   */
  degraded: boolean;
  /** Trimmed, allow-listed provider payload. Never the raw response whole. */
  raw: Record<string, unknown>;
}

export interface HashProvider {
  /** Stable identifier. Written to dingleberry_hash_verdicts.provider. */
  readonly name: string;

  /** False when the provider's credentials or config are absent. */
  configured(): boolean;

  /**
   * Resolve hashes to verdicts. MUST return exactly one entry per input hash,
   * in any order, and MUST NOT throw -- every failure mode is expressed as a
   * degraded entry. A dead feed degrades the scan; it never breaks it.
   *
   * @param hashes    lowercase 64-hex SHA-256, already validated and deduped.
   * @param deadline  epoch ms after which the provider should stop starting new
   *                  requests and degrade whatever is left. Bulk providers may
   *                  ignore it; fan-out providers must honour it.
   */
  lookup(hashes: string[], deadline: number): Promise<NormalizedVerdict[]>;
}

/** The one way to build a "we don't know" answer. Never cached. */
export function degradedVerdict(
  sha256: string,
  provider: string,
  reason: string,
): NormalizedVerdict {
  return {
    sha256,
    verdict: 'unknown',
    malware_family: null,
    signature: null,
    file_type: null,
    provider_first_seen: null,
    provider,
    degraded: true,
    raw: { degraded_reason: reason },
  };
}
