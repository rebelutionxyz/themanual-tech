# HONEYCOMB — Handoff

**As of:** 2026-05-19 ~21:00 PT (post-tier-1-cold-storage)
**Resume cue:** Open this file. Run `ogo` hotkey to relaunch into next session.

---

## Current state

**Spine (TheMANUAL.tech):**
- **4892 atoms** across 14 realms + Justice
- **Reference reduced to 2 L2s**: `Standards` (32 atoms) + `Reference works` (15 atoms) — TARGET REACHED
- Human Activities at 10 L2s
- Snapshot table `atoms_backup_2026_05_19` at 5011 rows (30-day Supabase retention)
- RLS + FK integrity verified: 0 orphans across atom_kettle_votes / atom_sources / atom_comments / entity_atom_links / promotions
- Live site: themanual.tech (Railway — was briefly down during session due to Railway-wide edge-network outage, since recovered)

**Canon docs:**
- **MMF is STALE at v2.6** — doesn't reflect post-disposition state
- v2.7 patch spec drafted (`mmf-v2-7-patch-spec.md`) — apply tomorrow per MASTER RULE (compress first)
- All disposition artifacts committed and pushed: commit `956f9c4` on branch `chore/claude-md-no-cd-prefix` (TheMANUAL.tech)

**Backups (4 independent layers now active):**
1. Local disk: `~/Documents/HONEYCOMB/`
2. GitHub: `TheMANUAL.tech` @ `956f9c4` + `honeycomb-ops` @ `82c65c1` both pushed
3. Supabase snapshot: `atoms_backup_2026_05_19` table (30-day retention)
4. **NEW — Physical USB cold storage:** `/c/Users/Butch/HONEYCOMB-backups/2026-05-19_205256` (50 MB, 12 files) copied to jump drive tonight. First sovereign offline backup of HONEYCOMB.

**Backup scripts in place:**
- Tier 1: `~/Documents/HONEYCOMB/honeycomb-ops/scripts/master-backup.sh` (manual; ~5–15 min due to pooler latency)
- Tier 2: GitHub Actions cron in private `honeycomb-ops` repo
- Tier 3: Windows scheduled task, Sundays 09:00 local

---

## What closed this session

1. **Lists disposition pass — fully closed.** 4896 → 4892 atoms net across all phases. Step-3 destructive gate dissolved 67 atoms; Step-5b iterative shell drain removed 21 empty Lists shells; Step-7 resolved final 3 ADJUDICATEs. Reference target of 2 L2s reached.

2. **Adjudication patterns locked as canon:**
   - **"Deletion is not a quality tool — the kettle is."** Curiosities subnodes (bow-tie-wearers, selfie-deaths, unusual-deaths, US-presidents-facial-hair, sexually-active-popes) kept as a class.
   - **Common misconceptions** repathed to `Society / Society concepts` — fits "Show me who got it wrong" manifesto.
   - **DSM codes** repathed under `Health / Mental health / Diagnostic frameworks`.

3. **Tier-1 backup script shipped.** Built, debugged (pg_dump pooler-latency root cause identified — ~200ms/query, ~500 queries = ~100s schema introspection), placed at `honeycomb-ops/scripts/master-backup.sh`, pushed to GitHub at commit `82c65c1`. First USB cold-storage executed tonight.

4. **Repo consolidation.** `honeycomb-ops` moved from `~/Documents/honeycomb ops/` (with space) into `~/Documents/HONEYCOMB/honeycomb-ops/`. Legacy ops scripts (`00_dump_pre_migration.ps1`, `03_seed_atoms.cjs`) archived under `honeycomb-ops/scripts/legacy/`. Empty `TheMANUAL.tech/scripts/` removed.

5. **Terminal config fixed permanently.** Bracketed-paste glitches and history-expansion errors resolved via `~/.inputrc` (`set enable-bracketed-paste off`) and `~/.bashrc` (`set +H`). Multi-line pastes now work cleanly.

6. **Railway outage scare survived.** themanual.tech went down mid-session (Railway-wide edge-network incident, not us); DB confirmed healthy throughout via direct queries. Seeded new planned feature: **INFRA STATUS SLIDER** — make platform dependencies (Railway, GitHub, Supabase) visible in-product.

7. **Anon key was pasted in chat earlier today.** Decision: not rotated (public-by-design, embedded in client bundle, respects RLS). Service-role key + DB password remain clean.

---

## Open queue (prioritized for tomorrow)

**Tier 1 — high signal, contained scope:**

1. **MMF v2.7 sync.** Apply `mmf-v2-7-patch-spec.md` against current MMF. Per MASTER RULE: compress current MMF *before* adding new content. Patch adds: 4892 atom count, Reference 2 L2s, disposition methodology section (5-bucket classifier + tree-completeness rule + integrity-gate discipline + kettle ethos), INFRA STATUS SLIDER planned feature, tier-1 backup script ops entry, version bump v2.6 → v2.7.

2. **Backup scope-limit decision.** Public-only schema test: 39s/186KB vs full schema 93s/330KB. Meaningful for GitHub Action cron (saves Action minutes). Decide whether daily backups should be scoped to `--schema=public --schema=auth` only, or keep full for safety. Recommend: scope the *cron* (frequent runs, latency matters), keep the *manual master-backup.sh* full (rare runs, completeness matters more than speed).

**Tier 2 — medium scope:**

3. **Drill-stack dispatch write-up.** Deep-drill UI bars, queues behind L1/L2/L3 bar dispatch — was queued behind Railway returning (now back).

4. **Investigate `shared/` bulk.** The `shared.tar.gz` is 42M — 84% of last backup's total size. What lives in `~/Documents/HONEYCOMB/shared/` (separate from `TheMANUAL.tech/shared/canon/`)? Likely reference material / screenshots / docs that don't need nightly capture. Decide what to exclude.

5. **Cleanup empty top-level dirs.** `~/Documents/HONEYCOMB/scripts/` (1K tarball) and `~/Documents/HONEYCOMB/docs/` (4K) are essentially empty. Delete or fill.

6. **Branch housekeeping.** `chore/claude-md-no-cd-prefix` now carries the entire disposition canon (way out of scope from its name). Either rename or PR-merge to clean up.

**Tier 3 — parked for bigger sessions:**

7. Bonding curve step-function arbitrage concern (memory pin #30)
8. Patchboard + Connected Accounts schema (#29)
9. Freedom Network §23 timeslot bidding spec recovery (#23)
10. Pillar→Astra code sweep (#3)
11. Step-4 lens conversions on the 23 LENS atoms still in 10 surviving Lists shells (waits for §12 lens mechanism to ship)

---

## Operational reminders

- **MASTER RULE:** Compress master files BEFORE each daily spine-perfection session.
- **Pace rule:** Butch sets pace. No suggestions about timing, energy, rest.
- **Execution split:** Code drives execution; Butch ratifies; Chat reviews. Git push/pull/commit stay with Butch.
- **Backup ritual after major DB change:** Run `bash ~/Documents/HONEYCOMB/honeycomb-ops/scripts/master-backup.sh`, drag latest folder to USB. Each backup is its own timestamp — don't reuse folders.
- **pg_dump quirk pinned:** Schema-only ~1.5 min, full dump 5–15 min via pooler. Not hung when silent — just slow. Be patient.

---

## Resume cue

Tomorrow's first move: read `mmf-v2-7-patch-spec.md`, run MASTER RULE compression pass on current MMF, then apply the patch in order (Phase 0 → 5).
