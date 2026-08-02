## OPS54 - THE HARMONIZATION REGISTER. 24 rows, 18 CHECK vocabularies traced, 8 meanings of "tier". REGISTER ONLY - ZERO FILES CHANGED.

Lane `docs`. Workdir `TheMANUAL.tech`. Scope: none stated (register is read-only by instruction).
Effort: deep.

**Nothing was fixed. Nothing was renamed. No constraint, doc, migration or line of code was
touched.** The one file this pass writes is this one, which R6 puts permanently in scope.

### W-1 - WHO OWNS THE NEXT MOVE

**Owner: BUTCH, for three decisions. Everything else is a lead dispatch off this register.**

1. **R1/R2/R3 (SECURITY).** The permission layer still does not implement R7, one day after
   LEAD_PROTOCOL v0.14 said it was fixed. Neither settings file on disk matches v0.14's stated
   counts. `git rebase`, `git clean`, `git restore`, `git filter-branch`, `git remote`,
   `git push -f`, `git push --delete` and `git reset HEAD~` are all currently unblocked, and
   `git checkout` is explicitly ALLOWED against an R7 that explicitly denies it.
2. **R4/R5 (MONEY).** ORACLE_MF v0.31 locks free to Haiku and caps it at 15-20 msgs/day. Production
   serves free on Groq llama and caps it at 50/day. One of the two is wrong and it is a pricing call.
3. **R19 (DATA-LOSS).** Three edge functions run in production with **no source in the repo**, and
   one of them takes money (`venue-checkout`).

### THE PRINCIPLE, RESTATED FROM WHAT I FOUND

The dispatch says any fact written twice will drift. Twenty-four rows say something sharper:
**the copies that drifted are the ones nobody executes.** claim.sql drifted because it is denied at
the project permission layer, so it never runs. `atlasoracle_provider_pool` drifted because no code
reads it. `ops_reports.outcome` drifted because R3's INSERT does not write it. `atoms.band` is a
vocabulary with zero writers. Where a second copy is *exercised* - the directive-category list, the
plan-tier list, the entry-type list - it agrees, because a disagreement would have thrown.

So the cheap screen is not "how many copies?" It is **"which copies are never executed?"** Those are
the ones already wrong.

---

### SEVERITY: SECURITY

#### R1 - Which git operations are permitted

| | |
|---|---|
| **Fact** | The set of git subcommands a session may run |
| **Written in** | (a) `HONEYCOMB/CLAUDE.md` R7 prose; (b) `~/.claude/settings.json` allow/ask/deny; (c) `HONEYCOMB/.claude/settings.local.json` allow/deny; (d) `ops_docs` LEAD_PROTOCOL v0.14 C-1/C-3, asserting it was fixed 2026-08-02 |
| **Authoritative** | The settings files. A permission layer is the only thing that can actually stop a command; R7 is the spec, not the mechanism. This is v0.14's own C-2. |
| **Agree today** | **NO.** |
| **Severity** | **SECURITY.** R7 calls history rewrite "impossible". It is not. |

Evidence:

- `~/.claude/settings.json` (mtime `Jul 29 09:13` - **four days before v0.14**) allows
  `Bash(git checkout*)` and `Bash(git branch*)`. R7 denies `checkout` by name.
- That file's entire deny list is five entries: `git push --force*`, `git reset --hard*`,
  `rm -rf *`, `Read(**/.env*)`, `Read(**/secrets/**)`. Of R7's twelve denied patterns, **two** are
  denied. Unblocked today: `git push -f`, `git push --delete`, `git reset HEAD~`, `git rebase`,
  `git clean`, `git restore`, `git filter-branch`, `git remote`, and `git -C`.
- `HONEYCOMB/.claude/settings.local.json` still carries **the four explicit `git -C` allow entries
  v0.14 C-1 named** (lines 8-11), and has **no `ask` array at all**. Counts: allow ~558 / ask 0 /
  deny 9. v0.14 C-3 says the rewrite is allow 75 / ask 6 / deny 41. **Neither file on disk is the
  v0.14 file.**
- Clear: `apply_migration` and `execute_sql` are absent from both allow lists. Every
  `mcp__claude_ai_Supabase__*` entry present is read-only. C-1's migration finding is genuinely fixed.

**Fix shape (derive, do not synchronise):** R7's deny list should be *generated* into the settings
file, or settings should be the only statement and R7 should cite it. If neither, the runnable check
is a read-only script that parses both settings files and asserts every R7 pattern appears in a deny
array - wire it into the SWEEP gate, where it runs by itself.

#### R2 - "Never read .env"

| | |
|---|---|
| **Written in** | `CLAUDE.md` Secrets section (rule, and it names its own backstop); `~/.claude/settings.json` deny `Read(**/.env*)` |
| **Authoritative** | The deny entry |
| **Agree today** | **NO, partially** |
| **Severity** | **SECURITY** - a credential in the transcript is a leak |

The deny covers the **Read tool only**. `Bash(cat *)` is allowed at the user layer (line 23) and
`Bash(cat)` at the project layer (line 83). `cat .env` is therefore permitted. CLAUDE.md's stated
backstop does not backstop.

**Fix shape:** do not add `Bash(cat *.env*)` - that is a third copy of the same rule and the next
shell verb (`head`, `less`, `node -e`) escapes it. Derive: a `PreToolUse` hook that inspects the
resolved path for *any* tool covers Read and Bash from one home.

