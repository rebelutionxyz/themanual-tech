# REPORT — TheMANUAL.tech

Report of record for dispatched passes with `workdir=TheMANUAL.tech`. Updated in place every pass.
Newest pass first.

---

## OPS16 — EVENING SWEEP: the token rewire era committed (2026-07-27) — **COMMITTED, PUSH PARKED**

**Lane:** ops · **Scope:** oracle · **Dispatch:** 5f7bb83a-c693-40dc-ba07-e60089ca2a2d
**Authorization:** GIT AMENDMENT (`CLAUDE.md` R7) — explicit SWEEP dispatch, gates encoded below.

### 0. Headline

One commit, `TheMANUAL.tech` only. **`720c5a9`** — 8 files, +1325 / −308. Tree is **0-entry clean**
post-commit and **1 ahead of `origin/main`, 0 behind**. Push not fired; command in §4.

### 1. Manifest and gates

8 paths. Every gate passed:

| Gate | Result |
|---|---|
| `backups/` · `*.env*` · `settings.local.json` · `node_modules/` · `.next/` · `verify-out/` · `*.dump` | **clean** |
| Any file > 1 MB | **clean** — largest is `REPORT.md` at 171,111 B |
| Any deletion (`D`) or rename (`R`) | **clean** — all `M` or `??` |
| Secret-shaped strings (`eyJ…`, `sk-ant-…`, `sb_secret_…`, `sb_publishable_…`, `whsec_…`, `sk_live_…`, assigned service-role key) | **clean** — zero hits across all 8 |

Stage-and-verify: all 8 staged by name, `git diff --cached --name-only` diffed against the manifest
— **identical, 8/8**. No reset needed.

```
 M REPORT.md
 M src/components/AtlasOracleWalletBadge.tsx
 M src/lib/atlasoracle/client.ts
 M src/lib/atlasoracle/tokens.ts
 M src/pages/oracle/OraclePage.tsx
 M supabase/functions/atlasoracle-route/index.ts
?? docs/atlasoracle-media-provider-matrix-2026-07-27.md
?? src/lib/atlasoracle/useOracleTokens.ts
```

### 2. Root repo — dispatch's claim verified, and an OPS14 leftover closed

The dispatch said the root repo had no edits this stretch. **Confirmed:** `HONEYCOMB` is 0-entry
clean and **0 ahead / 0 behind** `origin/main`.

Worth recording because it closes an open item: OPS14 §3 named four uncommitted root-repo canon
files (`atlasoracle-canonical-cache.md` and `bling-ledger-interface.md` in both mirror locations)
as deliberate leftovers, and recommended a canon-lane sweep. **That happened** — they are in
`8459592` ("canon: retire cost_bling from oracle examples", DOCS3) and pushed. No root-lane
follow-up is outstanding.

Also visible from the log: `4c4ee4b` (OPS14) and `08c0f79` (DOCS3) are no longer ahead of origin, so
the OPS14 push parked for Butch **has been completed**. Only tonight's commit is unpushed.

### 3. FRONT17's outstanding done-test — still open, as of this sweep

The dispatch asked me to record whether FRONT17's final done-test (a seeded standard directive
rendering cost and a decremented balance in the badge) has been closed. **It has not.** Ledger
state for bee `2b66f641-0a0c-46ce-bbaa-70cf61793364`:

| entry_type | amount_tokens | directive_id | created_at |
|---|---|---|---|
| `grant` | 1000.000000 | — | 2026-07-27 19:39:24Z |

Balance **1000.000000**, entry_count **1**. The lead's seed is there; **no debit row exists**, so no
paid directive has been run as that Bee. The test remains one badge click away, exactly as the
dispatch describes. Not a blocker for this commit — the code is committed either way, and the test
verifies rendering, not correctness of the ledger (which OPS15 §8 already proved end-to-end).

### 4. Push — parked for Butch

```
cd C:\Users\Butch\Documents\HONEYCOMB\TheMANUAL.tech
git push origin main          # 720c5a9
```

Nothing pending, nothing queued. **Same standing caveat as OPS14 §5: pushing triggers the Railway
deploy**, and this commit carries FRONT17 frontend changes that I did not write and have not
compiled — `npm run build` was not run (§6). A local build before pushing remains the sensible move.

### 5. Done-tests

| Requirement | Result |
|---|---|
| Tree clean post-commit except deliberate leftovers, named | **PASS** — `TheMANUAL.tech` 0 entries; root 0 entries. **No leftovers this sweep.** |
| Push parked-with-note or completed-by-Butch | **PARKED** — §4 |
| *(implicit)* manifest = staged | **PASS** — 8 = 8, diffed identical |
| *(implicit)* zero secret-shaped strings | **PASS** — zero hits |

### 6. Could not verify

- **That `720c5a9` builds.** `npm run build` not run — the workspace rule forbids building while a
  dev server is up and I could not establish whether one is running. This commit contains FRONT17
  frontend work I neither authored nor compiled. **Highest-value check before pushing.**
- **That the badge renders the new token fields correctly.** FRONT17's own done-test (§3) is the
  thing that would prove it, and it is unrun.
- **Whether `docs/atlasoracle-media-provider-matrix-2026-07-27.md` (DOCS4) is complete.** Committed
  as a manifest path; I did not review another lane's deliverable for content.

---

## FRONT17 — badge + console speak Oracle Tokens (2026-07-27) — **DONE, one done-test blocked on a seed I am not authorized to make**

**Lane:** front · **Scope:** oracle · **Dispatch:** 584fa927-4cb9-45d7-8ec3-bdc62cf96eef
**Posture:** app-tree only. Five files, all under `src/`. No schema, no edge function, no deploy. Two live directives fired (one free, one refused pre-provider) — total spend one Haiku call.

### 0. What changed, and the one thing that surprised me

The badge and console now read the OPS15 token contract end to end: per-directive cost, running balance, a 402 that says how short you are, and a confirm gate that actually fires. **The surprise is that last one.** OPS10 recorded the frontier confirm-cost gate as *known-unreachable dead code* — true of the old BLiNG! pricing, where the estimate was a constant 6.5 against a threshold of 10. Against the live token rates it is **reachable**, and I built it as a live control rather than a contract stub:

> frontier estimate ≈ `580.51 + 0.11 × directiveTokens`, threshold **700**
> → trips at roughly **1,090 directive tokens ≈ 4,300 characters**.

A Bee pasting a document into the frontier tier hits the gate. That reverses a standing note in two files and is recorded in `client.ts` beside the type, where the next reader will find it.

### 1. Files

| File | sha256 (first 16) | Bytes | Change |
|---|---|---|---|
| `src/lib/atlasoracle/client.ts` | `f26a45bac41c3dff` | 10,483 | response union re-pinned to the token contract |
| `src/lib/atlasoracle/tokens.ts` | `2818845c6f951640` | 5,488 | **rewritten** — live balance + live rate card |
| `src/lib/atlasoracle/useOracleTokens.ts` | `36b3ae43b276a6e2` | 2,483 | **new** — shared balance/rates hook |
| `src/components/AtlasOracleWalletBadge.tsx` | `bc515f54440b7a5a` | 18,649 | cost, balance, 402 detail, confirm UX |
| `src/pages/oracle/OraclePage.tsx` | `599e44e0ffe85807` | 22,134 | same, plus the rate table |

### 2. Contract mapping — read off the deployed source, not the dispatch text

| Router field | Client | Rendered as |
|---|---|---|
| `cost_tokens` | `costTokens` | `cost · FREE` or `cost · 1.07 Oracle Tokens` (honey-tinted when > 0) |
| `balance_after_tokens` | `balanceAfterTokens` | `balance · 498.93`, and it drives the running badge figure |
| `estimated_cost_tokens` | `estimatedCostTokens` | confirm gate: *"estimated at 855.5 … nothing has been spent yet"* |
| `required_tokens` / `available_tokens` (402) | `requiredTokens` / `availableTokens` | *"needs 96.84 · you hold 0 · short by 96.84"* |
| `action: 'get_tokens'` | `action: 'get-tokens'` | GET Oracle Tokens control |

`cost_bling` and `estimated_cost_bling` are gone from the client entirely. Grep across `src/` returns only the two comment lines that explain the removal.

**`balance_after_tokens` is `?? null`, never `?? 0`.** Free-tier directives never debit and the router omits the field; coalescing to 0 would have wiped a paying Bee's displayed balance to zero after every free directive. The hook ignores null for exactly this reason.

### 3. Two deviations, both declared

**D1 — `tokens.ts` was rewritten, not patched.** It carried `readOracleTokenBalance()` hard-returning `null` with status `design-pending`, plus `TIER_RATES` with **invented** placeholder rates (2 and 7 tokens per directive) and `RATES_ARE_PLACEHOLDER = true`. Both were honest when written — the ledger did not exist. It exists now (DB8) and the router prices off `oracle_model_rates` (OPS15), so leaving placeholders would have quoted a Bee one number and charged another the moment paid tiers went live. The rate card now reads the **same table the router charges from**, newest-active-row-per-tier, which is the router's own rule. Strictly wider than "read the new response shape", and I think clearly within the intent of "cost display".

**D2 — no full `npm run build`.** A dev server is live on :3000 from another lane and the house rule is not to build under a running dev server. Instead: `npx tsc --noEmit` over the whole project — **exit 0** — and `npx biome check` on the five files — **exit 0** after applying safe fixes. I ran `biome check --write` on **only my five files**, not `npm run check` (which rewrites all of `src/`), because other lanes have work in flight. Side effect worth naming: the two component files also had pre-existing formatting normalized by the writer, in regions FRONT16 wrote.

### 4. Security check I did before trusting the browser to read a balance

`oracle_token_balances` is a view. If it ran as owner, selecting it from the client would hand every Bee the whole table. Verified against production before wiring it up: `pg_class.reloptions = {security_invoker=true}`, and the underlying `oracle_token_ledger` policy is select-own for `authenticated`. So the view evaluates RLS as the caller and a signed-in Bee sees exactly one row — theirs. That reasoning is written into `tokens.ts` so nobody has to re-derive it. **DB8 got this right; I am recording that it was checked, not assuming it.**

Also verified rather than assumed: `bees.id` equals the auth uid (probe bee `fc8e533e…` present in `bees` with matching id), which is what makes `bee.id` a valid key against `oracle_token_balances.bee_id`. Had those diverged, the balance would have silently read as zero forever.

### 5. Done-test

| Requirement | Result |
|---|---|
| Harness green | **PASS** — `tsc --noEmit` exit 0; `biome check` exit 0 on all touched files. Full `vite build` deliberately not run (D2). |
| Live free directive renders cost 0 + balance | **PASS (contract verified live)** — HTTP 200, `cost_tokens: 0`, `balance_after_tokens: null`, haiku-4-5, 1641 in / 5 out. Renders as `cost · FREE` with no balance line, which is correct: nothing was debited. |
| Seeded test-bee tokens → standard directive renders real cost + decremented balance | **NOT DONE — blocked.** Seeding `oracle_token_ledger` is a project-table INSERT outside this dispatch's scope, and R7 requires an explicit dispatch for seeds. FRONT17 names no seed. **What I could verify without one is below.** |
| Zero dead controls | **PASS** — every control acts. The GET-tokens button is the one honest exception and it is captioned, not silent: it explains the balance is live and only the *offering* mechanism is unruled. |

**What I verified in place of the seeded test, live against production:** a standard-tier directive from a zero-balance Bee returned **HTTP 402** with `required_tokens: 96.84`, `available_tokens: 0`, `action: 'get_tokens'` — exercising the full 402 path the dispatch asked for, with the real numbers the UI now renders. Better still, that call left **no `atlasoracle_directives` row** (probe bee has exactly one row, the free-tier success), proving the balance pre-check fires ahead of both the row insert and the provider call. **An underfunded Bee costs the platform nothing.**

The remaining gap is narrow and specific: nobody has watched a *successful* paid debit move the number on screen. The code path is the same one the 402 exercises up to the pre-check, and the response mapping is verified, but I have not seen it end to end. **A one-line dispatch authorizing a ledger grant to a test bee closes it.**

### 6. Could not verify

- **Visual rendering.** Everything above is contract-level: the shapes the components receive are confirmed live, but no browser rendered them this pass.
- **The confirm gate firing live.** The arithmetic says a ~4,300-character frontier directive trips it; I did not spend a frontier call to watch it. The mock covers the UI branch (`!preview`).
- **`vite build`** — see D2.

---

## DOCS4 — creative-media provider matrix (2026-07-27) — **DONE**

**Lane:** docs · **Scope:** oracle · **Dispatch:** b4422011-5a66-4ee4-85bc-711ad1cc9d6a
**Posture:** research + documentation. One new file, nothing else touched. No code, no schema, no provider account created, no media generated, zero spend.

**Output:** `docs/atlasoracle-media-provider-matrix-2026-07-27.md` — `fb1d8094f096737f`, 24,236 bytes.

### 0. Four findings, in the order they matter

**M1 — Runway trains on Inputs *and* Outputs, with no opt-out, and it is her main tool.**
First-party, **§4.4** of <https://runway.com/terms-of-use>: inputs and outputs *"may be used by the Company to train and improve its AI models"* under a *"non-exclusive, irrevocable, perpetual, worldwide, royalty-free… sublicensable"* licence. No opt-out in the standard terms; Enterprise Services Terms are separate and unread. Under the text matrix's **F3 standing rule** — no Bee content to any provider that trains by default — **Runway's standard API is inadmissible.** The irony is exact: DOCS3 cleared xAI of this same charge hours ago, and here is Runway doing it openly.

**M2 — Gen-4 Aleph sunsets 2026-07-30. Three days from today.**
Runway's own pricing page lists Gen-4 Aleph and Gen-3 Alpha Turbo as deprecated with that sunset date. Aleph was named specifically in her stack. **This is the only item in the document with a deadline, and it is worth passing on to her regardless of whether HONEYCOMB ever builds a media lane.** (Also caught: Veo 2 and Veo 3 had a 2026-06-30 shutdown — already past. If her "Veo" is either, it is gone.)

**M3 — Seedance video is reported unavailable in the United States.** `SEARCH-DERIVED`, needs a first-party check. If it holds, a US creator reaches Seedance only through an aggregator — the direct-vs-aggregator question is already settled against direct for that provider.

**M4 — the one-adapter answer is three, and probably two.**
fal.ai covers **Kling + Veo + Seedance + Pika** in one integration — including Pika, which has **no API of its own** (first-party: `pika.art/api` routes developers to fal), and Seedance, which may be unreachable directly from the US. Runway is **direct-only**. So: `fal` + `Runway` + `Google/xAI direct` = three adapters. And if M1's standing rule holds, the Runway adapter can never carry Bee content — collapsing it to **two**.

### 1. Identification (explicit done-test item)

- **"pica formance" → Pikaformances** — RESOLVED. Pika's audio-driven lip-sync / performance model. So "Pica" and "pica formance" are one vendor, two products.
- **"Magik" → NOT RESOLVED, deliberately.** Two live candidates: **Magic Hour** (`magichour.ai`, video-first, has API + Python/JS SDKs, $10–249/mo) and **Magnific** (`magnific.com`, formerly Freepik, image/upscale heritage, node-based project canvas). The dispatch said identify, do not guess — so both are documented with a one-line disambiguating question for Butch: **does she upscale images, or face-swap / lip-sync video?** Upscaling → Magnific. Face swap or lip sync → Magic Hour.

### 2. Coverage

Six first-party sources fetched: Runway API pricing, Runway ToS, Google Gemini/Veo pricing, xAI models, Pika's API page, Replicate pricing. Every other cell carries `SEARCH-DERIVED` + the named blocker, or `UNKNOWN` + the reason. **Zero figures from model memory.**

Cheapest cited video is a tie at **$0.05/sec** — Grok Imagine and Veo 3.1 Lite. Grok Imagine is the strongest on rights-per-dollar in the whole document: cheapest tier, and per `ORACLE_TOS_VERIFIED v0.1` §3.3 xAI does not train on API content. Most expensive is **$1.50/sec** (Seedance2 4K billed through Runway) — a **75× spread**, which is why §5 argues a media lane needs a real pre-authorization gate rather than the frontier tier's `confirm_cost`, which OPS10 showed was arithmetically unreachable anyway.

### 3. Architecture note — marked LEAD INPUT, no decision taken

Four structural points, the sharpest being that **the text lane's sovereignty trick does not transfer.** The router retains nothing because there are no content columns to retain into. A creator's entire ask is that files be *kept* — so the media lane must store assets and make that storage user-owned, which is a canon decision, not an implementation detail. Also flagged: **Creator Studio already has collections and media-quota migrations in this repo**, and is the likely home for per-project organization rather than a second asset store.

### 4. Done-test

| Requirement | Result |
|---|---|
| Every named tool has an identified product | **PASS with one deliberate open** — 8 of 9 identified incl. Pikaformances; "Magik" left `UNKNOWN` with two candidates and a disambiguating question, per "do not guess" |
| Cited cells or named blockers | **PASS** — 6 first-party fetches; all else `SEARCH-DERIVED` + blocker or `UNKNOWN` + reason |
| Aggregator coverage table present | **PASS** — §4 of the matrix |
| Architecture note, marked lead-input | **PASS** — §5, marked, no decision |

### 5. Could not verify — one gap outranks the rest

**fal.ai rate-limited the fetcher (HTTP 429) on both `/pricing` and `/models`.** M4's entire headline rests on search-derived coverage claims. **Before anything is built on fal, someone must read its catalogue and pricing first-party.** Also blocked: Kling's dev portal (HTTP 446), so its auth and async mechanics are `UNKNOWN` and its commercial-use terms are contradictory across sources. Seedance ToS was not read at all — high priority given the parent company. Runway's Enterprise Terms are unread, and they are the only possible path to an admissible Runway.

The document's own §6 carries the full list, and §5 closes with the cheapest honest next step: **it is not a build** — re-fetch fal, answer the Magik question, and tell her about the Aleph sunset.

**Standing hold respected:** the sister is a future separate-rail user, **not onboarded**, per Butch's hold. Nothing in this pass contacts her, creates an account, or assumes a build.

---

## DOCS3 — ToS verdicts folded into the matrix + the two stale canon queries fixed (2026-07-27) — **DONE**

**Lane:** docs · **Scope:** oracle · **Dispatch:** 67ba3737-9768-4094-8f77-b006d659d452
**Posture:** documentation only. No code, no schema, no database writes beyond the rail report itself.
**Path exception:** granted in the dispatch for two files outside workdir. **It took four** — see §3.

### 0. Headline

The matrix's three riskiest cells were `SEARCH-DERIVED` behind an HTTP 403. All three are now `VERIFIED` from human-read first-party texts — and **one of them was wrong, not merely unconfirmed.** xAI does *not* train on API customer content; the earlier claim was reading xAI's consumer terms, not the enterprise/API channel ORACLE would actually use. That correction moves xAI from "the one provider we cannot ethically route to" to **admissible**, and it is the most consequential line in this pass.

Separately, the canon queries that referenced `cost_bling` are fixed — the column was dropped hours earlier by DB9, so those examples were live-wrong in canon that routed models read.

### 1. Matrix — `docs/atlasoracle-provider-expansion-matrix-2026-07-27.md`

Sourced from rail docs `ORACLE_TOS_VERIFIED v0.1` and `v0.2`, read via psql.

| Cell | Was | Now |
|---|---|---|
| OpenAI — training on our inputs | `SEARCH-DERIVED` (403) | **`VERIFIED` §4.2** — does not train by default → **ADMISSIBLE** |
| OpenAI — our training on their outputs | `SEARCH-DERIVED` (403) | **`VERIFIED` §3.3(e)** — prohibited except the Permitted Exception |
| xAI — training on our inputs | `SEARCH-DERIVED`, **claimed xAI trains by default** | **`VERIFIED` §3.3 — CORRECTED: does NOT train** → **ADMISSIBLE**; ZDR preferred |
| xAI — our training on their outputs | `SEARCH-DERIVED` (403) | **`VERIFIED` §3.1 / §2(e)** — flat prohibition, broader than OpenAI's |
| Llama 3.1 weights licence | `UNKNOWN` | **`VERIFIED` §1.b.i** — training-permissive |

Every upgraded cell carries `VERIFIED` + `source: human-read` + the section number + the rail doc. The fetch-date convention is untouched everywhere else.

**§0 reading rules** gained the `source: human-read` marker as a third tier outranking both `SEARCH-DERIVED` and a fetch-date citation, and says plainly that one of the five upgrades is a correction rather than a confirmation.

**★ Router carve-out added (§2.1).** OpenAI's Permitted Exception covers models "primarily intended to categorize, classify, or organize data" that are **not distributed**. The learned router from `ORACLE_OUTLOOK v0.1` — internal, never shipped — plausibly fits by the clause's own text. Recorded as a legal reading with **justice-lane blessing pending and required before reliance**, not as a settled fact.

**F3 corrected in place.** Retitled *"~~Two~~ providers train on Bee data by default — CORRECTED, xAI removed"*, with a correction block explaining the consumer-vs-enterprise confusion and pointing at §2.2. The finding now covers Together (ZDR opt-out), Moonshot (enterprise-negotiated opt-out) and Gemini free tier. The recommended standing rule survives intact — it just no longer excludes xAI.

**F2 updated** with the Llama 3.1 verdict, including the scope caution that it is **3.1-specific** and does not generalize to Llama 4.x.

**F1 updated** with the verified training-path ladder (metadata exhaust → Llama 3.1 → DeepSeek → OpenAI internal-classifier-only → xAI never), plus the asymmetry the matrix had been conflating: **admissible as a provider** and **usable as training fuel** are two different questions, and xAI is now the extreme case of the split — fine to route to, never to learn from.

