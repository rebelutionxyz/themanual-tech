# AtlasORACLE — Creative-Media Provider Matrix

**Pass:** DOCS4 · **Date:** 2026-07-27 · **Scope:** oracle
**Companion to:** `atlasoracle-provider-expansion-matrix-2026-07-27.md` (text/LLM providers). Same discipline, different lane. Where the two disagree on a shared provider (xAI, Google), the text matrix holds the ToS reading and this one holds the media pricing.

---

## 0. Reading rules

Same as the text matrix, restated so this file stands alone:

- **Every cell is (a) cited to a first-party URL fetched 2026-07-27, (b) marked `SEARCH-DERIVED` with the blocker named, or (c) `UNKNOWN`.** Zero figures come from model memory.
- `SEARCH-DERIVED` means the first-party page was unreachable (403/429/446) but the language was returned consistently by search against the first-party domain. **Re-read by a human before relying on it.**
- `VERIFIED` + `source: human-read` is reserved for full first-party texts a human has read. None in this pass — this is a fetch-and-search pass.
- Prices are USD, exclusive of tax, at the rates published on the fetch date.

**One asymmetry worth stating up front:** media pricing is per *output unit* (per second of video, per image), not per token. A minute of video is not comparable to a million tokens, and any ORACLE cost model that tries to express both in one unit will mislead. This matrix keeps them separate.

---

## 1. Market signal — why this pass exists

Recorded from Butch, 2026-07-27, as market input, not as a product commitment:

> A working creator — Butch's sister, **a future separate-rail user who is NOT onboarded and is explicitly on hold** — pays **~$120/month across ~10 creative AI sites**. She named the pain as **file management scattered per-site**. The ask she articulated: *one place to manage files, with the right AI per project.*

Two things follow, and it is worth keeping them apart:

1. **The pain she named is not model quality — it is asset management.** Every tool in her stack generates fine. What none of them do is hold her project's files together across tools. That is a storage-and-organization problem wearing a model-routing costume.
2. **$120/month across ~10 sites is ~$12/site** — subscription-tier money, not API money. The consolidation case has to beat *ten cheap subscriptions*, which is a harder bar than beating one expensive one. Real API pricing (§3) suggests it can, for her volume, but only because most of her spend is on seats she is not saturating.

**Her stack, as named:** Runway (+ Aleph), Kling, Veo, Seedance, Pika ("Pica", plus "pica formance"), "Magik", Gemini, Grok.

---

## 2. Identification — the two ambiguous names

The dispatch said identify, do not guess. One resolved, one did not.

### 2.1 "Pica formance" → **Pikaformances** — RESOLVED

Pika's **audio-driven performance / lip-sync model**, shipped 2026 alongside Pika's social app. It takes an audio track (recorded voice or synthesized) and drives a character's performance to match. So "Pica" and "pica formance" are **one vendor, two products**: Pika (pika.art) and its Pikaformances feature.
`SEARCH-DERIVED` — consistent across independent 2026 reviews; Pika's own feature page not separately fetched.

### 2.2 "Magik" → **NOT RESOLVED. Two candidates, both real.**

I am not guessing this one. Both candidates exist, both are plausible for a creator with this stack, and they are different products with different implications:

| Candidate | What it is | Fit signal | Against |
|---|---|---|---|
| **Magic Hour** (`magichour.ai`) | AI video platform — image-to-video, face swap, lip sync. Free 400 credits; Creator $10/mo annual; Pro $49; Business $249. **Has official API + Python and JS/TS SDKs.** | Video-first, so it is a peer to the rest of her stack. $10–49/mo fits the ~$12/site average. Phonetically closest to "Magik". | — |
| **Magnific** (`magnific.com`, formerly Freepik) | AI creative platform — image/video generation, voiceover, **upscaling to 10K**, node-based canvas called Spaces, 250M+ licensed assets. | An all-in-one with project organization — which is *exactly the pain she named*. If she uses this, part of her ask is already partly solved and we should know how. | Image/upscale heritage, not video-native. Name is a longer stretch. |

