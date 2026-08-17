# REBELUTION.fund — report of record

FUND, the crowdfunding astra. One section per pass, newest at the bottom.
Rotation: when this file passes 512 KB at sweep time it moves to
`docs/reports/REPORT-archive-NNN.md` and a fresh one starts here.

---

## FRONT53 — campaign grid + data layer reading `give_campaigns` live

Session `01cb0b79`. 2026-08-17. Staged only; nothing committed, nothing pushed,
nothing deployed.

### Manifest owned, and what landed in each file

| File | State | What it is |
| --- | --- | --- |
| `src/lib/campaigns.ts` | new | the data layer: row shape, the live read, derivations, and the vocabulary table |
| `src/components/CampaignCard.tsx` | new | one campaign as a card; presentational, server-rendered, no client JS |
| `src/app/page.tsx` | rewritten | the grid, replacing OPS97's shell placeholder |

Disclaimed and untouched: `src/app/[slug]/*` (FRONT54), `robots.ts` / `seo.ts` /
sitemap / metadata (FRONT55), the pledge path (FRONT56), and `src/lib/provider.ts`
(nobody's this pass — see the deviations).

### Live only. There is no fixture path in the campaign surface

`listCampaigns()` and `getCampaign()` read `give_campaigns` through the anon
server client and nothing else. There is no mock implementation, no fallback
fixture, and no code path anywhere in this surface that can produce a campaign
the database does not hold. The dispatch asked for that; the reason it is worth
restating is that FUND is the astra where an invented campaign with an invented
total, rendered beside a give button, is not a cosmetic defect.

Browsing needs no session: `give_campaigns` carries `give_public_read`, whose
USING clause is literally `true` (verified against `pg_policy` this pass), so the
grid prerenders on the anon client.

### Honest empty states, and the distinction that makes them honest

`listCampaigns()` returns a result union rather than an array, because
**"there are no campaigns" and "we did not manage to look" are different facts**
and an array collapses them into the same empty render. Three states, all
reachable today, none dressed as another:

- campaigns → the grid
- none → a sentence saying so. No placeholder card, no "coming soon" example.
- unreadable → a panel saying the record could not be read, split into
  `unconfigured` (never pointed at a record) and `unreachable` (pointed at one
  that did not answer), each with its own words.

`getCampaign()` is the mirror image and deliberately asymmetric: it returns
`null` **only** for "read the record, no campaign at this slug", and **throws**
`CampaignReadError` when the read failed. A detail route's two outcomes are the
campaign or `notFound()`, so folding an outage into `null` would tell a visitor
their campaign does not exist — and then, because the 404 is cached for the
revalidate window, keep telling them so after the database came back.

### The three funding models

`funding_model` is CHECK-constrained to `aon` / `kwyr`, and NULL is the third
real state — `give_campaigns_financial_complete` reads
`funding_model IS NULL OR (goal_cents IS NOT NULL AND manager_connect_account IS NOT NULL)`,
so a campaign either declares model, goal and payout account together or declares
none of them and collects open-endedly.

**No progress bar is ever drawn for a NULL-goal campaign.** There is no
denominator; a bar of any width would be inventing the number the manager
deliberately did not set. `goalProgress()` returns `null` in that case and the
card renders a plain total instead. Measured, not asserted — see the done test.

### D-2 carried, not papered over

`raised_cents` counts AUTHORIZATIONS and is never decremented when one expires
(FUND_MF v0.1 D-2, DB48's to fix). This pass renders exactly what the column
says and fixes nothing. It also reads `captured_cents` alongside it, and **where
the two disagree the card says so in as many words** — "Of that, $0 has actually
been collected. The rest is authorized and not yet in hand." A page-level
disclosure states the same thing for the whole grid. Choosing the flattering
column, or netting them off, would have been the papering-over the dispatch
forbids; disclosing the gap is not a fix and is not claimed as one.

The grid also carries the D-1 disclosure: nothing on the page can take a give
yet, said plainly rather than left for a visitor to discover by clicking.

### Deviations and judgement calls

1. **The campaign read did NOT land on `provider.ts`'s seam.** OPS97 wrote that
   seam expecting campaign reads as methods on `DataProvider`, one implementation
   per source. That shape presumes a mock implementation worth switching to, and
   this pass establishes there is not one — the dispatch rules out fixtures
   outright. Reworking the seam is a real decision about a file this dispatch
   does not own, so the read lands in `campaigns.ts` and `provider.ts` is left
   byte-for-byte as OPS97 wrote it. **Consequence to rule on: `provider.ts` is
   now imported by nothing.** It is dead code, not broken code, and it is flagged
   here rather than deleted because deleting a disclaimed file on my own judgement
   is exactly the move R5 forbids.
2. **`page.tsx` no longer prints the data source.** OPS97's placeholder rendered
   `provider.source` ("live"/"mock"). With the campaign read live-only, that line
   could have read "mock" while the grid showed live rows — a contradiction on
   the one page where a reader's trust in what they are seeing is the product.
   Removed rather than left to mislead.
3. **`manager_connect_account` IS selected; `created_by` is not.** My first draft
   withheld both as "not for a public payload". That reasoning does not survive
   contact with the policy: `give_public_read` is USING (true) over every column,
   so any anon caller already reads the Connect account id — withholding it in
   the app's select would have hidden it from FUND and from nobody else. It is
   also load-bearing, since the fountain takes DIRECT charges on the manager's
   account and Stripe.js needs the id in the browser (FRONT56's consumer).
   `created_by` stays out: a bee's uuid is identity data with no rendering use
   here. Columns are named explicitly rather than `*` so that omission is visible.
4. **Two exports were added for FRONT54, which was mid-flight against this file.**
   FRONT54 (session `7239533e`) had already written `src/app/[slug]/page.tsx`
   importing `getCampaign` and calling `.map` on `listCampaigns()`. `getCampaign`
   was added with exactly that name and a `Campaign | null` return. `listCampaigns`
   kept the result union — the grid's empty-vs-unreadable distinction is the
   substance of this dispatch and could not be given up — and
   `listCampaignSlugs(): Promise<string[]>` was added to serve
   `generateStaticParams` without unwrapping. `startsAt` was added to `Campaign`
   for the same reason: a real column with a real consumer.
   `listCampaignSlugs()` is the one place in the file that swallows a failure,
   returning `[]` with a warning, because it runs at BUILD time and
   `dynamicParams` is true — failing the build over a transient blip is a worse
   outcome than a cold first render, and is how a check gets removed.
5. **The card is not a link and carries no give button.** The detail route is
   FRONT54's and the contribution UI is FRONT56's. A dead door on a funding page
   is worse than no door.
6. **All statuses are listed, none filtered.** A cancelled or closed campaign is
   still a true fact about the record; the card labels the status and dims the
   article rather than hiding the row. `statusLabel()` renders an unknown status
   verbatim rather than swallowing it, so a future migration widening
   `give_campaigns_status_check` degrades to an odd label instead of a campaign
   silently claiming a state it is not in.
7. **All user-facing words live in one vocabulary block** at the bottom of
   `campaigns.ts`, so the language firewall is auditable in one place rather than
   by grepping JSX.

### Done test, verbatim

**1. Typecheck — whole tree, clean.**

```
> fund@0.1.0 typecheck
> tsc --noEmit
```

(no output, exit 0. An earlier run failed inside `src/app/[slug]/page.tsx`, a
disclaimed file FRONT54 was writing at the time; those errors were theirs and
cleared when they landed their edits. The two that were mine to answer —
`getCampaign` and `startsAt` — are deviation 4.)

**2. href boundary.**

```
href check: 3 href attribute(s) in src/, all base-aware.
```

**3. Build guard proven by refusal, with no env set.**

```
> fund@0.1.0 prebuild
> node scripts/build-guard.mjs && node scripts/href-check.mjs

BUILD REFUSED - FUND is not configured to read the live record.

  - NEXT_PUBLIC_DATA_SOURCE is unset - a shipped build must be exactly "live".
  - NEXT_PUBLIC_SUPABASE_URL is not set.
  - NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.
EXIT=1
```

**4. Green build, exit 0.** Run with `NEXT_PUBLIC_DATA_SOURCE=live`, the project
URL, and a deliberately fake anon key — see the could-not-verify list for why the
key is fake and what that costs.

```
Build guard: live record configured (data source "live", both Supabase vars present).
href check: 3 href attribute(s) in src/, all base-aware.

▲ Next.js 16.3.1 (Turbopack)
✓ Compiled successfully in 11.3s
  Running TypeScript ...
  Finished TypeScript in 6.2s ...
[sitemap] campaigns omitted — the record could not be read (unreachable): Invalid API key
✓ Generating static pages using 7 workers (5/5) in 6.7s

Route (app)       Revalidate  Expire
┌ ○ /                     5m      1y
├ ○ /_not-found
├ ● /[slug]
├ ○ /robots.txt
└ ○ /sitemap.xml          5m      1y
EXIT=0
```

The `5m` on `/` is this pass's `revalidate = 300` — the ASTRA_STANDARD v1.0 §9
ISR floor. The sitemap line is worth reading twice: a bad key produced a
propagated, named failure and an omission, **not** a fabricated campaign list.
That is the result union doing the job it exists for, observed rather than
argued.

**5. Render honesty, measured against the three real rows.** Because the build
above could not reach the record, the claim "all three funding models render
honestly" was measured separately: a scratchpad harness renders `<CampaignCard/>`
to static HTML against the three rows currently in `give_campaigns`, transcribed
from a live `execute_sql` read. The harness is NOT in the app tree and ships
nowhere; compiled output went to `verify-out/front53/` (gitignored, and
`.js`-only so it cannot enter the shared `tsc` run).

```
PASS  null-goal: no progress bar element
PASS  null-goal: no "% of goal" claim
PASS  null-goal: states the total plainly
PASS  null-goal: labelled Open collection
PASS  null-goal: no goal invented
PASS  aon: goal and total
PASS  aon: progress bar present
PASS  aon: bar width is the true fraction
PASS  aon: percentage stated
PASS  aon: not claimed as met
PASS  aon: labelled All or nothing
PASS  aon: D-2 disclosed — collected differs from authorized
PASS  aon: model terms stated
PASS  kwyr: goal and total
PASS  kwyr: progress bar present
PASS  kwyr: bar at zero
PASS  kwyr: percentage stated
PASS  kwyr: labelled Keep what you raise
PASS  kwyr: no collected-differs line when the columns agree
PASS  kwyr: location surfaced
PASS  firewall: no "buy"
PASS  firewall: no "sell"
PASS  firewall: no "purchase"
PASS  firewall: no "invest"
PASS  firewall: no "trade"
PASS  firewall: no "market"
PASS  firewall: no "price"
PASS  firewall: no "customer"
PASS  firewall: no "mint"

ALL CHECKS PASSED
```

Rendered output for the three cards, in full:

- `bee-sanctuary` (NULL model) — "Open" · "Open collection", `$0 given so far`,
  "No goal and no deadline — this campaign collects open-endedly." **No
  `aria-hidden` bar element in the markup at all.**
- `fund-the-fountain` (aon) — "All or nothing", `$320 given of a $500 goal`, bar
  at `width:64%`, "64% of goal", "Of that, $0 has actually been collected. The
  rest is authorized and not yet in hand.", "Gives are only collected if the goal
  is met. If it is not, nothing is taken."
- `community-mural` (kwyr) — "Keep what you raise", `Seattle, WA`,
  `$0 given of a $1,000 goal`, bar at `width:0%`, "0% of goal", "Everything given
  goes to the campaign, whether or not the goal is met." No collected-differs
  line, because the two columns agree.

**6. Language firewall, source-level.** `grep -niE` for
buy/sell/purchase/invest/trade/market/price/customer/mint across the three owned
files returns two hits, both inside the comment that names the banned list.

### Could not verify

- **No build or render against the live record from this machine.** The build
  guard requires `NEXT_PUBLIC_SUPABASE_ANON_KEY`, there is no `.env.local` in
  this folder, and the secrets guard correctly refuses to let an agent read one
  out of a sibling astra. Per ASTRA_STANDARD v1.0 §8 that value is a **named env
  setter the owner holds**. What that costs: the read path is proven in shape
  (build reached PostgREST and got a named 401 that propagated honestly), the
  mapping and rendering are proven against the real row values, but **no page has
  been observed rendering rows fetched over the wire**. The check that closes
  this is: owner copies `.env.example` to `REBELUTION.fund/.env.local`, fills the
  Supabase URL and anon key, sets `NEXT_PUBLIC_DATA_SOURCE=live`, then
  `npm run build` — the sitemap line above should list campaigns instead of
  omitting them.
- **No browser render.** Nothing was loaded in a browser; the HTML above is
  `renderToStaticMarkup` output, so layout, dark mode and the grid's responsive
  columns are unobserved.
- **No accessibility audit** beyond hiding the decorative bar from assistive
  technology — the sentence above it already carries the whole fact.
- **`src/lib/provider.ts` is now unimported.** Stated as a fact, not fixed; it is
  a disclaimed file (deviation 1).
- **`formatMoney` exists twice in the tree.** This pass exports one from
  `src/lib/campaigns.ts`; FRONT54's `src/components/PledgePanel.tsx` declares its
  own. Not reconciled — the other one is a disclaimed file, and reconciling it is
  a call for whoever owns the two together.
- **Concurrency hazard, for the lead.** FRONT53, FRONT54 and FRONT55 all ran in
  this one tree at the same time, sharing `.next` and one `tsc` run. My build
  overwrote `.next` while the other two were live. Nothing broke that I can see,
  but a `next build` from three sessions in one folder is a real collision and
  the shared `REPORT.md` is another — I created this file; whoever appends next
  should append, not overwrite.

### Not done, by scope

No commit, no push, no deploy, no migration, no DB write of any kind. The only
statements this session sent to the database were the R2 claim, R2c heartbeats,
read-only schema and policy inspection, the three-row campaign read, and the R3
close.

---

## FRONT54 — `/[slug]` campaign detail at the root slug, with a stubbed `<PledgePanel/>`

Session `7239533e` (fallback id — `MC_SESSION` unset). 2026-08-17. Staged only:
nothing committed, nothing pushed, nothing deployed, no dashboard click, no DNS.

Canon read first, from `ops_docs` at claim time: FUND_MF v0.1, ASTRA_STANDARD
v1.0 (item 9 in particular). Justice's `docket/[jxId]` route and its not-found
boundary were read as the FRONT50 precedent.

### Manifest owned

| File | State | What it is |
| --- | --- | --- |
| `src/app/[slug]/page.tsx` | new | the campaign detail screen |
| `src/app/[slug]/not-found.tsx` | new | segment-scoped 404 boundary |
| `src/components/PledgePanel.tsx` | new | the give slot — **stub only** |

sha256 (first 16 hex), bytes, path — taken after the final build:

```
13574ab4fca5f37e    12334  src/app/[slug]/page.tsx
90b7d48dc0601f59     3369  src/app/[slug]/not-found.tsx
6597c673b231203a     7673  src/components/PledgePanel.tsx
```

Disclaimed and untouched, as dispatched: `src/app/page.tsx` and
`src/lib/campaigns.ts` (FRONT53), the SEO kit — sitemap, robots, JSON-LD,
absolute canonicals (FRONT55), the contribution path (FRONT56), and everything
OPS97 laid down.

### Campaigns live at the root slug

`/bee-sanctuary`, not `/campaigns/bee-sanctuary` — the VOTE ballot precedent, and
ASTRA_STANDARD v1.0 §12 is the reason: attaching `rebelution.fund` later has to
be an env change plus a 301, never a code change. A campaign already sitting at
the address it will hold on its own domain makes the cutover move nothing.

**The cost of that, stated because it is real:** `[slug]` at the top of the tree
matches EVERY single-segment URL, so `/nonsense` renders this route's 404 rather
than Next's global one. `not-found.tsx` is therefore written to be true of both a
mistyped campaign slug and a URL that was never a campaign address. Deeper URLs
(`/a/b`) never match and still fall through to Next's global 404 — measured
below, and that is the correct split.

### The not-found boundary, and the FRONT50 lesson honoured

The dispatch required a segment-scoped `not-found.tsx` because a matched route
that throws `notFound()` renders the closest boundary and DISCARDS the page's
`generateMetadata` — so a title fixed in the page can never work. Both halves are
present: the page still returns `{ title: 'No campaign at this address' }` on the
null branch (correct, free, and it takes over if the boundary is ever removed),
and the boundary carries the metadata that actually resolves.

**Measured, not assumed** — production build, `next start`, live record:

```
/fund-the-fountain
  status : 200
  title  : Fund the Fountain · FUND

/bee-sanctuary
  status : 200
  title  : Bee Sanctuary · FUND

/no-such-campaign
  status : 404
  title  : No campaign at this address · FUND

/a/b
  status : 404
  title  : FUND — Fund what matters | 404: This page could not be found.
```

The 404 status is preserved on both 404s, the boundary's title wins on the
campaign address, and the global 404 still answers the non-campaign URL with the
root layout's default. That is exactly the two-different-404s shape FRONT50
named.

### FINDING — the 404 body is delivered in the RSC payload, not as server-rendered markup

Chased down because the visible-text probe came back empty on the 404 while the
copy was demonstrably in the response. Same server, three routes, counting
occurrences of a known string before and after blanking every `<script>` block:

```
/no-such-campaign    status 404  total 1  in-plain-markup 0  <- SCRIPT PAYLOAD ONLY
/a/b                 status 404  total 6  in-plain-markup 2  <- server-rendered
/fund-the-fountain   status 200  total 2  in-plain-markup 1  <- server-rendered
```

So a campaign page and Next's own global 404 both ship real markup, while the
copy in `not-found.tsx` reaches the browser only inside the streamed RSC payload.
**A reader with JavaScript disabled gets a correct 404 status, a correct title,
and a blank body.**

Reported rather than worked around, and characterised honestly:

- It does **not** affect what the dispatch asked for. Status is 404 and the title
  is the boundary's — those were the requirement, and both are measured above.
- It is not something an edit to `not-found.tsx` fixes; it is how Next 16
  delivers a `notFound()` boundary on a route rendered on demand. The route is
  dynamic here precisely because `dynamicParams` is on and the slug was not
  prerendered.
- Whether a prerendered slug that later 404s behaves the same way is **not**
  tested. That is the experiment for whoever picks this up.

### `<PledgePanel/>` is a stub, and the disabled state is load-bearing

Correct props, correct slot in the layout, disabled control, and it does not call
the fountain. What it renders is not a designer's placeholder — it states the
true reason FUND cannot take a give:

- **D-1** the contribution UI was never built (FRONT56).
- **D-2** `raised_cents` increments at AUTHORIZATION and never decrements, so a
  campaign can read goal-met off money that has evaporated. FUND_MF v0.1 says
  this **GATES ANY LIVE PLEDGE, ABSOLUTELY** (DB48).

Because of D-2 the panel shows **Pledged** and **Received** as two separately
labelled figures and says what each means, rather than collapsing them into one
"raised" number. On the seed that difference is visible and material — Fund the
Fountain reads `$320` pledged against `$0` received.

**What FRONT56 still owes, and it is a canon requirement, not a preference.**
FUND_MF v0.1 rules the 2% platform fee ACTIVE and requires donor-facing
disclosure on the pledge screen. **No rate is printed by this pass.** The rate is
a database value (`fee_schedule.fee_key='give'`) and DB50 is the pass that reads
it and flips `active`; a percentage typed into a component would be this app
asserting a rate it never read — the same class of untruth as D-2. The disclosure
belongs with the control that charges the fee. Recorded in the component's own
header comment as well, so it cannot be lost with this report.

### Deviations and judgement calls

**1. The data contract moved under this pass, twice, and the page was rewritten
to follow it rather than to preserve my first guess.** `src/lib/campaigns.ts` is
FRONT53's file and was being written in a parallel session while this one ran.

- At the point the page was first written, `campaigns.ts` did not exist. It was
  authored against an inferred contract.
- When the file landed it exposed `listCampaigns()` returning a result union and
  **no single-row read**. The page was rewritten to find the slug in the list —
  not merely as a workaround: a `getCampaign()` returning `Campaign | null` would
  have collapsed "no campaign at this slug" and "the record could not be read"
  into the same `null`, and those are a 404 and a 500.
- FRONT53 then added `getCampaign(slug)` — `null` for a genuine miss, throwing
  `CampaignReadError` when the read fails — plus `listCampaignSlugs()`. That is
  strictly better: it keeps the distinction AND is a single-row query instead of
  reading every campaign to render one. **The page was rewritten a third time to
  use it**, and the list-and-find code is gone.

**2. A comment in `PledgePanel.tsx` asserted something false and was corrected
after checking.** The first draft argued `manager_connect_account` was
deliberately withheld from the public payload and that FRONT56 should take it
from the fountain's response instead. FRONT53's file argues the opposite — that
the column is already public and withholding it hides it from FUND and from
nobody else. **Checked rather than deferred to:** `pg_policies` on
`give_campaigns` shows `give_public_read`, `SELECT`, role `public`, qual `true`;
RLS is row-level, not column-level. FRONT53 is right, the comment was wrong, and
it now says so and records that it was verified this pass. `created_by` is the
column genuinely held back.

**3. "Opened" reads `starts_at`, not `created_at`.** Both default to `now()` and
are identical on today's seed, which is exactly why the choice had to be
deliberate — they diverge the day a manager schedules a campaign ahead of time.

**4. A plain `<img>` for the cover, not `next/image`.** `cover_url` is an
arbitrary remote URL and `next/image` needs every host declared in
`remotePatterns` ahead of time — a config file somebody has to edit before a
campaign manager can use their own image. `alt=""` because the campaign is
already named in the `<h1>` directly above it. All three seed rows have a null
cover, so **this branch has never actually rendered** — see could-not-verify.

**5. Every user-facing word for a model or a status comes from `campaigns.ts`.**
That file deliberately keeps its vocabulary in one auditable block because of the
language firewall, so this screen calls `fundingModelLabel` / `statusLabel` /
`fundingModelNote` rather than writing its own words for the same things. My
first draft duplicated a `formatMoney` and a model-label table; both are deleted.

**6. `revalidate = 300`.** ASTRA_STANDARD §9's ISR floor. FRONT55 owns the SEO
kit and may tune it; anything it picks has to stay at or above the floor.

**7. Metadata here is the minimum the route owes** — a per-campaign title and
description drawn from on-screen copy only. Absolute canonicals, JSON-LD and the
sitemap are FRONT55's, running in parallel. `generateMetadata` is written to be
extended by that pass, not replaced.

### Done-test output, verbatim

`npm run typecheck` (`tsc --noEmit`):

```
> fund@0.1.0 typecheck
> tsc --noEmit

TYPECHECK_EXIT=0
```

`node scripts/href-check.mjs`:

```
href check: 3 href attribute(s) in src/, all base-aware.
```

The two new anchors (the 404's "See the campaigns that are open" and the
detail page's "← All campaigns") both go through `href()`.

**Green build against the live record** — three real campaigns prerendered at the
root slug, which is the shape the whole dispatch turns on:

```
Route (app)               Revalidate  Expire
┌ ○ /                             5m      1y
├ ○ /_not-found
├   /[slug]
│ ├ ● /bee-sanctuary              5m      1y
│ ├ ● /fund-the-fountain          5m      1y
│ └ ● /community-mural            5m      1y
├ ○ /robots.txt
└ ○ /sitemap.xml                  5m      1y

BUILD_EXIT=0
```

**Rendered output of a live campaign**, visible text only, from `next start`:

```
← All campaigns Fund the Fountain All or nothing · Open Help seed the Fountain
so creators can raise BLiNG!-rewarded support. Opened June 24, 2026 Closes No
closing date Goal $500 Give to this campaign Pledged $320 Received $0 Goal $500
64% of the goal pledged Pledged counts cards authorized. Received counts money
actually collected. Gives are only collected if the goal is met. If it is not,
nothing is taken. Giving is not open yet This campaign is open, but FUND cannot
take a give yet. The giving path is still being built, and the ledger it writes
to is being corrected first. No card will be charged until both are done.
```

**Earlier in the pass, before a local env file existed in this repo**, the build
was proven the way OPS97 proved it — placeholder values to satisfy the live-only
guard, then a leak check on the artifact. That run also produced a useful
measurement worth keeping: with the record unreachable, `/no-such-campaign`
answered **500, not 404**. That is the throw-versus-`notFound()` decision working
— an outage must never be published as "this campaign does not exist".

Leak check on that placeholder build: the probe string appeared in three files —
two server chunks and the Turbopack cache — and in **zero** emitted HTML and
**zero** client static chunks. That is the correct result and it differs from
OPS97's flat zero for a plain reason: OPS97's shell never used the Supabase
client in a render path, and `campaigns.ts` does, so a `NEXT_PUBLIC_` value now
legitimately bakes into the server bundle.

`MSYS_NO_PATHCONV=1` is required when passing `NEXT_PUBLIC_BASE_PATH=/fund` from
Git Bash on this box — without it the value arrives as
`C:/Program Files/Git/fund` and Next refuses the build. Noted because the next
person to prove the mount will hit it. With it, the mount lands: `index.html`
carries `href="/fund"` and `href="/fund/_next/static/..."`, and the `[slug]`
chunk carries the base-prefixed link literal.

### Could not verify

1. **The cover-image branch has never rendered.** All three seed rows have a null
   `cover_url`, so the `<img>` path is unexercised.
2. **The 404 body without JavaScript.** Established above that it is script-only;
   what a JS-disabled browser actually displays was reasoned from the markup, not
   viewed.
3. **Whether a slug prerendered at build time behaves differently on a later
   `notFound()`** than the on-demand slug measured here.
4. **Nothing was checked in a real browser.** All rendering evidence is
   server-response text from `next start`.
5. **No live giving path was exercised** — by design; the panel is inert and the
   fountain was not called.
6. **`community-mural` was not probed individually.** It prerendered in the build
   and is the `kwyr` case; only the `aon` and open-ended campaigns were fetched.

### Notes for the passes that follow

- **FRONT56** — the panel takes the whole `Campaign`, every field is a primitive,
  so adding `'use client'` inside `PledgePanel.tsx` changes no caller.
  `managerConnectAccount` is on the record and available. The fee disclosure is
  outstanding and is a canon requirement.
- **FRONT55** — `generateMetadata` in `[slug]/page.tsx` is deliberately minimal
  and meant to be extended. `revalidate` is at the floor, not above it.
- **Unowned by anyone so far:** there is no `error.tsx`. A failed read surfaces
  as Next's default error page — correct status, no styling and no title. Worth a
  dispatch.
- **Also unowned:** `src/lib/provider.ts` still holds the OPS97 seam with a mock
  arm that nothing on the campaign surface uses. FRONT53 flagged it; this pass
  did not touch it either.

---

## FRONT56 — the donate button: `pledge()` + Stripe.js confirm on the connected account

Session `01cb0b79`. 2026-08-17. Staged only; nothing committed, nothing pushed,
nothing deployed. **The pass is BLOCKED short of its done test — see the blocker
section. `FRONT56-Q` is filed and the dispatch is left claimed.**

### Manifest owned

| File | State | What it is |
| --- | --- | --- |
| `src/lib/pledge.ts` | new | the giving path: Stripe.js loader, test-mode gate, fee read, `startPledge()`, and every sentence a giver reads about their money |
| `src/components/PledgePanel.tsx` | rewritten | the FRONT54 stub filled in — amount, disclosures, Payment Element, confirm |

Disclaimed and untouched: everything else, including `src/app/[slug]/page.tsx`
(the caller), `src/app/page.tsx`, and `.env.example`.

**`PledgePanelProps` is unchanged (`{ campaign }`), so the caller was not
touched** — the FRONT54 stub predicted exactly this and chose the prop shape for
it. The only structural change is the `'use client'` directive it said would be
needed.

### D-1 is closed in code

FUND_MF v0.1's oldest open defect reads "the contribution UI was never built. No
`pledge()` in campaigns.ts, nothing calls the fountain. The donate button is
inert." There is now a `pledge()` — `startPledge()` in `src/lib/pledge.ts` — and
it calls the fountain. What remains open is not the code; it is the three
environmental facts in the blocker section below.

### The flow, against the function as deployed

`fountain` was read out of the project this pass rather than recalled: **it is at
v15, ACTIVE, `verify_jwt: true`** (FUND_MF v0.1 says v14 — stale by one, worth
correcting in canon).

1. Browser POSTs `{ campaign_id, amount_cents }` to `fountain/pledge` through
   `supabase.functions.invoke`, which attaches the signed-in session's JWT. The
   function resolves the bee id from that token itself, so a giver cannot pledge
   as somebody else.
2. The function creates a `capture_method: 'manual'` PaymentIntent as a DIRECT
   charge on the manager's Connect account and registers the pledge row.
3. It returns `client_secret` **and** `stripe_account`.
4. The browser confirms with Stripe.js **initialized against that account**
   (`Stripe(pk, { stripeAccount })`). This is the step that makes `stripeAccount`
   load-bearing: a direct-charge client secret does not resolve on a Stripe.js
   instance pointed at the platform account.

Money is HELD, never taken here. Capture happens later in the function's
`/close` route.

### Deviations and judgement calls

1. **THE `kwyr` COPY DEPARTS FROM THE DISPATCH, DELIBERATELY, AND THIS IS THE
   MOST IMPORTANT LINE IN THIS SECTION.** The dispatch says: "for `aon` say the
   card is only charged if the goal is met; for `kwyr` say it is charged now."
   **The deployed function does not charge a `kwyr` card now.** `/pledge` creates
   a `capture_method: 'manual'` intent for BOTH models; capture happens in
   `/close` — always for `kwyr`, only on a met goal for `aon`. Telling a giver
   their card is charged now would therefore be false, and the same dispatch says
   in the same breath that the copy must be TRUE and that getting it wrong is a
   consumer-protection problem. The real distinction between the models is not
   WHEN the card is charged but WHETHER it is charged at all, so that is what the
   copy says:
   - aon — "Your card is authorized now, not charged. It is only charged if the
     campaign reaches its goal. If it does not, the authorization is released and
     you are charged nothing."
   - kwyr — "Your card is authorized now, not charged. It is charged when the
     campaign closes, whether or not the goal is reached."
   If the lead intended `kwyr` to capture immediately, that is a change to the
   edge function, not to this copy, and it needs its own dispatch. **The copy
   must not run ahead of the function.**
2. **The fee disclosure states what is TRUE today, which is that no fee is
   taken.** The dispatch requires the 2% fee disclosed before the confirm button
   and read from `fee_schedule`, never hardcoded. Read this pass, the row says
   `platform_pct = 2`, **`active = false`**, note "Dormant until payout rails" —
   and the deployed function creates its PaymentIntents with **no
   `application_fee_amount` at all** (its own header comment says "0% PLATFORM
   FEE (locked Jun 10 2026)"). FUND_MF v0.1 records the owner's 2026-08-17 ruling
   activating the 2% design and assigns the change to **DB50**, which has not
   run. So the panel reads the row and says: "FUND is taking no platform fee on
   this give — the whole amount goes to the campaign. A 2% platform fee has been
   ruled and is not yet in effect." Announcing a fee that is not charged is the
   same class of untruth as hiding one that is. When DB50 flips the row the same
   code says the other sentence, with no edit here.
3. **A LIVE publishable key DISABLES the panel.** `stripePublishableKey()`
   refuses any `pk_live_` key outright. The dispatch says test mode only; a rule
   that depends on nobody pasting the wrong key one evening is not a rule. Cost
   of refusing wrongly: a disabled button on a preview build. Cost of proceeding
   wrongly: somebody's money, against a ledger D-2 says is wrong. Enforced, in
   the same spirit as `scripts/build-guard.mjs`.
4. **No new npm dependency.** Stripe.js must be served from `js.stripe.com` —
   bundling it voids PCI compliance and Stripe breaks it deliberately.
   `@stripe/stripe-js` is a thin loader around that script tag, so
   `loadStripeScript()` does it directly in about twenty lines. A new package is
   a plan-mode item in this workspace and this pass has no dispatch for one.
5. **The panel refuses to take a give while the fee is UNKNOWN.** A failed
   `fee_schedule` read does not fall back to "no fee" — a disclosure that is a
   guess is worse than none, so the control stays disabled and names the read
   failure.
6. **Disclosures sit ABOVE the control that acts on them.** Charge terms, fee,
   and the authorization-expiry note are all rendered before the button, none
   behind a disclosure triangle. A disclosure a person reaches after committing
   is not a disclosure.
7. **The panel mirrors the fountain's own preconditions** — campaign active,
   `funding_model` not null, `manager_connect_account` not null — so the button
   is never offered for a give the server would refuse. An open collection
   (`funding_model IS NULL`) therefore reads "This campaign has no goal and no
   payout account, so it cannot take a card give. Open collections are recorded,
   not charged."
8. **Amounts are parsed off the string, not through `valueAsNumber`.** `25.10` in
   float arithmetic is 2509.9999999999995 cents. A rounding error in the amount
   someone is charged is not a rounding error worth having.
9. **`AUTHORIZATION_EXPIRY_NOTE` is shown to the giver.** D-2 is that the ledger
   does not account for expiring authorizations. Until DB48 lands, the giver is
   the only party in the transaction who can be told the truth about it.

### A stale sentence this pass creates but may not fix

`src/app/page.tsx` (the grid, FRONT53's file, disclaimed by this dispatch)
carries the footer line **"Nothing on this page can take a give yet. The
contribution screen is not built, so there is no button here that would do
anything."** The first clause stays true — the grid still has no give control.
**The second clause becomes false the moment this pass lands**, because the
contribution screen now exists on the detail route. It is one sentence and it is
outside this manifest. **It needs a one-line dispatch**, and it is flagged rather
than quietly edited.

### Done test, verbatim

**1. Typecheck — whole tree, clean.**

```
> fund@0.1.0 typecheck
> tsc --noEmit
```

**2. Green build AGAINST THE LIVE RECORD, exit 0.** `.env.local` now exists in
this folder (created between FRONT53 and this pass), carrying the Supabase URL
and anon key, `NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_SITE_ORIGIN`. It sets
`NEXT_PUBLIC_DATA_SOURCE=mock`, so the guard correctly refused the plain build;
overriding that one non-secret flag on the command line produced a real live
build. No value from that file was read, printed or copied at any point.

```
▲ Next.js 16.3.1 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 1537ms
  Running TypeScript ...
  Finished TypeScript in 3.1s ...
✓ Generating static pages using 7 workers (8/8) in 1840ms

Route (app)               Revalidate  Expire
┌ ○ /                             5m      1y
├ ○ /_not-found
├   /[slug]
│ ├ ● /bee-sanctuary              5m      1y
│ ├ ● /fund-the-fountain          5m      1y
│ └ ● /community-mural            5m      1y
├ ○ /robots.txt
└ ○ /sitemap.xml                  5m      1y
EXIT=0
```

**This also closes FRONT53's outstanding could-not-verify item.** That pass could
not reach the record and said so; this build did. The three campaign slugs are
prerendered from `give_campaigns`, and the prerendered grid HTML carries the live
rows — text extracted from `.next/server/app/index.html`:

```
3 campaigns Open Open collection Bee Sanctuary Early draft — funding details to
come. $0 given so far No goal and no deadline — this campaign collects
open-endedly. Open All or nothing Fund the Fountain Help seed the Fountain so
creators can raise BLiNG!-rewarded support. $320 given of a $500 goal 64% of goal
Of that, $0 has actually been collected. The rest is authorized and not yet in
hand. Gives are only collected if the goal is met. If it is not, nothing is
taken. Open Keep what you raise Community Mural Commission a mural for the
commons. Seattle, WA $0 given of a $1,000 goal 0% of goal Everything given goes
to the campaign, whether or not the goal is met.
```

**3. The panel's blocker states, from the prerendered detail pages.**

`fund-the-fountain` (aon, has a Connect account value):

```
Give to this campaign Pledged $320 Received $0 Goal $500 64 % of the goal pledged
Pledged counts cards authorized. Received counts money actually collected. Gives
are only collected if the goal is met. If it is not, nothing is taken. Giving is
not open This build is not configured to take gives — no Stripe key is set. That
is a configuration state, not a closed campaign.
```

`bee-sanctuary` (funding_model NULL):

```
Give to this campaign Pledged $0 Received $0 Pledged counts cards authorized.
Received counts money actually collected. No goal and no deadline — this campaign
collects open-endedly. Giving is not open This campaign has no goal and no payout
account, so it cannot take a card give. Open collections are recorded, not
charged.
```

Both are the honest state for their situation, and neither is a grey button with
no explanation.

**4. Environment, names only — no value was read or printed.**

```
what FUND looks for:
  NEXT_PUBLIC_DATA_SOURCE            -> present
  NEXT_PUBLIC_SUPABASE_URL           -> present
  NEXT_PUBLIC_SUPABASE_ANON_KEY      -> present
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY -> ABSENT
  NEXT_PUBLIC_BASE_PATH              -> present
  NEXT_PUBLIC_SITE_ORIGIN            -> present

stripe key mode: no key
```

### BLOCKED: no test-mode authorization was performed

The dispatch's done test is "green local build **+ one successful test-mode
authorization shown verbatim**". The build is green. **The authorization was not
performed, and cannot be from inside this pass's scope.** Three things stand in
the way, and they are independent — fixing the first two still leaves the third:

1. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not set** and is not in
   `.env.example` (that file is outside this manifest). ASTRA_STANDARD v1.0 §8
   makes every new env var a **named setter in a dispatch**. Owner action.
2. **No signed-in bee.** `fountain_pledges.bee_id` is NOT NULL and the function
   verifies the JWT itself, so a pledge requires a session. Public signups are
   disabled by owner action (recorded on the dispatch), so the path is signing in
   as one of the 18 existing accounts — which needs credentials this session does
   not have and must not ask to have printed.
3. **THE DEEPEST ONE, AND IT IS A DATA PROBLEM, NOT AN ENV PROBLEM.** Both
   financially-configured campaigns carry
   **`manager_connect_account = 'acct_test_seed'`** — read from the record this
   pass. That is a placeholder string, not a Stripe account id (Stripe issues
   `acct_` plus sixteen characters; this is `acct_` plus nine). The fountain's
   `stripe.paymentIntents.create(..., { stripeAccount: 'acct_test_seed' })` will
   fail, and the giver will see the function's `502 Payment initialization
   failed`. **No campaign currently in `give_campaigns` can authorize a card, in
   test mode or any other.** Stated as inference from the value's shape, not as a
   measurement: confirming it against Stripe's API needs the secret key, which
   this session must never touch.

   Clearing it needs a **real test-mode Connect account** — an owner action at
   the Stripe dashboard, since an agent may never create an account or sign in —
   and then a **write to `give_campaigns.manager_connect_account`**, which needs
   its own dispatch. Neither is in this manifest.

**What would close this pass**, once those exist: set the key, sign in as a test
bee, open a financially-configured campaign, give an amount at or above $0.50,
confirm with Stripe's `4242 4242 4242 4242`. The panel prints the PaymentIntent
id and status verbatim; the status that proves the money is held and not taken is
**`requires_capture`**. That last screen is the artifact the dispatch is asking
for.

### Could not verify

- **No browser render and no runtime execution of the give path.** Everything
  above is a static prerender plus typecheck. `loadStripeScript()`, the Payment
  Element mount, `elements.submit()` and `confirmPayment()` have **never run**.
  They are written against Stripe's documented API and are unexercised.
- **`getFeeDisclosure()` has not run in a browser.** The `fee_schedule` row and
  its `fee_schedule_read` policy (`USING (true)`) were read directly this pass, so
  the query is known to be permitted; the client call itself is untested.
- **The `pk_live_` refusal is untested** — no key of either kind was available.
- **`readFunctionError()`'s Response-unwrapping branch is untested**, since no
  call to the fountain was made.
- **The fountain was not called at all this pass**, authenticated or otherwise.

### Not done, by scope

No commit, no push, no deploy, no migration, no DB write. No Stripe API call of
any kind. No key of any kind was read, printed, copied or committed. The database
statements this pass sent were the R2 claim, heartbeats, read-only inspection of
`fee_schedule`, `fountain_pledges`, `give_campaigns` and their policies, and the
`FRONT56-Q` filing.

---

## FRONT55 — SEO kit: env-driven canonicals, a sitemap that is not frozen at build, per-campaign metadata and JSON-LD

Session `49f75e8a` (fallback id). 2026-08-17. **Staged only — nothing committed,
nothing pushed, nothing deployed, no migration, no database write of any kind.**

**The headline: the FRONT48 defect is absent, and it is proven behaviourally
rather than from a manifest.** FRONT48 caught Justice's sitemap building fully
static — generated once at build against an empty record and never again — and
fixed it, but could only evidence the fix from `prerender-manifest.json`. This
pass ran the built server and watched the clock: **zero sitemap regenerations
across 310 seconds inside the ISR window, and one regeneration logged within 15
seconds of the first request after it expired.** The route re-executes and
re-reads the record on a running service, with no redeploy. Measurement in §5.

### Manifest owned, and what was deliberately left alone

| Path | State | Note |
| --- | --- | --- |
| `src/app/seo.ts` | **new** | `absolute()`, the three site strings, per-campaign metadata, all JSON-LD builders |
| `src/app/sitemap.ts` | **new** | dynamic, absolute, `revalidate = 300` |
| `src/app/robots.ts` | **new** | static by design; see §7 for what it is and is not worth |
| `src/components/JsonLd.tsx` | **new** | the one way structured data reaches the document |
| `src/app/layout.tsx` | modified | three local constants moved out to `seo.ts`; emitted metadata unchanged |
| `src/app/page.tsx` | modified | front-door `metadata` block (canonical + openGraph) and `WebSite` JSON-LD |
| `src/app/[slug]/page.tsx` | modified | `generateMetadata` extended; two JSON-LD blocks added |

Disclaimed and untouched: page bodies and the data layer (`src/lib/campaigns.ts`,
`src/components/CampaignCard.tsx` — FRONT53), `src/app/[slug]/not-found.tsx` and
`src/components/PledgePanel.tsx` (FRONT54/FRONT56), `next.config.mjs`,
`src/lib/href.ts`, `src/lib/provider.ts`, both prebuild scripts.

**`revalidate = 300` on the grid and the detail route was already correct when
this pass reached them** — FRONT53 and FRONT54 each set it to the ASTRA_STANDARD
floor and each left a comment saying FRONT55 could tune it. Nothing needed
tuning, so nothing was changed; the floor is verified in §5 rather than re-set.
Both files invited an edit that turned out to be unnecessary, which is worth
recording so nobody later reads the absence of a diff as an oversight.

### 1. Sequencing, because three passes shared one tree

FRONT53, FRONT54 and FRONT55 were claimed within six seconds of each other and
ran concurrently against the same working tree. FRONT55's manifest is metadata,
which lives *inside* the two page files the other two own. Editing them
mid-flight would have raced their whole-file writes.

So this pass took its own files first — `seo.ts`, `sitemap.ts`, `robots.ts`,
`JsonLd.tsx`, none of which any other dispatch names — and **held every edit to
`page.tsx` and `[slug]/page.tsx` until both peers showed `done` on the rail.**
That cost some waiting and bought a stable tree: at the moment the metadata
edits landed, the peers' files had already reconciled with each other, and the
first typecheck of the combined tree passed. Reading the rail for peer status is
cheaper than reconciling a clobbered file.

### 2. The canonical host: composed from env, named nowhere

The dispatch is explicit — the canonical host is the manual, at `/fund`, and
**no host string may be written into any file in this tree** (ASTRA_STANDARD
item 3, and item 12: the later domain cutover must be an env change plus a 301,
never a code change).

`absolute()` in `src/app/seo.ts` is the only place a URL becomes absolute, and
it composes two independent prefixes in the one order that works:

```
href()      adds the MOUNT     /bee-sanctuary -> /fund/bee-sanctuary
absolute()  adds the ORIGIN    /fund/bee-sanctuary -> https://<origin>/fund/bee-sanctuary
```

There is no fallback origin. With `NEXT_PUBLIC_SITE_ORIGIN` unset the helper
returns the mounted-but-relative path, `metadataBase` is `undefined`, and Next
emits nothing absolute — the app is fully functional and the sitemap is
**structurally right and not protocol-valid**, since the sitemaps protocol
requires absolute `<loc>` values. That is reported as the trade it is rather
than solved by baking a host in to satisfy a validator. Both states are measured
in §6.

All measurement used `https://example.invalid` — a reserved, non-resolving name,
the FRONT48 practice — passed in the shell only. Residue scan in §9.

### 3. Per-campaign metadata, and one thing removed

`campaignMetadata()` builds title, description, canonical, openGraph and twitter
from record fields only. Two decisions are worth stating because both are
subtractions:

**An invented description was removed.** FRONT54 shipped a fallback that read
`"<title> on FUND — <funding model>."` when the record
carried no description. It is a generated sentence, this dispatch says metadata
is drawn from on-screen copy only with no invented descriptions, and the
generated form is not on the screen either — the page body says *"This campaign
has not been described yet."* `campaignMetadata()` now **omits** the description
in that case. A share card with no summary line is better than a summary the
campaign owner never wrote appearing under their name on somebody else's
timeline. Recorded here rather than quietly edited, because it is a peer's
deliberate line being taken out.

**No fundraising total appears in any metadata or structured data, at any
length.** `raised_cents` counts authorizations and is never decremented when one
expires (FUND_MF D-2, DB48's to fix). A wrong number in a share card or a rich
result gets cached by third parties and outlives the fix. The on-screen figures
are rendered by FRONT53/54 with the disclosure the screen has room for; a social
card has no room for that context, so it gets none of the number. This is also
why the JSON-LD is `WebPage` and not a donation-shaped type — see §4.

### 4. JSON-LD: `WebPage`, `BreadcrumbList`, `WebSite`, and nothing richer

Schema.org's fundraising vocabularies want an amount raised, a goal, a currency
and a beneficiary organisation — structured claims a search engine may render as
fact. FUND can supply exactly one of those truthfully today. So the markup
describes the page: name, description when one exists, canonical URL, and the
site it belongs to. Every value is already visible on the screen, which is the
standard item 9 sets.

The front door carries `WebSite` and nothing more. **No `SearchAction`** — there
is no search endpoint, and declaring one that does not resolve is the commonest
way this markup becomes a lie. **No `ItemList` of campaigns** — entries without
amounts add nothing the sitemap does not already give a crawler, and entries with
amounts would be republishing the D-2 figure as structured fact.

`JsonLd.tsx` escapes every `<` to `\u003c`. That is not decoration: campaign
titles and descriptions are written by bees, and a title containing `</script>`
would close the tag early and inject the rest of the record into the document as
markup. On an astra that asks people for money, a script-injection seam is the
expensive kind.

### 5. The sitemap is not frozen at build — measured three ways

**(a) The prerender manifest, the FRONT48 check.**

```
routes (prerendered):
  /                     initialRevalidateSeconds=300
  /_global-error        initialRevalidateSeconds=false
  /_not-found           initialRevalidateSeconds=false
  /bee-sanctuary        initialRevalidateSeconds=300
  /community-mural      initialRevalidateSeconds=300
  /fund-the-fountain    initialRevalidateSeconds=300
  /robots.txt           initialRevalidateSeconds=false
  /sitemap.xml          initialRevalidateSeconds=300
dynamicRoutes:
  /[slug]               fallback=null
```

`/sitemap.xml` is **300, not `false`** — the exact value that was wrong on
Justice. `/robots.txt` is `false` and that is correct: it enumerates nothing, so
a build-time value is the whole truth of it. `fallback=null` is Next's marker
for a **blocking** fallback, so a campaign created after the build renders on
demand instead of 404ing forever.

**(b) The ISR window, timed against a running server.** The instrument: build
with the record pointed at a dead host, so the built sitemap holds only the front
door and **every** regeneration logs a line. Then serve it and watch.

```
after startup             +0s     locs=1  sitemap-generations-logged=0
t+30s (inside window)     +30s    locs=1  sitemap-generations-logged=0
t+180s (inside window)    +180s   locs=1  sitemap-generations-logged=0
t+310s (window expired)   +310s   locs=1  sitemap-generations-logged=0
t+325s (after trigger)    +325s   locs=1  sitemap-generations-logged=1
t+340s                    +340s   locs=1  sitemap-generations-logged=1
```

Nothing regenerated for the first 310 seconds. The request that landed after the
window expired was served the stale artifact **and triggered a regeneration**,
which had run and logged its fresh read attempt fifteen seconds later. That is
stale-while-revalidate behaving exactly as the manifest says, on a real server.
A static-forever sitemap would have logged nothing, ever.

**(c) The content is a live read, not a fixture.** Built against the live record,
the sitemap carries the three real slugs with their real creation timestamps
(§6). Nothing in this tree hardcodes a campaign.

**What (b) does NOT show, stated plainly:** the entry count stays at 1 throughout,
because the record was unreachable at runtime too. The end-to-end version —
*a new campaign row appears in the served sitemap without a redeploy* — needs a
row created after the build, which is a write to production `give_campaigns`.
**The owner ruled no write.** It is on the could-not-verify list in §10, and §11
records what would close it.

An attempt to get that proof without a write is worth recording because it
**failed for an instructive reason**. The plan was to break the build-time read
and let the runtime read succeed, so campaigns would appear in the served sitemap
that were not in the built one. Pointing `NEXT_PUBLIC_SUPABASE_URL` at a dead
host at build time does not achieve this: **NEXT_PUBLIC_ values are inlined into
the bundle at build, including in server code**, so the running server kept
talking to the dead host even with the real value in its environment. Measured,
not assumed — it is the reason run (b) shows `locs=1` after regeneration rather
than 4. A second attempt using a `--require` shim to fail `fetch` during the build
only was **abandoned as an unreliable instrument**: it fired in the page-data
phase (`listCampaignSlugs` failed) but not in static generation, where Next
installs its own `fetch` wrapper over it, so the sitemap built with all three
campaigns anyway. A test that works in one phase and silently not in another is
worse than no test, so nothing was built on it.

### 6. Emitted output, verbatim

**Sitemap with origin and base path** (`NEXT_PUBLIC_SITE_ORIGIN=https://example.invalid`,
`NEXT_PUBLIC_BASE_PATH=/fund`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://example.invalid/fund</loc>
<changefreq>hourly</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://example.invalid/fund/bee-sanctuary</loc>
<lastmod>2026-06-24T17:55:01.362Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
<url>
<loc>https://example.invalid/fund/fund-the-fountain</loc>
<lastmod>2026-06-24T17:55:01.362Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
<url>
<loc>https://example.invalid/fund/community-mural</loc>
<lastmod>2026-06-24T17:55:01.362Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
</urlset>
```

Origin and mount compose once each — **not double-prefixed**, which independently
confirms FRONT48's finding that Next does not add `basePath` to metadata URLs
itself.

**robots.txt, same build:**

```
User-Agent: *
Allow: /

Sitemap: https://example.invalid/fund/sitemap.xml
```

**Both unset — the state today, and the state any build gets until the owner sets
the variables:**

```xml
<loc>/</loc>
<loc>/bee-sanctuary</loc>
<loc>/fund-the-fountain</loc>
<loc>/community-mural</loc>
```
```
Sitemap: /sitemap.xml
```

Build exits 0, every page renders, **zero absolute URLs anywhere**. Correct, and
not protocol-valid — see §2.

**HTML head, per route** (origin + base path build, extracted from
`.next/server/app/*.html`):

| Route | `<title>` | canonical | og:url | JSON-LD |
| --- | --- | --- | --- | --- |
| `/` | `FUND — Fund what matters` | `https://example.invalid/fund` | same | 1 block (`WebSite`) |
| `/bee-sanctuary` | `Bee Sanctuary · FUND` | `.../fund/bee-sanctuary` | same | 2 (`WebPage`, `BreadcrumbList`) |
| `/fund-the-fountain` | `Fund the Fountain · FUND` | `.../fund/fund-the-fountain` | same | 2 |
| `/community-mural` | `Community Mural · FUND` | `.../fund/community-mural` | same | 2 |

Descriptions are the campaigns' own, verbatim from the record: *"Early draft —
funding details to come."*, *"Help seed the Fountain so creators can raise
BLiNG!-rewarded support."*, *"Commission a mural for the commons."*

**The front door sets no `title` on purpose.** FRONT48 measured that Next applies
a layout's title template to CHILD segments only, never to the layout's own page,
so a title set here emits bare with no brand. Omitting it inherits the full
default, which is what the table above shows.

**404s and status codes, from the running server:**

```
/fund/nonsense-slug   status=404  title="No campaign at this address · FUND"
/fund/a/b             status=404  title="FUND — Fund what matters"
/fund/bee-sanctuary   status=200  title="Bee Sanctuary · FUND"
/fund/                status=200  title="FUND — Fund what matters"
```

FRONT54's segment-scoped boundary works and FRONT50's rule is confirmed on this
tree: the matched-then-`notFound()` route resolves the **boundary's** metadata,
not the page's. Deeper URLs never match `[slug]` and fall through to the global
404, which is correct — those are not campaign addresses. The 404 status survives
in both cases.

### 7. robots.txt is delivered, and is inert where FUND is going to be served

Next emits the route under the base path, so behind the mount it answers at
`<origin>/fund/robots.txt` — and **crawlers only read `/robots.txt` at the origin
root**. While FUND's canonical face is a path on the manual, the robots.txt that
governs FUND is **the manual's**, and this file governs nothing.

It is delivered anyway: it is correct the day the assigned domain is attached and
FUND serves at a root of its own (item 12 — an env change, not a code change),
and it names the sitemap so the manual-side robots.txt has something to point at
rather than something to reconstruct. **The follow-up it cannot do for itself:
the manual's own `/robots.txt` needs a `Sitemap:` line for FUND.** That is a
change to another service's tree and belongs to its own dispatch — §11.

### 8. Done tests, exit codes verbatim

| Test | Result |
| --- | --- |
| `npx tsc --noEmit` on the combined three-pass tree | `TSC_EXIT=0` |
| build guard refusal, data source not `live` | `BUILD_EXIT=1`, refused naming only what was missing |
| production build, base path + transient origin, live record | `BUILD_EXIT=0` |
| production build, base path + origin unset, live record | `BUILD_EXIT=0` |
| production build, record unreachable (ISR instrument) | `BUILD_EXIT=0`, sitemap degraded to 1 entry and logged why |
| prebuild chain, every build | `Build guard: live record configured` · `href check: 3 href attribute(s) in src/, all base-aware` |
| ISR window timing on a running server | 0 regenerations at +310s inside window, 1 by +325s after expiry |
| 404 / status behaviour | 4 routes as tabulated in §6 |
| transient-origin residue scan | §9 |

Three campaigns prerendered under `/[slug]` in every live-record build:
`bee-sanctuary`, `fund-the-fountain`, `community-mural`.

### 9. The no-host-string proof

`src/` scanned in full — **17 files**:

```
example.invalid       0
themanual.tech        0
atlasvote             0
unreachable.example   0
rebelution.fund       3   (app/layout.tsx, app/[slug]/page.tsx, lib/supabase.ts)
```

**Zero occurrences of the transient origin, and zero of the canonical host, in
any source file.** The value lived only in the shell environment of the build
commands.

The three `rebelution.fund` hits are all **pre-existing prose, none introduced by
this pass, none a URL the app is served from**: `layout.tsx` and `[slug]/page.tsx`
describe the assigned-but-not-attached domain in comments explaining why no host
is baked in, and `lib/supabase.ts` names the repo-relative path of the local env
file in an error message. They are the same class FRONT48 flagged on Justice and
they want the same ruling — §11.

Whole-repo scan, 345 files: every other hit sits in **gitignored** paths —
`.next/cache/turbopack/*.sst` (build cache) and the local env file — plus
`.gitignore` itself and one pre-existing `nixpacks.toml:8` comment naming
`TheMANUAL.tech` as the project using the Dockerfile builder. Nothing committable
carries a host this pass put there.

### 10. Could not verify — FRONT55

- **THE END-TO-END POST-BUILD CAMPAIGN WAS NOT OBSERVED.** The mechanism is
  proven three ways (§5) and the behaviour — regeneration on a running server
  after the window, with a fresh read — is proven directly. What was **not**
  shown is a campaign row created after the build turning up in the served
  sitemap, because that needs a production write and the owner ruled against it.
  **The first real campaign created after a deploy is the test**, and it is the
  one to watch.
- **No absolute URL has been fetched, and no origin has ever been configured.**
  Every absolute value was composed against `example.invalid`, which does not
  resolve. Composition was verified; nothing was retrieved.
- **No crawler, sitemap validator, rich-results tester or social-card renderer
  has seen any of this.** The XML is well-formed by inspection and the JSON-LD
  parses as JSON; neither has been through the tool that will actually judge it.
- **The no-description metadata branch is unexercised.** All three campaigns on
  the record carry a description, so the omit-the-description path in
  `campaignMetadata()` — the §3 change — is covered by the type system and by
  reading, not by an emitted page.
- **`lastModified` is `created_at`,** because `give_campaigns` has no
  `updated_at`. A campaign whose title or description is edited will keep
  reporting its creation date. Understating is the safe direction (a crawler
  recrawls slower) but it is a real limitation, not a design flourish.
- **ISR was measured at one revalidation, on one route, on one machine.** The
  grid and the detail routes carry the same `revalidate = 300` and were verified
  from the manifest only; no second window was timed.

### 11. Wants a ruling, or a dispatch

1. **The manual's `/robots.txt` needs a `Sitemap:` line for FUND.** Until then
   FUND's sitemap is discoverable only by direct submission. Another service's
   tree — its own dispatch.
2. **The campaign grid does not link to campaign detail pages.** FRONT53's card
   is deliberately not a link because `[slug]` did not exist when it was written;
   FRONT54 landed it minutes later. The result is that **every campaign page is
   currently orphaned** — reachable from the sitemap and from a direct URL, but
   from no link on the site. That is an SEO problem and a usability one, it sits
   in neither pass's manifest, and it is a one-line change in `CampaignCard.tsx`
   for whoever owns it.
3. **The three `rebelution.fund` strings in comments** (§9) want the same ruling
   FRONT48 asked for on Justice: strict reading says no host string in any file,
   intent reading says the serving origin must not be baked in. All three are
   prose, none is a URL, none was introduced here.
4. **Named setters, before the first build of the FUND service**, both
   NEXT_PUBLIC_ and therefore inlined at build — setting them on a built service
   and reloading does nothing:
   - `NEXT_PUBLIC_SITE_ORIGIN` — without it there is no canonical and no
     protocol-valid sitemap.
   - `NEXT_PUBLIC_BASE_PATH` — without it the app roots at `/` and breaks behind
     the mount.

### 12. Local tooling notes, for whoever builds this next

- **`NEXT_PUBLIC_BASE_PATH=/fund` is mangled by Git Bash on Windows.** MSYS path
  conversion rewrote it to `C:/Program Files/Git/fund` and the build died with
  *"Specified basePath has to start with a /"*. `MSYS_NO_PATHCONV=1` on the
  command fixes it. Nothing to do with the app; it will cost somebody twenty
  minutes otherwise.
- **`basePath` is re-derived from the environment at `next start`, not only at
  build.** A build with the variable unset, started in a shell where it is set,
  serves every route under the mount while its assets were emitted for the root.
  On Railway the value is one service setting used for both, so this cannot
  happen there — but it will happen locally and it looks like a total 404 of the
  whole app.

### 13. Discipline

No commit, no push, no deploy, no migration, **no database write** — the
statements this pass sent were the R2 claim, heartbeats, read-only inspection of
`give_campaigns` and `information_schema`, read-only reads of `ops_docs` and
`ops_reports`, and this report's R3 filing.

**No credential was read, printed, copied or committed.** The local env file was
never opened; its presence was confirmed by printing variable names with the
literal string `PRESENT (value not printed)` beside each. The owner created that
file himself. Supabase URL and anon key reached the builds only through Next's
own env loader, and neither appears in this report, in any tool output, or in any
file this pass wrote.

### FRONT56 addendum — the -Q was my misreading, and the correction

**I filed `FRONT56-Q` as BLOCKED and I should not have.** The dispatch body
already specified the behaviour for exactly the state the record is in:

> TEST MODE ONLY. Publishable test key from env. **If no live Connect account
> exists for a campaign, the panel says so plainly and disables.**

`manager_connect_account = 'acct_test_seed'` IS "no live Connect account exists".
That is not a blocker to be escalated; it is the condition the dispatch named,
with the required behaviour written next to it. I read the record's state as an
obstacle to the done test instead of as the case the dispatch had already
answered, and stopped one clause short of my own instructions.

Worse, the panel as filed did not implement that clause. It disabled on a **null**
payout account only, so a campaign carrying a placeholder id would have offered a
give, taken the person's card details, and failed at the fountain with `502
Payment initialization failed`. The dispatch's contingency existed precisely to
prevent that, and I had left the hole it was written to close.

**The fix**, in the two files this pass owns:

- `src/lib/pledge.ts` — `isConnectAccountUsable(account)`. Stripe issues Connect
  ids as `acct_` plus sixteen base62 characters; `acct_test_seed` is `acct_` plus
  nine, with underscores. The check is SHAPE, not existence — only Stripe can
  confirm existence and that needs the secret key this file must never touch —
  and it is stated as such in the code. It errs toward disabling: a real account
  wrongly rejected costs a disabled button and a one-line fix, while the other
  direction costs a card handed to a flow that cannot complete.
- `src/components/PledgePanel.tsx` — a distinct `payout-not-ready` blocker,
  evaluated BEFORE the build-level conditions, because it is a fact about the
  campaign the visitor is looking at rather than about the deployment. It does
  not print the placeholder value; a visitor needs the true reason and whose move
  it is, not the internal string.

### Verbatim, after the fix

Typecheck clean, and the live build green at exit 0 (8 pages, three campaign
slugs prerendered from `give_campaigns`). Every campaign in the record now
renders its own true reason, extracted from the prerendered HTML:

```
[fund-the-fountain]   aon, payout account is a placeholder
  Giving is not open  This campaign has not finished setting up payouts, so no
                      card can be authorized for it yet. Giving opens once the
                      campaign manager completes that step.

[community-mural]     kwyr, payout account is a placeholder
  Giving is not open  This campaign has not finished setting up payouts, so no
                      card can be authorized for it yet. Giving opens once the
                      campaign manager completes that step.

[bee-sanctuary]       open collection, no funding model and no account at all
  Giving is not open  This campaign has no goal and no payout account, so it
                      cannot take a card give. Open collections are recorded,
                      not charged.
```

### The authorization, stated plainly

**No test-mode authorization was performed, and none is possible against the
record as it stands** — every campaign in `give_campaigns` now correctly refuses,
by the dispatch's own clause. The give path itself is built and the panel reaches
the Stripe.js step only when a campaign can honestly take a card.

What it would take, in order: a real test-mode Connect account (owner action at
the Stripe dashboard — an agent may never create an account or sign in), a write
to `give_campaigns.manager_connect_account` (its own dispatch),
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set as a named env setter per ASTRA_STANDARD
v1.0 §8, and a sign-in as one of the 18 existing accounts. Then: give at or above
$0.50, confirm with `4242 4242 4242 4242`, and the panel prints the
PaymentIntent id and status verbatim. **`requires_capture` is the status that
proves the money is held and not taken.**

### Still standing for the lead, unchanged by this addendum

1. **The `kwyr` copy contradiction.** The dispatch says tell a keep-what-you-raise
   giver the card "is charged now"; the deployed fountain creates a
   `capture_method: 'manual'` intent for BOTH models and captures at `/close`. I
   wrote what is true and flagged it. **This one I am NOT withdrawing** — the same
   dispatch says the copy must be TRUE and calls getting it wrong a
   consumer-protection problem. If immediate capture for `kwyr` is intended, that
   is an edge-function change with its own dispatch, not a copy change.
2. **The fee.** `fee_schedule.fee_key='give'` reads `platform_pct=2, active=false`,
   and the deployed function sends no `application_fee_amount`. The panel reads
   the row and says no fee is being taken, naming the ruled rate as pending DB50.
3. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** is absent and not in `.env.example`
   (that file is outside this manifest). Named setter.
4. **A stale sentence in `src/app/page.tsx`** (disclaimed here): "The contribution
   screen is not built" is false once this lands. One line, needs a dispatch.
5. **`fountain` is at v15**, not v14 as FUND_MF v0.1 records.

`FRONT56-Q` holds the full build detail for this pass and stands as filed, except
for its BLOCKED framing, which this addendum corrects.

---

## OPS101 — Railway deploy prep for FUND: the owner's dashboard checklist

Session `7239533e` (fallback id — `MC_SESSION` unset). 2026-08-17. **This pass
wrote a checklist, not a service.** No deploy, no dashboard, no Railway CLI, no
DNS, no env value in any file or report, and no file touched but this one.

Canon read at claim time: ASTRA_STANDARD v1.0 items 2, 3, 5, 6, 7, 8, 12;
DEPLOY_AMENDMENT v2 (all six terms); JMF v0.7 §4 and §6 (the deploy template and
the named seams); VOTE_MF v0.8 (the smoke of record); the FRONT51 report (the
dormant proxy and the named-setter record).

### 0. The premise, measured rather than repeated

The dispatch states `/fund` serves the SPA catch-all. Probed live:

```
/fund    status 200 | bytes 1570 | title The Manual · HONEYCOMB Knowledge Spine
/give    status 301 | location /fund
/vote    status 200 | bytes 46700 | title The floor — every open vote in civic life
```

Confirmed, with one correction: **1,570 bytes, not 1,576** — the figure FRONT51
measured for the same shell. FRONT52's `/give → /fund` 301 is live, so crawlers
are being redirected onto an empty shell right now. `/vote` is the proof the
pattern works end to end.

### 1. Dashboard settings, in the order to set them

| # | Setting | Value | If you get it wrong |
| --- | --- | --- | --- |
| 1.1 | **Which project** | Create the service **inside the existing TheMANUAL.tech Railway project** | Private networking is same-project only (JMF v0.7 §4). A service in its own project can never be reached at `*.railway.internal` by the manual, and the only fix is deleting and recreating it. |
| 1.2 | Source | GitHub `rebelutionxyz/honeycomb-workspace`, branch `main` | Push-to-deploy rides the **existing** GitHub App grant, which already covers this repo (JMF v0.7 §4). No new grant is needed — if the dashboard asks for one, stop and re-read, because that was the wrong turn in the OPS89 hour. |
| 1.3 | **Root Directory** | `REBELUTION.fund` | Nixpacks builds the workspace root instead: no FUND `package.json` at that level, so the build either fails or builds something else. |
| 1.4 | **Config-as-code path** (`railwayConfigFile`) | `REBELUTION.fund/railway.json` | **This resolves from the REPO ROOT, not from Root Directory.** Entering plain `railway.json` is the OPS89 mistake — seven silent build failures. ASTRA_STANDARD §6 requires the in-folder file **and** the dashboard Root Directory; neither substitutes for the other. |
| 1.5 | Builder | Nothing to set — `railway.json` declares `"builder": "NIXPACKS"` | If the build log does not name Nixpacks, 1.4 did not take effect. That is the signal to check, not the env vars. |
| 1.6 | Build / start commands | **Leave blank. Do not set either.** | `nixpacks.toml` declares install and build; `railway.json` declares `startCommand: npm run start`. A dashboard override silently wins over both files and puts the deployed behaviour somewhere no file records. |
| 1.7 | Private networking | Enabled (the default inside a project) | The service listens on IPv6 — `next start -H ::` in `package.json` — which is what Railway's private network requires. Do not change the start command to bind IPv4. |
| 1.8 | **Public domain** | **Attach none.** Do not click Generate Domain | DEPLOY_AMENDMENT v2 term 2: FUND is a **private** service and its public face is the path on the manual. The one exception is the temporary smoke domain in step 4.10, removed immediately after (term 4). |
| 1.9 | `PORT` | Do not set it | Railway injects it and `next start` reads it. Setting it by hand is how a service ends up listening somewhere the platform is not routing to. |

**Verified against the files as they exist in this folder, not from memory:**
`railway.json` declares `builder: NIXPACKS` and `startCommand: npm run start`;
`nixpacks.toml` declares `nodejs_20`, `npm ci --no-audit --no-fund`,
`npm run build`, and `[start] cmd = npm run start`. The two agree with each other
and with the table above. `nixpacks.toml` also carries the OPS89 lesson in its
own header, naming `REBELUTION.fund/railway.json` as the value — the file and
this checklist say the same thing.

### 2. Environment variables — every one FUND needs at BUILD time

All six are `NEXT_PUBLIC_*`, which means **they are inlined into the bundle
during `next build`, not read at runtime**. DEPLOY_AMENDMENT v2 term 3 and
`nixpacks.toml` both state the consequence, and it is the single most expensive
thing to get wrong here: **setting any of these on an already-built service and
reloading the page does nothing.** They must all exist *before the first
successful build*, and any later change needs a **redeploy**.

| Variable | Where the value comes from | Set by |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | `/fund` — a path, not a host. It is the mount FRONT51 built the proxy around, and `next.config.mjs` derives `basePath` from it | owner |
| `NEXT_PUBLIC_DATA_SOURCE` | `live` — exactly this string; `scripts/build-guard.mjs` compares for equality | owner |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → project `anxmqiehpyznifqgskzc` → Settings → API → Project URL | owner |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → the anon/publishable key. **Must be the legacy `eyJ…` JWT, not the `sb_…` format** — root CLAUDE.md records that `sb_` breaks supabase-js | owner |
| `NEXT_PUBLIC_SITE_ORIGIN` | The manual's public origin: scheme + host, **no trailing slash, no path**. Not written into this report — ASTRA_STANDARD §3 forbids a host string in any file in this tree, and a report is a file in this tree | owner |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → **TEST mode** publishable key (`pk_test_…`) | owner |

Only the first two carry a literal here, and neither is a secret: they are
constants the code compares against, already written in `next.config.mjs` and
`build-guard.mjs`. The other four are the owner's and appear nowhere.

**Two things about that list are not obvious and both matter:**

- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` IS NOT IN `.env.example`.** The five
  names in that file are `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_DATA_SOURCE`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SITE_ORIGIN`. The sixth was introduced by FRONT56 in
  `src/lib/pledge.ts` and that pass flagged the gap itself, in the function's own
  comment, as outside its manifest. **The list above was built by grepping every
  `process.env.` read in `src/`, `scripts/` and `next.config.mjs` — the code, not
  the example file — precisely so this could not be missed.** `.env.example`
  needs the name added; that is a one-line edit for a pass that owns it.
- **A LIVE Stripe key is refused by the app on purpose.** `stripePublishableKey()`
  returns a blocked state for any key starting `pk_live_`, and the give panel
  disables itself and says so. That is FRONT56 enforcing test-mode-only, not a
  misconfiguration. Give it the `pk_test_` key.

### 3. The named setter on the MANUAL side — `FUND_INTERNAL_URL`

| | |
| --- | --- |
| **Name** | `FUND_INTERNAL_URL` |
| **Service** | the **MANUAL** service, not FUND |
| **Value** | FUND's private internal host **and port** — the same shape as the existing `VOTE_INTERNAL_URL` and `JUSTICE_INTERNAL_URL` |
| **Setter** | **the owner**, at the Railway dashboard |
| **When** | after the FUND service exists and has a private address |
| **Then** | **redeploy the MANUAL** — this is a runtime var, but the manual reads it at boot |

FRONT51 shipped the `/fund` proxy **dormant** behind this variable and measured
both states. Until this is set, `/fund` falls through to the SPA shell exactly as
it does today: inert, not broken. This is the wake step, and it is the last one —
nothing about FUND is publicly visible before it.

### 4. Order of operations, with the failure mode of each step

1. **Commit and push the pending FUND work.** `git status` shows
   `REBELUTION.fund/REPORT.md`, `src/components/PledgePanel.tsx` and
   `src/lib/pledge.ts` modified and **uncommitted** right now. *Failure mode:*
   Railway builds what is on `origin/main`. Deploy before this and FUND ships
   without FRONT56's give panel — a live surface built from a half-landed pass.
   `origin/main..HEAD` is currently 0, so everything else is pushed.
2. **Create the service inside the TheMANUAL.tech project** (1.1). *Failure:*
   unreachable over private networking, forever; delete and recreate.
3. **Set Root Directory and the config path before letting a build run** (1.3,
   1.4). Railway usually kicks off a build the moment the repo is connected —
   let that one fail, it costs nothing. *Failure:* the build never reads
   `railway.json`, so the start command and builder are whatever Railway guessed.
4. **Set all six variables** (§2). *Failure:* the build guard refuses. **That
   refusal is the guard working** (ASTRA_STANDARD §5, DEPLOY_AMENDMENT v2 term
   3) — it prints exactly which names are missing and never prints a value.
5. **Redeploy.** *Failure:* skipping this leaves the variables set and the build
   unchanged, which looks identical to a bug in the app.
6. **Read the build log for two lines** — `Build guard: live record configured
   (data source "live", both Supabase vars present).` and `href check: N href
   attribute(s) in src/, all base-aware.` *Failure:* if neither appears, the
   prebuild chain did not run, which means step 3 did not take effect. Note also
   JMF v0.7 §6: the dashboard shows init-stage errors the buildLogs API cannot
   see — if the build is silently not starting, read the dashboard text.
7. **Confirm no public domain is attached** (1.8).
8. **Copy FUND's private internal address; set `FUND_INTERNAL_URL` on the MANUAL
   service** (§3). *Failure:* `/fund` keeps serving the 1,570-byte shell.
9. **Redeploy the MANUAL.** *Failure:* the proxy stays dormant; the variable is
   read at boot.
10. **Smoke, then remove any temporary domain.** VOTE_MF v0.8's shape, adapted:
    `/fund` 200 and the campaign grid; `/fund/fund-the-fountain` 200 with the
    campaign detail; `/fund/no-such-campaign` **404** on the FUND-branded page;
    `/fund/_next/static/...` served by FUND and **not** answered with the SPA
    shell — that last one is the mount-order law passing its own test, and the
    failure it catches reads as a bug in FUND when it is a bug in the manual;
    `/` and `/vote` unaffected. **If a temporary generated domain was created for
    this, remove it immediately after** (DEPLOY_AMENDMENT v2 term 4). It is
    scaffolding, not a second front door.

### 5. Go / no-go — what must be true before the deploy click

- [ ] The three modified FUND files are committed and pushed (step 4.1).
- [ ] The service sits **inside** the TheMANUAL.tech project.
- [ ] Root Directory `REBELUTION.fund`; config path `REBELUTION.fund/railway.json`.
- [ ] All **six** variables set, including the one missing from `.env.example`.
- [ ] `NEXT_PUBLIC_DATA_SOURCE` is exactly `live`. The live-only guard **will
      refuse a mock production build** — that is the mechanism working.
- [ ] The Stripe key is `pk_test_`, not `pk_live_`. A live key is refused by the
      app and disables giving.
- [ ] `NEXT_PUBLIC_SITE_ORIGIN` is set. Without it `absolute()` emits
      root-relative URLs and **the sitemap is not protocol-valid** — the sitemaps
      spec requires absolute `<loc>` values. FUND will serve; its SEO kit will
      be half-built, which is worse than obvious because it looks fine.
- [ ] No public domain attached.
- [ ] Understood that **nobody can give yet**, and that this is expected — see
      below. It must not be read as a failed deploy.

### 6. Flags for the lead — found while verifying, outside this pass to fix

1. **No campaign can take a give today, and the panel is right to refuse.** Both
   financially-configured campaigns carry the literal
   `manager_connect_account = 'acct_test_seed'`; `bee-sanctuary` carries `null`
   (an open collection, which the table's constraint permits to have no account).
   `isConnectAccountUsable()` tests for a real `acct_…` id and disables with a
   plain sentence. **Deploying is still the right call** — the browse surface is
   real and `/fund` currently serves nothing — but the give button will be
   disabled on every campaign in the record, by design.
2. **The fee state has moved since FUND_MF v0.1 was written, and something may
   now be stale.** Measured this pass: `fee_schedule.fee_key='give'` is
   `platform_pct=2, active=true`, and the `fountain` edge function is at
   **version 15**. FUND_MF v0.1 records `active=false` and "fountain v14 ACTIVE",
   and `PledgePanel.tsx`'s header comment reasons from the dormant state. DB50
   appears to have shipped. The panel's disclosure is read from the row at
   runtime so it should say the true thing regardless — but the prose around it
   assumes otherwise, and **whether the deployed v15 actually sends
   `application_fee_amount` was not checked by this pass.** Worth a dispatch
   before FUND serves, because a wrong fee disclosure is a wrong statement about
   somebody's money.
3. **`.env.example` is one name short** (§2). Small, but it is the file a new
   machine is set up from.

### Could not verify

1. **Anything at the Railway dashboard.** No deploy, no dashboard, no CLI — the
   hard limits of this dispatch. Every step above is written from the repo files,
   canon, and the FRONT51/OPS89/VOTE precedents.
2. **That the checklist is complete against Railway's current UI.** Railway moves
   its settings around; the names here are the ones canon and the existing VOTE
   and Justice services use.
3. **Whether the deployed `fountain` v15 sends `application_fee_amount`** — flag
   2 above. Version and fee row were read; the function body was not.
4. **The smoke in step 4.10 has not been run** — it cannot be, until the service
   exists. It is written as the test to run, not as a result.

---

## FRONT57 — SMOKE OF RECORD for FUND — **NOT RUN** (precondition failed)

**Date:** 2026-08-17 · **Lane:** front · **Session:** 89ae0f40 (fallback id)
**State:** released back to `queued` per the dispatch's LEAD AMENDMENT.

`GET https://themanual.tech/fund` returns **200, 1,576 bytes**, title
`The Manual · HONEYCOMB Knowledge Spine` — the Manual SPA shell served for an
unmatched path. The FUND service is not deployed, so the six probes were not run
and nothing was called green.

Per the amendment, the claim was released rather than parked, and the terminal
claimed again (FRONT59). The FRONT55 carry-over — *sitemap lists a campaign
created after build* — stays on the could-not-verify list, untouched.

---

## FRONT59 — `scripts/env-check.mjs`: fail the build on an undeclared env read

Session `89ae0f40`. 2026-08-17. Staged only; nothing committed, nothing pushed.
**State: DONE.** `FRONT59-Q` was filed mid-pass and answered by the owner within
the session — the missing name was added to `.env.example` by his own hand, which
is the only hand that could add it (see § *Deviations*, item 3).

### Manifest owned

| File | State | What it is |
| --- | --- | --- |
| `scripts/env-check.mjs` | new | the check |
| `package.json` | modified | one line: `env-check` appended to the `prebuild` chain |

Everything else in the working tree is disclaimed — `CLAUDE.md`,
`src/components/PledgePanel.tsx` and `src/lib/pledge.ts` were already modified
when this pass claimed, and were not touched. `REPORT.md` is always in scope per
R6. `src/app/site-origin.ts` was edited twice during this pass to plant and then
remove a test violation; it is byte-identical to HEAD now and correctly absent
from `git status`, which is itself the proof the plant was fully removed.

### What it enforces

Every env var read under `src/` must be declared in the env manifest. Reads that
are not declared **fail** the build; declared names that are never read **warn**.
The asymmetry is deliberate — a dead manifest entry is a nuisance, and a build
that refused over one would train the owner to disable the check, which costs
more than the nuisance ever did.

### Read forms — matched, and knowingly not

Named explicitly because the dispatch asked for honesty about coverage rather
than a claim of it.

| Form | Handling |
| --- | --- |
| `process.env.NAME` | **matched** — the only form this tree actually uses |
| `process.env['NAME']` | **matched** |
| `process.env[expr]` (computed) | **detected, reported as UNANALYZABLE, warns** |
| `const { NAME } = process.env` | **detected, reported as UNANALYZABLE, warns** |
| `const e = process.env; e.NAME` | **not detected** — needs a real parser; this is a scanner and says so |

The two blind spots announce themselves with file and line rather than widening
quietly. They stay warnings and not failures: both forms are legal, and refusing
a legal construct is how a check gets deleted. Worth adding that they matter less
than they look — Next inlines `NEXT_PUBLIC_*` into client code only where the
reference is a literal `process.env.NAME`, so a computed or destructured read of
one does not work at all. The blind spots are real for server-side code and close
to theoretical for the client half.

**Comments are stripped before scanning, and that is load-bearing, not cosmetic.**
Three files in `src/` discuss `process.env` in prose to explain why they read it
literally, and `src/lib/pledge.ts:163` writes `process.env.NEXT_PUBLIC_...` with
an ellipsis — which a naive scan reads as a variable named `NEXT_PUBLIC_` and
fails the build over. The stripper is string-aware so a quote inside a comment
cannot derail it. One known limitation, checked and currently harmless: a regex
literal containing a quote character would be mistaken for a string opening.
There is none in `src/` today; the symptom if one lands is a read going unseen,
so it is named in the file header rather than left to be found.

### Scope of each half, and why they differ

The **failing** half reads `src/` only, as dispatched. The **warning** half also
counts reads in `next.config.mjs` and `scripts/*.mjs` when deciding whether a
declared variable is used anywhere — `NEXT_PUBLIC_BASE_PATH` is read by
`next.config.mjs` and `build-guard.mjs` reads the Supabase pair, so warning that
those are "never read" would be false. A warning nobody believes is worse than no
warning. This is a judgement call beyond the literal dispatch wording; it widens
no failure, only suppresses false noise.

### Proof — the check refuses (verbatim, full prebuild chain)

The check found the real bug on its first run, with nothing planted. This is the
whole chain, with the live guard satisfied by inline env so the run reaches
`env-check` instead of stopping at `build-guard`:

```
> fund@0.1.0 prebuild
> node scripts/build-guard.mjs && node scripts/href-check.mjs && node scripts/env-check.mjs

Build guard: live record configured (data source "live", both Supabase vars present).
href check: 3 href attribute(s) in src/, all base-aware.
env check: UNANALYZABLE read (computed key) at scripts/build-guard.mjs:42
      process.env[name]);
      This form is legal but cannot be checked. Declare its variables by hand.

BUILD REFUSED - src/ reads env var(s) that .env.example does not
declare. A fresh deploy is configured from that manifest, so a name missing
from it is a name that will simply be absent in production.

  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      read at src/lib/pledge.ts:169

  Fix: add each name above to .env.example with a placeholder value.
  NEXT_PUBLIC_* bakes in at BUILD time - there is no runtime moment at which
  a missing one could still be corrected.

PREBUILD_EXIT=1
```

That offender is not hypothetical and not planted. It is the exact variable the
dispatch cites as having shipped read-but-undeclared, and it is **still
undeclared right now** — the flag this file raised at the end of the preceding
pass ("`.env.example` is one name short") has not been fixed. The check's first
act was to catch the bug it was written for.

### Proof — it catches a NEW name, not just the pre-existing one

A pre-existing violation proves the check fires; it does not prove the check
would notice something introduced tomorrow. So both unmatched-but-detected forms
and a fresh dot-form read were planted in `src/app/site-origin.ts` and the chain
re-run:

```
env check: UNANALYZABLE read (destructuring) at src/app/site-origin.ts:44
      {NEXT_PUBLIC_FRONT59_DESTRUCTURED} = process.env
      This form is legal but cannot be checked. Declare its variables by hand.
env check: UNANALYZABLE read (computed key) at scripts/build-guard.mjs:42
      process.env[name]);
      This form is legal but cannot be checked. Declare its variables by hand.

BUILD REFUSED - src/ reads env var(s) that .env.example does not
declare. ...

  NEXT_PUBLIC_FRONT59_PLANTED_NAME
      read at src/app/site-origin.ts:43
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      read at src/lib/pledge.ts:169

PREBUILD_EXIT=1
```

Both line numbers are exact against the planted file, which is what makes the
"no hunt required" claim true rather than aspirational. The plant was then
removed and the output returned to the single real offender; `git status` lists
no change to `src/app/site-origin.ts`.

### Proof — nothing already proven was disturbed

```
href check: 3 href attribute(s) in src/, all base-aware.
HREF_EXIT=0
```

```
BUILD REFUSED - FUND is not configured to read the live record.

  - NEXT_PUBLIC_DATA_SOURCE is "mock" - a shipped build must be exactly "live".
GUARD_EXIT=1
```

`build-guard` still refuses on the unmodified local env, which is correct — the
local config is `mock`. `npm run typecheck` exits 0.

### Proof — it passes once the manifest is complete (the other direction)

A check that has only ever refused is half-proven. After the owner added
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.example`, the same chain, unchanged:

```
> fund@0.1.0 prebuild
> node scripts/build-guard.mjs && node scripts/href-check.mjs && node scripts/env-check.mjs

Build guard: live record configured (data source "live", both Supabase vars present).
href check: 3 href attribute(s) in src/, all base-aware.
env check: UNANALYZABLE read (computed key) at scripts/build-guard.mjs:42
      process.env[name]);
      This form is legal but cannot be checked. Declare its variables by hand.
env check: 6 variable(s) read in src/, all declared in .env.example.
PREBUILD_EXIT=0
```

Standalone, on the unmodified local env, `node scripts/env-check.mjs` also exits 0.

Two things worth reading off that output rather than passing over:

- **Six variables, all declared.** `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DATA_SOURCE`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_PATH`,
  `NEXT_PUBLIC_SITE_ORIGIN`. The count is the check's own, not a hand tally.
- **No "declared but never read" warnings fired at all**, which says the manifest
  has no dead entries either — and incidentally exercises the half of the check
  that reads `next.config.mjs` and `scripts/*.mjs`. Without that half,
  `NEXT_PUBLIC_BASE_PATH` and the Supabase pair would each have produced a false
  warning here. The suppression is now observed, not just argued for.

The `UNANALYZABLE` line persisting through a green run is the intended behaviour:
`build-guard.mjs:42` genuinely does read a computed key, the check says so every
time, and it does not fail the build over it.

### Deviations and judgement calls

1. **No violation needed planting for the primary proof.** The dispatch asked for
   a planted one; the tree already contained a real one. Both are recorded — the
   real one as the headline, the planted one as proof that a newly-introduced
   name is caught too.
2. **The warning half reads three files outside `src/`** (§ *Scope of each half*).
3. **`.env.example` was never read by this session, and was not fixed by it.**
   The file is denied to this terminal's Read tool by the secrets guard, and it
   sits outside this pass's manifest ("disclaim everything else") — two
   independent reasons to stop, so `FRONT59-Q` was filed rather than a unilateral
   edit made. The owner added the missing name himself and the pass then closed
   green. Logged to `logs/permission-needed.md` as the third recurrence of this
   gap (FRONT35 read, FRONT43 write, FRONT59 both). The check itself needs no
   permission change: it reads the file at build time for **names only** — the
   left of `=`, never one byte to the right — so no value entered this transcript
   at any point.
4. **The check found a real deploy bug, not a bookkeeping one.** Worth separating
   from the pass's own mechanics: a fresh service configured from that manifest
   would have baked `undefined` into the client bundle for the Stripe publishable
   key, and the pledge surface would have silently not worked. The name is now
   declared, so that specific failure is closed.

### Could not verify

1. **A full `npm run build`.** Local env is `mock`, so `build-guard` refuses
   first, by design. Overriding it inline to reach `env-check` is legitimate for
   testing the chain; overriding it to run a real `next build` against a
   placeholder Supabase URL would not prove anything worth having.
2. **Behaviour on a regex literal containing a quote character.** None exists in
   `src/` today; the limitation is stated rather than tested.
3. **That the six names are the complete set of env vars this service needs.**
   The check proves reads and declarations agree — it cannot know about a
   variable that Railway needs and nothing in the tree reads.
