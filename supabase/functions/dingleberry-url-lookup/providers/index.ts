// DB38 -- provider registry and selection for the URL rail.
//
// THIS IS THE ONLY PLACE THE ACTIVE FEED IS NAMED.
//
// Swapping URLhaus for PhishTank, Google Safe Browsing, an internal blocklist,
// or two of them behind a merging wrapper is:
//   1. write providers/<name>.ts implementing UrlProvider (see types.ts)
//   2. add one line to REGISTRY below
//   3. set the URL_CHECK_PROVIDER secret to <name>
// NOTHING ELSE CHANGES. No migration, no edge-function edit outside this folder,
// no frontend change -- the Security page only ever sees the normalized verdict
// shape and does not know which feed answered.

import type { UrlProvider } from './types.ts';
import { urlhaus } from './urlhaus.ts';

const REGISTRY: Record<string, UrlProvider> = {
  [urlhaus.name]: urlhaus,
};

const DEFAULT_PROVIDER = urlhaus.name;

/**
 * The configured provider, or null when the operator has named one that is not
 * registered. Null rather than throw: an operator typo in an env var must
 * degrade the check to 'unknown', not 500 the security page.
 */
export function activeProvider(): UrlProvider | null {
  const name = (Deno.env.get('URL_CHECK_PROVIDER') ?? DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();
  return REGISTRY[name] ?? null;
}

export function activeProviderName(): string {
  return (Deno.env.get('URL_CHECK_PROVIDER') ?? DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();
}
