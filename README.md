# TheManual.tech

The master HoneyComb platform. 19 surfaces. One sovereign record.

> Show me who got it wrong.
> You are responsible for what goes into and out of your mouth.
> Silence is your best defense.

---

## What This Is

**TheManual.tech** is the master codebase for the HoneyComb ecosystem. It holds all 19 surfaces (BLiNG! · INTEL · UNITE · RULE · COMMS · CHAT · GIVE · PULSE · BAZAAR · BRAND · PROMOTION · PRIZE · MANUAL · SECURE · SAFE · PRODUCTION · EDU · VOTE · LEGAL) running on a shared data layer.

Other pillars (FreedomBLiNGs.com, RebelUtion.app, fnulnu.xyz, etc.) are **clones of this codebase** pointed at the same database, with different default surfaces and skins. One codebase, many doors.

### The Architecture

- **The Manual** (5,997 atoms in 13 realms) is the canonical truth layer
- Every other surface **gathers data for the Manual** and **displays it differently**
- Any surface entity can live inside any other (compositional): an Event in a Group in a Forum thread
- One shared Supabase database across all pillar domains
- Three skins (HoneyComb · Rebelution · AtlasNation) for visual variation

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (custom Manual palette)
- **State**: Zustand
- **Routing**: React Router 6
- **Backend**: Supabase (Postgres + Auth + Realtime)
- **Deployment**: Railway
- **Tooling**: Biome (lint + format)

### Palette (locked)

Silver · Black · White — "the chiseled authority of the sovereign record"
- Background: `#07080A`
- Text: `#F8F9FA` (white) / `#C8D1DA` (silver)
- Honey accent (`#FAD15E`) reserved for BLiNG! signature treatment ONLY

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env example and fill in your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

