# HANDOFF — 2026-06-12 — TheTRIVIA.app sprint, Day 1

## SESSION VERDICT
TheTRIVIA.app went from idea to live backend in one day. Venue model
walked + locked (W1–W2 + pricing). P1 security audit CLOSED (100%).

## APPLIED TO PROD (4 migrations, all via MCP, dry-run-first)
1. trivia_venue_layer_v1 — 9 tables (venues/packs/sessions/players/
   answers/teams/members/fixtures/prizes), RLS on, public-read boards
2. trivia_player_path_rpcs_v1 — join/answer/claim/channel_tick;
   SMOKE-TESTED: wake-on-join + 179-pt speed score verified on prod
3. trivia_night_rpcs_v1 — start/night_tick(auto-wrap)/wrap/post_prize/
   mark_fulfilled; owner-pinned; trivia__wrap_session internal/revoked
4. p1_atlasoracle_uid_guards — closed cross-Bee balance/usage disclosure
   in atlasoracle_get_escrow_balance + _check_rate_caps. P1 AUDIT: DONE.

## SEEDED
- Test venue: BUZZ01 "TEST — The Buzz Bar" (owner: butch)
- Question gate v1: status in ('live','validated') = 44 questions

## LOCKED CANON (docs drafted, COMMITS PENDING — see checklist)
- Channel (always-on default) + Night (event) · guest-join-then-claim ·
  patrons never pay · individual speed scoring + table tags (proto-team)
- Three-tier identity: Venue / Team (sponsored|independent) / Bee
- Prizes: venue-fulfilled; in-house = witnessed (no codes); cross-venue
  fixture = claim code + "prizes you owe" console (customer-exchange!)
- League (teams/fixtures/events) = v1.5 post-July-4 re-sell
- Pricing: $99/mo · Founding $49 locked (first cohort) · $999/yr
- TV = thetrivia.app/tv/{VENUECODE} — just a URL
- Repo: TheHoneycomb.games monorepo (Astra pattern), apps/trivia
- Migrations live in TheMANUAL.tech/supabase/migrations (single source)

## BUTCH COMMIT CHECKLIST (GitHub Desktop)
[ ] HONEYCOMB: shared/canon/economy-numerics-wire-rule-v1.md
[ ] HONEYCOMB: shared/canon/thetrivia-venue-v1.md
[ ] TheHoneycomb.games: scaffold commit (Code's message is drafted;
    commit via Desktop — Code was told No on direct commit)
[ ] TheMANUAL.tech: 4 migration repo files (Code writes; Butch commits)
[ ] Code task: copy git deny rule into TheHoneycomb.games
    .claude/settings.local.json

## CODE LANE STATE
Scaffold built + builds clean (Vite/React/TS monorepo, tokens + theme
system ported). trivia.ts RPC layer mid-rewrite w/ exact shapes (was
interrupted by API overload — say "continue"). Next: surfaces in order:
/tv/{code} → join/play loop → Channel → Night console → landing (copy
delivered in chat) → league LAST. RULE: never fetch correct_idx on
public surfaces.

## NEXT SESSION
1. Butch: spine work (solo)
2. W4 WALK — question pipeline: generation from 5,790 atoms via
   source_atom_id · validation gate (bars = zero-wrong-answer bar; what
   do 'validated' vs 'live' formally mean — check Code's Step 0 report)
   · pack curation · volume target (hundreds before July 4)
3. Chat deliverables ready to draft: W4 agenda + 6/29 Stripe live-mode
   product sheet (venue $49/$99/$999, F6 metadata convention)

## OPEN ITEMS / DEFERRED
- #TRIVIA-SPLASH-SIZING — economy sizing for casual venue play
- Statement descriptor lock (lean: THETRIVIA.APP or