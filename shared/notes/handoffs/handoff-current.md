# HONEYCOMB — Handoff

**As of:** 2026-07-17 — THE ASTRAS SWEEP, COMPLETE — all six surfaces (see dated block at the end)
**Resume cue:** Open this file. Run `ogo` to relaunch into next session. Next build thread: Butch's pick — Stripe activation (unblocks four gates) or platform media (2026-07-17 block below has both briefs).

---

## Current state — TheTRIVIA.app (Session 2026-07-10)

**Build — uncommitted tree, Butch commits via GitHub Desktop.** Umbrella:
`feat(trivia): venue spine frontend — TV + player path + host console`.

- **Frontend spine written + typechecked** (apps/trivia): `/tv/{CODE}` TV
  surface (Channel idle/wake, question, reveal, standings, Night wrap — muted-TV
  A4 compliant), `/play/{CODE}` player path (guest-join-then-claim, speed
  scoring, claim banner at wrap), host console (owner sign-in, start/wrap Night
  with A2 scoring-mode pick, prizes owed). Polling, not Realtime — trivia tables
  aren't in the `supabase_realtime` publication.
- **lib/trivia.ts bug fixed:** RPC wrappers passed unprefixed arg names; every
  SQL arg is `p_`-prefixed — the old wrappers could never have matched. All
  wrappers rewritten against `pg_get_functiondef` from prod and smoke-tested
  live on BUZZ01 (join → tick → Monet question → correct answer +181 pts).
- **Home carries the venue pitch** ($49 founding / $99 / $999 plans, firewall-
  compliant copy) — Stripe domain review needs the live site to describe the service.
- **Awaiting Butch:** commit + deploy thetrivia.app (SPA fallback for /tv, /play),
  then Stripe account activation with that domain.

**Ratified + APPLIED same session (Butch approved in-chat):**
1. Migration `trivia_reveal_rpc_v1` — time-gated TV reveal RPC. Verified live
   (returned correct_idx for the smoke question after window close).
2. Migration `stripe_rail_f6_venue_product_type` — F6 taxonomy extended
   (product_type 'venue', tiers founding/standard; subscription_sync +
   affiliate_on_payment guards widened). Constraint verified on prod.
3. `stripe-subscription-webhook` v4 deployed — accepts 'venue', links
   trivia_venues.subscription_id from checkout metadata after sync.
4. `venue-checkout` v1 deployed (verify_jwt on) — Checkout Session for
   founding/standard/annual plans; price ids via env, metadata pins
   bee_id + venue_id. NOT yet configured: VENUE_PRICE_* / CHECKOUT_*_URL
   secrets and STRIPE_SECRET_KEY (test) — needs Butch's Stripe keys.

**Open flags:**
- SECURITY: trivia_answers public SELECT leaks the live answer key once anyone
  answers correctly (noted in supabase-proposed/trivia_reveal_rpc_v1.sql).
  RLS tightening = its own decision gate.
- Stripe sequence from here: `shared/notes/stripe-activation-runbook-2026-07-10.md`
  → section B (test-mode products/webhook/secrets) onward. A Stripe MCP
  connector was suggested in-session so Code can drive test mode directly.

---

## Current state — FreedomBLiNGS (Session 2026-06-16/17)

**Build — uncommitted tree, Butch commits via GitHub Desktop.** Umbrella:
`feat(freedomblings): July 4 soft-beta read surfaces + live GIVE`.

- **Live for July 4 soft beta:** read surfaces — Standing, Lineage, Earning,
  Circulation, The Ledger, The Open Books, The Charter — plus the live **GIVE**
  action (move page is GIVE-only; sidebar entry renamed "Give"). Gradations
  present but Stripe-gated.
- **Built but gated → September:** Escrow (`EscrowPage` + `escrow.ts` — live
  reader + Release/Dispute on auth-pinned RPCs; unrouted, no in-product create
  flow yet) and the GET/OFFER tabs. Commons, Legacy/Retirement, Safety net
  (Emergency Fund) nav links commented out (deferred → Aug–Sep). For Business /
  Go Dark were never in nav.