**Question for Butch, one line:** *does she upscale images, or does she face-swap / lip-sync video?* Upscaling → Magnific. Face swap or lip sync → Magic Hour. Both cells stay `UNKNOWN` until answered; nothing downstream should assume either.

`SEARCH-DERIVED` both — no first-party ToS or API text fetched for either, pending identification.

---

## 3. The matrix

### 3.1 Runway — **the finding that matters most**

| Dimension | Finding |
|---|---|
| **(a) Public API + auth** | Yes. Developer platform at `dev.runwayml.com`, API-key auth, **async task submission with polling**. |
| **(b) Pricing per output unit** | **Credits at $0.01 each.** Video **5 credits/sec (Gen-4 Turbo, Act-Two) → $0.05/sec** at the low end, up to **150 credits/sec (Seedance2 4K) → $1.50/sec**. Images 1–41 credits ($0.01–$0.41); Gen-4 Image Turbo 2 credits ($0.02); Gemini Image 3 Pro up to 40 credits ($0.40). Audio 0.25 credits/sec–2 credits/request. Real-time avatars: 2 credits upfront then 2 credits/6 sec. Source: <https://docs.dev.runwayml.com/guides/pricing/>, fetched 2026-07-27. |
| **(c) Async + delivery** | Task-based async. Output delivered as hosted asset URLs. |
| **(d) ToS — training** | **TRAINS ON INPUTS *AND* OUTPUTS. NO OPT-OUT.** **§4.4:** *"You acknowledge that Inputs and Outputs may be used by the Company to train and improve its AI models, algorithms and related technology, products and services,"* under a *"non-exclusive, irrevocable, perpetual, worldwide, royalty-free, fully paid, transferable, sublicensable"* licence. Enterprise Services Terms are separate and may carve this out. **First-party**, <https://runway.com/terms-of-use>, fetched 2026-07-27. |
| **(d) ToS — ownership / commercial** | **§4.4:** Runway *"does not claim ownership of any of your Inputs or Outputs"* and *"does not restrict your commercial use of your Outputs."* The first-party text shows **no tier differentiation** on commercial rights; secondary sources claim free-tier is non-commercial — `SEARCH-DERIVED`, and the first-party text does not support it. |
| **(e) Aggregator coverage** | **None found.** Runway is direct-only — it did not appear in any aggregator catalogue checked. Notably, Runway is itself becoming an aggregator: its price list bills **Seedance2** and **Gemini Image 3 Pro**. |

> ### ⚠ FINDING M1 — Runway is inadmissible under the standing rule, and it is her main tool.
> The text matrix's **F3** recommends: *no Bee directive text to any provider that trains by default, regardless of price.* Runway's §4.4 is exactly that, on the **standard** tier, with **no opt-out** — and the licence is perpetual and irrevocable, so it does not end when the subscription does.
> The irony is precise: DOCS3 just cleared **xAI** of the same charge (its API does not train), and here is Runway doing openly what xAI was wrongly accused of. **If the standing rule binds media as the dispatch says it does, an ORACLE media lane cannot route Bee content to Runway's standard API.** Enterprise terms are the only possible path and were not read this pass.

> ### ⚠ FINDING M2 — Gen-4 Aleph sunsets 2026-07-30. That is three days from this document.
> Runway's pricing page lists **Gen-4 Aleph and Gen-3 Alpha Turbo as deprecated, sunset 2026-07-30**. Aleph was named specifically in her stack. She is paying for a model that stops existing this week and may not know. **This is the one item in this document with a deadline, and it is worth telling her regardless of what HONEYCOMB ever builds.**
> Source: <https://docs.dev.runwayml.com/guides/pricing/>, fetched 2026-07-27.

### 3.2 Google — Veo (video) and Gemini (image)

