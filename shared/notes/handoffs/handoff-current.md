# ⬢ HONEYCOMB BOOT BLOCK — READ THIS FIRST
You are a Claude session joining HONEYCOMB, a multi-astra platform run by one human (Butch) through a coordination system called THE RAIL. This uploaded document is a SNAPSHOT; the rail is live canon — on any conflict, THE RAIL WINS.

WHEN THE HUMAN SAYS "go", "go <handle>", or "read the rail":
1. Connect to Supabase project anxmqiehpyznifqgskzc (the Supabase connector). If unavailable, say so and ask the human to enable it — do not improvise from this snapshot alone.
2. Read public.ops_docs, latest row per slug (max created_at): LEAD_PROTOCOL first (it is the full operating protocol and supersedes this block), then <HANDLE>_MF for the astra named in "go <handle>" (e.g. ORACLE_MF, JMF for justice, VOTE_MF). No handle given → infer from the project name or ask one question.
3. Read public.ops_messages WHERE to_handle IN ('<handle>','all') AND status='unread' — act, then mark read (status='read', read_at=now()).
4. Read the board: public.ops_dispatches WHERE status IN ('queued','claimed').
5. Pull recent public.ops_reports as needed for history.

HANDLES: justice · vote · comms · oracle · waggle · games · all(broadcast). VERBS: the human types "go" in a terminal (a worker claims work) and says "<anything> done" to the lead (pull the newest report and proceed). Leads write dispatches; terminals never do.
This block is ops_docs slug BOOT_BLOCK; regenerate snapshots rather than editing them.

======================================================================

REFRESHED 2026-07-28 19:28 local (2026-07-29T01:28Z) FROM THE OPS RAIL — this file IS the living handoff. The rail is canon; this is a snapshot of it.
Regenerate: node scripts/pull-rail.mjs  (from the HONEYCOMB workspace root, or double-click scripts/pull-rail.cmd). Edits here are overwritten — change the rail, not this file.

DOCS ON THE RAIL - latest version per slug
  BOOT_BLOCK      v0.1   2026-07-27 10:46 UTC  Universal boot block — prepended to the MMF and every master snapshot
  GAMES_MF        v0.3   2026-07-29 00:14 UTC  GAMES MASTER FILE v0.3 — honeycomb-not-hive language sweep applied to v0.2 wording; no substantive changes
  JMF             v0.5   2026-07-26 21:02 UTC  JUSTICE MASTER FILE v0.5 — day one sealed: commit 08074d0 pushed
  LEAD_PROTOCOL   v0.5   2026-07-27 11:05 UTC  Lead protocol v0.5 — per-handle broadcast reads (delta on v0.4)
  ORACLE_MF       v0.19  2026-07-28 00:03 UTC  ORACLE MASTER FILE v0.19 — 2a/3a ruled; free tier semantics clarified: free = FREE PROVIDERS, permanent, near-zero platform cost
  ORACLE_OUTLOOK  v0.1   2026-07-27 12:12 UTC  ORACLE OUTLOOK v0.1 — 30,000-foot review: what aged well, what died, and where the moat actually is
  ORACLE_TOS_VERIFv0.2   2026-07-27 14:24 UTC  ORACLE ToS VERIFICATION v0.2 — Llama 3.1 Community License VERIFIED: training-permissive; first fully-clean Western weights path
  VOTE_MF         v0.1   2026-07-26 19:59 UTC  VOTE MASTER FILE stub — cross-astra notices (Karma supersession)

OPEN DISPATCHES - queued + claimed, by priority then age. STALE = claimed over 30 minutes ago; it is a DISPLAY FLAG ONLY and nothing is ever auto-requeued - requeue is a deliberate lead action, so a slow pass is safe and an orphan is loud.
  claimed STALE ops   OPS22   p100               TheMANUAL.tech              OPS22 — EFFORT: standard — mission control spawn windows open behind the browser (Windows foreground-lock)
  claimed STALE ops   OPS26   p100               TheMANUAL.tech              OPS26 — EFFORT: high — RESTORE FIDELITY: prove the backup restores 100%, not 99% — real Supabase target, the 17 dropped objects accounted for
  claimed       ops   OPS28   p100               .                           OPS28 — EFFORT: standard — MOVE pull-rail to HONEYCOMB root: platform tool out of the JUSTICE folder

UNREAD BROADCAST MESSAGES - to_handle = all, never read
  2026-07-26 22:35 UTC  from justice: TOMORROW (after ORACLE's morning rail shakeout): sister onboarding package
  2026-07-26 22:38 UTC  from justice: WED/THU (Butch's timing — not before): RAIL_BOOTSTRAP — the portable blueprint (supersedes archived msg)
  2026-07-26 23:13 UTC  from justice: POST-ORACLE EXPERIMENTS BUCKET (run after the rails prove out, any order)

LAST 5 REPORTS
  2026-07-28 16:36 UTC  ops OPS27   OPS27 — THREE-REPO CLOSING SWEEP: c1234e7 / 20f76da / a54201b committed, all three pushes parked and holding, 11 runtime artifacts gitignored
  2026-07-28 15:53 UTC  docsDOCS8   DOCS8 — DESIGN: PROJECT MODE — Oracle decomposes a project into tasks and routes each to the right AI, rail-style
  2026-07-28 15:43 UTC  ops OPS26-Q OPS26-Q — it is 23 objects not 17, and 22 are noise: the one real defect (justice_dockets repath trigger) is search_path-caused and a Supabase target does NOT fix it
  2026-07-28 15:31 UTC  ops OPS25   OPS25 — BOTH TIERS GREEN: Tier 3 fixed per Butch option (a) (pooler+pgpass, DPAPI retired, stderr captured) — first success since 2026-05-10, verified atoms 37437/auth.users 18 exact vs live; Tier 2 green+restorable; backup-age panel live; restore test found silent data loss in vanilla PG
  2026-07-28 15:20 UTC  ops OPS25-Q OPS25-Q — Tier 2 GREEN + restorable (172/172 tables, auth exact); backup-age panel live and flagged Tier 3 at 79d on first run; snapshots preserved+hashed; Tier 2 guard hardened (uncommitted, needs sweep). RESTORE TEST FOUND SILENT DATA LOSS: elections_private.config 6 rows -> 0 while psql exits 0. Tier 3 fix needs Butch: (a) pooler+pgpass or (b) re-encrypt DPAPI