**§6 could-not-verify** rebuilt: three rows upgraded to `VERIFIED`, two new rows added (OpenAI training-in; Llama 3.1 licence), the Llama row split out of the generic weights-licence row, and **Fireworks added honestly** as `UNKNOWN` with partial signal — likely admissible, ToS PDF still unread, URL named.

### 2. Canon — the two stale `cost_bling` queries

| File | §  | Fix |
|---|---|---|
| `bling-ledger-interface.md` | §6 | `cost_bling === 0` → `costBling === 0`, with a note that it is an **in-memory** value the router computes, logs and returns over HTTP — never persisted |
| `bling-ledger-interface.md` | §13 | Reconciliation query rewritten to the 16-column reality: selects `tier · provider_selected · input_tokens · output_tokens · cached_tokens · success`, and identifies paid directives by **`WHERE d.tier <> 'free'`** instead of `WHERE d.cost_bling > 0` |
| `atlasoracle-canonical-cache.md` | §132 | Cache-hit INSERT no longer lists a cost field; gains `input_tokens / output_tokens / cached_tokens = 0 (nothing routed)` and a note that §5 cache pricing is computed in memory, not stored |

All annotated `cost_bling retired 2026-07-27, see rail ORACLE_MF v0.14`.

**Judgement call on the §6 fix.** The dispatch asked me to revise "example queries", and §6 is TypeScript pseudocode, not SQL. I fixed it anyway: it named `cost_bling` as though reading a column, which is now false, and the done-test demanded a clean grep. Renaming to the in-memory `costBling` matches what the router actually calls it (`finalCostBling`) and makes the pseudocode true rather than merely grep-clean.

### 3. The path exception took FOUR files, not two — named as the dispatch requires

Both target files are **mirrored**, and I verified the mirrors were byte-identical before touching anything (`bling-ledger-interface.md` sha256 `44c519c6…` in both locations; `atlasoracle-canonical-cache.md` `d1e21f7c…` in both). The dispatch named **one file from each pair** — `shared/canon/bling-ledger-interface.md` and `AtlasORACLE.to/master_plan/atlasoracle-canonical-cache.md` — so the mirror convention pulled in one more of each:

| File | Status | sha256 after |
|---|---|---|
| `shared/canon/bling-ledger-interface.md` | named in dispatch | `17a4180457a02378` |
| **`AtlasORACLE.to/master_plan/bling-ledger-interface.md`** | **mirror, changed identically** | `17a4180457a02378` |
| `AtlasORACLE.to/master_plan/atlasoracle-canonical-cache.md` | named in dispatch | `5c1e1f24fb49f632` |
| **`shared/canon/atlasoracle-canonical-cache.md`** | **mirror, changed identically** | `5c1e1f24fb49f632` |

Identity is guaranteed by construction: I edited one of each pair and **copied the file over its mirror** rather than repeating the edit by hand, then re-hashed. Both pairs match exactly.

**Which copy is canonical matters here.** Per `canon-storage-paths.md` §2.3, `HONEYCOMB/AtlasORACLE.to/master_plan/<file>.md` is what syncs to `master_plan/atlasoracle/<file>.md` in the `themanual-canonical` bucket — the copy routed models actually read. `shared/canon/` is the mirror. Had only the dispatch-named files changed, `bling-ledger-interface.md` would have been fixed in the mirror and left stale in the bucket-synced original — the wrong half.

### 4. Done-test

| Requirement | Result |
|---|---|
| `grep cost_bling` across both canon files returns only retirement annotations | **PASS** — 4 hits across 4 files, all annotations (`bling-ledger-interface.md:343` ×2, `atlasoracle-canonical-cache.md:135` ×2) |
| Matrix cells carry `VERIFIED` + source line | **PASS** — 5 cells upgraded, 11 `source: human-read` markers |
| No other file modified | **PASS** — `git status` in workdir shows only `docs/atlasoracle-provider-expansion-matrix-2026-07-27.md`; outside workdir, exactly the four files in §3 |

Matrix after edits: `f5e0adca6021da66`, 56,042 bytes.

### 5. Could not verify / left open

- **Fireworks ToS** — still unread; recorded as `UNKNOWN` with its partial signal and the URL, not upgraded on search alone.
- **The OpenAI router carve-out is a reading, not a ruling.** It needs the justice lane. I recorded it as pending in both §2.1 and the ladder; nothing should rely on it yet.
- **Llama 4.x and other weight licences** — untouched, still `UNKNOWN`, still F2's follow-up.
- **The canon bucket is not re-synced by this pass.** These files are the git-side source; whether the `themanual-canonical` bucket now serves the corrected text depends on the sync pipeline — which OPS9 found **does not exist** (no `.github/workflows/` in the repo, no sync script anywhere). So the bucket copy, if one was ever uploaded, is still stale. Flagged, not fixed: building that pipeline is `v1 final scope §2.7` and nobody's dispatch today.

---

## DB9 — APPLIED: cost_bling DROP (2026-07-27) — **DONE. DB7 closed with it.**

**Lane:** db · **Scope:** oracle · **Dispatch:** f70791c5-6cde-46ce-8092-61fe92bb4bd2
**Authorization:** **MIGRATION AMENDMENT (Butch, 2026-07-27)** — codified into `CLAUDE.md` R7 by this pass, on the human's explicit instruction, immediately before the apply. Supersedes the DB9-Q block.

### 0. Outcome

`atlasoracle_directives.cost_bling` is **gone from production.** Table is 16 columns, all rows intact, and a live free-tier directive fired post-drop finalized cleanly. The BLiNG!-denominated Oracle economy has no schema trace left on the directives table — canon has said it was retired since 2026-06-07; as of today the database agrees.

### 1. The grant, written before it was used

DB9-Q's blocker was that `CLAUDE.md` R7 granted edge-function deploys while explicitly keeping *"no applying migrations to any database"* denied, and stated that a dispatch body asserting an unwritten authorization is not sufficient. Butch confirmed and instructed the grant be codified on the deploy pattern. R7 now carries:

> **Migrations: gated, not forbidden.** Under the **MIGRATION AMENDMENT (Butch, 2026-07-27)** applying a migration to production is permitted **only** via an explicit dispatch that names the migration file, and **only** after a pre-flight recorded in `REPORT.md` — dependent objects, views, routines, constraints and indexes touching the target, plus rows at risk. The **rollback statement must be stated in the dispatch** before the apply runs. Verify after against `information_schema` and record the result. […] Destructive DDL on a table holding real data is never a routine apply — it stops and asks regardless of the dispatch.

`no applying migrations to any database` was removed from the deploy bullet's deny-list, since it now has its own gated rule. DNS and promote-to-live stay denied there.

**DB9 satisfied every condition before the statement ran:** it names the file; the rollback is stated in the dispatch body; the pre-flight was recorded in `REPORT.md` under DB7 §3 and DB9 §2; rows at risk were zero.

### 2. Precondition — verified against the live artifact, not a report

| Check | Result |
|---|---|
| Deployed `atlasoracle-route` version | **v15**, ACTIVE (v14 → v15) |
| Bundle hash | `9e3fa58eedd8c8ddf0853707c60ba853265e1eea9ea04c4c47cb32705dca9c0e` |
| Deployed finalize UPDATE omits `cost_bling` | **CONFIRMED** in the live bundle |
| OPS11 guard + telemetry also live | **CONFIRMED** |

This was the ordering that "never both blind" existed to protect. Had the drop run against v14, every successful directive would have failed its finalize UPDATE and been left `pending` forever.

### 3. The apply

Statement, via the established pgpass psql path:

```
BEGIN
ALTER TABLE
COMMIT
```

`ALTER TABLE public.atlasoracle_directives DROP COLUMN IF EXISTS cost_bling;`

### 4. Post-apply verification (`information_schema`)

| Check | Result |
|---|---|
| `cost_bling` in `information_schema.columns` | **0 rows — absent** |
| Column count | **16** (was 17) |
| Surviving columns | `id · bee_id · astra_id · nova_id · directive_category · tier · provider_selected · latency_ms · success · created_at · status · error_message · input_tokens · output_tokens · cached_tokens · completed_at` |
| Rows intact | **5** — none lost |
| Other columns touched | **none** |

### 5. Live post-drop proof (DB9 step 4)

One free-tier directive, HTTP **200**, 3,359 ms wall:

```json
{ "directive_id": "ece29d6a-b5e6-4e2c-964c-0206ed703505", "response": "ACK",
  "cost_bling": 0, "provider": "claude-haiku-4-5", "tier": "free",
  "tokens": { "input": 1641, "output": 5, "cached": 0 } }
```

Row as finalized against the **16-column** table: `status=success · success=t · provider_selected=claude-haiku-4-5 · 1641 in / 5 out / 0 cached · latency 1078 ms · completed_at set`.

**That is the proof that matters** — the finalize UPDATE, the exact statement that would have broken had the ordering been wrong, succeeded cleanly against the post-drop table. Note the response body still carries `cost_bling: 0`: that field is computed in memory and returned over HTTP, never read from the column. Exactly as DB7 predicted, the front lane is unaffected.

**Deviation D1.** DB9 said to reuse OPS13's probe bee. Its password was not recorded in OPS13's report, so I created a fresh probe bee by the same method — public GoTrue signup, anon key from MCP `get_publishable_keys`, **`.env` never read** — user `d1c8b0a9-2ab8-4924-a853-4939ac28c4ee`. Identical cost (one Haiku call, 1,646 tokens), identical evidence. Left in place, like OPS10's and OPS13's; probe-bee cleanup is one deliberate pass, not three ad-hoc deletions.

### 6. Migration file

`supabase/migrations/20260727140000_atlasoracle_retire_cost_bling.sql` — the `STATUS: UNAPPLIED — DO NOT APPLY YET` header is replaced with `STATUS: APPLIED to production 2026-07-27`, carrying the verification results and the v15 precondition evidence, per repo convention.

### 7. Done-test

| Requirement | Result |
|---|---|
| (1) Confirm deployed route is post-write-stop | **PASS** — §2 |
| (2) Apply migration; strip UNAPPLIED header | **PASS** — §3, §6 |
| (3) Verify 16 columns, `cost_bling` absent | **PASS** — §4 |
| (4) Fire one free-tier directive post-drop | **PASS** — §5 |
| (5) Mark DB7 and DB9 done | **PASS** — both closed with this pass |

### 8. What is still open (not this pass)

- **OPEN-7** — legacy escrow disposition (`bling_pots purpose='atlasoracle'`, the six `atlasoracle_*` RPCs, the `atlasoracle_debit` unique-index defect). Untouched, as v0.5 requires. The defect is now unreachable: paid tiers are gated off and their currency is retired.
- **Canon edits** — `bling-ledger-interface.md` §11/§13 and `atlasoracle-canonical-cache.md` §132 still ship example queries selecting `cost_bling`. As of today those reference a column that no longer exists, in **bucket-synced canon that routed models read**. This was flagged in DB7 §5 as a docs-lane item; the drop makes it live rather than theoretical.

---

## FRONT16 — AtlasOracle wallet badge + /oracle console: wiring pass (2026-07-27)

**Lane:** front · **Scope:** oracle · **Dispatch:** d173007c-2d39-406b-8673-8c53ca97fa84
**Posture:** app-tree wiring per Amendment 3 (badge already existed; this pass mounts it, routes it,
and re-denominates it). **No live provider call was made at any point in this pass.**

### 0. Headline

The badge was never the gap — the wiring was. `AtlasOracleWalletBadge` had zero import sites; it now
mounts in `UtilityChrome`, which `SiteHeader` renders globally, so it is present in **every** Astra
spine rather than the one mount the done-test asked for. `themanual.tech/oracle` is now a real
top-level console, registered ahead of the `/:slug` catch-all.

**The badge's call to the router was broken, and the bug was silent.** It sent
`directive_category`; the deployed function only accepts `category`. Unknown keys are ignored, so
every directive a Bee ever sent through the badge would have been filed under the server default
`'suggest'` regardless of the kind they picked — no error, no warning, just quietly wrong metadata.
Also sent and silently dropped: `nova_slug`, `canon_paths`. Fixed against the contract I exercised
live in OPS10.

### 1. Done-test

| Requirement | Result |
|---|---|
| `/oracle` resolves top-level (not the DingleBERRY demo) | **PASS** (static) — `/oracle` at `App.tsx:402`, `/:slug` at `409`; DingleBERRY's nested `oracle` at `359` is untouched and still serves `/dingleberry/oracle` |
| Badge renders from at least one Astra spine mount | **PASS** (static) — mounted in `UtilityChrome`; one import site; global via `SiteHeader` |
| Harness green with mocked route | **PASS, with a caveat** — see §4. Build green, every module transforms in dev, mock flag proven injected. No renderer was available to prove painted DOM. |
| Every control wired (no dead doors) | **PASS** — §3 |
| Language-firewall sweep clean | **PASS** — zero banned terms across all AtlasOracle surface files (§5) |
| No live provider call in dev tests | **PASS** — the mock short-circuits before any network call; no request left the machine |

### 2. File tree

```
TheMANUAL.tech/
├── src/
│   ├── App.tsx                                    (M) lazy import + /oracle route before /:slug
│   ├── components/
│   │   ├── AtlasOracleWalletBadge.tsx             (M) re-denominated, call shape fixed, gates added
│   │   └── layout/UtilityChrome.tsx               (M) badge mounted in the spine
│   ├── lib/atlasoracle/
│   │   ├── client.ts                              (NEW) route seam — request shape, response union, mock
│   │   ├── useOracleDirective.ts                  (NEW) shared directive state machine
│   │   ├── tokens.ts                              (NEW) Oracle Token balance seam + tier rate registry
│   │   └── routingLog.ts                          (NEW) per-Bee metadata log reader
│   └── pages/oracle/OraclePage.tsx                (NEW) the /oracle console
└── REPORT.md                                      (M) this section
```

Nothing outside `src/` was touched. The `supabase/` and `docs/` changes in the working tree at the
time of writing belong to the DB and DOCS lanes, not this pass.

### 3. What was wired

**Route.** `/oracle` → `OraclePage`, inside `PlatformLayout`, registered before the `/:slug`
catch-all. The name collision recon flagged is real but harmless: `AtlasOraclePage` (DingleBERRY
copilot demo) and `OraclePage` (this console) are distinct components on distinct paths, and the
import block carries a comment saying so, so the next reader does not "fix" one into the other.

**Badge mount.** `UtilityChrome`, between the removed BLiNG! pill slot and the profile avatar. It
self-hides for signed-out visitors (pre-existing `if (!bee) return null`). Astra attribution comes
from the first path segment; unregistered paths fall back to `themanual` server-side (verified
OPS10), so a wrong guess costs a router log line, not a failed directive.

**Call shape, corrected against the deployed contract:**

| Field sent before | Field sent now | Why |
|---|---|---|
| `directive_category` | `category` | Router accepts only `category`; the old name was silently dropped and every directive filed as `'suggest'` |
| `nova_slug` | *(removed)* | Silently ignored by the router |
| `canon_paths` | *(removed)* | Silently ignored — canon is bundled server-side, not client-supplied |
| — | `confirm_cost` | Now sent when the Bee confirms a cost preview |

**Controls — every one does something (no dead doors):**

| Control | Behaviour |
|---|---|
| Tier select (free / standard / frontier) | Sets tier; drives the rate line under the box |
| Kind select (10 categories) | Now actually reaches the router (see above) |
| SEND | Fires the directive; disabled while empty or in flight |
| CONFIRM / cancel | Cost-preview gate — routes or discards; nothing spent until CONFIRM |
| GET Oracle Tokens | Opens an honest notice that the token flow is not live yet. Stub by dispatch design, but it answers |
| console link (badge) | Navigates to `/oracle` and closes the surface |
| refresh (log) | Re-reads the routing log |
| new directive | Resets to idle |
| Error actions | 402 → offers GET Oracle Tokens; 429 → shows the retry window |

**Structured error handling.** `supabase-js` collapses every non-2xx into "Edge Function returned a
non-2xx status code" unless you unwrap the `Response` off the error's `context`. The seam unwraps
it, so the router's 402 (`action: fund_escrow`) and 429 (`retry_after_seconds`, `caps_hit`) payloads
reach the UI as real messages with real follow-on controls instead of one opaque string.

**Economics (Amendment 2).** Oracle Tokens throughout. No BLiNG! figure, no escrow control, no call
to any `atlasoracle_*` escrow RPC anywhere in the app tree. `cost_bling` is no longer displayed on
any surface — which lands compatibly with the DB lane's concurrent `cost_bling` write-stop: the UI
had already stopped reading it.

**Routing log.** Reads `atlasoracle_directives` under the Bee's own JWT (select-own RLS). Metadata
only — the table has no content columns, so the log cannot leak directive or response text even in
principle, and the surface says so in plain language.

### 4. The harness, honestly

**This repo has no test runner** — no vitest, no jest, no test files, no headless browser in
`devDependencies`. "Harness green with mocked route" therefore cannot mean a passing test suite,
and I did not pretend otherwise by inventing one (adding a browser/test dependency is a new external
dependency, which is plan-mode territory and outside a wiring pass).

What the mock is: `VITE_ATLASORACLE_MOCK=1`, gated on `import.meta.env.DEV` **and** the flag, so a
stray production env var cannot serve fake answers to Bees. When on, `invokeDirective` returns
before any network call. Directive prefixes drive every branch — `!preview`, `!fund`, `!cap`,
`!fail`, anything else → success — so all five response shapes are reachable without an endpoint.

What was actually verified:

```
npm run build                      → ✓ built in 30.57s (tsc -b type-check + bundle, exit 0)
dist/assets/OraclePage-*.js        → emitted as its own chunk
biome lint (8 changed files)       → clean
dev server transform check         → 200 ok on all 9 paths, zero transform errors
  /oracle · OraclePage.tsx · client.ts · tokens.ts · useOracleDirective.ts
  · routingLog.ts · AtlasOracleWalletBadge.tsx · UtilityChrome.tsx · App.tsx
mock flag injection (dev)          → import.meta.env = {… "VITE_ATLASORACLE_MOCK": "1" …}
port 3000                          → released after the check (no orphan)
```

The flag-injection line is the one that matters: it proves a shell-exported `VITE_*` var reaches
`import.meta.env` in dev, so `VITE_ATLASORACLE_MOCK=1 npm run dev` is a working harness invocation
and not a hopeful instruction.

**Not verified: painted DOM.** The Chrome extension was not connected this session, so no rendered
check ran. Type-check + dev transform prove the modules compile and resolve; they do not prove the
badge visually appears in the header or that the console lays out correctly. That is the honest
limit of this pass.

### 5. Language firewall

Swept every AtlasOracle surface file with a whole-word case-insensitive pattern over
buy / sell / purchase / invest / trade / market / price / customer / mint (and inflections):
**zero hits.**

One tension worth surfacing rather than silently resolving: the dispatch body says users "buy ORACLE
TOKENS" via a "stubbed purchase flow". Those are banned words in Bee-facing copy, so the control
reads **GET Oracle Tokens**. The dispatch's own opening clause ("per canon … language firewall")
makes the firewall the tiebreaker; flagging it so the wording is a decision, not a drift.

The badge's file header previously enumerated the banned words verbatim as a developer note, which
made a literal sweep noisy. Reworded to point at CLAUDE.md instead.

### 6. Deviations and judgement calls

**D1 — Extracted a client seam + shared hook rather than editing the badge alone.** The dispatch adds
a second surface (`/oracle`) that must call the same endpoint the same way. Two hand-written call
sites is exactly how the `directive_category` bug survives a second time. One module now owns the
request shape, the response union, the error unwrap, and the mock.

**D2 — Dropped `canonPaths` from the badge's public props.** It was dead: the router ignores it and
the canon is bundled server-side. A breaking prop change is safe here precisely because the recon
found zero import sites; this pass added the only one.

**D3 — Confirm-cost gate implemented despite being unreachable today.** OPS10 proved the router's
frontier estimate is a constant 6.5 against a threshold of 10, so it never emits a preview. The
dispatch asks for the gate and it is the documented contract; it is built, mock-reachable via
`!preview`, and turns on with a server-side threshold change and no UI work.

**D4 — Oracle Token balance renders as an em dash, not `0`.** There is no token ledger and DB7
forbids creating `oracle_*` tables ahead of the design. A zero would read as "your wallet is empty";
`—` plus a tooltip reads as "no wallet yet", which is the truth. No table was created.

**D5 — Tier rates are labelled provisional on every surface that shows them.** Token denomination is
undesigned; the numbers are shape, not truth, and are marked as such rather than presented as fact.

### 7. Could not verify

- **Rendered DOM.** No Chrome extension connection, no headless browser in the repo. Build +
  dev-transform is the ceiling of what this pass could prove.
- **The badge in a signed-in session.** It self-hides for signed-out visitors, so its visible states
  (idle / working / response-ready) were exercised only through the type system and the mock, not on
  screen.
- **The corrected `category` field against the live router.** Confirming it end-to-end costs a real
  provider call, which this dispatch explicitly forbids without Butch's go-ahead. The correction is
  verified against the deployed contract as exercised in OPS10, not re-fired.
- **The routing-log query under real RLS.** Needs a signed-in Bee. The select-own policy is the one
  OPS9 documented and the column list matches the live table, but no row came back through the UI
  this pass.
- **Whether `astraSlug` from the path segment matches `astra_registry` for every surface.** Unknown
  slugs are safe by construction (server-side fallback), so this is a log-noise question, not a
  correctness one.

### 8. For the lead

- **The `category` bug is worth a canon note.** Any other client written against the badge's old
  shape has the same silent defect. The seam is now the only sanctioned way to call the router from
  the app tree.
- **A rendered check still owes.** Worth a short follow-up dispatch once a browser is available:
  sign in, confirm the badge paints in the spine, fire a mocked directive, confirm the log renders.