| Dimension | Finding |
|---|---|
| **(a) API + auth** | Yes — Gemini API, API-key auth. Same platform for Veo and Gemini image. |
| **(b) Pricing — Veo 3.1** | Standard **$0.40/sec** (720p/1080p), **$0.60/sec** (4K). Fast **$0.10/sec** (720p), **$0.12/sec** (1080p), **$0.30/sec** (4K). **Lite $0.05/sec** (720p), **$0.08/sec** (1080p). |
| **(b) Pricing — Veo 2 / Veo 3** | **Both deprecated, shutting down 2026-06-30** — *that date has passed.* Veo 3 was $0.40/sec standard; Veo 2 $0.35/sec. **If her "Veo" is Veo 2 or 3, it is already gone.** |
| **(b) Pricing — image** | Gemini 3.1 Flash Image ("Nano Banana 2"): $0.50 in / $3 text out / **$60 per 1M image tokens** (batch halves it). Gemini 2.5 Flash Image ("Nano Banana"): **$0.039/image** (batch $0.0195). Imagen 4 deprecated, shutdown 2026-08-17: Fast $0.02, Standard $0.04, Ultra $0.06 per image. |
| | All Google figures first-party: <https://ai.google.dev/gemini-api/docs/pricing>, fetched 2026-07-27. |
| **(c) Async + delivery** | Long-running operation + poll for Veo; synchronous for images. |
| **(d) ToS — training** | Per the text matrix: **paid API does not train; the FREE tier trains and permits human review.** Media inherits this. Free-tier Veo/Gemini is **inadmissible** under the standing rule; paid is fine. |
| **(e) Aggregator coverage** | **Veo 3.1 on fal.ai** — `SEARCH-DERIVED`. |

### 3.3 Kling (Kuaishou)

| Dimension | Finding |
|---|---|
| **(a) API + auth** | Yes — official developer API. **First-party doc portal returned HTTP 446 to the fetcher**, so auth mechanics (API key vs JWT) are `UNKNOWN`. Base portal: `app.klingai.com/global/dev`. |
| **(b) Pricing** | `SEARCH-DERIVED`. Official *Kling VIDEO 3.0 Model User Guide* (published 2026-02-06) lists per-second credit costs for 720p/1080p. Resale routes quote **Kling 3.0 / O3 from $0.075/sec, O1 $0.1111/sec, Motion Control $0.1134/sec** — **those are reseller rates, not Kling's own**, and must not be quoted as first-party. |
| **(c) Async + delivery** | Submit-poll-download. `SEARCH-DERIVED`. |
| **(d) ToS — training** | **Trains on Input and Output — with a REVOCABLE OPT-OUT by email to `support@kling.ai`.** Also grants Kling a worldwide, non-exclusive, royalty-free, sublicensable licence to host/reproduce/modify/display, and rights to license content to third parties for promotion and research. `SEARCH-DERIVED` — first-party page to read is <https://kling.ai/docs/user-policy>. |
| **(d) ToS — ownership / commercial** | **Contradictory across sources** and therefore `UNKNOWN`: one line says paid users retain copyright and may use commercially without watermark; another says outputs may not be used commercially without written permission, and that the Kling brand must be shown on shared video absent special permission. **Do not act on either until the first-party policy is read.** Also: outputs may not be used to train a competing AI. |
| **(e) Aggregator coverage** | **Kling 3.0 on fal.ai** — `SEARCH-DERIVED`. |

### 3.4 Seedance (ByteDance)

| Dimension | Finding |
|---|---|
| **(a) API + auth** | Yes — via **BytePlus ModelArk** (international) or **Volcengine** (China). |
| **(b) Pricing** | `SEARCH-DERIVED`, and **the sources disagree by ~3×**: token-priced at $3.5/M (text-to-video) and $2.1/M (video-to-video), giving ~**$0.073/sec** for a 5-sec 720p clip (~$0.38); a Pro-tier 5-sec clip quoted at $0.15; a third source quotes **$0.247/sec** standard and $0.2223/sec fast. The spread is large enough that **no Seedance figure should be used for budgeting** until first-party rates are read. One structural note worth keeping: **BytePlus bills per minute, not per second, which makes short clips disproportionately expensive.** |
| **(c) Async + delivery** | Submit-poll-download, **30–120 sec** per generation depending on resolution. `SEARCH-DERIVED`. |
| **(d) ToS — training / ownership** | **`UNKNOWN`.** Not read this pass. Given the parent company, this is a high-priority read, not a formality. |
| **(e) Aggregator coverage** | **Seedance 2.0 on fal.ai** — `SEARCH-DERIVED`. Also billed **inside Runway's own price list** ("Seedance2 4K", 150 credits/sec = $1.50/sec) — first-party Runway. |

