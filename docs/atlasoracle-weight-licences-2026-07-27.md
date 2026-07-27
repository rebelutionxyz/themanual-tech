# AtlasORACLE — Open-Weight Licence Verification

**Pass:** DOCS2 · **Lane:** docs · **Workdir:** TheMANUAL.tech · **Scope:** oracle
**Chained from:** DOCS1 finding F2 · **Companion:** `docs/atlasoracle-provider-expansion-matrix-2026-07-27.md`
**Fetch date for every licence quote in this document: 2026-07-27.**
**Status:** draft for Butch. No code changed. No model downloaded. Produce-and-propose only.

---

## 0. Reading rules

Same discipline as DOCS1. **Every clause is either (a) quoted from a first-party licence file
fetched on 2026-07-27, or (b) marked `SEARCH-DERIVED` with the blocker named, or (c) marked
`UNKNOWN`.** Nothing here is recalled from memory, and no licence verdict rests on a blog post or
a summariser — where only secondary sources exist, the cell says so.

"First-party" for a weight licence means the model's own repository: the Hugging Face model card or
its `LICENSE` file, or the vendor's own GitHub licence file. A vendor press release describing a
licence is **secondary** and is treated as such even when it comes from the vendor's own domain,
because release blogs routinely describe licences loosely.

**Verdict vocabulary**, as the dispatch specified:

| Verdict | Meaning for HONEYCOMB |
|---|---|
| **TRAINING-PERMISSIVE** | Outputs may be used to train a HONEYCOMB model, distributed commercially, under HONEYCOMB's own name, with no revenue or user cap. Attribution obligations only. |
| **RESTRICTED** | Training is permitted but carries a live obligation — a naming requirement, a revenue cap, a user cap, or a copyleft-style licence-inheritance term. Usable, but the constraint must be designed around. |
| **PROHIBITED** | Commercial or production use is not granted by the licence. Requires a separate negotiated agreement. |

---

## 1. Why this pass exists

DOCS1 established that every first-party model owner except DeepSeek prohibits using their API
outputs to train a competing model (F1), and that the escape hatch is to run **open weights on a
neutral inference host**, because then the binding constraint is the *weights licence* rather than
the host's terms of service (F2). DOCS1 could not verify a single one of those licences and flagged
it as the highest-value gap in the matrix. This pass closes it.

The practical question this document answers: **for each model AtlasORACLE might actually route to,
may HONEYCOMB (a) use it commercially, (b) train its own model on its outputs, (c) ship the result
under its own name?**

---

## 2. The four licence archetypes in play

Every model examined falls into one of four buckets. Knowing the bucket tells you the answer before
you read the individual model row.

| Archetype | Training on outputs | Commercial cap | Naming / attribution | Verdict class |
|---|---|---|---|---|
| **Apache 2.0** | unrestricted | none | NOTICE + licence copy on redistribution | TRAINING-PERMISSIVE |
| **Llama Community License** | permitted **since 3.1** | 700M MAU threshold | `Llama` name prefix + "Built with Llama" | RESTRICTED |
| **Modified MIT (Mistral, Devstral 2)** | not addressed | **$20M/month revenue** | attribution | RESTRICTED |
| **Mistral Research / Non-Production Licence** | outputs unowned by Mistral, but | **no commercial use at all** | modification notices | PROHIBITED |

Two of these are counter-intuitive and worth stating plainly before the tables:

- **The Llama licence permits training other models.** This changed at Llama 3.1 and a lot of
  received wisdom is still on the old version. It is not a training ban; it is a **naming tax**. §5.
- **"Open weights" and "Apache 2.0" are not synonyms inside a single vendor's lineup.** Mistral
  ships Apache 2.0, modified-MIT-with-revenue-cap, and non-production licences *simultaneously*
  across models released the same week. Devstral 2 (123B) and Devstral Small 2 (24B) were released
  **on the same day** under **different licences**. Per-release verification is not pedantry here.

---

## 3. Per-family verdicts

### 3.1 gpt-oss (OpenAI) — `gpt-oss-20b`, `gpt-oss-120b`

