-- ============================================================================
-- OPS33 — ops_build_steps seed v1. ADDITIVE ONLY (INSERT into a table this
-- migration pair just created; nothing pre-existing is touched).
--
-- EVERY step is traceable to a named canon source. Where canon does not support
-- a phase, none is invented — the ruling says seed only what canon supports and
-- leave the rest to their own leads. That is why only `games` and `oracle`
-- appear here: they are the two astras whose master files I read this pass.
--
-- games  sources: GAMES_MF v0.3 §3/§4 (shipped), v0.5 §6 (next, in order),
--                 TRIV4 ratified Night spec, the four-part moat sequence,
--                 MMF §41 house roadmap.  [carried from OPS33-Q half 1]
-- oracle sources: ORACLE_MF v0.16 (pricing + packs), v0.17 (mission control),
--                 v0.18 (heartbeat), v0.19 (free tier), v0.20 (§3 state,
--                 §6 board, §6 NEXT embeddings, §6 watch-list hazards).
-- ops    sources: this dispatch + OPS33-Q's data-gap note.
-- ============================================================================

INSERT INTO public.ops_build_steps (astra, phase_no, phase, step_no, title, dispatch_pass, effort, status, notes) VALUES

-- ══════════════════════════════════════════════════════════════════ GAMES
-- 1 ─ Channel v1: the thing that is live
('games',1,'Channel v1 — live',1,'TV + play surfaces, countdown, bare-code routes','TRIV13','standard','not_started',NULL),
('games',1,'Channel v1 — live',2,'Closed-state hierarchy on the phone','TRIV16','light','not_started',NULL),
('games',1,'Channel v1 — live',3,'TV three-panel cycle, settings-driven','TRIV17','standard','not_started',NULL),
('games',1,'Channel v1 — live',4,'Real countdowns: DB stamps next_deal_at','TRIV19','standard','not_started',NULL),
('games',1,'Channel v1 — live',5,'Screen wake lock during play','TRIV20','light','not_started',NULL),
('games',1,'Channel v1 — live',6,'Cross-device sync + server-corrected clock','TRIV23','light','not_started',NULL),
('games',1,'Channel v1 — live',7,'Nightly channel wrap — leaderboard resets each game','TRIV14','standard','not_started','TRIV14 also carries the lifetime store; close-time default needs a Butch nod'),
('games',1,'Channel v1 — live',8,'Question bank fun-gate + difficulty calibration','TRIV3','standard','not_started','TRIV3: 154 demotes, 78 difficulty fixes, 1 wrong answer key — lists filed, not applied'),

-- 2 ─ Integrity + trust: the answer key, the seat, the name
('games',2,'Integrity + trust',1,'Lock-in phase 2 — answer key off the submit response','TRIV6','standard','not_started','client-first ordering law; SQL applied after deploy'),
('games',2,'Integrity + trust',2,'Claim hardening — ownership proof + device_key lockdown','TRIV9','standard','not_started','3-step deploy: create 2-arg, ship client, drop 1-arg'),
('games',2,'Integrity + trust',3,'@handle picker + signup-handle validation','TRIV15','light','not_started','draft G fixes a LIVE latent signup bug — safe to apply alone, do it early'),
('games',2,'Integrity + trust',4,'Server-authoritative answer timing (GAP-D)',NULL,'standard','not_started','TRIV8 §5 GAP-D / TRIV23 §4: response_ms is client-reported and feeds the speed bonus'),
('games',2,'Integrity + trust',5,'Caller verification on trivia_submit_answer',NULL,'standard','not_started','TRIV8 §5 GAP-A: player id is world-readable and the RPC checks no caller'),
('games',2,'Integrity + trust',6,'trivia_players device_key exposure (RLS narrowing)',NULL,'standard','not_started','TRIV8 GAP-A, re-confirmed open by TRIV26 §2c'),

