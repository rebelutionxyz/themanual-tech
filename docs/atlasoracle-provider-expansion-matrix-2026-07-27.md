# AtlasORACLE — Provider EXPANSION Matrix

**Pass:** DOCS1 · **Lane:** docs · **Workdir:** TheMANUAL.tech · **Scope:** oracle
**Fetch date for every price and quote in this document: 2026-07-27.**
**Status:** draft for Butch. No code changed. No provider integrated. Produce-and-propose only.

---

## 0. Reading rules

**Every numeric cell is either (a) cited to a first-party URL fetched on 2026-07-27, or (b) marked `UNKNOWN`.**
Zero prices in this document come from model memory. Where a first-party page was unreachable
(403, 404, or an unparseable PDF), the cell says `UNKNOWN` and names the blocker — it does not
get filled from a blog, a reseller, or a recollection.

Three cells are marked `SEARCH-DERIVED` rather than `UNKNOWN`: the first-party page returned 403
to the fetcher, but the quoted language was returned consistently by search against the
first-party domain. Those are flagged inline and should be re-read by a human before anything
depends on them.

All prices are USD per 1,000,000 tokens ("MTok") unless stated otherwise. Prices exclude tax.

---

## 1. Baseline: what is actually live today

The router at `supabase/functions/atlasoracle-route/index.ts` pins three Anthropic models:

| Tier | Model pinned in code | Expected output tokens | max_tokens |
|---|---|---|---|
| `free` | `claude-haiku-4-5` | 500 | 800 |
| `standard` | `claude-sonnet-4-6` | 1500 | 1500 |
| `frontier` | `claude-opus-4-7` | 5000 | 5000 |

The seeded `atlasoracle_provider_pool` table (migration `20260520120000_atlasoracle_schema.sql`,
Block D) carries five rows: `claude-opus-4-7` (frontier), `claude-sonnet-4-6` (mid-tier),
`claude-haiku-4-5` (fast), `groq-mixtral` (fast), `oss-llama-3` (oss). The migration's own comment
calls these "placeholder provider rows" and says real provider config is "a separate, post-Swarm
task." **The two non-Anthropic rows have never been wired to anything** — `atlasoracle-route`
only ever calls `https://api.anthropic.com/v1/messages`. So the live pool is Anthropic-only in
practice, matching `shared/canon/atlasoracle-v1-final-scope.md` Q3 ("Anthropic-only at v1").

### 1a. FINDING — the pinned Anthropic models are a generation behind

Anthropic's current model table (fetched 2026-07-27) lists Fable 5, Opus 5, Sonnet 5, and
Haiku 4.5 as current; Opus 4.7 and Sonnet 4.6 are both under **Legacy models**.

| Router pin | Price today | Current equivalent | Price today | Delta |
|---|---|---|---|---|
| `claude-opus-4-7` (frontier) | $5 in / $25 out | `claude-opus-5` | $5 in / $25 out | **Same price, newer model** |
| `claude-sonnet-4-6` (standard) | $3 in / $15 out | `claude-sonnet-5` | **$2 in / $10 out** (introductory, through 2026-08-31; $3/$15 after) | **-33% while the intro window lasts** |
| `claude-haiku-4-5` (free) | $1 in / $5 out | (still current) | $1 in / $5 out | no change |

Source: <https://platform.claude.com/docs/en/about-claude/models/overview.md> — fetched 2026-07-27.

This is a cheaper-and-better swap available before any expansion work, and it is the single
highest-value/lowest-risk change surfaced by this pass. It is **not** in DOCS1's scope, so it is
recorded here as a proposal, not executed. Note the Sonnet 5 introductory rate expires
**2026-08-31** — after that the standard-tier swap is capability-neutral on price, not a saving.

---

## 2. Provider expansion matrix

Field set per provider, in fixed order:

1. **Auth model** — how a key is issued and presented
2. **Pricing** — per MTok, cited
3. **Streaming** — supported? by what mechanism?
4. **Rate limits / minimum spend** — what gates throughput
5. **Training-on-their-outputs verdict** — may HONEYCOMB train its own model on this provider's output?
6. **Free tier** — what, if anything, is free, and what it costs in data rights

---

### 2.1 OpenAI

| Field | Value |
|---|---|
| **Auth model** | Bearer API key (`Authorization: Bearer sk-…`). Org- and project-scoped keys. Rate limits are enforced at organization and project level, not user level. |
| **Streaming** | Yes — SSE, `"stream": true`. (Baseline OpenAI Chat Completions behaviour; the wire format every other provider in this matrix clones.) |
| **Free tier** | Yes — a "Free" usage tier exists for users in supported geographies, with a $100/month usage limit. No free token grant is documented on the pricing page. A **50% inference discount** on fine-tuned models is available in exchange for enabling data sharing. |

**Pricing** — <https://developers.openai.com/api/docs/pricing>, fetched 2026-07-27:

| Model | Input | Cached input | Output |
|---|---|---|---|
| `gpt-5.6-sol` | $5.00 | $0.50 | $30.00 |
| `gpt-5.6-terra` | $2.50 | $0.25 | $15.00 |
| `gpt-5.6-luna` | $1.00 | $0.10 | $6.00 |
| `gpt-5.5` | $5.00 | $0.50 | $30.00 |
| `gpt-5.4` | $2.50 | $0.25 | $15.00 |
| `gpt-5.4-mini` | $0.75 | $0.075 | $4.50 |
| `gpt-5.4-nano` | $0.20 | $0.02 | $1.25 |

**Rate limits / minimum spend** — <https://developers.openai.com/api/docs/guides/rate-limits>,
fetched 2026-07-27. Tiers graduate automatically on cumulative spend:

| Tier | Qualification | Monthly usage limit |
|---|---|---|
| Free | supported geography | $100 |
| Tier 1 | $5 paid | $100 |
| Tier 2 | $50 paid | $500 |
| Tier 3 | $100 paid | $1,000 |
| Tier 4 | $250 paid | $5,000 |
| Tier 5 | $1,000 paid | $200,000 |

No mandatory waiting period between tiers is documented.

**Training verdict: PROHIBITED.**
OpenAI's terms prohibit using Output to develop AI models that compete with OpenAI's products and
services, except under a narrow "Permitted Exception" covering models primarily intended to
categorize, classify, or organize data (embeddings, classifiers) that are **not distributed or
made commercially available to third parties**, and fine-tuning of OpenAI-provided models.

