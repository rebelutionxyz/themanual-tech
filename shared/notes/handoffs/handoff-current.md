# HONEYCOMB — Session Handoff (current)

**Date:** 2026-06-10 (Economy-on / F5 Fountain mega-session)
**Arc:** Close-outs → Go-live → Stage-2 rehearsal → drain-model patch set → Thermostat → Drops/Drips wiring (complete) → tier taxonomy → deficit netting → **F5 Fountain (DB + edge fn, full arc, shipped)**
**Supabase:** `anxmqiehpyznifqgskzc` (prod) · slate certified clean · `total_supply = 0` · Reserve = 111,222,000,000,000,000 (well full) · `economy_integrity_check()` → `ok: true` (now includes conservation invariant)
**Launch:** July 4 2026 soft beta · Sep 11 2026 full Swarm

---

## What this session shipped (9 prod migrations + 3 edge-fn deploys)

### Economy model — DRAIN MODEL (ratified, supersedes Jun-10 04:00 ceiling lock)
- **Reserve is now a true draining balance.** Every freeing decrements it; every sink-to-source refills it. Conservation invariant `reserve + treasury + total_supply = hard_cap` enforced by DB CHECK (`bling_system_state_conservation`) AND folded into the guardian's `ok`.
- All 5 freeing paths converted: `affiliate_distribute`, `issue_newbee_bonus`, `distribute_drops`, `distribute_drips`, `comp_settle` (splash drains; skim refills). `affiliate_clawback` refills the well (was a conservation-breaker post-patch; fixed same session).
- **Affiliate vacancy rule = BUBBLE-UP (ratified):** pool redistributes over OCCUPIED levels by Fibonacci weights 5/3/2/1/1 renormalized; treasury only on a fully empty chain; rounding remainder to nearest occupied level.
- **100% deficit netting (ratified):** `lot_credit` repays `bling_deficit` from every incoming credit before cutting a lot (supply→reserve return, IOU self-extinguishing). New tx type `deficit_repayment`.

### Stage-2 affiliate-freeing rehearsal (run + wiped)
- First real BLiNG! ever freed: $39.98 invoice → 3,558.22 pool, exact Fibonacci split verified; then $19.99 → 1,779.11 ALL to L1 proving bubble-up + drain on the live Stripe rail. Full wipe after; slate re-certified to genesis-identical zeros.
- Rehearsal exposed + fixed: Reserve-ceiling ambiguity (→ drain model), `stripe_events` status CHECK missing `error`/`unresolved` (error path itself crashed → retry storm; fixed), one-active-per-product guard PROVEN (correctly rejected dup membership), Stripe retry self-healing PROVEN (failed event reprocessed after slot freed).
- rehearsal_bee created and fully deleted; chain-immutability guard requires service_role claims to mutate (`set_config('request.jwt.claims','{"role":"service_role"}',true)` — the Chat-lane pattern).

### Thermostat (live values)
- `daily_drops_pool = 89`, `daily_drips_pool = 55` (Fibonacci, ratified). Floating reward-share pools — zero activity = zero freed.

### Drops/Drips wiring — COMPLETE (the 240-min item, closed)
- **TS lane:** `gov_vote` wired in `manual-atom-kettle-vote` **v6** (Code-authored, Chat-deployed). `refFor(kind,id)` helper added to `_shared/ids.ts` (uuid-v5 on HONEYCOMB_NS).
- **Trigger lane (migration `drops_drips_p5_trigger_call_sites`):** thread_original · reply_substantive (gate: body ≥ 100 chars, ratified) · reply_received (any reply → thread creator) · escrow_complete (earner = recipient_id, on status `released`, ratified) · bazaar_offer (listing_type='offer', ratified) · emoji_react · saved. All best-effort (WARN, never break the write), idempotent via `ref_for()` = byte-identical SQL mirror of `refFor` (NOTE: `extensions.uuid_generate_v5` — schema-qualified, Supabase puts uuid-ossp in `extensions`).
- DEFERRED (no surface, no triggers): course_create/complete, atom_merge_cosign, source_submit, atom_curate, source_quality_vote, report_valid, follower, shapes_canon, cited, promotion_targets_atom (schema gap: promoter not tracked), page_view, profile_visit.
- **First real forum thread on the platform earns the first Drop.** Converts at the 00:30 UTC daily close.

