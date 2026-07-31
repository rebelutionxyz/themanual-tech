# AtlasORACLE — Music & Audio-Generation Provider Matrix

**Pass:** DOCS9 · **Date:** 2026-07-30 · **Scope:** oracle
**Companion to:** `atlasoracle-media-provider-matrix-2026-07-27.md` (video/image) and
`atlasoracle-provider-expansion-matrix-2026-07-27.md` (text/LLM). Same discipline, the third lane.
DOCS4 matrixed video and image and never covered music or audio; this file closes that gap.

**Scope carve-out (lead amendment, 2026-07-30):** music and audio **generation** only — songs,
instrumentals, vocals, stems, extension, mastering. **Voice cloning and text-to-speech are OUT**
and belong to DOCS10, where the likeness-rights question lives. Where a music provider also sells
voice, it gets one line and a hand-off, not a row.

**Not a constraint here:** the trivia-lane "no music rounds" ruling is scoped to trivia (PRO /
ASCAP / BMI licensing on *existing recordings*) and does not bind ORACLE. Confirmed in the
dispatch; recorded so nobody re-imports it.

---

## 0. Reading rules

Same as DOCS4, restated so this file stands alone:

- **Every cell is (a) cited to a first-party URL fetched 2026-07-30, (b) marked `SEARCH-DERIVED`
  with the blocker named, or (c) `UNKNOWN` with a reason.** Zero figures come from model memory.
- `SEARCH-DERIVED` means the first-party page did not render usable content to the fetcher (SPA
  navigation shell, 404, JS-only pricing table) but the figure was returned by search against the
  first-party domain. **It is not a citation. Re-read by a human before relying on it.**
- Prices are USD at the rates published on the fetch date.
- **OFFICIAL / UNOFFICIAL is mandatory and it is a gate, not a label.** A provider without
  first-party developer documentation is `UNOFFICIAL` and is **inadmissible for a paid route**, no
  exceptions, regardless of how good the output is.

---

## 1. The Suno finding — verified first-party, unchanged as of 2026-07-30

The dispatch asked for this to be checked first-party rather than inherited. It was, and **the
lead's finding holds.**

**`suno.com/terms`, effective 2026-03-26, read this pass: the words "API", "developer access" and
"programmatic access" do not appear anywhere in it.** The document describes website and mobile
app access only.

| Question | First-party answer (suno.com/terms, 2026-03-26) |
|---|---|
| Output ownership, **paid** (Pro/Premier) | *"Suno hereby assigns to you all of its right, title and interest in and to any Output owned by Suno and generated from Submissions made by you"* — **with the caveat in the same document**: *"due to the nature of machine learning, Suno makes no representation or warranty to you that any copyright will vest in any Output."* |
| Output ownership, **free** (Basic) | *"you will only use Outputs … solely for your lawful, internal, personal and non-commercial purposes, provided that you give attribution credit to Suno"* |
| Commercial use | General bar on commercial exploitation of *"any portion of the Service, and any Output or Voice Model"*; the paid-tier assignment above is the exception. **Free tier is explicitly non-commercial.** |
| Remixes | *"all Remixes shall be a joint work owned jointly and equally by you and the Remixer"* — both tiers |
| Trains on inputs | Yes. Broad licence *"to use, reproduce, store, modify, distribute, create derivative works based on … any and all Content … in connection with … improvement of our products and services, including the Service and the artificial intelligence and machine learning models related to the Service."* Whether *prompts alone* are separable from full submissions is **not stated** |

**API status.** Music Business Worldwide, published 2026-07-02, reporting a statement of
**2026-07-01** by **Jack Brody, Chief Product Officer**: *"Ahead of our partner powered model,
we're exploring a developer API and want to hear from you before we start building"* and *"We plan
to start with a curated group of partners so we can develop this thoughtfully…"*

**Therefore every product marketing itself as "the Suno API" is a reseller or an unofficial
wrapper.** They are `UNOFFICIAL` and inadmissible for a paid route. **Provenance could not be
established for any of them this pass and I am not going to guess:** none publishes a licence
agreement with Suno, and Suno publishes no partner list to check one against. The dispatch's own
example — a documented open-source wrapper that lifts browser cookies and pays a CAPTCHA-solving
service — is the shape to assume absent evidence otherwise, because a legitimate partner would
have every reason to say so.

