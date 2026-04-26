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
