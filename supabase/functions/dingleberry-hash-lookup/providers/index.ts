// DB33 -- provider registry and selection.
//
// THIS IS THE ONLY PLACE THE ACTIVE FEED IS NAMED.
//
// Swapping MalwareBazaar for VirusTotal, Hybrid Analysis, an internal corpus,
// or two of them behind a merging wrapper is:
//   1. write providers/<name>.ts implementing HashProvider (see types.ts)
//   2. add one line to REGISTRY below
//   3. set the MALWARE_HASH_PROVIDER secret to <name>
// NOTHING ELSE CHANGES. No migration, no edge-function edit outside this
// folder, no frontend change -- the Security page only ever sees the
// normalized verdict shape and does not know which feed answered.

import type { HashProvider } from './types.ts';
import { malwarebazaar } from './malwarebazaar.ts';

const REGISTRY: Record<string, HashProvider> = {
  [malwarebazaar.name]: malwarebazaar,
};

const DEFAULT_PROVIDER = malwarebazaar.name;

/**
 * The configured provider, or null when the operator has named one that is not
 * registered. Null rather than throw: an operator typo in an env var must
 * degrade the scan to 'unknown', not 500 the security page.
 */
export function activeProvider(): HashProvider | null {
  const name = (Deno.env.get('MALWARE_HASH_PROVIDER') ?? DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();
  return REGISTRY[name] ?? null;
}

export function activeProviderName(): string {
  return (Deno.env.get('MALWARE_HASH_PROVIDER') ?? DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();
}
