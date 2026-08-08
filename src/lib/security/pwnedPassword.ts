/**
 * Leaked-password protection (FRONT25).
 *
 * Supabase ships this as `auth_leaked_password_protection`, but that toggle is
 * Pro-and-above and the HONEYCOMB org is on the free plan. This is the same
 * check done client-side, before the password is ever handed to Supabase.
 *
 * Method: k-anonymity against HaveIBeenPwned's Pwned Passwords range API. The
 * password is SHA-1'd locally and ONLY the first 5 hex characters of the digest
 * leave the device. The API answers with every suffix sharing that prefix
 * (~500-1000 lines) and the match happens here. The password, the full hash,
 * the email, and every other identifier stay local.
 *
 * HONEST LIMIT: this is client-side, so a caller hitting the Supabase auth API
 * directly bypasses it. That is acceptable — the threat model is stopping a Bee
 * from reusing a password that is already in a breach corpus, not stopping an
 * attacker who deliberately picks a bad password for their own account. This is
 * NOT equivalent to the server-side Pro feature; do not describe it as such.
 */

const RANGE_API = 'https://api.pwnedpasswords.com/range';
const TIMEOUT_MS = 3000;

export interface PwnedResult {
  /** true only on a confirmed corpus hit. Any failure returns false. */
  pwned: boolean;
  /** How many times the password appears in the corpus. 0 when not found. */
  count: number;
}

const SAFE: PwnedResult = { pwned: false, count: 0 };

/** Shared copy so the auth layer and any future form show the same message. */
export const PWNED_PASSWORD_MESSAGE =
  'This password has appeared in a known data breach. Please choose a different one.';

async function sha1Hex(password: string): Promise<string | null> {
  // crypto.subtle only exists in a secure context (https / localhost). If it is
  // missing there is no way to hash locally, and sending the password itself is
  // never an option — so we decline to check rather than degrade the privacy.
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const bytes = new TextEncoder().encode(password);
  const digest = await subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Check a candidate password against the breach corpus.
 *
 * FAILS OPEN: network error, timeout, non-200, or no WebCrypto all resolve to
 * `{ pwned: false, count: 0 }`. A breach-list outage must never lock a Bee out
 * of registering, so a failure is logged quietly and never surfaced.
 */
export async function isPwnedPassword(password: string): Promise<PwnedResult> {
  if (!password) return SAFE;

  try {
    const hash = await sha1Hex(password);
    if (!hash) return SAFE;

    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let body: string;
    try {
      const res = await fetch(`${RANGE_API}/${prefix}`, {
        signal: controller.signal,
        // No credentials, no referrer — the prefix is the entire payload.
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!res.ok) return SAFE;
      body = await res.text();
    } finally {
      clearTimeout(timer);
    }

    for (const line of body.split('\n')) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      if (line.slice(0, sep).trim().toUpperCase() !== suffix) continue;
      const count = Number.parseInt(line.slice(sep + 1).trim(), 10);
      return { pwned: true, count: Number.isFinite(count) ? count : 0 };
    }

    return SAFE;
  } catch (err) {
    // Quiet by design — see FAILS OPEN above.
    console.warn('[pwnedPassword] check unavailable, allowing password', err);
    return SAFE;
  }
}
