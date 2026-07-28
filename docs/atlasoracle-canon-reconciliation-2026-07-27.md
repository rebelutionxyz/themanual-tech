# AtlasORACLE — Pre-Rail Canon Reconciliation

**Pass:** DOCS6 · **Date:** 2026-07-27 · **Author:** docs lane (Claude 2)
**Sources read (11 of 11 in scope):** `HONEYCOMB/AtlasORACLE.to/whitepaper.md` + all 10 files in
`HONEYCOMB/AtlasORACLE.to/master_plan/`
**Rail read:** `ops_docs` — `ORACLE_MF` v0.1→v0.18, `ORACLE_OUTLOOK` v0.1, `ORACLE_TOS_VERIFIED` v0.1–v0.2
**DB probed (read-only, 2026-07-27):** `information_schema.tables`, `pg_extension`

**This pass EDITS NOTHING.** It is a reconciliation table only. Every proposed edit below becomes its
own dispatch after Butch rules. Where Butch's own words are the source of a conflict (OPEN-8, free
tier), the row states both sides and takes no position.

---

## 0. How to read this

| Verdict | Meaning |
|---|---|
| **CONFLICT** | Old canon asserts something the rail has since overridden, or the as-built system contradicts. Needs an edit or a ruling. |
| **COMPATIBLE** | Old canon still stands as written, or survives as mechanics under new currency/doctrine. |
| **TREASURE** | Old canon contains work, spec, or copy that has no rail equivalent and is worth promoting to the roadmap. |
| **STALE** | Not wrong in principle, but its numbers/model names/counts have moved. Refresh, don't rethink. |

Rail citations are `MF v0.N` = `ops_docs` row `ORACLE_MF` version N; `OUTLOOK` = `ORACLE_OUTLOOK` v0.1;
`TOS` = `ORACLE_TOS_VERIFIED`.

### DB facts established this pass (read-only probe)

Present: `atlasoracle_canon_reads`, `atlasoracle_directives`, `atlasoracle_provider_pool`, `bling_pots`,
`oracle_model_rates`, `oracle_token_balances`, `oracle_token_ledger`.
**Absent:** `atlasoracle_canonical_responses` (canonical-cache spec), `patchboard_switches`
(patchboard addendum), and the `vector` extension (only `pg_trgm` is installed). Every "unbuilt"
claim below about those three is verified, not assumed.

---

## 1. THE FOUR HEADLINE CONFLICTS

Ordered by how much downstream work each unblocks.

### C1 — Currency: everything is priced in BLiNG!

Six of eleven docs denominate ORACLE in BLiNG!. Butch killed that.

- **Old canon:** `economic_constitution.md` §Denomination ("All paid directives priced in **BLiNG!**…
  1 BLiNG! ≈ $1 USD floor"); `rate-cap-pricing.md` §4 (0.5/1/2 standard, 5-base/50-cap frontier);
  `bling-ledger-interface.md` in its entirety; `atlasoracle-canonical-cache.md` §5;
  `atlasoracle-patchboard-addendum.md` §2.1 (7 BLiNG!-denominated switches); `whitepaper.md` §8
  ("BLiNG! denomination … The choice of denomination is not cosmetic").
- **Rail now:** `MF v0.5` ruling 2 — "NO BLiNG! TRANSACTIONS for ORACLE"; ruling 3 — "USERS BUY ORACLE
  TOKENS specifically to use oracle." `MF v0.16` §5 seals the replacement: **1,000 Oracle Tokens = $1
  USD, permanent anchor**; standard 3.0× / frontier 2.5× post-intro provider cost; rate card seeded live
  into `oracle_model_rates`; packs $5→5,000 · $10→11,000 · $25→30,000 · $60→78,000, no subscription.
  `MF v0.15` — paid tiers live on `oracle_token_ledger`, **no treasury leg**.
- **Verdict:** **CONFLICT**, the largest one. Six documents are denominated in a dead currency.
- **Proposed edit:** re-denominate, don't delete. The *mechanics* survive verbatim (charge-the-lesser,
  confirm-cost gate, rate caps, cache discount %, tier shapes) — only the unit changes. One dispatch per
  doc, `economic_constitution.md` first since the other five cross-reference it.

### C2 — Training: "AtlasOracle does not train"