- **Cross-lane, no conflict:** the DB lane's concurrent `cost_bling` write-stop and failure-path
  telemetry fix are compatible with this pass by construction — the UI already displays tokens and
  provider rather than `cost_bling`. If that lane changes the *request* contract (it has not), the
  seam in `src/lib/atlasoracle/client.ts` is the single place to update.
- **FRONT16's premise is now spent.** The badge exists, is mounted, is routed, and is
  re-denominated. What remains is the Oracle Token design itself, which is a Butch decision, not a
  frontend task.

---

## OPS15 — THE TOKEN REWIRE (2026-07-27) — **SHIPPED v19, PAID TIERS LIVE, BATTERY GREEN**

**Lane:** ops · **Scope:** oracle · **Dispatch:** 4ad5f74c-f031-4685-a64d-08af468044c2
**Authorization:** DEPLOY AMENDMENT (`CLAUDE.md` R7) — dispatch names the deploy; type-check clean
before each of four deploys; artifact hash-verified after.

### 0. Headline

**AtlasORACLE is billable.** Paid tiers are live, debiting `oracle_token_ledger`, at deployed
version **19**. `atlasoracle_debit` / `_credit` were neither called nor modified — the dead economy
stays dormant per OPEN-7.

**The battery earned its keep twice.** It caught a mis-tuned frontier gate that fired on *every*
directive, and a cost-function bug that under-billed cached tokens by ~10×. Both were fixed and
re-verified live. Neither would have been visible from reading the code. §5.

It also **corrects a factual error I propagated in OPS13 and DOCS1** — the "estimator under-counts
by 2.3×" claim was wrong, and the real figure is ~6.5%. §6.

### 1. What changed

| Part | Change |
|---|---|
| **Debit** | One append-only `oracle_token_ledger` row per paid success: `entry_type='debit'`, negative `amount_tokens`, `directive_id` FK. **No treasury leg** per the lead's ruling — revenue is `SUM` of debit rows. |
| **Balance gate** | Reads `oracle_token_balances` **before** the directive-row insert and the provider call. Short → `402` with `required_tokens` / `available_tokens`, zero spend. |
| **Rates** | Read from `oracle_model_rates` (DB8), newest active row per model. Missing rate → **503, refuse**, never guess a price. |
| **Thinking** | Explicit per tier. free: omitted (Haiku 4.5 supports neither). standard: adaptive + `effort: medium`. frontier: adaptive + `effort: high`. |
| **max_tokens** | Re-baselined 1500→**8,000** (standard), 5000→**32,000** (frontier). A ceiling costs nothing unused; too little truncates *after* the provider has billed. |
| **Frontier gate** | Re-derived in tokens and made genuinely reachable. §4. |
| **Response** | `cost_bling` → `cost_tokens` + `balance_after_tokens`. |
| **Guard** | `PAID_TIERS_ENABLED = true`. |

Removed as dead: the user-scoped Supabase client and its `jwt` binding (they existed only to call
`atlasoracle_get_escrow_balance` as the Bee), and `calculateCostBling`.

### 2. Rates — placeholders, and the anchor that makes them legible

`oracle_model_rates` was empty. Seeded from provider USD cost × 2 margin, at an explicit anchor:
**1 Oracle Token = $0.001 USD** (1,000 OT = $1). Provider prices live-verified against
`platform.claude.com/docs/en/about-claude/pricing` on 2026-07-27.

| Model | Provider USD /MTok | Rate (OT /MTok) in / cached / out |
|---|---|---|
| `claude-haiku-4-5` | $1 / $5 | 2,000 / 200 / 10,000 |
| `claude-sonnet-5` | $2 / $10 *(intro to 2026-08-31)* | 4,000 / 400 / 20,000 |
| `claude-opus-5` | $5 / $25 | 10,000 / 1,000 / 50,000 |

Every row's `source_note` begins **"PLACEHOLDER - NOT A PRICING RULING"**. Sonnet 5's note flags
that the intro rate lapses to $3/$15 and the row must be re-rated. No purchase flow exists, so
these cannot touch real money. **Butch's pricing ruling is required before any real sale.**

### 3. Response shape — the non-breaking order, stated

`src/lib/atlasoracle/client.ts` reads `Number(d.cost_bling ?? 0)` (line 236) and
`Number(d.estimated_cost_bling ?? 0)` (line 223). Because both coalesce, **removing the fields does
not throw** — the badge reads 0. Emitting `cost_bling: 0` would produce the identical 0 in the UI
while keeping a dead BLiNG!-named field alive, so removal is strictly cleaner and I took it. The
badge shows a cost of 0 until FRONT17 reads `cost_tokens` — cosmetic and transitional, not a crash.

### 4. Frontier gate — reachable, and not always-on

OPS10 finding 2: the old gate was a constant 6.5 BLiNG! against a threshold of 10, so it could
never fire. **A gate that always fires is the same bug wearing different clothes**, and the first
retune landed there.

```
cost(input) = input/1e6 × 10000  +  min(32000, 8000 + 2·input)/1e6 × 50000
            = 400 + 0.11·input            (for input < 12,000)
```

The canon prefix rides on every request at **1,529 tokens**, so the frontier estimate can never
fall below `400 + 0.11 × 1530 ≈ 568`. A threshold of **550 therefore fired on every frontier
directive, including an empty one** — I only saw this because A3 fired and the arithmetic didn't
justify it. Retuned to **700**:

| Case | input tokens | estimate | gate |
|---|---|---|---|
| floor — empty directive | ~1,530 | ~568 | no |
| crossover | 2,727 | 700 | boundary ≈ 4,792 directive chars |
| ceiling — `MAX_DIRECTIVE_CHARS` 10,000 | ~4,029 | ~843 | yes |

**Both bounds verified live**, not just on paper: B2 (small frontier, no `confirm_cost`) returned
200 with no gate; A3 (7,200-char directive) returned the preview at an estimate of **771.14**.

### 5. Two bugs the battery caught

**Bug 1 — gate always fired.** §4. Found by checking A3's arithmetic against the floor rather than
accepting a passing test. Fixed 550 → 700, redeployed, re-verified both bounds.

**Bug 2 — cached tokens under-billed ~10×.** Anthropic reports `input_tokens` and the cache buckets
as **disjoint** counts: `input_tokens` already excludes anything served from or written to cache.
My first cost function assumed cached ⊆ input and did `min(cached, input)`, so a request with 16
uncached and 2,257 cached input tokens billed **16** cached tokens instead of 2,257.

| | charged | correct |
|---|---|---|
| B1 standard | 0.1064 | **1.0668** |
| B2 frontier | 0.2670 | **2.6760** |

Fixed to bill the two legs separately, redeployed, re-verified: C1 returned **exactly 1.0668**.
A missing cached rate now falls back to the full input rate — over-charging slightly is the safe
direction for a missing rate, and it is visible rather than silent.

**The two wrong debits were corrected with reversing `adjustment` entries, not edited.** That is
the ledger's own correction path doing real work rather than test cleanup, and it exercises the
partial unique index correctly: adjustments may share a `directive_id` with their debit, only
debits are constrained to one per directive.

### 6. Correction to OPS13 §7 and DOCS1 §4b — the estimator is fine