#### R3 - Whether the heartbeat claim wrapper may run

| | |
|---|---|
| **Written in** | `~/.claude/settings.json` **allow** `Bash(TheMANUAL.tech/scripts/heartbeat/claim.cmd*)`; `HONEYCOMB/.claude/settings.local.json` **deny** `Bash(*claim.cmd*)` and `Bash(*heartbeat*)` |
| **Authoritative** | The deny - deny always wins |
| **Agree today** | **NO** - the two layers state opposite intents about one command |
| **Severity** | Correctness, security-adjacent |

OPS19/OPS36 built `claim.cmd` *specifically* so a narrow grant could exist instead of
`Bash(psql*)`. The project layer then denied it. Consequence: the heartbeat path is dead, nobody
executes `claim.sql`, and that is exactly why it drifted (R11).

The same file is full of this: `Bash(powershell*)`, `Bash(*tasklist*)`, `Bash(*wmic*)` are denied
while ~15 allow entries invoke `wmic` and `tasklist`. Those allow entries are dead text. This is
v0.14 C-3's "an unreviewable file is an insecure file", still true.

---

### SEVERITY: MONEY

#### R4 - What serves the free tier, and what it costs

| | |
|---|---|
| **Written in** | (a) ORACLE_MF **v0.31** LOCK: "FREE = HAIKU ONLY"; (b) `atlasoracle-route/index.ts` `TIER_PROVIDER_MODEL.free = 'claude-haiku-4-5'` **and** the OPS21 ladder that puts Groq `llama-3.1-8b-instant` **first**; (c) `oracle_model_rates` - **two ACTIVE rows with tier='free'**, llama and Haiku; (d) `src/lib/atlasoracle/client.ts` `mockResult` returns `'claude-haiku-4-5'` for free; (e) ORACLE_TOS_VERIFIED v0.2 (the llama licence clearance) |
| **Authoritative** | The router. It is what calls a provider. |
| **Agree today** | **NO** |
| **Severity** | **MONEY** |

v0.31 is dated 2026-08-01; OPS21 shipped the Groq rung 2026-07-28. Under v0.13 C-3 (newer wins) the
lock **retires a rung that is live in production**. Worse, the lock's arithmetic is stated entirely
in Haiku terms - `$1/$5` per MTok, "~$4,200/mo at 14k users" - which is the number that motivates the
cap, while the model that actually serves free costs **33.9x less** by this same doc set's own
measurement (`oracle_model_rates.source_note`, OPS21).

So the lock is either being violated, or it was written against a cost model the code had already
superseded - and **its daily-cap figure was derived from the wrong denominator either way.**

**Fix shape:** v0.31 needs one sentence naming the ladder. Then derive - see R6.

#### R5 - The free-tier daily cap

| | |
|---|---|
| **Written in** | ORACLE_MF v0.31: "HARD DAILY MESSAGE CAP (target 15-20 msgs/day)... BUILD: enforce the daily cap server-side"; `atlasoracle_check_rate_caps()` plpgsql literals |
| **Authoritative** | The RPC - it is the gate |
| **Agree today** | **NO** |
| **Severity** | **MONEY** - this is the exact bleed v0.31 exists to prevent |

Ruled: 15-20/day. Enforced: `v_tier_per_day := 50` for free, `v_combined_per_day := 250`. A free Bee
can legally send **50 free directives a day**, 2.5x-3.3x the ruled ceiling. There is also **no
`ops_build_steps` row** for the cap, so the ruling is not tracked as outstanding anywhere.

**Fix shape:** the cap belongs in data, not in a plpgsql literal. A `tier_caps(band, window, limit)`
table the RPC reads makes re-ruling an UPDATE, and lets ORACLE_MF cite a row instead of restating a
number. That also makes a disagreement *checkable*, which it currently is not while the ruled figure
lives only in prose.

#### R6 - Which providers the router may use

| | |
|---|---|
| **Written in** | `atlasoracle_provider_pool` (5 rows) vs `atlasoracle-route` `TIER_PROVIDER_MODEL` + `GROQ_FREE_MODEL` |
| **Authoritative** | Intended: the table. Actual: the code. |
| **Agree today** | **NO - and the table is not read at all.** |
| **Severity** | **MONEY / correctness** |

`provider_pool` appears nowhere under `supabase/functions/`. The table names two models that do not
exist in the runtime (`groq-mixtral`, `oss-llama-3`) and **omits the one that actually serves the
free tier** (`llama-3.1-8b-instant`). Its `provider_category` values are a fourth "tier" vocabulary
(R14).

A table that looks like configuration but is decoration will eventually be edited by someone who
believes it changes routing. `ops_build_steps` already carries "Provider-pool truth (lists unwired
models)", dispatched as OPS37, currently `blocked`.

**Fix shape:** wire it (router reads the pool by category, falls back to the pin) **or** set
`active=false` and comment the table as historical. Do not leave a third state.

#### R7 - Oracle Token rate per model - THE MODEL ROW

| | |
|---|---|
| **Written in** | `oracle_model_rates` (7 rows, 4 active) + the router's rate lookup |
| **Authoritative** | The table |
| **Agree today** | **YES**, with one latent caveat |
| **Severity** | MONEY (latent only) |

**This row is in the register as the pattern the other twenty-three should copy.** Prices are data,
not code. The router **refuses rather than guesses** - a missing rate is a 503. History is preserved
by `active` + `effective_from`, so a debit can be re-derived against the rate that was live when it
happened. Each row's `source_note` carries the ruling that set it. Re-pricing is an INSERT, not a
deploy.