- **Old canon:** `platform_thesis.md` L13 — "Not an AI model. AtlasOracle does not train."
  `whitepaper.md` §1 ("Not a model. We don't train"), §3 ("We do not train. There is no model to feed,
  no corpus to harvest"), §9 hard-never ("**Never train on Bee directives**"), and §10 *What we will not
  do* — "**Training our own model.** AtlasOracle is a router; it does not aspire to become a model."
- **Rail now:** `MF v0.1` §1 states the training leg as mission from day one. `MF v0.6` resolves OPEN-2
  **in principle**: train off *other astras'* data and ORACLE's own metadata exhaust, **never off
  AtlasORACLE user exchanges** — the provenance rule (human-authored + platform-native = trainable;
  AI-generated canon = quarantined pending a justice-lane ToS pass). `OUTLOOK` first-model
  recommendation: the **learned router**, not a chatbot. `TOS v0.1` finds the OpenAI Permitted-Exception
  carve-out for exactly that shape; `TOS v0.2` verifies Llama 3.1 outputs as training-permissive fuel.
  `MF v0.12` — never-distribute is a per-fuel-source price tag, not a product ceiling.
- **Verdict:** **CONFLICT**, but a narrower one than it looks. The §9 hard-never ("never train on Bee
  directives") is *intact and strengthened* — `MF v0.4` makes it structural (no content columns exist).
  What is dead is the blanket "we don't train / will never train a model."
- **Proposed edit:** keep the hard-never verbatim; replace the blanket claims in `platform_thesis.md` L13
  and `whitepaper.md` §3/§10 with the provenance rule stated positively — *"We do not train on your
  directives. We do train on our own routing exhaust and on platform-native data whose provenance we
  own."* That sentence is stronger marketing than the original, and it's true.

### C3 — Free tier: "permanent, structural, never gated"

- **Old canon:** `economic_constitution.md` §Non-negotiables — "Free tier is never gated, expired, or
  converted to paid"; §Free tier — "Permanent and structural. **Not a trial.**"; `platform_thesis.md`
  principle 3 ("Free access is permanent and structural, sustained by OPS allocation"); `whitepaper.md`
  §3, §7, §9 hard-never ("**Never charge for the free tier under any framing**"), §9 guarantee ("The free
  tier remains available regardless of their payment status"); `language_firewall.md` required term
  "**Free tier as floor** — the structural commitment that free access is permanent."
- **Rail now:** `MF v0.5` ruling 5 (Butch, verbatim intent) — "FREE TIER: possibly not at launch — maybe
  when income covers it; **UP FOR DEBATE** (OPEN-8). Regardless, FREE PROVIDERS will be added, so a
  low-cost route exists via provider choice rather than subsidy." Still open at `MF v0.18`.
  `MF v0.16` §2 keeps free = FREE, rate-capped, subsidized by paid margin — i.e. currently shipping,
  but not re-promised as permanent.
- **Verdict:** **CONFLICT — Butch's ruling required, no lane position taken.** The old canon makes
  permanence a *hard never* and a *required firewall term*; Butch has it explicitly on the table.
- **What the ruling actually decides** (stated neutrally so the choice is clean):
  1. If free stays a permanent floor → five docs stand as written, and the `MF v0.16` §2 subsidy line
     becomes a permanent budget commitment funded from the 3× margin.
  2. If free becomes conditional → the hard-never in `whitepaper.md` §9 must be rewritten (a broken hard
     never is worse than never having claimed it), `language_firewall.md`'s required term must be
     retired, and the OSS/Groq "low-cost route via provider choice" from ruling 5 becomes the
     replacement promise.
  3. A third shape exists in the old canon and may be what Butch actually wants:
     `whitepaper.md` §8 already scripts the graceful path — *"the response will not be to silently
     degrade it … publicly account for the shortfall and either restructure … with notice and a
     deprecation window."* That is a permanence claim with an exit ramp already written.
- **Proposed edit:** none until ruled. Then one dispatch touching all five docs at once — this must not
  be edited piecemeal or the docs will disagree with each other.

### C4 — Dates: launch is keyed to a calendar

- **Old canon:** `platform_thesis.md` §Operational status ("consume AtlasOracle services from soft launch
  (2026-07-04) … ships post-Swarm (after 2026-09-11)"); `whitepaper.md` §10 in its entirety (Pre-launch
  "now through July 4, 2026"; "Soft launch (July 4, 2026)"; "Full Swarm (September 11, 2026)";
  "Post-Swarm (Q4 2026 and beyond)"; Federation Tier 3 "2027+"), §11 ("that is the question July 4, 2026
  answers"), §6/§11 Founding Bee window; `per-astra-surfaced-actions.md` (repeated "at soft launch" /
  "post-Swarm" gating).
- **Rail now:** `MF v0.5` ruling 1 — "**NO TIMELINES OR DUE DATES.** July 4 / Sept 11 / Founding-window
  phasing is stripped from ORACLE canon; work ships when it ships." OPEN-5 dissolved. `OUTLOOK` WRONG #3
  — "DATE-DRIVEN PHASING: July 4 passed with frontend unbuilt, zero directives fired. Calendar-keyed
  plans fail silently; readiness gates do not." Reinforced by root `CLAUDE.md` §Code Time Autonomy.
- **Verdict:** **CONFLICT**, mechanical and cheap to fix.
- **Proposed edit:** rewrite `whitepaper.md` §10 as **readiness gates, not dates** — the section's
  *content* (what ships in which wave, and the four "what we will not do" commitments) is sound; only the
  date keys are dead. Suggested gate names: *infrastructure-carrying-load* → *standalone-destination* →
  *public-builder-API*. Strip the two date clauses from `platform_thesis.md` §Operational status; the
  sequencing sentence ("Infrastructure first, product last") survives and is worth keeping.
  **One exception to preserve:** `MF v0.15` records Aleph sunset 2026-07-30 as the only dated item in
  canon — a supplier's deadline, not ours.

---

## 2. FULL TABLE — by document

### 2.1 `platform_thesis.md` (35 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| L3 intro | "a router, not a worker … dispatches directives to AI providers anchored against this `master_plan/` folder" | `MF v0.4` §1 identity — same shape, confirmed as-built (parse → canon → provider-select → invoke → return) | **COMPATIBLE** | none |
| L5–9 "What it serves" | Builders · Bees · AI providers | `MF v0.3` adds the **second role**: ORACLE is the *astras'* shared AI engine (intel, vote, justice, miniwaves, security…), and `MF v0.4`/`OUTLOOK` call the internal-engine role "the crown; consumer gateway is client #2" | **CONFLICT (omission)** | Add a fourth constituency: *the other Astras*. Today the doc omits ORACLE's most load-bearing customer. |
| L13 "AtlasOracle does not train" | absolute | `MF v0.6` OPEN-2 resolution; `OUTLOOK` learned-router recommendation | **CONFLICT** | See **C2**. |
| L14 "Not a chatbot. There is no 'AtlasOracle assistant' persona." | absolute | `MF v0.7` §1b vision — "ORACLE console **looks like a modern AI chat app** — two-column layout"; positioning sentence, canon: "AtlasORACLE is the user's **EXECUTIVE ASSISTANT AND DIRECTOR** of their entire AI experience" | **CONFLICT — needs a ruling** | Not in the dispatch's known-conflict list; surfacing it. The old canon bans the exact noun the new positioning sentence uses. Recommend reconciling on the *distinction the whitepaper already draws* (§7: "The badge is not a chatbot… The Bee issues directives in context") — an assistant that **directs other AIs** is not the same as a chatbot that answers you. But the wording of L14 and `language_firewall.md`'s forbidden-terms list must change either way. |
| L15 "Not a SaaS subscription. Pricing is tiered with a permanent free floor." | — | `MF v0.16` §5 — "Prepay bonuses, **NO subscription** — deliberate contrast to the creator-market subscription treadmill" | **COMPATIBLE (first half, strengthened)** / **CONFLICT (second half)** | Keep "not a subscription" — the rail made it sharper. "Permanent free floor" → see **C3**. |
| L16 "Not data-extractive. The router holds directive content only for the duration of routing." | — | `MF v0.4` §1 — sovereignty rule structurally enforced, **no content columns exist, DB-verified** | **COMPATIBLE — strengthened** | Optional upgrade: the rail can now say *structurally impossible*, not *policy*. Best sentence ORACLE owns (`OUTLOOK` RIGHT #1). |
| L21 principle 2 "Master_plan as read-only canon. Every AI that operates through AtlasOracle reads from this folder before responding." | — | `MF v0.10` — route uses a **bundled `canon.ts`**, not `canon-reader.ts`; `atlasoracle_canon_reads` **never written** (table exists, 0 rows); canon bundle is 1,637 tokens | **CONFLICT (as-built)** | Doc describes an architecture the running router does not use. Either wire the canon-reader or restate the principle as design intent pending the canon-sync pass (see **T10**). |
| L22 principle 3 free floor "sustained by OPS allocation against OSS provider costs" | — | `MF v0.5` r2 (BLiNG!/OPS coupling dead) + `MF v0.16` §2 (subsidy now from paid margin) | **CONFLICT** | Re-source the subsidy sentence to token margin. Separate from **C3** — this is *how* it's funded, not *whether* it's promised. |
| L26 Operational status — dates | soft launch 2026-07-04, post-Swarm after 2026-09-11 | `MF v0.5` r1 | **CONFLICT** | See **C4**. |
| L26 "standalone Astra at `atlasoracle.to`" | — | `MF v0.4` — atlasoracle.to **reserved**; `MF v0.2`/`v0.8` — atlasoracle.ai **in Butch's cart, not yet owned**, standalone patterning "TENTATIVE (Butch: 'I think')"; build home = themanual.tech/oracle | **STALE** | Name themanual.tech/oracle as the home of record; mark the standalone domain unresolved rather than asserting `.to`. |
| L26 "AtlasOracle pre-builds **into The Manual**" | — | `MF v0.2` OPEN-3 resolved: workdir TheMANUAL.tech, route `/oracle` | **COMPATIBLE** | none — this line aged perfectly |

### 2.2 `economic_constitution.md` (63 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Denomination | all paid directives in BLiNG!; 1 BLiNG! ≈ $1 floor; "Bees never see dollar prices" | `MF v0.5` r3 · `MF v0.16` §1 anchor 1,000 tokens = $1 | **CONFLICT** | **C1**. Note the *intent* survives inverted: the token anchor is a fixed $1 relation, so Bees still never do float math. |
| Free tier — permanence | "Permanent and structural. Not a trial." | `MF v0.5` r5 OPEN-8 | **CONFLICT** | **C3** — no position taken |
| Free tier — routing | "Routes only to non-extractive providers: OSS…, Groq…, OSS hosted by HONEYCOMB" | `MF v0.13` — free is pinned to `claude-haiku-4-5`; `MF v0.10` — Groq is "rights-cleanest AND canon-designated free-tier path… 16–43× cheaper than Haiku at measured shape" | **CONFLICT (as-built)** | The doc and the measurement agree with each other and disagree with the code. This is a cheap, high-value fix: move free to Groq/OSS as the doc always said. |
| Free tier — cap | 50 directives/Bee/day | `MF v0.4` tier mechanics survive; `atlasoracle_check_rate_caps` RPC live | **COMPATIBLE** | none |
| Standard / Frontier pricing | 0.5–2 BLiNG! / 5–50 BLiNG! | `MF v0.16` §4 rate card: standard `claude-sonnet-5` 9,000 in / 45,000 out / 900 cached per 1M provider tokens; frontier `claude-opus-5` 12,500 / 62,500 / 1,250 | **CONFLICT** | Replace §3 wholesale with a pointer to `oracle_model_rates` — **rates are data now, not prose**. Documenting a number that lives in a table guarantees future drift. |
| Treasury reconciliation | BLiNG! → `@combtreasury`; USD paid from order-book sell-side fee, frontier top-ups, OPS umbrella | `MF v0.15` — "single append-only debit rows; **revenue = SUM; no treasury leg** per lead ruling, now runtime-proven" | **CONFLICT** | Rewrite as: user buys tokens (Stripe, flow unbuilt) → debits accrue in `oracle_token_ledger` → providers billed directly in USD. The three-source USD story is dead with the BLiNG! coupling. |
| OPS allocation | earmark from 200B BLiNG! OPS umbrella; ~$18M/yr free-tier projection at 1M Bees | `MF v0.5` r2 | **CONFLICT (arithmetic salvageable)** | The *model* (population × cap × marginal cost) is reusable; re-run it against Groq/OSS marginal cost per `MF v0.10` — the 16–43× factor moves this number by more than an order of magnitude. |
| Reporting cadence | quarterly publication of obligations, reconciliation, runway, pool composition (no provider >30%) | nothing on the rail; `OUTLOOK` notes single-vendor concentration as WRONG #1 (**every paid tier hardcoded to one company's models**) | **TREASURE** | The >30% pool-composition target is the exact metric that would have flagged `OUTLOOK` WRONG #1 automatically. Promote to roadmap as a real dashboard (see **T4**). |
| Non-negotiable: free tier never gated | — | `MF v0.5` r5 | **CONFLICT** | **C3** |
| Non-negotiable: provider contracts exclude training rights | — | `MF v0.11` **RATIFIED standing rule** (no Bee directive text to any provider that trains on inputs by default) + `MF v0.15` **OPEN-9** refinement (a plainly-informed user *may* choose such a provider; ORACLE never chooses silently) | **COMPATIBLE — superseded upward** | Replace the contract-level promise with the ratified supply-chain rule + informed-consent carve-out. The rail version is stronger: it binds providers we have no contract with. |
| Non-negotiable: 30-day advance notice on tier price changes | — | `MF v0.16` seeded a live rate card the same day it was ruled; no notice mechanism exists | **CONFLICT (unimplemented promise)** | Either build the notice path or scope the promise to *increases after first public sale*. Currently unenforceable and nobody is watching it. |
| Non-negotiable: no silent degradation | — | consistent with `MF v0.16` goodwill rules ("charge-the-lesser survives in tokens; NO minimum per-directive charge; the house eats rounding") | **COMPATIBLE** | none |

### 2.3 `language_firewall.md` (55 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Required: **BLiNG!** — "Never 'BLING,' 'Bling,' '**token**,' 'credits,' or 'points'" | reads as an absolute ban on "token" | `MF v0.12` firewall clarification, canon: "'Token' is forbidden **IN CONJUNCTION WITH BLiNG! ONLY** — never describe BLiNG! as a token; '**Oracle Token**' as ORACLE's own purchasable unit is compliant" | **CONFLICT (wording, not intent)** | One-line amendment. As written, this bullet bans the product's own name; the rail already ruled it doesn't. |
| Forbidden: "**Token**" when referring to BLiNG! denomination (with the input/output-token carve-out) | already correctly scoped | `MF v0.12` | **COMPATIBLE** | Add "Oracle Token" to the same carve-out sentence for symmetry with the row above. |
| Forbidden: "**Chatbot**" · "**AI assistant**" as a noun for AtlasOracle | absolute | `MF v0.7` — chat-app-shaped console; positioning sentence "executive assistant **and director**" | **CONFLICT** | Same ruling as `platform_thesis.md` L14. Suggested resolution that keeps both: ban *chatbot*, permit *assistant* only in the compound "executive assistant and director of your AI experience" — the distinction being that ORACLE directs models, it does not impersonate one. |
| Required: **Directive** — "Never 'prompt,' 'query,' 'request,' or 'command.'" | — | `MF v0.1` §2 planned `oracle_prompt_logs` and a "**prompt** console"; as-built table is `atlasoracle_directives` (correct); `MF v0.7` vision #1 describes a chat-app surface | **COMPATIBLE (Bee-facing)** / **flag (internal naming)** | Keep the rule for user-facing copy. Add an explicit line that internal identifiers may use provider vocabulary — otherwise every future schema review re-litigates this. |
| Required: **Bee** — "Never 'user,' 'customer,' 'subscriber,' or 'account holder.'" | — | rail rulings use "user" throughout (`MF v0.5` r3 "USERS BUY ORACLE TOKENS"; `MF v0.15` OPEN-9 "informed **user** choice"); `MF v0.8` site topology contemplates a standalone `.ai` destination whose visitors are not Bees | **CONFLICT (unresolved category)** | **Open question for Butch:** what is a non-Bee ORACLE customer called? A standalone consumer gateway has customers who have never heard of HONEYCOMB. Nothing in canon names them. |
| Required: **Free tier as floor** — "the structural commitment that free access is permanent" | — | `MF v0.5` r5 | **CONFLICT** | **C3**. Note this one is *load-bearing*: it is a required term, so every AI generating ORACLE copy is instructed to assert permanence. |
| Required: Router · Provider · Wallet · Canon · Builder · HONEYCOMB · Astra · Nova | — | consistent across the rail | **COMPATIBLE** | "Wallet" needs a look after the Oracle-Token rewire — `MF v0.5` removed escrow wiring from FRONT16's scope and the badge now shows a token balance, so "wallet" may be describing a thing that no longer exists in that form. |
| Required: **Master endeavor** (marketing only) | — | `MF v0.7` vision + `whitepaper.md` §6 | **TREASURE** | See **T8**. |
| Forbidden: "Premium tier" — "the tiers are free, standard, frontier" | — | `MF v0.5` §2/§3 delta keeps tier *structure* as mechanics; `OUTLOOK` CLOSE — "tiers must become **quality bands** resolved against pool data," not fixed model pins | **COMPATIBLE now / STALE soon** | Watch: when tiers become quality bands over an unbounded pool (`MF v0.5` r4), a three-name taxonomy may not survive. Not an edit today. |
| Tone + voice exemplars ("We are not selling," "Mutable canon is not canon," "You are the corpus unless you pay not to be") | — | nothing on the rail covers voice | **TREASURE** | See **T7**. Note one exemplar — "*Models are commodity. How you route, what you anchor, who owns the data — that's the product*" — is independently re-derived by `OUTLOOK` RIGHT #2 eight weeks later. It aged into a thesis. |
| — (absent) | doc has no entry for BLiNG!'s Bee-facing alias | `MF v0.4` §1 states the firewall as "BLiNG! = '**Perks**' never token/coin" | **CONFLICT (between old canon and rail)** | "Perks" appears nowhere in this file. Either the rail line is a drafting artifact or this doc is missing a required term. Needs a one-word confirmation from Butch. |

### 2.4 `categorization.md` (66 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Directive categories (10: scaffold, draft, integrate, refactor, analyze, classify, translate, estimate, correlate, suggest) | fixed taxonomy, classified at parse-time | `MF v0.4` §1 confirms 10 categories as-built; `OUTLOOK` CLOSE — "right idea; fixed taxonomy will drift across ~28 growing astras → **categories become data**" | **COMPATIBLE now / roadmap change flagged** | No edit; add a forward-note that the list is destined for a table. |
| Provider categories (frontier / mid-tier / fast / oss / specialized) | — | `MF v0.5` r4 — "NO 5-PROVIDER LIMIT — as many providers as there are QUALITY providers"; `MF v0.10` — `atlasoracle_provider_pool` **never queried** by route (hardcoded `TIER_PROVIDER_MODEL` map) | **COMPATIBLE (taxonomy)** / **CONFLICT (as-built)** | The five *categories* survive fine; what's broken is that nothing reads them. Category set should live in the pool table, not in prose. |
| Routing rules by tier — "Free tier directives route to `oss` first, `fast` second" | — | `MF v0.13` — free pinned to `claude-haiku-4-5` | **CONFLICT (as-built)** | Same fix as `economic_constitution.md` free-tier routing row. |
| Directive × provider fit table | names Claude Opus / Sonnet / Haiku generations by class | `MF v0.13` — Sonnet 4.6 / Opus 4.7 are **Legacy**; current pins are haiku-4-5 / sonnet-5 / opus-5 | **STALE** | The table is written by *class* not by version in most cells — good design. Only the parenthetical model names need refreshing. |
| Drift downweighting ("per white paper §5") | providers flagged drift-suspicious get de-prioritized per category until manual review | `MF v0.4` — pool rows "all active, all w=1.000, **drift never checked**"; `OUTLOOK` CLOSE — "right concept, never run once → **heartbeat, not a column**" | **CONFLICT (unbuilt)** | Now genuinely buildable: `MF v0.17`/`v0.18` shipped a working unattended heartbeat. See **T9**. |
| Selection determinism — "The routing log records the selection reason for every directive. Bees inspecting their log see *which* provider was selected and *why*." | — | `MF v0.10` — selection is a hardcoded map; no Bee-facing routing log surface exists | **CONFLICT (unbuilt)** | This is a *published sovereignty promise* (`whitepaper.md` §5, §10 soft-launch list) with no implementation. Rank it above cosmetic fixes. See **T13**. |

### 2.5 `rate-cap-pricing.md` (260 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Header — "feeds `economic_constitution.md` … replaces the placeholder numbers in §3" | authority chain | still the right chain, wrong currency | **CONFLICT** | **C1** |
| §2 provider cost table (Opus 4.7 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, Groq Mixtral ~$0.27, OSS Llama 3) | "verified May 2026" | `MF v0.13` — current-gen pins, Sonnet 5 intro $2/$10 (−33% through 2026-08-31), Opus 5 $5/$25; `MF v0.16` §3 — **price to durable (post-intro) cost**, intro delta is margin during the window, not a September hike | **STALE** | Replace the table with a pointer to `oracle_model_rates` + the durable-cost rule. Re-verifying prices live at execution is already the rail's practice (`MF v0.13`). |
| §2 lever 1 — "prompt caching … the single biggest cost lever. AtlasOracle MUST use prompt caching aggressively" | — | `MF v0.10` — **CACHING INERT**: the 1,637-token canon bundle is below cache minimums (Haiku 4096 / Opus 2048); only Sonnet's 1024 minimum could cache it. "'Prompt caching = #1 cost lever' is **aspiration, not fact**, at current bundle size" | **CONFLICT (as-built)** | Keep the claim — but it becomes true only when the canon bundle grows past ~4K tokens, which is precisely what the canon-storage pipeline (**T10**) would do. Note the coupling: the cache lever and the canon-sync pass are the same project. |
| §2 Opus 4.7 "+35% tokenizer buffer" | bake +35% into cost-calculate | `MF v0.15` — OPS15 corrects the record: "the 'estimator under-counts 2.3×' claim from OPS13/DOCS1 was **wrong** — real drift **~6.5%**" | **STALE / CONFLICT** | The buffer is now a measured quantity, not a guess. Also affects `atlasoracle-patchboard-addendum.md`'s `tokenizer_buffer_opus_4_7` switch, whose subject model is retired. |
| §3.1–3.4 typical directive economics | worked cost models per tier | shapes still sound; `MF v0.16` §4 flagship sanity check ("founder's first directive retails ~14 tokens ≈ $0.014; casual daily use ≈ $3–9/month") is the successor | **COMPATIBLE (method)** / **STALE (numbers)** | Keep the method — worked examples per tier are how the pricing stays checkable. Re-run against the live card. |
| §4 BLiNG! pricing tiers | 0.5/1/2 standard, 5-base + surcharges, 50 cap | `MF v0.16` §4/§5 | **CONFLICT** | **C1** |
| §5.1 per-Bee rate caps (free 2/10/50, standard 3/30/200, frontier 1/5/20, all-tiers 250/day) | — | `MF v0.5` §2/§3 delta — "rate caps … survive as mechanics"; `atlasoracle_check_rate_caps` RPC live per `MF v0.4` | **COMPATIBLE** | none — this section is currency-independent and survives untouched |
| §5.2 per-Astra caps via `astra_registry.atlasoracle_rate_cap` | "post-launch enhancement; not in current schema" | still absent | **COMPATIBLE (accurate self-description)** | none |
| §5.3 anomaly detection (10× baseline, ASN signup burst, cross-Bee payload similarity) | — | nothing on the rail; `MF v0.10` watch-list — "free tier is the only working tier = 100% of usable traffic is unmetered spend bounded **only by rate caps**… acceptable at zero users, unacceptable at launch" | **TREASURE** | See **T4**. The rail independently identified the exposure this section was written to close. |
| §5.4 signup friction (email+phone, KYC at order-book, geo-block, 5 accounts/IP/hr, device fingerprint) | "already locked per canon" | consistent with root `CLAUDE.md` Tier-1 abuse defenses | **COMPATIBLE** | none |
| §6 cost-preview UX (preview above 10 BLiNG!; none at exactly 5) | — | `MF v0.10` — the gate was **dead code** (constant 6.5 estimate vs 10.0 threshold, arithmetically unreachable); `MF v0.15` — "frontier confirm_cost gate **re-derived and reachable**"; `MF v0.16` §6 — "confirm frontier gate threshold still sane under real rates … quick check next ops pass" | **CONFLICT (currency) / partially built** | The *server-side gate* now exists and works. The *UX* in this section — the modal, the estimated-time line, the copy — was never built. Re-denominate the threshold and keep the modal spec. See **T5**. |
| §7 settlement (daily BLiNG!→treasury, monthly provider invoices via Stripe, quarterly Treasury Council review) | — | `MF v0.15` no treasury leg; provider billing is direct | **CONFLICT** | Rewrite around `oracle_token_ledger` SUM + direct provider invoices. The **variance >10% → cost-model retune** trigger is worth keeping verbatim. |
| §8 open Q6 — "When BLiNG! hits $2, re-denominate or let prices float?" | — | `MF v0.16` §1 — the anchor is **permanent**; rates move, the anchor doesn't | **MOOT — resolved** | Delete the question; record the answer. |
| §9 "numbers to commit to canon" diff block | — | superseded in full | **CONFLICT** | Replace with the `MF v0.16` §4 card + a pointer to the table. |

### 2.6 `bling-ledger-interface.md` (434 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Whole document | escrow architecture: purpose-locked `bling_pots` sub-balance, five ledger functions, BLiNG! debits to `@combtreasury` | `MF v0.5` r2 — "The live escrow mechanism (`bling_pots` purpose='atlasoracle', the 6 `atlasoracle_*` RPCs, two-leg `bling_transactions` deposits) is **SUPERSEDED** as ORACLE's economy. Disposition … = **OPEN-7**, Butch's call, no urgency; until ruled, **NOTHING touches it**." | **CONFLICT — entire doc** | **Do not delete.** OPEN-7 is unruled, the infra is live (`bling_pots` confirmed present in DB this pass), and this file is its only documentation. Recommend a header banner: *SUPERSEDED as ORACLE's economy per MF v0.5; retained as the specification of dormant infrastructure pending OPEN-7.* |
| §2 purpose-locked pots as a **generalizable** pattern (atlasADs, Crowdfunding, prediction markets) | — | nothing on the rail; the pattern outlived ORACLE's use of it | **TREASURE** | If OPEN-7 rules "remove," the *pattern* should be extracted to platform canon before the doc is retired — three named future Astras were designed against it. |
| §3.4 `debit()` / §3.5 `credit()` | atomic, row-locked, idempotent by `sourceRef` | `MF v0.10` — "`atlasoracle_debit` **structurally cannot succeed** — RPC writes two ledger legs with the same `source_ref` against a unique partial index; second insert always violates… `atlasoracle_credit` carries the identical defect" | **CONFLICT (as-built defect)** | Record the defect in the doc. `MF v0.10` ruled *do not patch the dying economy* — so this stays broken by decision, which is exactly the kind of thing that must be written down or someone will "fix" it later. |
| §4 directive lifecycle (10 steps: cache check → canon-read → provider-select → cost-calculate → balance check → debit → invoke → return) | — | `MF v0.15` — "Balance gate 402s **BEFORE** any spend; rates from `oracle_model_rates` (missing rate → 503 refuse, never guess)" — the same sequencing, in tokens | **COMPATIBLE as mechanics — TREASURE** | The lifecycle is the most reusable asset in this file. Recommend lifting §4 (steps 1–10, minus the escrow nouns) into the token-economy doc rather than re-deriving it. |
| §5 cold-start UX (fund 10 / 50 / 200 BLiNG!; low-escrow nudge; mid-session zero-out) | — | `MF v0.16` §5 packs $5→5,000 · $10→11,000 · $25→30,000 · $60→78,000; "no purchase flow exists yet — packs above are its spec" | **CONFLICT (superseded)** | The *UX shape* (three presets + custom, one-tap, auto-resume the blocked directive) is directly portable to the token purchase flow and should be, since no other doc specifies it. |
| §6 free-tier short-circuit | already amended 2026-07-27 with the `cost_bling` retirement note citing `MF v0.14` | `MF v0.14` — column dropped from production | **COMPATIBLE — already reconciled** | none (DOCS3, commit `8459592`) |
| §7 cache-hit pricing (50% standard discount) | — | depends on `atlasoracle_canonical_responses`, **verified absent from DB this pass** | **CONFLICT (unbuilt) + currency** | Re-express in tokens whenever the cache is built. Don't edit in isolation. |
| §9 wallet history representation | main wallet shows escrow macro-transfers; ORACLE gets its own history surface | escrow dead; but the **separate ORACLE history surface** idea has no rail equivalent | **CONFLICT (currency) / TREASURE (the surface)** | The two-surface split (clean main wallet + first-class ORACLE history) is good UX design that should survive the currency change. |
| §11 reconciliation queries | already amended 2026-07-27 for `cost_bling`; still joins `bling_transactions` | `MF v0.15` — paid path writes `oracle_token_ledger` | **CONFLICT (residual)** | DOCS3 fixed the column but not the table. The queries as written will return zero rows forever against the live economy. Cheap, high-value fix. |
| §13 Q6 first-deposit promo (+10% up to 20 BLiNG!) | Treasury Council ratification needed | `MF v0.16` §5 — prepay bonuses are **already in the pack ladder** ($10→11,000 = +10%; $60→78,000 = +30%) | **MOOT — answered** | The mechanism shipped as pricing structure. Record it. |
| §14 migration v0.1→v0.2 | "no data to migrate; `atlasoracle_directives` is empty" | `MF v0.10` — table now has real rows; first directive 2026-07-27 13:40:26Z | **STALE** | Historical section; date-stamp it rather than editing. |

### 2.7 `atlasoracle-canonical-cache.md` (295 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Whole document | pre-computed encyclopedia of canon-deterministic answers; serve without a provider call | `MF v0.2` §2 — "**ANSWER-CACHE (Butch, mapped long ago, deferred)**: logged results searchable in-house so an existing answer short-circuits a paid provider query. Deferred as a feature; anticipated in schema now" | **TREASURE — top of the list** | Butch independently re-surfaced this idea from memory on 2026-07-27 without the doc in front of him. The doc is the full spec of the thing he asked for. See **T1**. |
| §3 storage — `atlasoracle_canonical_responses` with `vector(384)`, ivfflat index, `pg_vector` "pre-installed on modern Supabase Postgres" | — | **DB probe this pass: table ABSENT; `vector` extension NOT installed** (only `pg_trgm`) | **CONFLICT (unbuilt + wrong precondition)** | The "pre-installed" assumption is false on this project. Any build pass must enable `vector` first — that's a migration, hence a MIGRATION-AMENDMENT dispatch, not a casual step. |
| §3 embedding column placement | on the new cache table | `MF v0.2` planned `oracle_prompt_logs` to "carry `response_hash` + embedding-ready column from DB7 so the cache is a later index, not a later migration"; `MF v0.4` then **killed the `oracle_*` schema plan** ("DB7 explicitly forbids creating `oracle_*` tables") | **CONFLICT (unresolved)** | **Open question:** the embedding-ready column Butch asked for has no home. `atlasoracle_directives` is metadata-only by sovereignty rule (`MF v0.4`) and a `response_hash` is arguably content-derived. Needs a design ruling before any cache work. |
| §4 hit path, incl. the `cost_bling` note | already amended 2026-07-27 citing `MF v0.14` | — | **COMPATIBLE — already reconciled** | none (DOCS3) |
| §5 cache-hit pricing (50% standard discount; free 0; frontier full) | BLiNG! | `MF v0.16` | **CONFLICT (currency)** | **C1**. The 50% figure is a policy choice worth preserving as-is. |
| §6 seed set "~100 entries… ~3–5 × **19 Astras** = ~70" and platform entries incl. "**33-rank Bling Rank** system overview", "Founding Bee window (July 4 → Sep 11) mechanics" | — | Astra count: root `CLAUDE.md` says 28; `per-astra-surfaced-actions.md` says 26; `MF v0.4` says "~28". Rank: root `CLAUDE.md` — "**the RiNG** … 9-level action-count rank" (renamed May 17, 2026). Founding window: `MF v0.5` r1 no dates. | **STALE (counts) + CONFLICT (rank naming, dates)** | Three seed entries would generate factually wrong canon answers if built today. Good argument for building the cache *after* the reconciliation edits land, not before. |
| §8 gap queue (auto-growth from operator review of ≥10 misses/30d) | — | nothing on the rail | **TREASURE** | The learning loop. Nothing else in ORACLE canon describes how the system gets cheaper over time from its own traffic. |
| §10 "why this matters more than it looks — sovereignty mechanism" | every cached answer is one not routed outside | `OUTLOOK` RIGHT #1 (sovereignty as structure) + RIGHT #2 (canon-context routing is the moat) | **COMPATIBLE — reinforced** | none. This section's argument is *stronger* now: the cache is the only mechanism in canon that reduces provider dependence over time. |
| §11 phases 1–4 ("pre-launch, soft launch" / "weeks 1-4" / "months 2-6" / "post-Swarm") | date-keyed | `MF v0.5` r1 | **CONFLICT** | **C4** — re-key to gates (seed-live → gap-queue-live → auto-promotion → third-party contribution). |

### 2.8 `canon-storage-paths.md` (245 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Whole document | git → Supabase storage sync feeding `canon-reader.ts`, with hash-based invalidation | `MF v0.10` watch-list — "**canon-sync pipeline and `atlasoracle-canon-invalidate` required by canon docs but ABSENT from repo**"; route uses bundled `canon.ts` instead of `canon-reader.ts` | **CONFLICT (unbuilt)** | See **T10**. This is the doc the rail explicitly noticed was unimplemented. |
| §2.1 bucket `themanual-canonical` + `master_plan/<slug>/` sub-path | — | bucket exists and is in active use (root `CLAUDE.md` MMF URL); the `master_plan/` sub-path is the new part | **COMPATIBLE** | none |
| §2.2 Astra-slug table incl. "MiNiWaVeS / Wave & Flow", "HoneyComb.global" | — | root `CLAUDE.md` — "**MiniWaves** (canon per MMF v2.8; domain MiniWAVES.app. **NOT 'MiNiWaVeS'** — that alternating-caps form was never ratified and was scrubbed from the code 2026-07-25)"; "**HONEYCOMB** (all-caps; never 'HoneyComb' mixed-case)" | **CONFLICT (brand casing)** | Cheap mechanical fix; same string appears in `per-astra-surfaced-actions.md` and `atlasoracle-canonical-cache.md`. One sweep, three files. |
| §2.2 "slug must match `astra_registry.slug` (Lock 8)" | — | Lock 8 was deferred per root `CLAUDE.md`; `MF v0.4` references `astra_registry.default_name='AI'` so a registry exists | **needs verification** | Not verified this pass (out of `oracle` scope to probe the registry's shape). Flagging as an unclosed dependency. |
| §3 sync pipeline as a GitHub Action on push to main | — | root `CLAUDE.md` GIT AMENDMENT — pushes require the human's click; a push-triggered Action is compatible with that (it fires *after* the human pushes) | **COMPATIBLE** | none |
| §3.3 invalidate endpoint + optional pre-warm | — | endpoint absent from repo (`MF v0.10`) | **CONFLICT (unbuilt)** | **T10** |
| §4 `atlasoracle_canon_reads` cache table | schema documented | **table exists** (DB probe this pass); `MF v0.10` — "**never written**" | **CONFLICT (built but inert)** | Rare shape: the schema shipped, the writer didn't. One of the cheapest wins available — the table is waiting. |
| §4.3 pre-warmer + Anthropic prompt-cache primer ("a few cents/Astra/night… all subsequent directives get the 90% input discount") | — | `MF v0.10` — caching inert because the bundle is 1,637 tokens, below the 2,048/4,096 minimums | **CONFLICT (as-built) — but this doc is the fix** | The pre-warmer + full-canon assembly is exactly what pushes the bundle over the cache minimum. `rate-cap-pricing.md`'s "#1 cost lever" claim becomes true only when this ships. |
| §5 per-Astra canon read order (platform thesis → manifesto → firewall → categorization → Astra canon), 8–25K tokens | — | route sends 1,637 tokens total | **CONFLICT (as-built)** | Quantifies the gap: the running router carries ~10% of the canon the spec describes. `OUTLOOK` RIGHT #2 calls canon-context routing "the moat" — the moat is currently 1,637 tokens deep. |
| §7 Q3 public-read vs service-role-only on the canon bucket ("Recommend: public-read. Sovereignty includes transparency.") | — | consistent with `MF v0.4` sovereignty posture | **COMPATIBLE** | Worth ratifying explicitly — it's a security-adjacent default sitting unratified. |

### 2.9 `atlasoracle-patchboard-addendum.md` (159 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| §1 architectural lock — "**every** numeric or policy knob in the AtlasOracle specs is a Patchboard switch, not a hardcoded value" (Butch, 2026-05-21) | — | `OUTLOOK` RIGHT #4 — "**RATES/PROVIDERS AS DATA**: pool growth = inserts, not deploys. Shape right; tuning never happened." `MF v0.15` — rates read from `oracle_model_rates` at runtime | **COMPATIBLE — same principle, re-derived** | Butch ruled this in May and the rail re-derived it in July. Strong signal the principle is right. |
| §2 24-switch inventory | 7 BLiNG!/escrow-denominated (topups ×3, first-deposit promo, frontier preview threshold, frontier max, low-escrow nudge) | superseded with the escrow economy (`MF v0.5` r2) | **CONFLICT (7 switches dead)** | Re-derive the inventory against the token economy; ~14 of 24 survive untouched (rate caps ×10, similarity threshold, auto-promote, anomaly multiplier, prewarmer cron). |
| §2.1 `tokenizer_buffer_opus_4_7` default 35% | — | `MF v0.13` Opus 4.7 retired; `MF v0.15` measured drift ~6.5% | **STALE** | Rename to a model-agnostic `estimate_buffer_pct` keyed per model row. |
| §2.1 governance — "Treasury Council holds the vote authority… quorum + ratified vote" | — | `MF v0.16` pricing was ruled directly by Butch; no Treasury Council exists in any rail artifact | **CONFLICT (governance body unbuilt)** | Not ORACLE's to resolve — it's a platform-governance question. Flag upward rather than editing. |
| §4 `patchboard_switches` table | schema documented; §7 Q1 admits "switches need a working table … before any of the above are 'live tunable'" | **DB probe this pass: table ABSENT** | **CONFLICT (unbuilt) — accurately self-described** | The doc predicted its own state honestly. |
| **Cross-doc tension** (not in any single §) | patchboard is the single runtime-value store for all knobs | `MF v0.15`/`v0.16` put rates in **`oracle_model_rates`**, a purpose-built table | **CONFLICT — architectural, needs a ruling** | Two competing runtime-value stores now exist in canon. Either `oracle_model_rates` is a patchboard-shaped special case, or the patchboard lock is narrowed to policy knobs and rates stay separate. Cheap to decide now, expensive after a third store appears. |
| §6 "generalizes to every Astra… HONEYCOMB's entire economic and policy surface is *one queryable table*" | — | nothing on the rail | **TREASURE** | See **T2**. |

### 2.10 `per-astra-surfaced-actions.md` (430 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| Whole document | ~130 drafted directives (label + directive text) across 26 Astras + the hub | `MF v0.4` watch-list — "**surfacedActions wiring deferred**"; `MF v0.9` — badge component exists (`AtlasOracleWalletBadge.tsx`, 318 lines, commit `efd9b88`) but is "**mounted NOWHERE** (zero import sites)" | **TREASURE — most immediately usable** | See **T3**. The component and its content both exist; only the wiring is missing. |
| Header — "**26** canonical Astras (23 grouped + 3 Core)" | — | root `CLAUDE.md` and `whitepaper.md` §1 both say **28**; `MF v0.4` says "~28 astras" | **CONFLICT (count)** | Not ORACLE's number to set, but the discrepancy will propagate into any cache seed or marketing copy generated from these docs. Needs one authoritative count. |
| Core (3) — "**AtlasOracle**, fnulnu, The Freedom Exchange are substrate… **not Bee-facing destinations at soft launch**. SurfacedActions land post-Swarm when AtlasOracle ships its standalone destination." | — | `MF v0.2` — ORACLE's home is **themanual.tech/oracle**, a Bee-facing route; `MF v0.7` §1b — full two-column consumer console vision; `MF v0.8` — site topology sealed inside the manual.tech skin | **CONFLICT** | ORACLE is no longer substrate-only. It needs its own surfacedActions set, and this doc is the natural home for them. |
| Intro — "Surfaced actions are **tier-agnostic**; the router selects the appropriate tier based on directive complexity" | — | `MF v0.7` vision #3, "**the department of claudes**": "ORACLE decides which LEVEL of AI a task actually needs and routes down-tier when quality allows; **the savings ARE the pitch**" | **COMPATIBLE — TREASURE** | This one line, written in May, is the mechanical foundation of the revenue story Butch sealed in July. Worth citing in the console spec. |
| #30 "MiNiWaVeS / Wave & Flow" (and "Mini Waves Motion" throughout) | — | root `CLAUDE.md` — MiniWaves; alternating-caps scrubbed 2026-07-25 | **CONFLICT (brand casing)** | Same one-sweep fix as `canon-storage-paths.md`. |
| #35 TheRANK — "the **33-rank Bling Rank** system" | — | root `CLAUDE.md` — "**the RiNG** … 9-level action-count rank" (May 17, 2026 rename) | **CONFLICT (superseded mechanism)** | Four directives in this block reference a rank system that was replaced. |
| "How this gets consumed" — `<AtlasOracleWalletBadge astraSlug canonPaths surfacedActions />` | prop contract | `MF v0.9` — the real component "three states, modal + mobile sheet, tier picker, calls `atlasoracle-route`"; FRONT16 amended to wire it (top-level `/oracle` route **before** the `/:slug` catch-all) | **needs verification** | Prop shape not verified against the real component this pass (component is FRONT lane's, not docs'). Flagging: the doc's contract may not match the built component. |
| Open Q1 — "Waggles function… drafted as P2P tipping based on name + placement. If Waggles is something else, the directives need revision." | — | root `CLAUDE.md` places Waggles in Layer 2 (productivity), **not** economy | **CONFLICT — the doc's own open question, answered badly** | Layer 2 placement suggests Waggles is not primarily tipping. Its 4 directives are probably wrong. |
| v1.1 expansion (12 draft Astras incl. atlasADs, AI Tours, AtlasADVOCATE) | "pending §6.1 reconciliation" | `MF v0.15` DOCS4 shows a live media/creator lane; root `CLAUDE.md` cites `atlasADs.biz v1.0` as a real doc | **STALE** | The "pending" framing predates work that has since happened elsewhere. |

### 2.11 `whitepaper.md` (690 lines)

| § | What old canon says | What the rail says now | Verdict | Proposed edit |
|---|---|---|---|---|
| §1 Abstract — dual nature (build-time router / runtime wallet), "Models are commodity. How you route, what you anchor, who owns the data — that's the product" | — | `MF v0.3` two roles; `OUTLOOK` RIGHT #2 re-derives the commodity claim independently | **COMPATIBLE — the thesis held** | none. Note `MF v0.3`'s framing is *sharper*: astras are clients #1..n, the consumer console is one more client. |
| §1 "Not a model. We don't train." | — | `MF v0.6` | **CONFLICT** | **C2** |
| §2 The Extractive AI Problem (8 named mechanisms: user-as-corpus, API-drift lock-in, alignment-shaped-by-capital, no genuine opt-out, vendor-as-arbiter, unipolar failure, cost asymmetry, free-is-a-trap) | — | nothing on the rail attempts this | **TREASURE — highest-value prose in the set** | See **T7**. Aged *better* than when written: `TOS v0.1`/`v0.2` turned several of these claims into cited, verified provider-by-provider facts. |
| §3 Router not worker — "We do not compete with providers. We are their customer." | — | `TOS v0.1` — OpenAI §3.3(e) prohibits building **competing** models but permits classifiers; `TOS v0.1` §2(b) — "routing TO Grok is not competing WITH Grok, but **justice should bless that reading**" | **COMPATIBLE — and now legally load-bearing** | This sentence is no longer just positioning; it is the argument ORACLE will make to justice. Worth marking as such so it isn't casually reworded. |
| §3 Free tier as floor | "permanent and structural, not a marketing funnel" | `MF v0.5` r5 | **CONFLICT** | **C3** |
| §3 "the router's overhead is low enough that the free tier is **not subsidized by the paid one**" | — | `MF v0.16` §2 — free is "rate-capped, **subsidized by paid margin**" | **CONFLICT — direct contradiction** | Sharpest single-sentence conflict in the set. Not covered by **C3** (which is about permanence) — this is about *who pays*. The rail's answer is the honest one; the whitepaper's claim is now false. |
| §4 Dual nature / one product, two front ends | — | `MF v0.3` architecture consequence: adapter core as a callable library first, console as client #1 | **COMPATIBLE — refined** | Update to the library-with-many-clients framing; it's the same idea with a cleaner implementation story. |
| §5 master_plan folder / directive object / six-stage pipeline | receive → parse → canon-read → provider-select → invoke → return | `MF v0.4` — as-built matches; `MF v0.10` — canon-read reads a bundled file, provider-select is a hardcoded map | **COMPATIBLE (shape)** / **CONFLICT (two of six stages)** | Stages 3 and 4 are described as more dynamic than they are. |
| §5 "the router persists only what is needed for billing… **never the directive content**… **except where the user has explicitly enabled conversation history**" (also §9 "What the router persists") | — | `MF v0.12` — "OPT-IN FUEL LANE: user opt-in data sharing for rewards is compatible with sovereignty… **Whether this mechanism already exists in older canon (whitepaper) is UNVERIFIED — docs hunt available on request.**" | **★ ANSWERS AN OPEN RAIL QUESTION** | **It exists.** The whitepaper carved out user-enabled retention twice, in §5 stage 6 and in §9's persistence list. `MF v0.12`'s open item can be closed: the opt-in lane is *pre-existing canon*, not a new concession. Also note the tension it creates with `MF v0.4`'s "structurally enforced — no content columns exist": honoring the carve-out requires a content column that sovereignty canon says must not exist. That is a real design fork and should be ruled deliberately, not discovered during a build pass. |
| §5 provider selection — task fit, tier, pricing, **alignment posture**, availability; "Selection logic is published" | — | `MF v0.10` — hardcoded `TIER_PROVIDER_MODEL` map; `OUTLOOK` WRONG #1 — "A router whose paid paths all land on one provider is a **reseller**" | **CONFLICT (as-built)** | The **alignment-posture** criterion — de-prioritizing providers that tighten policy against sex-ed, harm reduction, dissident comms — appears nowhere on the rail and is the most differentiated selection input in the set. Don't lose it in the rewrite. |
| §5 identity at the routing layer (pseudonymous `bee_id`; hashed email/phone; transient IP) | — | consistent with `MF v0.4` metadata-only | **COMPATIBLE** | Verify against the real `atlasoracle_directives` columns in a future pass. |
| §5 multi-tenant separation + **Nova canon inheritance** (HONEYCOMB canon + parent Astra canon + Nova additions; conflicts resolve most-local, with a warning in the routing log) | — | nothing on the rail covers Nova canon composition | **TREASURE** | See **T12**. |
| §5 failover + drift detection | availability failover immediate; drift → downweight + log | `MF v0.4` — "drift **never checked**"; `OUTLOOK` — "heartbeat, not a column" | **CONFLICT (unbuilt)** | **T9** |
| §6 Master Endeavor — the orchestration system as a product; Bee defines master_plan → issues directives → iterates → ships | — | `MF v0.7` vision #5 — "**THE RAIL AS PRODUCT PRIMITIVE**: user-facing orchestration runs on the rail system built 2026-07-26… dispatches/lanes/priority/after_pass map one-to-one onto multi-AI task direction" | **TREASURE — convergent** | See **T8**. Written in May as aspiration; the rail shipped in July as the mechanism. The two halves have never been written down together. |
| §6 Mini Waves integration — directive decomposition surfaced as a ratifiable hierarchy, "Nothing happens that the Bee has not seen" | — | `MF v0.8` scope doctrine — "everything… an AI can do, oracle will **IF YOU LET HIM**… capability is universal, **ACTION IS CONSENT-GATED**" | **COMPATIBLE — the same principle, earlier** | The decomposition-then-ratification loop is the concrete UX for the consent gate Butch sealed in July. Cite it in the console spec. |
| §7 The wallet in every spine (badge, per-Astra integrations, 6-step UX flow, free-vs-paid UX, composition) | — | `MF v0.9` — badge built, unmounted; `per-astra-surfaced-actions.md` holds the content | **COMPATIBLE — unbuilt** | The three docs (whitepaper §7, surfaced-actions, the built component) are three-quarters of a shipped feature that has never been assembled. |
| §7 "There is **no feature gate** between free and paid. Every Astra integration works on the free tier." | — | `MF v0.5` r5 / OPEN-8 | **CONFLICT (dependent on C3)** | Ruling on **C3** decides this row too. |
| §8 Economics — three tiers, BLiNG! denomination, provider cost reconciliation, free-tier sustainability, provider partnership economics | — | **C1** (currency), `MF v0.15` (no treasury leg), `MF v0.16` (rate card) | **CONFLICT** | Largest single rewrite in the set. The §8 *structure* (tiers → denomination → reconciliation → sustainability → partnership) is the right outline for the token version. |
| §8 "the tiers are **characteristics of directives, not of accounts**" | — | `MF v0.16` per-directive token pricing; `MF v0.7` #3 auto-tier | **COMPATIBLE — strengthened** | One of the best lines in the paper and fully currency-independent. |
| §9 hard nevers (7) | never train on Bee directives · never share identity beyond pseudonymous · never let AI write master_plan · never lock builders in · never charge for the free tier · never monetize Bee data · never gate Astra core features behind paid AI | `MF v0.4` (structural sovereignty) · `MF v0.11` (supply-chain rule) · `MF v0.15` OPEN-9 (informed choice) · `MF v0.5` r5 (free tier open) | **5 of 7 COMPATIBLE (2 strengthened) · 2 CONFLICT** | The two free-tier nevers depend on **C3**. The training never is intact (**C2**). **Recommend the hard-never list be treated as the single highest-care edit in this whole reconciliation** — a publicly-stated "never" that quietly changes is the one failure mode this platform cannot afford. |
| §9 threat model (5 threats: provider compromise, router compromise, canon compromise, identity correlation, undetected drift) | — | `MF v0.11` supply-chain rule directly addresses threat 1; drift detection unbuilt (threat 5) | **COMPATIBLE — TREASURE** | The only threat model ORACLE has. Ratified provider rules made threat 1's defense concrete; worth updating rather than rewriting. |
| §9 "Never let the `master_plan` be writable by an AI. Canon changes through human commits, with messages and versions, only." | — | root `CLAUDE.md` GIT AMENDMENT + R7 ("**the human commits**"); `MF v0.14` R7 grant pair | **COMPATIBLE — now enforced by tooling, not just policy** | Worth saying so: the whitepaper claimed it in May; the terminal protocol enforces it in July. |
| §10 Roadmap & launch posture (all dates) | — | `MF v0.5` r1 · `OUTLOOK` WRONG #3 | **CONFLICT** | **C4** |
| §10 "What we will not do" — no own model · no chat-style assistant · no exclusivity · no acquisition | — | own model: `MF v0.6` (**reversed**); chat-style: `MF v0.7` #1 (**reversed**); exclusivity: `MF v0.5` r4 (**upheld**); acquisition: nothing on the rail | **2 CONFLICT · 1 COMPATIBLE · 1 unaddressed** | Two of four negative commitments have been reversed by ruling. The section must be rewritten or removed — a stale "we will not" list is a liability. |
| §11 How to participate (Builders / Providers / Bees / Evangelists / Skeptics), Founding Bee window dates | — | **C4**; provider-partnership terms have no rail equivalent | **CONFLICT (dates) / TREASURE (provider offer)** | See **T11**. |
| §11 "the AtlasOracle white paper is the first in a series… structural choices here calibrate the template for 27 other Astras" | — | `MF v0.1` §7 conventions — "white-paper convention (`ORACLE_WP_TECH`/`_CONSUMER` roll into `HONEYCOMB_WP_*`)" | **CONFLICT (structure changed)** | The rail's convention splits tech/consumer papers; this paper is a single document. Reconcile the series architecture before the next Astra paper is written against the old template. |

---

## 3. TREASURES — worth promoting to the roadmap

Ranked by (value × readiness). Each names what exists today and what's missing.

| # | Treasure | Where it lives | Why it matters now | Missing |
|---|---|---|---|---|
| **T1** | **Canonical response cache / encyclopedia** — full spec: 5 cacheable categories, embedding match at 0.15 cosine, ~100-entry seed, hash-based invalidation, gap queue, operator dashboard | `atlasoracle-canonical-cache.md` (295 lines, complete) | Butch re-surfaced this from memory on 2026-07-27 (`MF v0.2` §2) without the doc in hand. It's the only mechanism in canon that makes ORACLE **cheaper and more sovereign over time** rather than more expensive. §10's argument is the sovereignty case. | Table absent · `vector` extension **not installed** (migration required) · embedding-column home unresolved (see 2.7) · pricing needs token re-expression · 3 seed entries would generate stale answers today |
| **T2** | **Patchboard runtime + 24-switch inventory** — 3-scope cascade (Bee → Astra → Master), audit trail, `patchboard_switches` schema | `atlasoracle-patchboard-addendum.md` | `OUTLOOK` RIGHT #4 re-derived the principle ("rates/providers as data"). This doc is the general version, already inventoried, already scoped per governance level. | Table absent · 7 of 24 switches denominated in dead currency · collides with `oracle_model_rates` as a second runtime store (needs an architectural ruling) · Treasury Council doesn't exist |
| **T3** | **~130 surfaced-action directives across 26 Astras** — label + directive text, verb-mapped to the 10 routing categories, 4–7 per Astra | `per-astra-surfaced-actions.md` (430 lines) | The badge component **already exists** (`MF v0.9`: 318 lines, three states, modal + mobile sheet, tier picker). This file is its content. Wiring + content = a shipped feature. | Component mounted nowhere · prop contract unverified against the real component · ORACLE itself has no action set (it's listed as substrate) · brand-casing and rank-system fixes needed first |
| **T4** | **Abuse & anomaly detection** — 10× rolling-baseline trigger, ASN signup-burst pattern, cross-Bee payload similarity (>95% across 50+ directives/10min), async review queue | `rate-cap-pricing.md` §5.3 + `economic_constitution.md` reporting cadence (>30% provider concentration) | `MF v0.10` watch-list independently named the exposure: "free tier is the only working tier = **100% of usable traffic is unmetered spend bounded only by rate caps** — acceptable at zero users, unacceptable at launch." This spec is the answer, written two months earlier. | Nothing built · needs token re-denomination only in the reporting half |
| **T5** | **Cost-preview UX** — modal spec with estimated cost, estimated time, cancel/run; threshold policy; "no preview at base price" friction rule | `rate-cap-pricing.md` §6 | `MF v0.15` built the **server-side gate** ("frontier confirm_cost gate re-derived and reachable") — the client-side modal it gates has no spec on the rail. This is it. | Threshold in BLiNG! · `MF v0.16` §6 flags "confirm frontier gate threshold still sane under real rates" — unclosed |
| **T6** | **★ The opt-in retention carve-out already exists in canon** | `whitepaper.md` §5 stage 6 + §9 persistence list | Directly closes `MF v0.12`'s UNVERIFIED item ("whether this mechanism already exists in older canon (whitepaper) — docs hunt available on request"). **Answer: yes, twice.** | Creates a genuine fork with `MF v0.4`'s "no content columns exist, structurally enforced." Honoring the carve-out means adding a content column. Needs a deliberate ruling, not a build-pass discovery. |
| **T7** | **The Extractive AI Problem + hard nevers + voice exemplars** — 8 named mechanisms, 7 structural commitments, 5 quotable lines | `whitepaper.md` §2 + §9; `language_firewall.md` §Tone/Voice | The strongest marketing asset ORACLE owns, and it has aged *up*: `TOS v0.1`/`v0.2` converted several claims from assertion into cited provider-by-provider fact. `OUTLOOK` RIGHT #1 ("competitors ask users to trust a promise; ORACLE asks them to trust a schema") is the same argument in one sentence. | Nothing — this is publishable prose today, modulo **C2**/**C3**/**C4** edits |
| **T8** | **Master Endeavor / the Builder** — canon-first project construction; the orchestration system as a product | `whitepaper.md` §6 | `MF v0.7` vision #5 says the rail **is** the product primitive — dispatches/lanes/priority/`after_pass` map one-to-one onto multi-AI task direction. §6 is the customer-facing narrative for the thing that already runs HONEYCOMB. The two halves have never been written down together. | The convergence doc. Also §6's three worked examples (Nova, legal-aid org, grandmother's recipes) are ready-made marketing. |
| **T9** | **Drift detection + failover** — availability failover, drift-suspicious flagging, per-category selection downweighting, manual review loop | `whitepaper.md` §5 + `categorization.md` §Drift downweighting | `OUTLOOK` CLOSE: "right concept, never run once → **heartbeat, not a column**." `MF v0.17`/`v0.18` shipped a working unattended heartbeat that already claims dispatches and files reports. The missing piece now has a runner. | Nothing reads `atlasoracle_provider_pool` (weights all 1.000, drift never checked) |
| **T10** | **Canon-sync pipeline + prompt-cache pre-warmer** — git→storage sync, hash invalidation, nightly pre-warm with `cache_control: ephemeral` primer | `canon-storage-paths.md` (245 lines) | `MF v0.10` explicitly noticed this was "required by canon docs but absent from repo." It is also the **unlock for the #1 cost lever**: caching is inert only because the bundle is 1,637 tokens; full canon assembly is 8–25K. And `atlasoracle_canon_reads` **already exists in the DB, waiting to be written to**. | Sync Action absent · invalidate function absent · route uses bundled `canon.ts` |
| **T11** | **Provider partnership terms** — what partners get (predictable load, pseudonymous routing, aggregate performance data, published selection reasons) and what they must commit to (no training, no identity retention, policy-change transparency) | `whitepaper.md` §8 + §11; `economic_constitution.md` non-negotiables | The natural complement to the verified ToS corpus (`TOS v0.1`–`v0.2`). ORACLE has spent a day cataloguing what providers demand of *us*; this is the only document stating what we demand of *them*. | Never drafted as a standalone; `canon-storage-paths.md` references a `provider_partnership_terms.md` that doesn't exist |
| **T12** | **Nova canon inheritance** — HONEYCOMB canon + parent Astra canon + Nova additions, most-local-wins conflict resolution with a routing-log warning | `whitepaper.md` §5 multi-tenant separation | Nothing on the rail covers how a cloned Astra's canon composes. The moment Novas exist, every directive from one needs this rule. | Unspecified beyond the paragraph |
| **T13** | **Bee-facing routing log** — per-Bee, accessible from any Astra's wallet UI: which directive → which provider, at what cost, what latency, and **why** | `whitepaper.md` §5, §10 soft-launch list; `categorization.md` §Selection determinism | This is a *published sovereignty promise* with no implementation, and `atlasoracle_directives` already stores everything it needs. Highest promise-to-effort ratio in the set. | No surface built · selection *reason* isn't recorded (selection is a hardcoded map, so there is no reason to record yet) |

---

## 4. OPEN QUESTIONS THIS PASS SURFACED (for Butch)

Beyond the four headline conflicts, six things need a ruling and could not be resolved by reading:

1. **Chatbot / assistant.** `platform_thesis.md` L14 and `language_firewall.md` forbid the exact nouns `MF v0.7`'s sealed positioning sentence uses. Which wins?
2. **What is a non-Bee ORACLE customer called?** The firewall says never "user." Every rail ruling says "user." A standalone `.ai` destination has customers who are not Bees.
3. **Opt-in retention vs. no-content-columns.** `whitepaper.md` §5/§9 promise user-enabled conversation history; `MF v0.4` says content columns must not exist. Both are canon. (See **T6**.)
4. **Two runtime-value stores.** `oracle_model_rates` vs `patchboard_switches`. One architecture or two?
5. **"Perks."** `MF v0.4` §1 states the firewall as `BLiNG! = "Perks"`. The word appears in no master_plan doc. Real term or drafting artifact?
6. **Astra count: 26 or 28?** Three canon sources, two numbers. Any cache seed or marketing copy generated before this is settled will be wrong.

---

## 5. RECOMMENDED EDIT SEQUENCE (after rulings)

Not a schedule — a dependency order. Butch sets the pace.

1. **Blocked on C3 (free tier)** — five docs must move together: `economic_constitution.md`,
   `platform_thesis.md`, `language_firewall.md`, `whitepaper.md` §3/§7/§9.
2. **Blocked on C2 (training)** — `platform_thesis.md` L13, `whitepaper.md` §1/§3/§10.
3. **Unblocked now, mechanical** — **C4** date-stripping (2 docs); brand casing MiniWaves + HONEYCOMB
   (3 docs); `bling-ledger-interface.md` §11 queries re-pointed at `oracle_token_ledger`; delete the
   resolved open questions (`rate-cap-pricing.md` §8 Q6, `bling-ledger-interface.md` §13 Q6).
4. **Unblocked, substantive** — **C1** re-denomination, `economic_constitution.md` first (five docs
   cross-reference it).
5. **Banner-only, no body edits** — `bling-ledger-interface.md` gets a SUPERSEDED-pending-OPEN-7 header;
   nothing else in it changes until OPEN-7 is ruled.

---

## 6. DONE-TEST

- **Every doc in the folder appears in the table** — 11 of 11: `platform_thesis.md` (2.1),
  `economic_constitution.md` (2.2), `language_firewall.md` (2.3), `categorization.md` (2.4),
  `rate-cap-pricing.md` (2.5), `bling-ledger-interface.md` (2.6), `atlasoracle-canonical-cache.md` (2.7),
  `canon-storage-paths.md` (2.8), `atlasoracle-patchboard-addendum.md` (2.9),
  `per-astra-surfaced-actions.md` (2.10), `whitepaper.md` (2.11). ✅
- **Every CONFLICT row cites both sources** — old canon by file + § (or line), rail by `MF` version
  (or `OUTLOOK` / `TOS` / root `CLAUDE.md` where that is the governing source). ✅
- **Nothing edited** — this pass wrote exactly one new file, this one. ✅

### Could not verify

- **Badge prop contract** — `per-astra-surfaced-actions.md`'s `<AtlasOracleWalletBadge>` prop shape was
  not compared against `src/components/AtlasOracleWalletBadge.tsx`. FRONT lane's file; out of `oracle`
  docs scope this pass.
- **`astra_registry` shape** — `canon-storage-paths.md` §2.2 depends on `astra_registry.slug` (Lock 8,
  deferred per root `CLAUDE.md`). Not probed.
- **`atlasoracle_directives` column list** — `whitepaper.md` §5's identity claims (hashed email/phone,
  transient IP) were taken from `MF v0.4`'s metadata-only assertion rather than re-read from the catalog.
- **Whether `provider_partnership_terms.md` exists elsewhere** — referenced by `categorization.md` as
  "HONEYCOMB-wide… (to be drafted)"; only the AtlasORACLE.to tree was searched.
- **The four known conflicts named in the dispatch were all confirmed**, and the dispatch's instruction
  to treat its list as incomplete was correct: the chatbot/assistant conflict (2.1, 2.3), the
  free-tier-subsidy contradiction (2.11 §3), and the opt-in-retention finding (**T6**) were not on it.