- **Onboarding/guardians (#8) PARKED → possible Aug–Sep build.**
  Guardians/social-recovery has **ZERO DB backing** (no table/RPC/column) — a
  backend build, not a port. The newbee grant (`issue_newbee_bonus` → frees
  2,500 BLiNG! once from reserve) exists in the DB but is intentionally **NOT
  wired to fire**. The design's "self-held keys" identity line is false vs the
  real model (Supabase auth + a handle, RLS-private).
- **Schema:** `schema-v8-bling.sql` `bling_escrows` block reconciled to current
  prod (`numeric(24,6)`, kind/status enums, timelock + timestamp cols) + a
  "source of truth = `supabase/migrations/*`" header note. Doc-only, no migration.

## Canon locked this session (see economic constitution §7)

- **Demurrage flattened → flat 3% / OG Founders 2.5%** (supersedes 8/5/3/1 tiering).
- **Emission cadence → 6-year, multiplier M 89→1 by year 54** (supersedes 4-year).
- **Two constitutions** — FreedomBLiNGS Charter (economic, Jul 4) + a separate
  HONEYCOMB platform Constitution dated one day later (future build).

## Carry-forward

- The v3 whitepaper still shows the old tiered demurrage, and
  `economic-model-lock-2026-06-07.md` still shows the 4-year cadence — both need
  the same supersession on a later pass.
- **Stripe activation = the one hard external blocker for July 4.**

---

## Operational reminders

- **Pace rule:** Butch sets pace. No suggestions about timing, energy, rest.
- **Execution split:** Code drives execution; Butch ratifies; Chat reviews. Git
  push/pull/commit stay with Butch.
- **MASTER RULE:** Compress master files BEFORE each daily spine-perfection session.
- **Backup ritual after a major DB change:** run
  `honeycomb-ops/scripts/master-backup.sh`, drag the latest folder to USB (each
  backup is its own timestamp — don't reuse folders).

---

## Resume cue

Next session: confirm the FreedomBLiNGS stack committed (umbrella above), then
Stripe activation for July 4 — or pick up onboarding/guardians (#8) as a backend
build. Per MASTER RULE, compress master files before any spine work.

---

## 2026-07-10 — MiniWaves shape session (Fable/Cowork)

**Shipped V77→V90 in one day** (all in `TheMANUAL.tech/public/mini-waves-v*.html`, iframes point at v90):
persistence + Vessel resequence (V77) · Vessel dropdown + singular labels (V78) · templates + empty-hide (V79) · names-not-levels + bottom filters (V80-82) · Motion dropdown + Mode of Operations + icon-only chrome (V83-84) · topography standard + vessel lens + ALL header (V85) · LEDGER + search dive (V86) · overlay windows + samples-on + ? help (V87-89) · loaded fake everything + ⚡Net catch box (V90).

**Platform same day:** landing gate (login-only front door, fnulnu → role cascade → /miniwaves), /miniwaves + Tasks-popup routes, six-week branch merged to main + deployed. Locks: Beeing (glossary), everything-free economics (AtlasOracle = revenue), report cadence (CLAUDE.md).

**Docs:** `shared/pillar-specs/miniwaves-fable-review-2026-07-10.md` (build plan + addendum) · `shared/notes/architecture-verdict-2026-07-10.md` (monolith verdict, worktree cleanup, Lock 8 next) · `miniwaves-layout-lab.html`.

**Next:** COMMs session (Butch). MiniWaves Stage 1 remaining: post-to-depth from NODE modal, node CRUD, CSV export on LEDGER. Archive zip: `archive/miniwaves-v76-v90-2026-07-10.zip`.

---

## 2026-07-16 — INTEL menu completion + RebelUtion branding (Fable/Cowork)

**Shipped in one day** (Butch committed batches through the session; Railway deploy on his push):

- **INTEL sidebar finished:** Bookmarked live (`/intel/saved`, entity_saves + badge) · real Notifications center (`/notifications` — list / mark-read / dismiss RPCs, unread badge, forum deep-links) · Reported verified · **Following LIVE end-to-end** (FollowBeeButton on thread authors → bee_follows → Following feed; smoke-tested).
- **Migrations ratified in-chat + APPLIED to prod:** `bee_follows_v1` (+ `v1a_revoke_anon`) — bee→bee follow graph, own-edges RLS, SECDEF follow/unfollow RPCs, first-follow notification. `ui_branding_v1` — `ui_theme_config.branding` jsonb + admin-only UPDATE policy. Repo migration files match prod exactly.
- **De-SOONed the tail:** Creators Studio (`/studio` — Workshop section: manage threads/replies/video posts on the deployed pulse_* creator RPCs) · Premium (`/premium` — locked ad-relief ladder $0/$3/$8/$13 Royal Jelly, live membership read; DONATE gated on Stripe activation) · Business (`/business` — X-Premium-Business-style org hub, firewall copy) · Advertise (`/promotion` — real page: Boost + atlasADs console preview + slots + no-surveillance promise) · Settings re-skinned. **Every tail page renders inside the white community shell** with correct tail highlighting; mobile sidebar auto-closes on any pick.
- **RebelUtion branding, HQ-editable:** Norwester wordmark (Rebel-[red U]-tion + true-lowercase `.app` suffix in sans), fist emblem logo + favicon. All of it edits live from **HQ → Branding** (wordmark segments, accent hex, logo/favicon URLs; defaults baked in `src/lib/branding.ts`). Font vendored `public/fonts/` (OFL). Brand lockup is NOT a home link.
- **Black shell (backend / theMANUAL):** TopToolbar + its breadcrumb strip removed from render (component file kept — one line in App.tsx restores) · BLiNG! pill out of the header cluster · HQ title + `admin:` line moved into the HQ section sidebar, full-width header deleted. **`/hq` now gates on `bees.is_admin`** (OGOnly handle-allowlist removed). ⚠️ `is_admin` lives on **@butch**, not @fnulnu — flip the flag if fnulnu needs HQ.
- **BLiNG! SEND polish:** popup label "SEND TO", button reads `Send {amt} BLiNG! to {user}`, fee-free info box stripped (popup + Move page).
- Ops: `_claude_tmp/` gitignored at HONEYCOMB root (Cowork file-shuttle scratch — never commit).

**Next: the astras sweep** — finish each surface the way INTEL was finished (own sidebar items live, feeds real, SOONs resolved). One surface per session, easiest-first so wins compound:
1. **UNITE (Groups)** — its Following can reuse `bee_follows` nearly verbatim
2. **RULE (Events)** — same pattern + Hosting/Attending polish
3. **GIVE** — campaigns live in DB, mostly wiring
4. **PULSE** — pairs with the new Creators Studio; LiveKit bits stay gated
5. **COMMS** — newest, self-contained, least to do
6. **BAZAAR** — last; order flows want the Stripe/fiat rail settled first

---

## 2026-07-17 — The astras sweep, COMPLETE (Fable/Cowork)

**All six surfaces finished in one overnight run** (UNITE → RULE → GIVE → PULSE → COMMS → BAZAAR), each to the INTEL standard. Every migration ratified in-chat → applied → impersonation-smoke-tested on prod (test writes rolled back). Files written straight into `TheMANUAL.tech` over the device bridge, byte-verified; Butch committed per-surface (umbrellas: `feat(unite): group profiles — cover/avatar, tabs, albums, group events` · `feat(rule): event host controls — cover, edit, cancel/restore` · `feat(give): campaign pages — create, covers, detail, gated donate` · `feat(pulse): watch + channel surfaces — player, claims ledger, comments, creator rail` · `feat(comms): leave conversation + gated Rooms/Roulette presence` · `feat(bazaar): my OFFERs + listing photo uploads`).

- **UNITE:** WoWonder-style group profiles — cover + avatar (real upload), owner Edit (name/tagline/description/visibility), toolbar tabs Activity / Forums / Events / Images / Videos(SOON→PULSE) / Members. Photo albums live (members upload, mods delete). Group events wired end-to-end (event_create parenting + listEventsByGroup already existed, just surfaced). CreateGroupModal re-skinned white/purple. Migrations: `groups_profile_v1` + `group_media_storage_v1` — the NEW **`group-media` bucket** (public, 10MB, images-only): the platform's first client-upload rail. **Group-follow edge stays dead deliberately** — Watch/bookmark covers affinity; revive the archived migration when a consumer exists (e.g. announce-to-followers).
- **RULE:** EventPage re-skinned white + profile treatment (cover w/ host upload, host chip, "Hosted in {group}" link). **Host controls born:** `event_update` + `event_cancel` RPCs (edit via the create modal in edit mode; cancel ↔ restore two-tap; CANCELLED banners/chips; muted list cards; RSVP + virtual link hidden when cancelled). Migration: `event_host_v1` (status + cover_url cols, 2 SECDEF RPCs, storage policy). Debt flag: `event_rsvp` doesn't itself refuse RSVPs on a cancelled event (client-gated) — editing that live RPC body is its own gate.
- **GIVE:** campaign creation LIVE in **awareness mode** (funding_model null — the create RPC requires a Stripe Connect account for funded campaigns; funding attaches later via `set_funding`, and self-locks once pledges exist). Mine view; discover cards now navigate; `/give/{slug}` detail page NEW (cover upload, progress bar, model/status chips, deadline, discussion threads on surface 'give', manager cancel — server refuses once pledges exist). Donate button honestly gated on the fiat rail. Migration: `give_campaign_profile_v1` (cover_url + creator-only `set_cover` RPC + storage).
- **PULSE (deepest pass):** WatchPage 43-line stub → full surface: **video player for recording_url VODs**, LiveKit-gated live box, channel strip (follow + gated Nectar), **claims ledger** (pin / attach source / dispute / withdraw — the truth layer, live), comments (post/remove-own). ChannelPage stub → banner/avatar profile with Live/Upcoming/Videos + owner rail. **Creator flows born:** create/edit channel (PULSE home CTA), schedule broadcast, **publish video by external URL — creators fully operational today; only live streaming waits on LiveKit.** Migration: `pulse_channel_media_v1` **+ `v1a` fix** — unqualified `name` in the v1 policy bound to `pulse_channels.name` instead of `storage.objects.name` (the only lookup table with a `name` column; smoke caught it, other policies verified immune). Qualify `objects.name` in every future storage policy.
- **COMMS:** Leave conversation wired (RPC existed, nothing called it — two-tap in thread header, DMs + groups); Rooms + Roulette get gated SOON presence in the panel. No migration.
- **BAZAAR:** **My OFFERs** tab on Orders (bazaar_my_listings / bazaar_cancel_listing were fully unwired — sellers could never see or withdraw a listing); **Upload photos** on the new-listing form (uploader-keyed `bazaar/{bee_id}/…` path — photos precede the listing, URLs land in image_urls). The BLiNG! GET order flow (purchase → shipped → received) was already live end-to-end; fiat checkout stays gated. Migration: `bazaar_media_v1`.

**Storage architecture (settled this session):** `group-media` is the community media rail — path families `groups/` `events/` `campaigns/` `channels/` `bazaar/`, each with its own scoped INSERT policy; bucket-wide uploader rules handle replace/delete. Zero storage policies existed before this session.

**Next — Butch's pick:**
1. **Stripe activation** — the one key that unlocks four gates at once: GIVE funding + donations, BAZAAR fiat checkout, Premium DONATE, TheTRIVIA venue plans. Runbook: `shared/notes/stripe-activation-runbook-2026-07-10.md` §B onward.
2. **Platform media** — image attachments on forum threads/posts (INTEL + group discussions want it; unlocks the UNITE Videos tab pattern too). It's a platform-wide rail, not a surface pass.