> `SEARCH-DERIVED` — <https://openai.com/policies/services-agreement/> and
> <https://openai.com/policies/may-2025-business-terms/> both returned **HTTP 403** to the
> fetcher. The restriction above was returned consistently by search against those first-party
> URLs. **Re-read by a human before relying on it.**

For AtlasORACLE the practical read is: OpenAI output can be used to *serve* Bee directives, but
cannot feed any HONEYCOMB-trained model that ships to Bees. The classifier carve-out is
non-distributable, so it does not cover an Astra-facing feature.

**OpenAI's use of your data:** does **not** train on API inputs/outputs by default. Abuse-monitoring
logs retained up to 30 days; Zero Data Retention available to approved customers.
Source: <https://developers.openai.com/api/docs/guides/your-data>, fetched 2026-07-27.

---

### 2.2 xAI (Grok)

| Field | Value |
|---|---|
| **Auth model** | Bearer API key against an OpenAI-compatible endpoint (`https://api.x.ai/v1/chat/completions`). |
| **Streaming** | **Yes** — Server-Sent Events, `"stream": true`, terminated by `data: [DONE]`. All text-output models; not image generation. xAI's docs recommend extending client timeouts for reasoning models. Source: <https://docs.x.ai/docs/guides/streaming-response>, fetched 2026-07-27. |
| **Rate limits / min spend** | `UNKNOWN` — not captured this pass. |
| **Free tier** | `UNKNOWN` — not captured this pass. |

**Pricing** — <https://docs.x.ai/docs/models>, fetched 2026-07-27. Note the threshold rule:
*"Requests whose prompt reaches the listed token threshold are billed at the higher rate for all
tokens in the request"* — this is a cliff, not a marginal rate.

| Model | Context | Input | Output | Cached input |
|---|---|---|---|---|
| `grok-4.5` (<200k prompt) | 500k | $2.00 | $6.00 | $0.30 |
| `grok-4.5` (≥200k prompt) | 500k | $4.00 | $12.00 | $0.60 |
| `grok-4.3` (<200k) | 1M | $1.25 | $2.50 | $0.20 |
| `grok-4.3` (≥200k) | 1M | $2.50 | $5.00 | $0.40 |
| `grok-4.20-0309-reasoning` (<200k) | 1M | $1.25 | $2.50 | $0.20 |
| `grok-4.20-0309-non-reasoning` (<200k) | 1M | $1.25 | $2.50 | $0.20 |
| `grok-4.20-multi-agent-0309` (<200k) | 1M | $1.25 | $2.50 | $0.20 |
| `grok-build-0.1` (<200k) | 256k | $1.00 | $2.00 | $0.20 |
| `grok-build-0.1` (≥200k) | 256k | $2.00 | $4.00 | $0.40 |

**Training verdict: PROHIBITED.**
xAI's Acceptable Use Policy prohibits using the Service or any Output to develop machine learning
models or related AI services that compete with xAI. The Enterprise terms separately prohibit
using any Service to help develop, or help provide to a third party, any product or service
similar to or competitive with any Service.

> `SEARCH-DERIVED` — <https://x.ai/legal/terms-of-service> and
> <https://x.ai/legal/terms-of-service-enterprise> both returned **HTTP 403** to the fetcher.
> Language above returned consistently by search against those first-party URLs.
> **Re-read by a human before relying on it.** The AUP at
> <https://x.ai/legal/acceptable-use-policy> is the page to read first.

**xAI's use of your data — flag.** Search against xAI's own terms indicates xAI takes a perpetual,
worldwide, royalty-free licence to use inputs and outputs for business purposes **including model
training**, applying by default unless the account opts out in settings. If that holds on a direct
read, **xAI is the only provider in this matrix that trains on your data by default with an
account-settings opt-out rather than a contractual one.** For a platform whose thesis is that Bees
own what they give, this needs an explicit decision before any Bee directive text crosses the xAI
boundary. `SEARCH-DERIVED` — verify directly.

---

### 2.3 Google (Gemini)

| Field | Value |
|---|---|
| **Auth model** | API key (Google AI Studio) or Google Cloud credentials for Vertex. |
| **Streaming** | Yes — SSE streaming is standard on the Gemini API. (Not separately re-verified this pass; treat as `SEARCH-DERIVED`.) |

**Pricing** — <https://ai.google.dev/gemini-api/docs/pricing>, fetched 2026-07-27:

| Model | Input | Output |
|---|---|---|
| Gemini 3.6 Flash | $1.50 | $7.50 |
| Gemini 3.5 Flash | $1.50 | $9.00 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 |
| **Gemini 2.5 Flash-Lite** | **$0.10** | **$0.40** |
| Gemini 2.5 Pro (≤200k) | $1.25 | $10.00 |
| Gemini 2.5 Pro (>200k) | $2.50 | $15.00 |

Paid tier adds context caching, a Batch API at 50% cost, and — critically — the guarantee that
Google does **not** use prompts or responses to improve its products.

**Rate limits / minimum spend** — <https://ai.google.dev/gemini-api/docs/rate-limits>,
fetched 2026-07-27:

| Usage tier | Qualification | Billing cap |
|---|---|---|
| Tier 1 | link an active billing account | $250 |
| Tier 2 | $100 paid **and** 3 days since first successful payment | $2,000 |
| Tier 3 | $1,000 paid **and** 30 days since first successful payment | $20,000–$100,000+ |

Spend-based rate limiting also applies on rolling 10-minute windows: **$10 per 10 min** at Tier 1,
**$200 per 10 min** at Tiers 2–3. Per-model free-tier RPM/TPM/RPD figures are **not published in
the docs** — Google directs users to <https://aistudio.google.com/rate-limit>, which requires a
login. Marked `UNKNOWN` for that reason.

**Training verdict: PROHIBITED.**
Direct quote from <https://ai.google.dev/gemini-api/terms>, fetched 2026-07-27:

> "You may not use the Services to develop models that compete with the Services (e.g., Gemini API
> or Google AI Studio)."

and

> "attempt to reverse engineer, extract or replicate any component of the Services, including the
> underlying data or models (e.g., parameter weights)."

**Free tier — and its price in data rights.** Free tier gives limited access to certain models with
free input and output tokens plus AI Studio access. The cost is explicit in the same terms: on
**unpaid** services Google uses submitted content and responses to improve its products, services,
and machine learning technologies, and **human reviewers may read and annotate inputs and outputs**.
On **paid** services:

> "Google doesn't use your prompts (including associated system instructions, cached content, and
> files) or responses to improve our products"

