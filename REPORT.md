# REPORT — TheMANUAL.tech

Report of record for dispatched passes with `workdir=TheMANUAL.tech`. Updated in place every pass.
Newest pass first.

**Archive chain.** This file rotates when it exceeds 512 KB at sweep time (root `CLAUDE.md` R6).
Rotated files are write-once and live under `docs/reports/`, which is exempt from the sweep's 1 MB
gate by name. Read them newest-first when you need history older than this file:

| # | file | covers | bytes at rotation |
|---|---|---|---|
| 002 | `docs/reports/REPORT-archive-002.md` | **OPS74** (2026-08-03) through **DB43** (2026-08-08). Top section: `DB42`. See the ordering note below. | 676,177 |
| 001 | `docs/reports/REPORT-archive-001.md` | DOCS17-era passes through **OPS74-Q** (top section: `OPS74-Q`; oldest: the DOCS17 / A.1 appendix material) | 1,782,627 |

This file starts at **SWEEP1** (2026-08-08), the pass that performed rotation 002.

**Ordering note, recorded honestly.** Archive 002 is *mostly* newest-first but not strictly. The last
three passes written into it — `FRONT32`, `FRONT34`, `DB43`, all 2026-08-08 — were **appended at the
end of the file rather than inserted at the top**, against the "Newest pass first" convention stated
above. That was this session's error, caught during rotation 002 and recorded rather than quietly
tidied, since the archive is write-once. When searching archive 002, search by pass id and do not
trust position. Passes from this file forward go at the top, under the header.

---

## SWEEP1 - ORGANISE AND COMMIT THE TREE (2026-08-08)