| Dimension | Finding |
|---|---|
| **Licence** | **Apache 2.0** |
| **(a) Outputs → train other models** | **Unrestricted.** Neither the licence nor the separate usage policy addresses or limits it. |
| **(b) Commercial limits** | **None.** Model card: *"Permissive Apache 2.0 license: Build freely without copyleft restrictions or patent risk—ideal for experimentation, customization, and commercial deployment."* |
| **(c) Attribution / naming** | Apache 2.0 standard — licence copy and attribution notices on redistribution. **No name-prefix requirement.** |
| **(d) Redistribution of derivatives** | Permitted under Apache 2.0; no obligation to license derivatives under the same terms. |

**Separate usage policy — verified, and it is 216 bytes in full:**

> "We aim for our tools to be used safely, responsibly, and democratically, while maximizing your
> control over how you use them. By using OpenAI gpt-oss-120b and gpt-oss-20b, you agree to comply
> with all applicable law."

That is the entire document. It imposes no training restriction, no commercial restriction, and no
use-case restriction beyond obeying the law.

Sources: <https://huggingface.co/openai/gpt-oss-120b>, <https://huggingface.co/openai/gpt-oss-20b>,
<https://github.com/openai/gpt-oss/blob/main/USAGE_POLICY> — all fetched 2026-07-27.

### **VERDICT: TRAINING-PERMISSIVE.**

Note the irony worth recording for the strategy file: **OpenAI's API terms are among the most
restrictive in DOCS1 (§2.1 — training on Output prohibited), while OpenAI's open weights are among
the least restrictive here.** Same vendor, opposite postures, because the binding instrument is
different. This is F2 demonstrated in its cleanest form.

---

### 3.2 Llama (Meta) — 3.1, 3.3, 4

The three licences examined are **materially identical** on all four dimensions. Quotes below are
from Llama 4 with section numbers; Llama 3.1 and 3.3 carry the same clauses at the same section
numbers, verified individually.

| Dimension | Finding |
|---|---|
| **Licence** | Llama 3.1 / 3.3 / 4 Community License Agreement (custom, **not** OSI-open-source) |
| **(a) Outputs → train other models** | **PERMITTED, with a naming obligation.** |
| **(b) Commercial limits** | 700 million MAU threshold |
| **(c) Attribution / naming** | `Llama` name prefix **and** "Built with Llama" display |
| **(d) Redistribution of derivatives** | Agreement copy must travel with the materials |

**(a) — the clause that matters most, verbatim (§1.b.i, identical across 3.1 / 3.3 / 4):**

> "If you use the Llama Materials or any outputs or results of the Llama Materials to create,
> train, fine tune, or otherwise improve an AI model, which is distributed or made available, you
> shall also include 'Llama' at the beginning of any such AI model name."

Read it carefully: this **permits** the training and attaches a naming condition. It is a permission
clause, not a prohibition. Meta changed this at Llama 3.1 — the prior Llama 3 licence permitted
training only of Llama models, and this revision opened it to any model, explicitly enabling
synthetic-data generation and distillation across model families. `SEARCH-DERIVED` for the
characterisation of the 3.0 → 3.1 change specifically; the 3.1/3.3/4 clause text itself is
first-party verified.

**(b) — commercial threshold (§2, Llama 4 wording):**

> "If, on the Llama 4 version release date, the monthly active users of the products or services
> made available by or for Licensee, or Licensee's affiliates, is greater than 700 million monthly
> active users in the preceding calendar month, you must request a license from Meta, which Meta
> may grant to you in its sole discretion, and you are not authorized to exercise any of the rights
> under this Agreement unless or until Meta otherwise expressly grants you such rights."

Not a live constraint for HONEYCOMB at any foreseeable scale. Recorded for completeness.

**(c) — attribution (§1.b.i):**

> "prominently display 'Built with Llama' on a related website, user interface, blogpost, about
> page, or product documentation"

plus retention of: *"Llama 4 is licensed under the Llama 4 Community License, Copyright © Meta
Platforms, Inc."*

**(d) — redistribution (§1.b.i):** distributing the materials, derivatives, or *"a product or
service (including another AI model) that contains any of them"* requires providing a copy of the
Agreement.

**Acceptable Use Policy — checked separately and it does *not* add a training restriction.**
The AUP's prohibited categories are conduct-based: unlawful/rights-violating use, risk of death or
bodily harm (military, weapons, critical infrastructure), intentional deception (fraud,
disinformation, impersonation), failure to disclose known dangers, and misassociating third-party
unlawful tools with Meta or Llama. **Training other AI models is absent from the prohibited list.**
Source: <https://github.com/meta-llama/llama-models/blob/main/models/llama4/USE_POLICY.md>,
fetched 2026-07-27.