Caveat: two ACTIVE rows share `tier='free'` (different `model_name`). The lookup keys on
`model_name`, so there is no ambiguity **today** - but `oracle_model_rates.tier` is a fifth meaning
of "tier" and invites a future lookup by tier that would be ambiguous, silently, on the money path.

**Fix shape:** partial unique index on `(model_name) WHERE active`, and rename the `tier` column
`quality_band` (R14).

#### R8 - The oracle plan vocabulary: scout / oracle / sovereign

| | |
|---|---|
| **Written in** | (a) `oracle_token_plans_plan_tier_check`; (b) `subscriptions_tier_valid` oracle branch; (c) `oracle-checkout/index.ts` - reads the **table**, correct; (d) `oracle-webhook` pass-through; (e) migration `20260801164922_subscriptions_tier_widen_oracle_scout_sovereign.sql`; (f) ORACLE_MF prose ("Scout ($9)") |
| **Authoritative** | `oracle_token_plans` - it carries price and token grant; the CHECK is a copy |
| **Agree today** | **YES** |
| **Severity** | **MONEY, proven-recurrent** |

They agree because **the drift already happened once and was paid for by that migration**. Two
separate CHECKs over one list is precisely the shape that made a schema change necessary to ship a
price list.

**Fix shape:** replace the oracle branch of `subscriptions_tier_valid` with a reference to
`oracle_token_plans.plan_tier` (FK, or a trigger-checked lookup), so widening the plan list widens
the subscription constraint for free.

#### R9 - Which webhook owns an oracle subscription

| | |
|---|---|
| **Written in** | `oracle-checkout` header RULE; `stripe-subscription-webhook` line 79 guard; `oracle-webhook` `isOracle()` |
| **Authoritative** | The comment states the invariant; the two functions are the mechanism |
| **Agree today** | **PARTIALLY - the invariant holds only by an ABSENCE** |
| **Severity** | **MONEY** - the named symptom is a paying Bee with no Tokens |

`stripe-subscription-webhook` explicitly **accepts** `product_type='oracle'`. Nothing breaks today
only because no Stripe Price object carrying that metadata exists. That absence is enforced by a
comment.

The comment is also already decaying: it cites `index.ts:48` and a two-value list; the real line is
**79** and the list has **three** values (`venue` was added 2026-07-10). A load-bearing comment whose
pointer has gone stale is one edit from being ignored.

**Fix shape:** make the absence a mechanism. `stripe-subscription-webhook` should **refuse**
`product_type='oracle'` outright now that `oracle-webhook` owns it. One line, and the convention
becomes a check.

#### R10 - product_type, twice

`stripe_events.product_type` = membership/oracle/**ad_slot**/venue.
`subscriptions.product_type` = membership/oracle/venue.

**Authoritative:** neither. These are genuinely different domains - events include one-off `ad_slot`
payments; subscriptions do not. **Agree today: YES, defensibly.** Severity: **confusion**
(money-adjacent). **Fix shape:** leave them, but comment both CHECKs with *why* they differ. A
difference that reads as drift and is not, costs the next auditor an hour. It cost me one.

---

### SEVERITY: CORRECTNESS / DATA

#### R11 - The claim statement (three copies, two wrong)

| | |
|---|---|
| **Written in** | (a) `CLAUDE.md` **R2** - canonical; (b) `scripts/heartbeat/claim.sql`; (c) `scripts/mission-control/server.mjs` `BOARD_SQL`; (d) `SECTION_SQL.dispatches` in that same file |
| **Authoritative** | CLAUDE.md R2 |
| **Agree today** | **NO, in two places** |
| **Severity** | **CORRECTNESS** - a wrong board makes a human pick work by a lie |