> **BUTCH ACTION — Suno developer-API intake form.** MBW says the form is *"hosted on Suno's
> Typeform page"* but **does not print the URL**, and I could not obtain a first-party link this
> pass. **The blocker is named rather than a guessed URL supplied.** The form is reachable from the
> CPO's 2026-07-01 LinkedIn post, which is the citation trail to follow.
>
> Worth noting before applying: **an intake form is not access.** Nothing in the matrix below
> changes until Suno issues first-party developer docs.

**Peer check — Udio is in the same position and says so plainly.** `help.udio.com`, article "Udio
public API", **last updated 2025-03-12**: *"We know there's keen interest, but we don't currently
offer a public API."*

---

## 2. The matrix

`OFF` = official first-party developer docs exist · `UNOFF` = no first-party docs → inadmissible.

| Provider | Status | Auth | Sync/async | Output | Pricing (cited) | Owns output? | Commercial? | Trains on inputs? |
|---|---|---|---|---|---|---|---|---|
| **ElevenLabs — Eleven Music** | **OFF** | `xi-api-key` header | Synchronous `POST /v1/music` | `mp3_44100_128` (v1) / `mp3_48000_192` (v2); PCM, Opus, ulaw, alaw also offered. 3,000–600,000 ms (10 min max) | **$0.150/min**; Starter $6/mo = 3 min · Creator $22 = 40 · Pro $99 = 147 · Scale $299 = 660 · Business $990 = 1,993 | UNKNOWN — the model-specific terms page linked from the marketing page **404s** | **Yes, with carve-outs**: *"online and offline commercial use is permitted, except for film, TV, and Studio Games"* (self-serve); Enterprise = all permitted. *"Commercial use licensing on Starter+ plans"* | UNKNOWN — not stated on any page read |
| **Stability AI — Stable Audio** | **OFF** | API key in authorization field (SEARCH-DERIVED) | `POST /v2beta/audio/stable-audio-2/audio-to-audio` (first-party, kb.stability.ai) | UNKNOWN — the KB page says only *"the API returns the generated audio file"* | **UNKNOWN first-party.** SEARCH-DERIVED: 20 credits flat per successful result, 1 credit = $0.01, no charge for failures. `platform.stability.ai/pricing` renders as a title-only shell to the fetcher | **Yes** — *"you own outputs generated from the Core Models or Derivative Works (such as fine-tunes) and therefore can use those outputs at your discretion"* | **Yes, with a revenue gate**: Community License free **under $1M annual revenue**, *"regardless of the source of that revenue"*; Enterprise licence required above it | UNKNOWN — the licence page does not address it |
| **Google — Lyria (Vertex AI)** | **OFF** (the product exists first-party) | UNKNOWN | UNKNOWN | UNKNOWN | **UNKNOWN first-party.** SEARCH-DERIVED: $0.06 per 30 s of output for Lyria 2. The Vertex generative-AI pricing page carries **no Lyria row at all**, and the Lyria doc pages return navigation shells | UNKNOWN | UNKNOWN | UNKNOWN |
| **Replicate** (aggregator — hosts MusicGen etc.) | **OFF** | UNKNOWN (not on the billing page read) | UNKNOWN per-model | UNKNOWN per-model | **Time-based, not per-output**: *"you are billed for the compute time used to run your models."* Public models bill active time only; private models/deployments bill *"the time they spend setting up; the time they spend idle … and the time they spend active."* **No music-model rates on this page** | UNKNOWN — billing page does not address output ownership | UNKNOWN | UNKNOWN |
| **Beatoven.ai** | **OFF** (claims *"Create your API key now"*, "maestro API") | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN — page points to `/pricing`, figures not on it | UNKNOWN — not stated | Claims yes: *"it's always cleared for commercial use"*, *"access to use audio without any legal barriers"* | UNKNOWN |
| **LALAL.AI** (stems / separation) | **OFF** — docs at `/api/v1/docs/`, OpenAPI at `/api/v1/openapi.json` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN — page links `/pricing/` only | UNKNOWN | UNKNOWN | UNKNOWN |
| **Suno** | **UNOFF** | — | — | — | — | Paid: assigned, no warranty. Free: non-commercial | Paid only | **Yes** | 
| **Udio** | **UNOFF** | — | — | — | — | UNKNOWN | UNKNOWN | UNKNOWN |