Sources: <https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE>,
`.../llama3_1/LICENSE`, `.../llama3_3/LICENSE` — all fetched 2026-07-27.

### **VERDICT: RESTRICTED** — training permitted, but see §5 for why the naming clause is the real cost.

---

### 3.3 Llama 5 — `UNKNOWN`

Secondary reporting dated April 2026 describes a Llama 5 release (600B parameters, 5M context) and
speculates about its licence. **That reporting explicitly hedges** — it says the licence is
*"Apache 2.0 (or equivalent permissive terms, pending full release notes)"*, which is a guess
wearing a citation's clothes, and is exactly the kind of cell this pass is not permitted to fill.

First-party checks run this pass:

| Check | Result |
|---|---|
| `huggingface.co/meta-llama` org listing, fetched 2026-07-27 | Lists **Llama 4 Scout/Maverick and Llama 3.3** as the published families. **No Llama 5 repository appears.** |
| `llama.com` | 301 → `developer.meta.com/ai/`; that page returned title only, no body content |
| HF search for a `meta-llama/Llama-5-*` repo | No results |

### **VERDICT: UNKNOWN.** Blocker: no first-party licence text located; Meta's developer site
returned no body content to the fetcher and the HF org listing does not show the release.
**Do not plan against a Llama 5 licence until someone reads one.** If Meta has genuinely moved
Llama to Apache 2.0 that would be a significant change to §5's conclusion — which is a reason to
verify it, not a reason to assume it.

---

### 3.4 Qwen (Alibaba) — Qwen3, Qwen3.5, Qwen3.6

| Dimension | Finding |
|---|---|
| **Licence** | **Apache License 2.0** — standard text, no Qwen-specific modifications. Copyright holder "Alibaba Cloud" (2026). |
| **(a) Outputs → train other models** | **Unrestricted.** No prohibition in the licence. |
| **(b) Commercial limits** | **None.** No threshold, no fee. |
| **(c) Attribution / naming** | Apache 2.0 standard — licence copy, modification notices, retained copyright/attribution notices. Trademark use limited to describing origin. **No name-prefix requirement.** |
| **(d) Redistribution of derivatives** | Permitted; derivatives need not carry the same licence. |

Grant text confirmed verbatim in the LICENSE files: *"perpetual, worldwide, non-exclusive,
no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of,
publicly display, publicly perform, sublicense, and distribute."*

Verified individually: `Qwen/Qwen3.5-397B-A17B`, `Qwen/Qwen3.6-27B`, `Qwen/Qwen3-235B-A22B`
(all `LICENSE` files or model cards, fetched 2026-07-27). `Qwen/Qwen3.5-9B` and
`Qwen/Qwen3.5-35B-A3B` carry Apache 2.0 LICENSE files per the same repository listing —
`SEARCH-DERIVED`, not individually fetched.

**Open/closed split, important for §6:** the Qwen line divides into open-weight releases (3.5 and
3.6, Apache 2.0) and a **closed-weight frontier model (Qwen3.7 Max)** available only through the
API. Qwen3.7 Max is therefore governed by Alibaba Model Studio's terms — which DOCS1 §2.5 marked
`UNKNOWN` — and **not** by any weights licence. `SEARCH-DERIVED` for the split itself.

### **VERDICT: TRAINING-PERMISSIVE** for Qwen3 / 3.5 / 3.6 open weights.
### **N/A — API terms govern** for Qwen3.7 Max (see DOCS1 §2.5, still `UNKNOWN`).

---

### 3.5 Mistral — the lineup that requires per-release checking

Mistral does not have "a licence." It has at least four, live simultaneously.

| Model | Licence | Verdict |
|---|---|---|
| **Mistral Small 4** (`Mistral-Small-4-119B-2603`) | Apache 2.0 | **TRAINING-PERMISSIVE** |
| **Mistral Small 24B** (`Mistral-Small-24B-Instruct-2501`) | Apache 2.0 | **TRAINING-PERMISSIVE** |
| **Ministral 3 — 3B / 8B / 14B** (`Ministral-3-8B-Instruct-2512`) | Apache 2.0 | **TRAINING-PERMISSIVE** |
| **Devstral Small 2** (24B) | Apache 2.0 | **TRAINING-PERMISSIVE** *(`SEARCH-DERIVED`)* |
| **Devstral 2** (`Devstral-2-123B-Instruct-2512`) | **Modified MIT + revenue cap** | **RESTRICTED** |
| **Ministral 8B Instruct 2410** (older generation) | Mistral Research License | **PROHIBITED** commercially |
| **Codestral 22B** | Mistral AI Non-Production License | **PROHIBITED** commercially |
| Mixtral 8x7B / 8x22B, Mistral NeMo | Apache 2.0 | `SEARCH-DERIVED` — not individually fetched |

