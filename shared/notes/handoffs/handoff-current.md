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

REFRESHED 2026-08-01 05:44 local (2026-08-01T11:44Z) FROM THE OPS RAIL — this file IS the living handoff. The rail is canon; this is a snapshot of it.
Regenerate: node scripts/pull-rail.mjs  (from the HONEYCOMB workspace root, or double-click scripts/pull-rail.cmd). Edits here are overwritten — change the rail, not this file.

DOCS ON THE RAIL - latest version per slug
  BOOT_BLOCK      v0.1   2026-07-27 10:46 UTC  Universal boot block — prepended to the MMF and every master snapshot
  GAMES_MF        v0.6   2026-08-01 10:51 UTC  GAMES MASTER FILE v0.6 - TRIV26 half 1 ADJUDICATED after 46 hours: nine rulings sealed, one item left with Butch (3g disclosure) which GATES the build. TRIV8 GAP-A confirmed a THIRD time and finally dispatched as TRIV30
  JMF             v0.5   2026-07-26 21:02 UTC  JUSTICE MASTER FILE v0.5 — day one sealed: commit 08074d0 pushed
  LEAD_PROTOCOL   v0.10  2026-08-01 10:04 UTC  Lead protocol v0.10 - ratifies the apply-authorization rule DB13 had to infer (dispatch names the file and states the rollback); adopts DB12 applied semantics; adds read-back-before-announce
  ORACLE_MF       v0.25  2026-07-31 12:37 UTC  ORACLE MASTER FILE v0.25 - SESSION CLOSE 2026-07-31 midday. Migration drift is 471 orphans + 110 repo-only, not 2 and 5. Plan-vs-purchased tokens ruled. Refunds and pricing direction still open
  ORACLE_OUTLOOK  v0.1   2026-07-27 12:12 UTC  ORACLE OUTLOOK v0.1 — 30,000-foot review: what aged well, what died, and where the moat actually is
  ORACLE_TOS_VERIFv0.2   2026-07-27 14:24 UTC  ORACLE ToS VERIFICATION v0.2 — Llama 3.1 Community License VERIFIED: training-permissive; first fully-clean Western weights path
  VOTE_MF         v0.1   2026-07-26 19:59 UTC  VOTE MASTER FILE stub — cross-astra notices (Karma supersession)

OPEN DISPATCHES - queued + claimed, by priority then age. STALE = claimed over 30 minutes ago; it is a DISPLAY FLAG ONLY and nothing is ever auto-requeued - requeue is a deliberate lead action, so a slow pass is safe and an orphan is loud.
  claimed       db    DB14    p 12               TheMANUAL.tech              DB14 - EFFORT: deep - LIVE PII EXPOSURE ON public.bees: audit every anon-reachable read, then DRAFT the narrowing. APPLY NOTHING.
  queued        db    DB15    p 13               TheMANUAL.tech              DB15 - EFFORT: standard - APPLY DB13 report-headers migration. The FILE and the ROLLBACK are named BY THIS DISPATCH per R7. Then hand-backfill the open rows.
  queued        ops   OPS48   p 14               TheMANUAL.tech              OPS48 - EFFORT: deep - BUTCH RULED BOTH: one checkout surface, two products (Oracle Token packs AND an ORACLE subscription plan). Extend OPS35, do not restart it. DESIGN ONLY, APPLY NOTHING.
  claimed STALE games TRIV29  p 98               .                           TRIV29 — EFFORT: deep — FRANCHISE SPINE (DESIGN + SCHEMA DRAFTS ONLY, STOP FOR LEAD REVIEW): teams, seasons, franchise seats, and the one-state-game Tuesday structure per RULING-406-MODEL

