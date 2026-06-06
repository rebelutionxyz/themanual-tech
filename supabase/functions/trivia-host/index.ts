// =============================================================================
// Edge Function: trivia-host  (Dispatch #3, Part B)  v2
// Auth gate reads the gateway-verified role claim instead of string-matching
// the raw service-role key.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HOST_MODEL = Deno.env.get("HOST_MODEL") ?? "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

const EVENTS = new Set(["room_open", "question_intro", "answer_reveal", "leaderboard_update", "wrap"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function decodeRole(token: string): string | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(pad)).role ?? null;
  } catch { return null; }
}

const SYSTEM = `You are TRIVIA_Claude, "The Trivia Master" — the live emcee of B Battles, the HoneyComb / Bee Games trivia night.

VOICE (locked):
- High-energy bar-night quiz host. Warm, quick, witty, a little cheeky.
- ALL-AGES CLEAN. B Battles is a family event: zero profanity, no innuendo, no alcohol/drug references, nothing a kid couldn't hear. "Bar-night energy" = the crowd warmth, NOT the bar.
- Inclusive and welcoming to everyone. Never punch down; tease the game, not the players.
- Hype without cringe: no forced slang, no try-hard memes, no exclamation-point spam (one is plenty).
- CONCISE: 1-2 sentences, ideally under 30 words. This line is read aloud.
- You may address the room collectively or name a leader/handle when given one.
- Refer to players as "Bees" and to points/standing naturally.

HARD RULES:
- NEVER reveal or hint at a question's correct answer, EXCEPT on event "answer_reveal" (where the correct answer is provided to you).
- On "question_intro" you set up the question's vibe/topic only — do not answer it.
- Output ONLY the spoken host line. No quotes, no stage directions, no markdown, no emoji-only lines (one tasteful emoji max, optional).
- Stay in character. If context is thin, keep it short and general.

EVENT GUIDE:
- room_open: welcome the Bees, set the night's energy, mention the realm/topic if given.
- question_intro: tease the upcoming question's topic and get the room ready to lock in.
- answer_reveal: celebrate the reveal; you ARE given the correct answer — state it with flair, salute who nailed it if told.
- leaderboard_update: react to the standings; hype the leader and the chase.
- wrap: send the room off — congratulate the winner, thank the Bees, leave them wanting the next round.`;

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
    body: JSON.stringify({ model: HOST_MODEL, max_tokens: 150, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data?.content?.[0]?.text ?? "").trim().replace(/^["']|["']$/g, "");
}

function buildUserContext(event: string, body: any): string {
  const room = body.room ?? {};
  const q = body.question ?? {};
  const lb = Array.isArray(body.leaderboard) ? body.leaderboard.slice(0, 8) : [];
  const lbText = lb.length
    ? lb.map((r: any) => `#${r.rank ?? "?"} @${r.handle ?? "bee"} — ${r.score ?? 0}`).join(", ")
    : "(no standings yet)";

  const parts: string[] = [`EVENT: ${event}`];
  if (room.name || room.realm || room.mode) parts.push(`ROOM: ${[room.name, room.realm, room.mode].filter(Boolean).join(" · ")}`);

  if (event === "question_intro") {
    parts.push(`UPCOMING QUESTION (topic only — do NOT answer): ${q.prompt ?? "(general)"}`);
    if (Array.isArray(q.choices)) parts.push(`Choices on screen: ${q.choices.join(" / ")}`);
  } else if (event === "answer_reveal") {
    const correct = q.correct_choice ?? (Array.isArray(q.choices) && typeof q.correct_idx === "number" ? q.choices[q.correct_idx] : undefined);
    parts.push(`QUESTION: ${q.prompt ?? ""}`);
    parts.push(`CORRECT ANSWER (reveal this): ${correct ?? "(unknown)"}`);
    if (body.first_correct_handle) parts.push(`First Bee to nail it: @${body.first_correct_handle}`);
  }

  if (event === "leaderboard_update" || event === "wrap" || event === "room_open") {
    parts.push(`STANDINGS: ${lbText}`);
  }
  parts.push("Write TRIVIA_Claude's single spoken line for this moment.");
  return parts.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set as a Supabase function secret." }, 503);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const isServiceRole = decodeRole(token) === "service_role";
  if (!isServiceRole) {
    if (!token || !SUPABASE_URL) return json({ error: "auth required" }, 401);
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user?.id) return json({ error: "invalid token" }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad JSON body" }, 400); }

  const event = String(body.event ?? "");
  if (!EVENTS.has(event)) return json({ error: `event must be one of ${[...EVENTS].join(", ")}` }, 400);

  try {
    const line = await callClaude(SYSTEM, buildUserContext(event, body));
    return json({ ok: true, event, line });
  } catch (e) {
    return json({ error: `host generation failed: ${(e as Error).message}` }, 502);
  }
});