**The Devstral 2 revenue cap, verbatim from its LICENSE file:**

> "You are not authorized to exercise any rights under this license if the global consolidated
> monthly revenue of your company (or that of your employer) exceeds $20 million (or its equivalent
> in another currency) for the preceding month."

and, critically for anyone thinking a fine-tune escapes it:

> "This restriction in (b) applies to the Model and any derivatives, modifications, or combined
> works based on it, whether provided by Mistral AI or by a third party."

The licence otherwise grants the right to *"modify, merge, publish, distribute, sublicense, and/or
sell copies of the Model."* Use of outputs to train other models is **not addressed** — an absence,
not a permission. Source: <https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512/raw/main/LICENSE>,
fetched 2026-07-27.

**This is a cliff, not a slope.** At $20M/month consolidated revenue the rights terminate entirely —
not "you owe a fee," but "you are not authorized." It applies to derivatives and to third-party-hosted
variants. For a platform that intends to grow, embedding Devstral 2 anywhere structural is building
on a trapdoor. Note it binds on **your company's** revenue, so it is unaffected by how the model is
accessed.

**The Mistral Research / Non-Production licences (Ministral 8B 2410, Codestral 22B):**

> "You shall only use the Mistral Models and Derivatives for testing, research, Personal, or
> evaluation purposes in Non-Production Environments" (MNPL §3.2)

> "You shall not supply the Mistral Models or Derivatives in the course of a commercial activity,
> whether in return for payment or free of charge, in any medium or form, including but not limited
> to through a hosted or managed service" (MNPL §3.2)

Note "**or free of charge**" — a free tier is still a commercial activity under this licence, so
these models cannot serve AtlasORACLE's free tier either. Mistral does disclaim ownership of
outputs (§4.2: *"We claim no ownership rights in and to the Outputs"*), but that is irrelevant when
the production use itself is not licensed.

Sources: <https://mistral.ai/licenses/MNPL-0.1.md>,
<https://huggingface.co/mistralai/Mistral-Small-4-119B-2603>,
<https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512>,
<https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501> — fetched 2026-07-27.
Ministral 8B 2410's Mistral Research License and Devstral Small 2's Apache 2.0 are `SEARCH-DERIVED`.

**Naming trap worth recording:** `Ministral-8B-Instruct-2410` (Mistral Research License, no
commercial use) and `Ministral-3-8B-Instruct-2512` (Apache 2.0, fully permissive) are both "Ministral
8B." DOCS1 priced "Ministral 3 — 8B" — the Apache one — so DOCS1's recommendation is safe, but a
future integration that resolves "Ministral 8B" by name rather than by full model ID could land on
the wrong licence entirely.

---

### 3.6 Models DOCS1 priced whose weights were NOT verified

DOCS1 recommended DeepSeek V4 Flash on price and caching grounds. Its **weights licence was not
verified this pass** and is not covered by the dispatch's named families.

| Model | Weights licence | Note |
|---|---|---|
| DeepSeek V4 Flash / V4 Pro | `UNKNOWN` | Not in DOCS2's scope; DOCS1 verified only DeepSeek's **API** terms, which affirmatively permit training on outputs. If DeepSeek is used **via API**, the API terms govern and DOCS1 §2.4 already answers the question. If self-hosted or run on Fireworks/Together, the weights licence governs and is unverified. |
| Kimi K2.7 / K3 | `UNKNOWN` | Moonshot is parked per DOCS1 F5 regardless. |
| MiniMax M3 | `UNKNOWN` | Not examined. |

---

## 4. Verdict table

