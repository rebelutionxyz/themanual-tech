// ============================================================================
// RECOVERED FROM DEPLOYMENT - NOT VERIFIED AGAINST ANY ORIGINAL
//
//   slug            push-send
//   version         8 (status ACTIVE at time of recovery)
//   function id     1d61f95f-831c-4fc2-998d-db944f463e51
//   project         anxmqiehpyznifqgskzc
//   ezbr_sha256     9ab41f6b2f8d564ef21a9a17d1939ecd6e87a0afcb91d203ea41f2666702e0d8
//   deployed        1784605368921 (created_at == updated_at)
//   recovered       2026-08-02, pass OPS55, read-only get_edge_function
//
// This file is a transcription of the source carried inside the deployed
// bundle. It has NOT been deployed, edited, reformatted, or reconciled with
// any original. Nothing below this banner was authored in this pass.
//
// NO corroborating copy exists anywhere in the workspace - a whole-workspace
// search on 2026-08-02 found no reference at all, in any file, to this slug.
// This transcription is therefore UNVERIFIED against any second source.
//
// The deployed bundle is a single self-contained index.ts with no _shared
// imports; nothing else was in the bundle.
//
// NOTE FOR REVIEW (not changed here): the VAPID_PUBLIC_KEY fallback literal
// and the VAPID_SUBJECT mailto: fallback are hardcoded in the source below.
// The public key is not a secret, but the hardcoded defaults are a config
// smell worth a separate dispatch. Left verbatim on purpose.
//
// DO NOT DEPLOY FROM THIS FILE without an explicit dispatch under the root
// CLAUDE.md DEPLOY AMENDMENT.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Sends a web-push "incoming call" to every OTHER conversation member's
// registered devices, so the call reaches them even when the site is closed.
// On-site clients still get the realtime ring; the service worker suppresses
// the push notification when a tab is already focused (see public/sw.js).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BHKzadWcicmBmyRYqX_gaJdBo1EUkG8qgithSoh2jutUTrkLqSfNCXm8DanoiFMFmYQcOiVCJXFUbNBu807o0l0").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
const VAPID_SUBJECT = (Deno.env.get("VAPID_SUBJECT") ?? "mailto:brandon1112@gmail.com").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!VAPID_PRIVATE) return json({ error: "VAPID_PRIVATE_KEY not configured" }, 503);
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "invalid token" }, 401);
    const callerId = user.id;

    const { room_id } = await req.json().catch(() => ({}));
    if (!room_id) return json({ error: "room_id required" }, 400);

    const svc = createClient(SUPABASE_URL, SERVICE);
    const { data: room } = await svc
      .from("comms_rooms")
      .select("id, conversation_id, title, host_bee_id, status")
      .eq("id", room_id)
      .single();
    if (!room || !room.conversation_id) return json({ ok: true, sent: 0 });

    const { data: mePart } = await svc
      .from("comms_participants")
      .select("bee_id")
      .eq("conversation_id", room.conversation_id)
      .eq("bee_id", callerId)
      .maybeSingle();
    if (!mePart) return json({ error: "not a participant" }, 403);

    const { data: caller } = await svc.from("bees").select("handle").eq("id", callerId).maybeSingle();
    const callerHandle = caller?.handle ? `@${caller.handle}` : "Someone";
    const mode = room.title === "audio" ? "voice" : "video";

    const { data: parts } = await svc
      .from("comms_participants")
      .select("bee_id")
      .eq("conversation_id", room.conversation_id)
      .neq("bee_id", callerId);
    const beeIds = (parts ?? []).map((p: { bee_id: string }) => p.bee_id);
    if (!beeIds.length) return json({ ok: true, sent: 0 });

    const { data: subs } = await svc
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("bee_id", beeIds);

    const payload = JSON.stringify({
      title: `${callerHandle} is calling`,
      body: mode === "voice" ? "Incoming voice call" : "Incoming video call",
      url: `/comms/${room.conversation_id}`,
      roomId: room_id,
    });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      (subs ?? []).map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) stale.push(s.endpoint);
        }
      }),
    );
    if (stale.length) {
      await svc.from("push_subscriptions").delete().in("endpoint", stale);
    }

    return json({ ok: true, sent });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
