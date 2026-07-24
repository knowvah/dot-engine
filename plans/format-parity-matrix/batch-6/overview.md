<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Integrate report + docs + close

T9 and T10 are parallel (different files). T11 closes after both.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T9 | Add plain / json-per-engine / map-per-engine tracks to parity-report | typescript-pro | `test/corpus/parity-report.ts`, `test/corpus/PARITY*.md` | T6, T7, T8 | [ ] |
| T10 | Docs wiring (copy-reports + nav) | typescript-pro | `docs-site/copy-reports.mjs`, `docs-site/.vitepress/config.ts` | T9 | [ ] |
| T11 | Final gates + journal wrap + branch summary | (main) | repo-root `plans/decision-journal.md`, `README.md`(this brief status) | T9, T10 | [ ] |

Gate: full `tsc` + `npm test` + `npm run docs:build` clean; `PARITY.md` shows
all new tracks.