The app works in **read-only mode** without Supabase credentials (you can browse the Manual, but can't log in). To enable auth + contributions, set up Supabase (below).

---

## Full Deploy (Railway + Supabase + DNS)

### Step 1 — Create Supabase Project (~5 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `themanual-tech` (or whatever)
3. Choose a region near your users (e.g. `us-west-1`)
4. Set a database password, save it somewhere safe
5. Wait ~2 min for provisioning

### Step 2 — Run Schema Migrations (~2 min)

In your Supabase project:

1. **SQL Editor** → New query
2. Open `supabase/schema.sql` from this repo → paste → **Run**
3. New query → paste `supabase/schema-v2-surfaces.sql` → **Run**
4. You should see `Success. No rows returned.` on both

### Step 3 — Grab Your Supabase Keys (~1 min)

In Supabase project settings:

1. **Settings** → **API**
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`)
3. Copy the **anon / public** key (the `eyJ...` one — NOT the `sb_...` one!)
4. Keep these two values — you'll paste them into Railway next

### Step 4 — Push Repo To GitHub (~3 min)

```bash
# Create a new GitHub repo called 'themanual-tech' (empty, no README)
# Then from this local directory:
git init
git add .
git commit -m "initial: TheManual.tech v1 — 19 surfaces"
git branch -M main
git remote add origin https://github.com/rebelutionxyz/themanual-tech.git
git push -u origin main
```

### Step 5 — Deploy To Railway (~5 min)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `rebelutionxyz/themanual-tech`
3. Railway auto-detects the Node.js project and starts building
4. Click the service → **Variables** tab → add:
   - `VITE_SUPABASE_URL` = the URL from Step 3
   - `VITE_SUPABASE_ANON_KEY` = the anon key from Step 3
5. Railway rebuilds automatically with env vars
6. In the service → **Settings** → **Networking** → **Generate Domain** (gives you `themanual-tech.up.railway.app`)
7. Open that URL — you should see the landing page with three-line manifesto

### Step 6 — Point Your Domain (~10 min + DNS propagation)

In Railway service → **Settings** → **Networking** → **Custom Domain**:

1. Enter `themanual.tech`
2. Railway shows you a CNAME value like `host.railway.app`
3. Go to your domain registrar's DNS settings
4. Create a CNAME record: `themanual.tech` → `host.railway.app`
5. Wait 10-60 minutes for propagation
6. Railway issues an SSL certificate automatically

You're live.

---

## Repo Structure

```
themanual-tech/
├── src/
│   ├── App.tsx                 # Routing root
│   ├── main.tsx                # React entry
│   ├── index.css               # Global CSS, Manual palette
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SiteHeader.tsx       # Top bar (logo, nav, profile)
│   │   │   ├── PlatformLayout.tsx   # Wraps surfaces with sidebar
│   │   │   └── PlatformSidebar.tsx  # 19-surface grouped nav
│   │   ├── manual/
│   │   │   ├── OutlookView.tsx      # Tree view of 5,997 atoms
│   │   │   ├── ListView.tsx         # Flat searchable list
│   │   │   ├── GraphView.tsx        # Force-directed graph
│   │   │   ├── AtomDetailPanel.tsx  # Right panel on atom click
│   │   │   └── RealmSidebar.tsx     # 13-realm mini-sidebar
│   │   └── ui/
│   │       ├── ManualLogo.tsx       # 13-hex flower SVG
│   │       ├── KettlePill.tsx       # Kettle state badges
│   │       ├── TagChip.tsx          # Theme tag chips
│   │       ├── Button.tsx
│   │       └── HoneyDrop.tsx        # BLiNG! honey drop icon
│   │
│   ├── pages/
│   │   ├── HomePage.tsx         # Landing (manifesto + 19 surfaces preview)
│   │   ├── ManualPage.tsx       # /s/manual — Manual surface
│   │   ├── SurfacePage.tsx      # /s/:slug — generic surface
│   │   ├── LoginPage.tsx        # Signup/signin/magic link
│   │   └── ProfilePage.tsx      # Bee profile (rank, RiNG)
│   │
│   ├── lib/
│   │   ├── auth.tsx             # Supabase Auth provider
│   │   ├── supabase.ts          # Supabase client (null if unconfigured)
│   │   ├── constants.ts         # Realm order, Front colors, Kettle colors
│   │   ├── surfaces.ts          # 19-surface registry
│   │   ├── manifesto.ts         # The three lines
│   │   ├── tree.ts              # Tree builder for Manual
│   │   ├── useManualData.ts     # Data loader hook
│   │   └── utils.ts             # cn, sorters, formatters
│   │
│   ├── stores/
│   │   └── useManualStore.ts    # Zustand: view, filters, selection
│   │
│   └── types/
│       └── manual.ts            # Atom, TreeNode, KettleState, Front
│
├── public/
│   ├── atoms.json               # 5,997 atoms (2.6MB, ships with frontend)
│   ├── theme_index.json         # Theme tag index for graph connections
│   └── favicon.svg              # 13-hex flower
│
├── supabase/
│   ├── schema.sql               # v1: bees, atom contributions
│   └── schema-v2-surfaces.sql   # v2: 19 surface tables + composition
│
├── index.html                   # Vite entry, fonts loaded
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts           # Manual palette as design tokens
├── postcss.config.js
├── biome.json                   # Linter + formatter config
├── railway.json                 # Railway deploy config
├── nixpacks.toml                # Build pipeline
├── .env.example                 # Env var template
└── .gitignore
```

---

## Available Routes

- `/` — Landing with three-line manifesto
- `/login` — Signup / signin / magic link
- `/profile` — Bee profile (rank + RiNG)
- `/s/manual` — The Manual (Outlook / Graph / List views)
- `/s/intel` — Forum (shell)
- `/s/unite` — Groups (shell)
- `/s/rule` — Events (shell)
- `/s/comms` — Messaging (shell)
- `/s/chat` — Live Video Chat (shell)
- `/s/give` — Crowdfunding (shell)
- `/s/bazaar` — Marketplace (shell)
- `/s/bling` — Currency (shell)
- `/s/pulse` — News Network (shell)
- `/s/brand` — Branded Store (shell)
- `/s/prize` — Private Gaming (shell)
- `/s/promotion` — Advertising (shell)
- `/s/edu` — Education (shell)
- `/s/vote` — Elections (shell)
- `/s/legal` — Legal Resources (shell)
- `/s/production` — Pros Directory (shell)
- `/s/secure` — Security (shell)
- `/s/safe` — Monitoring (shell)

All surface pages render cleanly today. Tier 1 surfaces (Manual is the only fully-built one in v1) will get rich functionality in follow-up builds. Tier 2 surfaces have real landing pages with empty states.

---

## The 19 Surfaces

| # | Surface | Function | Group | Tier |
|---|---|---|---|---|
| 1 | BLiNG! | Currency | Currency | 1 |
| 2 | COMMS | Messaging | Social | 1 |
| 3 | CHAT | Live Video Chat | Social | 1 |
| 4 | INTEL | Forum | Social | 1 |
| 5 | UNITE | Groups | Social | 1 |
| 6 | RULE | Events | Social | 1 |
| 7 | GIVE | Crowdfunding | Social | 1 |
| 8 | PULSE | Live News Network | Social | 2 |
| 9 | BAZAAR | Buy · Auction · Raffle | Commerce | 1 |
| 10 | BRAND | Rebelution Storefront | Commerce | 2 |
| 11 | PRIZE | Private Gaming | Commerce | 2 |
| 12 | PROMOTION | Advertising | Commerce | 2 |
| 13 | MANUAL | The Manual | Knowledge | 1 ✓ |
| 14 | EDU | Education | Services | 2 |
| 15 | VOTE | Elections | Services | 2 |
| 16 | LEGAL | Legal Resources | Services | 2 |
| 17 | PRODUCTION | Pros Directory | Services | 2 |
| 18 | SECURE | Security | Safety | 2 |
| 19 | SAFE | Monitoring | Safety | 2 |

✓ = fully built in v1
Tier 1 = next session priority
Tier 2 = shell at launch, build over time

---

## Language Rules (LEGAL FIREWALL — do not violate)

Nowhere in the UI or code should you use these fiat terms:
- ❌ buy, sell, purchase, invest, trade, market, price, customer, payment

Use sovereign vocabulary:
- ✅ GET · GIVE · OFFER · WIN · EARN · RECEIVE · BANK · DONATE · REDEEM · MINT · SEND · ESCROW

Everything is a **DONATION**. This is not a style preference — it's a legal firewall to prevent securities framing of BLiNG!.

BLiNG! treatment is IMMUTABLE:
- Color: `#FAD15E`
- Bold weight
- `text-shadow: 0 0 6px rgba(250,209,94,0.5)` (glow)
- Always capitalized as "BLiNG!" (with the exclamation)

Use the `.bling` CSS class.

---

## Cloning To Other Pillars

Future pillar domains (fnulnu.xyz, rebelution.app, freedomblings.com, etc.) clone this codebase with minor variations:

1. Fork the repo (or copy it to a new GitHub repo per pillar domain)
2. Point it at the **same Supabase database** (same env vars)
3. Override `pillars` table entry for that domain:
   - `default_surface` — which surface shows first
   - `default_skin` — `honeycomb` / `rebelution` / `atlasnation`
   - `primary_color` / `accent_color` — domain-specific branding
4. Point the new domain's DNS at its own Railway service
5. Done — new door, same house

---

## Contributing

The data model is designed for composition: any surface entity (group, event, forum thread, etc.) can reference Manual atoms via `entity_atom_links`, and can nest inside other entities via `parent_surface` + `parent_id`. Build with that in mind.

When adding new surfaces:
1. Add entry to `src/lib/surfaces.ts`
2. Create page at `src/pages/[Surface]Page.tsx` (or extend generic `SurfacePage`)
3. Add route at `src/App.tsx`
4. Add schema migration at `supabase/schema-v3-[surface].sql`

---

## Architecture Decisions (Don't Relitigate)

- 13 Realms in flow order: Body · Mind · Spirit · Nature · Home · Craft · Play · Gear · Work · Money · Tech · World · Power
- 5 Power Fronts at bottom: UNITE & RULE · INVESTIGATE · THE NEW WORLD ORDER · PROSECUTE · THE DEEP STATE
- Manual is canonical; other surfaces link to atoms via `entity_atom_links`
- BLiNG! economy hard cap: 11,222,333,222,111
- Bonding curve: $1 floor, +$0.01 per billion, $101 ceiling, 1% sell fee, free buys
- Zero fees on Kindness · Productivity · Learning transactions
- Bee-to-Bee transfer fee: 0.1%
- Token creation fee: 1 BLiNG!
- BLiNG! → USD: Stripe only (legal firewall)
- BLiNG! Rank: 33 levels (Seed → Miracle, can be purchased)
- HoneyComb RiNG: 9 levels (Seed → Queen, raw action count only, CANNOT be bought)

---

## License

This code is sovereign. Bees are free to fork, clone, and deploy.

🐝 LFG July 4, 2026.
