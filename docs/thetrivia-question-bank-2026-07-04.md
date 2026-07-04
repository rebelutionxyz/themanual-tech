# TheTRIVIA.app — Question Bank Record
**As of 2026-07-04 · Supabase `anxmqiehpyznifqgskzc` · maintained via Claude Chat lane (execute_sql, no migrations)**

## Bank state
- **3,246 questions** in `question_bank` (public schema) — all `status='validated'`, `answer_format='multiple_choice'`, 4 choices, valid `correct_idx`. Zero duplicate prompts, zero malformed rows. All servable by the A2/A3 ticks today.
- **Difficulty:** d1 431 · d2 653 · d3 848 · d4 837 · d5 477 (top tiers deliberately thickened via depth passes).
- **Realms:** culture 300 · history 300 · geography 298 · human_activities 290 · philosophy 260 · self 260 · society 258 · religion 258 · science 257 · math 256 · health 256 · tech 253. Bar-relevant realms intentionally lead.
- **Answer positions:** ~25% per slot (24.6 / 27 / 24.1 / 24.2). No "always pick B" exploit.
- **Runway:** ~13.5 days of unique serving for one venue on a 12-hr Channel day (~240 serves/day) before oldest-served fallback recycles. Clean 30-day no-repeat target ≈ 7,200.

## How it got here (2026-07-03 → 07-04)
- Morning session: 719 (12 realms × ~60, thin at d5). June 3 engine-v1 seed: 44.
- Nine live passes this session: 2× all-12 general (25/realm, 4/5/6/6/4 tiers), 1× bar-friendly 120 (drinks/games/Americana/Montana), then depth passes weighted d4–d5 (cocktail builds, treaties, named entities, sport rulebooks).
- Continuous dedup + cleanup throughout: cross-realm morning dupes removed, seed collisions and near-dupes swapped, two garbled prompts repaired.

## Locked decisions
1. **Serving table is `question_bank`.** `trivia_questions` (35 draft rows, June 20) is a dead-end pilot table — serving path never reads it. Decide later: drop or ignore.
2. **Question content = operational data.** Inserted via `execute_sql`; never registered in `schema_migrations`; no repo-parity files.
3. **Fun gate is currently OPEN.** Everything sits at `validated` (venue-visible, no curation step). Reversible per batch: `UPDATE question_bank SET status='draft' WHERE created_at::date='YYYY-MM-DD';`
4. **Future volume gates on serve data.** Bank is saturated for straightforward generation (collision rate proved it). Launch pilot → read `trivia_question_serves` → generate against real gaps. No blind padding to 7,200.

## Answer-balancer (keeper — wire into fun gate on insert)
Salted-hash swap; flattens position distribution bank-wide, preserves correct-answer text, safe to re-run with a new salt:
```sql
UPDATE question_bank AS q
SET choices = sub.new_choices, correct_idx = sub.target
FROM (
  SELECT id, correct_idx,
    (abs(hashtext(id::text || '<SALT>')) % 4) AS target,
    ( SELECT jsonb_agg(CASE
        WHEN i = (abs(hashtext(id::text || '<SALT>')) % 4) THEN choices -> correct_idx
        WHEN i = correct_idx THEN choices -> (abs(hashtext(id::text || '<SALT>')) % 4)
        ELSE choices -> i END)
      FROM generate_series(0,3) AS i ) AS new_choices
  FROM question_bank
) AS sub
WHERE q.id = sub.id AND sub.target <> q.correct_idx;
```
Salts used to date: balance_v2…v6. Always spot-check known answers after running.

## Ops lessons
- Single-realm 25-row INSERTs are the reliable unit; one 50-row call failed mid-write (atomic, zero rows landed — verify count before retry).
- Exact-match dedup misses rewordings; pull prior prompts per realm before writing, and check the June 3 seed too.
- Health checks after every pass: total / dup prompts / malformed / idx distribution.

## Open items
- Wire balancer into fun-gate insert path (Code lane, later).
- `trivia_questions` table disposition.
- Post-pilot: realm/difficulty gap analysis from `trivia_question_serves`.
