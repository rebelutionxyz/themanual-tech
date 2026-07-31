# AtlasORACLE — AI PERSONA STACK Matrix

**Pass:** DOCS10 · **Lane:** docs · **Workdir:** TheMANUAL.tech · **Scope:** oracle
**Fetch date for every price, quote and term in this document: 2026-07-30.**
**Status:** research and documentation only. No code, no schema, no account created, no media generated, **zero spend**. No provider chosen, no build recommended.

**Set membership:** fourth ORACLE matrix. Companions — `atlasoracle-provider-expansion-matrix-2026-07-27.md` (text/LLM, DOCS1–3), `atlasoracle-media-provider-matrix-2026-07-27.md` (video+image, DOCS4), `atlasoracle-music-audio-provider-matrix-2026-07-30.md` (music generation, DOCS9). This one holds **performance transfer, avatars, and voice cloning** — the providers that ingest a *real person* — plus the **three corrections owed to DOCS4**.

---

## 0. Reading rules

- **Every cell is (a) cited to a first-party URL fetched 2026-07-30, (b) marked `SEARCH-DERIVED` with the blocker named, or (c) `UNKNOWN` with the reason.** Zero figures from model memory.
- **`OFFICIAL` / `UNOFFICIAL` is a mandatory column**, carried over from DOCS9. No first-party developer docs → `UNOFFICIAL` → **inadmissible for a paid route. No exceptions.**
- Prices are USD, exclusive of tax, at rates published on the fetch date.
- Where a vendor's own app-side page and its developer docs disagree, **the developer docs win for API questions and the legal page wins for rights questions**, and the disagreement is recorded rather than smoothed.
- **Nothing in §3 is a legal opinion.** Publicity-rights and right-of-likeness questions are marked **LEAD INPUT — counsel** and stop there.

---

## 1. The category, stated precisely

Butch's description in chat: *a real person records a performance and it ships as the AI persona / musician / artist she created.* That is real, it is shipping, and it is **not one product category — it is four**, distinguished by **what you hand the machine**. The input shape is the thing that matters, because it decides both the workflow and the rights exposure.

| # | Shape | What you supply | What comes back | Providers in this matrix |
|---|---|---|---|---|
| **A** | **Performance transfer** | A driving performance **video** of a real actor + a character reference (image or clip) | The *character* performing the actor's expressions, head motion, gestures | **Runway Act-Two** |
| **B** | **Image + audio → talking video** | A **static image** + an audio track (or script) | A new video of that face speaking | **Hedra**, **HeyGen** (photo avatar), **Magic Hour** (talking photo) |
| **C** | **Footage transformation** | Footage that **already exists** | The same footage, altered — face swapped, lips re-synced, restyled | **Magic Hour**, **Magnific** (upscale/edit) |
| **D** | **Trained digital twin** | 30 s–several minutes of **enrolment footage**, trained once, reused forever | A persistent avatar that speaks any script on demand | **HeyGen** (Digital Twin), **Synthesia** (Personal Avatar) |
| **V** | **Voice** | 2 minutes to 3 hours of a real voice | A reusable synthetic voice | **ElevenLabs** (IVC / PVC) |

**Why the taxonomy earns its place:** A and D look alike from outside and are opposites underneath. **A is per-shot and stateless** — the actor performs every time, nothing about her is retained as a model artifact, and the "persona" exists only in the output file. **D is enrolled and persistent** — the person's likeness becomes a *stored trained asset on the vendor's servers*, and §3 shows that asset is frequently **not exportable and dies with the subscription.** For a platform that promises sovereignty, A and D are not interchangeable, whatever the demo reels suggest.

Butch's framing — *a real person records a performance and it ships as the persona she created* — is **shape A**, and Act-Two is the closest match on the market. The lead seed was right about that.

---

## 2. The matrix

### 2.0 Official / unofficial — the gate, applied first

| Provider | First-party developer docs | Verdict |
|---|---|---|
| **Runway** (Act-Two, Aleph 2.0) | `docs.dev.runwayml.com` | **OFFICIAL** |
| **HeyGen** | `developers.heygen.com` | **OFFICIAL** |
| **Synthesia** | `docs.synthesia.io` | **OFFICIAL** |
| **ElevenLabs** | `elevenlabs.io/docs` | **OFFICIAL** |
| **Magic Hour** | `docs.magichour.ai` | **OFFICIAL** |
| **Magnific / Freepik** | `docs.magnific.com` | **OFFICIAL** |
| **Hedra** | `hedra.com/docs` + `api.hedra.com/web-app/public` | **OFFICIAL** |

**All seven rows are OFFICIAL.** This is the opposite of DOCS9, where the flagship (Suno) was closed and the gate did real work. Here the gate excludes nobody — which means **the discriminator in this category is not API access, it is rights** (§3). That is why §3 leads the analysis rather than the API mechanics.

### 2.1 Runway — Act-Two (shape A)

