<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal — coverage-90

| Date | Decision / Finding | Evidence | Files | Gates |
|------|--------------------|----------|-------|-------|
| 2026-07-28 | T1 baseline globals (pre-deletion): st 86.10 (26791/31115), br 73.68 (12472/16925), fn 91.00 (3956/4347), ln 89.19 (22297/24997). Post-deletion: st 86.28, br 73.85, fn 91.29, ln 89.39. | npm run coverage x2 | coverage/ | suite 3406 green, 15s |
| 2026-07-28 | D5 deletion: src/layout/pack/test-helpers.ts — vitest helper stranded in src/, ZERO importers (grep `from.*test-helpers.js` across src+test: 0 hits). Not catalog-expected (not a C module). | import-grep | deleted | tsc clean |
| 2026-07-28 | D5 deletion: src/layout/patchwork/tree-node.ts — catalog-expected (patchwork.c:mkTree) BUT superseded duplicate: live TreeNode/mkTree port exists in patchwork/index.ts:39-99 (used by working engine). Zero importers. Ambiguity resolved by live-equivalent evidence, so stop-4 not triggered. | import-grep + index.ts duplicate | deleted | tsc clean |
| 2026-07-28 | D5 deletion: src/gvc/textlayout.ts — catalog-expected (gvtextlayout.c) BUT superseded by AD-2 direct-measurer architecture: the gvtextlayout role (span measurement w/ Times-Roman/14 default) is live at common/make-label.ts:111; file's own header documents the simplification. Zero importers; full conformance without it. Stop-4 not triggered (evidence, not ambiguity). | import-grep + make-label.ts live path | deleted | tsc clean |
| 2026-07-28 | Kept (imported, NOT dead): dot/compound-geom.ts (1 importer), dot/edge-route-poly.ts (4 importers), sfdp/sparse-solve.ts, cdt/strhash+hash-core, fdp/normalize.ts, common/arrows-geometry+arrows-miter. Near-0% but referenced — batch-4 long-tail targets. | import-grep | — | — |
| 2026-07-28 | Family ranking re-audit: all 12 batch-2/3 assignments still match the current uncovered-branch ranking; every family >= ~41 uncovered branches (min: T3f anchor 41+pack 50). No rebalance. Digests written to batch-2/T2[a-f].md and batch-3/T3[a-f].md. | coverage-final.json digest script | plans/coverage-90/batch-{2,3}/ | — |
| 2026-07-28 | coverage-final.json is not emitted by default config (json-summary only); T1 regenerated it via `npx vitest run --coverage --coverage.reporter=json --coverage.reporter=json-summary`. Batch gates use npm run coverage (summary suffices). | ENOENT then success | — | — |
