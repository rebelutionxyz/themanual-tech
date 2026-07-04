# DingleBERRY Command Center — Integration & Wiring Map

> **Executor: Claude Code, not Claude Design.** This is a code-port into the live
> `TheMANUAL.tech` repo (React/TS/Tailwind/Supabase) — it needs the real source tree,
> which Code has (UR lane) and Design does not. Paste-in brief: `CODE-DISPATCH.md`.

**What this is:** the `DingleBERRY — Command Center` standalone artifact, unpacked into
clean source + a typed data seam, ready to port into `TheMANUAL.tech` as the
`dingleberry` surface (DingleBERRY = the **security** Astra). The artifact was a frozen prototype with
baked-in mock data; this package turns it into something wirable without losing
the design.

**Surface:** slug `dingleberry` — DingleBERRY is the **security** Astra (not a realm; "Justice" here is design-system lineage + the atom realm the class action lands in). Register in the `SURFACES` array,
same pattern as INTEL (slug-routed). Typography is the JUSTICE stack
(Source Serif 4 / Public Sans / IBM Plex Mono); palette navy `#1B3A5B` + gold `#B8902F`.
All visual tokens are in `design-system/tokens.css` (181 custom properties).

---

## The pipeline (definition of done at each stage)

1. **Extract + contract** — *done, this package.* Renders identically to the artifact on mock.
2. **Place + route** — drop into `TheMANUAL.tech/src/surfaces/dingleberry/`, register the slug.
   *Done = `/dingleberry` loads in the real app on mock data.*
3. **Swap mock → live, reads only** — replace provider sections in `useDingleberryData.ts`,
   one screen at a time, S02 first. UI never changes (it only sees `contract.ts`).
   *Done = real numbers, zero write actions.*
4. **Action affordances last** — DispatchAuth enforcement (quarantine / grant rank /
   mute-across-Astra / reverse-ledger). Wire AFTER the pre-launch security audit,
   each behind the existing `auth.uid()` / service-role RPC pattern.
   *Done = enforcement live.*

**Governing rule: reads before actions.** DingleBERRY's action set can reverse ledger
entries and mute members across the platform — it is exactly the P1 actor-as-parameter
risk surface in the security queue. Nothing that mutates wires before step 4.

---

## Folder map

```
dingleberry-command-center/
  README-WIRING-MAP.md          ← this file
  shell/CommandCenterShell.jsx  ← frame: Sidebar / TopBar / RightRail / PostureBanner / GoDark / DBSeal
  design-system/
    tokens.css                  ← all CSS custom properties + @font-face (self-host the woff2)
    justice-design-system.jsx   ← window.TLW shared primitives (Card/Button/TruthStatus/EvidenceMeter…)
                                   NOTE: also contains the separate JX_* Justice "Docket" app — OUT OF SCOPE here
    icons.jsx                   ← DB_ICONS / TLW icon set
  screens/                      ← one file per screen, faithful source
    S01-InfraHealth.jsx
    S02-TransactionSecurity.jsx
    S03-SourceVerification.jsx
    ThreatInterception.jsx
    ShillDetection.jsx
    DispatchAuth.jsx
    KarmaCredit.jsx
    MemberMesh.jsx
    AtlasOracle.jsx
    JusticeHandoff.jsx
  data/
    contract.ts                 ← THE SEAM: typed payload per screen
    mock-data.ts                ← canned data, extracted verbatim from the design
    useDingleberryData.ts       ← provider hook (mock today; swap to live per screen)
```

**Idiom note for the porting agent (Claude Code):** these screens use the artifact idiom — global `window.TLW`
design system, inline `style={{…}}` objects, CSS variables. Porting them to the
repo's idiom (ES imports, TS, Tailwind classes mapped from the tokens) is the
hands-on work. The source here is the source of truth for *look + structure*; the
contract is the source of truth for *data*.

---

## Per-screen wiring map

| Screen | Shows | Live source | Status |
|---|---|---|---|
| **S02 · TransactionSecurity** | well/treasury/supply vs hard-cap, tx stream, freeing-path attestation, unsanctioned-freeing flags, conservation verdict | `bling_system_state`, `bling_transactions`, `economy_integrity_check()`, `economy_integrity_log` | **LIVE-WIRABLE TODAY — do first.** It's a UI over the drain-model + conservation invariant shipped 2026-06-10. One of its mock anomalies is literally "Fiat → BLiNG! sale brokered on-platform" — the Howey-firewall tripwire. |
| **S03 · SourceVerification** | intel sources ranked by chain-of-verification (CoV), credibility score, broken-chain flags | TheMANUAL sources + source-quality / CoV scoring | **Partial.** Source rows exist; CoV scoring may need a view/RPC. |
| **ShillDetection** | coordinated fraud rings, similarity score, Astra span, freeze/throttle status | `bee_affiliate_chain` + five-layer anti-gaming stack | **Partial.** Detection signals exist; "ring" aggregation likely needs a query/RPC. |
| **KarmaCredit** | earned standing, conduct, distance-from-shill, ledger integrity, account maturity | reputation/standing (ties to MiNUTEMEN Good Standing) | **Mostly unbuilt.** Standing tables not yet defined. Mock until then. |
| **DispatchAuth** | enforcement queue: reverse ledger, quarantine node, grant rank, mute-across-Astra | rank-gated RPCs (`auth.uid()`/service-role) | **ACTIONS — wire LAST.** Reads (the queue) can come earlier; mutations after security audit. |
| **ThreatInterception** | malware / surveillance / stalkerware feed, members-protected counts | external ingest source — TBD | **No DB table.** Decide ingest source; mock until decided. |
| **AtlasOracle** | incident copilot ("run the proof sweep", "draft the incident note") | AtlasOracle Astra | **Partial.** Bind queue to real incidents; copilot calls go through AtlasOracle. |
| **JusticeHandoff** | the **class-action launcher** — packages evidence → forms a Manual Group in TheMANUAL's Justice *realm* (the class-action record); legal Astra = **AtlasADVOCATE** | downstream of the above | **Spec, not data.** Composes other screens' outputs. |
| **S01 · InfraHealth** | spine/muscle service health, posture | platform infra + Phase-2 mesh | **Mock-only.** Phase-2 device-sharing unbuilt. Honest placeholder. |
| **MemberMesh** | proof-of-storage, heartbeat, replication, drop rate, per-node health | Phase-2 device-sharing | **Mock-only.** Same — keep on mock, do not fake a backend. |

---

## Open questions for the walk (answer as we go through each screen)

- **S02:** confirm the `bling_transactions.type` vocabulary the stream should surface
  (affiliate_distribute, fountain_reward, deficit_repayment, …) and which `tag`
  (freed/pull) each maps to. Grep the CHECK before trusting any string (vocabulary-drift bug bit twice on 2026-06-10).
- **S03:** does CoV scoring already exist as a column/view, or does DingleBERRY compute it?
- **Shill:** is "ring" a stored cluster or computed on read from `bee_affiliate_chain`?
- **DispatchAuth:** which enforcement actions exist as RPCs today vs. need building?
- **Posture:** what drives the global secure/degraded/critical posture — a derived signal or a manual switch (Patchboard)?

All git via Butch / GitHub Desktop. Migrations (if any new views/RPCs) → `TheMANUAL.tech/supabase/migrations/`.