> ### ⚠ FINDING M3 — Seedance video is reported **not available in the United States**.
> *"BytePlus Video Generation Model Services are not available in the United States."* `SEARCH-DERIVED`, and it needs a first-party check — but if it holds, a US creator reaching Seedance is doing so **through an aggregator or a reseller**, not directly, and an ORACLE media lane serving US Bees would have to do the same. It also means the direct-vs-aggregator question is **already settled against direct** for this provider.

### 3.5 Pika

| Dimension | Finding |
|---|---|
| **(a) API + auth** | **No direct public API.** `pika.art/api` says, first-party: *"Get the power of Pika's video models from the comfort of your own product on Fal AI"* and links out to fal.ai. Fetched 2026-07-27. A legacy Pika 1.0/1.5 developer program is referenced by secondary sources; the modern route is fal. |
| **(b) Pricing** | **`UNKNOWN` at first-party.** Pika does not publish API pricing; the price is fal's price for the Pika models. |
| **(c) Async + delivery** | fal's job model, not Pika's. |
| **(d) ToS — training / ownership** | **`UNKNOWN`.** Not read. Note the layering problem: routing via fal means **two** sets of terms apply — fal's and Pika's — and neither was read this pass. |
| **(e) Aggregator coverage** | **fal.ai, exclusively** — and by the vendor's own direction. Models exposed: Pika 2.2 text-to-video, image-to-video, Pikascenes, Pikaframes. **Pikaformances API availability specifically: `UNKNOWN`.** |

### 3.6 Grok / xAI — Grok Imagine

| Dimension | Finding |
|---|---|
| **(a) API + auth** | Yes — xAI API, bearer key, OpenAI-compatible surface. |
| **(b) Pricing** | **`grok-imagine-image` $0.02/image · `grok-imagine-image-quality` $0.05/image · `grok-imagine-video` $0.050/sec · `grok-imagine-video-1.5` $0.080/sec.** First-party: <https://docs.x.ai/docs/models>, fetched 2026-07-27. |
| **(c) Async + delivery** | `UNKNOWN` — not documented in the page fetched. |
| **(d) ToS — training** | **Enterprise/API ToS §3.3: xAI shall NOT use User Content to train.** **ADMISSIBLE.** Carried from `ORACLE_TOS_VERIFIED v0.1` (human-read) via DOCS3 — this is the correction that cleared xAI. Non-ZDR default retains content up to 30 days; **ZDR is the preferred posture.** |
| **(d) ToS — our training on outputs** | **§3.1 flat prohibition, no carve-out.** Grok Imagine output is not training fuel, ever. |
| **(e) Aggregator coverage** | None needed — direct API, and the cheapest video per second in this document. |

> **Grok Imagine at $0.05/sec is tied with Veo 3.1 Lite for the cheapest cited video, and unlike Runway it does not train on what you give it.** On rights-per-dollar it is the strongest media provider in this matrix. Quality was not assessed and is not this document's job.

---

## 4. Aggregator coverage — the one-adapter-vs-ten question

**This is the headline finding the dispatch asked for.**

