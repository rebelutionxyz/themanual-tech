// generate-trivia.mjs — 5-tier, multi-realm trivia generator (Node ESM).
//
// Reads topic candidates from public.trivia_topic_candidates (safety/scope already
// applied in the view), asks Claude for 5-tier MCQs per topic, validates, SHUFFLES
// choices, and writes draft rows to trivia_questions + one run record per topic to
// trivia_gen_runs.
//
// Resumable, concurrency-limited, never crashes the run on a per-topic error.
//
// Env (never hardcode): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
// Run: node -r dotenv/config scripts/generate-trivia.mjs
//
// Rows land status='draft' / verified=false — review before serving.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const MODEL = 'claude-sonnet-4-6';
const REALMS = ['self', 'human_activities', 'health', 'culture', 'science']; // full run
const PER_TIER = { simple: 1, easy: 1, medium: 1, hard: 1, master: 1 }; // 5/atom
const CONCURRENCY = 4;
const MAX_ATOMS = null; // null = entire realm; set a number (e.g. 20) to cap per realm

const TIERS = ['simple', 'easy', 'medium', 'hard', 'master'];
const REQUESTED = Object.values(PER_TIER).reduce((a, b) => a + b, 0);
const MAX_TOKENS = 8000;

// ── Env ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

for (const [name, val] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY,
})) {
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

// ── Clients ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// maxRetries: SDK retries 429/5xx (incl. 529) with exponential backoff.
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 8 });

// ── Prompt ──────────────────────────────────────────────────────────────────
function buildPrompt(topic) {
  return `Generate trivia questions about a single topic for a general-knowledge game.
Topic: ${topic.topic_name}
Taxonomy path: ${topic.topic_path}

Produce exactly: ${PER_TIER.simple} SIMPLE, ${PER_TIER.easy} EASY, ${PER_TIER.medium} MEDIUM, ${PER_TIER.hard} HARD, ${PER_TIER.master} MASTER questions.
Difficulty is defined by AUDIENCE, not by trivia obscurity:
- SIMPLE  = a young child / elementary level — concrete, common knowledge.
- EASY    = high-school level — general educated knowledge.
- MEDIUM  = college / undergraduate level — requires some study of the subject.
- HARD    = advanced-degree / graduate level — specialist knowledge.
- MASTER  = expert / master level — the deepest, most nuanced knowledge of the topic.
Each question: self-contained (do NOT mention 'the topic' or the path), factual and verifiable,
exactly 4 choices, exactly one correct, plausible distractors. Vary which choice is correct.

CONTENT SAFETY (strict):
- NO questions about self-harm, suicide, eating disorders, or similar harm-sensitive subjects. If the
  topic touches these, return [].
- For sensitive/contested subjects (controlled/illicit drugs; contested public-health topics such as
  COVID-19 origins, vaccine safety, water fluoridation): ONLY neutral, established, factual questions
  (definitions, dates, classifications). NEVER state a contested claim as fact; NEVER include operational
  or harmful detail. If you cannot form a clean, uncontested, factual question, return [].
- Keep SIMPLE/EASY tiers fully age-appropriate.

Output STRICT JSON only — no prose, no fences — an array of:
{"question": string, "choices": [s1,s2,s3,s4], "answer_index": 0-3,
 "difficulty": "simple"|"easy"|"medium"|"hard"|"master"}
If no safe questions are possible, output [].`;
}

// ── Model call + parse ──────────────────────────────────────────────────────
async function callModel(prompt) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function parseJsonArray(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  const parsed = JSON.parse(t);
  if (!Array.isArray(parsed)) throw new Error('model output is not a JSON array');
  return parsed;
}

// Fisher-Yates shuffle so the correct answer isn't always in the same slot.
function shuffleChoices(choices, answerIndex) {
  const correct = choices[answerIndex];
  const arr = choices.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { choices: arr, answer_index: arr.indexOf(correct), answer: correct };
}