### Tier taxonomy — LOCKED
- `membership ∈ drone | worker | guardian | queen` · `oracle ∈ earth | water | wind | fire | ether` (classical elements, dense→subtle). Per-product CHECK `subscriptions_tier_valid` live, cross-product rejection probe-verified. **Stripe Price metadata `tier` must match these lowercase strings exactly** when real Prices are built.
- Provenance: taxonomy was NOT previously locked anywhere in the MMF (only the retired Mar-26 ladder). This is a new lock.

### F5 — THE FOUNTAIN (full arc: DB + edge fn, both live)
- **Decisions locked:** reward = contribution$ × `freeing_multiplier` (89) freed to the CONTRIBUTOR (Howey-safe: fiat buys nothing, BLiNG! is freed) · **0% platform fee** — pure pass-through via **direct charges on the manager's Express Connect account** (Stripe fees borne by manager, platform holds no fiat) · **affiliate EXCLUDED** (triggers remain membership/oracle recurring only) · reward lots stamped `origin='fountain'` + DNA `{campaign_id, campaign_slug, pledge_id}` (sticky per heritage rules).
- **DB (`fountain_f5_db_layer`):** `give_campaigns` + financials (funding_model aon|kwyr, goal/raised/captured cents, manager_connect_account, status += closing/closed_success/closed_failed); `fountain_pledges` (PI-unique, source_ref-unique, Pattern B statuses); 5 service-role RPCs: register_pledge / begin_close (AON/KWYR verdict + worklist, re-entrant) / pledge_captured (frees reward, idempotent) / pledge_canceled / finalize_close. New tx type `fountain_reward`. Full AON lifecycle probe-verified in dry-run.
- **Edge fn `fountain` v1 (ACTIVE, verify_jwt=true):** POST /pledge (Bee JWT; manual-capture PI direct-charged on manager acct; orphan-PI auto-cancel on registration failure) · POST /close (admin-gated; capture/cancel loop, per-pledge failures degrade to capture_failed without blocking siblings; finalize; mid-crash recovery = rerun /close).
- **DARK until go-live:** needs Express Connect onboarding (manager test account) + real campaign rows. Untestable until then.

### Daily integrity cron
- `economy-integrity-daily` @ 01:00 UTC (after 00:30 close) via `run_economy_integrity_check()` wrapper (supplies service-role claim, logs to `economy_integrity_log`, WARNs on failure). Smoke-tested green.