**The one row that is presently orderable end-to-end is ElevenLabs**, and even it has a hole where
its own licence text should be. That is a finding, not a recommendation: **no provider is chosen
and no build is proposed**, per the dispatch.

**Hand-off to DOCS10, one line as instructed:** ElevenLabs is primarily a *voice* company — its
text-to-speech and voice-cloning products are the larger part of the platform and carry the
likeness-rights questions. **Those go to DOCS10; only Eleven Music is matrixed here.**

---

## 3. Rights note — **LEAD INPUT, NOT A DECISION, AND NOT A LEGAL OPINION**

The dispatch's framing is right: AI-generated *original* music sidesteps the PRO/ASCAP/BMI problem
that killed music rounds in the trivia lane, because there is no existing recording and no
publisher to clear. It replaces that problem with a different, unsettled one.

**What is known and citable:**

- **The label litigation is settling into licensing, not into precedent.** Music Business Worldwide
  headline, in results returned this pass: *"WMG settles Udio lawsuit, strikes licensing deal for
  'next-generation' AI music platform coming in 2026."* A settlement produces **no ruling**, so it
  resolves those parties' exposure and leaves the underlying question open for everyone else.
- **Providers are now competing on training-data provenance**, which is itself evidence the
  question is live. ElevenLabs states *"Trained on licensed data only. Every track you generate is
  cleared for commercial use."* Suno's terms make no equivalent claim.
- **Suno's own terms disclaim the thing a buyer most wants**: the assignment is real, but
  *"Suno makes no representation or warranty to you that any copyright will vest in any Output."*
  An assignment of whatever rights exist is not a warranty that rights exist.

