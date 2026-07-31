# AtlasORACLE — THE PROVIDER MAP

**Pass:** DOCS12 · **Date:** 2026-07-30 · **Scope:** oracle
**Consolidation, not new research.** Five matrices folded into one table so ORACLE can answer
*"what can we route to, and at what rights cost"* without opening five files.

**Inputs:** DOCS1 `atlasoracle-provider-expansion-matrix-2026-07-27.md` (text/reasoning) ·
DOCS4 `atlasoracle-media-provider-matrix-2026-07-27.md` (video/image) ·
DOCS9 `atlasoracle-music-audio-provider-matrix-2026-07-30.md` ·
DOCS10 `atlasoracle-persona-stack-matrix-2026-07-30.md` ·
DOCS11 `atlasoracle-embeddings-retrieval-matrix-2026-07-30.md`.

**No code, no schema, no account, zero spend. No provider recommended, no build proposed.**
Nothing was re-fetched: every cell below is carried from a source matrix with its pass named, so
any cell can be traced back to the fetch that established it.

---

## 0. The unit of this table is a ROUTE, not a model

From **DOCS10 finding P3**, which is the reason this document has the shape it has:

> *"A voice sample sent **direct to ElevenLabs** is covered by an opt-out you control. The same
> sample, sent to the same model through Runway, is training data forever. The Bee sees one model
> name and one output; the rights outcome is opposite."*

So **rights follow the route.** Runway's own API bills `eleven_v3`, `eleven_multilingual_v2`,
`eleven_text_to_sound_v2`, `eleven_voice_isolation`, `eleven_voice_dubbing`,
`eleven_multilingual_sts_v2`, `magnific_precision_upscaler_v2` and
`magnific_video_upscaler_creative` — and every one of them, reached that way, is governed by
Runway's §4.4 rather than by the vendor's own terms.

**Consequence for the table:** where one model is reachable by two routes with different terms it
gets **two rows, and they are placed adjacent so they disagree visibly.** Four such pairs exist and
are marked **⇄**.

**Consequence for ORACLE:** a model-name allowlist is not sufficient and would be actively
misleading. The router must record and enforce the **path**. Marked LEAD INPUT in DOCS10; not
designed here.

---

## 1. THE MASTER TABLE

**ADMISSIBLE** applies the ratified standing rule from DOCS1 **F3** — *no Bee directive content to
any provider that trains by default, regardless of price* — plus DOCS9/DOCS11's gate that a
provider without first-party developer docs is inadmissible for a paid route.