### Go-live block (closed)
- F6 test customer delete blocked by Stripe v2-account UI quirk → **moot**: F6 destination DISABLED (test mode fully firewalled from prod; 0 Bees pinned, slate 0). Legacy FreedomBLiNGs! destination DISABLED. **Deletion of both destination configs + test customers/subs deferred to go-live** (live account doesn't exist yet — will rebuild destinations fresh on live mode).
- F6 has **no livemode guard** (by design for now): enable→rehearse→disable is the operating pattern until live mode exists. Decide at go-live whether to add an env-gated test-event switch.

### MMF / canon (Code-side, this session)
- §5.13 F6 rail merged into `shared/canon/master-master-file-v2-6.md` (next-free confirmed; staging deleted). HONEYCOMB repo: 2 canon files committed by Butch. TheMANUAL.tech repo==live was verified at session start (0 uncommitted).

---

## REPO SYNC — pending Code sweep (dispatch was issued; verify it ran, else re-dispatch)

Backfills to `TheMANUAL.tech/supabase/migrations/` (**9 migrations**, byte-faithful from prod):
1. `economy_drain_model_and_affiliate_bubble_up`
2. `stripe_events_status_check_align_f6_vocabulary`
3. `economy_integrity_daily_cron`
4. `subscriptions_tier_check_taxonomy_lock`
5. `clawback_conservation_and_deficit_netting_100`
6. `fountain_f5_db_layer`
7. `drops_drips_p5_trigger_call_sites`
8. `p5_trigger_hygiene_revokes_and_search_paths`
9. (verify) record_drip 4-arg P3 vs 5-arg P4b — Code confirmed P4b supersedes in-repo; confirm clean db-reset ordering.

Edge fns to pull into repo: `fountain` v1 (new dir) + `manual-atom-kettle-vote` v6 (Chat deployed both). Code's gov_vote TS edits (`_shared/ids.ts`, kettle-vote index.ts) are on disk uncommitted.

MMF inserts: §5.13 amendment (drain model + conservation + bubble-up + netting) · NEW §5.14 (F5 Fountain rail, decisions above) · tier taxonomy lock · Thermostat 89/55 · P5 wiring decisions (substance gate 100, escrow earner recipient, ref_for convention).

**All git commits = Butch via GitHub Desktop.**

---

## Pre-launch security audit queue (from advisor sweep — NOT today's regressions)

- **P1: actor-as-parameter RPCs.** `bling_send(p_sender_id,…)`, `bling_escrow_*(p_actor_id,…)`, `comp_settle`, `atom_create/update/set_status`, `atlasoracle_*` are authenticated-callable SECURITY DEFINER. Verify every body pins to `auth.uid()` (v9.0 security pass likely did; MUST be confirmed before July 4 — impersonation risk if not).
- Leaked-password protection OFF (Supabase Auth dashboard toggle — Butch).
- pg_trgm in public schema; trending matviews API-readable (intentional/public — leave or document).
- `economy_integrity_check` authenticated-callable but internally admin-gated (fine).

## GO-LIVE checklist (carry forward)
- Create Stripe LIVE account; rebuild F6 + (eventually) Fountain webhook/Connect config on live mode; delete test-mode destinations + test customers/subs (incl. Leroy, testaccount).
- Express Connect onboarding flow for campaign managers (Fountain is dark until this exists).
- Real Prices with metadata `{product_type, tier}` matching the locked taxonomy strings.
- Decide F6 livemode/test-event posture.
- Pre-launch security audit (above).
- Enable leaked-password protection.

## Still open (unchanged / parked)
- **Brains Live Room frontend** — the 1200-min Code arc; NOT yet dispatched. Next session's likely monster.
- Ops funding from Treasury (`222,111,111,111`) — end-of-build, gates on Astra count lock.
- Grandfathering + atom-kind taxonomy + 4,860-vs-5,790 atom reconcile — Sunday batch.
- Deferred Drops/Drips surfaces (list above) — wire as surfaces ship.
- `promotion_targets_atom` drip — schema gap (promoter not tracked on promotions).
- Demurrage (deferred phase) · AtlasVOTE Phase 1 walk · Freedom Network timeslot-bidding spec recovery · Phase-2 device-sharing canon doc.

## Chat-lane operational notes (learned today)
- `bee_affiliate_chain` and guardian-style gates: mutate/read via `set_config('request.jwt.claims','{"role":"service_role"}',true)` inside the MCP transaction.
- uuid-ossp lives in `extensions` schema — always `extensions.uuid_generate_v5`.
- Vocabulary-drift class of bug (CHECK constraints vs function string literals) bit twice today (`stripe_events.status`, `bling_transactions.type`); grep the CHECK before introducing any new status/type string.
- Jun-10 ops rule 2 in force: Chat executes everything reachable via Supabase MCP (migrations, deploys, data); Code gets only local-file/git/placement work.