**(b) `claim.sql` predates OPS47.** It does not set `claimed_by`, has **no terminal filter and no
agenda ORDER BY terms**, and does not print the `[CLAIMED]` line R2 calls mandatory ("a terminal that
says nothing is a bug"). A heartbeat claim therefore cannot serve an agenda and always writes
`claimed_by` NULL. Its own header carefully documents three deviations from R2 and justifies each -
written when those were the only three. Nobody noticed the new ones because **the file is denied
from running** (R3).

**(c) `BOARD_SQL`'s comment says it shows "the claim's order MINUS the sticky term".** Since OPS47
the claim orders by terminal-match, then agenda-priority, then sticky-lane, then priority, then age.
The board is now the claim order minus **three** terms and still claims one.

**(d) `SECTION_SQL.dispatches`** - the fail-soft path, 15 lines below - orders by
`(status, priority, created_at)`. That is **verbatim the order the OPS41 comment 60 lines above calls
"an order NOBODY would ever get."** The bug OPS41 fixed is alive in the fallback of the same file.

**Fix shape (derive):** put the claim in a SQL function -
`ops_claim(p_terminal text, p_lane text, p_lanes text[], p_session text)` - and have R2, `claim.cmd`
and every future caller invoke it. The board's order becomes a shared `ops_next_order()` expression.
Minimum viable: delete `SECTION_SQL.dispatches`' ORDER BY and reuse `BOARD_SQL`'s.

#### R12 - Build-step status: 10/20 and 12/20 are both right

| | |
|---|---|
| **Written in** | `ops_build_steps.status` (hand-set) vs `ops_build_progress.derived_status` (computed from `ops_dispatches` + `ops_reports`) |
| **Authoritative** | `derived_status`, wherever `dispatch_pass` is set - the view says so structurally, falling back to `s.status` only when `dispatch_pass IS NULL` |
| **Agree today** | **NO, on 7 of 20 oracle rows** |
| **Severity** | Correctness / confusion |

Base column: **10 done / 10 not_started**. View: **12 done / 3 blocked / 5 not_started**. OPS53
reported 12/20 off the view; this dispatch quotes 10/10 off the table. Neither is wrong - they are
different questions, and nothing labels which is which.

This row matters because it is **already the fix pattern** - derivation over synchronisation - and it
*still* produced a disagreement, purely because the hand-maintained column was left sitting beside
the derived one.

**Fix shape:** rename the column `status_manual`. Every read site then has to decide consciously, and
the view keeps working unchanged.

#### R13 - The realm roster: four copies, THREE answers

| | |
|---|---|
| **Written in** | (a) `TheMANUAL.tech/CLAUDE.md`: "14 realms in palindrome order"; (b) `src/types/manual.ts` `RealmId` union - 14, includes `justice`, plus the palindrome comment; (c) `public.realms` - **14 rows**, but `display_order` is **alphabetical** (culture=0 ... reference=13); (d) `public.atoms` - **13** distinct `realm_id`; `justice` has **0 atoms**; (e) `src/pages/HomePage.tsx` + `src/lib/surfaces.ts` user copy: **"13 realms"** |
| **Authoritative** | `realms` for membership; `atoms` for what is populated |
| **Agree today** | **NO, three ways** |
| **Severity** | **CORRECTNESS** - the spine's shape is the product |

Three distinct disagreements in one fact:

1. **14 vs 13.** `realms` holds 14; only 13 carry atoms. Justice left the Manual and became
   atlasJUSTICE.org with its own `justice_*` tables, leaving an empty realm row behind. Canon and the
   TS union say 14; the UI copy says 13. Both are defensible readings of different tables, which is
   the problem.
2. **The palindrome is not implemented.** CLAUDE.md and `manual.ts` both specify
   Justice -> Reference -> Human Activities -> Self -> Geography -> Health -> Society -> Math ->
   Science -> Philosophy -> Tech -> History -> Culture -> Religion, and `manual.ts` reasons about it
   ("pairings 1<->14, 2<->13 ... scrolling either direction passes through a coherent arc").
   `realms.display_order` - the only column that could carry it - is **plain alphabetical**. The
   documented rationale has **no mechanism at all**.
3. **The arithmetic is stale anyway.** With 13 populated realms the pairing is 1<->13 with a fixed
   centre, not the even pairing the comment describes.

**Fix shape:** generate `RealmId` from `realms` rather than hand-typing it; write the palindrome into
`display_order` (that is what the column is for) and delete the ordering prose from both files. Cheap
check today: a test asserting `RealmId` member count equals `SELECT count(*) FROM realms`.

#### R14 - atoms.type: the type system describes 0.3% of the corpus

| | |
|---|---|
| **Written in** | `src/types/manual.ts` `AtomType = 'person' \| 'event' \| 'document' \| 'organization' \| 'place'`. **No CHECK constraint exists on `atoms.type`.** |
| **Authoritative** | The data |
| **Agree today** | **NO, badly** |
| **Severity** | **CORRECTNESS - highest non-money row in this register. This is a live bug surface, not a doc gap.** |

Production `atoms.type`: `city` 23,877 - `concept` 9,860 - `admin1` 2,247 - `neighborhood` 1,055 -
`country` 249 - `event` 123 - `admin2` 18 - `continent` 7 - `region` 1.

**Nine live values. One of them (`event`, 123 rows of 37,437) is in the union.** 99.7% of atoms carry
a type the type system says is impossible. Any `switch (atom.type)` falls through silently for
effectively the entire corpus, and TypeScript reports nothing because the value arrives as `unknown`
from the client and is asserted.

This is class E with the **mechanism missing** rather than duplicated - the rarer and worse case.

**Fix shape:** add the CHECK to the **real** vocabulary, then generate the TS union from it.
**Do not** add a CHECK on the union's five values - that rejects 37,314 existing rows.

#### R15 - atoms.band: a vocabulary with no writer

CHECK allows `commons/hub/nova/facet`. All 37,437 rows are NULL. **Fix shape:** nothing to fix, but
record it - an empty vocabulary reads as "not built yet" and should say so in a column comment rather
than be rediscovered by the next audit.

#### R16 - The Discovery Ladder: five copies, one case mismatch

| | |
|---|---|
| **Written in** | `atoms_kettle_check`; `atom_kettle_votes_kettle_check`; `manual.ts` `KettleState`; `discovery-ladder/colors.ts` `DiscoveryTier` + `DISCOVERY_TIERS_ORDERED`; **and `justice_claims_status_check`, the same five words lower-cased**; plus prose in both CLAUDE.md files |
| **Authoritative** | `atoms_kettle_check` |
| **Agree today** | **YES on membership. NO on case.** |
| **Severity** | Confusion, with a latent correctness cost at any justice/manual boundary |

All five carry the same five words. Justice's copy is `sourced/accepted/emerging/fringe/unsourced`;
everyone else's is `Sourced/Accepted/...`. A value cannot cross that boundary without a transform,
and nothing says so.

Live data uses **three of five**: Accepted 37,338, Emerging 79, Fringe 20. `Sourced` and `Unsourced`
have never been written, despite being the two the 2026-05-27 migration was run to add.

**Fix shape:** `colors.ts` already declares itself the single home for the ladder. Extend that -
export the ordered list from one module and have `manual.ts` alias it. Note that `manual.ts`
currently says the two types are "structurally identical", which is a **synchronisation promise**,
not a derivation, and is exactly the kind of sentence this register exists to find.

#### R17 - The BLiNG! RPC and table roster

| | |
|---|---|
| **Written in** | `TheMANUAL.tech/CLAUDE.md` "BLiNG! v8 tables in production" + "BLiNG! v8 RPCs deployed" vs the production catalog |
| **Authoritative** | Production |
| **Agree today** | **NO, extensively** |
| **Severity** | **CORRECTNESS** - a session told "always go through the RPCs" will call four functions by names that do not exist |

Tables claimed vs found:

| Claimed | Status |
|---|---|
| `bling_transactions` | present |
| `bling_escrows` | present |
| `bling_system_state` | present |
| `bling_orders` | **ABSENT** |
| `bling_stripe_events` | **ABSENT** (there is a `stripe_events`, different shape) |

RPCs claimed vs found. Production has exactly seven `bling*` functions:
`bling_send`, `bling_circulating_supply`, `bling_escrow_create`, `bling_escrow_release`,
`bling_escrow_cancel`, `bling_escrow_dispute`, `bling_escrow_timelock`.

| Claimed | Status |
|---|---|
| `bling_send` | present |
| `bling_create_escrow` / `_release_escrow` / `_cancel_escrow` / `_dispute_escrow` | **ABSENT - verb order is reversed in production** (`bling_escrow_create`, ...) |
| `bling_free` | **ABSENT** |
| `bling_place_order` / `bling_fill_order` / `bling_cancel_order` | **ABSENT** |
| `bling_credit_purchase` | **ABSENT** |
| `bling_chargeback_clawback` | **ABSENT** |
| - | `bling_escrow_timelock`, `bling_circulating_supply` exist and canon does not mention them |

The same CLAUDE.md paragraph also still says the `bling_transactions.type='minted'` rename is
"acknowledged debt deferred to its own session". The CHECK carries **`free`**, and **no routine in
`public` references `bling_mint`**. That debt is **paid**, and the note is stale in the *safe*
direction - which is its own hazard, because it invites someone to "finish" a finished job.

**Fix shape:** this section should not be prose. Generate it from `pg_proc`, or delete it and point
at the query. Same for the root CLAUDE.md's `bling_credit_purchase` callsite warning - the function
it names does not exist, so the warning cannot be acted on.

#### R18 - Repo migrations vs applied migrations

**289** `.sql` files under `supabase/migrations/` vs **648** rows in
`supabase_migrations.schema_migrations`. Neither reproduces production. **Authoritative:** the
database. **Severity:** DATA-LOSS (recovery). **Registered only** - the dispatch reserves this
decision for Butch, and I did not touch it.

#### R19 - Edge functions: repo vs deployed

| | |
|---|---|
| **Written in** | `supabase/functions/*` (19 function dirs) vs 18 ACTIVE deployed slugs |
| **Authoritative** | Split, and that is the problem: deployed is what runs, repo is what can be reviewed and rebuilt |
| **Agree today** | **NO** |
| **Severity** | **DATA-LOSS / MONEY** - highest-consequence class-F row after the migrations |

**Deployed with NO source in this repo:** `venue-checkout` (v13), `livekit-token` (v13),
`push-send` (v8).
**In the repo, never deployed:** `atlasoracle-log`, `atlasoracle-providers`, `bling-send`,
`check-keyholder`.

Three functions run in production with no source under version control, and **`venue-checkout` takes
money**. `atlasoracle-route` is at v23, matching the OPS49d report - that one lines up.

**Fix shape:** pull the three deployed bundles back into the repo (read-only, no deploy), then add a
check listing deployed slugs against `supabase/functions/*` directory names. That check is three
lines and would have caught this the day it happened.

#### R20 - The MMF's home: four locations, four version numbers

| | |
|---|---|
| **Written in** | `HONEYCOMB/CLAUDE.md` - a Supabase storage URL as "canonical, always current", **"currently v2.3"** in one paragraph and **`shared/notes/MMF_v2_4_working.md`** in another; `TheMANUAL.tech/CLAUDE.md` - **`../shared/notes/MMF_v2_3_working.md`**; `scripts/pull-rail.mjs` header - **"canonical MMF (v2.8, 2026-07-20) remains in Drive pending the v2.9 rail migration"**; and the file pull-rail actually writes, `shared/notes/master-master-file.md` |
| **Authoritative** | **Unresolved. That is the finding.** |
| **Agree today** | **NO** |
| **Severity** | **CONFUSION, high blast radius** - the `ogo` trigger tells every fresh session to derive its briefing from this |

Neither `MMF_v2_3_working.md` nor `MMF_v2_4_working.md` exists under `shared/notes/`. The file the
Ctrl+Alt+M hotkey opens is named `master-master-file.md` and contains BOOT_BLOCK + LEAD_PROTOCOL +
JMF - **no MMF at all**, because `pull-rail.mjs` hardcodes exactly two slugs into `SQL_DOCS`
(`LEAD_PROTOCOL`, `JMF`) out of the nine on the rail. ORACLE_MF, GAMES_MF and IDENTITY_MODEL are not
in the "master" snapshot.

**Fix shape:** pick the rail as the home. Then `SQL_DOCS` stops hardcoding a slug list, and the four
prose pointers collapse to one.

#### R21 - ops_docs heads are DELTAS; every mechanism treats them as documents

| | |
|---|---|
| **Written in** | `CLAUDE.md` **R8** ("latest = newest row per slug"); BOOT_BLOCK step 2 ("latest row per slug"); `pull-rail.mjs` `SQL_DOCS` (`DISTINCT ON (doc)`); mission control's docs panel |
| **Authoritative** | **The whole chain, not the head** |
| **Agree today** | **NO** |
| **Severity** | **CONFUSION - and this is the mechanism by which every other doc-vs-doc drift in this register survives** |

`ORACLE_MF` has **35 rows**. The head, v0.35, is 1,801 bytes about a slogan, and opens *"Read with
v0.29, v0.34."* `LEAD_PROTOCOL` v0.14 opens *"delta - v0.13 and prior stand except as amended."*

A session that follows the boot block literally reads the head and believes it has the master file.
**The v0.31 free-tier lock - R4 and R5, the two money rows in this register - is completely invisible
from the head.** I found it only because the dispatch named it.

**Fix shape:** add a `kind` column (`full` | `delta`) so a reader knows what it is holding, or an
`amends` column plus a view `ops_docs_current` that concatenates the chain. Second-cheapest:
`pull-rail` emits the whole chain for a slug, newest first.

#### R22 - Lanes

`CLAUDE.md` R1: "Lanes are `front` - `db` - `docs` - `ops`". `ops_dispatches` carries **28 rows on
lane `games`**. There is **no CHECK on `lane` at all**. `terminal` likewise holds `A`, `B`, `ANY` and
`TL`, where CLAUDE.md documents only `go a` / `go b` / `ANY`.

**Authoritative:** the data. **Severity:** confusion - a session filling R2's sticky-lane array from
CLAUDE.md's list will never sticky on `games`, silently. **Fix shape:** add the CHECK (the cheapest
possible mechanism for a four-value list that is actually five) and let CLAUDE.md cite it.