-- 3 ─ Money rails
('games',3,'Money rails',1,'Free tier vs paid — Channel free, Night gated','TRIV1','standard','not_started',NULL),
('games',3,'Money rails',2,'Clear the venue paid flag on cancellation','TRIV11','standard','not_started',NULL),
('games',3,'Money rails',3,'Stripe keys + F6 venue prices live',NULL,NULL,'not_started','BUTCH — the rail is dark until this lands; every venue reads unpaid'),
('games',3,'Money rails',4,'past_due / unpaid grace ruling',NULL,NULL,'not_started','BUTCH ruling, flagged by TRIV11'),

-- 4 ─ Night v0, single venue (TRIV4 cut line: brackets are later)
('games',4,'Night v0 — single venue',1,'Night mode design, ratified','TRIV4','standard','not_started','the spec of record'),
('games',4,'Night v0 — single venue',2,'Night DB: lifecycle, sweep, schedule RPC, paid gate','TRIV21','deep','not_started',NULL),
('games',4,'Night v0 — single venue',3,'Night client: HostConsole routed, lobby/rounds/wrap','TRIV22','deep','not_started','gated on TRIV21 applies'),
('games',4,'Night v0 — single venue',4,'Single-venue bracket v0',NULL,'deep','not_started','TRIV4 §5; explicitly out of TRIV22 scope'),
('games',4,'Night v0 — single venue',5,'Disputes (games_disputes)',NULL,'standard','not_started','TRIV4 §7/§9'),
('games',4,'Night v0 — single venue',6,'Self-serve venue provisioning','TRIV26','deep','not_started','TRIV26-Q: design done, stopped for lead review'),

-- 5..7 ─ The moat, in order
('games',5,'Moat — cross-venue',1,'Cross-venue fixtures',NULL,'deep','not_started','TRIV4 §6 — design only so far'),
('games',5,'Moat — cross-venue',2,'Team formation beyond table_tag','TRIV29','deep','not_started','RULING-406-MODEL: TEAM before venue self-serve'),
('games',6,'Moat — seasons',1,'Seasons + standings',NULL,'deep','not_started','RULING-406-MODEL: 13 weeks, best 10 count'),
('games',6,'Moat — seasons',2,'Promotion / relegation',NULL,'deep','not_started','RULING-406-MODEL: inert until Division 2 exists'),
('games',7,'Moat — player house',1,'thetrivia.games player house',NULL,'deep','not_started','MMF §41 house-of-houses; wagering quarantined at BLiNGster.org'),
('games',7,'Moat — player house',2,'BLiNG! awards from a pot',NULL,'deep','not_started','TRIV8 §4: bling_pots has NO debit/credit API — shared-economy lane, not games'),

-- ══════════════════════════════════════════════════════════════════ ORACLE
-- 1 ─ Runtime: the router that exists
('oracle',1,'Runtime — live',1,'atlasoracle-route shipped and billable','OPS21','standard','not_started','ORACLE_MF v0.15 billable; v0.20 §3 records v22 ACTIVE'),
('oracle',1,'Runtime — live',2,'First non-Anthropic provider live (Groq)','OPS21','standard','not_started','ORACLE_MF §3: live free model is llama-3.1-8b-instant'),
('oracle',1,'Runtime — live',3,'Retire cost_bling from the runtime','OPS23','standard','not_started','ORACLE_MF v0.14: gone from production'),

-- 2 ─ The token economy
('oracle',2,'Token economy',1,'oracle_token_ledger + balances view (DB8)',NULL,'standard','done','ORACLE_MF v0.16; verified live by OPS35 — append-only by grant, security_invoker view'),
('oracle',2,'Token economy',2,'Rate card + pack pricing ruled and seeded',NULL,NULL,'done','ORACLE_MF v0.16 §5: 1,000 tokens = 1 USD anchor; 4 packs'),
('oracle',2,'Token economy',3,'Purchase flow — checkout + credit webhook','OPS35','deep','not_started','OPS35-Q: design done, stopped for lead review (money code)'),
('oracle',2,'Token economy',4,'Refund / chargeback policy ruling',NULL,NULL,'not_started','BUTCH — OPS35-Q §9 Q1: refund after tokens spent drives balance negative'),
('oracle',2,'Token economy',5,'Paid-tier re-enable (thinking tokens vs TIER_MAX_TOKENS)',NULL,'standard','not_started','ORACLE_MF v0.13 blocker'),