| # | Category | Provider · ROUTE | Official API | Trains on input? | Customer owns? | Price anchor (source pass) | **ADMISSIBLE?** |
|---|---|---|---|---|---|---|---|
| 1 | Text | **OpenAI** · direct | Yes | **No** — human-read §4.2, `ORACLE_TOS_VERIFIED v0.1` | Yes; may not train a competing model on Output | `gpt-5.4-nano` $0.20/$1.25 per 1M · `gpt-5.6-sol` $5.00/$30.00 (DOCS1, 07-27) | **YES** |
| 2 | Text | **xAI (Grok)** · direct | Yes | **No** — Enterprise/API ToS §3.3, human-read | Yes; §3.1 flat bar on training on outputs | (DOCS1, 07-27) | **YES** — ZDR preferred; non-ZDR retains ≤30 days |
| 3 | Text | **Google Gemini** · direct, **PAID** | Yes | **No** (paid tier) | Yes | (DOCS1, 07-27) | **YES** |
| 4 | Text | ⇄ **Google Gemini** · direct, **FREE tier** | Yes | **YES — and permits human review** | Yes | free (DOCS1 F6, 07-27) | **NO** — F3; DOCS1 F6 calls it "free with a data price" |
| 5 | Text | **DeepSeek** · direct | Yes | **UNKNOWN** — terms *silent* on training on your inputs | Training on their **outputs** EXPLICITLY PERMITTED — the only unambiguous yes in DOCS1 | (DOCS1, 07-27) | **NO** — silence is not consent under F3 |
| 6 | Text | **Qwen / Alibaba Model Studio** · direct | Yes | **UNKNOWN** — Model Studio terms not read | UNKNOWN | Alibaba Intl. undercut by Together (DOCS1 §2.5, 07-27) | **NO** — unread terms |
| 7 | Text | **Kimi / Moonshot** · direct | Yes | **YES by default**; opt-out only via negotiated enterprise agreement | Not cleanly prohibited, not permitted | (DOCS1 §2.6, 07-27) | **NO** — F3, and DOCS1 F5 says *park it* |
| 8 | Text | **Mistral** · direct | Yes | **Partial** — free tier + un-opted Vibe Pro/Teams train; `Leanstral` trains unless ZDR | Partially prohibited | (DOCS1 §2.7, 07-27) | **CONDITIONAL** — paid + ZDR only |
| 9 | Text | **Groq** · direct (OSS host) | Yes | **No** — no training, no default retention, self-serve ZDR, US data location | Model licence is the only binding constraint | (DOCS1 §3.1, 07-27) | **YES** — DOCS1 F4: *"the canon-designated path and the rights-cleanest path are the same path"* |
| 10 | Text | **Together AI** · direct | Yes | **YES by default** — opt-out is Zero Data Retention | Broadly prohibited | (DOCS1 §3.2, 07-27) | **CONDITIONAL** — ZDR is a hard precondition (F3) |
| 11 | Text | **Fireworks AI** · direct | Yes | **UNKNOWN** — ToS PDF 308-redirects, unread by a human | UNKNOWN | (DOCS1 §3.3, 07-27) | **NO (provisional)** — *likely* admissible on live signals; PDF unread |
| 12 | Text | **OpenRouter** · aggregator | Yes | Opt-out enforced **by routing, not by contract** | UNKNOWN | (DOCS1 §3.4, 07-27) | **NO** — DOCS1 calls the contractual layer poor |
| 13 | Video/Image | **Runway** · direct **STANDARD** | Yes — `dev.runwayml.com`, async+poll | **YES — inputs AND outputs, no opt-out, perpetual + irrevocable, survives cancellation** (§4.4) | You own; *"does not restrict your commercial use"* | credits $0.01 · video $0.05–$1.50/sec (DOCS4, 07-27) | **NO** — DOCS4 M1, unchanged by DOCS10 |
| 14 | Video/Image | ⇄ **Runway** · direct **ENTERPRISE** | Yes | **No — contractually barred.** Enterprise §5.2: *"Runway may not use Customer Content as training data for the Services."* | Customer owns; 30-day export then deletion (§10.4) | same rate card; Enterprise agreement required | **YES on the training test** — DOCS10 P2. The condition is **commercial, not technical** — a Butch decision |
| 15 | Video/Image | **Google Veo 3.1** · direct paid | Yes | No (paid) | Yes | $0.05/sec Lite 720p → $0.60/sec 4K (DOCS4, 07-27) | **YES** |
| 16 | Image | **Google Gemini image** · direct paid | Yes | No (paid) | Yes | Gemini 2.5 Flash Image **$0.039/image** (DOCS4, 07-27) | **YES** |
| 17 | Video/Image | **Grok Imagine** · direct (xAI) | Yes | **No** — §3.3 | Yes; §3.1 bars training on outputs | image **$0.02** · video **$0.050/sec** (DOCS4, 07-27) | **YES** — DOCS4: strongest rights-per-dollar in that matrix |
| 18 | Video | **Kling** · direct | Yes — portal returned **HTTP 446**, auth UNKNOWN | **YES — with a revocable opt-out by email** to `support@kling.ai` | **CONTRADICTORY across sources → UNKNOWN** (see §3) | `SEARCH-DERIVED` only | **NO** — trains by default; opt-out is by email and revocable |
| 19 | Video | **Seedance (ByteDance)** · direct via BytePlus/Volcengine | Yes | **UNKNOWN** — not read; DOCS4 calls this a high-priority read | UNKNOWN | `SEARCH-DERIVED`, sources disagree **~3×** | **NO** — unread terms + DOCS4 M3: reported **not available in the US** |
| 20 | Video | ⇄ **Seedance** · **via Runway standard** | Yes (Runway's) | **YES** — Runway §4.4 attaches | per Runway | **$1.50/sec** (Seedance2 4K, first-party Runway, 07-27) | **NO** — inherits Runway standard |
| 21 | Video | **Pika** · **via fal.ai only** | No direct API — *"Get the power of Pika's video models … on Fal AI"*, first-party | **UNKNOWN ×2** — fal's terms **and** Pika's, neither read | UNKNOWN | fal's price, not Pika's — UNKNOWN | **NO** — two unread term sets stacked |
| 22 | Music | **ElevenLabs Music** · direct | Yes — `POST /v1/music`, `xi-api-key`, sync | **YES — with a real in-product opt-out** (DOCS10) | *"you retain all rights in and to your Output"* (DOCS10) — **closes DOCS9's UNKNOWN**, see §3 | **$0.150/min** (DOCS9, 07-30) | **CONDITIONAL** — opt-out must be on; **carve-out: no film, TV or "Studio Games" on self-serve** |
| 23 | Music/Voice | ⇄ **ElevenLabs models** · **via Runway standard** | Yes (Runway's) | **YES — no opt-out, perpetual, irrevocable** | Runway §4.4 | per Runway credits | **NO** — **this is finding P3's exact case.** Same model as row 22, opposite outcome |
| 24 | Music | **Stability — Stable Audio** · direct | Yes — `POST /v2beta/audio/stable-audio-2/audio-to-audio` | **UNKNOWN** — licence page does not address it | **Yes** — *"you own outputs generated from the Core Models"* | **SEARCH-DERIVED only** (pricing page renders as a shell) | **CONDITIONAL** — free under **$1M annual revenue**, Enterprise licence above |
| 25 | Music | **Google Lyria** · direct (Vertex) | Yes (exists) | UNKNOWN | UNKNOWN | **UNKNOWN** — no Lyria row on the pricing page; docs render as nav shells | **UNKNOWN** — cannot be assessed |
| 26 | Music | **Beatoven.ai** · direct | Yes — *"Create your API key"* | UNKNOWN | UNKNOWN | UNKNOWN | **UNKNOWN** — claims *"always cleared for commercial use"*, unverified |
| 27 | Music/Infra | **Replicate** · aggregator | Yes | UNKNOWN | UNKNOWN — billing page silent on output ownership | **time-based**: *"billed for the compute time used"* (DOCS9, 07-30) | **UNKNOWN** |
| 28 | Audio/stems | **LALAL.AI** · direct | Yes — docs + OpenAPI spec published | UNKNOWN | UNKNOWN | UNKNOWN | **UNKNOWN** |
| 29 | Music | **Suno** · direct | **NO — no first-party developer docs.** Terms eff. 2026-03-26 contain no mention of an API | **YES** — licence covers *"the artificial intelligence and machine learning models related to the Service"* | Paid: assigned, **but "no representation or warranty that any copyright will vest"**. Free: non-commercial | — | **NO — inadmissible on the official-API gate alone** |
| 30 | Music | **Suno** · via any reseller/wrapper | **NO — UNOFFICIAL** | inherits | inherits | — | **NO** — provenance **unestablishable**; DOCS9 |
| 31 | Music | **Udio** · direct | **NO** — *"we don't currently offer a public API"* (2025-03-12) | UNKNOWN | UNKNOWN | — | **NO** — no API |
| 32 | Persona | **HeyGen** · direct | Yes | **YES — irrevocable licence to train, no opt-out found, paid plans included** | You own output + avatar; *"may, but is not obligated to, delete"* | (DOCS10, 07-30) | **NO** — F3. Best consent capture, worst training posture (P1) |
| 33 | Persona | **Synthesia** · direct | Yes | **No pre-training on customer data** | **Synthesia owns the avatar and it CANNOT be exported**; avatar deleted on lapse | Creator+ plans (DOCS10, 07-30) | **CONDITIONAL** — clean on training, **fails on lock-in** (P4: *"a trained persona is a hostage"*) |
| 34 | Persona | **Hedra** · direct | Yes | **UNKNOWN — terms silent** | *"you are the owner of all right, title and interest in Your Content"* | (DOCS10, 07-30) | **NO** — P5: *silence is a risk transfer, not a permission* |
| 35 | Persona | **Magic Hour** · direct | Yes | **YES — no opt-out found** | *"you own all Assets you create"* | (DOCS10, 07-30) | **NO** — F3, and **no consent requirement in its terms at all** |
| 36 | Image edit | **Magnific / Freepik** · direct | Yes | UNKNOWN | **UNKNOWN** — separate AI-output contract unread | (DOCS10, 07-30) | **UNKNOWN** |
| 37 | Image edit | ⇄ **Magnific** · **via Runway standard** | Yes (Runway's) | **YES** — §4.4 attaches | Runway §4.4 | per Runway credits | **NO** — inherits Runway standard |
| 38 | Embeddings | **OpenAI** `text-embedding-3-small` | Yes | **UNKNOWN** — data-usage policy **403** to the fetcher | UNKNOWN | **$0.02 / 1M** (DOCS11, 07-30) | **CONDITIONAL** — row 1's human-read §4.2 covers the API generally; embeddings not separately confirmed |
| 39 | Embeddings | **OpenAI** `text-embedding-3-large` | Yes | UNKNOWN (same 403) | UNKNOWN | **$0.13 / 1M** | **CONDITIONAL** |
| 40 | Embeddings | **Voyage** `voyage-4-lite` / `-4` / `-4-large` | Yes | UNKNOWN | UNKNOWN | **$0.02 / $0.06 / $0.12 per 1M**, 200M free; batch **−33%** | **UNKNOWN** |
| 41 | Embeddings | **Cohere** Embed 4 | Yes | UNKNOWN | UNKNOWN | **per-token UNKNOWN**; Model Vault **$4.00/hr or $2,500/mo** (Small) | **UNKNOWN** |
| 42 | Embeddings | **Google** `gemini-embedding` | Yes | UNKNOWN | UNKNOWN | UNKNOWN — not fetched | **UNKNOWN** |
| 43 | Embeddings | **Groq** | **NOT APPLICABLE — serves no embedding models** | — | — | — | — |
| 44 | Rerank | **Voyage** `rerank-2.5` / `-lite` | Yes | UNKNOWN | UNKNOWN | **$0.05 / $0.02 per 1M**, 200M free | **UNKNOWN** — and **not needed**: DOCS11 says a cache is a single NN lookup, not a ranking problem |
| 45 | Rerank | **Cohere** Rerank 3.5 / 4 | Yes | UNKNOWN | UNKNOWN | **$5.00/hr · $3,250/mo** (Medium) → **$10.00/hr · $6,500/mo** (4 Pro Large) | **UNKNOWN** — same "not needed" |
| 46 | Open weights | **Qwen3-Embedding-8B** · self-host | n/a — weights | n/a | n/a — **Apache 2.0** | hosting cost only | **YES on licence** — no OSS embedding route exists in this stack (row 43) |
| 47 | Open weights | **BAAI/bge-m3** · self-host | n/a — weights | n/a | n/a — **MIT** | hosting cost only | **YES on licence** — same caveat |
| 48 | Aggregator | **fal.ai** · aggregator | Yes | **UNKNOWN** — terms never read across five passes | UNKNOWN | per-model | **UNKNOWN** — carries Veo 3.1, Kling 3.0, Seedance 2.0, Pika (`SEARCH-DERIVED` except Pika, first-party) |

**48 rows · 4 route-pairs marked ⇄ (4/13-14, 22/23, 19/20, 36/37) · every provider from all five
matrices present.**

---

## 2. DOCS4 corrections — applied, each marked with its correcting pass

Per the dispatch. **All three are corrected by DOCS10 (2026-07-30).**

| DOCS4 claim | Status | Correcting pass | What now stands |
|---|---|---|---|
| **M4 — "Runway is direct-only"** | **FALLS** | **DOCS10 §4.1** | Runway is *itself an aggregator*: its API bills ElevenLabs and Magnific models (§0). The direct-only reading is withdrawn |
| **The three-adapter conclusion** | **WITHDRAWN — must not be quoted again** | **DOCS10 §4.1** | It rested on M4. With M4 gone the adapter count is not established, and no replacement count is asserted here |
| **"Aleph 2.0 API access moved to Enterprise in Jan 2026"** | **NOT SUPPORTED** | **DOCS10 §4.2** | Do not carry forward |
| **M1 — "Runway inadmissible, Enterprise unread"** | **HALF-CLOSED** | **DOCS10 §4.3 / P2** | Enterprise Terms **§5.2 now read**: *"Runway may not use Customer Content as training data."* **Standard stays inadmissible (row 13); Enterprise is admissible on the training test (row 14)** |
| **M2 — Gen-4 Aleph sunset 2026-07-30** | **CONFIRMED, by disappearance** | **DOCS10 §4.3** | The date was *today* |

---

## 3. Contradictions — listed, **not resolved**

Per the dispatch: *"An unresolved contradiction that is visible is worth more than a resolved one
that is guessed."* Nothing below is picked.

**C1 — Kling output ownership / commercial use.** One source: paid users retain copyright and may
use commercially without watermark. Another: outputs may not be used commercially without written
permission, and the Kling brand must be shown. **Both `SEARCH-DERIVED`, DOCS4 §3.3, 2026-07-27.**
First-party page to read: `kling.ai/docs/user-policy`. **Not picked.**

**C2 — Runway free-tier commercial use.** DOCS4 and DOCS10 both record that the **first-party**
§4.4 text shows *no tier split* on commercial rights, while **secondary sources** claim free-tier
output is non-commercial. Sources: `runway.com/terms-of-use` (first-party, last updated
2026-05-11, read by DOCS10) vs unnamed secondary (DOCS4, 2026-07-27). **This is first-party vs
SEARCH-DERIVED rather than two equal readings** — but it has now survived two passes unresolved, so
it stays on the list. **Not picked.**

**C3 — Seedance pricing, ~3× spread.** $0.073/sec, $0.15 per 5-sec clip, and $0.247/sec from three
sources (DOCS4 §3.4, all `SEARCH-DERIVED`, 2026-07-27). **No Seedance figure should be used for
budgeting.** **Not picked.**

**C4 — Fireworks admissibility.** DOCS1 §3.3 marks the training verdict `UNKNOWN` (ToS PDF
308-redirects, unread) while DOCS1 §6 records live signals suggesting **likely** admissible. The
document contradicts itself in tone across two sections. **Held at NO (provisional), row 11.**

### Two DOCS9 UNKNOWNs that DOCS10 actually closed — the consolidation dividend

These are **not** contradictions; they are gaps one matrix could not fill and another did. They are
the clearest argument that this document needed writing:

- **ElevenLabs output ownership.** DOCS9 marked it UNKNOWN because
  `elevenlabs.io/music/eleven-music-model-specific-terms` — the URL ElevenLabs itself publishes —
  **404s**. DOCS10, reading the voice-side terms, records *"you retain all rights in and to your
  Output."* **Carried into row 22.**
- **ElevenLabs training on inputs.** DOCS9: UNKNOWN. DOCS10: **YES, with a real in-product
  opt-out.** **Carried into row 22, and it changes the verdict from UNKNOWN to CONDITIONAL.**

**One caution on both:** DOCS10 read the terms governing the **voice** products. Whether they
govern **Eleven Music** identically is *not* established — the music-specific terms are still the
404. **Flagged, not resolved.**

---

## 4. What the map shows that no single matrix could

Observations, not recommendations.

1. **Only six rows are unconditionally admissible today** — OpenAI text (1), xAI text (2), Gemini
   paid text (3), Groq (9), Veo 3.1 paid (15), Gemini image (16), Grok Imagine (17). **Every one of
   them is text or video/image. Not one music, persona, embedding or rerank row clears
   unconditionally**, and the reason is nearly always the same: the terms were never read, or the
   provider trains by default.
2. **The rights-cleanest providers are also among the cheapest.** Grok Imagine at $0.02/image and
   $0.050/sec doesn't train; Runway at up to $1.50/sec takes a perpetual irrevocable training
   licence. **Rights quality and price are not trading against each other in this table**, which is
   the opposite of the intuition a build plan would start from.
3. **The route-pairs are where the money and the risk actually live.** Rows 22/23 are the same
   ElevenLabs model with opposite rights outcomes. **A router that stores model names cannot
   express the difference.**
4. **`fal.ai` has never had its terms read**, across five passes — and it is the *only* route to
   Pika and a route to Veo, Kling and Seedance. **It is the single highest-value unread document in
   the set.**
5. **Three providers are inadmissible on the official-API gate alone** (Suno direct, Suno via
   resellers, Udio) — before any rights question is asked.

---

## 5. Could-not-verify

Nothing was re-fetched this pass; every UNKNOWN above is inherited with its original blocker. The
inherited blockers that matter most, in order:

| Item | Blocker | Owed by |
|---|---|---|
| **fal.ai terms** | Never read in five passes | any future media pass |
| Seedance training/ownership | Not read; DOCS4 calls it high-priority | DOCS4 follow-up |
| Kling first-party user policy | `HTTP 446` to the fetcher | DOCS4 follow-up |
| Fireworks ToS | PDF 308-redirects | DOCS1 follow-up |
| OpenAI API data-usage policy | **HTTP 403** | DOCS11 follow-up |
| Eleven **Music**-specific terms | **404** on ElevenLabs' own published URL | DOCS9 follow-up |
| Alibaba Model Studio terms | Not read | DOCS1 follow-up |
| Magnific AI-output contract | Separate contract, unread | DOCS10 follow-up |
| Google Lyria — everything but existence | Vertex docs render as nav shells | DOCS9 follow-up |

---

## 6. Done-test

| Requirement | Status |
|---|---|
| Every provider from all five matrices present exactly once | **Met** — 48 rows |
| …or twice where routes differ, deliberately | **Met** — 4 pairs marked ⇄, placed adjacent so they disagree visibly |
| Route column populated for every row | **Met** — direct / via-Runway / via-fal / aggregator / self-host |
| Every DOCS4 correction marked with its correcting pass | **Met** — §2, all five attributed to DOCS10 with section numbers |
| Contradictions listed unresolved with both sources | **Met** — §3, C1–C4, none picked |
| No provider recommended, no build proposed | **Met** — §4 is observations |

**Zero spend. Nothing fetched, nothing applied, nothing enabled.**
