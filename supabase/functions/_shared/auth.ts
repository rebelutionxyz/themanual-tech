// JWT verification for Edge Functions.
// Resolves Authorization: Bearer <token> → user_id, or returns a 401 result.

import { anonClient } from './supabase.ts';

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function verifyAuth(req: Request): Promise<AuthResult> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing bearer token' };
  }
  const token = header.slice('Bearer '.length);
  const { data, error } = await anonClient().auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }
  return { ok: true, userId: data.user.id };
}

// DB75 — the service-principal check for the INTERNAL-CALLER PATH.
//
// An internal astra-to-engine call (generate-questions, trivia-host) authenticates
// by holding the SERVICE-ROLE key, which only backend functions possess — a user
// cannot forge a service_role JWT. `verifyAuth` above 401s such a token because a
// service role is not a user; this reads the role claim instead, exactly as
// generate-questions already does at its own gate.
//
// The gateway (verify_jwt) has already validated the signature upstream, so
// reading the role from the payload is safe. This returns only WHETHER the caller
// is the service principal; the route additionally requires the body to declare
// `internal: true` before it treats a call as internal, so an ordinary
// service-role invocation is never silently metered as an astra call.
export function isServiceRolePrincipal(req: Request): boolean {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return false;
  const token = header.slice('Bearer '.length);
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)).role === 'service_role';
  } catch {
    return false;
  }
}
