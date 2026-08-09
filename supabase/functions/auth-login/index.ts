// POST /functions/v1/auth-login
//
// DB39 -- SIGN IN WITH USERNAME. The resolver half of the handle system that was
// never built.
//
// The handle system is universal and complete -- every account carries one, and
// bee_handle_check / _available / _suggest / _set are live. What did not exist was
// AUTHENTICATION by handle: no resolver, no auth edge function, and a login page
// that takes email + password only. This closes that.
//
//   Request:  { "identifier": "butch" | "bee@example.com", "password": "..." }
//   Response: 200 { access_token, refresh_token, token_type, expires_in,
//                   expires_at, user: { id } }
//             401 { error: "Invalid credentials" }        <- ALWAYS this, see below
//             429 { error: "Too many attempts", retry_after_seconds }
//
// ============================================================================
// WHY THIS IS AN EDGE FUNCTION AND NOT AN RPC
// ============================================================================
// The obvious version -- an anon-callable RPC taking a handle and returning the
// account's email -- is an email-harvesting endpoint. Handles are public by
// design (bee_handle_available tells anyone which ones exist), so an attacker
// walks the handle space and collects addresses. THE EMAIL MUST NEVER REACH THE
// CLIENT. It is resolved server-side with the service role, used for
// signInWithPassword, and discarded. It appears in no response, no error, and no
// log line.
//
// (One honest caveat: on SUCCESS the client receives a JWT, and a Supabase access
// token carries the account's own email as a claim. That is the caller's own
// address after proving the password -- it is not harvesting. The pre-auth
// surface, which is the one that matters, never returns an address.)
//
// ============================================================================
// UNIFORM FAILURE
// ============================================================================
// Unknown handle, known handle with a wrong password, malformed handle, and a
// wrong email all return byte-identical 401 bodies. Nothing in the response,
// status code, or headers distinguishes "no such account" from "wrong password".
//
// Timing is equalised as far as is practical rather than perfectly: every failure
// path is padded to MIN_FAIL_MS before responding, and the handle-miss path still
// calls signInWithPassword against a sentinel address so the auth round-trip
// happens either way. This narrows the oracle; it does not mathematically close
// it. Measured deltas are in REPORT.md rather than claimed as constant-time.
//
// ============================================================================
// EXACT HANDLE MATCH, NEVER THE SKELETON
// ============================================================================
// bees carries a UNIQUE index on bee_handle_skeleton(handle), which folds
// confusables (0/o, 1/i, digits to letters, underscores away) to stop
// impersonation at signup. Resolution here matches the handle COLUMN exactly,
// lowercased and trimmed the way bee_handle_check normalises. Matching on the
// skeleton would let "butch0i" sign in as "butchoi" -- the anti-impersonation
// index would become an impersonation vector.
//
// verify_jwt is FALSE for this function -- its callers are signed out by
// definition. Deployed with --no-verify-jwt.

