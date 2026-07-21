=== HANDOFF — 2026-07-20 (Claude Chat, canon session) ===
Supersedes handoff-current.md dated 2026-07-17. Run `ogo` to resume.

WHAT CHANGED
- MiniWaves v90 → v92 (Jul 17–19): now a standalone app (MiniWAVES.app,
  mini-waves-v92.html, honeycomb-workspace) alongside the in-platform Tasks
  surface — DingleBERRY dual-deploy pattern. New in v92: calendar (Day/Week/
  Month), task time fields + alarms, multi-stop routing (Google Directions URL
  chaining), real file uploads via IndexedDB (50MB disk-backed blobs, metadata
  in export), audio as 4th attachment kind, contacts as 3rd holder, drag-to-
  reorder w/ persistence. Bench: 54 suites / 384 assertions green.
- MMF brought to v2.8 — ~6 weeks of canon catch-up. Commit as
  master-master-file.md; also seed the new Google Drive Doc (workflow note below).

DECISIONS LOCKED (all 2026-07-20)
- WAVES surface → display "TASKS" (provisional; slug `waves` unchanged).
- Waggle split: (1) DingleBERRY dispatch → renamed "the Sting"; (2) Waggles.app
  → COMMS (encrypted-messaging standalone); (3) gig/need marketplace stays live,
  moved under Pro Services (atlasINDUSTRY/PRODUCTION) — "completing Waggles" →
  "completing a Pro Services job"; NOT merged into BAZAAR (prior claim corrected);
  (4) FinalWaggle / The Last Waggle untouched (separate product).
- TheTrivia owns BOTH thetrivia.app (B2B venue product) + thetrivia.games
  (player house). Two-face split is canon.
- TheHoneycomb.games = games umbrella (§41). Houses: TheTrivia.games (active),
  BLiNGster.org (18+ wagering, domain-level), TheHouseofCard.games (reserved/TBD),
  TheBEE.Games (reserved/empty). Supersedes old "THE BEE GAMES / two houses".
- COMMS is a standalone app now (Waggles.app), dual-deploy §7.4.
- New canon: §39 TheTRIVIA, §40 /press, §41 TheHoneycomb.games; §19.11 snapshot.

FOLLOW-UPS QUEUED
- House of Card: define its role (reserved/TBD in §41).
- Drive workflow: set up master-file Doc + handoff Doc in Google Drive.
- COMMS standalone app (Waggles.app) not built yet — planned.
- TheTRIVIA Stripe: blocked on Butch's keys (VENUE_PRICE_*/CHECKOUT_*_URL +
  test STRIPE_SECRET_KEY). Runbook: stripe-activation-runbook-2026-07-10.md §B.
  Then commit + deploy thetrivia.app.
- TheTRIVIA SECURITY: trivia_answers public SELECT leaks the answer key once
  answered — RLS tightening, its own gate.
- Minutemen stays a Security-group Astra (Path B) — NOT the gig marketplace.

NOTES FOR NEXT CLAUDE
- Canon-of-record = master-master-file.md in git. Drive Doc is a live-read
  mirror; for surgical edits still drop the raw .md in-session (Doc round-trips
  mangle exact find-and-replace).
- Two-lane: Chat = strategy/canon/Supabase MCP; Code = local files/git via Butch.
  Confirm, never guess. Paste-only dispatches.
- MMF footer reconciled to v2.8 (was stale v2.5/v2.2). Keep current on bumps.
=== END HANDOFF ===