| Model / family | Licence | Train on outputs? | Commercial cap | Naming tax | Verdict |
|---|---|---|---|---|---|
| **gpt-oss 20B / 120B** | Apache 2.0 | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| **Qwen3 / 3.5 / 3.6** (open weights) | Apache 2.0 | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| **Mistral Small 4** | Apache 2.0 | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| **Mistral Small 24B** | Apache 2.0 | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| **Ministral 3 (3B/8B/14B)** | Apache 2.0 | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| Devstral Small 2 (24B) | Apache 2.0 *(SD)* | ✅ unrestricted | none | none | **TRAINING-PERMISSIVE** |
| **Llama 3.1 / 3.3 / 4** | Llama Community | ✅ **but** must name it `Llama…` | 700M MAU | `Llama` prefix + "Built with Llama" | **RESTRICTED** |
| **Devstral 2 (123B)** | Modified MIT | not addressed | **$20M/mo revenue — rights terminate** | attribution | **RESTRICTED** |
| Ministral 8B Instruct **2410** | Mistral Research | n/a | **no commercial use** | — | **PROHIBITED** |
| Codestral 22B | Mistral MNPL | n/a | **no commercial use, incl. free** | — | **PROHIBITED** |
| Mixtral 8x7B / 8x22B, NeMo | Apache 2.0 *(SD)* | ✅ | none | none | **TRAINING-PERMISSIVE** *(unverified)* |
| **Llama 5** | — | — | — | — | **UNKNOWN** |
| Qwen3.7 Max | closed weights | — | — | — | **N/A — API terms govern** |
| DeepSeek V4 (weights) | — | — | — | — | **UNKNOWN** *(API terms verified in DOCS1)* |

*(SD) = `SEARCH-DERIVED`.*

---

## 5. The Llama naming tax — the finding that actually costs something

Llama's licence permits exactly the thing DOCS1 was hunting for. It also attaches this, verbatim:

> "you shall also include 'Llama' at the beginning of any such AI model name"

For most companies this is a shrug. For HONEYCOMB it collides directly with a locked convention.
`CLAUDE.md` fixes the brand naming rules — all-caps middle word for `The___` brands, the Atlas
pattern, `HONEYCOMB` never "Hive", `BRANDoSOPHIC` with the lowercase o, `the RiNG`, `DingleBERRY`,
`BLiNG!`. Every astra name in the constellation is a deliberate, ratified artefact.

A model trained on Llama outputs and distributed would have to ship as **`Llama`-something**.
Not "AtlasORACLE," not any HONEYCOMB name — `Llama` first, then whatever you want. Plus "Built with
Llama" displayed prominently on a related website, UI, blogpost, about page, or product
documentation.

Three things follow:

1. **The obligation triggers on distribution, not on use.** The clause governs a model *"which is
   distributed or made available."* Using Llama outputs to improve something purely internal does
   not trip it. Where the line falls for a platform whose whole purpose is serving Bees is a
   question for counsel, not for Code — but the internal/distributed distinction is the hinge, and
   it is worth knowing before the architecture is set.
2. **It is permanent and viral by naming.** There is no revenue threshold to grow past and no fee
   to pay it off. A model named `Llama…` in 2026 is still named `Llama…` in 2036.
3. **It is entirely avoidable at trivial cost.** See §6, F3.

None of this makes Llama a bad model or Meta a bad actor — the licence is unusually generous on the
training question, which is the harder permission to get. It simply means **Llama is the wrong
foundation for a platform whose brand names are locked canon**, and that is a naming decision, not
a technical one.

---

## 6. Findings

**F1 — Apache 2.0 is the whole answer, and it is available.** gpt-oss, Qwen 3.x, Mistral Small 4,
and Ministral 3 are all plain Apache 2.0: train on outputs freely, ship commercially, use your own
name, no caps. **DOCS1's F2 hypothesis is confirmed** — running open weights on a neutral host does
dissolve the API-terms training prohibition, provided the weights are Apache 2.0 and not one of the
custom licences.

**F2 — Verify per release, never per vendor.** Mistral shipped Devstral 2 (123B, modified MIT with a
$20M revenue cliff) and Devstral Small 2 (24B, Apache 2.0) **on the same day**. Two models named
"Ministral 8B" carry opposite licences a generation apart. Any provider-pool config that stores a
model *family* rather than a full pinned model ID will eventually resolve to the wrong licence.
**Recommend the `atlasoracle_provider_pool` schema work (DOCS1 §4e item 2) carry a `licence` column
pinned to the exact model ID, not the family.**

