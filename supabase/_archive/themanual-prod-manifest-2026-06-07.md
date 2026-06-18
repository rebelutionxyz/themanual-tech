# themanual.tech — PROD Verification Manifest
**Project:** anxmqiehpyznifqgskzc  **Snapshot (UTC):** 2026-06-07T10:39:19Z
**Purpose:** prove any backup/restore is complete against the live spine. Store this OFF-PROD next to the dump.

## Spine integrity — CLEAN
- orphans (realm_id not in realms): **0**
- duplicate ids: **0**  | duplicate paths: **0**  | null realm_id: **0**
- type convention: ALL atoms are `type='event'` (universal default label — not meaningful)

## Atoms fingerprint
- **total_atoms:** 5,790  (was 5,565 at 2026-06-06 close → +225 today)
- **+225 provenance:** created 2026-06-07 ~01:17 UTC — a Universities branch
  (society 126 + culture 99). In-convention, clean. NOT in the handoff; MUST be in next backup.
- **atom_id_checksum (md5 of all ids, ordered):** `3529fa8f32ed9d63ce84e6592ceb9702`

## Per-realm (atoms / leaves / branches)
| realm | atoms | leaves | branches |
|---|---|---|---|
| society | 919 | 803 | 116 |
| justice | 722 | 604 | 118 |
| geography | 619 | 575 | 44 |
| culture | 557 | 448 | 109 |
| science | 536 | 444 | 92 |
| tech | 532 | 445 | 87 |
| religion | 404 | 352 | 52 |
| history | 332 | 286 | 46 |
| health | 314 | 276 | 38 |
| philosophy | 221 | 197 | 24 |
| self | 216 | 194 | 22 |
| math | 204 | 171 | 33 |
| human_activities | 164 | 146 | 18 |
| reference | 50 | 40 | 10 |
| **TOTAL** | **5,790** | **5,425** | **365** |

## Other content tables (row counts)
atom_contributions 4,881 · atom_sources 0 · canonical_documents 5 · document_versions 5 ·
question_bank 44 · bling_transactions 0 · bling_pots 7 · bling_system_state 1 ·
bees 8 · bee_profiles 8 · astra_registry 1

## Verify a restore matches this snapshot
Run against the restored DB; both must match the values above:
```sql
SELECT count(*) AS total_atoms,
       md5(string_agg(id, '|' ORDER BY id)) AS atom_id_checksum
FROM atoms;
-- expect: 5790  and  3529fa8f32ed9d63ce84e6592ceb9702
```
If both match, the atom spine restored byte-for-identical on content.
