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

REFRESHED 2026-07-27 04:59 local (2026-07-27T10:59Z) FROM THE OPS RAIL — this file IS the living handoff. The rail is canon; this is a snapshot of it.
Regenerate: node atlasJUSTICE.org/scripts/pull-rail.mjs  (or double-click pull-rail.cmd). Edits here are overwritten — change the rail, not this file.

DOCS ON THE RAIL - latest version per slug
  BOOT_BLOCK      v0.1   2026-07-27 10:46 UTC  Universal boot block — prepended to the MMF and every master snapshot
  JMF             v0.5   2026-07-26 21:02 UTC  JUSTICE MASTER FILE v0.5 — day one sealed: commit 08074d0 pushed
  LEAD_PROTOCOL   v0.4   2026-07-26 23:27 UTC  Lead protocol v0.4 — single-statement claim (batch-proof sticky)
  VOTE_MF         v0.1   2026-07-26 19:59 UTC  VOTE MASTER FILE stub — cross-astra notices (Karma supersession)

OPEN DISPATCHES - queued + claimed, by priority then age. STALE = claimed over 30 minutes ago; it is a DISPLAY FLAG ONLY and nothing is ever auto-requeued - requeue is a deliberate lead action, so a slow pass is safe and an orphan is loud.
  (none)

UNREAD BROADCAST MESSAGES - to_handle = all, never read
  2026-07-26 22:35 UTC  from justice: TOMORROW (after ORACLE's morning rail shakeout): sister onboarding package
  2026-07-26 22:38 UTC  from justice: WED/THU (Butch's timing — not before): RAIL_BOOTSTRAP — the portable blueprint (supersedes archived msg)
  2026-07-26 23:13 UTC  from justice: POST-ORACLE EXPERIMENTS BUCKET (run after the rails prove out, any order)

LAST 5 REPORTS
  2026-07-27 10:55 UTC  ops OPS8    pull-rail prepends the live BOOT_BLOCK - every master snapshot boots itself
  2026-07-27 08:13 UTC  ops OPS7    OPS7 — SWEEP overnight close: 15 paths, gates all-zero, staged 15/15, commit 98ccae1, pushed 6a00993..98ccae1, tree clean
  2026-07-27 08:05 UTC  fronFRONT15 FRONT15 — four filtered routes live (/inquiries /class-actions /resolved /archived); sidebar counts now equal cards behind the link; DocketQuery.status seam bug fixed
  2026-07-27 07:51 UTC  ops OPS5    OPS5 — claim is now one atomic statement in both CLAUDE.md editions (v0.4 + NULLS LAST fix); 2 lead findings filed
  2026-07-27 07:40 UTC  ops OPS6    OPS6 — dev-server first aid: corpse killed, relaunched detached under explorer.exe, all routes 200