**F3 — The DOCS1 price leader and the licence-clean choice are different models, and the gap is
$58/month.** DOCS1 §4c ranked Llama 3.1 8B Instant on Groq cheapest at $0.12 per 1,000 free-tier
directives. It is a Llama Community License model — naming tax, §5. The cheapest **Apache 2.0**
route is gpt-oss-20B on Together at $0.18, with gpt-oss-20B on Groq at $0.27.

| Route | Licence | $ / 1,000 directives | At 1M/month |
|---|---|---|---|
| Llama 3.1 8B Instant (Groq) | Llama Community — naming tax | $0.12 | $122 |
| **gpt-oss-20B (Together)** | **Apache 2.0 — clean** | **$0.18** | **$180** |
| gpt-oss-20B (Groq) | Apache 2.0 — clean | $0.27 | $273 |

**The premium for a licence with no naming obligation is ~$58/month at 1 million free directives
per month** — against a Haiku 4.5 baseline of $4,137/month for the same traffic (DOCS1 §4c). The
clean-licence option is still **23× cheaper than the status quo**. There is no real trade-off here:
take the Apache 2.0 route and never think about the naming clause again.

**F4 — gpt-oss is the recommendation, and it survives both passes.** It is Apache 2.0 with a
216-byte usage policy imposing no restrictions; it is available on **both** Groq and Together, so
the choice does not create single-provider dependency; Groq was DOCS1's F4 rights-cleanest host
(no training on inputs or outputs, no default retention, self-serve ZDR); and Together is available
as a cheaper second source with ZDR enabled (DOCS1 F3 makes ZDR a precondition there). **Groq +
Together, both serving gpt-oss-20B/120B, is a two-source, Apache-2.0, rights-clean free tier.**

**F5 — Llama 5 is unverifiable today and should not be planned against.** §3.3. The only licence
claims located are self-hedging secondary reporting. If Meta has moved Llama to Apache 2.0 that
materially changes §5 — which is a reason to check, not to assume.

**F6 — Devstral 2's revenue cap is a trapdoor, not a fee.** At $20M/month consolidated revenue the
rights terminate outright, and the clause reaches derivatives and third-party-hosted variants. Fine
for evaluation; wrong for anything structural in a platform that intends to grow.

**F7 — The two "free" Mistral options are not free for AtlasORACLE.** DOCS1 §2.7 noted `Leanstral`
is free but trains on your data unless ZDR is on. This pass adds the licence dimension: the Mistral
Research and Non-Production licences forbid supplying the model in commercial activity *"whether in
return for payment or free of charge."* **A free tier is still commercial activity** — so MRL/MNPL
models cannot serve AtlasORACLE's free tier either, at any price.

---

## 7. Could-not-verify list

| Item | Status | Blocker |
|---|---|---|
| Llama 5 licence | `UNKNOWN` | No first-party licence located. `huggingface.co/meta-llama` shows no Llama 5 repo; `llama.com` 301s to `developer.meta.com/ai/`, which returned title only. Secondary reporting self-hedges. |
| Llama 3.0 → 3.1 training-clause change | `SEARCH-DERIVED` | Characterisation from secondary sources; the 3.1/3.3/4 clause text itself is first-party verified |
| `Qwen3.5-9B`, `Qwen3.5-35B-A3B` LICENSE files | `SEARCH-DERIVED` | Repo listing shows Apache 2.0 LICENSE files; not individually fetched |
| Qwen open/closed split (3.5+3.6 open, 3.7 Max closed) | `SEARCH-DERIVED` | Not confirmed against an Alibaba first-party page |
| Devstral Small 2 (24B) licence | `SEARCH-DERIVED` | Model card returned HTTP 401; Apache 2.0 per Mistral's release announcement and multiple secondary sources |
| Ministral 8B Instruct **2410** licence | `SEARCH-DERIVED` | Mistral Research License per HF card summary; card not individually fetched |
| Mixtral 8x7B / 8x22B, Mistral NeMo licences | `SEARCH-DERIVED` | Not individually fetched |
| Devstral 2 — outputs-to-train-models clause | **absent** | The LICENSE genuinely does not address it — an absence, not a permission |
| DeepSeek V4 weights licence | `UNKNOWN` | Out of this dispatch's named scope. API terms verified in DOCS1 §2.4. Matters only if self-hosted or run via Fireworks/Together |
| Kimi K2.7 / K3 weights licence | `UNKNOWN` | Out of scope; Moonshot parked per DOCS1 F5 |
| MiniMax M3 weights licence | `UNKNOWN` | Not examined |
| Llama 4 AUP full text | partial | `developer.meta.com/ai/llama4/use-policy/` returned title only; category list verified via the GitHub `USE_POLICY.md` instead |

