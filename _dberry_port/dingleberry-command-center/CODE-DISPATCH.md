# CODE-DISPATCH — DingleBERRY Command Center port (paste into Claude Code, UR lane)

Paste the block below into the Claude Code instance running in the TheMANUAL.tech repo.
First place the port package where Code can read it (unzip dingleberry-command-center.zip
to a scratch dir, e.g. repo root `/_dberry_port/`).

---

```
TASK: Port the DingleBERRY Command Center into this repo (TheMANUAL.tech) as the `dingleberry` surface (DingleBERRY = the security Astra). You are in the real source tree (UR lane) — that's why this is a Code job, not Design.

INPUT: the port package at /_dberry_port/ (unzipped dingleberry-command-center/). READ /_dberry_port/README-WIRING-MAP.md FIRST — full per-screen wiring map, 4-stage pipeline, rules below. Do not write a file before reading it.

ORIENT FIRST (read-only): find the existing INTEL surface and report back BEFORE porting —
  - where surfaces live (src/surfaces/ or equivalent)
  - the SURFACES array and how INTEL registers its slug/route
  - the Tailwind config + token/theme system (so tokens.css merges, not drops)
  Confirm these paths with me, then proceed.

TARGET (mirror INTEL exactly):
  src/surfaces/dingleberry/CommandCenterShell.tsx
  src/surfaces/dingleberry/screens/*.tsx            ← 10 ported screens
  src/surfaces/dingleberry/data/                    ← contract.ts, mock-data.ts, useDingleberryData.ts (already TS; port near-as-is)
  register slug `dingleberry` in the SURFACES array
  merge /_dberry_port/design-system/tokens.css into the existing theme/token system — do NOT drop the raw file

SCOPE THIS PASS = STEP 2 ONLY: get /dingleberry building + loading ON MOCK DATA. No live wiring.
  Definition of done = `npm run build` clean AND the dev server renders /dingleberry, identical to the artifact, fed by useDingleberryData() (mock). Paste the build tail + a screenshot.

PORTING RULES:
  - Artifact idiom (global window.TLW, inline style={{}}, CSS vars) → repo idiom (ES imports, TS, Tailwind classes mapped from the tokens). The .jsx files are the source of truth for look + structure; contract.ts is the source of truth for data.
  - Screens import ONLY the typed result from useDingleberryData / contract.ts — never touch data directly.
  - From justice-design-system.jsx port ONLY the TLW primitives the screens use (Card/Button/TruthStatus/EvidenceMeter/etc). DO NOT port the JX_* "Justice Docket" app this pass — it is the AtlasADVOCATE (Legal Astra) design direction, a separate build item.
  - Mesh screens (S01 InfraHealth, MemberMesh) stay on mock — Phase-2 device-sharing backend isn't built. Honest placeholders; do NOT fake a backend.
  - DispatchAuth: render the queue (read) only. Its mutating actions (reverse-ledger, quarantine, mute-across-Astra, grant-rank) are OUT OF SCOPE — they wire last, post security audit, behind the auth.uid()/service-role pattern.

CONSTRAINTS (Jun-10 ops):
  - You do local files + build only. Do NOT git commit/push — Butch commits via GitHub Desktop.
  - Any new view/RPC (S02 wiring) → TheMANUAL.tech/supabase/migrations/ — but NOT this pass.
  - Report: orient findings first (paths above), then files created + SURFACES diff + build tail + /dingleberry screenshot.
```
