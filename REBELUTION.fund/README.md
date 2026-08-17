# FUND

The crowdfunding astra. Platform surface slug `fund`; canonical face is a path
on the manual (FUND_MF v0.1). `rebelution.fund` is **assigned but not attached**
— per ASTRA_STANDARD v1.0 §12 that cutover is an env change plus a 301, never a
code change, which is why nothing in this tree names a host.

Formerly **GIVE**. Copy, docs, UI, folder and URLs say FUND; **schema
identifiers are unchanged** — `give_campaigns`, `fountain_pledges`,
`fee_schedule.fee_key='give'` all stand (FUND_MF v0.1, following the
ORACLE_MF v1.27 precedent).

## What is here

The **shell only**, scaffolded by OPS97 from the REBELUTION.vote template per
ASTRA_STANDARD v1.0. There is no campaign surface: FUND_MF v0.1 carries it as
open defect D-1 (the contribution UI was never built) and assigns it to FRONT53
/ FRONT54.

| Piece | File |
| --- | --- |
| Env-driven base path | `next.config.mjs` |
| Link boundary | `src/lib/href.ts` + `scripts/href-check.mjs` |
| Live-only build guard | `scripts/build-guard.mjs` |
| Data seam | `src/lib/provider.ts` |
| Supabase clients | `src/lib/supabase.ts` |
| Metadata origin | `src/app/site-origin.ts` |
| Deploy config | `nixpacks.toml`, `railway.json` |

## Local work

```
npm install
npm run dev
```

The dev server runs against the fixtures. `npm run build` **refuses** unless the
app is configured to read the live record — that is `scripts/build-guard.mjs`
working, not failing. Copy `.env.example` to `.env.local` and fill it in for a
production build; every value there is empty on purpose (ASTRA_STANDARD §8: env
values live in a named setter, never in a file or a report).

## Deploy

Private Railway service, no public domain (DEPLOY_AMENDMENT v2). Both of these
are required and neither substitutes for the other:

- `railway.json` in this folder, and
- the Railway **Root Directory** set at the dashboard.

The `railwayConfigFile` value resolves **from the repo root**, so it is
`REBELUTION.fund/railway.json` — not `railway.json`. See the OPS89 note in
`nixpacks.toml`.

## Before anything serves real money

FUND_MF v0.1 carries defect **D-2**: `raised_cents` is incremented at
authorization and never decremented, so a campaign can read goal-met off money
that has evaporated. It **gates any live pledge, absolutely**, and is DB48's.
The 2% platform fee was ruled active by the owner on 2026-08-17 and lands with
DB50. Stripe is in test mode; every existing row is a 2026-06-24 test seed and
no live money has ever moved.