**For counsel, not for this pass:** whether a provider's "cleared for commercial use" claim
transfers any protection to HONEYCOMB as a downstream user; whether output-ownership assignment
survives a successful third-party infringement claim against the model; whether any provider offers
an **indemnity** (none was found in the pages read — ElevenLabs' model-specific terms, the likeliest
home for one, 404'd); and what the carve-outs mean in practice — ElevenLabs excludes *"film, TV,
and Studio Games"* from self-serve commercial use, and **"Studio Games" is undefined on the page**,
which matters directly to a games company.

---

## 4. Architecture note for audio — **LEAD INPUT**, carried forward from DOCS4 §5

DOCS4 established that the text lane's sovereignty trick — *no content columns, so there is nowhere
to retain anything* — **does not transfer to a media lane, because a media lane's whole job is to
keep the file.** That holds for audio. What changes for audio specifically:

1. **File size is a different order from video, and that changes the honest default.** A 10-minute
   ElevenLabs track at `mp3_48000_192` is roughly 14 MB by arithmetic on the cited bitrate
   (192 kbit/s × 600 s ÷ 8). Video assets from DOCS4's lane are hundreds of megabytes to gigabytes.
   **Audio is cheap enough to keep that "keep everything by default" is affordable where for video
   it is not** — which means the retention policy should be set deliberately for audio rather than
   inherited from a video-shaped rule.
2. **Stems multiply the asset count, not just the bytes.** One "track" is potentially the mix plus
   four to eight stems (LALAL.AI advertises vocals, instrumental, drums, bass, guitar, synth,
   string and wind, plus lead/backing vocal separation). **The asset model must be one-to-many from
   row one**, or stems get bolted on as a second-class thing later.
3. **Provider-hosted URLs expire — the DOCS4 point, and it is sharper here.** A generated track a
   venue plays on a Tuesday must still exist next Tuesday. *"We'll keep the link"* is not a design.
4. **Who owns the file is now two questions, not one.** DOCS4 asked where the bytes live. Audio adds
   *whose rights attach to them* — and the answer differs **by provider and by plan tier**
   (§2: Suno free vs paid; Stability under vs over $1M revenue; ElevenLabs self-serve vs
   Enterprise). **A single "the user owns their files" line in canon will be wrong for at least one
   provider in the table.** This is the decision worth taking before any code.
5. **Sync changes the job machinery.** DOCS4's media lane needed submit → poll → download because
   video is long-running. **Eleven Music's `POST /v1/music` is synchronous**, so the simplest audio
   path needs *less* machinery than the video path — an argument for not making audio wait on the
   video lane's job table.

---

## 5. Could-not-verify list

| Item | Status | Blocker |
|---|---|---|
| Suno developer intake form URL | **UNKNOWN** | MBW names it as a Typeform but prints no link; no first-party URL found. Trail: the CPO's 2026-07-01 LinkedIn post |
| Suno reseller provenance (licensed vs scraper) | **UNKNOWN — unestablishable this pass** | No reseller publishes a Suno agreement; Suno publishes no partner list |
| ElevenLabs Music model-specific terms | **UNKNOWN** | `elevenlabs.io/music/eleven-music-model-specific-terms` — the URL printed on ElevenLabs' own marketing page — returns **404** |
| ElevenLabs rate limits · trains-on-inputs | **UNKNOWN** | Not stated on the API reference or the product page |
| Stable Audio pricing | **SEARCH-DERIVED only** | `platform.stability.ai/pricing` renders a title-only shell; figure not first-party confirmed |
| Stability trains-on-inputs | **UNKNOWN** | Licence page does not address it |
| Google Lyria — everything except existence | **UNKNOWN** | Vertex doc pages return navigation shells; the generative-AI pricing page has no Lyria row |
| Replicate — auth, per-model music rates, output ownership | **UNKNOWN** | Billing page covers the model but lists no music rates and no ownership clause |
| Beatoven / LALAL.AI — auth, pricing, formats, rights | **UNKNOWN** | Figures live on pages not fetched this pass; the Beatoven page returned partly corrupted navigation |
| **Providers not covered at all** | **NOT RESEARCHED** | Mubert, Loudly, Soundraw, AIVA, AudioShake, Moises, LANDR (mastering), and self-hosted MusicGen. Named so the gap is visible rather than implied-complete |

---

## 6. Source index — all fetched 2026-07-30

| # | URL | Used for |
|---|---|---|
| 1 | `https://suno.com/terms` (effective 2026-03-26) | §1 ownership, commercial use, training, absence of API |
| 2 | `https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/` (pub. 2026-07-02) | §1 Brody statement, 2026-07-01, partner group, Typeform |
| 3 | `https://help.udio.com/en/articles/10756277-udio-public-api` (updated 2025-03-12) | §1 Udio has no public API |
| 4 | `https://elevenlabs.io/docs/api-reference/music/compose` | §2 endpoint, auth, params, formats, duration |
| 5 | `https://elevenlabs.io/pricing/api` | §2 $0.150/min and plan minutes |
| 6 | `https://elevenlabs.io/music` | §2 commercial carve-outs, "licensed data only" |
| 7 | `https://kb.stability.ai/knowledge-base/tips-for-using-the-audio-to-audio-api` | §2 Stable Audio endpoint path |
| 8 | `https://stability.ai/license` | §2 output ownership, $1M revenue gate |
| 9 | `https://replicate.com/docs/topics/billing` | §2 time-based billing model |
| 10 | `https://www.beatoven.ai/api` | §2 API existence, commercial-use claim |
| 11 | `https://www.lalal.ai/api/` | §2 official docs + OpenAPI, stem types |

Dead or unusable on fetch: `elevenlabs.io/music/eleven-music-model-specific-terms` (404),
`elevenlabs.io/docs/capabilities/music` (404), `platform.stability.ai/pricing` (shell),
`platform.stability.ai/docs/api-reference` (shell), the two Vertex Lyria doc pages (shells),
`cloud.google.com/vertex-ai/generative-ai/pricing` (no Lyria row).

---

## 7. Done-test

| Requirement | Status |
|---|---|
| Every cell cited-with-date, SEARCH-DERIVED, or UNKNOWN + reason | **Met** — §2 and §5 |
| Official/unofficial column filled for every row | **Met** — 6 OFF, 2 UNOFF |
| Suno terms read first-party, or blocker named | **Met** — read, effective 2026-03-26, §1 |
| Zero from-memory prices or terms | **Met** — every figure carries a URL or is marked SEARCH-DERIVED |
| No build recommended, no provider chosen | **Met** — §2 names the only orderable row as a *finding* |
| Voice/TTS carved out to DOCS10 | **Met** — one line, §2 |

**No code, no schema, no account, no media generated, zero spend.**
