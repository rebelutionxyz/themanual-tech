# Migration Reconciliation — authoritative prod ledger (2026-06-06)
*Read directly from prod `supabase_migrations.schema_migrations` via list_migrations. This is the
SOURCE OF TRUTH for what's applied. Code: every prod version below must have EXACTLY ONE matching
.sql file in TheMANUAL.tech/supabase/migrations/ — no duplicates, no missing, no extras.*

## Today's session migrations (2026-06-06) — all APPLIED in prod, in order
Each line: `<prod_version>  <name>`. The repo must contain one file per line, named
`<version>_<name>.sql`. These are the ONLY 2026-06-06 versions in prod — if the repo has any
2026-06-06 file whose version is NOT in this list, it's a stray (delete it).

```
20260606114132  society_government_agencies_entity_harvest_2
20260606114209  society_corporations_entity_harvest_3
20260606115528  society_corporations_entity_harvest_4_broad
20260606115604  society_people_taxonomy_entity_harvest_5
20260606133527  consolidation_1_religion_christianity_stub
20260606141246  consolidation_2_religion_sacred_texts_vestigial
20260606145723  consolidation_3_singular_plural_dups
20260606150332  consolidation_4_color_singular_dup
20260606171930  atom_canonical_link_columns
20260606171948  atom_canonical_link_proof_set_religion
20260606190751  canonical_text_links_bulk_pass_1
20260606192214  money_rpc_revoke_anon_execute
20260606193253  money_rpc_revoke_anon_execute_atlasoracle_completion
20260606193318  money_rpc_revoke_public_execute_atlasoracle
20260606195105  question_bank_public_security_invoker
20260606195424  drop_stale_atoms_backup_20260519
20260606195430  manual_groups_revoke_public_execute_signin_only
20260606195452  manual_groups_revoke_anon_direct_signin_only
```
(Note: entity_harvest_1 = version 20260605143113, dated 2026-06-05; geography = 20260605030409.
Both are in the prior session's run and also need repo files if not already present.)

## Key reconciliation facts (resolve the Code/chat overlap)
1. **atoms_backup DROP is DONE** — version 20260606195424 is in prod, table is gone (verified:
   backup_exists=0). Code's transcript showed it as "gated/awaiting nod" — that's STALE. Do NOT
   re-run the DROP (it'll error). Just ensure one backfill file exists at version 20260606195424.

2. **manual_groups has TWO migrations, both intentional, both kept:**
   - 20260606195430 manual_groups_revoke_public_execute_signin_only (the REVOKE FROM PUBLIC — a
     documented NO-OP; these RPCs had a direct anon grant, not PUBLIC)
   - 20260606195452 manual_groups_revoke_anon_direct_signin_only (the EFFECTIVE fix — REVOKE FROM anon)
   Both are faithful to what was applied; keep both. End-state verified: group_anon=0, authenticated=3.

3. **money_rpc has THREE migrations (the anon revoke evolved):**
   - 20260606192214 money_rpc_revoke_anon_execute (the 7 bling_* — direct anon grants, worked)
   - 20260606193253 ..._atlasoracle_completion (REVOKE FROM anon on the 4 atlasoracle_* — NO-OP,
     they were PUBLIC-granted)
   - 20260606193318 ..._revoke_public_execute_atlasoracle (REVOKE FROM PUBLIC — the ROOT FIX for the 4)
   Keep all three; they're the faithful history. End-state verified: money_anon=0, authenticated=11,
   service_role=11.

4. **question_bank_public** (20260606195105) — Code applied this one itself; the backfill is
   Code's. End-state verified: security_invoker=on, anon reads 10 live rows, correct_idx +
   accepted_answers denied to anon.

## De-dup procedure for Code
1. `supabase migration list` → compare to the prod list above.
2. For each 2026-06-06 prod version, ensure ONE repo file. If chat-side AND Code wrote a file for
   the same version (different bodies/comments), keep the one whose body matches what's in prod
   (outcome-faithful); delete the other. Bodies for the chat-applied ones are in the
   chat-provided .sql files in outputs.
3. Any 2026-06-06 repo file whose version is NOT in the prod list = stray; delete it.
4. After de-dup, `git status` should show one clean file per prod version. Then Butch commits + pushes.

## Standing guard (new, to prevent re-overlap)
Going forward, for a given batch: EITHER Claude-chat applies via MCP + writes the backfill, OR Code
does — not both on the same items. Clean lanes: chat = quick DDL/grant fixes via MCP + their
backfills; Code = app/edge-fn/repo work + dedup + the bulk import/canonical jobs. This session both
worked the close-out queue and produced duplicate files; prod is correct, but the repo needed this
reconciliation. Don't repeat.

## Still open (not migrations — Code's lane)
- bee_id edge-fn (manual-atom-sources): source fixed in repo, needs CLI deploy.
- Hygiene pass: leaked-password toggle, 3 function search_paths, the confirm-intent items.
- Migration-ledger squaring for the 3 OLD files (competition_engine_v1 20260602182706,
  competition_engine_v1_fix_join_code 20260602182958, economy_v3_cap_precision 20260602201522) —
  pre-existing local-vs-prod timestamp mismatch, separate from today.