#### R23 - ops_reports.terminal

R3 says *"`ops_reports.terminal` carries the **lane** now."* Live values include `ops` (a lane) and
`LEAD` (not a lane). The column is CHECKed only for non-emptiness. **Fix shape:** rename to `lane`,
CHECK it against R22's list plus an explicit `LEAD`.

#### R24 - ops_reports.outcome / decisions_owner

Two CHECK vocabularies shipped by `20260731050000_ops_reports_headers_v1`. **R3's FINISH statement in
CLAUDE.md inserts only `(terminal, pass, title, body)`.** Result: **167 of 172 rows have both NULL**
(`design/lead` x2, `done/lead` x1, `done/NULL` x1, `held/NULL` x1).

**Authoritative:** R3 - it is the only writer. **Severity:** confusion. Two vocabularies guarded by a
CHECK that guards nothing, because nothing writes. **Fix shape:** derive rather than add fields to
R3 - `outcome` is already recoverable from the pass-id suffix (`-Q` means question) plus the
dispatch's status. Adding them to R3's INSERT just creates two more hand-maintained facts.

---

### THE "TIER" OVERLOAD - THE DISPATCH NAMED THREE; THERE ARE EIGHT

| # | Where | Values | What it actually means |
|---|---|---|---|
| 1 | `atlasoracle_directives.tier` | free / **standard** / **frontier** | **quality band** - which model class serves a directive |
| 2 | `oracle_token_plans.plan_tier` | scout / oracle / sovereign | **subscription plan** |
| 3 | `atlasoracle_provider_pool.provider_category` | **frontier** / mid-tier / fast / oss / specialized | **provider category** |
| 4 | `subscriptions.tier` | drone/worker/guardian/queen \| scout/oracle/sovereign \| founding/**standard** | **polymorphic by `product_type`** |
| 5 | `oracle_model_rates.tier` | free / **standard** / **frontier** | a **label on a price row** (the router looks up by `model_name`, not this) |
| 6 | `nova_registry.tier` | **standard** / dedicated / **off_grid** | **hosting class** |
| 7 | `canonical_documents.tier` | integer **1..6** | a numeric level |
| 8 | `affiliate_holds.tier` | l1..l5 / treasury | **affiliate chain depth** |
| + | `src/lib/discovery-ladder/colors.ts` `DiscoveryTier` | Sourced..Unsourced | a **ladder rung** - the same word again in the code layer for `atoms.kettle` |

`standard` means **four** different things (1, 4-venue, 5, 6). `frontier` means **two** (1/5 and 3).
`off_grid` is a **tier** in `nova_registry` and a **status** in the `astra_or_nova_status` enum.

**RECOMMENDATION - rename, do not unify.** These are genuinely different concepts; a shared
vocabulary would be strictly worse. Rename so no two are the same word:

- (1) + (5) -> **`quality_band`**. Keep the values; it is the original and the most-used.
- (2) + the oracle branch of (4) -> **`plan`** (already `plan_tier`; drop the suffix).
- (3) the column is already `provider_category` and only reads as a tier because of the *value*
  `frontier` - rename the value to **`flagship`**.
- (6) -> **`hosting_class`**.
- (7) -> **`sensitivity_level`**. It is 1..6, not a tier.
- (8) -> **`chain_level`**.
- `DiscoveryTier` -> **keep**. Different layer, namespaced by its module.

Cost is a rename sweep. The benefit is that the word "tier" in a dispatch, a doc or a prompt stops
being ambiguous - and that ambiguity is the literal shape of R4, R6 and R7 above.

---

### THE EIGHTEEN CHECK VOCABULARIES IN THE ORACLE/OPS SLICE, EACH TRACED

| # | Constraint | Other places the same list is written | Verdict |
|---|---|---|---|
| 1 | `atlasoracle_directives_category_chk` (10) | router `ALLOWED_CATEGORIES`; `client.ts` `DirectiveCategory` union; `client.ts` `DIRECTIVE_CATEGORIES` array | **4 copies, all AGREE.** Fix: generate TS from the CHECK; at minimum derive the array from the union. |
| 2 | `atlasoracle_directives_tier_chk` (3) | router `ALLOWED_TIERS`; five `Record<Tier,_>` maps (`TIER_PROVIDER_MODEL`, `_THINKING`, `_BASE_OUTPUT_TOKENS`, `_OUTPUT_SCALE`, `_MAX_TOKENS`); `client.ts` `Tier`; **`atlasoracle_check_rate_caps` plpgsql `not in ('free','standard','frontier')`**; `oracle_model_rates.tier` data | **AGREE.** The `Record<Tier,_>` maps are keyed off the const, which is correct. **The plpgsql literal is the exposed copy** - it is the one that will be missed. |
| 3 | `atlasoracle_directives_status_chk` (pending/success/failed) | router writes all three literally (`insert status:'pending'`, `status:'success'`, `markFailed` `'failed'`) | **AGREE** |
| 4 | `atlasoracle_provider_pool_category_chk` (5) | **appears ONCE** | Registered as unread - R6 |
| 5 | `oracle_token_ledger_entry_type_chk` (4) | `oracle_token_ledger_amount_sign_chk` (**a second CHECK on the same table restating the same four**); `oracle_token_available()` (`IN ('purchase','grant','adjustment')` + `'debit'` + `'grant'`); `oracle_token_balances` (3 FILTERs); `oracle_debit_tokens` | **AGREE.** `durable_credits` deliberately omits `'debit'` - correct, and it needs a comment saying so, because it reads as an omission. |
| 6 | `oracle_token_plans_plan_tier_check` (3) | see R8 | **AGREE, already cost one migration** |
| 7 | `ops_build_steps_effort_check` (light/standard/deep) | `ops_effort_stats` keys off it; **the dispatch-title convention `EFFORT: deep` is a fourth writer, in free text** | **AGREE.** Fix: `EFFORT:` belongs in a column, not a title prefix. |
| 8 | `ops_build_steps_status_check` (5) | `ops_build_progress`'s CASE emits exactly these; `ops_build_rollup`'s five FILTERs; mission-control UI | **AGREE**, but note **`parked` is emitted nowhere by the view's CASE** - it can only arrive via the hand-set column (R12). |
| 9 | `ops_dispatches_status_check` (4) | `CLAUDE.md` R2/R2b/R3; `claim.sql`; `BOARD_SQL`; `SECTION_SQL`; `pull-rail` `SQL_DIGEST` | **AGREE on membership** (the ORDER BY drift is R11). **`superseded` is written nowhere but the CHECK.** |
| 10 | `ops_messages_status_check` (unread/read/archived) | BOOT_BLOCK step 3 (`status='unread'`, then `status='read', read_at=now()`); **`pull-rail` `SQL_DIGEST` uses `read_at IS NULL` INSTEAD of `status`** | **DRIFT, low severity, real.** Two definitions of "unread" - a column and a null-check - that disagree the moment one is set without the other. Fix: pick one; if `read_at` is truth, make `status` generated. |
| 11 | `ops_reports_outcome_chk` (6) | **nowhere** | Unused - R24 |
| 12 | `ops_reports_decisions_owner_chk` (4) | **nowhere** | 3 rows populated - R24 |
| 13 | `stripe_events_product_type_check` (4) | `subscriptions_product_type_check` (3) | Deliberate difference - R10 |
| 14 | `stripe_events_status_check` (6) | webhooks write a subset; **list appears once** | No action |
| 15 | `subscriptions_product_type_check` (3) | `stripe-subscription-webhook` `ProductType` union **and** its line-79 guard - two more copies | **AGREE** |
| 16 | `subscriptions_status_check` (7 Stripe statuses) | mirrors **Stripe's own** vocabulary; the webhook passes through | **The one case where a local CHECK is pure liability.** A third party owns this list. If Stripe adds a status, the CHECK rejects the webhook write and the subscription silently fails to sync. Fix: drop the CHECK, or add a catch-all. |
| 17 | `subscriptions_tier_valid` (polymorphic) | oracle branch duplicates #6 (R8). **`drone/worker/guardian/queen` exists ONLY here** - no table, no TS, no UI | The membership branch is the **ideal case - exactly one home** - and it got there by accident. |
| 18 | `oracle_token_packs_pack_code_check` | a **shape** (`^[a-z0-9_]{2,32}$`), not a vocabulary. The actual pack list (starter/regular/plus/pro) lives in **DATA**, read server-side by `oracle-checkout` | **THE MODEL.** Constrain the shape, put the vocabulary in a table, let the code read it. Zero copies. |

Two more constraint-vs-code pairs outside the 18, found while tracing and worth carrying:

- **`bees.handle_format`** = `^[a-z0-9_]{3,20}$`. `TheMANUAL.tech/CLAUDE.md` says
  `^[a-z0-9_-]{2,30}$`. **Canon is WIDER than the mechanism** - it promises hyphens and 2-char
  handles the DB will reject. All 18 live bees satisfy both, so this is latent, not live. It will
  surface as a signup failure that canon says should not happen.
- **`bees_reserved_handles`** carries `comb` as `match_kind='prefix'`, correctly implementing the
  `@comb*` reservation in both CLAUDE.md files. **This one agrees.**

---

### SEARCH METHOD, PER CLASS

- **A (canon vs mechanism).** Read all nine `ops_docs` heads plus both CLAUDE.md files end to end;
  for each imperative sentence, looked for the CHECK, RLS policy, settings entry or code path that
  would enforce it. Rows: R1, R2, R3, R5, R13, R17, R22, R24.
- **B (doc vs doc).** `DISTINCT ON (doc) ... ORDER BY doc, created_at DESC` for heads; full version
  list per slug; read ORACLE_MF v0.31 and LEAD_PROTOCOL v0.14 in full; diffed against R1-R8.
  Rows: R4, R20, R21.
- **C (code vs code).** Started from the claim/board pair the dispatch named, then read every SQL
  string in `scripts/` and `supabase/functions/` looking for a second query answering a question
  something else already answers. Rows: R11, R9.
- **D (data vs code).** For each table that *looks* like configuration -
  `atlasoracle_provider_pool`, `oracle_model_rates`, `oracle_token_plans`, `oracle_token_packs`,
  `ops_build_steps` - grepped the entire repo for the table name. **Absence of hits is the finding.**
  Rows: R6 (zero hits), R7 (correctly wired), R8 (correctly wired).
- **E (constraint vs everything).** Pulled all **286** public CHECK constraints, isolated the
  oracle/ops slice (18 enumerated vocabularies), and for each grepped `src/`,
  `supabase/functions/`, `scripts/` and both CLAUDE.md files for two or more distinctive values from
  the list. Every one traced above, including the four that appear exactly once.
- **F (repo vs database).** `ls supabase/migrations | wc -l` (289) vs
  `count(*) FROM supabase_migrations.schema_migrations` (648); deployed edge-function slugs vs
  directory names. Rows: R18, R19.
- **G (derived vs source).** Read the `ops_build_progress` and `ops_build_rollup` view definitions
  and compared `derived_status` against the base column across the same 20 oracle rows. Row: R12.
  Also `oracle_token_balances`, which **was** the R12-shaped bug and has since been rewritten to
  cross-join `oracle_token_available` - it is now correct, and the router's OPS49 comments warning
  that the view is expiry-blind ("says 800, truth is 100") are **stale in the safe direction**.

### DONE-TEST

| Requirement | Result |
|---|---|
| Every class A-G searched, method stated | Done - section above, each row tagged to its class |
| 18 CHECK vocabularies each traced to every other site, or marked single-site | Done - table above. Four marked single-site (#4, #11, #12, #14) |
| "tier" overload registered with all vocabularies + recommendation | Done - **eight**, not three, plus the `standard`/`frontier`/`off_grid` value collisions |
| Each row carries authoritative copy, agree-today with evidence, severity, fix shape | Done |
| Ordered by severity | Done - SECURITY, then MONEY, then CORRECTNESS/DATA |
| Zero files changed, proven | See below |

### ZERO FILES CHANGED - PROOF

`git status --porcelain=v1 -uall` at the `TheMANUAL.tech` root returned **empty** before this pass
and carries **only `REPORT.md`** after it. `REPORT.md` is in scope under R6 by definition ("scope
bounds the work, not the reporting").

No migration written. No constraint created, altered or dropped. No `ops_docs` row inserted or
edited. No settings file touched. No source file changed. **Every database statement this pass ran
was a `SELECT`**, with exactly two exceptions: the R2 claim `UPDATE` that started it and the R3
close that ends it.

### COULD NOT VERIFY

- **Which file LEAD_PROTOCOL v0.14 was written against.** Neither `~/.claude/settings.json`
  (allow 25 / ask 3 / deny 5) nor `HONEYCOMB/.claude/settings.local.json` (allow ~558 / ask 0 /
  deny 9) matches its stated allow 75 / ask 6 / deny 41. A third file may exist outside this
  workspace, or the rewrite was drafted and never written. **v0.14 C-4 flagged this ambiguity
  itself and it is still open.**
- **What the canonical MMF storage URL currently serves.** No fetch attempted - that domain is not
  on the allow list at this root, and R7 says do not invoke what you lack permission for.
- **Whether `venue-checkout`, `livekit-token` and `push-send` have source elsewhere in the
  workspace.** I searched `TheMANUAL.tech` only, per `workdir`.
- **Whether the repo's `atlasoracle-route` source is byte-identical to deployed v23.** Version and
  the OPS49d report line up; I did not fetch the bundle back.
- **Whether the `-Q` question convention is the only outcome signal.** R24's fix shape assumes so;
  I did not audit every pass id.
- **RLS policies were not swept.** Class A over RLS (canon promising "RLS on every table, no
  exceptions" vs actual `pg_policies` coverage across 180 tables) is a register of its own size and
  I did not open it. **Flagged as the largest unexamined surface.**

---