| Tool | Direct API | On fal.ai | On Replicate | Verdict |
|---|---|---|---|---|
| Runway (+Aleph) | **Yes** | not found | not found | **Direct only** |
| Kling | Yes | **Yes** (Kling 3.0) `SEARCH-DERIVED` | not found | Either |
| Veo | Yes (Gemini API) | **Yes** (Veo 3.1) `SEARCH-DERIVED` | not found | Either |
| Seedance | Yes (BytePlus/Volcengine) — **US availability doubtful (M3)** | **Yes** (Seedance 2.0) `SEARCH-DERIVED` | not found | **Aggregator likely required** |
| Pika / Pikaformances | **No — vendor routes to fal** | **Yes** (2.2 T2V, I2V, Pikascenes, Pikaframes) — first-party direction | not found | **fal only** |
| Gemini image | Yes | — | — | Direct |
| Grok Imagine | Yes | — | — | Direct |
| "Magik" (unidentified) | Magic Hour: yes, + SDKs. Magnific: `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | pending §2.2 |

**fal.ai** — one API key, one integration pattern, **600+ models** including Kling 3.0, Veo 3.1, Sora 2, Wan 2.6, Seedance 2.0; quoted range **$0.05–$0.40/sec**. `SEARCH-DERIVED` — **fal.ai returned HTTP 429 to the fetcher on two attempts**, so no fal figure here is first-party. That is the single most important gap in this document.

**Replicate** — first-party pricing page fetched: images billed **per output** (FLUX 1.1 Pro $0.04, FLUX Dev $0.025, Ideogram v3 $0.09, Recraft V3 $0.04); video **per second of output** (WAN 2.1 480p $0.09/sec, 720p $0.25/sec); most models billed by **hardware-time**, some by input/output. **None of the commercial video models in her stack appear on Replicate's pricing page.** Replicate is an open-weights host; the commercial video models are elsewhere. Source: <https://replicate.com/pricing>, fetched 2026-07-27.

> ### ⚠ FINDING M4 — one adapter covers most of the stack, but not the tool she uses most.
> **fal.ai covers Kling + Veo + Seedance + Pika in one integration** — four of her ~eight named tools, including the one with no API of its own and the one that may be unreachable from the US. Against that: **Runway is direct-only**, and Grok/Gemini are trivially direct anyway.
> So the honest answer to one-vs-ten is **three, not one and not ten**: `fal` + `Runway` + `Google/xAI direct`. And the Runway adapter is the one the standing rule may forbid us from ever using for Bee content (M1) — which, if it holds, collapses the build to **fal + direct**, i.e. **two**.
> **Caveat that undercuts this whole section:** fal's coverage claims are `SEARCH-DERIVED` because fal rate-limited the fetcher. Before anything is built on it, someone must read fal's model catalogue and pricing directly.

---

## 5. Architecture note — **LEAD INPUT, NOT A DECISION**

Explicitly marked per the dispatch. Nothing here is on the board, nothing is ratified, and §1's hold on the user stands.

A media lane is **not the text router with different models in the map.** Four structural differences, in the order they would bite:

1. **Jobs are long and asynchronous.** Text routing is a request/response inside one edge-function invocation. Media is submit → poll 30–120 s → download. The current `atlasoracle_directives` row is written and finalized inside a single invocation; that shape cannot hold a job that outlives the request. A media lane needs a **job table with its own lifecycle** (`queued / running / succeeded / failed / expired`), a **provider job id**, and either polling or webhooks. This is the largest single piece of new machinery.

2. **Outputs are large binary assets, and sovereignty applies to them.** The text router's sovereignty rule is enforced structurally by *having no content columns* — it retains nothing because there is nowhere to put it. **That trick does not transfer.** A creator's whole ask is that files be *kept*. So the media lane must do the opposite of the text lane: store the asset, and make the storage **user-owned** rather than platform-retained. Provider-hosted output URLs also **expire**, so "we'll just keep the link" is not a design. This deserves its own canon decision before any code — it is the first place where ORACLE's sovereignty promise and a creator's file-management need actually pull against each other.

3. **Per-project organization is the product, not a feature.** §1's pain was not model choice — it was files scattered across ten sites. A media lane whose value proposition is *organization* needs projects/collections as first-class objects from row one, not bolted on later. **Creator Studio already exists in this codebase and already has collections and media quota migrations** — that is very likely where this belongs rather than a new surface. Worth checking before anyone designs a second asset store.

4. **The cost model does not fit the token ledger.** DB8's Oracle Token ledger is being built for text. Media prices per second of video and per image, spanning **$0.02 (Grok image) to $1.50/sec (Seedance2 4K via Runway) — a ~75× range on a single invocation.** A 10-second 4K clip is $15 of provider cost in one call. Whatever the token denomination ends up being, **media needs a pre-authorization / confirm-cost gate with real teeth**, closer to the frontier tier's `confirm_cost` than to free-tier routing. The existing gate triggers above 10 BLiNG! and, per OPS10, was arithmetically unreachable; a media lane cannot inherit that bug.

**The cheapest honest next step is not a build.** It is: read fal's catalogue and pricing first-party (§6), answer the "Magik" question (§2.2), and tell her about Aleph's 2026-07-30 sunset (M2) — which costs nothing and is useful to her whether or not HONEYCOMB ever ships a media lane.

---

## 6. Could-not-verify list

| Item | Status | Blocker |
|---|---|---|
| **fal.ai model catalogue + pricing** | `SEARCH-DERIVED` | **HTTP 429 on `fal.ai/pricing` and `fal.ai/models`, two attempts.** The single highest-value re-fetch in this document — §4's entire headline rests on it. |
| Kling API auth, async mechanics, official rates | `UNKNOWN` | `app.klingai.com/global/dev/...` returned **HTTP 446** |
| Kling commercial-use rights | `UNKNOWN` — **sources contradict** | first-party <https://kling.ai/docs/user-policy> not read |
| Kling training opt-out mechanics | `SEARCH-DERIVED` | same |
| Seedance official pricing | `SEARCH-DERIVED`, **sources disagree ~3×** | BytePlus/Volcengine console pricing not read |
| Seedance ToS — training + ownership | `UNKNOWN` | not attempted — **high priority given the parent company** |
| Seedance US availability | `SEARCH-DERIVED` | needs first-party confirmation (M3) |
| Pika ToS — training + ownership | `UNKNOWN` | not read; **and fal's terms layer on top, also unread** |
| Pikaformances API availability | `UNKNOWN` | not listed among the fal-exposed Pika models found |
| "Magik" product identity | `UNKNOWN` | **two live candidates — needs one line from Butch (§2.2)** |
| Magic Hour / Magnific ToS + API detail | `UNKNOWN` | blocked behind the identification |
| Runway Enterprise Services Terms | `UNKNOWN` | separate document, not fetched — **the only possible path to admissible Runway (M1)** |
| Runway free-tier commercial restriction | `SEARCH-DERIVED`, **contradicted by first-party** | secondary sources claim it; §4.4 shows no tier split |
| Grok Imagine async/job model | `UNKNOWN` | not in the fetched page |
| Video quality comparisons | **out of scope** | this document prices and licenses; it does not review |

---

## 7. Source index

**First-party, fetched 2026-07-27:**
- Runway API pricing — <https://docs.dev.runwayml.com/guides/pricing/>
- Runway Terms of Use §4.4 — <https://runway.com/terms-of-use>
- Google Gemini/Veo pricing — <https://ai.google.dev/gemini-api/docs/pricing>
- xAI models + Grok Imagine pricing — <https://docs.x.ai/docs/models>
- Pika API routing to fal — <https://pika.art/api>
- Replicate pricing — <https://replicate.com/pricing>

**First-party, blocked:** `fal.ai/pricing` + `fal.ai/models` (429) · `app.klingai.com/global/dev/...` (446) · `kling.ai/docs/user-policy` (not attempted after 446)

**Carried from the rail:** `ORACLE_TOS_VERIFIED v0.1` (xAI Enterprise §3.1/§3.3) via DOCS3.

**Search-derived**, named inline at each cell: Kling pricing/ToS, Seedance pricing/availability/async, fal.ai coverage, Pikaformances identification, Magic Hour and Magnific product descriptions.

---

## 8. Done-test

| Requirement | Result |
|---|---|
| Every named tool has an identified product | **PASS with one open** — Runway, Kling, Veo, Seedance, Pika, **Pikaformances (resolved)**, Gemini, Grok all identified. **"Magik" deliberately NOT resolved** — two candidates documented with a one-line disambiguating question, per "do not guess." |
| Cited cells or named blockers | **PASS** — 6 first-party sources; every other cell carries `SEARCH-DERIVED` + blocker or `UNKNOWN` + reason. Zero figures from memory. |
| Aggregator coverage table present | **PASS** — §4, with the honest caveat that fal rate-limited the fetcher |
| Architecture note, marked lead-input | **PASS** — §5, marked, four points, no decision taken |