| Dimension | Finding |
|---|---|
| **Model id** | `act_two` — **"Image or Video" → Video**. First-party model list, <https://docs.dev.runwayml.com/guides/models/>. |
| **What it does** | Generative motion capture: a driving performance video drives a character reference. `SEARCH-DERIVED` for the mechanics description (Runway's help-centre article `help.runwayml.com/hc/en-us/articles/42311337895827` returned **HTTP 403** to the fetcher). First-party changelog, **Jul 17 2025**: *"Next-generation motion capture model with major improvements in generation quality and support for head, face, body and hand tracking."* <https://runway.com/changelog> |
| **Voice control** | First-party changelog, **Aug 20 2025**: *"Change the voice of your performances directly from within the Act-Two interface, giving you more creative flexibility when generating character performances."* **Note the words "within the Act-Two interface" — this is documented as a product feature, not an API parameter.** Whether the API accepts a separate audio input is **`UNKNOWN`**: the Act-Two API parameter reference was not reachable (three URL shapes tried, all 404). |
| **Price** | **5 credits/sec.** Credits are **$0.01** each — *"Credits can be purchased for $0.01 per credit in the developer portal for an organization"* — so **$0.05/sec**. <https://docs.dev.runwayml.com/guides/pricing/> |
| **Auth / async** | API key, async task submission with polling (carried from DOCS4, unchanged). |
| **Training** | **Standard terms: TRAINS ON INPUTS AND OUTPUTS, NO OPT-OUT. Enterprise terms: DOES NOT TRAIN.** The single most consequential split in this document — §3.1. |

> **The dispatch's premise is confirmed.** Act-Two is the closest commercial match to "a real person records a performance and it ships as the persona she created," it is on the public API at a published self-serve rate, and it is **the cheapest video second in the whole ORACLE set** — tied with Grok Imagine and Veo 3.1 Lite at $0.05/sec (DOCS4 §3.6, §3.2). On price it is unbeatable for this shape. On rights it is the worst row here unless you are on Enterprise.

### 2.2 Hedra — Character-3 (shape B)

| Dimension | Finding |
|---|---|
| **API** | **OFFICIAL.** Base URL `https://api.hedra.com/web-app/public`, auth header **`X-API-Key`**. <https://www.hedra.com/docs/api-reference/public/create-asset> |
| **Mechanics** | Two-step: create an asset record (`POST /assets`, types `text, image, audio, video, voice, three_d, rich_text`), upload via presigned S3 URL, then `POST /generations` → poll `/generations/{generation_id}/status` → *"When `status` is `\"complete\"`, the response includes an `asset_id` for the generated video."* <https://www.hedra.com/docs/pages/developer/guides/generate-video.md> |
| **Models** | A `list-models` endpoint exists — *"Retrieve the list of AI models available through the Hedra API, including image, video, and audio generation models."* **Character-3 was not named in the developer video-generation guide fetched**, which documented `fal/grok-video-t2v` and `fal/grok-video-i2v` instead and pointed avatar/talking-head work to a separate guide that was not reached. **Character-3's API model slug is `UNKNOWN`.** |
| **Price** | Plans first-party, <https://www.hedra.com/pricing>: **Basic $15/mo (1,500 credits) · Creator $30/mo (5,400) · Professional $75/mo (14,400) · Teams $75/mo (14,400) · Enterprise custom.** **Per-second credit cost is `UNKNOWN`** — the credits doc states policy, not rates: *"Credits from your monthly subscription do not carry over between billing cycles."* Secondary sources quote 3.5–7 credits/sec and ~180 credits for a 30-sec 720p clip — `SEARCH-DERIVED`, **do not budget on it**. |
| **Commercial** | *"Commercial use"* listed on **all paid plans**; free/cancelled accounts get *"limited watermarked generations."* |
| **Training** | **`UNKNOWN` — and that is itself the finding.** Hedra's terms as fetched contain **no statement either way** on training. Silence is not consent to a no-training reading. |

> **Structural note the dispatch's framing predicted:** Hedra's own developer guide routes video generation through **`fal/`-prefixed Grok models**. Hedra is partly a reseller too. See §5.

### 2.3 HeyGen — Digital Twin + Photo Avatar (shapes B and D)

| Dimension | Finding |
|---|---|
| **API** | **OFFICIAL.** `X-Api-Key` header; `POST /v3/videos`; poll for `video_id`, or *"use a webhook via `callback_url` to skip polling."* <https://developers.heygen.com/docs/quick-start> |
| **Avatar types** | Four, first-party: **Avatar V** (*"character consistency…across every angle, every expression, and every video"*); **Avatar IV (Digital Twin)** — *"A lifelike avatar trained from real video footage of a person. Once created, you can make it speak any script in any supported voice — no camera or studio required"*; **Avatar IV (Photo Avatar)** — *"Created from a single still image of a person"*; **Instant Avatar**. <https://developers.heygen.com/> |
| **API price** | **1 credit = $0.50.** Avatar V (Digital Twin) **0.1 credits/sec = $0.05/sec** · Avatar IV (Photo/Digital Twin/Studio) 0.1 c/sec · Avatar III 0.0167 c/sec · Lipsync speed 0.05 c/sec, precision 0.1 c/sec · Text-to-Speech 0.000333 c/sec · **Digital Twin creation 1 credit/call = $0.50** · Photo Avatar 1 credit/call · Cinematic avatar 7 credits/video = $3.50. <https://developers.heygen.com/docs/enterprise-pricing> |
| **App plans** | Free $0 (includes *"1 Custom Digital Twin"*) · Creator $29/600 credits · Pro $49/1,000 · Business $149/1,500 (*"5+ Custom Digital Twins"*) · Enterprise custom. <https://www.heygen.com/pricing> — **note these app credits are a different unit from the API credits above; do not cross-multiply.** |
| **Consent** | **The most developed consent machinery in this matrix — §3.3.** |
| **Training** | **Trains, no opt-out found, on paid plans too — §3.3.** |

### 2.4 Synthesia — Personal Avatar (shape D)

| Dimension | Finding |
|---|---|
| **API** | **OFFICIAL**, and **gated**: *"Access to Synthesia's API is available for Creator plans or above."* API-key auth. Rate limits, Creator: 60 writes/min, 300/hr, 1,000/day; reads 60/min, 20k/day; 429 on breach. *"You're limited to 30 test videos per day."* <https://docs.synthesia.io/reference/introduction.md> |
| **Plans** | Basic **$0** (10 min/mo, no personal avatar, no API) · Starter **$29/mo** ($18 yearly, 10 min, no API) · **Creator $89/mo** ($64 yearly, 30 min, **5 Personal Avatars, API access**) · Enterprise custom (unlimited). <https://www.synthesia.io/pricing> |
| **Per-unit price** | **`UNKNOWN`.** Synthesia sells **video minutes inside a plan**, not per-second API metering. There is no published $/sec to compare against Runway or HeyGen. That is a pricing-model difference, not a missing number. |
| **Consent** | **Live consent recording, mandatory — §3.4.** |
| **Training** | **Does not pre-train on customer data — §3.4.** The strongest training posture in this matrix. |
| **Ownership** | **Customer owns the videos. Synthesia owns the avatar, and it cannot be exported — §3.4. The worst lock-in in this matrix.** |

### 2.5 ElevenLabs — voice (shape V)

| Dimension | Finding |
|---|---|
| **API** | **OFFICIAL.** API-key auth; *"HTTP or Websocket requests from any language"* with official bindings; responses carry a `character-cost` header. <https://elevenlabs.io/docs/api-reference/introduction> |
| **IVC — Instant Voice Cloning** | Available to **all users**; *"Less than two minutes of audio can produce a usable clone"*; *"It is immediate. There is no training process."* <https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning> |
| **PVC — Professional Voice Cloning** | *"PVC requires a Creator plan or above."* *"The bare minimum we recommend is 30 minutes of audio"*, optimum *"closer to 2-3 hours."* Ready in minutes to hours. <https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning> |
| **Verification** | *"The verification process uses voice-captcha technology to confirm that you are the person providing the voice samples, rather than using recordings of someone else without their consent."* |
| **Plans** | Free $0/10k credits · **Starter $6/mo, 30k credits — includes "Commercial License" and "Instant Voice Cloning"** · Creator $11/mo ongoing (121k credits, **PVC**) · Pro $99/600k · Scale $299/1.8M/3 seats · Business $990/6M/10 seats · Enterprise custom. <https://elevenlabs.io/pricing> |
| **Ownership / training / commercial** | **§3.5 — the cleanest rights row in this document.** |

*(ElevenLabs **Eleven Music** — the music-generation product, `POST /v1/music` at $0.150/min — is DOCS9's row, not this one. Same vendor, different product, different pass. Do not double-count.)*

### 2.6 Magic Hour — footage transformation (shape C, plus B and V)

| Dimension | Finding |
|---|---|
| **API** | **OFFICIAL**, with *"SDKs for Python, Node.js, Go, and Rust"*; async via *"polling, and webhooks."* <https://docs.magichour.ai/> |
| **Relevant tools** | *"Face Swap Video — Replace faces in videos with realistic results"* · *"AI Talking Photo — Make still photos speak with any audio"* · *"Lip Sync — Sync audio with video lip movements"* · Character replacement · **"AI Voice Cloner — Clone a voice from an audio sample and generate speech with it"** · **"AI Voice Generator — Generate speech with celebrity voices."** |
| **Price** | Creator **$10/mo** (120,000 credits/yr) · Pro **$25/mo** (300,000/yr) · Business **$66/mo** (840,000/yr); top-ups at *"$1 = 400 credits"* → **1 credit = $0.0025**. <https://magichour.ai/pricing> |
| **Commercial / watermark** | *"Only paid users are granted commercial usage rights."* *"Image outputs already have no watermark, including for free users. Free video and audio outputs may include a watermark; paid plans remove watermarks where applicable."* |
| **Ownership** | *"Subject to the license below and these Terms, you own all Assets you create with the Services."* <https://magichour.ai/terms-of-service> |
| **Training** | *"We may use Prompts and Uploads input into the Platform, or Assets produced by Magic Hour to help develop and improve our products."* **No opt-out found.** |
| **Consent** | **None required by the terms as written — §3.6. This is the finding on this row.** |

> ⚠ **The "AI Voice Generator — Generate speech with celebrity voices" product string is flagged, not assessed.** A tool marketed on celebrity voices sits directly on top of the right-of-publicity question this pass exists to surface. **LEAD INPUT — counsel.** No opinion offered here.

### 2.7 Magnific / Freepik — upscale and edit (shape C)

| Dimension | Finding |
|---|---|
| **Identity** | **Magnific and Freepik's developer platform are now the same thing.** `docs.freepik.com/introduction` **301-redirects to `docs.magnific.com/introduction`** — first-party, observed this pass. That closes DOCS4 §2.2's "formerly Freepik" hedge. |
| **API** | **OFFICIAL.** *"Currently, private API keys are the only way to authenticate with the Magnific API. This means that only server-to-server calls can be made to the API."* Header `x-magnific-api-key`; base `https://api.magnific.com/v1/…`; rate-limited. <https://docs.magnific.com/authentication> |
| **Endpoints** | Image generation · image editing · **Creative Upscaler** and **Precision Upscaler** · **image-to-video: Kling 2.6 Pro, Hailuo 2.3 1080p, WAN 2.6 1080p, RunWay Gen4 Turbo** · icon generation · AI image classifier · stock content. <https://docs.magnific.com/llms.txt> |
| **Price** | **Credit costs per image are published** (Classic Fast 1 · Z-Image 5 · Flux.1 Fast 5 · Mystic 2.5 50, 100 with Style Reference · Imagen 3–4 50–150 · Flux.2 Max 195–715 · GPT 2 High 700/1,400/2,100 for 1K/2K/4K). **The credit-to-dollar rate is `UNKNOWN`** — not published on any page reached. Also: *"Premium+, Pro and Business subscribers enjoy unlimited AI image and video generation and editing on selected models."* <https://www.magnific.com/ai/docs/ai-image-generator-credits> |
| **Ownership** | *"The User retains ownership of his or her User Content"* (§5.1) — **but AI output is governed by a separate document**: §4.4 defers to the *"AI Products Terms and Conditions"*, **which was not reached this pass. So AI-output ownership at Magnific is `UNKNOWN`, and the gap is a whole unread contract, not a missing sentence.** |
| **Commercial** | Tiered: free/Essential require *"attribution to the Website/Company"*; Premium/Premium+/Pro permit commercial use; Pro carries *"Limited permission to use Magnific Content on physical products for commercial sale, subject to a maximum of 100,000 units per individual asset."* <https://www.magnific.com/legal/terms-of-use> |
| **Training** | **`UNKNOWN`.** The terms prohibit *users* from using Magnific content *"for any machine learning and/or artificial intelligence purposes"* (§8.1) — **that restriction runs one direction only, toward the user.** Nothing found on Magnific's own training. |
| **Consent** | **`UNKNOWN` — no likeness-consent requirement found.** |

---

## 3. ⚠ LIKENESS AND VOICE RIGHTS — the load-bearing section

Per the dispatch, this leads rather than trails. **(a) training on the likeness · (b) ownership + export · (c) fate on lapse/downgrade · (d) commercial use by tier · (e) consent/verification demanded.**

### 3.0 Summary — read this row-by-row, the spread is enormous

| Provider | (a) Trains on likeness? | (b) Who owns / exportable? | (c) On lapse | (d) Commercial | (e) Consent demanded |
|---|---|---|---|---|---|
| **Runway standard** | **YES — inputs AND outputs, no opt-out, perpetual + irrevocable** | You own; outputs are files you hold | licence **survives** cancellation | unrestricted, no tier split | **essentially none** |
| **Runway Enterprise** | **NO — contractually barred** | Customer owns Customer Content | 30-day export window, then deletion | unrestricted | customer warrants clearances |
| **HeyGen** | **YES — irrevocable licence to train, no opt-out found, paid plans included** | You own output + avatar | *"may, but is not obligated to, delete"* | paid only; free = non-commercial | **strongest: recorded consent, identity-matched** |
| **Synthesia** | **NO pre-training on customer data** | You own videos; **Synthesia owns the avatar and it CANNOT be exported** | **avatar deleted** | Creator+ plans | **live consent recording, cannot be uploaded** |
| **ElevenLabs** | **YES — with a real opt-out in-product** | *"you retain all rights in and to your Output"* | clone **locked, not deleted** (`SEARCH-DERIVED`) | paid only; free = non-commercial | **voice captcha + own-voice-only rule** |
| **Magic Hour** | **YES — no opt-out found** | *"you own all Assets you create"* | `UNKNOWN` | paid only | **NONE in the terms** |
| **Magnific** | `UNKNOWN` | `UNKNOWN` — separate unread AI-output contract | `UNKNOWN` | tiered; attribution on free | **NONE found** |
| **Hedra** | `UNKNOWN` — **terms silent** | *"you are the owner of all right, title and interest in Your Content"* | watermarked-only access; credits survive | all paid plans | **NONE found** |

> ### ⚠ FINDING P1 — the two vendors that demand the most consent are the two that behave worst afterward, and vice versa.
> **HeyGen** runs the most rigorous consent capture in this matrix — a recorded, identity-matched statement — **and then takes an irrevocable licence to train its models on the very footage that consent unlocked.** **Synthesia** requires a live consent recording that cannot be faked by upload, does not pre-train on it, **and then keeps the resulting avatar as its own non-exportable property that dies with the contract.** Meanwhile **Magic Hour ships face swap and voice cloning with no consent requirement in its terms at all.**
> The lesson for anyone reading a demo reel: **consent friction at signup predicts nothing about what happens to the likeness afterward.** These are two separate questions and the market answers them independently.

### 3.1 Runway — the split that decides everything

**(a) Training. Standard terms, `runway.com/terms-of-use`, last updated May 11, 2026 — §4.4 stands as DOCS4 recorded it:** *"you hereby grant to the Company a non-exclusive, irrevocable, perpetual, worldwide, royalty-free, fully paid, transferable, sublicensable right and license to use any Inputs and Outputs … [to] train and improve its AI models."* **No opt-out. Perpetual and irrevocable — it does not end when the subscription does.**

**Enterprise Services Terms, `runway.com/enterprise-terms`, last updated June 1, 2026, §5.2 — quoted in full because DOCS4 flagged this document UNREAD and it is now read:**

> *"Runway will use Customer Content, and provide necessary access to third party service providers acting on Runway's behalf, such as Runway's hosting Services provider, only: (a) to provide, maintain, and optimize the Services for Customer; (b) to prevent or address Services or technical problems or at Customer's request in connection with support matters; (c) as compelled by law; or (d) to enforce this Agreement. **Runway may not use Customer Content as training data for the Services.** Subject to the limited licenses granted herein, Runway acquires no right, title or interest under this Agreement in or to any Customer Content. As between the parties, Customer owns all rights, title, and interest in Customer Content."*

**(b) Ownership.** Standard §4.4: *"Company does not claim ownership of any of your Inputs or Outputs."* Enterprise §5.2: customer owns. Both fine; outputs are files, so export is not an issue.

**(c) On lapse.** Standard: **the training licence is perpetual and irrevocable and therefore survives cancellation** — this is the sharpest single clause in the document. Enterprise §10.4: 30 days to request an export, after which *"Runway will have no obligation to maintain or provide any Customer Content and will … delete all Customer Content."*

**(d) Commercial.** Standard §4.4: *"the Company does not restrict your commercial use of your Outputs"* — **and the first-party text still shows no tier split**, which continues to contradict the secondary claim that free-tier output is non-commercial. DOCS4's reading holds.

**(e) Consent.** Standard terms carry only: *"You may not post or submit for print services a photograph of another person without that person's permission."* **For a vendor whose flagship feature transfers a real person's performance onto a character, a likeness clause scoped to "print services" is conspicuously narrow.** Enterprise is stronger and general: *"Customer is responsible for Inputs and has all rights, licenses, and permissions required to provide Inputs to the Services, **including publicity clearances and releases**."*

> ### ⚠ FINDING P2 — DOCS4's Runway blocker is CLOSED, and it resolves in Runway's favour on exactly one tier.
> DOCS4 M1 called Runway inadmissible under the standing rule (*no Bee directive content to any provider that trains by default*) and flagged the Enterprise Terms as the only possible path, unread. **They are now read, and they say what the path needed them to say: no training, customer owns, publicity clearances required.**
> **So: Runway standard API = inadmissible, unchanged. Runway Enterprise = admissible on the training test.** The condition is commercial (an Enterprise agreement), not technical. **That is a Butch decision, not a Code one**, and nothing here recommends taking it.

### 3.2 The routing trap — where a likeness is laundered into training data

**This is the finding with the longest reach, and it is new.**

Runway's public API model list bills **`eleven_v3`, `eleven_multilingual_v2`, `eleven_text_to_sound_v2`, `eleven_voice_isolation`, `eleven_voice_dubbing`, `eleven_multilingual_sts_v2`** and **`magnific_precision_upscaler_v2`, `magnific_video_upscaler_creative`** (<https://docs.dev.runwayml.com/guides/models/>, first-party).

Therefore: **the same ElevenLabs model, reached through Runway's standard API, is governed by Runway's §4.4 — trains on inputs and outputs, perpetual, irrevocable — instead of ElevenLabs' own terms, which grant an opt-out and let you retain your rights.**

> ### ⚠ FINDING P3 — the terms follow the route, not the model.
> A voice sample sent **direct to ElevenLabs** is covered by an opt-out you control. **The same sample, sent to the same model through Runway, is training data forever.** The Bee sees one model name and one output; the rights outcome is opposite.
> For a router — which is precisely what ORACLE is — this is a first-class design constraint, not a footnote: **an ORACLE media route must record and enforce the *path*, because the ToS attaches to the path.** A model-name allowlist is not sufficient and would be actively misleading. Marked **LEAD INPUT**; no design is proposed here.

### 3.3 HeyGen — best consent capture, worst training posture

**(e) Consent — the machinery, first-party, <https://developers.heygen.com/docs/avatar-consent>:**
*"Consent applies only to **digital twin** avatars. Photo avatars (`type: \"photo\"`) and prompt-to-avatar characters (`type: \"prompt\"`) depict no real, identifiable person and do **not** require consent."*

- **Level 1 (webcam):** the subject records themselves on HeyGen's hosted consent page.
- **Level 2 (pre-recorded):** whitelisted enterprise accounts only; the subject must state: *"Hey there! I'm speaking with LOTS of energy, while staying natural and confident. This helps HeyGen capture my voice, my expressions, and my motion, so my avatar can behave JUST like me in ANY video!"*
- Requires *"A single, clearly visible face on camera"*, must be *"the same person as the training footage (identity-matched)"*, *"the statement can be in any language"*, and consent state is machine-readable via the avatar group's `consent_status` field.

**A gap worth naming:** the carve-out says a **photo avatar** needs no consent because it *"depict[s] no real, identifiable person."* But §2.3's own product description says a photo avatar is *"Created from a single still image of a person."* **A photo of a real person is a real, identifiable person.** The policy reads as a workflow distinction (trained vs. untrained) dressed as an identifiability claim. **LEAD INPUT — counsel.** Not adjudicated here.

**(a) Training — `heygen.com/terms` §3:** users grant a *"royalty-free, transferable, sublicensable, worldwide and irrevocable"* licence permitting HeyGen to use content *"to train or otherwise improve or modify our artificial intelligence and machine learning models."* **No opt-out found, and this sits in the paid-plan section.**

**(b) Ownership — §3:** *"As between HeyGen and you, you own all rights in your User Input or User Output"*, and HeyGen *"assigns to you all right, title and interest in and to such User Output."* **(d) Commercial:** paid plans commercial; **§4 free plan is a *"limited, non-exclusive, non-transferable, revocable license … solely for personal, non-commercial, and internal evaluation purposes."*** **(c) On lapse — §5:** *"HeyGen may, but is not obligated to, delete any of Your Content"* and *"shall not be responsible for the failure to delete or deletion of Your Content."* **Both directions disclaimed at once — no deletion guarantee and no retention guarantee.**

### 3.4 Synthesia — best training posture, worst lock-in

**(e) Consent — two layers, both first-party.** Product: *"Consent videos must be recorded live and cannot be uploaded. The person in the consent video must be the same individual shown in the uploaded photo"* (<https://docs.synthesia.io/docs/personal-avatars.md>). Contract: *"Customer shall ensure that when it authorizes the creation or use of a Custom Avatar using the voice or likeness of an individual, such individual is over the applicable statutory legal age and has provided free and informed consent"* (<https://www.synthesia.io/legal/customer-terms-of-service>).

**(a) Training:** Usage information may be used for improvement *"provided … in no event will any generation, collection or use of Usage Information … result in (d) the improvement or fine tuning of any artificial intelligence components unless integrated with the Services being used by Customer."*

**(b) Ownership and export — the finding on this row.** *"Customer will own all Customer Data"* — but *"We own and will continue to own the Synthesia Content, our Services and all components thereof"*, and flatly: **_"Customer acknowledges and agrees that Avatars cannot be exported."_**

**(c) On lapse:** *"Synthesia shall have no obligation to maintain, support or provide any Customer Data or Custom Avatars … and upon Customer's deletion of its account, Synthesia shall, unless legally prohibited, delete all Customer Data and Custom Avatars in its systems."*

> ### ⚠ FINDING P4 — a trained persona is a hostage, and this is the general case, not a Synthesia quirk.
> You supply the enrolment footage. You give live consent. You pay. **You do not get the avatar.** It is not exportable by contract, and it is deleted when the relationship ends. The *videos* are yours; the *persona* never was.
> Generalized: **in shape D (trained digital twin), the vendor holds the asset and portability is the exception.** HeyGen's terms assign avatar rights to the user but guarantee no retention; Synthesia's bar export outright. **Any HONEYCOMB framing in which a Bee "owns her persona" collides directly with how this market is built**, and the collision is contractual, not technical — no amount of our own storage design fixes it, because the trained weights never leave the vendor. Marked **LEAD INPUT**; this is a strategy question, not an implementation one.

### 3.5 ElevenLabs — the cleanest row in the document

**(a) Training with a real opt-out — §4(i):** *"you may opt out of our use of your Content for training at any time by navigating to the 'Data use' menu … Your Content will no longer be used to improve our Services (including the Models) once the request has been processed."* **The only in-product training opt-out found anywhere in this matrix.**

**(b) Ownership — §4(c)(ii):** *"you retain all rights in and to your Output."* **(d) Commercial — §1(c):** *"if you access or use our Services free of charge … you may only use the Services for non-commercial purposes; if you access or use our Services through a paid subscription plan … you may use the Services for commercial purposes."* **Commercial voice therefore starts at $6/month (Starter).**

**(e) Consent — the strictest rule in this document, and it is a product rule, not just a clause:** *"You can only create a Professional Voice Clone of your own voice. **Even with their consent, you cannot clone someone else's voice.**"* Enforced by voice captcha; the sanctioned path for someone else's voice is that *"they can create and verify a Professional Voice Clone on their own account, then share it with you privately."* Contractually, §4(b): *"you may be asked to upload audio recordings of your voice **or the voice you are authorized to share with us**."*

**(c) On lapse/downgrade:** a PVC is **not deleted** on downgrade — it becomes unusable until the plan is restored, and slot limits mean excess clones lock rather than vanish. **`SEARCH-DERIVED`** (`help.elevenlabs.io` article 13416174206481; the help-centre page was not fetched first-party this pass).

> **Consequence worth stating plainly, because it changes the workflow, not just the paperwork:** if Butch's sister is producing an AI musician/artist persona, **ElevenLabs' rules mean the voice must be her own, or the voice owner must enrol on their own account and share the clone.** There is no compliant "get a release form and upload their audio" path at ElevenLabs. Whether other vendors permit what ElevenLabs forbids is exactly the asymmetry §3.6 exposes.

### 3.6 Magic Hour, Magnific, Hedra — the silent three

| Provider | The silence |
|---|---|
| **Magic Hour** | Ships **face swap, lip sync, voice cloning, and "celebrity voices"** — and its Terms of Service **contain no requirement that the user hold rights or consent for another person's face or voice.** §4.c covers user conduct broadly; nothing biometric-specific was found. |
| **Magnific** | No likeness-consent requirement found. §8.1 asks only that content not place *"any person appearing in the Magnific Content in a negative light"* — a restriction about *their* stock library, not about *your* uploads. |
| **Hedra** | Terms are silent on training **and** on likeness consent, while the docs ship a *"swap-a-face Skill."* Ownership is clean (§3.2: *"Hedra does not claim ownership of any Inputs or Outputs … you are the owner of all right, title and interest in Your Content"*); the rest is absent. |

> ### ⚠ FINDING P5 — absence of a consent clause is a risk transfer, not a permission.
> Nothing in a vendor's silence makes a likeness lawful to use. It moves the exposure from the vendor's contract to the user's jurisdiction — i.e. **from a document we can read to a body of law we cannot resolve here.** Runway Enterprise and Synthesia say this out loud (customer warrants clearances); the silent three simply do not raise it.
> **LEAD INPUT — counsel.** Right-of-publicity and right-of-likeness questions are named and stopped. **No legal opinion is offered in this document, and none should be inferred from the ordering of these rows.**

---

## 4. The three corrections owed to DOCS4 — adjudicated

### 4.1 Correction 1 — DOCS4 M4 "Runway is direct-only" — **FALLS.**

DOCS4 §3.1(e) recorded *"Runway is direct-only — it did not appear in any aggregator catalogue checked"*, and M4 concluded the coverage answer was **three adapters** (`fal` + `Runway` + `Google/xAI direct`), collapsing to two if M1's training bar held.

**The claim as stated was never quite the point, and it inverted the important fact.** Runway is direct-only *as a supplier* — you cannot buy Runway's own models through fal or Replicate. But **Runway is itself an aggregator**, and DOCS4 half-saw it: it noted Runway billing Seedance2 and Gemini Image 3 Pro, then still filed Runway as a single-vendor adapter. **First-party, this pass, the full storefront is visible in one model list** (<https://docs.dev.runwayml.com/guides/models/>):

| Category | Third-party models billed by Runway |
|---|---|
| Video | `seedance2`, `seedance2_fast`, `seedance2_mini`, `veo3` (deprecated), `veo3.1`, `veo3.1_fast`, `gemini_omni_flash` |
| Image | `seedream5_pro`, `seedream5_lite`, `gemini_image3_pro`, `gemini_image3.1_flash`, `gemini_2.5_flash`, `gpt_image_2` |
| Upscale | `magnific_precision_upscaler_v2`, `magnific_video_upscaler_creative` |
| Audio | `eleven_v3`, `eleven_multilingual_v2`, `eleven_text_to_sound_v2`, `eleven_voice_isolation`, `eleven_voice_dubbing`, `eleven_multilingual_sts_v2`, `seed_audio` |
| Runway's own | `gen4.5`, `gen4_turbo`, `act_two`, `aleph2`, `happyhorse_1_0`, `gwm1_avatars` |

**Kling, FLUX and Sora do not appear** — so Runway's catalogue is broad, not universal. (The lead seed named FLUX and Kling; **that part of the seed is not supported first-party** and is corrected here.)

**Restated adapter math.** DOCS4's "three, probably two" was arithmetic on the wrong shape. The correct shape is a **graph with multiple routes to the same model**:

| Model | Reachable via |
|---|---|
| Seedance 2 | BytePlus direct · fal · **Runway** |
| Veo 3.1 | Google direct · fal · **Runway** |
| Kling 2.6 / 3.0 | Kling direct · fal · **Magnific** |
| ElevenLabs voices | ElevenLabs direct · **Runway** |
| Magnific upscalers | Magnific direct · **Runway** |
| Runway Gen4 Turbo | Runway direct · **Magnific** |
| Grok video | xAI direct · fal · **Hedra** |

**Runway and Magnific resell each other. Hedra resells Grok through fal.** So the honest count is not three or two:

- **On raw coverage, one adapter goes further than DOCS4 thought** — a Runway adapter alone reaches Runway + Seedance + Veo + Seedream + Gemini + GPT Image + Magnific + ElevenLabs.
- **On rights, that same adapter is the worst possible choice** (§3.2, P3), because Runway's standard terms overwrite every one of those vendors' friendlier terms with §4.4.
- **The two facts point in opposite directions, and rights wins under the standing rule.** DOCS4's *conclusion* (fal + direct) survives; its *reasoning* does not, and the "three adapters" number should not be quoted again.

**DOCS4 M4: reasoning WRONG, headline number WITHDRAWN, conclusion incidentally intact.**

### 4.2 Correction 2 — "Aleph 2.0 API access moved to Enterprise in January 2026" — **NOT SUPPORTED. Do not carry it forward.**

First-party evidence, all three ways it could show up:

1. **`aleph2` is listed in the public API model catalogue** — *"Video + Text/Image → Video"* — with **no enterprise marker on any model on the page**. <https://docs.dev.runwayml.com/guides/models/>
2. **`aleph2` carries a published self-serve price: "28 credits per second (56 credit minimum per generation)"** — at $0.01/credit, **$0.28/sec with a $0.56 minimum per generation**. Enterprise-gated capabilities do not get self-serve credit rates on a public price list. <https://docs.dev.runwayml.com/guides/pricing/>
3. **Runway's API overview describes access as usage-tiered, not model-tiered:** *"To request higher usage than [the self-serve tiers], you can submit an exception request on the usage page of your developer portal."* Enterprise is described as *"higher rate limits"* plus support and early access — **a volume distinction, not a model gate.**

Runway's own Aleph 2.0 announcement (**May 21, 2026** — *not* January 2026) says *"Aleph 2.0 in Edit Studio is available now on all paid Runway plans on our desktop web app"* and **is silent on the API**. <https://runway.com/news/introducing-aleph-2-and-edit-studio>

The enterprise-gating claim traces to **third-party model-catalogue sites**, not to Runway. Under this pass's own reading rules that is inadmissible, and the first-party evidence points the other way. **Marked NOT SUPPORTED rather than FALSE**, because proving a negative from public docs has limits — a private commercial policy could exist without appearing on the price list. **If it did, the published $0.28/sec rate would be misleading, which is itself a reason to doubt it.**

**The premise underneath the correction is nonetheless resolved, and better than expected:** DOCS4 flagged Enterprise Terms UNREAD as the only possible admissible Runway path. **They are read (§3.1, P2): §5.2 bars training. So Enterprise is admissible on the training test — and the reason to want it is the terms, not model access.**

### 4.3 Correction 3 — Gen-4 Aleph sunset **2026-07-30** — **CONFIRMED (today), by disappearance.**

DOCS4 M2 recorded, first-party from the same pricing page on 2026-07-27: *"Gen-4 Aleph and Gen-3 Alpha Turbo as deprecated, sunset 2026-07-30."*

**Today, 2026-07-30, on that same page: Gen-4 Aleph is gone.** It appears **neither in the pricing table nor in the model catalogue**. The deprecation machinery is demonstrably still working on that page — **`veo3` is listed as deprecated with a sunset date, and `veo3.1` is live** — so this is not a case of Runway having stopped labelling deprecations.

**What replaced it: `aleph2`**, at 28 credits/sec ($0.28/sec, 56-credit / $0.56 minimum per generation) — **5.6× the price of Act-Two per second**, and a different job (video editing, not performance transfer).

**Evidentiary honesty:** absence from a page is *negative* evidence. It is corroborated by DOCS4's positive first-party quote three days earlier naming today's date, and by the model catalogue agreeing independently. **Confirmed, with the method stated so the next reader can judge it.**

**Consequence for the market signal in DOCS4 §1:** Aleph was named in the sister's stack. Gen-4 Aleph is now gone; Aleph 2.0 is on all paid plans in Edit Studio. **She has not lost the capability, but the model behind it changed today and the API price is $0.28/sec.** DOCS4 M2 said this was worth telling her regardless of what HONEYCOMB builds. **That remains true and is now time-critical rather than three days out.**

### 4.4 Also resolved — "Magik" is BOTH

Butch ruled 2026-07-30: **Magic Hour is the likely primary (footage transformation) and Magnific is useful separately (image upscale). Different jobs, not competitors.** DOCS4 §2.2's open identification question is **CLOSED**. Both are matrixed above — **Magic Hour §2.6, Magnific §2.7** — and both appear in the rights table §3.0. DOCS4 §6's two rows for *"Magik product identity"* and *"Magic Hour / Magnific ToS + API detail"* are **retired**.

**A wrinkle worth recording, since it makes Butch's ruling sharper than a compromise:** Magnific's own API **resells RunWay Gen4 Turbo, Kling 2.6 Pro, Hailuo 2.3 and WAN 2.6 image-to-video**, and Runway's API resells **Magnific's two upscalers**. They overlap in catalogue while remaining distinct in job. **The ruling — different jobs, not competitors — survives the overlap; a "pick one" framing would not have.**

---

## 5. Cross-cutting note — **LEAD INPUT, NOT A DECISION**

Marked explicitly. Nothing here is on the board. DOCS4 §5's four architecture points (async jobs, asset storage, per-project organization, cost model) all apply unchanged and are not restated. **Three things are new to this category:**

1. **Consent is an artifact, and artifacts need somewhere to live.** HeyGen exposes `consent_status`; Synthesia requires a live recording that cannot be uploaded. If a persona lane ever exists, **the consent recording is a first-class asset with a retention question of its own** — it is simultaneously the proof of authorization and *itself* a biometric recording of a real person. DOCS4 §5.2 said a media lane must store assets and the text lane's no-content-columns sovereignty trick does not transfer. **Consent artifacts are the sharpest version of that problem**: you cannot discard them (they are the proof) and holding them is a liability.
2. **The route is part of the record (P3).** A media job row would need to persist *which path* a generation took, because the governing terms attach to the path, not the model name. This is a data-model consequence of a legal fact.
3. **Persona portability cannot be solved on our side (P4).** Trained avatars are non-exportable by contract at Synthesia and unguaranteed at HeyGen. **Shape A (Act-Two) is the only shape in this matrix where nothing about the person is retained as vendor-side state** — the actor performs each time and the output is a file. If persona sovereignty ever becomes a HONEYCOMB requirement, **that structural difference, not price or quality, is the reason to prefer shape A.** Stated as an observation; no build follows from it.

---

## 6. Could-not-verify list

| Item | Status | Blocker |
|---|---|---|
| **Act-Two API audio/voice parameter** | **`UNKNOWN`** | Voice control is documented as an **interface** feature (changelog, Aug 20 2025). The Act-Two API parameter reference was not reached — 3 URL shapes tried, all 404; `help.runwayml.com` article returned **403**. **The single most relevant gap to the dispatch's core question.** |
| Act-Two mechanics description | `SEARCH-DERIVED` | help-centre 403; changelog quote is first-party but terse |
| **Hedra Character-3 API model slug + per-second credit cost** | **`UNKNOWN`** | developer video guide documented `fal/grok-video-*` and deferred avatar work to a guide not reached; credits doc gives policy, not rates |
| Hedra training on inputs/outputs | **`UNKNOWN`** | **terms are silent — not a fetch failure, an absence** |
| Hedra likeness/consent requirement | `UNKNOWN` | same |
| Hedra plan prices — **first-party/secondary conflict** | first-party used | `hedra.com/pricing` gives **$15/$30/$75**; search results quote $8/$24/$60. **First-party wins; the discrepancy is recorded, not resolved.** |
| **Magnific AI-output ownership** | **`UNKNOWN`** | §4.4 defers to a separate *"AI Products Terms and Conditions"* — **an entire unread contract**, not a missing line |
| Magnific training on user content | `UNKNOWN` | terms restrict the user only (§8.1); nothing found on Magnific's own practice |
| Magnific credit-to-dollar rate | `UNKNOWN` | per-image credit costs published; no conversion rate on any page reached |
| Magic Hour per-tool credit costs | `UNKNOWN` | plan prices + the $1 = 400 credits top-up rate are first-party; per-endpoint costs were not on the pages reached |
| Magic Hour behaviour on lapse | `UNKNOWN` | not addressed in terms |
| ElevenLabs PVC on downgrade | `SEARCH-DERIVED` | `help.elevenlabs.io` article 13416174206481 not fetched first-party |
| ElevenLabs API access on Free/Starter | `UNKNOWN` | pricing page references API features from Pro upward; lower-tier API entitlement not stated |
| Synthesia per-video-minute or per-API-call price | `UNKNOWN` | Synthesia meters plan minutes, not units — **a pricing-model difference, not a gap** |
| HeyGen photo-avatar consent carve-out | **flagged, not adjudicated** | policy says photo avatars *"depict no real, identifiable person"*; product says they are made *"from a single still image of a person"* — **LEAD INPUT — counsel** |
| Right-of-publicity / likeness law generally | **out of scope by instruction** | flagged as LEAD INPUT throughout; **no legal opinion given** |
| Runway private Enterprise-only API policy | **cannot be disproven** | public docs show self-serve pricing for `aleph2` (§4.2); a private policy would not appear |
| Output quality of any provider | **out of scope** | this document prices and licenses; it does not review |

---

## 7. BUTCH ACTIONS

1. **Tell your sister today: Gen-4 Aleph is gone as of 2026-07-30 (§4.3).** Aleph 2.0 replaces it and is on all paid plans in Edit Studio. Costs nothing to pass on, useful whether or not HONEYCOMB ever ships anything.
2. **Runway standard vs Enterprise is a commercial decision, not a technical one (§3.1, P2).** Standard trains on inputs and outputs perpetually and irrevocably; Enterprise contractually cannot. If Act-Two ever matters to this platform, **Enterprise is the only admissible door**, and opening it means a sales conversation. **Not recommended here — surfaced.**
3. **The voice rule will shape the workflow before any contract does (§3.5).** ElevenLabs permits cloning **only your own voice** — a release form does not unlock someone else's. If the persona's voice is not the creator's own, the voice owner must enrol on their own account and share the clone.
4. **Counsel questions, collected:** the HeyGen photo-avatar carve-out (§3.3); Magic Hour's *"celebrity voices"* product (§2.6); the three silent vendors' risk transfer (§3.6, P5); and whether a non-exportable trained persona (§3.4, P4) is compatible with any sovereignty claim HONEYCOMB wants to make.

---

## 8. Source index

**First-party, fetched 2026-07-30:**
- Runway API model catalogue — <https://docs.dev.runwayml.com/guides/models/>
- Runway API pricing — <https://docs.dev.runwayml.com/guides/pricing/>
- Runway API overview / access tiers — <https://docs.dev.runwayml.com/>
- Runway changelog (Act-Two Jul 17 2025; voice Aug 20 2025; Aleph 2.0 May 21 2026) — <https://runway.com/changelog>
- Runway Aleph 2.0 announcement — <https://runway.com/news/introducing-aleph-2-and-edit-studio>
- Runway Terms of Use §4.4, last updated May 11 2026 — <https://runway.com/terms-of-use>
- **Runway Enterprise Services Terms §5.2 / §10.4, last updated June 1 2026** — <https://runway.com/enterprise-terms>
- HeyGen developer overview + avatar types + API auth — <https://developers.heygen.com/>
- HeyGen quick start — <https://developers.heygen.com/docs/quick-start>
- HeyGen avatar consent — <https://developers.heygen.com/docs/avatar-consent>
- HeyGen API pricing — <https://developers.heygen.com/docs/enterprise-pricing>
- HeyGen Terms §2–§5 — <https://www.heygen.com/terms>
- HeyGen plan pricing — <https://www.heygen.com/pricing>
- Synthesia API introduction + rate limits — <https://docs.synthesia.io/reference/introduction.md>
- Synthesia personal avatars + live consent — <https://docs.synthesia.io/docs/personal-avatars.md>
- Synthesia Customer Terms of Service — <https://www.synthesia.io/legal/customer-terms-of-service>
- Synthesia pricing — <https://www.synthesia.io/pricing>
- ElevenLabs API introduction — <https://elevenlabs.io/docs/api-reference/introduction>
- ElevenLabs voice cloning concepts (IVC vs PVC) — <https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning>
- ElevenLabs Professional Voice Cloning — <https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning>
- ElevenLabs voices overview — <https://elevenlabs.io/docs/overview/capabilities/voices>
- ElevenLabs Terms §1(c), §2, §4(b), §4(c)(ii), §4(i) — <https://elevenlabs.io/terms-of-use>
- ElevenLabs pricing — <https://elevenlabs.io/pricing>
- Magic Hour API overview — <https://docs.magichour.ai/>
- Magic Hour pricing — <https://magichour.ai/pricing>
- Magic Hour Terms of Service — <https://magichour.ai/terms-of-service>
- Magnific API introduction — <https://docs.magnific.com/introduction>
- Magnific API authentication — <https://docs.magnific.com/authentication>
- Magnific API doc index / endpoint list — <https://docs.magnific.com/llms.txt>
- Magnific credit costs — <https://www.magnific.com/ai/docs/ai-image-generator-credits>
- Magnific Terms of Use §4.4, §5.1, §8.1 — <https://www.magnific.com/legal/terms-of-use>
- **Freepik → Magnific 301 redirect** (observed) — `docs.freepik.com/introduction` → `docs.magnific.com/introduction`
- Hedra Create Asset / API base + auth — <https://www.hedra.com/docs/api-reference/public/create-asset>
- Hedra video generation guide — <https://www.hedra.com/docs/pages/developer/guides/generate-video.md>
- Hedra credits policy — <https://www.hedra.com/docs/pages/app/billing/how-credits-work.md>
- Hedra doc index — <https://www.hedra.com/docs/llms.txt>
- Hedra pricing — <https://www.hedra.com/pricing>
- Hedra Terms §3.2, §3.3 — <https://www.hedra.com/terms>

**First-party, blocked:** `help.runwayml.com/hc/en-us/articles/42311337895827` (**403**) · `docs.dev.runwayml.com/changelog/` (404) · three Act-Two API reference URL shapes (404) · `docs.synthesia.io/` root and `www.synthesia.io/terms-of-service` (404, superseded by the legal path above) · `api.magnific.com/pricing` (404) · `elevenlabs.io/docs/capabilities/voice-cloning` and `/docs/product-guides/...` (404, superseded)

**`SEARCH-DERIVED`, named inline at each cell:** Act-Two mechanics description · Hedra Character-3 per-second credits and the conflicting $8/$24/$60 plan figures · ElevenLabs PVC-on-downgrade behaviour · the Aleph-2.0-is-Enterprise claim (**rejected**, §4.2).

**Carried from prior passes:** DOCS4 (Runway §4.4 first-party May-2026 text, re-verified this pass; Gen-4 Aleph sunset quote; the standing no-training rule from DOCS1 F3 via DOCS3).

---

## 9. Done-test

| Requirement (from the dispatch) | Result |
|---|---|
| Every cell cited-with-date or UNKNOWN plus reason | **PASS** — 38 first-party URLs fetched 2026-07-30; every remaining cell carries `SEARCH-DERIVED` + blocker or `UNKNOWN` + reason (§6, 19 rows). Zero figures from memory. |
| Official/unofficial column filled for every row | **PASS** — §2.0, seven rows, **all OFFICIAL**, with the observation that the gate does no filtering in this category and rights are the real discriminator. |
| Likeness + voice rights: (a)–(e) per provider or blocker named | **PASS** — §3.0 summary table answers all five for all eight provider/tier rows; §3.1–3.6 give the quotes. `UNKNOWN` cells name the blocker; Hedra/Magnific/Magic Hour silences are recorded **as** silences (§3.6, P5). |
| Publicity/likeness law flagged as LEAD INPUT for counsel, no legal opinion | **PASS** — §3.3, §3.4, §3.6, §2.6, §5, §7.4. No legal opinion offered anywhere. |
| DOCS4 correction 1 (Runway storefront) adjudicated first-party | **PASS — DOCS4 M4's reasoning FALLS**, headline number withdrawn, conclusion incidentally intact (§4.1). First-party model catalogue. |
| DOCS4 correction 2 (Aleph 2.0 Enterprise) adjudicated first-party | **PASS — NOT SUPPORTED** on three independent first-party grounds (§4.2); underlying Enterprise-Terms blocker **CLOSED** and it resolves in Runway's favour on that tier (§3.1, P2). |
| DOCS4 correction 3 (Gen-4 Aleph sunset today) adjudicated first-party | **PASS — CONFIRMED**, by disappearance from both the pricing table and the model catalogue, with the negative-evidence method stated (§4.3). |
| "Magik" is BOTH — matrix both | **PASS** — Magic Hour §2.6, Magnific §2.7, both in §3.0; DOCS4 §6's two related rows retired (§4.4). |
| Zero from-memory prices or terms | **PASS** |
| No build recommended, no provider chosen | **PASS** — §5 is marked LEAD INPUT and takes no decision; §7 surfaces choices as Butch's. |