// ── Per-topic processing ────────────────────────────────────────────────────
async function processTopic(topic) {
  try {
    const text = await callModel(buildPrompt(topic));
    const arr = parseJsonArray(text);

    const rows = [];
    for (const q of arr) {
      if (!q || typeof q !== 'object') continue;
      if (!Array.isArray(q.choices) || q.choices.length !== 4) continue;
      if (!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index > 3) continue;
      if (!TIERS.includes(q.difficulty)) continue;
      if (typeof q.question !== 'string' || !q.question.trim()) continue;

      const s = shuffleChoices(q.choices, q.answer_index);
      rows.push({
        topic_atom_id: topic.topic_atom_id,
        topic_path: topic.topic_path,
        realm_id: topic.realm_id,
        question: q.question,
        choices: s.choices,
        answer_index: s.answer_index,
        answer: s.answer,
        difficulty: q.difficulty,
        source: 'ai',
        model: MODEL,
        status: 'draft',
        verified: false,
        tags: [],
        created_by: 'claude-code',
      });
    }

    let inserted = 0;
    if (rows.length > 0) {
      const { error } = await supabase.from('trivia_questions').insert(rows);
      if (error) throw error;
      inserted = rows.length;
    }

    await supabase.from('trivia_gen_runs').insert({
      topic_atom_id: topic.topic_atom_id,
      topic_path: topic.topic_path,
      requested: REQUESTED,
      inserted,
      model: MODEL,
      status: 'ok',
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : (e?.message ?? e?.code ?? JSON.stringify(e));
    const { error: runErr } = await supabase.from('trivia_gen_runs').insert({
      topic_atom_id: topic.topic_atom_id,
      topic_path: topic.topic_path,
      requested: REQUESTED,
      inserted: 0,
      model: MODEL,
      status: 'error',
      error: message,
    });
    if (runErr) console.error(`failed to record error for ${topic.topic_atom_id}: ${runErr.message}`);
  }
}

// ── Loaders ─────────────────────────────────────────────────────────────────
async function loadDoneTopicIds() {
  const done = new Set();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('trivia_gen_runs')
      .select('topic_atom_id')
      .eq('status', 'ok')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) done.add(r.topic_atom_id);
    if (data.length < PAGE) break;
  }
  return done;
}

async function loadCandidates(realm) {
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('trivia_topic_candidates')
      .select('topic_atom_id, topic_path, realm_id, realm_name, topic_name')
      .eq('realm_id', realm)
      .order('topic_atom_id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

// Sample MAX_ATOMS spread across distinct depth-2 branches (round-robin).
function sampleSpread(cands, max) {
  if (max == null || cands.length <= max) return cands;
  const byBranch = new Map();
  for (const c of cands) {
    const branch = c.topic_path.split(' / ')[1] ?? '(root)';
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch).push(c);
  }
  const branches = [...byBranch.values()];
  const out = [];
  for (let i = 0; out.length < max; i++) {
    let advanced = false;
    for (const arr of branches) {
      if (i < arr.length) {
        out.push(arr[i]);
        advanced = true;
        if (out.length >= max) break;
      }
    }
    if (!advanced) break;
  }
  return out;
}

// ── Concurrency pool ────────────────────────────────────────────────────────
async function runPool(items, concurrency, worker) {
  let idx = 0;
  let completed = 0;
  const total = items.length;
  async function lane() {
    while (true) {
      const my = idx++;
      if (my >= total) return;
      await worker(items[my]);
      completed++;
      if (completed % 25 === 0) console.log(`  progress: ${completed}/${total}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => lane()));
}

// ── Main ────────────────────────────────────────────────────────────────────
const done = await loadDoneTopicIds();
console.log(
  `realms: ${REALMS.join(', ')} | model=${MODEL} | ${REQUESTED}/atom | concurrency=${CONCURRENCY}\n` +
    `already ok (resume-skip): ${done.size} topics`,
);

let grandTotal = 0;
for (const realm of REALMS) {
  let candidates = await loadCandidates(realm);
  const totalForRealm = candidates.length;
  candidates = candidates.filter((c) => !done.has(c.topic_atom_id));
  const remaining = candidates.length;
  candidates = sampleSpread(candidates, MAX_ATOMS);
  console.log(
    `\n[${realm}] ${totalForRealm} total, ${totalForRealm - remaining} done, ${remaining} remaining, processing ${candidates.length}`,
  );
  if (candidates.length === 0) {
    console.log(`[${realm}] nothing to do.`);
    continue;
  }
  await runPool(candidates, CONCURRENCY, processTopic);
  grandTotal += candidates.length;
  console.log(`[${realm}] complete: ${candidates.length} topics.`);
}
console.log(`\n=== ALL DONE: ${grandTotal} topics across ${REALMS.length} realms ===`);