-- 3 ─ Provider matrix
('oracle',3,'Provider matrix',1,'ToS verification + sovereignty supply-chain rule',NULL,NULL,'done','ORACLE_TOS_VERIFIED v0.1/v0.2; ORACLE_MF v0.11'),
('oracle',3,'Provider matrix',2,'Music + audio provider matrix','DOCS9','standard','not_started','ORACLE_MF v0.20 §6: SUNO inadmissible until an official API exists'),
('oracle',3,'Provider matrix',3,'AI persona stack + likeness rights','DOCS10','deep','not_started','ORACLE_MF v0.20 §6: category is real and a year old'),
('oracle',3,'Provider matrix',4,'Embeddings — the uncovered category',NULL,'deep','not_started','ORACLE_MF v0.20 §6 NEXT: the only category that makes ORACLE cheaper, not more capable'),
('oracle',3,'Provider matrix',5,'DOCS4 corrections (Runway storefront, Aleph sunset, Enterprise terms)',NULL,'standard','not_started','ORACLE_MF v0.20 §6: three corrections owed, all in DOCS10 scope'),

-- 4 ─ Live hazards on record
('oracle',4,'Live hazards',1,'Rate-selection semantics proof (7 rows all active)','OPS37','standard','not_started','ORACLE_MF v0.20 §3(a): three rows marked PLACEHOLDER, never a pricing ruling'),
('oracle',4,'Live hazards',2,'Provider-pool truth (lists unwired models)','OPS37','standard','not_started','ORACLE_MF v0.20 §3(b): groq-mixtral and oss-llama-3 are not wired'),

-- 5 ─ Autonomy
('oracle',5,'Autonomy',1,'Mission control shipped (read-only board + spawn)',NULL,NULL,'done','ORACLE_MF v0.17'),
('oracle',5,'Autonomy',2,'First unattended heartbeat, installed disabled',NULL,NULL,'done','ORACLE_MF v0.18: enable-gates named'),
('oracle',5,'Autonomy',3,'Heartbeat enable-gate 1 — claim-only wrapper','OPS36','standard','not_started',NULL),
('oracle',5,'Autonomy',4,'Heartbeat enable-gate 2',NULL,'standard','not_started','ORACLE_MF v0.18 names the gates'),
('oracle',5,'Autonomy',5,'Project mode',NULL,'deep','not_started','ORACLE_MF scope doctrine v0.8: anything an AI can do, consent-gated'),

-- ══════════════════════════════════════════════════════════════════ OPS
('ops',1,'Ops + platform',1,'pull-rail moved to the platform root','OPS28','standard','not_started',NULL),
('ops',1,'Ops + platform',2,'Restore-fidelity trigger fix (justice_dockets)','OPS30','standard','not_started','OPS30-Q: needs a requeue naming the migration'),
('ops',1,'Ops + platform',3,'Build progress panel (this)','OPS33','deep','not_started',NULL),
('ops',1,'Ops + platform',4,'Spawner names the terminal window','OPS32','light','not_started','OPS32-Q: shipped; pass code needs an R2 ruling'),
('ops',1,'Ops + platform',5,'/mc web route on themanual.tech','OPS34','standard','not_started','gated behind this pass'),
('ops',1,'Ops + platform',6,'Claim history on ops_dispatches',NULL,'light','not_started','REQUIRED for honest estimates — see OPS33 data-gap note. NOT done here: this pass is additive-only and may not alter ops_dispatches'),
('ops',1,'Ops + platform',7,'bees table exposure (email/is_admin world-readable)',NULL,'standard','not_started','TRIV26 §2a: anon can read every Bee email, balance and admin flag. Cross-astra, needs its own dispatch');
