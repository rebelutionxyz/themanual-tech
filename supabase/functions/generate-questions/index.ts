// =============================================================================
// Edge Function: generate-questions  (Dispatch #3, Part A)  v2
// Auth gate now reads the gateway-verified role claim (verify_jwt validates the
// signature upstream), instead of string-matching the raw service-role key.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEN_MODEL = Deno.env.get("GEN_MODEL") ?? "claude-haiku-4-5-20251001";
const VALIDATE_MODEL = Deno.env.get("VALIDATE_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

const REALMS = [
  "culture","geography","health","history","human_activities","justice",
  "math","philosophy","reference","religion","science","self","society","tech",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Gateway has already verified the JWT signature (verify_jwt=true); reading the
// role claim from the payload is safe here.
function decodeRole(token: string): string | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(pad)).role ?? null;
  } catch { return null; }
}

async function callClaude(model: string, system: string, user: string, maxTokens = 1024): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  return (data?.content?.[0]?.text ?? "").trim();
}

function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[{[]/);
  if (start === -1) throw new Error("no JSON found in model output");
  let depth = 0, end = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return JSON.parse(raw.slice(start, end === -1 ? undefined : end));
}

type Candidate = { realm: string; prompt: string; choices: string[]; correct_idx: number; difficulty: number };

function structurallyValid(q: Candidate): string | null {
  if (!q || typeof q !== "object") return "not an object";
  if (typeof q.prompt !== "string" || q.prompt.trim().length < 8) return "prompt empty/too short";
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return "must have exactly 4 choices";
  const cleaned = q.choices.map((c) => (typeof c === "string" ? c.trim() : ""));
  if (cleaned.some((c) => c.length === 0)) return "a choice is empty";
  if (new Set(cleaned.map((c) => c.toLowerCase())).size !== 4) return "choices not distinct";
  if (typeof q.correct_idx !== "number" || q.correct_idx < 0 || q.correct_idx > 3 || !Number.isInteger(q.correct_idx))
    return "correct_idx out of range";
  if (typeof q.difficulty !== "number" || q.difficulty < 1 || q.difficulty > 5) return "difficulty out of range";
  return null;
}

async function isNearDuplicate(sb: any, realm: string, prompt: string): Promise<boolean> {
  const { data, error } = await sb.rpc("exec_similarity_check", { p_realm: realm, p_prompt: prompt }).maybeSingle();
  if (error) {
    const { data: rows } = await sb.from("question_bank").select("prompt").eq("realm", realm).limit(1000);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const target = norm(prompt);
    return (rows ?? []).some((r: any) => {
      const a = norm(r.prompt);
      const sa = new Set(a.split(" ")), sb2 = new Set(target.split(" "));
      const inter = [...sa].filter((t) => sb2.has(t)).length;
      const uni = new Set([...sa, ...sb2]).size || 1;
      return inter / uni > 0.7;
    });
  }
  return !!data?.is_duplicate;
}

async function answerIsCorrectAndUnambiguous(q: Candidate): Promise<{ ok: boolean; reason: string }> {
  const system =
    "You are a rigorous trivia fact-checker. Given a multiple-choice question, its four choices, " +
    "and the index marked correct, decide if the marked answer is factually correct AND the question " +
    "is unambiguous (exactly one defensibly-correct choice). Reject anything where the marked answer is " +
    "wrong, where more than one choice is arguably correct, or where the prompt is vague/opinion-based. " +
    'Reply ONLY with JSON: {"ok": boolean, "reason": "short"}.';
  const user = JSON.stringify({ prompt: q.prompt, choices: q.choices, marked_correct_idx: q.correct_idx });
  const out = await callClaude(VALIDATE_MODEL, system, user, 256);
  try {
    const v = extractJSON(out);
    return { ok: !!v.ok, reason: String(v.reason ?? "") };
  } catch {
    return { ok: false, reason: "validator returned unparseable output" };
  }
}

const GEN_SYSTEM =
  "You write multiple-choice trivia questions. Output STRICT JSON only — no prose, no markdown fences. " +
  "Each question: a clear factual prompt, exactly 4 distinct plausible choices, one unambiguously correct. " +
  "All-ages clean, inclusive, no opinion-as-fact and no partisan politics. Vary the position of the correct choice. " +
  'Schema per question: {"realm":string,"prompt":string,"choices":[4 strings],"correct_idx":0-3,"difficulty":1-5}.';

function aiUserPrompt(realm: string, difficulty: number, count: number): string {
  return `Realm: ${realm}. Difficulty: ${difficulty} (1=easy,5=hard). ` +
    `Write ${count} trivia questions. Return a JSON array of question objects (schema above).`;
}

