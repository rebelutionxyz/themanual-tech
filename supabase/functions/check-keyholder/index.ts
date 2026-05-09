// POST /functions/v1/check-keyholder
// Returns { is_keyholder: boolean } for the authenticated Bee.
// Compares against the KEYHOLDER_BEE_IDS env (comma-separated UUIDs, up to 5
// per HONEYCOMB §31 Three Switches & Five Keyholders). The list is read
// server-side only; never exposed to the client.

import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Body {
  bee_id?: unknown;
}

function readKeyholderIds(): Set<string> {
  const raw = Deno.env.get('KEYHOLDER_BEE_IDS') ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && UUID_RE.test(s)),
  );
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { bee_id } = body;
  if (typeof bee_id !== 'string' || !UUID_RE.test(bee_id)) {
    return errorResponse('bee_id must be a UUID');
  }

  // The bee_id in the body must match the JWT-authenticated user. This
  // prevents one Bee from probing whether another Bee is a Keyholder.
  if (bee_id.toLowerCase() !== auth.userId.toLowerCase()) {
    return jsonResponse({ is_keyholder: false });
  }

  const keyholders = readKeyholderIds();
  const isKeyholder = keyholders.has(bee_id.toLowerCase());

  return jsonResponse({ is_keyholder: isKeyholder });
});