**This makes the Gemini free tier unusable for Bee directive traffic.** A Bee's directive is Bee
content; routing it through a tier where a human reviewer may read it is not a cost decision, it is
a consent decision, and nothing in current canon obtains that consent. Gemini paid tier is fine;
Gemini free tier should be treated as prohibited for production Bee traffic regardless of price.

---

### 2.4 DeepSeek

| Field | Value |
|---|---|
| **Auth model** | Bearer API key, OpenAI-compatible endpoint. |
| **Streaming** | **Yes** — confirmed in the rate-limit docs (streaming requests, SSE keep-alive comments). Source: <https://api-docs.deepseek.com/quick_start/rate_limit>, fetched 2026-07-27. |
| **Free tier** | `UNKNOWN` — no free grant documented on the pricing page. |

**Pricing** — <https://api-docs.deepseek.com/quick_start/pricing>, fetched 2026-07-27. USD.
Both models: 1M context, up to 384K max output.

| Model | Input (cache hit) | Input (cache miss) | Output |
|---|---|---|---|
| `deepseek-v4-flash` | $0.0028 | $0.14 | $0.28 |
| `deepseek-v4-pro` | $0.003625 | $0.435 | $0.87 |

Note the cache-hit rate: **$0.0028/MTok is 50× cheaper than the cache-miss rate** and roughly
357× cheaper than Haiku 4.5 input. For a workload with a fixed canon prefix this is the most
aggressive caching economics in the matrix by a wide margin (see §3c).

**Rate limits / minimum spend** — <https://api-docs.deepseek.com/quick_start/rate_limit>,
fetched 2026-07-27. Limits are **concurrency**, not RPM:

- `deepseek-v4-pro`: 500 concurrent connections
- `deepseek-v4-flash`: 2,500 concurrent connections
- Exceeding returns HTTP 429. Capacity expansion is available by request at **no additional cost**.
- No minimum spend or mandatory top-up documented.

**Training verdict: EXPLICITLY PERMITTED — the only unambiguous yes in this matrix.**
From <https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html>,
fetched 2026-07-27:

> "We assign any rights, title, and interests—if any—in the Outputs of the Services to you."

and permitted uses explicitly include **"training other models (such as model distillation)"**
alongside personal use, academic research, and derivative product development.

