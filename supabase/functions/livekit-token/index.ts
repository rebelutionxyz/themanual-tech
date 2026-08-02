// ============================================================================
// RECOVERED FROM DEPLOYMENT - NOT VERIFIED AGAINST ANY ORIGINAL
//
//   slug            livekit-token
//   version         13 (status ACTIVE at time of recovery)
//   function id     0450cdbd-7b20-454c-b064-d1bf48776e24
//   project         anxmqiehpyznifqgskzc
//   ezbr_sha256     77097a5f545166c8e385f290cc6717001f9d062c0dbf6d2292fcf395c67d4094
//   deployed        created 1784489385381, updated 1784580314487
//   recovered       2026-08-02, pass OPS55, read-only get_edge_function
//
// This file is a transcription of the source carried inside the deployed
// bundle. It has NOT been deployed, edited, reformatted, or reconciled with
// any original. Nothing below this banner was authored in this pass.
//
// NO corroborating copy exists anywhere in the workspace - a whole-workspace
// search on 2026-08-02 found only prose references (shared/canon/*.md). This
// transcription is therefore UNVERIFIED against any second source.
//
// The deployed bundle is a single self-contained index.ts with no _shared
// imports; nothing else was in the bundle.
//
// DO NOT DEPLOY FROM THIS FILE without an explicit dispatch under the root
// CLAUDE.md DEPLOY AMENDMENT.
// ============================================================================

// Supabase Edge Function: livekit-token
// Mints a room-scoped LiveKit access token for the authenticated bee,
// but ONLY if they are a live participant of the requested comms_room.
// Requires secrets: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2.15.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// .trim() defends against secrets pasted with trailing newlines/whitespace.
const LK_KEY = Deno.env.get("LIVEKIT_API_KEY")?.trim();
const LK_SECRET = Deno.env.get("LIVEKIT_API_SECRET")?.trim();
const LK_URL = Deno.env.get("LIVEKIT_URL")?.trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!LK_KEY || !LK_SECRET || !LK_URL) {
      return json(
        { error: "LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL." },
        503,
      );
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    // 1) Identify the caller from their Supabase JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "invalid token" }, 401);
    const beeId = user.id;

    const { room_id } = await req.json().catch(() => ({}));
    if (!room_id) return json({ error: "room_id required" }, 400);

    // 2) Authorize against the DB with the service role.
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: room, error: rErr } = await svc
      .from("comms_rooms")
      .select("id, livekit_room, status, kind")
      .eq("id", room_id)
      .single();
    if (rErr || !room) return json({ error: "room not found" }, 404);
    if (room.status !== "live") return json({ error: "room ended" }, 409);

    const { data: part } = await svc
      .from("comms_room_participants")
      .select("role, left_at")
      .eq("room_id", room_id)
      .eq("bee_id", beeId)
      .maybeSingle();
    if (!part || part.left_at) return json({ error: "not a participant" }, 403);

    // 3) Role -> publish rights. Listeners subscribe only.
    const canPublish = room.kind === "roulette" ||
      part.role === "host" || part.role === "speaker";

    // 4) Mint the LiveKit token, scoped to this room only.
    const at = new AccessToken(LK_KEY, LK_SECRET, { identity: beeId, ttl: "6h" });
    at.addGrant({
      roomJoin: true,
      room: room.livekit_room,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();

    return json({ token, url: LK_URL, room: room.livekit_room, can_publish: canPublish });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
