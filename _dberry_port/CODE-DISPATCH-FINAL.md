# CODE-DISPATCH — DingleBERRY Command Center port (FINAL) → UR Code (TheMANUAL.tech)

Paste this whole block into the UR Code instance. The port package is the unzipped
`dingleberry-command-center/` (place it at repo root `_dberry_port/`). This supersedes the
`CODE-DISPATCH.md` inside the package — both soft spots (SURFACES registration + token merge)
are now resolved below.

---

```
TASK: Port the DingleBERRY Command Center into this repo (TheMANUAL.tech) as the `dingleberry`
surface (DingleBERRY = the SECURITY Astra). You're in the real source tree (UR lane).

INPUT: /_dberry_port/ (unzipped dingleberry-command-center/). Read /_dberry_port/README-WIRING-MAP.md
for the per-screen data map. The screens, typed contract (data/contract.ts), mock data
(data/mock-data.ts), and provider hook (data/useDingleberryData.ts) are there.

SCOPE THIS PASS = STEP 2 ONLY: get /dingleberry building + rendering ON MOCK DATA, identical in
structure to the artifact but re-skinned to this repo (see DESIGN below). No live wiring, no commit.
  Definition of done = `npm run build` clean AND the dev server renders /dingleberry on mock.
  Report the build tail + a screenshot.

ORIENT FIRST (read-only — confirm, then port):
  - Find where /intel/* routes are declared (the router) and mirror that for /dingleberry/*.
  - Confirm the SurfaceGroup type's allowed values (for the SURFACES entry `group` below).
  - Confirm a Lucide security icon is importable (Shield / ShieldAlert / Radar).
  Report these, then proceed.

1. SURFACES REGISTRATION — add to src/lib/surfaces.ts (mirror the INTEL entry shape):
   {
     slug: 'dingleberry',
     name: 'DINGLEBERRY',
     function: 'Security',
     description: 'The platform immune system. Threats intercepted, sources verified, fraud rings broken.',
     purpose:
       'DingleBERRY watches the comb — malware, shill rings, ledger integrity, source credibility. It packages evidence and launches class actions; it never runs the group.',
     icon: ShieldAlert,        // swap for whichever security Lucide icon is imported
     color: '#DC2626',         // DingleBERRY identity red
     group: '<confirm>',       // slot into the correct SurfaceGroup (security/system) — NOT necessarily 'Social'
     tier: 2,                  // shell-on-mock now; bump to 1 when S02+ wire live
   },

2. ROUTING + LAYOUT — mirror INTEL exactly:
   - Create src/pages/dingleberry/DingleberryLayout.tsx mirroring IntelLayout: it renders DingleBERRY's
     OWN internal LEFT sidebar (port the artifact's Sidebar → like IntelSidebar) + <Outlet/> for the screens.
   - Register a /dingleberry/* route tree the same way /intel/* is registered.
   - Screens become routed views under the layout (Command Center default + the drill-in screens).

3. SHARED CHASSIS — DO NOT reimplement:
   - The black TOP HEADER and RIGHT SIDEBAR are the cross-Astra constellation chrome (app-level /
     UtilityChrome). DingleBERRY renders INSIDE them, exactly like INTEL does.
   - The artifact's own TopBar + RightRail (in CommandCenterShell) are DROPPED — the repo's shared
     chrome replaces them. Keep ONLY the artifact's left Sidebar (DingleBERRY's internal screen nav).

4. DESIGN / TOKEN MERGE (locked):
   - Base = the repo's dark system: bg #07080A, semantic tokens (bg / bg-elevated / border / text /
     text-silver / text-muted ...). Use those tokens, not raw CSS vars.
   - DROP the artifact's JUSTICE skin entirely: navy #1B3A5B, gold #B8902F, and the paper bg are GONE.
   - DingleBERRY palette:
       • identity / accent RED  = #DC2626   (define DINGLEBERRY_COLOR = '#DC2626', mirror INTEL_COLOR usage)
       • data / verified  BLUE  = #3B82F6   (cooler than INTEL's #6B94C8 — keep them distinct)
       • secure / healthy GREEN = kettle.sourced (#6FCF8F)  — the "green knobs"
       • text WHITE = text.DEFAULT (#F8F9FA)
   - Status tiers in SourceVerification (sourced/accepted/emerging/fringe/unsourced) → map to the existing
     `kettle` color tokens (same names — they already exist in tailwind.config.ts).
   - Threat/critical states → the alert red; verified/intel → blue; healthy/secure → green.
   - HONEY (#FAD15E) is BLiNG!-only — DingleBERRY must NEVER use it.
   - FONTS: use the repo's font-display (Cormorant Garamond) / sans (Inter) / mono (JetBrains Mono).
     DROP Source Serif 4 / Public Sans / IBM Plex Mono — do NOT add fonts or @font-face.
   - Net: convert every raw var(--…) / inline navy-gold style in the ported screens to the repo's
     semantic tokens + the red/blue/green/white palette above.

5. DATA — screens consume ONLY useDingleberryData() / contract.ts (mock today). Never touch data directly.

6. SCREEN RULES:
   - Mesh screens (S01 InfraHealth, MemberMesh) stay on MOCK — Phase-2 device-sharing backend isn't built.
     Honest placeholders; do NOT fake a backend.
   - DispatchAuth: render the queue (READ) only. Its mutating actions (reverse-ledger, quarantine,
     mute-across-Astra, grant-rank) are OUT OF SCOPE this pass — they wire LAST, post security audit.
   - JusticeHandoff = the class-action launcher: it forms a Manual Group in TheMANUAL's Justice *realm*
     (the record); legal Astra = AtlasADVOCATE. Canon-correct as designed — do NOT rewrite that copy.
   - DO NOT port the JX_* "Justice Docket" app from justice-design-system.jsx — out of scope (it's the
     separate AtlasADVOCATE design direction). Pull only the TLW primitives the screens use.

CONSTRAINTS:
  - Local files + build only. Do NOT git commit/push — Butch commits via GitHub Desktop.
  - Any new view/RPC is a later pass (S02 live wiring) → TheMANUAL.tech/supabase/migrations/. Not now.
  - Report: orient findings (router path, SurfaceGroup values, icon) → files created → SURFACES diff →
    build tail → /dingleberry screenshot.
```