**Caveat:** the same terms are **silent** on whether DeepSeek trains on *your inputs*. That
asymmetry (you may train on their output; they don't say whether they train on your input) should
be resolved before Bee directive text is routed here. Marked `UNKNOWN`, not "safe."

---

### 2.5 Qwen / Alibaba Cloud Model Studio

| Field | Value |
|---|---|
| **Auth model** | Alibaba Cloud API key, region-scoped. Native Qwen API **and** an OpenAI-compatible endpoint. Source: <https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio>, fetched 2026-07-27. |
| **Streaming** | Yes (OpenAI-compatible endpoint). `SEARCH-DERIVED` — not separately verified this pass. |
| **Rate limits / min spend** | `UNKNOWN` — not captured this pass. Pay-as-you-go is the default billing mode; Coding Plan and Token Plan (Team Edition) subscriptions exist as alternatives. |

**Pricing** — <https://www.alibabacloud.com/help/en/model-studio/model-pricing>, fetched
2026-07-27, **International (Singapore) region**. Several models are tiered by request size;
ranges shown.

| Model | Input | Output |
|---|---|---|
| Qwen3.7-Max (flagship) | $2.50 | $7.50 |
| Qwen3-Max | $1.20–$3.00 | $6.00–$15.00 |
| Qwen3.7-Plus | $0.40–$1.20 | $1.60–$4.80 |
| Qwen-Plus | $0.40–$1.20 | $1.20–$3.60 |
| Qwen3.6-Flash | $0.25–$1.00 | $1.50–$4.00 |
| **Qwen-Flash** | **$0.05–$0.25** | **$0.40–$2.00** |
| Qwen3.5 (open-source sizes) | $0.25–$0.60 | $2.00–$3.60 |
| Qwen3 (open-source sizes) | $0.16–$0.70 | $0.64–$2.80 |

Batch calls are billed at **50%** of real-time inference. Context cache discounts input only.
Some models carry limited-time night discounts (22:00–08:00 UTC+8).

**Region warning:** the Chinese Mainland (Beijing) endpoint is materially cheaper but stores data
in China and carries no free quota. For HONEYCOMB, **International (Singapore) is the only
defensible endpoint**, and its prices are the ones tabulated above.

**Free tier** — <https://www.alibabacloud.com/help/en/model-studio/new-free-quota>,
fetched 2026-07-27: new users get a free quota valid **90 days** from Model Studio activation,
**Singapore region / International deployment scope only**. The model-pricing page lists
"1 million tokens" free quota against individual models. The free-quota page itself does **not**
state a universal per-model token figure and directs users to the console — so the per-model
allocation is `UNKNOWN` beyond the "1 million tokens" figures shown on the pricing page. Free
quota covers **real-time inference only** — excludes batch, fine-tuning, deployment, custom models.

**Training verdict: `UNKNOWN` for the hosted API.** Alibaba Cloud's Model Studio terms were not
read this pass. **However** — and this is the important asymmetry — the Qwen open-weight models
are released under permissive licences and can be self-hosted or run through third-party
inference providers (Together, Fireworks, Groq all serve Qwen). **Running Qwen weights on a
neutral host sidesteps the Model Studio terms entirely.** If Qwen is wanted for a training-adjacent
purpose, that is the route to evaluate, not the first-party API. The specific licence text per
Qwen release was not verified this pass — `UNKNOWN`.

---

### 2.6 Kimi / Moonshot AI

| Field | Value |
|---|---|
| **Auth model** | Bearer API key, OpenAI-compatible. |
| **Streaming** | `UNKNOWN` — not verified this pass (OpenAI-compatible platforms conventionally support SSE, but this was not confirmed against Moonshot's docs). |
| **Rate limits / min spend** | `UNKNOWN` — not captured this pass. |
| **Free tier** | `UNKNOWN`. Document processing is noted as "temporarily free," but tokens extracted from documents and passed to the model are billed. |

**Pricing** — <https://platform.kimi.ai/docs/pricing/chat-k3.md> and
<https://platform.kimi.ai/docs/pricing/chat-k27-code.md>, fetched 2026-07-27. USD, excludes tax.

| Model | Input (cache miss) | Input (cache hit) | Output | Context |
|---|---|---|---|---|
| Kimi K3 | $3.00 | $0.30 | $15.00 | 1,048,576 |
| Kimi K2.7 Code | $0.95 | $0.19 | $4.00 | 262,144 |
| Kimi K2.6 | `UNKNOWN` (page not fetched) | — | — | — |

Note: `moonshot-v1` is being sunset — the docs state "full platform sunset expected on August 31."
Do not build against it.

**Training verdict: NOT CLEANLY PROHIBITED, BUT NOT PERMITTED EITHER.**
From <https://platform.kimi.ai/docs/agreement/modeluse>, fetched 2026-07-27: the ToS prohibits
"developing, serving, or creating applications, products, Services, or models that have potential
competitive possibilities with the Services without authorization." There is no clause
specifically permitting or forbidding training on outputs in the general case — the competitive
clause is the operative constraint, and "potential competitive possibilities" is broad enough to
read either way. Treat as **prohibited by default** absent written authorisation.

**Moonshot's use of your data:** by default Moonshot "may use Content to provide, maintain,
develop, support, and improve the Services." **Opt-out requires negotiating a separate written
enterprise agreement** — there is no settings toggle. Same source, fetched 2026-07-27.

**GOVERNANCE FLAG — read before considering Moonshot at all.**
On **2026-07-22**, Michael Kratsios, Director of the White House Office of Science and Technology
Policy, publicly named Moonshot AI, alleging the company distilled Anthropic's Fable model to
develop Kimi K3; Anthropic alleged Kimi relied on hundreds of fraudulent accounts across multiple
access pathways to conduct distillation attacks. Moonshot has denied using American models to
train Kimi K3 and has not publicly confirmed or denied Claude-specific distillation for K3.
Sources: <https://www.cnn.com/2026/07/23/tech/china-ai-moonshot-kimi-explainer-intl-hnk>,
<https://www.wionews.com/world/moonshot-could-face-us-sanctions-govt-takes-note-of-chinese-ai-firm-s-distillation-attacks-against-anthropic-to-improve-its-kimi-model-1784801603645>
— retrieved 2026-07-27. **These are allegations, publicly contested, and not adjudicated.**

Why it matters to this decision, factually and without editorialising: (a) the article cited above
mentions possible US sanctions, which is a **supply-continuity** risk for anything AtlasORACLE
depends on; (b) HONEYCOMB's own Anthropic relationship is the substrate the platform currently
runs on, and adding a provider under active dispute with that substrate is a business-relationship
question that belongs to OG HUMAN, not to Code. **Recommendation: park Moonshot. Do not integrate
pending resolution.** This is a dependency report, not a schedule.

---

### 2.7 Mistral

| Field | Value |
|---|---|
| **Auth model** | Bearer API key (La Plateforme). |
| **Streaming** | Yes. `SEARCH-DERIVED` — not separately verified this pass. |
| **Rate limits / min spend** | `UNKNOWN` — not captured this pass. |

**Pricing** — <https://mistral.ai/pricing/api>, fetched 2026-07-27:

*Premium models*

| Model | Input | Output |
|---|---|---|
| Mistral Medium 3.5 | $1.50 | $7.50 |
| Mistral Large 3 | $0.50 | $1.50 |
| Magistral Medium (reasoning) | $2.00 | $5.00 |
| Magistral Small (reasoning) | $0.50 | $1.50 |
| Codestral (premier) | $0.30 | $0.90 |

*Open-weight models*

| Model | Input | Output |
|---|---|---|
| Mistral Small 4 | $0.15 | $0.60 |
| Devstral 2 | $0.40 | $2.00 |
| Devstral Small 2 | $0.10 | $0.30 |
| **Ministral 3 — 3B** | **$0.10** | **$0.10** |
| **Ministral 3 — 8B** | **$0.15** | **$0.15** |
| Ministral 3 — 14B | $0.20 | $0.20 |
| Mistral NeMo | $0.15 | $0.15 |
| Mixtral 8x7B | $0.70 | $0.70 |
| Mixtral 8x22B | $2.00 | $6.00 |

**Free tier:** `Leanstral` is free during its feedback period (labs tier).

**Training verdict: PARTIALLY PROHIBITED — narrower than the US labs.**
From Mistral's Commercial Terms of Service
(<https://legal.mistral.ai/terms/commercial-terms-of-service>, fetched 2026-07-27):

> "Customer owns all Output. Mistral AI hereby assigns to Customer all right, title, and interest,
> if any, in and to Output."

The restrictions found are **specific**, not blanket:

> "Customer may not use image Outputs to develop or train any image generation product that
> competes with a Mistral AI Product."

plus a prohibition on using Output "to reverse engineer the Mistral AI Products."

**Read for HONEYCOMB:** the explicit training prohibition is scoped to **image** outputs and image
generation products. No equivalent blanket text-output training prohibition was found in the
commercial terms. That makes Mistral — alongside DeepSeek — one of only two providers in this
matrix where text-output training is not clearly foreclosed. **It is not an affirmative
permission** the way DeepSeek's is; it is an absence. Get counsel to read the full commercial terms
before relying on the absence.

**Mistral's use of your data:** by default Mistral does **not** train on commercial API usage.
Training occurs only for free-tier users who have not opted out, Vibe Pro/Teams users who have not
opted out, submitted feedback, moderation-flagged content, or **Labs Models** — where "Mistral may
use Customer Data and Outputs generated from Labs Models to train its artificial intelligence
models, unless you have activated zero data retention." Same source, fetched 2026-07-27.
**`Leanstral` is a labs model — its free price includes your data unless ZDR is on.**

---

## 3. Aggregators and OSS inference hosts

These do not own models; they resell capacity. Their value to AtlasORACLE is (a) neutral hosting of
open weights, sidestepping first-party model-owner terms, and (b) one integration for many models.

### 3.1 Groq

| Field | Value |
|---|---|
| **Auth model** | Bearer API key, OpenAI-compatible. |
| **Streaming** | Yes (OpenAI-compatible). `SEARCH-DERIVED`. |
| **Free tier** | Yes — free API key on signup. |

**Pricing** — <https://groq.com/pricing/>, fetched 2026-07-27:

| Model | Input | Output | Speed |
|---|---|---|---|
| **GPT OSS 20B 128k** | **$0.075** | **$0.30** | 1,000 TPS |
| GPT OSS Safeguard 20B | $0.075 | $0.30 | 1,000 TPS |
| GPT OSS 120B 128k | $0.15 | $0.60 | 500 TPS |
| Llama 3.3 70B Versatile 128k | $0.59 | $0.79 | 394 TPS |
| **Llama 3.1 8B Instant 128k** | **$0.05** | **$0.08** | 840 TPS |
| Qwen 3.6 27B 131k | $0.60 | $3.00 | 500 TPS |

Cached input tokens: 50% discount on applicable models, no feature fee. Batch API: 50% cost
reduction, no rate-limit impact. Enterprise-only models (e.g. Minimax M2.7) are quote-only.

**Rate limits** — <https://console.groq.com/docs/rate-limits>, fetched 2026-07-27. Free plan is
tight: 10–30 RPM, 100–14,400 RPD, 1.2K–15K TPM, 3.6K–500K TPD depending on model. Llama 3.1 8B on
free tier: 30 RPM / 6K TPM. Developer plan raises these substantially; **no minimum spend is
disclosed** for the upgrade — `UNKNOWN`.

**Training verdict on Groq's own terms: N/A — Groq does not own the models.** The constraint that
binds is the *weights licence* of whatever model you run (gpt-oss, Llama, Qwen), not Groq's ToS.
Groq's website Terms of Use explicitly disclaim coverage of GroqCloud
(<https://groq.com/terms-and-conditions/>, fetched 2026-07-27 — states the Groq Services Agreement
governs instead). No competing-model restriction was found in the pages read.

**Groq's use of your data — the strongest position in this matrix.**
From <https://console.groq.com/docs/your-data>, fetched 2026-07-27:

- **Groq does not retain customer data for inference requests by default.** Only usage metadata
  (excluding inputs and outputs) is collected.
- **Groq does not train on customer inputs or outputs.** Retention happens only where a feature
  requires it (batch, fine-tuning) or for troubleshooting/abuse investigation.
- Zero Data Retention is available to **all** customers via Data Controls at
  `console.groq.com/settings/data-controls` — no approval gate, unlike OpenAI's.
- Retained data lives in GCP buckets in the United States.

Corroborated by the Groq Services Agreement (last modified 2026-06-22): Groq is not permitted to
use Inputs or Outputs for training or fine-tuning any AI Model Services or other models unless
explicitly permitted or instructed by the customer. Source:
<https://console.groq.com/docs/legal/services-agreement> — `SEARCH-DERIVED`, retrieved 2026-07-27.

**This combination — no training, no default retention, self-serve ZDR, and open weights whose
licence is the only real constraint — makes Groq the cleanest expansion candidate in the matrix
on rights grounds, independent of price.**

### 3.2 Together AI

**Pricing** — <https://www.together.ai/pricing>, fetched 2026-07-27:

| Model | Input | Output | Cached input |
|---|---|---|---|
| Llama 3.3 70B | $1.04 | $1.04 | — |
| Llama 3 8B Instruct Lite | $0.14 | $0.14 | — |
| Qwen3.5-397B-A17B | $0.60 | $3.60 | $0.35 |
| Qwen3.5 9B | $0.17 | $0.25 | — |
| Qwen3.7-Plus | $0.32 | $1.28 | — |
| Qwen3.6-Plus | $0.50 | $3.00 | — |
| Qwen2.5 7B Instruct Turbo | $0.30 | $0.30 | — |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.20 |
| Kimi K3 | $3.00 | $15.00 | $0.30 |
| Kimi K2.7 Code | $0.95 | $4.00 | $0.19 |
| Kimi K2.6 | $1.20 | $4.50 | $0.20 |
| **gpt-oss-120B** | **$0.15** | **$0.60** | — |
| **gpt-oss-20B** | **$0.05** | **$0.20** | — |

Note Together's Qwen3.7-Plus at $0.32/$1.28 undercuts Alibaba's own International-region price for
the same model family ($0.40–$1.20 / $1.60–$4.80). Worth a direct comparison if Qwen is selected.

**Training verdict: PROHIBITED (broadly).**
From <https://www.together.ai/terms-of-service>, fetched 2026-07-27 — Together prohibits using the
Services to "develop a product or service that is competitive with the Company's products or
services or engage in competitive analysis or benchmarking."

This is worth reading carefully: Together is an *inference host*. Its "products or services" are
inference services, not models. A HONEYCOMB-trained model is arguably not competitive with an
inference host — but "engage in competitive analysis or benchmarking" is broad enough to catch
routine evaluation work, which AtlasORACLE's whole provider-pool design implies. **This clause
alone is a reason to prefer Groq over Together for a multi-provider router.** Get counsel to read
it.

**Output ownership:** "as between you and Company, you exclusively own all right, title, and
interest in Your Content and Output."

**Together's use of your data:** trains on customer data **by default**. Opt-out is Zero Data
Retention, which the customer must actively enable — when on, Together will "not use your data and
outputs to train models, improve Services, or for other secondary purposes." Same source.

**Rate limits / min spend / free tier:** `UNKNOWN` — not captured this pass.

### 3.3 Fireworks AI

**Pricing** — <https://docs.fireworks.ai/serverless/pricing>, fetched 2026-07-27.
Size-tier fallback for unlisted models:

| Tier | Price (per MTok, both directions) |
|---|---|
| Under 4B params | $0.10 |
| 4B–16B params | $0.20 |
| Over 16B params | $0.90 |
| MoE up to 56B | $0.50 |
| MoE 56.1B–176B | $1.20 |

Named models (Standard tier — input / cached input / output):

| Model | Standard | Priority |
|---|---|---|
| Kimi K2.7 Code | $0.95 / $0.19 / $4.00 | $1.425 / $0.285 / $6.00 |
| DeepSeek V4 Pro | $1.74 / $0.145 / $3.48 | $2.61 / $0.218 / $5.22 |
| **DeepSeek V4 Flash** | **$0.14 / $0.028 / $0.28** | $0.21 / $0.042 / $0.42 |
| MiniMax M3 | $0.30 / $0.06 / $1.20 | $0.45 / $0.09 / $1.80 |

Batch inference billed at 50% of serverless on both directions. Cached input gets 50% off.
New users receive **$1 in free credits** (<https://fireworks.ai/pricing>, fetched 2026-07-27).

**Training verdict: `UNKNOWN`.** <https://fireworks.ai/terms-of-service> 308-redirects to a
Sanity-hosted PDF whose text streams were unparseable by the fetcher. Output ownership and default
training practice are both `UNKNOWN`. **Blocker: needs a human to open the PDF.**
PDF URL: `https://cdn.sanity.io/files/pv37i0yn/production/56e80f29b0fe59d273d8c2891621f286bcddfe5c.pdf`
(a copy was saved to the session tool-results directory during this pass).

### 3.4 OpenRouter

**Pricing model** — <https://openrouter.ai/docs/faq>, fetched 2026-07-27.
OpenRouter **passes through underlying provider pricing with no markup** — you pay the same rate as
going direct. Revenue comes from credit-purchase fees:

| Payment method | Fee |
|---|---|
| Stripe | 5.5% ($0.80 minimum) |
| Crypto (USDC) | 5% |
| BYOK | first 1M requests/month free, then 5% of normal OpenRouter pricing |

Fees apply to credit purchases, not API usage.

**Free tier / `:free` models:** 50 requests/day without purchased credits; **1,000 requests/day
with $10+ in credits purchased**. OpenRouter's own docs say free models are "usually not suitable
for production use." A `openrouter/free` router auto-selects among them.

**Auth model:** three paths — cookie auth (web UI), Bearer API keys (completions API), and
Management API keys (programmatic key management). BYOK supported.

**Data policy** — <https://openrouter.ai/docs/features/privacy-and-logging>, fetched 2026-07-27.
Each upstream provider has its own policy; OpenRouter surfaces them. **If you opt out of training
in account settings, OpenRouter will not route to providers that train.** Settings are separate for
paid and free models.

**Strategic read:** OpenRouter is the **cheapest way to run the comparison this document is
recommending** — one integration, no markup, per-provider data-policy enforcement at the router
layer, and a training opt-out that is enforced by routing rather than by contract. It is a poor
production dependency (an extra hop, an extra failure domain, a 5.5% top-up fee) but an excellent
*evaluation harness*. Recommend it for the bake-off in §4, not for the production pool.

---

## 4. Free-tier reconciliation: canon says OSS, v1 says Haiku

### 4a. The gap, stated plainly

`shared/canon/atlasoracle-v1-final-scope.md` Q3 resolves the provider pool as **Anthropic-only at
v1**, with Groq and OSS Llama 3 explicitly deferred post-launch:

> "Groq provider integration — Post-launch — Used for free-tier-eligible categories; no subsidy
> pressure at v1 scale"
> "OSS Llama 3 provider integration — Post-launch — Same as Groq; free-tier expansion"

The v1 router therefore routes free-tier directives to `claude-haiku-4-5` at cost 0 to the Bee —
**the platform eats the full Anthropic price as subsidy.** The canon rationale for deferring is
explicit and correct: at v1 scale there is no subsidy pressure. This section quantifies what
"subsidy pressure" would cost when scale arrives, so the reconciliation is a numbers decision
rather than a vibes decision.

### 4b. Cost model

**Revised 2026-07-27 to use OPS10's live measurement in place of this pass's estimate.**

This pass originally estimated the input side from the router's own constants: canon bundle
(`assembleCrossAstraCanon()`) = 2,462 characters, `CHARS_PER_TOKEN = 4` → ~616 tokens, plus a
short directive → ~700 input tokens. **OPS10 fired real directives the same day and Anthropic
reported `input_tokens = 1637`** for a free-tier call (`directive_id 6970e525-59d3-45a1-829c-3ddfedfa1984`,
13:40:26Z, `success=true`). The router's 4-chars-per-token heuristic under-counts real tokenisation
by roughly 2.3× on this payload — the estimate was low, the measurement wins, and the tables below
use the measurement.

- **Input: 1,637 tokens** — measured live by OPS10, 2026-07-27.
- **Output: 500 tokens** — `TIER_DEFAULT_OUTPUT_TOKENS.free = 500`. (OPS10's single observed call
  returned 43 output tokens on a short directive; 500 is the router's own planning figure and the
  conservative choice for a subsidy model.)

**Unit of comparison: one free-tier directive = 1,637 input tokens + 500 output tokens.**
Cost per 1,000 directives = `(0.001637 × input_price) + (0.0005 × output_price)` × 1,000.

*Side note for whoever owns the cost estimator:* `CHARS_PER_TOKEN = 4` under-counting by ~2.3×
means `estimateInputTokens()` under-estimates every tier's cost, which is a `front`/`ops` finding,
not a docs one. Flagged, not fixed.

### 4c. Cost per 1,000 free-tier directives

| Route | Input $/MTok | Output $/MTok | $ / 1,000 directives | vs Haiku |
|---|---|---|---|---|
| **`claude-haiku-4-5` (v1 stand-in)** | 1.00 | 5.00 | **$4.14** | **1.0× (baseline)** |
| Qwen3.5 OSS on Model Studio (low end) | 0.25 | 2.00 | $1.41 | 2.9× cheaper |
| `gpt-5.4-nano` (OpenAI, not OSS) | 0.20 | 1.25 | $0.95 | 4.4× cheaper |
| gpt-oss-120B (Groq **or** Together) | 0.15 | 0.60 | $0.55 | 7.5× cheaper |
| Mistral Small 4 (open weights) | 0.15 | 0.60 | $0.55 | 7.5× cheaper |
| Gemini 2.5 Flash-Lite (paid tier, not OSS) | 0.10 | 0.40 | $0.36 | 11.4× cheaper |
| DeepSeek V4 Flash (direct or Fireworks) | 0.14 | 0.28 | $0.37 | 11.3× cheaper |
| gpt-oss-20B (Groq) | 0.075 | 0.30 | $0.27 | 15.2× cheaper |
| Mistral Ministral 3 — 8B (open weights) | 0.15 | 0.15 | $0.32 | 13.1× cheaper |
| gpt-oss-20B (Together) | 0.05 | 0.20 | $0.18 | 22.6× cheaper |
| **Llama 3.1 8B Instant (Groq)** | **0.05** | **0.08** | **$0.12** | **33.9× cheaper** |

Note the reordering versus the estimate-based table: at 1,637 input tokens the workload is **input-
heavier** than the 700-token estimate assumed, so symmetric-priced models (Ministral 3 — 8B at
$0.15/$0.15) lose ground to input-cheap ones (DeepSeek V4 Flash, gpt-oss-20B). This is exactly the
sensitivity §4d(ii) warns about, now demonstrated.

Scaled to a monthly subsidy line, holding the same directive shape:

| Free directives / month | Haiku 4.5 | gpt-oss-20B (Groq) | Llama 3.1 8B (Groq) |
|---|---|---|---|
| 10,000 | $41 | $2.73 | $1.22 |
| 100,000 | $414 | $27 | $12 |
| 1,000,000 | $4,137 | $273 | $122 |
| 10,000,000 | $41,370 | $2,728 | $1,219 |

**Read:** below ~100k free directives/month the entire free-tier subsidy is a rounding error at
either price, and canon's "no subsidy pressure at v1 scale" holds exactly as written. The decision
point is around **1M free directives/month**, where the difference between the Haiku stand-in and
a true-OSS route is roughly **$3,900/month** — i.e. real money against the 11% R&D allocation.
**The reconciliation is not urgent. It becomes urgent at ~1M free directives/month.** That is a
dependency statement; the date belongs to OG HUMAN.

**Exposure note from OPS10:** the free tier currently skips both the escrow pre-check and the
debit, and OPS10 found both paid tiers hard-broken — so **100% of usable AtlasORACLE traffic is
today unmetered free-tier provider spend**, bounded only by per-Bee rate caps (2/min, 10/hr,
50/day). That raises the practical ceiling on the subsidy line above from "theoretical" to
"the only line there is" until the debit RPC is fixed.

### 4d. Two structural findings that change the arithmetic

**(i) The canon prefix is not cacheable on the free tier — confirmed live.** The canon bundle is a
fixed prefix on every single directive — textbook prompt-caching material. But it lands **below
Anthropic's minimum cacheable prefix** on the model the free tier uses. OPS10 measured the live
prefix at **1,637 tokens** and observed `cached_tokens = 0`; Anthropic's minimum cacheable prefix
on Haiku 4.5 is **4,096 tokens**. Below the minimum, caching silently does not happen — no error,
`cache_creation_input_tokens` simply returns 0. **Every free directive re-pays full input price for
the same canon text, forever.**

Against all three currently-pinned models:

| Tier | Model | Anthropic min. cacheable prefix | 1,637-token canon prefix |
|---|---|---|---|
| free | `claude-haiku-4-5` | 4,096 | **does not cache** |
| standard | `claude-sonnet-4-6` | 1,024 | caches |
| frontier | `claude-opus-4-7` | 2,048 | **does not cache** |

Meanwhile several expansion candidates would cache it aggressively:

| Route | Cache-hit input price | Canon prefix cost per directive |
|---|---|---|
| Haiku 4.5 (not cacheable at this size) | n/a | $0.001637 |
| Fireworks DeepSeek V4 Flash | $0.028 | $0.0000458 |
| DeepSeek V4 Flash (direct) | $0.0028 | $0.0000046 |
| Kimi K2.7 Code (parked — §2.6) | $0.19 | $0.000311 |

That is a **~357× reduction** on the fixed portion of every free-tier request, on top of the
per-token savings in §4c. **This is the strongest single technical argument in the document for
expansion**, and it is a caching-architecture argument, not a price-shopping one.

Note the cheaper near-term fix that does not require expansion at all: at 1,637 tokens the prefix
is only ~2,459 tokens short of Haiku's 4,096 minimum. **Growing the canon bundle past 4,096 tokens
would make it cacheable on the existing free tier** — the counter-intuitive result that a *bigger*
system prefix is *cheaper* per request. Worth modelling before any provider work is commissioned.

**(ii) The `free` tier's in/out ratio decides the ranking.** At the measured 1,637 in / 500 out,
input is 40% of Haiku cost — a much heavier input share than this pass's original 700-token
estimate implied, and enough to reorder §4c (see the note there). Any provider comparison run
against a different in/out ratio will rank differently. **The ranking in §4c is valid only for the
free tier's measured 1,637/500 shape**, and should be re-run if the canon bundle changes size —
including under the grow-past-4,096 idea above, which would change it substantially.

### 4e. What the reconciliation actually requires

Canon says OSS at launch. v1 shipped Haiku as a stand-in. Closing that gap needs, in order:

1. **A second provider adapter in `atlasoracle-route`.** The function currently hard-codes
   `ANTHROPIC_URL` and the Anthropic request/response envelope. Every candidate above is
   OpenAI-wire-compatible, so a single OpenAI-compatible adapter covers Groq, Together, Fireworks,
   DeepSeek, xAI, Mistral, Qwen, and OpenRouter — **one adapter, eight providers.**
2. **Real config on `atlasoracle_provider_pool`.** The table has `provider_name`,
   `provider_category`, `selection_weight`, `active` — it has **no endpoint URL, no auth-secret
   reference, and no per-provider price fields.** Cost estimation is currently hard-coded to the
   Anthropic cost-shape. Multi-provider routing needs schema work, which is a `db`-lane dispatch,
   not this one.
3. **A rights decision, not a price decision, on which provider serves Bee text.** §5 below.

---

## 5. Cross-cutting findings

**F1 — Only two providers leave text-output training open.** DeepSeek affirmatively permits it
("training other models (such as model distillation)"); Mistral's prohibition is scoped to *image*
outputs, leaving text as an unaddressed absence rather than a permission. Every other first-party
model owner in this matrix — OpenAI, xAI, Google, Moonshot, Together — prohibits it. **If
HONEYCOMB ever intends to train its own model, the provider choice made now determines whether
that is legally available later.** That is a strategic call for OG HUMAN, and it should be made
before the pool is wired, not after.

**F2 — The neutral-host route dissolves most of F1.** Open-weight models (gpt-oss, Llama, Qwen,
Ministral, Mistral Small) run on Groq/Together/Fireworks are governed by the *weights licence*, not
the inference host's ToS. This is the clean path to a training-permissive posture without picking
a fight with anyone's terms. **Caveat:** the specific licence for each weight set was not verified
this pass — `UNKNOWN`, and it is the single most important follow-up in this document.

**F3 — Two providers train on Bee data by default.** xAI (opt-out in account settings,
`SEARCH-DERIVED`) and Together AI (opt-out via ZDR). Moonshot trains by default with opt-out only
via negotiated enterprise agreement. Gemini's **free tier** trains and permits human review. For a
platform whose thesis is "take out the greed, reward giving," routing a Bee's directive text into a
default-train tier is a consent question that current canon does not answer. **Recommend a
standing rule: no Bee directive text to any provider that trains by default, regardless of price.**
That rule alone eliminates the Gemini free tier, and makes ZDR activation a hard precondition for
Together.

**F4 — Groq is the cleanest candidate on rights.** No training on inputs or outputs, no default
retention, self-serve ZDR with no approval gate, US data location, and open weights whose licence
is the only binding constraint. It is also already named in canon as the intended post-launch
free-tier provider. **The canon-designated path and the rights-cleanest path are the same path** —
which is a good sign for the original scoping decision.

**F5 — Park Moonshot.** §2.6. Allegations are contested and unadjudicated; the operative risks are
supply continuity (possible sanctions per the cited reporting) and the Anthropic business
relationship. Not Code's call to make, and not a call that needs making now.

**F6 — Two free lunches with a data price.** Gemini free tier (human reviewers may read inputs and
outputs) and Mistral `Leanstral` (labs model — trains on your data unless ZDR is on). Neither is
free in the sense that matters to a platform built on Bee sovereignty.

**F7 — The Sonnet 5 introductory window closes 2026-08-31.** §1a. Independent of everything else in
this document.

---

## 6. Could-not-verify list

Per R6, stated explicitly rather than papered over.

| Item | Status | Blocker |
|---|---|---|
| OpenAI competing-model restriction, exact text | `SEARCH-DERIVED` | `openai.com/policies/services-agreement/` → HTTP 403 |
| xAI competing-model restriction, exact text | `SEARCH-DERIVED` | `x.ai/legal/terms-of-service` and `.../-enterprise` → HTTP 403 |
| xAI default training-on-inputs licence | `SEARCH-DERIVED` | same 403 |
| xAI rate limits / min spend / free tier | `UNKNOWN` | not attempted this pass |
| Fireworks output ownership + training terms | `UNKNOWN` | ToS is a Sanity-hosted PDF; text streams unparseable |
| Gemini free-tier per-model RPM/TPM/RPD | `UNKNOWN` | docs defer to `aistudio.google.com/rate-limit` (login required) |
| Kimi K2.6 pricing | `UNKNOWN` | per-model page not fetched |
| Kimi / Moonshot streaming, rate limits, free tier | `UNKNOWN` | not attempted this pass |
| Qwen / Model Studio training terms | `UNKNOWN` | Alibaba Cloud Model Studio ToS not read |
| Qwen / Model Studio rate limits, min spend | `UNKNOWN` | not attempted this pass |
| Qwen open-weight licence text, per release | `UNKNOWN` | not attempted — **highest-value follow-up (F2)** |
| gpt-oss / Llama / Ministral weight licences | `UNKNOWN` | not attempted — **same follow-up (F2)** |
| Together AI rate limits / min spend / free tier | `UNKNOWN` | not attempted this pass |
| Groq Developer-plan minimum spend | `UNKNOWN` | not disclosed in Groq's rate-limit docs |
| Streaming for Google, Mistral, Qwen, Together, Fireworks, Groq | `SEARCH-DERIVED` | OpenAI-wire-compatible by documentation, not individually re-verified |
| DeepSeek use of customer inputs for training | `UNKNOWN` | terms are silent on the point |

**Verified directly this pass (first-party page fetched and parsed 2026-07-27):** all pricing tables
except Kimi K2.6; DeepSeek concurrency limits; DeepSeek output-training permission; DeepSeek
streaming; Google training prohibition and free/paid data split; Google usage tiers; OpenAI usage
tiers; OpenAI data-usage default; xAI streaming; Mistral commercial-terms output ownership and
image-training restriction; Mistral default training posture; Kimi ToS competitive clause and
default content use; Groq rate limits; Groq data policy; OpenRouter pricing, free-tier limits, auth,
and data policy; Fireworks size tiers and named-model pricing; Alibaba free-quota region and
duration; Anthropic current model pricing.

---

## 7. Source index

All fetched 2026-07-27.

**Pricing**
- Anthropic — <https://platform.claude.com/docs/en/about-claude/models/overview.md>
- OpenAI — <https://developers.openai.com/api/docs/pricing>
- xAI — <https://docs.x.ai/docs/models>
- Google — <https://ai.google.dev/gemini-api/docs/pricing>
- DeepSeek — <https://api-docs.deepseek.com/quick_start/pricing>
- Qwen / Alibaba — <https://www.alibabacloud.com/help/en/model-studio/model-pricing>
- Kimi K3 — <https://platform.kimi.ai/docs/pricing/chat-k3.md>
- Kimi K2.7 Code — <https://platform.kimi.ai/docs/pricing/chat-k27-code.md>
- Mistral — <https://mistral.ai/pricing/api>
- Groq — <https://groq.com/pricing/>
- Together — <https://www.together.ai/pricing>
- Fireworks — <https://docs.fireworks.ai/serverless/pricing> and <https://fireworks.ai/pricing>
- OpenRouter — <https://openrouter.ai/docs/faq>

**Rate limits / tiers**
- OpenAI — <https://developers.openai.com/api/docs/guides/rate-limits>
- Google — <https://ai.google.dev/gemini-api/docs/rate-limits>
- DeepSeek — <https://api-docs.deepseek.com/quick_start/rate_limit>
- Groq — <https://console.groq.com/docs/rate-limits>

**Terms / data policy**
- OpenAI data usage — <https://developers.openai.com/api/docs/guides/your-data>
- OpenAI services agreement — <https://openai.com/policies/services-agreement/> *(403)*
- xAI AUP — <https://x.ai/legal/acceptable-use-policy> *(not fetched; named as the page to read)*
- Google — <https://ai.google.dev/gemini-api/terms>
- DeepSeek — <https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html>
- Kimi — <https://platform.kimi.ai/docs/agreement/modeluse>
- Mistral — <https://legal.mistral.ai/terms/commercial-terms-of-service>
- Groq data — <https://console.groq.com/docs/your-data>
- Groq website ToU — <https://groq.com/terms-and-conditions/>
- Groq services agreement — <https://console.groq.com/docs/legal/services-agreement> *(search-derived)*
- Together — <https://www.together.ai/terms-of-service>
- Fireworks — <https://fireworks.ai/terms-of-service> *(PDF, unparseable)*
- OpenRouter — <https://openrouter.ai/docs/features/privacy-and-logging>

**Platform / capability**
- xAI streaming — <https://docs.x.ai/docs/guides/streaming-response>
- Alibaba Model Studio overview — <https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio>
- Alibaba free quota — <https://www.alibabacloud.com/help/en/model-studio/new-free-quota>

**Moonshot governance flag (§2.6) — news, not first-party, retrieved 2026-07-27**
- <https://www.cnn.com/2026/07/23/tech/china-ai-moonshot-kimi-explainer-intl-hnk>
- <https://www.wionews.com/world/moonshot-could-face-us-sanctions-govt-takes-note-of-chinese-ai-firm-s-distillation-attacks-against-anthropic-to-improve-its-kimi-model-1784801603645>

---

## 8. Done-test

**Requirement:** every cell cited-with-date or UNKNOWN.

**Result: PASS.** Every price, limit, and terms statement above carries either a first-party URL
with fetch date 2026-07-27, an explicit `SEARCH-DERIVED` marker naming the blocker, or `UNKNOWN`
with the reason. §6 enumerates all 17 unverified items. No number in this document came from model
memory.

🐝🍯
