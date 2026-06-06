# Session Close Handoff — 2026-06-06
*prod: themanual-tech (anxmqiehpyznifqgskzc). Everything below verified from prod this session.*

## 🔴 FIRST THING NEXT SESSION — protect the data (Butch's stated worry)
Migrations + canon are safe (GitHub repo, squashed+merged today; prod ledger). But the ATOM DATA
(5,565 hand-built atoms) is only as safe as the last backup run. BEFORE any new work next session:
1. VERIFY the backup tiers actually ran: Tier-2 (GitHub Actions weekly), Tier-3 (Windows scheduled
   task, Sundays), and confirm the USB cold-storage copy date. Don't assume — check the actual run logs.
2. Take a FRESH point-in-time data export (pg_dump of atoms + economy tables, or Supabase dashboard
   backup) and store it off-prod. Migrations rebuild STRUCTURE, not hand-built CONTENT.
3. Consider Supabase Pro scheduled backups / PITR if not already on (was flagged pending).
This is the one real risk to "we've built a lot, I'd hate to lose it." Close it first.

## What got DONE + VERIFIED today
- **Manual spine COMPLETE**: 5,565 atoms, 14 realms, 0 orphans, 0 dupes, 0 cruft. Consolidation done (4 deletes).
- **Canonical text links**: 18 live, every URL fetch-verified. ~41 text-atoms null (fine, future pass).
- **Security pass — ZERO ERROR lints**:
  - Money RPCs: anon=0 (REVOKE; verified). Internal auth.uid() guards confirmed sound.
  - manual_groups (create/join/leave): anon=0, sign-in only.
  - question_bank_public: security_invoker + column-grants; answer key (correct_idx) protected.
  - atoms_backup_2026_05_19: DROPPED (stale 5,011-row snapshot).
  - bee_id leak (manual-atom-sources edge fn): FIXED + DEPLOYED v2 (returns handle/name, no bee_id). Verified live.
  - function_search_path ×3: hardened (Code).
  - Confirm-intent items (pg_trgm, atom_trending matviews, atlasoracle_canon_reads): all verified, left as-is intentionally.
- **Git**: squashed + merged. Repo == prod.
- **Migration ledger**: fully reconciled, 1 file per prod version, incl. June-2 batch renames + the fix_join_code backfill.

## Open / Butch-side
- **Leaked-password protection**: Auth dashboard toggle — Butch's switch (can't be done via tooling).
- **Edge-fn cosmetic**: manual-atom-sources deployed with a doubled `source/source/` path — works fine,
  optional clean redeploy from repo someday. ("We'll fix it.")
- **Live-count display**: fix is in repo (useAtomCount.ts), committed; live themanual.tech won't show
  the right count until push+deploy. Deferred ("may eliminate altogether").

## FreedomBLiNGS (phase 1 done; phase 2 scoped)
- whitepaper-v2.1.md: reconciled to canon (product surfaces fixed, 28-count softened to aspirational),
  economics verified against prod. Save over v2.0.
- astra-domain-registry.md: locked source of truth, 25 surfaces.
- freedomblings-design-foundation.md: bare brief for Design (mechanics deferred).
- freedomblings-phase2-scope.md: maps phase-2 detail pack. NEW today: **BLiNG! DNA issuing-bucket
  provenance rule** — each BLiNG! tracks which Treasury bucket it was most recently issued from
  (Howey-relevant; verify whether bling_transactions source_type/source_ref already does this or a
  new last-issued-bucket stamp is needed). Phase 2 = read every bling_* table from prod before specing.

## Build tracks queued for Code (gated/deferred)
- **Entity bulk-import**: BLOCKED — the spec `justice-entity-bulk-import-spec.md` does NOT exist in the
  tree (Code searched). Next step: either Butch points to it (OG Claude chat / Drive) OR Claude authors
  it as a draft from the design brief + the 5 existing society_*_entity_harvest migrations as precedent,
  Butch ratifies, then dev-branch run. create_branch now available.
- **Justice UI**: hand justice-design-brief-v2-full.md to Design (entities live in home realms as neutral
  atoms; Justice = runtime lens/post-tagging).

## Standing rules reaffirmed
- No Assertions From Memory: deep-read source before asserting any platform fact. Earned its keep
  repeatedly today (caught Code's partial revoke, the PUBLIC-vs-direct grant distinction both ways,
  a money-RPC false alarm, bad proof-set URLs).
- EXECUTE-REVOKE: read proacl first. PUBLIC grant (`=X`) → REVOKE FROM PUBLIC; role grant (`anon=X`)
  → REVOKE FROM anon. (Code saved this to memory.)
- Clean lanes: for a given batch, EITHER chat applies via MCP + backfills, OR Code does — not both.
- git push = Butch only.