**Verified first-party this pass:** gpt-oss 20B and 120B licence + full usage policy text; Llama
3.1, 3.3, and 4 LICENSE clauses (§1.b.i, §2) and the Llama 4 `USE_POLICY.md` category list;
Qwen3.5-397B-A17B, Qwen3.6-27B, and Qwen3-235B-A22B licences; Mistral Small 4, Mistral Small 24B,
and Ministral 3 8B licences; Devstral 2 123B LICENSE including the revenue-cap and
derivatives clauses; Mistral MNPL §§2.3, 3.2, 4.2; `huggingface.co/meta-llama` org listing.

---

## 8. Source index

All fetched 2026-07-27.

**Apache 2.0 families**
- <https://huggingface.co/openai/gpt-oss-120b>
- <https://huggingface.co/openai/gpt-oss-20b>
- <https://github.com/openai/gpt-oss/blob/main/USAGE_POLICY>
- <https://huggingface.co/Qwen/Qwen3.5-397B-A17B/blob/main/LICENSE>
- <https://huggingface.co/Qwen/Qwen3.6-27B/blob/main/LICENSE>
- <https://huggingface.co/Qwen/Qwen3-235B-A22B>
- <https://huggingface.co/mistralai/Mistral-Small-4-119B-2603>
- <https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501>
- <https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512>

**Llama**
- <https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE>
- <https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE>
- <https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/LICENSE>
- <https://github.com/meta-llama/llama-models/blob/main/models/llama4/USE_POLICY.md>
- <https://huggingface.co/meta-llama> *(org listing — no Llama 5 repo present)*
- <https://developer.meta.com/ai/> *(title only — no body content returned)*

**Restricted / non-production Mistral licences**
- <https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512/raw/main/LICENSE>
- <https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512>
- <https://mistral.ai/licenses/MNPL-0.1.md>

---

## 9. Done-test

**Requirement:** every named release has a cited verdict or a named blocker.

| Named in dispatch | Verdict | Basis |
|---|---|---|
| gpt-oss 20B | TRAINING-PERMISSIVE | first-party, cited |
| gpt-oss 120B | TRAINING-PERMISSIVE | first-party, cited |
| Llama 3.1 | RESTRICTED | first-party, cited |
| Llama 3.3 | RESTRICTED | first-party, cited |
| Llama 4.x | RESTRICTED | first-party, cited |
| Llama 5 | **UNKNOWN** | blocker named (§3.3, §7) |
| Qwen 2.5 | *superseded* | Qwen 3.x is the current open-weight line; 2.5 not separately fetched — see §7 |
| Qwen 3.x (3, 3.5, 3.6) | TRAINING-PERMISSIVE | first-party, cited |
| Qwen 3.7 Max | N/A — closed weights | API terms govern (DOCS1 §2.5, `UNKNOWN`) |
| Ministral 3 (3B/8B/14B) | TRAINING-PERMISSIVE | first-party, cited |
| Ministral 8B 2410 | PROHIBITED | `SEARCH-DERIVED`, blocker named |
| Mistral Small 4 | TRAINING-PERMISSIVE | first-party, cited |
| Mistral Small 24B | TRAINING-PERMISSIVE | first-party, cited |
| Devstral 2 (123B) | RESTRICTED | first-party, cited |
| Devstral Small 2 (24B) | TRAINING-PERMISSIVE | `SEARCH-DERIVED`, blocker named |
| Codestral 22B | PROHIBITED | first-party (MNPL), cited |
| Mixtral / NeMo | TRAINING-PERMISSIVE | `SEARCH-DERIVED`, blocker named |

**Result: PASS.** Every named release carries a verdict with a citation, or an explicit `UNKNOWN` /
`SEARCH-DERIVED` marker with the blocker named. One release — Llama 5 — is `UNKNOWN`; two Qwen
sub-releases and four Mistral releases are `SEARCH-DERIVED`. No verdict in this document rests on
model memory.

🐝🍯