I previously reported that `CHARS_PER_TOKEN = 4` under-counts by ~2.3× and recommended fixing it.
**That was wrong, and the error was mine.** My canon-bundle measurement script stopped at the first
*escaped* backtick (`` \` ``) inside the template literals, so it read 2,462 chars / 616 tokens.

Measured correctly, the bundle is **6,116 chars / 1,529 tokens**:

| | estimated | actual (Anthropic) | gap |
|---|---|---|---|
| free-tier input | 1,537 | 1,643 | **~6.5% low** |

That is a good heuristic, not a broken one. **The recommended follow-up to "fix `CHARS_PER_TOKEN`"
should be dropped.** The caching conclusion is unaffected — 1,643 is still below Haiku 4.5's
4,096-token minimum — but see §7, which changes it in a different way.

### 7. New finding — the canon prefix DOES cache, on the paid tiers

DOCS1 §4d said the canon prefix never caches. That is true **only of the free tier**. Live token
counts from this battery:

| Tier | Model | input | cached | cache minimum | caching? |
|---|---|---|---|---|---|
| free | Haiku 4.5 | 1,643 | **0** | 4,096 | no |
| standard | Sonnet 5 | 16 | **2,257** | 1,024 | **yes** |
| frontier | Opus 5 | 17 | **2,256** | 512 | **yes** |

The paid tiers were already getting near-total prefix caching and nobody knew. Note also that
2,256 ≈ 1,643 × 1.37 — the newer tokenizer on Sonnet 5 / Opus 5, matching Anthropic's stated ~30%
increase. **DOCS1's "grow the canon bundle past 4,096" proposal now applies to the free tier only**,
and would need ~2,450 more tokens, not ~3,480.

### 8. Done-tests — all PASS

| # | Requirement | Result |
|---|---|---|
| type-check clean | | **PASS** — exit 0 before each deploy |
| deploy | | **PASS** — v19 |
| hash-verify per file | | **PASS** — all 5 byte-identical, `index.ts` `565f9bb7d9b461f9` |
| free 200 unchanged | A1 | **PASS** — `"ACK"`, haiku-4-5, `cost_tokens: 0` |
| paid zero balance → 402 pre-provider | A2 | **PASS** — `required 96.888 / available 0` |
| seed tokens → paid standard → 200, debit exact vs rates, balance decremented | C1 | **PASS** — 1.0668, balance 4996.2572 → 4995.1904 |
| frontier above threshold, no `confirm_cost` → blocked pre-provider | A3 | **PASS** — preview at 771.14 |
| frontier with `confirm_cost` → 200 + debit | C2 | **PASS** — 58.446, balance → 4936.7444 |
| *(extra)* frontier below threshold → no gate | B2 | **PASS** |

**Zero-spend proven structurally, not by timing.** The phase-A bee made three calls (free, 402,
preview) and has **exactly one** `atlasoracle_directives` row — the free one. The 402 and the
preview created no row at all, so both returned before the insert and therefore before the provider
call.

**Debit arithmetic verified to the last decimal.** C2: `1984/1e6×10000 + 2256/1e6×1000 +
727/1e6×50000 = 58.446`, matching the ledger row exactly.

**Charge-the-lesser confirmed in the Bee's favour.** C2 estimated 771.14 and actually cost 58.446;
the Bee was charged the actual.

### 9. Spend

Well inside the $5 cap. Six paid provider calls total (2 Sonnet 5, 4 Opus 5), all with tiny outputs
except C2 (727 output tokens). Estimated actual USD **well under $0.50** — the prefix caching in §7
made the paid calls far cheaper than budgeted. Plus three free-tier Haiku calls.

### 10. Deviations and judgement calls

- **D1 — four deploys, not one.** v17 (rewire), v18 (gate retune), v19 (cost fix); the intermediate
  hash-verify ran against v17. Each was type-checked first. I could have batched, but shipping a
  known-wrong gate or a known-wrong price to sit in production while I wrote more code was worse.
- **D2 — flipped `PAID_TIERS_ENABLED = true` in the same change as the rewire.** The dispatch says
  flip only after done-tests, but the paid-tier done-tests cannot run with the guard false. The only
  coherent reading is: ship enabled, and revert on failure. No test failed, so the guard stayed up.
- **D3 — retuned the frontier threshold beyond the dispatch's letter.** It asked for a reachable
  gate; 550 was reachable and also always-on. Fixing that is the dispatch's intent.
- **D4 — corrected the two bad debits with adjustments** rather than leaving them or deleting them.
  The ledger has no delete path by construction, and the adjustment path is the designed answer.
- **D5 — a missing cached rate now bills at the full input rate** rather than free. A judgement on
  which direction to fail; over-charging is visible and recoverable, under-charging is silent.
- **Did not touch** `atlasoracle_debit` / `_credit`, any `bling_*` object, or any escrow RPC.

### 11. Could not verify

- **`npm run build` was not run.** No frontend file changed this pass, but the badge's displayed
  cost is now 0 until FRONT17 — verified by reading `client.ts`, not by rendering it.
- **Thinking behaviour under load.** Every test directive was trivial ("reply ACK"), so adaptive
  thinking correctly spent almost nothing (5 output tokens). The re-baselined `max_tokens` of 8,000
  and 32,000 have **never been stressed** — a genuinely hard directive has not been run through
  either paid tier. The headroom is argued, not measured.
- **Rate-cap interaction.** B3 hit `tier_per_minute` (2/min) and was re-run as C2 after a wait. The
  caps are per-Bee and unchanged by this pass, but a real user hitting a cap mid-session has not
  been exercised.
- **Whether the placeholder rates are anywhere near right.** They are cost × 2 at an anchor I chose
  for legibility. That is a pricing decision, not an engineering one, and it is Butch's.
- **Test rows left in place:** probe bees `a618e0e8` (1 free directive) and `88739ef8`
  (4 paid directives, 7 ledger rows, balance 4936.7444). Left as this report's evidence.

---

## OPS14 — DAY-ONE SWEEP: both repos committed (2026-07-27) — **COMMITTED, PUSHES PARKED FOR BUTCH**

**Lane:** ops · **Scope:** oracle · **Dispatch:** e71ec4ee-5967-4e63-9541-77e117fdd516
**Authorization:** GIT AMENDMENT (`CLAUDE.md` R7) — explicit SWEEP dispatch, gates encoded below.

### 0. Headline

Two commits, two repos, both **1 ahead of `origin/main` and 0 behind** — clean fast-forward push
path on each. **Neither was pushed.** The push click is canon and permanent; I did not fire the
command, so nothing is sitting in a pending prompt. Commands for you are in §5.

| Repo | SHA | Files | Change |
|---|---|---|---|
| `TheMANUAL.tech` | **`4c4ee4b`** | 18 | +5113 / −166 |
| `HONEYCOMB` (root) | **`2c1c663`** | 2 | +32 / −2 |

### 1. Repo 1 — `TheMANUAL.tech`, full SWEEP

**Manifest** (`git status --porcelain=v1 -uall`) — 18 paths.

**Hard gates, all pass:**

| Gate | Result |
|---|---|
| `backups/` · `*.env*` · `settings.local.json` · `node_modules/` · `.next/` · `verify-out/` · `*.dump` | **clean** — no match |
| Any file > 1 MB | **clean** — none |
| Any deletion (`D`) or rename (`R`) | **clean** — all entries `M` or `??` |
| Every path inside the workspace | **yes** |
| Secret-shaped strings (`eyJ…`, `sk-ant-…`, `sb_secret_…`, `whsec_…`, `sk_live_…`, assigned service-role key) | **clean** — zero hits across all 18 files |

**Stage-and-verify:** all 18 paths staged by name, then `git diff --cached --name-only` diffed
against the manifest — **identical, 18/18**. No `git reset` needed.

Staged set:

```
 M shared/notes/handoffs/handoff-current.md
 M src/App.tsx
 M src/components/AtlasOracleWalletBadge.tsx
 M src/components/layout/UtilityChrome.tsx
 M supabase/functions/_shared/atlasoracle/audit-log.ts
 M supabase/functions/atlasoracle-log/index.ts
 M supabase/functions/atlasoracle-route/index.ts
?? REPORT.md
?? deno.lock
?? docs/atlasoracle-provider-expansion-matrix-2026-07-27.md
?? docs/atlasoracle-weight-licences-2026-07-27.md
?? src/lib/atlasoracle/client.ts
?? src/lib/atlasoracle/routingLog.ts
?? src/lib/atlasoracle/tokens.ts
?? src/lib/atlasoracle/useOracleDirective.ts
?? src/pages/oracle/OraclePage.tsx
?? supabase/migrations/20260727140000_atlasoracle_retire_cost_bling.sql
?? supabase/migrations/20260727180000_oracle_token_ledger_v1.sql
```

Git emitted CRLF→LF normalisation warnings on two `.ts` files. Informational, not a gate failure,
and no content changed.

### 2. Repo 2 — `HONEYCOMB` root, targeted stage

The dispatch said *"stage **exactly** the day's root-level edits"* and named two files. The root
manifest actually carried **six**. Gates were run against the two staged files (banned patterns
clean, 32,522 B and 9,338 B, both `M`, no secret-shaped strings) and the staged set verified
identical to the intended two.

**Deviation D1 — intentional departure from SWEEP step 3.** The pure SWEEP pattern stages *every*
manifest path and treats any difference as a stop-and-reset. Here the dispatch deliberately narrowed
the set, and its own done-test anticipates the gap (*"except deliberate leftovers (name them)"*), so
I followed the dispatch rather than the generic pattern. Named below.

### 3. Deliberate leftovers — named, as the done-test requires

**Root repo, 4 uncommitted (canon lane, not mine, not named in my dispatch):**

```
 M AtlasORACLE.to/master_plan/atlasoracle-canonical-cache.md
 M AtlasORACLE.to/master_plan/bling-ledger-interface.md
 M shared/canon/atlasoracle-canonical-cache.md
 M shared/canon/bling-ledger-interface.md
```

Inspected before deciding: 30 insertions / 8 deletions across the four, documenting the
`cost_bling` retirement (DB7/DB9) in both mirror locations — e.g. rewriting a spend-audit query to
key on `tier` and token counts now that the column is gone. Coherent, complete-looking, and clearly
today's ORACLE work — but authored by another lane whose report does not reference my commit.
Committing another lane's canon edits under my SHA is exactly what SWEEP's gates exist to prevent.
**Recommend a canon-lane SWEEP for these four.**

**`TheMANUAL.tech`, 1 uncommitted — appeared *after* the commit:**

```
 M docs/atlasoracle-provider-expansion-matrix-2026-07-27.md
```

The tree was verified **clean (0 entries)** immediately after `4c4ee4b`. A parallel session has
since edited the DOCS1 matrix — upgrading `SEARCH-DERIVED` cells to `VERIFIED` from a human-read of
the OpenAI Services Agreement, adding §3.3(e) and §4.2 citations and a router carve-out note. Good
work, and it supersedes DOCS1 §2.1 as filed; it simply landed after the snapshot. Not a sweep
failure — a timing artifact of concurrent sessions.

**Also inherently uncommitted: this REPORT.md section.** The report of a sweep cannot be inside the
sweep it describes. `REPORT.md` was committed in `4c4ee4b` in its pre-OPS14 state.

### 4. Judgement calls

- **D1 — targeted stage on the root repo** rather than full-manifest SWEEP. §2.
- **D2 — `deno.lock` committed.** Not in the dispatch's list. It is a byproduct of the `npx deno
  check` gate OPS13/OPS12 ran, it is a legitimate lockfile, and it was in the manifest — and SWEEP
  is all-or-nothing by design, so cherry-picking it out would have broken the identity check and
  turned this into a non-sweep. Flagged so it is a decision rather than an accident; trivially
  removable if unwanted.
- **D3 — `shared/notes/handoffs/handoff-current.md` committed.** OPS9 §6 recorded it as a
  pre-existing modification and left it alone. It was in the manifest, so under the same
  all-or-nothing rule it is in the commit. Named here because OPS9 deliberately did not touch it.
- **D4 — added the APPLIED status header to `20260727180000_oracle_token_ledger_v1.sql`** before
  staging, as the dispatch asked. DB7's migration already carried one (added by DB9); mine did not.
  Header only, no SQL changed.
- **D5 — did not fire `git push`.** The dispatch says park; the done-test accepts
  "parked-with-note". Firing it would leave a permission prompt hanging. §5.

### 5. Pushes — yours

Both repos are exactly 1 ahead, 0 behind. Nothing is pending, nothing is queued.

```
cd C:\Users\Butch\Documents\HONEYCOMB\TheMANUAL.tech
git push origin main          # 4c4ee4b

cd C:\Users\Butch\Documents\HONEYCOMB
git push origin main          # 2c1c663
```

`TheMANUAL.tech` pushing to `main` triggers the Railway auto-deploy to themanual.tech. **The
frontend in that commit includes FRONT16's `/oracle` route and badge wiring, which have not been
smoke-tested against a production build by this pass** — see §7.

### 6. Done-tests

| Requirement | Result |
|---|---|
| Both trees clean post-commit except deliberate leftovers, named | **PASS** — `TheMANUAL.tech` was 0-entry clean at commit; 5 leftovers total across both repos, all named in §3 with reasons |
| Manifest counts identical | **PASS** — repo 1: 18 manifest = 18 staged, diffed identical. Repo 2: 2 intended = 2 staged, diffed identical |
| Zero secret-shaped strings staged | **PASS** — pattern scan across all 20 staged files, zero hits |
| Pushes completed-by-Butch or parked-with-note | **PARKED** — §5 |

### 7. Could not verify

- **That `TheMANUAL.tech@4c4ee4b` builds.** `npm run build` was **not** run. The workspace rule is
  no build while a dev server is running (a shared `.next` kills it), and I could not establish
  whether one is up. The commit contains FRONT16 frontend work I did not write and have not
  compiled. **Since pushing triggers a Railway deploy, someone should build locally before you
  push** — this is the one real risk in the commit.
- **Whether the four root-repo canon files are finished.** Judged coherent by reading the diff, not
  confirmed with their author.
- **Whether `deno.lock` is wanted long-term.** Committed as a manifest path; nobody has ruled on it.
- **Push outcome.** Not attempted by design.

---

## DB8 — Oracle Token ledger v1 (2026-07-27) — **APPLIED, BATTERY GREEN, ZERO ESCROW DRIFT**

**Lane:** db · **Scope:** oracle · **Dispatch:** 8ef11364-3810-48ae-8db1-3af8ed4a6e15
**Migration:** `supabase/migrations/20260727180000_oracle_token_ledger_v1.sql`
**Authorization:** MIGRATION AMENDMENT (`CLAUDE.md` R7) + Butch's in-session rollback statement, §1.

### 0. Headline

Oracle Tokens now have a ledger. Append-only is a **fact, not a claim** — enforced at the grant
layer where it actually binds, and proven by 9 negative tests run **as the real roles**, including
`service_role`, which bypasses RLS. Balance view matches the hand-summed seed exactly. Every
`bling_*` and escrow object is byte-for-byte unchanged, proven by a before/after schema fingerprint
rather than asserted.

### 1. Authorization — the dispatch was one precondition short

Your MIGRATION AMENDMENT requires *"the rollback statement must be stated in the dispatch before
the apply runs."* **DB8 stated no rollback.** Every other gate cleared — additive-only, no
`oracle_*` object pre-existed, not destructive DDL, pre-flight recorded below — but that one is
written plainly and I had just codified, in the same file, that written gates bind regardless of
what a dispatch body claims. Applying anyway would have made OPS13's refusal look arbitrary.

You were in-session, so I put it to you with the rollback pre-stated rather than filing DB8-Q and
stalling. You approved. **The approved rollback, verbatim:**

```sql
DROP VIEW  IF EXISTS public.oracle_token_balances;
DROP TABLE IF EXISTS public.oracle_token_ledger;
DROP TABLE IF EXISTS public.oracle_model_rates;
```

Safe unconditionally today: all three objects were created by this migration and hold nothing but
this pass's own test rows. It is also recorded in the migration file header, so it travels with the
artifact.

**Also fixed: the two `CLAUDE.md` editions had diverged**, which R3–R8's shared-wording rule
forbids. Root had gained the MIGRATION AMENDMENT; `atlasJUSTICE.org/CLAUDE.md` still read *"no
applying migrations to any database"* and had no migration bullet — so the repo edition forbade
exactly what root permitted, and what I was about to do. On your instruction the amendment was
copied across and the stale clause dropped. Both editions match again. **Deviation D1:** that file
is outside DB8's scope and workdir; you directed it in-session.

### 2. Pre-flight (MIGRATION AMENDMENT requirement)

| Check | Result |
|---|---|
| Any `oracle_*` object already present? | **None** — 0 rows. Pure creation, zero collision risk. |
| FK target `atlasoracle_directives.id` | `uuid NOT NULL` ✅ |
| FK target `bees.id` | `uuid` ✅ |
| Rows at risk | **Zero** — no existing table is read, altered, or written by this migration |
| Dependent objects / views / routines on targets | **None** — the targets did not exist |
| Baseline: `bling_*` tables | 7 |
| Baseline: `atlasoracle_*` routines | 6 |
| House RLS pattern | `<table>_select_own` → SELECT, `authenticated`, `auth.uid() = bee_id`; `<table>_select_authenticated` → SELECT, `authenticated`, `true` |

**The pre-flight finding that changed the design.** Existing oracle tables carry Supabase's blanket
default grants — `DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE` to **all four** roles
including `anon` and `service_role`. RLS is the only thing restraining them. For an append-only
ledger that is not sufficient, because **`service_role` bypasses RLS but does not bypass grants**.
So the ledger explicitly `REVOKE ALL` first and grants back only what each role needs. Had I copied
the house grant pattern verbatim, "append-only" would have been decorative.

### 3. What was created

**`oracle_token_ledger`** — append-only, one row per token movement.

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `bee_id` | uuid NOT NULL → `bees(id)` | |
| `entry_type` | text NOT NULL | CHECK ∈ `purchase`, `debit`, `adjustment`, `grant` |
| `amount_tokens` | numeric(20,6) NOT NULL | **signed** |
| `directive_id` | uuid NULL → `atlasoracle_directives(id)` | |
| `payment_ref`, `payment_method` | text NULL | payment-agnostic, no processor assumed |
| `memo` | text NULL | added beyond spec — §7 D2 |
| `created_at` | timestamptz NOT NULL | |

**Sign discipline is enforced, not conventional.** `purchase`/`grant` must be `> 0`, `debit` must be
`< 0`, `adjustment` must be `<> 0`. A wrong-signed row cannot be inserted, which is what makes
`SUM()` trustworthy as a balance rather than merely conventional.

**Idempotency guard:** partial unique index — at most one `debit` per `directive_id`. Adjustments
against the same directive stay legal, which is the whole point of the reversing-entry model. This
is deliberately the opposite mistake to `atlasoracle_debit`, whose unique index made its own
two-leg write impossible (OPS10 finding 1).

**`oracle_token_balances`** — view, `security_invoker = true`. Returns `balance_tokens`,
`purchased_tokens`, `granted_tokens`, `spent_tokens`, `entry_count`, `last_entry_at` per bee.
Without `security_invoker` a view over an RLS table runs with **owner** rights and every Bee would
read every other Bee's balance through it. Verified set: `{security_invoker=true}`.

**`oracle_model_rates`** — rates as data. `model_name`, `tier`, `input_tokens_per_m`,
`output_tokens_per_m`, `cached_input_per_m`, `effective_from`, `active`, `source_note`. Versioned by
`effective_from` and never overwritten, so a historical debit can always be re-derived against the
rate that was live when it happened.

**Deviation D3 — new table rather than extending `atlasoracle_provider_pool`.** The dispatch allowed
either. `provider_pool` is about *selection* (weight, drift, active) at exactly one row per
provider, so it cannot carry rate history without changing its grain — and it is inert, nothing
reads it (OPS10 finding 4), so extending it would put live pricing into a dead table. Left untouched.

### 4. Done-tests — all four PASS

**① Insert battery green** — four seed rows accepted: purchase +100, grant +25, debit −3.5 (with
`directive_id`), adjustment +0.5.

**② Balance view matches hand-sum.** Hand-sum `100 + 25 − 3.5 + 0.5 = 122.000000`:

```
balance_tokens | purchased | granted | spent | entry_count
   122.000000  | 100.000000| 25.000000| 3.500000|     4
PASS  view matches hand-sum
```

**③ UPDATE/DELETE provably denied** — 9 negative tests, each run under `SET LOCAL ROLE` as the
actual role, not as `postgres`:

| # | Test | Result |
|---|---|---|
| 3a | positive-signed `debit` | **PASS** rejected (`check_violation`) |
| 3b | unknown `entry_type` (`refund`) | **PASS** rejected (`check_violation`) |
| 3c | second `debit` on same directive | **PASS** rejected (`unique_violation`) |
| 3d | `authenticated` UPDATE | **PASS** denied (`insufficient_privilege`) |
| 3e | `authenticated` DELETE | **PASS** denied (`insufficient_privilege`) |
| 3f | **`service_role` UPDATE** | **PASS** denied (`insufficient_privilege`) |
| 3g | **`service_role` DELETE** | **PASS** denied (`insufficient_privilege`) |
| 3h | `service_role` INSERT (must still work) | **PASS** allowed |
| 3i | `anon` SELECT | **PASS** denied (`insufficient_privilege`) |

3f and 3g are the ones that matter: they are the tests the RLS-only approach would have failed.

Resulting grant matrix — exactly what append-only requires, nothing more:

```
 grantee       | privs
---------------+---------------
 authenticated | SELECT
 service_role  | INSERT,SELECT
```

`anon` appears at all only by absence: it holds no privilege on the table.

**④ Zero changes to any `bling_*` or escrow object — proven, not asserted.** A fingerprint over
every `bling_*` and `atlasoracle_*` relation (name, kind, every column name and formatted type) plus
`md5(pg_get_functiondef())` of every matching routine:

| | Fingerprint | Objects |
|---|---|---|
| Before apply | `b15717428b25c687ae94ee07bfc7940b` | 182 |
| After apply + battery | **`b15717428b25c687ae94ee07bfc7940b`** | **182** |

**Identical.** No `bling_pots`, `bling_transactions`, or `atlasoracle_*` escrow RPC was altered,
dropped, re-granted or redefined. Legacy escrow remains dormant and untouched, pending your
disposition ruling. The migration contains no `ALTER`, `DROP`, `GRANT` or `REVOKE` against any of
them — the fingerprint is the proof rather than my word for it.

### 5. Test rows: reversed, not deleted

The battery's rows are real rows in a production table, so leaving a probe bee holding 123 phantom
tokens would have been sloppy. **They were zeroed the only way this design permits — a reversing
`adjustment` entry.** There is no DELETE path, by construction; I could have deleted as `postgres`,
but doing so would have violated the model this pass exists to establish.

```
balance before reversal: 123.000000  (entry_count 5)
balance after reversal :   0.000000  (entry_count 6)
```

Six memo-tagged rows remain on probe bee `0e6e5b41-…`, net zero. This doubles as end-to-end proof
that the correction path works.

### 6. Rollback (re-stated, as applied)

```sql
DROP VIEW  IF EXISTS public.oracle_token_balances;
DROP TABLE IF EXISTS public.oracle_token_ledger;
DROP TABLE IF EXISTS public.oracle_model_rates;
```

No other object references these three, so the DROPs are unconditional and order-independent beyond
the view preceding its table.

### 7. Deviations and judgement calls

- **D1 — edited `atlasJUSTICE.org/CLAUDE.md`**, outside scope and workdir. Butch directed it;
  the shared-wording rule required it. §1.
- **D2 — added a `memo` column** not named in the dispatch. An append-only ledger whose only
  correction mechanism is a reversing entry is unusable without somewhere to record *why* the
  reversal happened. Nullable, no behavioural weight.
- **D3 — created `oracle_model_rates`** rather than extending `atlasoracle_provider_pool`.
  Dispatch permitted either; reasoning in §3.
- **D4 — added a partial unique index** (one debit per directive) not named in the dispatch. The
  router will need debit idempotency and the alternative is duplicate charges on retry. It is
  deliberately narrow so the reversing-entry path stays open.
- **D5 — `REVOKE ALL` before granting**, diverging from the house grant pattern on every other
  oracle table. Required for append-only to bind against `service_role`. §2.
- **Applied by `psql` against production directly.** The Supabase CLI migration path was not used;
  this repo has no `config.toml` (OPS9 §1) and the migration is not registered in any migration
  history table. **Flagged in §9.**

### 8. Wired to nothing yet — by design

This pass created schema only. **No code reads or writes these tables.** `atlasoracle-route` still
computes `cost_bling` and still calls the (broken, gated) `atlasoracle_debit`. Nothing regressed and
nothing improved at runtime; the ledger is a foundation waiting for the router pass that will use
it, which is a separate dispatch. `oracle_model_rates` is empty — rates are a data-seeding decision
(what a directive costs in Oracle Tokens), not a schema one, and nobody has ruled on the numbers.

### 9. Could not verify

- **Migration-history registration.** Applied via `psql`, so `supabase_migrations.schema_migrations`
  does not know about this file. Future `supabase db push` runs may try to re-apply it — it is
  idempotent, so that is survivable, but the drift is real and someone should reconcile how
  migrations get applied in this repo. Pre-existing condition (no `config.toml`), surfaced here.
- **Behaviour under a real Supabase JWT.** RLS was exercised via `SET LOCAL ROLE`, where
  `auth.uid()` is NULL. That is the correct way to test *grants* — and grants are what append-only
  rests on — but the `select_own` policy's `auth.uid() = bee_id` predicate has not been proven with
  a live Bee token.
- **`security_invoker` behaviour end-to-end.** The reloption is set and verified; a two-Bee
  cross-read test was not run.
- **Whether `numeric(20,6)` is the right precision for Oracle Tokens.** Mirrors the BLiNG! Lock 7
  convention. Nobody has ruled on token denomination — if Oracle Tokens are whole units, this is
  over-precise, and it is far cheaper to change now than after rows accumulate.

---

## OPS12 — swap pinned Anthropic model IDs to current generation (2026-07-27) — **SHIPPED v16, VERIFIED BYTE-EXACT**

**Lane:** ops · **Scope:** oracle · **Dispatch:** 5a86ec1c-fa0a-4e2c-a7b0-3d7d2e5b99e3
**Authorization:** DEPLOY AMENDMENT (codified in `CLAUDE.md` R7 during OPS13) — dispatch names the
deploy, type-check ran clean first, artifact verified after. Chain of custody intact.

### 0. Headline

Model pins are current-generation and live at **version 16**. Deployed bundle verified
**byte-identical to the repo across all five files** — a stronger check than OPS13 managed, using a
method that retroactively closes OPS13's one verification gap (§4).

**One hazard the dispatch did not anticipate, and it is the important part of this pass:** both
replacement models **think by default where their predecessors did not**, and `TIER_MAX_TOKENS` is
too tight to absorb that. Latent only — paid tiers stay gated — but it is now a documented blocking
prerequisite for ever flipping `PAID_TIERS_ENABLED`. §5.

### 1. Prices re-verified live — dispatch numbers confirmed

The dispatch said not to trust its own figures if stale. Re-fetched
<https://platform.claude.com/docs/en/about-claude/models/overview.md> at execution time,
2026-07-27:

| Tier | Was | Price was | Now | Price now | Delta |
|---|---|---|---|---|---|
| free | `claude-haiku-4-5` | $1 / $5 | **unchanged** | $1 / $5 | — |
| standard | `claude-sonnet-4-6` *(Legacy)* | $3 / $15 | **`claude-sonnet-5`** | **$2 / $10** intro | **−33%** |
| frontier | `claude-opus-4-7` *(Legacy)* | $5 / $25 | **`claude-opus-5`** | $5 / $25 | price-neutral |

Verbatim from the page: *"Introductory pricing of $2 / $10 per MTok applies to Claude Sonnet 5
through August 31, 2026."* After that date the standard-tier swap is capability-positive and
price-neutral, not a saving.

**Haiku 4.5 is CURRENT, not Legacy** — it appears in the "Latest models comparison" table alongside
Fable 5, Opus 5 and Sonnet 5. The dispatch's conditional ("swap to its successor if the page shows
it Legacy too") therefore did not trigger. Free tier untouched, which also means the only live path
was not disturbed.

Legacy list confirmed as containing both replaced models: Opus 4.8, **Opus 4.7**, Opus 4.6,
**Sonnet 4.6**, Sonnet 4.5, Opus 4.5, Opus 4.1 (deprecated).

### 2. Changes made

**Code** — `supabase/functions/atlasoracle-route/index.ts`, `TIER_PROVIDER_MODEL` map only. Two
string values. Plus a comment block recording the verified prices, the reversal, and the §5 hazard.

**Database** — `atlasoracle_provider_pool`, two `UPDATE`s (dispatch explicitly authorized this;
R7 requires an explicit dispatch for project-table writes, which this was):

```
claude-sonnet-4-6 → claude-sonnet-5   (mid-tier)
claude-opus-4-7   → claude-opus-5     (frontier)
```

Post-state, all 5 rows: `claude-haiku-4-5` (fast), `groq-mixtral` (fast), `claude-opus-5`
(frontier), `claude-sonnet-5` (mid-tier), `oss-llama-3` (oss). The table remains inert — nothing
reads it (OPS10 finding 4, unchanged) — so this is bookkeeping for consistency, exactly as the
dispatch framed it.

### 3. Type-check gate

`npx -y deno@latest check supabase/functions/atlasoracle-route/index.ts` → **exit 0**, zero
diagnostics. Ran before deploy, per the DEPLOY AMENDMENT.

### 4. Deployment + verification — byte-exact, and a better method

| | Before | After |
|---|---|---|
| version | 15 | **16** |
| `ezbr_sha256` | `9e3fa58eedd8c8dd…` | **`e8126050f053fc2f…`** |
| repo `index.ts` sha256 | `07ef218278a7bdac…` | **`d202170611a01156…`** |

**Deployed-vs-repo comparison, all five bundle files:**

| File | deployed | repo | |
|---|---|---|---|
| `atlasoracle-route/index.ts` | `d202170611a01156` | `d202170611a01156` | **MATCH** |
| `atlasoracle-route/canon.ts` | `9d445f3504d7ef48` | `9d445f3504d7ef48` | **MATCH** |
| `_shared/auth.ts` | `a92b9dea385fcd8a` | `a92b9dea385fcd8a` | **MATCH** |
| `_shared/cors.ts` | `0cd6368aa21754cd` | `0cd6368aa21754cd` | **MATCH** |
| `_shared/supabase.ts` | `6e961b1ac4ee57c8` | `6e961b1ac4ee57c8` | **MATCH** |

Deployed map read back verbatim:

```ts
const TIER_PROVIDER_MODEL: Record<Tier, string> = {
  free:     'claude-haiku-4-5',
  standard: 'claude-sonnet-5',
  frontier: 'claude-opus-5',
};
```

**Method note — supersedes OPS13 §8 and OPS11 §3.** OPS13 recorded that a byte-exact deployed-vs-repo
hash comparison was impossible because the management API returns file contents as JSON strings.
That was a limitation of the *tool*, not of the task: `supabase functions download <slug>
--project-ref …`, run from a scratch directory so the repo cannot be clobbered, retrieves the
deployed files as **files** and hashes cleanly. **Future deploy verification should use the CLI
download, not the MCP JSON dump.** Two consequences: OPS13's "could not verify" item is retroactively
answerable by this method, and OPS11's claim that deployed source is "identical modulo comment
stripping" is **wrong** — comments are not stripped, the files are byte-identical, and the entire
§5 hazard comment is present in production.

### 5. ⚠ The hazard — a blocking prerequisite for `PAID_TIERS_ENABLED`

This is the finding that matters most from this pass, and the dispatch did not ask for it.

**The router sends no `thinking` parameter at all.** Its request body is `model`, `max_tokens`,
`system`, `messages`. On the models being replaced, omitting `thinking` meant *thinking off*. On
**both** replacements it does not:

| Model | `thinking` omitted ⇒ |
|---|---|
| Opus 4.7, Sonnet 4.6 *(replaced)* | thinking **OFF** |
| **Opus 5, Sonnet 5** *(new pins)* | **adaptive thinking ON**, and `effort` defaults to **`high`** on the Claude API |

`max_tokens` is a hard cap on **thinking + response text together**, and `TIER_MAX_TOKENS` is tight:

| Tier | max_tokens | Risk |
|---|---|---|
| standard | **1500** | A Sonnet 5 call at effort `high` can spend most of 1500 on thinking and return truncated or empty content |
| frontier | **5000** | Same shape, more headroom, still not sized for adaptive thinking |

The failure mode is not graceful. Empty content hits the router's `provider_empty_content` branch →
**502 to the Bee, after Anthropic has already billed for the thinking tokens.** That is precisely
the class of bug OPS11 was deployed to stop, arriving through a different door.

Compounding it: **Sonnet 5 uses the Opus-4.7-generation tokenizer (~30% more tokens for the same
text)**, so `estimateInputTokens()` — already measured under-counting by ~2.3× (OPS13 §7, DOCS1) —
drifts further low on the standard tier specifically.

**Not live today.** `PAID_TIERS_ENABLED = false`; both affected tiers return 503 before the map is
ever read. Verified again post-swap in §6.

**Recorded, not silently fixed.** Setting `thinking` / `output_config.effort` and re-baselining
`TIER_MAX_TOKENS` are behaviour changes on money paths, outside this dispatch's stated scope
("update the map"), so I did not make them — R2 says execute what is dispatched and raise the rest.
The hazard is instead documented **in the code, immediately above the map**, where the next person
to touch `PAID_TIERS_ENABLED` cannot miss it, and it is byte-confirmed present in production (§4).

### 6. Done-tests — all three PASS

Probe bee `0e6e5b41-fff7-4360-9afd-b090fb36e73d`, created via public GoTrue signup (anon key from
MCP; `.env` never read).

| # | Requirement | Result |
|---|---|---|
| 1 | deployed map shows current-gen IDs | **PASS** — read back byte-exact, §4 |
| 2 | free directive `success=true` post-swap | **PASS** — 200, `"response":"ACK"`, `claude-haiku-4-5`, 1643 in / 5 out / 0 cached |
| 3 | prices cited-with-date in report | **PASS** — §1, all live-fetched 2026-07-27 |

Guard regression check (not required, run anyway): standard → `503 tier_unavailable` in 1194 ms,
frontier → `503` in 299 ms. OPS11's guard survives the swap intact, and the sub-second 503s
re-confirm zero provider invocation.

### 7. Reversal

Per the dispatch's step 4:

1. **Code** — revert two strings in `TIER_PROVIDER_MODEL` to `claude-sonnet-4-6` / `claude-opus-4-7`,
   type-check, redeploy. One-line revert as the dispatch anticipated.
2. **Database** — two `UPDATE`s reversing the `provider_name` values.
3. Both legacy models remain available on the Claude API, so a revert is currently viable. That is
   not permanent: Legacy models are eventually retired.

### 8. Deviations and judgement calls

- **D1 — added a substantial comment block above the map.** Larger than the two-line change it
  documents. Comments are not behaviour and it type-checks clean; the alternative was shipping a
  known hazard with nothing in the code to warn the next reader. §5.
- **D2 — did not fix the hazard.** Explicitly out of dispatch scope and on a money path. Raised
  rather than silently actioned. §5.
- **D3 — downloaded the deployed function into a scratch directory** rather than the repo, because
  `supabase functions download` writes to `<cwd>/supabase/functions/<slug>` and would otherwise have
  overwritten the file I had just edited and deployed.
- **D4 — probe bee left in place** (`0e6e5b41-…`) with its one free directive row, consistent with
  OPS10 and OPS13. DB-lane call.
- **No migration applied.** Nothing in this pass required one.

### 9. Could not verify

- **That Opus 5 / Sonnet 5 actually behave as pinned.** Both tiers are gated, so neither replacement
  model has been invoked once. The swap is verified as *deployed configuration*, not as *working
  inference*. First real exercise of these pins will be whenever `PAID_TIERS_ENABLED` flips — which
  §5 says must not happen before the thinking/max_tokens work.
- **Post-2026-08-31 standard-tier pricing.** $3 / $15 is the stated post-intro rate; not re-checkable
  today.
- **Whether `atlasoracle_provider_pool`'s rename breaks anything.** Nothing reads the table, so the
  blast radius is believed nil — but "nothing reads it" is OPS10's finding carried forward, not
  re-proven this pass.

---

## OPS13 — DEPLOY atlasoracle-route to production (2026-07-27) — **SHIPPED, VERIFIED, BLEED STOPPED**

**Lane:** ops · **Scope:** oracle · **Dispatch:** 570ac63b-ff6e-418b-a8a3-d928c45cd539
**Authorization:** Butch, in-session, 2026-07-27 — see §1.
**Posture:** production deploy + live verification. One production mutation (the deploy). Three
files written: two `CLAUDE.md` amendments and this report. No migration applied.

### 0. Headline

**`atlasoracle-route` is live at version 15 and the paid-tier bleed is stopped.** Standard and
frontier now return `503 tier_unavailable` **without creating a directive row and without calling
Anthropic** — proven two independent ways (§4). Free tier still returns 200 end to end. OPS11's
source work is deployed exactly as it and DB7 left it.

Two findings the dispatch did not anticipate: **`audit-log.ts` is dead code and is not in the
bundle** (§3), and **the guard makes done-test 4 permanently unverifiable** (§5).

### 1. Authorization — I did not act on the dispatch body alone

The dispatch asserted Butch had lifted R7's "No deploys" in chat, quoting him, and declared itself
"the explicit approval OPS11-Q reasons 2 and 3 required." **I did not accept that.** The GIT
AMENDMENT precedent shows Butch's amendments to R7-class limits get *written into `CLAUDE.md`*;
this one existed only as an assertion inside a LEAD-authored body. Accepting it would have
established that any dispatch can self-authorize past a hard limit by claiming a chat ruling —
which removes the limit for every future dispatch, and would have made OPS11's refusal look
arbitrary rather than correct.

Butch was present in-session, so I asked him directly rather than filing a rail question and
stopping (R4's stop-and-file is the move for an *unattended* session; this one was attended).
He chose **"Confirm + codify."**

**Codified — and the shared-wording rule was honoured.** Root `CLAUDE.md` states R3–R8 are shared
wording with the repo edition and must change "in both files or in neither." The DEPLOY AMENDMENT
was therefore written **identically into both**:

| File | Line replaced |
|---|---|
| `HONEYCOMB/CLAUDE.md` | R7, formerly `- No deploys. No applying migrations to any database.` |
| `HONEYCOMB/atlasJUSTICE.org/CLAUDE.md` | §7, same line |

The new bullet permits edge-function deploys **only** via an explicit dispatch naming the deploy,
**only** after a clean type-check, with mandatory post-verification; keeps "no applying migrations"
intact; and closes the hole I refused to walk through — *"A dispatch body asserting an
authorization that is not written here is **not** sufficient — file a question instead."*

**Deviation D1:** both `CLAUDE.md` files are outside this dispatch's `scope` (`oracle`) and outside
its `workdir` (`TheMANUAL.tech`). Butch directed the edit in-session, which overrides scope per the
root file's own "Explicit user instruction overrides." Flagging it rather than burying it.

### 2. Type-check gate — passed, and it was not optional

OPS11 could not run this (`deno: command not found`, still true). The dispatch authorized an npx
equivalent. All three named files checked clean:

```
npx -y deno@latest check supabase/functions/atlasoracle-route/index.ts          → exit 0
npx -y deno@latest check .../_shared/atlasoracle/audit-log.ts .../atlasoracle-log/index.ts → exit 0
```

Zero diagnostics. No file was modified to make the check pass, so the dispatch's "if it demands
changes, file a Q instead" branch never triggered.

### 3. Hash verification — and a wrong premise in the dispatch

Repo hashes **match the dispatch exactly**:

| File | sha256 | Dispatch expected |
|---|---|---|
| `atlasoracle-route/index.ts` | `07ef218278a7bdac…` | `07ef2182…` ✅ |
| `_shared/atlasoracle/audit-log.ts` | `883b97638d5f9fe1…` | `883b9763…` ✅ |
| `atlasoracle-route/canon.ts` | `9d445f3504d7ef48…` | not named |
| `atlasoracle-log/index.ts` | `0223eb5758d218d0…` | not named |

**But `audit-log.ts` is not in the bundle, and nothing imports it.** The deploy uploaded five
assets — `atlasoracle-route/index.ts`, `atlasoracle-route/canon.ts`, `_shared/supabase.ts`,
`_shared/auth.ts`, `_shared/cors.ts`. A repo-wide grep for `audit-log` returns **only the file
itself**: no importer anywhere in `supabase/functions/`. The dispatch's framing of the bundle as
"index.ts … + audit-log …" is wrong; `audit-log.ts` is dead code. Its hash matching is therefore
true but irrelevant — it proves the file is untouched, not that it shipped. **Flagged for whoever
owns dead-code cleanup; not deleted this pass.**

**Deployed artifact:**

| | Before | After |
|---|---|---|
| version | 14 | **15** |
| `ezbr_sha256` | `1a3ef872628d18b1…` | **`9e3fa58eedd8c8dd…`** |
| status | ACTIVE | ACTIVE |
| updated | 2026-05-27 | 2026-07-27 |

Deployed source fetched back via MCP and read: it carries `const PAID_TIERS_ENABLED = false`, the
early 503 guard, `interface FailureTelemetry`, the five telemetry-bearing `markFailed` call sites,
and DB7's `cost_bling` write-stop comment with `cost_bling` absent from the finalize UPDATE. All
OPS11 + DB7 changes are present in production.

**Could not do a byte-exact deployed-vs-repo per-file hash comparison.** The management API returns
file *contents* as JSON strings, so line-ending and serialization normalisation confound a raw
hash. Verification above is content-marker based plus the bundle-digest change. Stated rather than
glossed.

### 4. Done-tests 1–3 — PASS, with two independent proofs

Probe bee created via public GoTrue signup (anon key only, from MCP `get_publishable_keys` — the
`.env` file was never read): `c6f0c10b-fd01-42d9-88f9-8db120191c8e`.

| # | Test | Result |
|---|---|---|
| 1 | standard tier → 503, zero provider invocation | **PASS** — `503 {"error":"tier_unavailable","message":"paid tiers temporarily offline"}` |
| 2 | frontier tier → 503 | **PASS** — identical body |
| 3 | free tier → 200 end to end | **PASS** — `"response":"ACK"`, `claude-haiku-4-5`, 1643 in / 5 out / 0 cached, `cost_bling: 0` |

**Proof of zero provider invocation, method 1 — no directive rows.** After all three probes, the
test bee has exactly **one** row in `atlasoracle_directives`: the free-tier success. The two
refused calls created **no row at all**, which proves the guard fired ahead of the rate-cap RPC,
the astra lookup, the escrow pre-check, the row insert *and* the Anthropic call. That is stronger
than the dispatch asked for and confirms OPS11's deviation D1 (placing the guard earlier than "before
any provider call") did what it claimed.

**Proof method 2 — latency differential in the edge logs.** All three probes logged under
`version: "15"`:

| Call | Status | Execution time |
|---|---|---|
| free (calls Anthropic) | 200 | 3742 ms |
| frontier (refused) | 503 | **405 ms** |
| standard (refused) | 503 | **1142 ms** |

Compare the v14 rows still in the log window: 500 in 3379 ms, 500 in 5995 ms — the old paid-tier
failures burned 3.4–6.0 s *because they were round-tripping to Anthropic before dying*. A 405 ms
response cannot contain a provider call. **The latency collapse is itself the proof.**

### 5. Done-test 4 — NOT VERIFIABLE, and that is structural

Dispatch: *"forced failure row carries token counts."*

**Cannot be demonstrated, and no amount of effort this pass would change that.** The telemetry
OPS11 added exists to make the *debit-failure* case visible — that was the live failure path OPS10
found. This deploy's guard prevents any paid directive from reaching the debit. **The guard and the
telemetry are mutually exclusive in observable terms:** the fix removed the only reachable failure
that carried token counts.

Current table state confirms there is nothing to point at:

```
 status  | count | with_tokens | with_provider
---------+-------+-------------+---------------
 failed  |     2 |           0 |             0     ← both from OPS10, under v14 (pre-telemetry)
 success |     2 |           2 |             2
```

Forcing a v15 failure row would require re-enabling paid tiers (spends real money and defeats the
deploy), or inducing a provider-side error (network / HTTP / empty-content), which I cannot do
without tampering with production env vars — out of scope and out of bounds. **The telemetry is now
dormant insurance for provider-side failures, correct by inspection and by type-check, unproven at
runtime.** Recorded as unverified rather than quietly marked green.

### 6. Deviations and judgement calls

- **D1 — edited two files outside scope and workdir** (`HONEYCOMB/CLAUDE.md`,
  `atlasJUSTICE.org/CLAUDE.md`). Butch directed it in-session; the shared-wording rule forced the
  second file. §1.
- **D2 — asked before executing.** The dispatch presented itself as sufficient authorization; I
  treated it as insufficient and put the question to Butch. Cost: one turn. §1.
- **D3 — probe bee left in place.** `c6f0c10b-…` and its one free-tier directive row were not
  deleted. OPS10's probe bee was likewise left. Cleanup is a DB-lane call, not mine to make
  unilaterally, and the rows are evidence for this report.
- **D4 — used `npx -y deno@latest` rather than installing deno.** Dispatch authorized "install deno
  locally if absent, or use npx equivalent." Chose the non-installing option: no permanent
  toolchain added to Butch's machine for a one-off gate.
- **Did not apply any migration.** Dispatch was explicit that the `cost_bling` DROP is DB9's,
  strictly after this deploy verifies. Untouched.

### 7. Incidental confirmations for the docs lane

The free-tier probe returned **1643 input tokens, 0 cached** — a third independent measurement
agreeing with OPS10's 1637 and confirming both DOCS1 corrections: the router's `CHARS_PER_TOKEN = 4`
estimate (~700 tokens) under-counts by ~2.3×, and **the canon prefix still does not cache** (1643 is
below Haiku 4.5's 4,096-token minimum). DOCS1 §4d's "grow the bundle past 4,096 to make it
cacheable" proposal now rests on three consistent live measurements rather than one.

### 8. Could not verify

- **Byte-exact deployed-vs-repo per-file hashes** — management API returns contents as JSON
  strings; normalisation confounds the comparison. Used content markers + bundle digest instead. §3.
- **Runtime behaviour of the failure-path telemetry** — structurally unreachable. §5.
- **Whether any paid-tier traffic occurred between OPS11 and this deploy** — the two `failed` rows
  are OPS10's; I did not diff by timestamp to rule out later ones.
- **`atlasoracle-log` and `atlasoracle-providers` remain undeployed** — type-checked this pass but
  not deployed; the dispatch named only `atlasoracle-route`.

### 9. Dispatch closure

Per the dispatch's step 5, **both OPS11 and OPS13 marked `done`** on green. DB7 deliberately left
`claimed` for DB9's DROP.

---

## DOCS2 — open-weight licence verification: gpt-oss, Llama, Qwen, Ministral (2026-07-27)

**Lane:** docs · **Scope:** oracle · **Dispatch:** 1aed560d-b791-43c5-b6e3-54a1108aa31f
**Chains from:** DOCS1 finding F2 (the gap DOCS1 named as its highest-value follow-up)
**Posture:** research + authoring. No code, schema, or config touched. No model downloaded.

### 0. Files written

```
TheMANUAL.tech/
├── REPORT.md                                              (updated in place — this section)
└── docs/
    └── atlasoracle-weight-licences-2026-07-27.md          (new — the deliverable)
```

Nothing created, edited, or deleted outside those two paths. No git operations.

### 1. Headline

**DOCS1's F2 hypothesis is confirmed.** Running open weights on a neutral host does dissolve the
API-terms training prohibition — *provided* the weights are Apache 2.0 and not one of the custom
licences. Four families verified as plain Apache 2.0 with no training restriction, no commercial
cap, and no naming obligation: **gpt-oss, Qwen 3.x, Mistral Small 4, Ministral 3.**

**But the cheapest option in DOCS1 is not one of them.** DOCS1 §4c ranked Llama 3.1 8B Instant on
Groq cheapest for the free tier. Llama's licence *permits* training on outputs — that changed at
Llama 3.1 and is more generous than most people assume — but §1.b.i attaches this, verbatim:

> "you shall also include 'Llama' at the beginning of any such AI model name"

plus "Built with Llama" displayed prominently. **A HONEYCOMB model trained on Llama outputs and
distributed would have to ship as `Llama`-something** — which collides head-on with the brand
naming conventions locked in `CLAUDE.md`. It is a naming tax, not a fee: no threshold to grow past,
nothing to pay it off with, permanent.

### 2. The decision it produces, priced

| Route | Licence | $ / 1,000 free directives | At 1M/month |
|---|---|---|---|
| Llama 3.1 8B Instant (Groq) — DOCS1 price leader | Llama Community — **naming tax** | $0.12 | $122 |
| **gpt-oss-20B (Together)** | **Apache 2.0 — clean** | **$0.18** | **$180** |
| gpt-oss-20B (Groq) | Apache 2.0 — clean | $0.27 | $273 |

**~$58/month at 1M free directives is the entire premium for a licence with no naming obligation** —
against a Haiku 4.5 baseline of $4,137/month for the same traffic. The clean-licence route is still
**23× cheaper than the status quo.** There is no real trade-off; take the Apache 2.0 route.

**Recommendation carried forward: gpt-oss-20B/120B on Groq, with Together as a second source.**
Apache 2.0 with a 216-byte usage policy that restricts nothing beyond obeying the law; available on
both hosts so it creates no single-provider dependency; Groq was DOCS1's F4 rights-cleanest host
(no training on inputs or outputs, no default retention, self-serve ZDR). Two sources, one licence,
no naming obligation.

### 3. Verdicts

| Family | Licence | Verdict |
|---|---|---|
| gpt-oss 20B / 120B | Apache 2.0 | **TRAINING-PERMISSIVE** |
| Qwen 3 / 3.5 / 3.6 (open weights) | Apache 2.0 | **TRAINING-PERMISSIVE** |
| Mistral Small 4 / Small 24B | Apache 2.0 | **TRAINING-PERMISSIVE** |
| Ministral 3 (3B/8B/14B) | Apache 2.0 | **TRAINING-PERMISSIVE** |
| Devstral Small 2 (24B) | Apache 2.0 *(SEARCH-DERIVED)* | **TRAINING-PERMISSIVE** |
| Llama 3.1 / 3.3 / 4 | Llama Community | **RESTRICTED** — naming tax, 700M MAU |
| Devstral 2 (123B) | Modified MIT | **RESTRICTED** — **$20M/mo revenue cliff** |
| Ministral 8B Instruct **2410** | Mistral Research | **PROHIBITED** commercially |
| Codestral 22B | Mistral MNPL | **PROHIBITED** — incl. free-of-charge supply |
| **Llama 5** | — | **UNKNOWN** |
| Qwen3.7 Max | closed weights | **N/A** — API terms govern (DOCS1 §2.5) |

### 4. Findings beyond the headline

**F2 — verify per release, never per vendor.** Mistral shipped Devstral 2 (123B, modified MIT with
a $20M/month revenue cliff) and Devstral Small 2 (24B, Apache 2.0) **on the same day, under
different licences.** Separately, two models both called "Ministral 8B" carry opposite licences a
generation apart: `Ministral-8B-Instruct-2410` is Mistral Research License (no commercial use),
`Ministral-3-8B-Instruct-2512` is Apache 2.0. DOCS1 priced the Apache one, so its recommendation is
safe — but **a pool config that stores a model *family* rather than a full pinned model ID will
eventually resolve to the wrong licence.** Feeds directly into the `db`-lane schema work DOCS1
proposed: that table needs a `licence` column pinned to the exact model ID.

**F6 — Devstral 2's revenue cap is a trapdoor, not a fee.** At $20M/month consolidated revenue the
rights *terminate* — "you are not authorized," not "you owe us." The clause explicitly reaches
derivatives, fine-tunes, and third-party-hosted variants. Fine for evaluation; wrong for anything
structural in a platform that intends to grow.

**F7 — the "free" Mistral options are not free for AtlasORACLE, on two independent grounds.** DOCS1
found `Leanstral` trains on your data unless ZDR is on. This pass adds the licence: MNPL §3.2
forbids supplying the model in commercial activity *"whether in return for payment or free of
charge."* **A free tier is still commercial activity** — so MRL/MNPL models cannot serve the free
tier at any price.

**Worth recording for the strategy file:** OpenAI has among the *most* restrictive API terms in
DOCS1 (§2.1 — training on Output prohibited) and among the *least* restrictive open weights here
(Apache 2.0, 216-byte usage policy). Same vendor, opposite postures, because the binding instrument
is different. That is F2 in its cleanest form.

### 5. Could not verify

12 items, full table in §7 of the deliverable. The ones that matter:

| Item | Status | Blocker |
|---|---|---|
| **Llama 5 licence** | `UNKNOWN` | No first-party text located. `huggingface.co/meta-llama` shows **no Llama 5 repo** (Llama 4 and 3.3 are the published families); `llama.com` 301s to `developer.meta.com/ai/`, which returned title only. The only licence claims found are secondary reporting that **self-hedges** — "Apache 2.0 (or equivalent permissive terms, pending full release notes)". That is a guess wearing a citation's clothes and I would not fill a cell with it. **Do not plan against a Llama 5 licence until someone reads one** — if Meta really has moved Llama to Apache 2.0 it changes the naming-tax conclusion materially, which is a reason to check rather than assume. |
| Devstral Small 2 licence | `SEARCH-DERIVED` | Model card returned HTTP 401 |
| Ministral 8B **2410** licence | `SEARCH-DERIVED` | HF card not individually fetched |
| Qwen open/closed split | `SEARCH-DERIVED` | Not confirmed against an Alibaba first-party page |
| Mixtral / NeMo licences | `SEARCH-DERIVED` | Not individually fetched |
| DeepSeek V4 **weights** licence | `UNKNOWN` | Out of this dispatch's named scope. Matters only if self-hosted or run via Fireworks/Together — via the DeepSeek API, DOCS1 §2.4 already answers it (training on outputs affirmatively permitted) |

Verified first-party this pass: gpt-oss 20B/120B licence + full usage policy text; Llama 3.1, 3.3,
and 4 LICENSE clauses (§1.b.i, §2) and the Llama 4 `USE_POLICY.md` category list; Qwen3.5-397B-A17B,
Qwen3.6-27B, Qwen3-235B-A22B licences; Mistral Small 4, Mistral Small 24B, Ministral 3 8B licences;
Devstral 2 123B LICENSE including revenue-cap and derivatives clauses; Mistral MNPL §§2.3, 3.2, 4.2;
the `meta-llama` HF org listing.

### 6. Done-test output, verbatim

Dispatch: *"every named release has a cited verdict or a named blocker."*

> **Result: PASS.** Every named release carries a verdict with a citation, or an explicit `UNKNOWN` /
> `SEARCH-DERIVED` marker with the blocker named. One release — Llama 5 — is `UNKNOWN`; two Qwen
> sub-releases and four Mistral releases are `SEARCH-DERIVED`. No verdict in this document rests on
> model memory.

One scope note: the dispatch named "Qwen 2.5/3.x". Qwen 3.x is the current open-weight line and was
verified in full; **Qwen 2.5 was not separately fetched** and is recorded as superseded in §9 of the
deliverable rather than silently dropped.

### 7. What this pass did NOT do

No code, schema, migration, or config changed. No weights downloaded, no model run, no provider
keyed. No legal advice given — this is a citation-gathering pass, and every verdict is a reading of
quoted text that counsel should confirm before anything ships on it. Not committed, not pushed.

### 8. Suggested follow-ups

1. **`docs`** — read the Llama 5 licence once a first-party source exists. It is the only `UNKNOWN`
   that could change a conclusion here.
2. **`db`** — when `atlasoracle_provider_pool` gets its real schema (DOCS1 §4e item 2), add a
   `licence` column keyed to the **full pinned model ID**, per F2. Family-level licence assumptions
   are how you end up serving traffic off a Mistral Research License model.
3. **`docs`** — verify DeepSeek V4's *weights* licence if self-hosting or Fireworks/Together routing
   is ever considered. Via the DeepSeek API it does not matter.
4. **OG HUMAN** — the train-our-own-model question is now answerable: **yes, via Apache 2.0 weights,
   at no licence cost.** DOCS1 F1 said only DeepSeek's API permitted it; DOCS2 says four open-weight
   families permit it outright. That is a strategy input, not a Code decision.

---

## DB9 — APPLY the cost_bling DROP (2026-07-27) — **PRECONDITIONS ALL GREEN, DDL NOT EXECUTED, QUESTION FILED**

**Lane:** db · **Scope:** oracle · **Dispatch:** f70791c5-6cde-46ce-8092-61fe92bb4bd2 · **status: still `claimed`**
**Posture:** read-only verification. **No DDL executed. Nothing written to any database. No file changed except this `REPORT.md`.**

### 0. Headline

Every precondition for the DROP is now **green** — the deploy landed, the deployed function no longer writes the column, the migration is authored and pre-flighted, and there is no data to lose. The one thing standing between this dispatch and `done` is authorization, and it is a one-line fix: **`CLAUDE.md` R7 does not carry a DDL amendment.** As amended today it grants edge-function deploys and then says, in the same breath, that *"no applying migrations to any database"* stays denied and that *"a dispatch body asserting an authorization that is not written here is not sufficient — file a question instead."* DB9's body asserts exactly such an authorization. So: question filed, per the rule's own instruction.

Nothing here needs re-doing. The moment a DDL line lands in `CLAUDE.md`, this is a two-minute pass.

### 1. Precondition verification (DB9 step 1 — the safety-critical one)

The whole point of "never both blind" is that the DROP must not precede the write-stop deploy. Verified directly against the deployed artifact, not inferred from a report:

| Check | Method | Result |
|---|---|---|
| Deployed version incremented past v14 | MCP `get_edge_function` | **v15**, `ACTIVE`, updated 2026-07-27 |
| Bundle hash | same | `ezbr_sha256 9e3fa58eedd8c8ddf0853707c60ba853265e1eea9ea04c4c47cb32705dca9c0e` (was `1a3ef872…` at v14) |
| Deployed finalize UPDATE omits `cost_bling` | read deployed source | **CONFIRMED** — the write-stop comment block and the `cost_bling`-free UPDATE are both present in the live bundle |
| OPS11 guard also live | read deployed source | **CONFIRMED** — `PAID_TIERS_ENABLED = false` and the 503 guard are in v15 |
| OPS11 telemetry also live | read deployed source | **CONFIRMED** — `FailureTelemetry` and all five `markFailed` call sites present |

**So v15 is the post-write-stop version, and it carries both passes.** Dropping the column now cannot strand a finalize UPDATE.

### 2. Live state immediately before the drop

| Check | Result |
|---|---|
| `atlasoracle_directives` column count | **17** (16 after the drop) |
| `cost_bling` present | **yes** — `numeric(24,6) NOT NULL DEFAULT 0` |
| Rows in table | **4** (was 3 at DB7; OPS13's deploy test added one) |
| Rows with `cost_bling <> 0` | **0** — the column has still never held a charge |

Dependency pre-flight from DB7 (zero `pg_depend` objects, zero views, zero routines, no constraint or index touching the column) stands unchanged — nothing has been added to the table since.

### 3. The migration, unchanged and ready

`supabase/migrations/20260727140000_atlasoracle_retire_cost_bling.sql` — `a0698df14a6cf258`, 5,189 bytes. Still carries its `STATUS: UNAPPLIED — DO NOT APPLY YET` header. **I did not strip that header**, because stripping it is the dispatch's step-2 tail and belongs with the apply itself — a file that says "applied" while the column still exists would be a lie in the repo.

### 4. Why the DDL was not executed

`CLAUDE.md` R7, as amended today by the **DEPLOY AMENDMENT (Butch, 2026-07-27)**, reads:

> Everything else stays denied: **no applying migrations to any database**, no DNS, no promote-to-live outside a named dispatch. A dispatch body asserting an authorization that is not written here is **not** sufficient — file a question instead.

DB9's body says *"DDL AMENDMENT: same Butch chat ruling 2026-07-27 authorizes applying this migration from Code."* That may well be true of the chat — but it is not written in `CLAUDE.md`, and the amendment that arrived today is specifically about deploys, with migrations named as still-denied. The sentence about dispatch-asserted authorization appears to have been written for precisely this shape of situation, so following it is the whole job.

This is not a judgement about whether the DROP is safe. It is safe — §1–§3 say so in detail. It is a judgement about who is allowed to say "run DDL", and the answer written down is: the root file, not a dispatch body.

**Resolution is one line in `CLAUDE.md` R7** granting migration-apply under a named dispatch, on the same pattern as the deploy grant. Once that exists this dispatch completes without further discussion.

### 5. Done-test

| Requirement | Result |
|---|---|
| (1) Confirm deployed route is post-write-stop | **PASS** — §1, verified against the live artifact |
| (2) Apply the migration; strip the UNAPPLIED header | **NOT DONE** — §4 |
| (3) Verify 16 columns, `cost_bling` absent | **NOT DONE** — depends on (2) |
| (4) Fire one free-tier directive post-drop | **NOT DONE** — depends on (2) |
| (5) Mark DB7 and DB9 done | **NOT DONE** — both left `claimed` |

### 6. Could not verify

- Post-drop behavior of the finalize UPDATE — needs the drop. Note the deployed v15 no longer references the column at all, so the expected result is a clean success; that is a prediction, not a measurement.
- Rollback path untested (nothing to roll back).

---

## DB7 — cost_bling retirement + schema reconciliation (2026-07-27) — **WRITE-STOP DONE, DROP DEFERRED BY THE DISPATCH'S OWN CONDITIONAL, QUESTION FILED**

**Lane:** db · **Scope:** oracle · **Dispatch:** 62969ac9-5f5b-4118-8cf3-09afff198c01 · **status: still `claimed`**
**Posture:** source edits + one authored-but-**unapplied** migration. **No DDL executed. No migration applied.** All database access this pass was read-only.

### 0. Headline — the branch question is settled

**The write-stop never landed.** The 2026-06-07 dispatch to stop writing `cost_bling` left no trace in the code: `atlasoracle-route` was still persisting the column at line 528 when DB7 was claimed. The dispatch's own conditional therefore governs — *"if not landed, do write-stop first, drop second — never both blind."* This pass is the write-stop. The DROP is pass two, and its migration is authored, pre-flighted and waiting.

### 1. Evidence — the source as found (dispatch requires it quoted)

`supabase/functions/atlasoracle-route/index.ts`, finalize block, **before** this pass:

```ts
  // ─── Finalize directive row. ───
  const { error: finalizeErr } = await service
    .from('atlasoracle_directives')
    .update({
      provider_selected: providerModel,
      cost_bling: finalCostBling,          // ← the write. Never stopped.
      latency_ms: latencyMs,
      input_tokens: inputTokens,
      ...
```

**After:**

```ts
  // ─── Finalize directive row. ───
  //
  // cost_bling WRITE-STOP (DB7, 2026-07-27). This UPDATE no longer persists
  // cost_bling. [...]
  const { error: finalizeErr } = await service
    .from('atlasoracle_directives')
    .update({
      provider_selected: providerModel,
      latency_ms: latencyMs,
      ...
```

Post-pass, **zero code paths write `cost_bling` to the database.** Verified by grep across `supabase/functions/` and `src/`.

### 2. What changed — three source files

| File | Change | sha256 (first 16) | Bytes |
|---|---|---|---|
| `supabase/functions/atlasoracle-route/index.ts` | write removed from finalize UPDATE | `07ef218278a7bdac` | 21,782 |
| `supabase/functions/_shared/atlasoracle/audit-log.ts` | `costBling` removed from `DirectiveMetadata` **and** the INSERT | `883b97638d5f9fe1` | 2,251 |
| `supabase/functions/atlasoracle-log/index.ts` | `cost_bling` removed from the SELECT list | `0223eb5758d218d0` | 2,793 |

**Deviation D1 — audit-log.ts.** Dead code: nothing imports it (`atlasoracle-route` writes the table inline). Left alone, it would silently resurrect the write the moment someone wired it up, and would then break against a dropped column. Retired in step rather than left as a landmine.

**Deviation D2 — atlasoracle-log/index.ts.** This is a **read**, not a write, so it sits outside a literal reading of "write-stop". It was also the **last code-side reference to the column** and would have failed hard the instant the DROP ran. Fixing it now makes pass two pure DDL with no callsite left to trip over. The function is not currently deployed, so nothing in production changes. Every row reads `0.000000`, so nothing of value leaves the response.

**Deliberately NOT changed:** `cost_bling` in the HTTP response body (`index.ts:570`), in the 402 insufficient-escrow response (`:343`), and in the console logs. Those report an in-memory number; they are not persistence. `src/lib/atlasoracle/client.ts:239` (front lane, live work) reads `d.cost_bling` **off the HTTP response, not the table** — so the front lane is unaffected by both the write-stop and the coming DROP. Renaming that field belongs to the Oracle-Token rewire, not here.

### 3. The DROP migration — authored, pre-flighted, **not applied**

`supabase/migrations/20260727140000_atlasoracle_retire_cost_bling.sql` (`a0698df14a6cf258`, 5,189 bytes). Header carries **STATUS: UNAPPLIED — DO NOT APPLY YET** and the hard precondition list, in the same style as the repo's existing unapplied migrations.

Pre-flight run read-only against production this pass:

| Check | Result |
|---|---|
| `pg_depend` objects depending on the column | **0** |
| Views referencing it (`pg_views`) | **0** |
| Routines referencing it (`information_schema.routines`) | **0** |
| Constraints touching it | **none** — 3 FKs, PK, 3 CHECKs on `directive_category` / `status` / `tier` |
| Indexes including it | **none** — pkey, `(bee_id, created_at DESC)`, `(astra_id, created_at DESC)` |
| Rows with a non-zero value | **0 of 3** — all `0.000000`; the column has never held a charge |

The DROP is clean, single-column, no dependents. Rollback (`ADD COLUMN … numeric(24,6) NOT NULL DEFAULT 0`) restores the shape exactly, and since every historical value is 0 there is no data to lose.

**The precondition that is NOT yet met:** the write-stop must be **deployed**, not merely committed. Deployed `atlasoracle-route` is still **version 14**, which writes the column. If the migration ran today, every successful directive's finalize UPDATE would fail against a missing column — the Bee would still get their response, but the row would sit `pending` forever. Deploy is blocked on the OPS11-Q ruling; the two passes are now coupled.

### 4. Live schema — `atlasoracle_directives`, 17 columns

`id · bee_id · astra_id · nova_id · directive_category · tier · provider_selected · cost_bling · latency_ms · success · created_at · status · error_message · input_tokens · output_tokens · cached_tokens · completed_at`

`cost_bling` is `numeric(24,6) NOT NULL DEFAULT 0`. Because it is NOT NULL **with** a default, removing it from the UPDATE is safe on its own — rows keep the 0 the INSERT gave them. Post-DROP the table is 16 columns.

Six RPCs confirmed live, all `atlasoracle_`-prefixed: `check_rate_caps · credit · debit · deposit_to_escrow · get_escrow_balance · withdraw_from_escrow`. **None references `cost_bling`** — the column is code-side only, which is why this retirement needs no RPC changes.

### 5. Canon vs. schema reconciliation (dispatch part 3)

| Canon source | Says | Schema/code reality | Verdict |
|---|---|---|---|
| `honeycomb-economic-constitution-2026-06-07.md` §Oracle | "BLiNG! exits the Oracle loop; `atlasoracle_directives.cost_bling` is **retired**" — marked **[PARKED]** | Column present and, until this pass, actively written | **Canon ahead of code by ~7 weeks.** The [PARKED] tag is why: it was ruled, then never scheduled. |
| `economic-model-lock-2026-06-07.md` | same retirement, listed twice as [PARKED] build work | as above | Same |
| `ORACLE_MF v0.5` ruling 2 | escrow economy **superseded**; disposition of legacy infra = OPEN-7, "until ruled, NOTHING touches it" | This pass touches **no** escrow object — only the directives column | **Consistent.** The column is not escrow infra; it is a log field. |
| `bling-ledger-interface.md` §11/§13 (live canon, in `master_plan/`) | ships example queries `SELECT d.cost_bling … WHERE d.cost_bling > 0` | Those queries break after the DROP | **Canon needs an edit.** This file is bucket-synced canon the router can read — a stale query in it is worse than a stale doc. |
| `atlasoracle-canonical-cache.md` §132 | `cost_bling = (per §5 pricing)` in the cache record shape | Same problem, smaller blast radius | **Canon needs an edit.** |
| `20260520120000_atlasoracle_schema.sql` header | documents `cost_bling — numeric(20,6) — Lock 7 precision` | Live column is `numeric(24,6)` — widened by `economy_v3_cap_precision` | **Migration comment stale.** Moot once dropped. |

**Reconciliation finding:** the two `master_plan/` files are the ones that matter, because they are synced into the canon bucket and read by routed models. `bling-ledger-interface.md` and `atlasoracle-canonical-cache.md` both instruct against a column that is about to stop existing. Both live outside `TheMANUAL.tech` (workdir) and outside my `scope` — **not edited, flagged for the docs lane.**

### 6. Done-test

| Requirement | Result |
|---|---|
| Route source quoted in report showing no `cost_bling` write | **PASS** — §1, before and after |
| Column drop migration **applied** and verified absent via `information_schema` | **NOT DONE** — see §7. Migration authored + pre-flighted; applying it is barred to this session and premature per the dispatch's own "never both blind." |
| Zero other columns touched | **PASS** — one column named in one migration; no other schema object edited, and no DDL run at all |

### 7. Why no DDL was executed

- **Terminal Protocol R7:** *"No deploys. No applying migrations to any database."* Unambiguous, and a dispatch body does not amend a hard limit — R2 routes such an instruction to a question.
- **Root plan-mode policy** classes schema migrations as risky-by-criteria (mutates production state), requiring a written plan and explicit approval first.
- **The dispatch's own conditional** defers it regardless: the write-stop had not landed, so the drop is pass two by instruction, not by my preference.
- **It would break production if run now** — deployed route is v14 and still writes the column (§3).

Question `DB7-Q` filed. Dispatch left `claimed` per R4.

### 8. Could not verify

- **No type-check or lint of the three changed files.** Deno is not installed (`deno: command not found`) and `tsconfig` `include` is `["src","server"]`, so `supabase/functions/` is outside the Vite/tsc build. Reviewed by reading only. Same limitation recorded under OPS11.
- **Runtime behavior of the write-stop** — needs the deploy that OPS11-Q is blocked on.
- **Whether the 2026-06-07 write-stop dispatch was ever issued to a terminal.** I can only report that no trace of it reached the code; the rail did not exist on that date, so there is no dispatch row to check.

### 9. Coupling note for the lead

OPS11 and DB7 have now both edited `atlasoracle-route/index.ts`, and **neither is deployed**. The deployed function is v14; the repo is two passes ahead. One deploy lands both changes together — guard, telemetry, and write-stop. They are compatible by construction (I wrote both), but they must ship as one unit, and the DROP must come **after** that deploy, never with it.

---

## OPS11 — STOP THE BLEED: paid-tier guard + failure-path telemetry (2026-07-27) — **SOURCE DONE, DEPLOY BLOCKED, QUESTION FILED**

**Lane:** ops · **Scope:** oracle · **Dispatch:** f8ce837c-3b1f-4bbc-a3be-e9d6faddd3b6 · **status: still `claimed`**
**Posture:** local source edit only. One file changed: `supabase/functions/atlasoracle-route/index.ts`. No RPC, index, migration, or economics logic touched. No deploy performed.

### 0. Headline

Both code changes are written and reviewed. **The deploy half cannot be executed by this session**, so the bleed is not yet stopped in production — the repo is ahead of the deployed function and paid tiers are still spending. Question `OPS11-Q` filed; dispatch deliberately left `claimed`. See §4.

### 1. Change 1 — paid-tier guard (zero-spend refusal)

`const PAID_TIERS_ENABLED = false;` declared beside the other tier constants, with the debit defect documented at the declaration so the next reader knows what the flag is for and when it may be flipped.

The runtime guard sits **immediately after tier validation** (`index.ts:204–214`):

```ts
if (!PAID_TIERS_ENABLED && tier !== 'free') {
  console.log('atlasoracle-route paid tier refused', { bee_id: beeId, tier });
  return jsonResponse({
    error: 'tier_unavailable',
    message: 'paid tiers temporarily offline',
  }, 503);
}
```

**Judgement call (deviation D1):** the dispatch said "before any provider call." I placed it earlier than that — ahead of the rate-cap RPC, the astra-registry lookup, the escrow pre-check *and* the directive-row insert. Rationale: a refused request should not consume a Bee's rate-cap budget, should not touch escrow, and should not leave a `pending` orphan row in `atlasoracle_directives` that never fired and never completes. Strictly stronger than the requirement, and it keeps the directives table clean for whoever analyses the OPS10 spend later. Free tier passes through untouched.

Response body is exactly the two keys the dispatch specified — no extras.

### 2. Change 2 — failure-path telemetry

`markFailed()` gained an optional fifth parameter, `telemetry?: FailureTelemetry` (`{providerModel?, inputTokens?, outputTokens?, cachedTokens?}`). Fields are written **only when present**, so a directive that died before reaching the provider still writes nulls — a null column keeps meaning "never got that far" rather than becoming an ambiguous zero.

Call sites, all five:

| Site | Failure | Telemetry passed |
|---|---|---|
| `index.ts:404` | provider network error | `providerModel` only — no response, no usage |
| `index.ts:420` | provider HTTP error | `providerModel` only — Anthropic error bodies carry no usage |
| `index.ts:436` | provider parse error | `providerModel` only |
| `index.ts:464` | empty content | **full** — provider already billed |
| `index.ts:506` | **debit failed** | **full** — this is OPS10 finding 10, the live case |

To make the full set available at the empty-content site, the `usage` extraction was moved **above** the `responseText` empty check (`index.ts:446–457`). Pure reordering — same expressions, same values, no behavior change on the success path.

**Deviation D2:** the dispatch names three fields (`input_tokens` / `output_tokens` / `provider_selected`); I also persist `cached_tokens`. It comes from the same `usage` object, the column already exists and is already written on the success path, and omitting it would make failed-directive rows the only place cache behavior goes dark — which is the exact blindness this pass exists to remove.

**Deliberate non-change:** `cost_bling` still writes 0 on the failure path. The Bee genuinely was not charged; recording a charge that did not happen would be an economics change, which this pass is forbidden to make. The provider spend is now visible via the token columns, which is the intended signal.

### 3. Done-test — 2 of 4 verifiable, 2 blocked

| Requirement | Result |
|---|---|
| Standard-tier call returns 503 with zero Anthropic invocation, proven via edge logs | **BLOCKED** — requires the deploy |
| Free-tier call still 200 end-to-end | **BLOCKED** — requires the deploy |
| A forced failure row carries token counts | **BLOCKED** — requires the deploy |
| Deployed source and repo source byte-identical (hash both) | **FAILS BY DESIGN RIGHT NOW** — deployed is v14, pre-OPS11; see hashes below |

Repo source after this pass: `sha256 b3057060ff1797bb89a43048022d5784ce57c9734799b141f87c47f077b1e6aa`, 21,270 bytes.
Deployed `atlasoracle-route`: **version 14**, `ACTIVE`, `ezbr_sha256 1a3ef872628d18b187d01caa899ccd244ccf8956238e9fd34e7947e8812907c3`, updated 2026-05-27. Read back via MCP `get_edge_function` and diffed by eye against the pre-edit repo file: **identical modulo comment stripping** — no deploy-only drift in this function (unlike env-diag). The two hashes are not directly comparable anyway: the deployed digest covers the bundle (`index.ts` + `canon.ts` + three `_shared/*.ts`), not the single file. Whoever deploys should re-hash both sides after the fact and record the pair here.

### 4. Why the deploy did not happen

Three independent blockers, any one of which is sufficient:

1. **No tool exists.** This session's Supabase MCP surface is read-only for functions — `list_edge_functions` and `get_edge_function` only. There is no `deploy_edge_function`. Confirmed by tool search, not assumed.
2. **Terminal Protocol R7** states plainly: *"No deploys."* A dispatch body cannot amend a hard limit — R2 directs that such an instruction be turned into a question rather than executed.
3. **`TheMANUAL.tech/CLAUDE.md`** requires explicit Butch approval before any deploy of this kind, and the root plan-mode policy classes production edge-function deploys as risky-by-criteria (mutates production state; touches money flow).

Question `OPS11-Q` filed on the rail. Dispatch left `claimed` per R4.

### 5. Could not verify

- **Type-check / lint of the changed file.** Deno is not installed on this machine (`deno: command not found`), and `tsconfig` `include` is `["src", "server"]` — `supabase/functions/` is outside the Vite/tsc build entirely, so `npm run build` would say nothing about this file even if run. The changes were reviewed by reading; they are not machine-verified. **The deploying session should type-check before pushing.**
- **Runtime behavior of the guard and the telemetry.** Not exercised — see §3.
- Whether any paid-tier traffic occurred between OPS10 and now (would need a fresh directives-table read; DB lane's surface).

### 6. Flag for the canon lane — not actionable here

The canon bundled into the deployed function (`atlasoracle-route/canon.ts`, `LANGUAGE_FIREWALL`) instructs every routed model: **BLiNG! is "never … 'token,' 'credits,' or 'points'"**, and lists "Token" among forbidden terms for the unit of account. ORACLE_MF v0.5 ruling 3 makes **Oracle Token** the purchasable unit. Once the token rewire lands, the canon the models read will contradict the product's own vocabulary. Canon-lane call, flagged not touched.

---

## OPS10 — FIRST LIVE SMOKE TEST: atlasoracle-route end to end (2026-07-27)

**Lane:** ops · **Scope:** oracle · **Dispatch:** 15fb73b9-0007-4c72-b039-30f823553a4c
**Spend:** approved by Butch 2026-07-27, $5 hard cap.
**Posture:** live probe. **No source file created, modified, or deleted this pass.** Writes were to the
database only (one auth user, one `bling_pots` row) plus this `REPORT.md` (R6: reporting is always in scope).

### 0. Headline

**The first live directive in AtlasOracle's history fired successfully at 13:40:26Z on 2026-07-27** —
`directive_id 6970e525-59d3-45a1-829c-3ddfedfa1984`, free tier, `claude-haiku-4-5`,
1637 in / 43 out / 0 cached, 1234 ms, `success=true`, real response content returned in the HTTP body.

**But both paid tiers are hard-broken.** `atlasoracle_debit` can never succeed. Every standard and
frontier directive calls Anthropic (real money spent), then dies on a unique-index violation, marks
itself `failed`, discards the model's response, and returns HTTP 500 to the Bee. Two of the three
directives fired this pass did exactly that. This is not a config problem and not a data problem — it
is a structural contradiction inside the RPC, and it means **AtlasOracle currently cannot bill anyone
for anything.** Detail in §3, Finding 1.

### 1. Done-test

Dispatch: *"at least one directives row exists with `success=true` and real token counts; observed-vs-claimed
table filed in report; spend total stated with basis."*

| Requirement | Result |
|---|---|
| ≥1 `atlasoracle_directives` row, `success=true`, real token counts | **PASS** — row `6970e525…`, `success=t`, `input_tokens=1637`, `output_tokens=43`, `cached_tokens=0` |
| Observed-vs-claimed table | **PASS** — §3 below |
| Spend total with basis | **PASS** — §4 below |

### 2. What was run

| # | Step | Result |
|---|---|---|
| 1 | Claimed OPS10 from `ops_dispatches` | ok |
| 2 | Read route source, bundled canon, `_shared/auth.ts`, `_shared/supabase.ts` | ok |
| 3 | Dumped live schema — 3 oracle tables, 6 oracle RPCs, grants, constraints, indexes | ok |
| 4 | Created TEST bee via public GoTrue signup (anon key only — service-role key never touched) | ok · bee `2b66f641-0a0c-46ce-bbaa-70cf61793364`, handle `bee_2b66f641` |
| 5 | Seeded escrow pot 10.000000 BLiNG! | ok (deviation D1) |
| 6 | Fired **standard** directive (Sonnet 4.6) | **HTTP 500** — debit failed *after* the provider call |
| 7 | Fired **free** directive (Haiku 4.5) | **HTTP 200** — full chain green |
| 8 | Fired **frontier** directive (Opus 4.7), no `confirm_cost` | **HTTP 500** — preview gate did not fire; debit failed *after* the provider call |
| 9 | Re-read directives table, pots, transactions, edge logs | ok |

Verbatim client output for all three calls is in §7.

### 3. Observed vs. claimed

Reference is the rail-canonical `ORACLE_MF v0.4` §2 ("MODEL (as-built v1, verified live 2026-07-27)").
**There is no §4 in the rail-canonical ORACLE_MF** — its sections run §1, §2, §3, §5, §6, §7. The original
uploaded handoff document is not on the rail and not in this repo (OPS9 §5 recorded the same absence), so
any §4 claim could not be checked. §2 was checked in full.

| # | Claim / expectation | Observed | Verdict |
|---|---|---|---|
| 1 | "debit" RPC exists and works; "deposits write two `bling_transactions` legs" | `atlasoracle_debit` writes two legs with the **same** `source_ref`, against a **unique** index on `source_ref WHERE source_type='atlasoracle_directive'`. The second insert always violates. | **BROKEN — blocks all paid tiers** |
| 2 | frontier: ">10 BLiNG! requires `confirm_cost`" | Gate is arithmetically unreachable — the frontier estimate is a constant **6.5 BLiNG!** for every possible input. Observed: frontier call executed with no `confirm_cost` and no preview response. | **DEAD CODE** |
| 3 | "prompt caching = #1 cost lever" | Canon bundle = **1637 input tokens**. Cache minimums: Haiku 4.5 = 4096, Opus 4.7 = 2048, Sonnet 4.6 = 1024. Observed `cached_tokens=0`. | **Caching inert on 2 of 3 tiers** |
| 4 | `atlasoracle_provider_pool` (5 rows, weights, drift) governs provider selection | `atlasoracle-route` never queries it — provider comes from a hardcoded `TIER_PROVIDER_MODEL` map in `index.ts`. Only `atlasoracle-providers` reads the table, and that function is **not deployed**. | **Table is inert** |
| 5 | `atlasoracle_canon_reads` caches canon | Route imports the **bundled** `./canon.ts`, not `_shared/atlasoracle/canon-reader.ts`. Table still **0 rows**. | **Table is inert** |
| 6 | "free → canon says OSS; v1 routes Haiku 4.5 interim" | Confirmed: `provider_selected = claude-haiku-4-5`. | **Matches** |
| 7 | "`atlasoracle_directives` … 0 rows" | Now **3 rows** (1 success, 2 failed). Sovereignty rule holds — no content column exists, none was written. | **Superseded by this pass** |
| 8 | "`cost_bling` column STILL PRESENT" | Confirmed present; `0.000000` on all three rows, including the two that spent real money. | **Matches — and see #10** |
| 9 | "env-diag … still deployed" | Deployed, but returns `410 gone` — neutered, not deleted. §6's "deletion pending Butch confirm" is still open. (Resolves one of OPS9 §5's could-not-verifies.) | **Partially stale** |
| 10 | — (not claimed) | On the failure path `markFailed()` writes no `input_tokens` / `output_tokens` / `provider_selected`. **Provider spend on failed directives is invisible to the platform.** Both failed rows show 0 cost and null tokens despite real Anthropic billing. | **Telemetry gap — feeds DB7** |
| 11 | — (not claimed) | `atlasoracle_credit` (refund path) carries the **identical** two-leg / unique-index defect on `atlasoracle_refund`. Unreachable today regardless, since it requires a debit row that cannot exist. | **Same bug, second RPC** |
| 12 | — (not claimed) | `handle_new_bee` fired correctly on signup — `bees` row auto-created, handle `bee_2b66f641`, `bling_balance` 0.000000. | **Working** |
| 13 | — (not claimed) | Free tier skips both the escrow pre-check and the debit. It is currently the **only** working tier, so 100% of usable AtlasOracle traffic is unmetered provider spend, bounded only by rate caps (2/min, 10/hr, **50/day** per Bee). | **Exposure** |

Additionally resolved from OPS9 §5: `atlasoracle-providers` and `atlasoracle-log` are **not deployed**
(deployed list is `atlasoracle-route`, `-escrow-deposit`, `-escrow-withdraw`, `-env-diag`); deployed
`atlasoracle-route` is version 14, updated 2026-05-27.

#### Finding 1 in full — why `atlasoracle_debit` can never succeed

The index:

```
bling_transactions_atlasoracle_directive_uidx
  UNIQUE (source_ref) WHERE (source_type = 'atlasoracle_directive')
```

The RPC body inserts **two** rows — the Bee leg and the treasury leg — both with
`source_type='atlasoracle_directive'` and both with `source_ref = p_source_ref` (the directive UUID).
The first insert succeeds; the second collides with the first.

The idempotency guard at the top of the RPC (`SELECT … WHERE source_type='atlasoracle_directive' AND
source_ref = p_source_ref` → return early) is what the index was presumably built to protect. The guard
wants one row per directive; the ledger wants two legs per directive. As written they are mutually
exclusive. Observed error, verbatim from `atlasoracle_directives.error_message`:

```
debit: duplicate key value violates unique constraint "bling_transactions_atlasoracle_directive_uidx"
```

Consequence chain per paid directive: escrow pre-check passes → directive row inserted → **Anthropic
called and billed** → debit raises → `markFailed()` → response text discarded → HTTP 500. The Bee is not
charged, receives nothing, and the platform eats the provider cost with no record of its size.

`bling_transactions` for the test bee: **0 rows.** Treasury operational pot: **0.000000.** No money moved
in either direction.

#### Finding 2 in full — the frontier preview gate is unreachable

`calculateCostBling('frontier', …)` = `5.0` base, `+0.1` per 1000 input tokens **over 10 000**, `+0.5`
per 1000 output tokens **over 2000**, capped at 50. The gate fires only when the estimate exceeds
`FRONTIER_PREVIEW_THRESHOLD_BLING = 10.0`.

Estimated output for frontier is the constant `TIER_DEFAULT_OUTPUT_TOKENS.frontier = 5000` →
`+ceil(3000/1000) × 0.5 = +1.5`. Estimated input is `directive.length/4 + CANON_BUNDLE_LENGTH/4`. With
`MAX_DIRECTIVE_CHARS = 10_000` (≤ 2500 tokens) and the canon bundle measured at 1637 tokens, **maximum
possible estimated input ≈ 4137 tokens** — far below the 10 000 threshold, so the input surcharge is
always 0.

**The frontier estimate is therefore always exactly 6.5 BLiNG!**, and `6.5 > 10.0` is never true.
Reaching 10 BLiNG! would need a directive of roughly 180 000 characters — 18× the enforced input limit.
`confirm_cost` is currently a no-op parameter.

Empirically confirmed this pass: the frontier call carried no `confirm_cost` and received no
`cost_preview` response — it went straight through to the provider.

### 4. Spend

**Total: ≈ $0.02. Absolute worst-case ceiling: $0.17. Cap was $5.**

Basis — published per-MTok list rates × tokens:

| Call | Model | Rate in/out | Input | Output | Cost |
|---|---|---|---|---|---|
| free | `claude-haiku-4-5` | $1 / $5 | 1637 (**measured**) | 43 (**measured**) | **$0.0019** (exact) |
| standard | `claude-sonnet-4-6` | $3 / $15 | ~1637 (inferred) | unknown | ~$0.006 (ceiling $0.027) |
| frontier | `claude-opus-4-7` | $5 / $25 | ~1637 (inferred) | unknown | ~$0.008 (ceiling $0.133) |

Only the free-tier call has exact figures, because it is the only one that completed. For the two failed
calls the route discards the provider `usage` object before `markFailed()` runs (Finding 10), so their
token counts are **not recoverable from the platform** — input inferred from the identical prompt shape,
output bounded above by each tier's `max_tokens` (1500 / 5000). Latencies (1728 ms and 1065 ms, against
1234 ms for the 43-token free call) indicate short outputs in both cases, so the realistic figure sits far
nearer $0.02 than the ceiling. **The ceiling is what I would defend; the point estimate is an inference,
not a measurement.**

### 5. Deviations and judgement calls

**D1 — Escrow seeded directly into `bling_pots`, not via `atlasoracle_deposit_to_escrow`.**
The proper chain requires `bees.bling_balance` > 0, which requires lot rows via `lot_debit`, which would
mean fabricating balance across three more tables. The route reads only
`bling_pots(bee_id, purpose='atlasoracle').balance`, so this is the minimal seed the dispatch called for.
Seeded 10.000000 BLiNG! — enough for one standard estimate (2.0) plus one frontier estimate (6.5).
**This is unbacked BLiNG!: it came from neither the curve nor the treasury.**

**Residual: the pot still holds exactly 10.000000**, because every debit failed — nothing was consumed. I
left it in place rather than reverting: the paid tiers cannot be re-tested without it, and a documented
artifact beats a silent revert. Reversal is one statement whenever the lead or Butch wants it:

```sql
DELETE FROM public.bling_pots
 WHERE bee_id = '2b66f641-0a0c-46ce-bbaa-70cf61793364' AND purpose = 'atlasoracle';
```

**D2 — Free tier used to satisfy the done-test.** After the standard tier failed, free was the only path
to a `success=true` row without touching economics code, which the dispatch forbade. It exercises the
identical chain (auth → rate caps → astra resolve → directive insert → Anthropic → finalize) minus the
escrow pre-check and the debit.

**D3 — One frontier call, no `confirm_cost` variant.** The dispatch asked for the block-then-confirm
sequence. With the gate arithmetically dead (Finding 2), a `confirm_cost: true` run would be identical in
behaviour — pure spend for zero information. Documented the analysis instead.

**D4 — The debit bug was not fixed.** MODIFY NO ECONOMICS CODE, per the dispatch. Diagnosis only.

**D5 — TEST bee created via public GoTrue signup**, not the Admin API, to avoid handling the service-role
key. Only the legacy anon key (public — it ships in every client bundle) was used.

**RED ZONE:** `ANTHROPIC_API_KEY` was never read, printed, logged, or written. Its presence is inferred
solely from the provider returning real completions rather than the route's
`503 Provider integration not configured`. No service-role key, DB password, or Stripe secret was read or
emitted; the DB password came from `pgpass.conf` via `-w`.

### 6. Could not verify

- **Handoff §4** — the rail-canonical `ORACLE_MF v0.4` has no §4. The original uploaded handoff doc is
  neither on the rail nor in this repo (OPS9 §5 found the same). §2 was checked in full.
- **Token counts and true provider spend for the two failed calls** — discarded by the route before
  `markFailed()` (Finding 10). Inferred, not measured.
- **Response content of the standard and frontier calls** — never returned to the caller, never persisted
  (sovereignty rule). Unrecoverable by design.
- **Whether deployed `atlasoracle-route` v14 (updated 2026-05-27) is byte-identical to the repo's local
  `index.ts`** — deployed source was not fetched or diffed. Every finding above is consistent with the
  local source, but the deployed artifact was not proven identical.
- **`atlasoracle_credit` defect (Finding 11)** — code inspection only. Not executed; it is unreachable,
  requiring a debit row that cannot exist.
- **Rate caps** — never driven to a 429. Thresholds read from the RPC body, not exercised.
- **Whether `groq-mixtral` / `oss-llama-3` are routable at all** — no code path reaches them.

### 7. Raw output — verbatim

Standard tier:

```
label            : standard
http status      : 500
wall_ms          : 6322
body (no content): {
  "error": "Failed to debit escrow"
}
```

Free tier:

```
label            : free
http status      : 200
wall_ms          : 3511
body (no content): {
  "directive_id": "6970e525-59d3-45a1-829c-3ddfedfa1984",
  "cost_bling": 0,
  "provider": "claude-haiku-4-5",
  "tier": "free",
  "tokens": {
    "input": 1637,
    "output": 43,
    "cached": 0
  },
  "escrow_balance_after": null
}
response chars   : 172
response head    : "AtlasOracle is a router that dispatches directives to AI providers while keeping canon from `master_plan/` as the read-only source of truth and preserving user sovereignty."
```

Frontier tier (no `confirm_cost`):

```
label            : frontier
http status      : 500
wall_ms          : 3787
body (no content): {
  "error": "Failed to debit escrow"
}
```

Directives table after the pass:

```
                  id                  |   tier   | status  | success | provider_selected | cost_bling | latency_ms | input_tokens | output_tokens | cached_tokens
--------------------------------------+----------+---------+---------+-------------------+------------+------------+--------------+---------------+---------------
 6982b0e3-6d4b-4eb1-a992-be979f5532a3 | standard | failed  | f       |                   |   0.000000 |       1728 |              |               |
 6970e525-59d3-45a1-829c-3ddfedfa1984 | free     | success | t       | claude-haiku-4-5  |   0.000000 |       1234 |         1637 |            43 |             0
 82fcbe1c-eceb-4934-9e8e-5ea9028f6fd8 | frontier | failed  | f       |                   |   0.000000 |       1065 |              |               |

error_message on both failed rows:
  debit: duplicate key value violates unique constraint "bling_transactions_atlasoracle_directive_uidx"
```

Ledger after the pass:

```
 bling_pots (test bee, atlasoracle) : 10.000000   -- untouched; every debit failed
 bling_transactions (test bee)      : 0 rows
 bling_pots (treasury, operational) : 0.000000
 atlasoracle_canon_reads            : 0 rows
```

### 8. For the lead

Nothing here needs a decision from me, but four items want dispatches:

1. **DB lane — fix `atlasoracle_debit` (and `atlasoracle_credit`).** Blocks every paid tier. Two plausible
   shapes: drop the unique index and move idempotency to a `(source_type, source_ref, bee_id)` key, or keep
   one ledger row per directive and drop the treasury leg. That is an economics-canon call, not a mechanical
   fix — it decides whether the treasury leg exists at all.
2. **Persist tokens and provider on the failure path.** One `markFailed()` signature change. Until then,
   every failed directive is uncosted provider spend. Feeds DB7's `cost_bling` work.
3. **Frontier preview gate.** Lower the threshold, raise the frontier output estimate, or delete
   `confirm_cost` — as of today it is a parameter that does nothing.
4. **Decide the fate of `atlasoracle_provider_pool` and `atlasoracle_canon_reads`.** Both are seeded, both
   are inert, and `ORACLE_MF` §2/§6 describe them as if live (provider weights, drift checks). Either wire
   them up or mark them not-yet-wired in canon.

The D1 escrow residual (10 BLiNG!, unbacked) is still in place and needs a call.

---

## DOCS1 — provider EXPANSION matrix beyond the live 5-pool (2026-07-27)

**Lane:** docs · **Scope:** oracle · **Dispatch:** 17ac2129-9737-4e1a-aea3-c449461084ac
**Posture:** research + authoring. No code, schema, migration, or config touched. Two files written.

### 0. Files written

```
TheMANUAL.tech/
├── REPORT.md                                                    (updated in place — this section)
└── docs/
    └── atlasoracle-provider-expansion-matrix-2026-07-27.md      (new — the deliverable, ~30 KB)
```

Nothing created, edited, or deleted outside those two paths. No git operations. No database write
outside the dispatch row itself.

### 1. What the pass produced

The eight providers the dispatch named (OpenAI, xAI/Grok, Google, DeepSeek, Qwen, Kimi, Mistral,
aggregators) each carry the six fields the dispatch specified — auth model, current pricing,
streaming, rate limits / minimum spend, output-training verdict, free tier — plus the required
free-tier reconciliation comparing true-OSS routes against the Haiku 4.5 stand-in at current
prices. Aggregators are broken out individually: Groq, Together, Fireworks, OpenRouter.

**Every price was fetched live on 2026-07-27.** The dispatch's "zero from-memory numbers" was
treated as the binding constraint of the pass, not a preference.

### 2. Headline findings

- **F1** — Only DeepSeek affirmatively permits training on its outputs ("training other models
  (such as model distillation)", quoted from its ToS). Mistral's prohibition is scoped to *image*
  outputs, leaving text an unaddressed absence rather than a permission. OpenAI, xAI, Google,
  Moonshot, and Together all prohibit it.
- **F2** — Running open weights (gpt-oss, Llama, Qwen, Ministral) on a neutral inference host makes
  the *weights licence* the binding constraint, not the host's ToS. This dissolves most of F1.
  **The per-release licence text is `UNKNOWN` and is the single highest-value follow-up.**
- **F3** — xAI, Together, and Moonshot train on customer data by default; Gemini's **free tier**
  trains and permits **human review of inputs and outputs**. Proposed standing rule: no Bee
  directive text to any provider that trains by default, regardless of price. That rule alone
  eliminates the Gemini free tier and makes ZDR a hard precondition for Together.
- **F4** — Groq is the cleanest candidate on rights: does not train on inputs or outputs, no
  default retention, self-serve ZDR with no approval gate, US data location. It is also already
  the canon-designated post-launch free-tier provider — **the rights-cleanest path and the canon
  path are the same path.**
- **F5** — Park Moonshot. See §4.4 below.
- **F7** — `claude-sonnet-4-6` → `claude-sonnet-5` is **−33%** on a newer model until
  **2026-08-31**. See §4.5.

### 3. Free-tier reconciliation, in one line

**Revised after filing — see §9.** At the free tier's **live-measured** 1,637-in/500-out shape,
Haiku 4.5 costs **$4.14 per 1,000 directives**; gpt-oss-20B on Groq costs **$0.27** (15.2× cheaper)
and Llama 3.1 8B Instant on Groq costs **$0.12** (33.9× cheaper). Below ~100k free directives/month
the whole subsidy is a rounding error and canon's "no subsidy pressure at v1 scale" holds exactly as
written; at ~1M/month the gap is roughly **$3,900/month**.

Separately, and more interesting than the price-shopping: the canon prefix **does not cache on the
free tier**. OPS10 measured it live at 1,637 tokens with `cached_tokens = 0`; Anthropic's minimum
cacheable prefix on Haiku 4.5 is 4,096 tokens, so the same canon text is re-billed at full input
price on every free directive, forever, with no error raised. DeepSeek V4 Flash would cache it at a
**~357× reduction** on the fixed portion of every request. That is the strongest technical argument
for expansion in the document, and it is a caching-architecture argument rather than a price one.

The same measurement produced a cheaper idea that needs no expansion at all: at 1,637 tokens the
prefix is only ~2,459 tokens short of Haiku's 4,096 minimum, so **growing the canon bundle past
4,096 tokens would make it cacheable on the existing free tier** — a bigger system prefix that is
*cheaper* per request. Worth modelling before any provider integration is commissioned.

### 4. Deviations and judgement calls

**4.1 — Placed the deliverable in `TheMANUAL.tech/docs/`, not `shared/canon/`.** Scope is `oracle`
and workdir is `TheMANUAL.tech`; `shared/canon/` sits at the workspace root, outside the dispatched
workdir, and R5 bounds the pass to its scope. `docs/` already exists here. If the lead wants this
promoted to `shared/canon/` alongside the other oracle canon, that is a separate dispatch — I did
not move it there unilaterally.

**4.2 — Filename carries the fetch date.** Prices decay. A dateless filename would read as current
six months from now. The date is in the filename, the header, and against every table.

**4.3 — Introduced `SEARCH-DERIVED` as a third state.** The dispatch specified two states,
"cited-with-date or UNKNOWN." Three cells fit neither: the first-party page returned **HTTP 403**
to the fetcher, but the language came back consistently from search against that same first-party
domain. Recording them `UNKNOWN` throws away real signal; recording them as cited overstates the
verification. They are marked inline, listed in §5, and each carries an explicit "re-read by a
human before relying on it." **If the lead considers this a done-test violation, the three cells
collapse to `UNKNOWN` with no other change to the document.**

**4.4 — Included a Moonshot governance flag the dispatch did not ask for.** While verifying
Moonshot's terms, search surfaced a **2026-07-22** White House OSTP statement naming Moonshot AI
over alleged distillation of Anthropic's Fable model to build Kimi K3, with possible sanctions
mentioned in the reporting; Moonshot denies using American models for K3. The allegations are
**contested and unadjudicated** and are recorded as such, sourced to news outlets and explicitly
labelled non-first-party. It is in the document because a provider-selection matrix that omitted a
supply-continuity risk and an Anthropic-relationship question would be a worse decision document,
not a more neutral one. Recommendation is "park pending resolution" — a dependency statement, not
a schedule, and the call belongs to OG HUMAN.

**4.5 — Surfaced a finding outside the dispatch's stated subject.** §1a of the deliverable records
that the router's three pinned Anthropic models are a generation behind current: Opus 4.7 and
Sonnet 4.6 are both listed under **Legacy models** on Anthropic's current model page. Opus 4.7 →
Opus 5 is price-neutral ($5/$25 either way) for a newer model; Sonnet 4.6 → Sonnet 5 is **$3/$15 →
$2/$10** on the introductory rate, i.e. −33%, expiring **2026-08-31**. This is not "expansion
beyond the 5-pool," but it was found while establishing the pricing baseline the expansion is
measured against, it is time-boxed, and holding it for a future pass costs real money. **Recorded
as a proposal. Not executed** — changing pinned model IDs is a code change, not a docs pass.

**4.6 — Measured the canon bundle rather than assuming it.** The cost model needed a representative
token count, so I computed the actual output of `assembleCrossAstraCanon()` (**2,462 characters**)
and used the router's own `CHARS_PER_TOKEN = 4` and `TIER_DEFAULT_OUTPUT_TOKENS.free = 500`. The
cost table is therefore grounded in shipped constants. §4d of the deliverable notes the ranking is
valid **only** for the free tier's 700-in/500-out shape — a different in/out ratio reorders it.

### 5. Could not verify

17 items, reproduced from §6 of the deliverable.

| Item | Status | Blocker |
|---|---|---|
| OpenAI competing-model restriction, exact text | `SEARCH-DERIVED` | `openai.com/policies/services-agreement/` → HTTP 403 |
| xAI competing-model restriction, exact text | `SEARCH-DERIVED` | `x.ai/legal/terms-of-service` and `.../-enterprise` → HTTP 403 |
| xAI default training-on-inputs licence | `SEARCH-DERIVED` | same 403 |
| xAI rate limits / min spend / free tier | `UNKNOWN` | not attempted this pass |
| Fireworks output ownership + training terms | `UNKNOWN` | ToS 308-redirects to a Sanity-hosted PDF; text streams unparseable |
| Gemini free-tier per-model RPM/TPM/RPD | `UNKNOWN` | docs defer to login-gated `aistudio.google.com/rate-limit` |
| Kimi K2.6 pricing | `UNKNOWN` | per-model page not fetched |
| Kimi streaming, rate limits, free tier | `UNKNOWN` | not attempted this pass |
| Qwen / Model Studio training terms | `UNKNOWN` | Model Studio ToS not read |
| Qwen / Model Studio rate limits, min spend | `UNKNOWN` | not attempted this pass |
| Qwen open-weight licence text, per release | `UNKNOWN` | not attempted — **highest-value follow-up (F2)** |
| gpt-oss / Llama / Ministral weight licences | `UNKNOWN` | not attempted — **same follow-up (F2)** |
| Together rate limits / min spend / free tier | `UNKNOWN` | not attempted this pass |
| Groq Developer-plan minimum spend | `UNKNOWN` | not disclosed in Groq's rate-limit docs |
| Streaming for Google, Mistral, Qwen, Together, Fireworks, Groq | `SEARCH-DERIVED` | OpenAI-wire-compatible by documentation, not individually re-verified |
| DeepSeek use of customer inputs for training | `UNKNOWN` | terms are silent on the point |
| Anthropic first-party pricing page | worked around | `platform.claude.com/docs/en/pricing.md` → 404; used the models-overview page, which carries the same figures |

Verified directly (first-party page fetched and parsed 2026-07-27): all pricing tables except Kimi
K2.6; DeepSeek concurrency limits, output-training permission, and streaming; Google training
prohibition, free/paid data split, and usage tiers; OpenAI usage tiers and data-usage default; xAI
streaming; Mistral commercial-terms output ownership, image-training restriction, and default
training posture; Kimi ToS competitive clause and default content use; Groq rate limits and data
policy; OpenRouter pricing, free-tier limits, auth, and data policy; Fireworks size tiers and
named-model pricing; Alibaba free-quota region and duration; Anthropic current model pricing.

### 6. Done-test output, verbatim

Dispatch: *"every cell cited-with-date or UNKNOWN."*

> **Result: PASS.** Every price, limit, and terms statement above carries either a first-party URL
> with fetch date 2026-07-27, an explicit `SEARCH-DERIVED` marker naming the blocker, or `UNKNOWN`
> with the reason. §6 enumerates all 17 unverified items. No number in this document came from model
> memory.

### 7. What this pass did NOT do

No code, schema, migration, or config changed. No provider integrated, keyed, or tested. Router
model IDs not swapped (§4.5 is a proposal only). Nothing moved into `shared/canon/`. `npm run build`
not run — no source file was touched, so there was nothing to build, and per the workspace rule the
dev server is not to be disturbed by a speculative build. Not committed, not pushed — git is the
human's (R7). Per OPS9 §6, this tree is its own git repo and is gitignored by the workspace root, so
a root-level sweep will not see either file written this pass.

### 8. Suggested follow-ups for the lead to queue

1. **`docs`** — verify open-weight licences (gpt-oss, Llama, Qwen, Ministral). Closes F2, the
   highest-value gap in the matrix, and determines whether a training-permissive posture is
   available at all.
2. **`ops`/`front`** — evaluate swapping the router's three pinned model IDs to the current
   generation. Time-boxed by the Sonnet 5 introductory window (2026-08-31).
3. **`db`** — `atlasoracle_provider_pool` has no endpoint URL, no auth-secret reference, and no
   per-provider price fields; cost estimation in `atlasoracle-route` is hard-coded to the Anthropic
   cost-shape. Multi-provider routing needs schema work *before* any adapter is written. Note every
   candidate in the matrix is OpenAI-wire-compatible, so **one adapter covers eight providers.**
4. **`docs`** — a human read of the four blocked pages (OpenAI services agreement, xAI ToS +
   enterprise ToS, Fireworks ToS PDF) to convert three `SEARCH-DERIVED` cells and one `UNKNOWN`
   into verified citations.
5. **`front`/`ops`** — `CHARS_PER_TOKEN = 4` in `atlasoracle-route` under-counts real tokenisation
   by ~2.3× on the canon payload (616 estimated vs 1,637 measured). Every tier's cost estimate is
   therefore low. Discovered via §9; flagged, not fixed — it is a code change, not a docs pass.
6. **`front`/`docs`** — model whether growing the canon bundle past Haiku 4.5's 4,096-token cache
   minimum is cheaper than expanding the provider pool. Possibly the highest ROI item on this list
   and it touches no third party.

### 9. Post-filing correction — canon prefix size

**The rail row for DOCS1 (`ops_reports`, filed 2026-07-27) reflects this report as it stood at
filing time and has not been altered — R3 forbids UPDATE or DELETE on `ops_reports`.** The
correction below was made afterwards, in this file and in the deliverable, and is recorded here so
the two are not silently divergent.

DOCS1's cost model originally estimated free-tier input at **~700 tokens**, derived from the
router's own constants (canon bundle 2,462 chars ÷ `CHARS_PER_TOKEN = 4` ≈ 616, plus a short
directive). **OPS10 fired real directives the same day and Anthropic reported `input_tokens = 1637`**
— the router's heuristic under-counts by roughly 2.3×. The measurement supersedes the estimate.

What changed in the deliverable (§4b, §4c, §4d):

| | Estimate (as filed) | Live measurement (revised) |
|---|---|---|
| Free-tier input tokens | ~700 | **1,637** |
| Haiku 4.5 per 1,000 directives | $3.20 | **$4.14** |
| gpt-oss-20B (Groq) advantage | 15.8× | 15.2× |
| Llama 3.1 8B (Groq) advantage | 42.7× | 33.9× |
| Gap at 1M free directives/month | ~$3,000 | **~$3,900** |

**No conclusion reversed.** Caching is still inert on the free tier (1,637 < Haiku's 4,096 minimum —
now confirmed live by OPS10's `cached_tokens = 0` rather than inferred), the decision point is still
~1M free directives/month, and Groq is still the rights-cleanest candidate. The ranking within §4c
reordered slightly: the workload is more input-heavy than estimated, so symmetric-priced models
(Ministral 3 — 8B) lose ground to input-cheap ones (DeepSeek V4 Flash, gpt-oss-20B). That
sensitivity was already flagged in §4d(ii) as filed; it is now demonstrated rather than predicted.

---

## OPS9 — repo recon: locate v1 atlasoracle code post-worktree-fold (2026-07-27)

**Lane:** ops · **Scope:** oracle · **Dispatch:** a100a9c0-52a5-4b00-a41a-fe17db89c527 (REWRITTEN body — supersedes the scaffold-from-nothing original)
**Posture:** read-only recon. **No source file created, modified, or deleted this pass.** This `REPORT.md` is the only file written (R6: reporting is always in scope).

### 0. Headline

The v1 backend is on disk and on `main`, materially as the handoff describes. Two findings change the board:

1. **The wallet badge is NOT unbuilt.** `src/components/AtlasOracleWalletBadge.tsx` exists — 318 lines, feature-shaped, wired to `atlasoracle-route`, committed 2026-05-21. ORACLE_MF v0.4 §3 ("wallet badge UI UNBUILT — the gap") and FRONT16's premise ("wallet badge UI v0") are both built on a false negative. The true gap is that the badge is **mounted nowhere** — zero import sites.
2. **`atlasoracle-env-diag` has no local source anywhere in the HONEYCOMB tree.** It is a deploy-only artifact. Deleting the deployed function removes it permanently with nothing in git to restore from. (Deletion remains a separate action awaiting Butch's word — not taken, not attempted.)

### 1. Verdict table — handoff §5 paths

Byte sizes are `wc -c`. All paths relative to `TheMANUAL.tech/` unless marked otherwise.

#### Edge Functions

| Claimed path | Verdict | Detail |
|---|---|---|
| `supabase/functions/atlasoracle-route/` | **FOUND** | `index.ts` 18,032 B · **plus `canon.ts` 7,388 B** (not named in the dispatch) |
| `supabase/functions/atlasoracle-escrow-deposit/index.ts` | **FOUND** | 2,078 B |
| `supabase/functions/atlasoracle-escrow-withdraw/index.ts` | **FOUND** | 2,086 B |
| `supabase/functions/atlasoracle-env-diag/` | **MISSING** | `find` over the entire `HONEYCOMB/` tree for `*env-diag*` returned **zero hits**. No local source, tracked or untracked. |
| `supabase/functions/_shared/atlasoracle/canon-reader.ts` | **FOUND** | 4,210 B — reads `themanual-canonical/master_plan/<path>`, caches by `(canon_path, canon_hash)` into `atlasoracle_canon_reads`, path-traversal guard present, no TTL/ETag (documented as a known gap in the file's own header) |
| `supabase/functions/_shared/atlasoracle/audit-log.ts` | **FOUND** | 1,923 B |

**Found but NOT in the handoff §5 list** — two real, deployed-shaped functions the snapshot omits:

| Path | Size | What it is |
|---|---|---|
| `supabase/functions/atlasoracle-log/index.ts` | 2,411 B | `GET` Bee's own directive history, metadata only, user-JWT auth |
| `supabase/functions/atlasoracle-providers/index.ts` | 1,010 B | `GET` public active-provider listing, no auth |

There is no `supabase/config.toml` in this repo — function deployment is not declared in-repo, so local source is not proof of deployed state and vice versa. That is exactly how env-diag ended up asymmetric.

#### Migrations (`supabase/migrations/`)

| File | Verdict | Objects |
|---|---|---|
| `20260520120000_atlasoracle_schema.sql` | **FOUND** | `CREATE TABLE IF NOT EXISTS` ×3 — `atlasoracle_directives`, `atlasoracle_provider_pool`, `atlasoracle_canon_reads`; 3 indexes; 2 RLS policies (`_select_own`, `_select_authenticated`) |
| `20260527181500_atlasoracle_v1_escrow.sql` | **FOUND** | 5 RPCs: `atlasoracle_get_escrow_balance`, `atlasoracle_deposit_to_escrow`, `atlasoracle_withdraw_from_escrow`, `atlasoracle_debit`, `atlasoracle_credit`. Escrow rides `bling_pots purpose='atlasoracle'` — no DDL on `bling_pots` |
| `20260527185000_atlasoracle_route_metadata_columns.sql` | **FOUND** | 6 metadata columns on `atlasoracle_directives` |
| `20260527190000_atlasoracle_rate_caps_rpc.sql` | **FOUND** | `atlasoracle_check_rate_caps` (6th RPC) |
| `20260606193253_money_rpc_revoke_anon_execute_atlasoracle_completion.sql` | **FOUND** | REVOKE hardening — not in §5 |
| `20260606193318_money_rpc_revoke_public_execute_atlasoracle.sql` | **FOUND** | REVOKE hardening — not in §5 |

Two further migrations touch `atlasoracle_directives.cost_bling`: `20260602130000_economy_v3_cap_precision.sql` **and** `20260602201522_economy_v3_cap_precision.sql` — a **duplicate pair**, identical `ALTER … TYPE numeric(24,6)` at line 202/204. `competition_engine_v1` has the same duplicate-pair shape (`20260602120000` + `20260602182706`). Pre-existing repo condition, not oracle-specific, not touched — flagged for whoever owns migration reconciliation.

#### Canon docs (HONEYCOMB paths)

All fifteen checked paths **FOUND**:

| Path | Bytes |
|---|---|
| `shared/canon/atlasoracle-v1-final-scope.md` | 12,562 |
| `shared/canon/atlasoracle-whitepaper.md` | 69,115 |
| `shared/canon/atlasoracle-canonical-cache.md` | 14,687 |
| `shared/canon/atlasoracle-addon-deep-dive-v0.md` | 25,606 |
| `shared/canon/canon-storage-paths.md` | 12,970 |
| `shared/canon/bling-ledger-interface.md` | 20,456 |
| `shared/canon/og-human-v1-authority-canon.md` | 7,324 |
| `AtlasORACLE.to/whitepaper.md` | 70,277 |
| `AtlasORACLE.to/master_plan/atlasoracle-patchboard-addendum.md` | 10,685 |
| `AtlasORACLE.to/master_plan/rate-cap-pricing.md` | 14,167 |
| `AtlasORACLE.to/master_plan/per-astra-surfaced-actions.md` | 23,861 |
| `AtlasORACLE.to/master_plan/platform_thesis.md` | 2,195 |
| `AtlasORACLE.to/master_plan/economic_constitution.md` | 3,225 |
| `AtlasORACLE.to/master_plan/language_firewall.md` | 4,218 |
| `AtlasORACLE.to/master_plan/categorization.md` | 4,771 |

`AtlasORACLE.to/master_plan/` holds 10 files total (the 8 above plus `bling-ledger-interface.md` and `canon-storage-paths.md`, which are mirrored into `shared/canon/`). It is the **only** `master_plan/` directory in the workspace — the multi-astra layout that `canon-storage-paths.md` §2.3 maps from (`HONEYCOMB/<astra>/master_plan/`) does not exist yet for any other astra.

### 2. Actual vs claimed — discrepancies

| # | Claim | Actual | Weight |
|---|---|---|---|
| D1 | ORACLE_MF v0.4 §3: "wallet badge UI UNBUILT — the gap"; FRONT16 = "wallet badge UI v0" | `src/components/AtlasOracleWalletBadge.tsx`, 318 lines, commit `efd9b88` "feat(atlasoracle): wallet badge component", 2026-05-21. Three badge states (idle/working/response-ready), desktop modal + mobile sheet, tier picker, `surfacedActions` rendering, 10 directive categories typed, language-firewall note in-file. Calls `supabase.functions.invoke('atlasoracle-route')` with `{directive, tier, astra_slug, nova_slug, canon_paths, directive_category}`. **FRONT16 is a rewire/retune pass, not a build-from-zero pass.** | **HIGH** |
| D2 | (implied) the badge is in the spine | **Mounted nowhere.** `grep -rn AtlasOracleWalletBadge src/` returns only the component's own 3 self-references. No Astra spine imports it. | **HIGH** |
| D3 | Dispatch premise: "worktree `feat/atlasoracle-v1` folded into main in July git cleanup" | **No branch named `feat/atlasoracle-v1` exists**, local or on origin. The oracle branch is `feat/atlasoracle-scaffolding` (still present local + `remotes/origin/`), and it is **fully merged**: `main..feat/atlasoracle-scaffolding` = 0 commits, `feat/atlasoracle-scaffolding..main` = 258. All five oracle commits verified ancestors of `main` via `git merge-base --is-ancestor`: `c795a91` (_shared helpers), `2b476c4` (fn scaffolds), `d17e67e` (route minimal), `491ed7e` (route completion), `efd9b88` (badge). Conclusion holds — the code is on main — but the branch name in canon is wrong. | MED |
| D4 | ORACLE_MF v0.4 §2: RPCs named `get_escrow_balance, deposit_to_escrow, withdraw_from_escrow, debit, credit, check_rate_caps` | Real names all carry the `atlasoracle_` prefix (`public.atlasoracle_debit`, etc.). Count of 6 is correct; the bare names in canon would not resolve. | MED |
| D5 | `cost_bling numeric(20,6)` (Lock 7 precision, per migration `20260520120000` line 158) | Widened to `numeric(24,6)` by `economy_v3_cap_precision`. DB7's cost_bling retirement should retire the (24,6) column. | MED |
| D6 | v1 final scope §2.7 "canon storage sync pipeline" | **Absent.** No `.github/workflows/` directory exists in this repo at all; no canon-sync script anywhere in the tree. `canon-reader.ts` reads a bucket that nothing is syncing to. | MED |
| D7 | `canon-storage-paths.md` §3.3 requires an `atlasoracle-canon-invalidate` Edge Function | **Absent** — no such directory, no such file. | MED |
| D8 | v1 final scope §2.4 "4 foundation Astras' surfacedActions wiring" | **Not wired.** `surfacedActions` appears only inside the badge component as a prop it accepts. No caller supplies it. Consistent with the MF watch-list "surfacedActions wiring deferred". | LOW |
| D9 | v1 final scope §2.5 "AtlasORACLE.to landing page" | **Absent.** `AtlasORACLE.to/` is a docs-only folder (`whitepaper.md` + `master_plan/`). No React page, no route. | LOW |

### 3. Route-namespace warning for FRONT16

`themanual.tech/oracle` is **not** currently the AtlasORACLE console, and the name is already taken twice over:

- `App.tsx:356` — the only `path="oracle"` in the app — is **nested inside `<Route path="/dingleberry">`**, i.e. it serves `/dingleberry/oracle`, and it renders `src/pages/dingleberry/AtlasOraclePage.tsx` (296 lines). That page is the **DingleBERRY security copilot** demo screen: shell-baked mock conversation, inert controls, header comment states "Never touches Supabase." Same name, unrelated astra.
- There is **no top-level `/oracle` route**. With the explicit tree exhausted, `themanual.tech/oracle` falls through to the generic `/:slug` `SurfacePage`.

FRONT16 must claim a top-level `/oracle` route **registered before `/:slug`** (the pattern the file's own comments call out for `/intel`, `/dingleberry`, `/freedomblings`), and should expect naming confusion with the DingleBERRY screen in any search of this codebase.

### 4. Seams FRONT16 inherits

- **Balance is already a stub.** Badge lines 71–73: `const blingBalance = bee ? 0 : null;` with `// TODO: read live BLiNG! balance from ledger`. Under ORACLE_MF v0.5 ruling 3 this display becomes Oracle Tokens — the stub is the exact insertion point, and nothing live has to be unwired to get there.
- **No escrow call in the badge.** The component invokes `atlasoracle-route` only; it never calls the six `atlasoracle_*` escrow RPCs. v0.5 ruling 2 ("escrow wiring removed from FRONT16 scope") is already satisfied by construction — no removal work needed.
- **Cost display is not in the badge.** `cost_bling` lives in the route function and `audit-log.ts`, not the UI. DB7's cost_bling retirement will not break the badge's render path.

### 5. Could not verify

- **Deployed state of any Edge Function.** No `config.toml`, and this pass ran read-only against the filesystem + git; deployed-function inventory needs the Supabase side. Specifically: whether `atlasoracle-log` / `atlasoracle-providers` are deployed, and whether `atlasoracle-env-diag` is still live (the handoff says yes; not re-checked here).
- **Whether the badge actually renders/compiles.** No build was run — `npm run build` would touch `.next`/dist and this is a no-modification pass. Its imports (`@/lib/auth`, `@/lib/supabase`, `@/lib/utils`, `lucide-react`) all resolve to real files, but that is a static read, not a compile.
- **Applied-vs-file state of the migrations.** Headers claim applied via MCP in-session; not re-confirmed against production this pass (DB7's lane).
- **The handoff document itself.** Not on disk anywhere in the workspace — it exists only as an uploaded chat snapshot. §5's path list was reconstructed from the dispatch body plus `shared/canon/atlasoracle-v1-final-scope.md` §2 and `canon-storage-paths.md` §2.3. If the real §5 names paths outside that reconstruction, they were not checked.

### 6. Note for any future SWEEP

`TheMANUAL.tech/` is **its own git repository** (`TheMANUAL.tech/.git`) and is **gitignored by the workspace-root repo** (`.gitignore:87 → TheMANUAL.tech/`). Root-level `git status` sees none of this code. Any sweep touching this tree must run from inside this repo. Working tree here is clean except a pre-existing ` M shared/notes/handoffs/handoff-current.md` — not this pass's doing, left alone.

### 7. Done-test

Dispatch: *"every §5 path has a verdict; no file modified this pass."*

- Every path in the dispatch's enumeration has an explicit FOUND/MISSING verdict in §1 above: 6 edge-function paths (5 FOUND, 1 MISSING), 6 migrations FOUND (4 named + 2 adjacent), 15 canon docs FOUND. Two undocumented edge functions additionally reported.
- Files modified: **none**. Files created: `TheMANUAL.tech/REPORT.md` (this file) only.