function atomUserPrompt(atom: { name: string; realm_name: string; type: string; note: string | null; path: string }, difficulty: number): string {
  const ladderNote =
    "If the atom is a contested/fringe/critique narrative, DO NOT assert the claim as fact. Instead quiz the " +
    "meta-fact: the scholarly consensus, the Discovery-Ladder standing, or who/what/when is documented. " +
    "The Manual's Discovery Ladder has FIVE rungs — Sourced, Accepted, Emerging, Fringe, Unsourced — so a " +
    "'where on the ladder' question uses four of those five rungs as the choices (always including the correct rung). " +
    "The correct answer must be defensible.";
  return `Ground a single trivia question in this Manual atom.\n` +
    `Atom: "${atom.name}" (realm: ${atom.realm_name}, type: ${atom.type}).\n` +
    `Path: ${atom.path}\n` +
    (atom.note ? `Curator note: ${atom.note}\n` : "") +
    `Difficulty target: ${difficulty}.\n${ladderNote}\n` +
    `Return ONE JSON object (schema above) with realm="${atom.realm_name}".`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not set as a Supabase function secret. Butch must set it before generation." }, 503);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "service env missing" }, 500);

  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "").trim();
  const isServiceRole = decodeRole(token) === "service_role";
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  if (!isServiceRole) {
    if (!token) return json({ error: "auth required" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    const uid = u?.user?.id;
    if (!uid) return json({ error: "invalid token" }, 401);
    const { data: bee } = await sb.from("bees").select("is_admin").eq("id", uid).maybeSingle();
    if (!bee?.is_admin) return json({ error: "admin only" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad JSON body" }, 400); }

  const mode: string = body.mode === "atom" ? "atom" : "ai";
  const realm: string | undefined = body.realm;
  const difficulty: number = Math.min(5, Math.max(1, Number(body.difficulty ?? 2)));
  const count: number = Math.min(25, Math.max(1, Number(body.count ?? 5)));

  if (realm && !REALMS.includes(realm)) return json({ error: `unknown realm ${realm}` }, 400);

  const inserted: any[] = [];
  const rejected: any[] = [];
  let candidates: { cand: Candidate; atomId: string | null; source: "ai" | "atom" }[] = [];

  try {
    if (mode === "ai") {
      if (!realm) return json({ error: "ai mode requires a realm" }, 400);
      const out = await callClaude(GEN_MODEL, GEN_SYSTEM, aiUserPrompt(realm, difficulty, count), 4096);
      const arr = extractJSON(out);
      const list = Array.isArray(arr) ? arr : [arr];
      candidates = list.map((c: any) => ({ cand: { ...c, realm, difficulty: c.difficulty ?? difficulty }, atomId: null, source: "ai" as const }));
    } else {
      let q = sb.from("atoms").select("id,name,realm_id,realm_name,type,note,path").eq("is_leaf", true);
      if (realm) q = q.eq("realm_id", realm);
      if (Array.isArray(body.atom_ids) && body.atom_ids.length) q = q.in("id", body.atom_ids);
      const { data: atoms, error } = await q.limit(count * 3);
      if (error) return json({ error: `atom query: ${error.message}` }, 500);

      const { data: used } = await sb.from("question_bank").select("source_atom_id").not("source_atom_id", "is", null);
      const usedSet = new Set((used ?? []).map((r: any) => r.source_atom_id));
      const pick = (atoms ?? []).filter((a: any) => !usedSet.has(a.id)).slice(0, count);

      for (const a of pick) {
        const out = await callClaude(GEN_MODEL, GEN_SYSTEM, atomUserPrompt(a, difficulty), 1024);
        try {
          const c = extractJSON(out);
          candidates.push({ cand: { ...c, realm: a.realm_id, difficulty: c.difficulty ?? difficulty }, atomId: a.id, source: "atom" });
        } catch (e) {
          rejected.push({ atom_id: a.id, reason: `parse: ${(e as Error).message}` });
        }
      }
    }
  } catch (e) {
    return json({ error: `generation failed: ${(e as Error).message}` }, 502);
  }

  for (const { cand, atomId, source } of candidates) {
    const structErr = structurallyValid(cand);
    if (structErr) { rejected.push({ prompt: cand.prompt?.slice(0, 80), reason: structErr }); continue; }
    cand.choices = cand.choices.map((c) => c.trim());

    if (await isNearDuplicate(sb, cand.realm, cand.prompt)) {
      rejected.push({ prompt: cand.prompt.slice(0, 80), reason: "near-duplicate" }); continue;
    }

    const check = await answerIsCorrectAndUnambiguous(cand);
    if (!check.ok) { rejected.push({ prompt: cand.prompt.slice(0, 80), reason: `validator: ${check.reason}` }); continue; }

    const { data: row, error } = await sb.from("question_bank").insert({
      realm: cand.realm,
      prompt: cand.prompt,
      choices: cand.choices,
      correct_idx: cand.correct_idx,
      difficulty: cand.difficulty,
      source,
      source_atom_id: atomId,
      status: "validated",
    }).select("id").single();

    if (error) rejected.push({ prompt: cand.prompt.slice(0, 80), reason: `insert: ${error.message}` });
    else inserted.push({ id: row.id, realm: cand.realm, source, source_atom_id: atomId, prompt: cand.prompt });
  }

  return json({
    ok: true, mode, realm: realm ?? "(all)", requested: count,
    inserted_count: inserted.length, rejected_count: rejected.length,
    status_note: "inserted as 'validated' — promote to 'live' via question_bank_promote()",
    inserted, rejected,
  });
});