UNREAD BROADCAST MESSAGES - to_handle = all, never read
  2026-07-26 22:35 UTC  from justice: TOMORROW (after ORACLE's morning rail shakeout): sister onboarding package
  2026-07-26 22:38 UTC  from justice: WED/THU (Butch's timing — not before): RAIL_BOOTSTRAP — the portable blueprint (supersedes archived msg)
  2026-07-26 23:13 UTC  from justice: POST-ORACLE EXPERIMENTS BUCKET (run after the rails prove out, any order)
  2026-07-30 23:11 UTC  from oracle: LIVE MONEY DEFECT, VERIFIED TWICE: press_record_payment is replay-unsafe — a Stripe retry double-increments paid_cents. Whoever owns PRESS, this is yours.
  2026-07-31 02:53 UTC  from oracle: LIVE EXPOSURE (DB11): anon can DELETE public.atoms through a non-invoker view — one-statement fix inside; AND justice_dockets_public is one reloption from the same thing

LAST 5 REPORTS
  2026-08-01 11:29 UTC  HB:gTRIV30  TRIV30 - guest identity fix DRAFTED, nothing applied - migration named, rollback verbatim, client-first flag day stated
  2026-07-31 12:32 UTC  ops OPS47   OPS47 - go-by-terminal, agendas and the header BUILT and proven under psql -f. AUTO-CONTINUE NOT BUILT. Zero schema change (terminal + claimed_by already exist). TWO BUGS FOUND IN MY OWN DRAFTS: (1) agenda ran 40,42,41 because lane-stickiness outranked priority - OPS39 resurfacing inside an agenda, fixed by scoping the inversion to the named terminal so pool ordering is untouched; (2) the header showed terminal B working a row A had claimed, because an ANY row carries no terminal and claimed_by is a session id not a terminal letter - fixed by exact match, gap named. Parked block supersedes OPS46 and contains its fix verbatim, since both edit CLAUDE.md 397-410. Root CLAUDE.md untouched.
  2026-07-31 12:09 UTC  ops OPS46-COOPS46-CORRECTION - OPS46 said '.claude/: no matches' and that was FALSE. The sweep tool respected .gitignore, and .claude/ plus backups/ are gitignored, so it reported clean on files it could not open. A plain recursive grep found six more: .claude/settings.local.json:552,556 (psql -c invocations - NOT a defect, -c is where SET LOCAL works, and these are OPS41's own test commands frozen in the allowlist, i.e. the direct evidence the original test never ran on -f) and four backups/*.sql rows inside Supabase realtime PL/pgSQL bodies where SET LOCAL is correct. CONCLUSION UNCHANGED: still no second live -f defect; corrected count is 15 occurrences across 9 files, all inert. Paste block, line range 397-410 and both proofs untouched. LESSON: a gitignore-respecting search is the wrong instrument for a does-this-exist-anywhere sweep - ignored paths are exactly where operational commands and dumps live
  2026-07-31 12:01 UTC  db  OPS44   OPS44 — APPLIED AND FULLY PROBED: 20260731040000_ops_rail_admin_read_v1.sql landed verbatim (sha256 unchanged), rollback recorded BEFORE the apply, all four probe classes match OPS34-Q exactly — anon permission-denied on all three tables, non-admin authenticated ZERO ROWS, admin sees 119/151/57, and even the admin cannot write. ops_messages proven untouched. 50 write grants removed from five rail views (one-way, per lead ruling). PINNED ROLLBACK NOT EXECUTED. DISCLOSURE: I truncated REPORT.md mid-pass (640KB -> 7KB) with a dropped string concat; another terminal wrote into the stub before I noticed; restored by MERGE not overwrite, 78 sections verified, nothing lost, DB never involved — third file-handling failure this session, prevention rule proposed
  2026-07-31 11:57 UTC  db  DB13-Q  DB13-Q - DB12 REVIEWED AND AGREED (its leaky-suffix finding refutes the approach OPS40 used, mine). Proved decisions_owner earns its place empirically: a regex owner-guess got 3 of 4 live rows WRONG and the 4th unanswered. Migration written, ASCII-clean, scratch-applied clean; waiting-on-a-human query demonstrated on production and it surfaces OPS35. APPLY HELD: dispatch names no file and delegates the rollback, the exact pattern the lead corrected in OPS44 one dispatch ago. File name + exact rollback supplied ready to pin. Hand-backfill drafted with quoted sentences - all four are lead, none Butch.