import { corsHeaders, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Mirrors bee_handle_check: lower(btrim(...)), 3-20 chars, ^[a-z0-9_]+$.
// Underscore-placement and reserved-word rules are signup concerns, not login
// ones -- a handle that exists satisfied them already, and re-checking here would
// only add a way for the response to differ.
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

const MAX_IDENTIFIER_LEN = 320; // RFC 5321 max email length
const MAX_PASSWORD_LEN = 200;

// Rate caps, both over a 15-minute rolling window (see the migration header).
// A human mistyping a password needs a handful of tries; 10 is generous for that
// and useless for a dictionary. The IP cap sits higher so an office or household
// behind one NATed address does not lock itself out on a few fumbles.
const IDENTIFIER_CAP = 10;
const IP_CAP = 30;
const WINDOW_MINUTES = 15;

const MIN_FAIL_MS = 400;

// Every rejection returns exactly this. One object, one construction site.
const GENERIC_ERROR = 'Invalid credentials';

interface Body {
  identifier?: unknown;
  password?: unknown;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** First hop of x-forwarded-for, which is the real client on Supabase's edge. */
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  const startedAt = Date.now();

  const cors = handleCors(req);
  if (cors) return cors;

  // Pad every failure to the same floor before it goes out.
  const fail = async (): Promise<Response> => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_FAIL_MS) await sleep(MIN_FAIL_MS - elapsed);
    return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return await fail();
  }

  const rawIdentifier = typeof body.identifier === 'string' ? body.identifier : '';
  const password = typeof body.password === 'string' ? body.password : '';

  // Shape problems fail like bad credentials, not like validation errors: a
  // distinct 400 here would be a probe telling an attacker their input parsed.
  if (
    rawIdentifier.length === 0 || rawIdentifier.length > MAX_IDENTIFIER_LEN ||
    password.length === 0 || password.length > MAX_PASSWORD_LEN
  ) {
    return await fail();
  }

  const identifier = rawIdentifier.trim().toLowerCase();
  const sb = serviceClient();

  // ---- 1. rate limit -------------------------------------------------------
  // IP first, then identifier. Both count the attempt before judging it, so a
  // caller cannot idle at exactly the cap forever.
  const [ipKey, identifierKey] = await Promise.all([
    sha256Hex('ip:' + clientIp(req)),
    sha256Hex('id:' + identifier),
  ]);

  for (const [scope, key, cap] of [
    ['ip', ipKey, IP_CAP],
    ['identifier', identifierKey, IDENTIFIER_CAP],
  ] as const) {
    const { data, error } = await sb.rpc('auth_login_rate_check', {
      p_scope: scope,
      p_key: key,
      p_cap: cap,
      p_window_minutes: WINDOW_MINUTES,
    });

    if (error) {
      // FAIL CLOSED. A rate limiter that errors open on an unauthenticated
      // login endpoint is worse than no rate limiter, because it is the exact
      // state a determined attacker will try to induce.
      console.error(`[auth-login] rate check failed (${scope}):`, error.message);
      return await fail();
    }

    const verdict = data as { allowed?: boolean; retry_after_seconds?: number };
    if (verdict.allowed !== true) {
      return jsonResponse({
        error: 'Too many attempts',
        retry_after_seconds: Number(verdict.retry_after_seconds ?? 60),
      }, 429);
    }
  }

  // ---- 2. resolve to an email, server-side only ----------------------------
  // A sentinel that cannot exist: the .invalid TLD is reserved by RFC 2606, so
  // this can never collide with a real account. Used so the miss path still pays
  // for an auth round-trip.
  let email = 'no-such-bee@handle-miss.invalid';
  let resolved = false;

  if (identifier.includes('@')) {
    email = identifier;
    resolved = true;
  } else if (HANDLE_RE.test(identifier)) {
    const { data, error } = await sb
      .from('bees')
      .select('email')
      .eq('handle', identifier)
      .maybeSingle();

    if (error) {
      console.error('[auth-login] handle resolve failed:', error.message);
      return await fail();
    }
    const row = data as { email?: string | null } | null;
    if (row?.email) {
      email = row.email;
      resolved = true;
    }
  }
  // A handle failing HANDLE_RE falls through with resolved=false and the
  // sentinel email -- same path, same timing, same response as a real miss.

  // ---- 3. authenticate -----------------------------------------------------
  // A throwaway anon client: signInWithPassword on the shared service client
  // would mutate its auth state, and this function is long-lived across requests.
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('[auth-login] SUPABASE_URL or SUPABASE_ANON_KEY missing');
    return await fail();
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signIn, error: signInError } = await authClient.auth
    .signInWithPassword({ email, password });

  if (signInError || !signIn?.session) {
    // Logged WITHOUT the identifier: scope plus a 12-char prefix of its sha256,
    // which is enough to correlate repeated attempts in the logs and not enough
    // to recover the handle or address.
    console.error(
      `[auth-login] auth failed (resolved=${resolved}, id_hash=${identifierKey.slice(0, 12)})`,
    );
    return await fail();
  }

  // ---- 4. respond ----------------------------------------------------------
  // Hand-built, NOT a spread of signIn.session -- that object carries a nested
  // `user` with the email on it, and a spread would ship it. Only these fields
  // leave.
  const s = signIn.session;
  return jsonResponse({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    token_type: s.token_type,
    expires_in: s.expires_in,
    expires_at: s.expires_at,
    user: { id: signIn.user?.id ?? null },
  });
});
