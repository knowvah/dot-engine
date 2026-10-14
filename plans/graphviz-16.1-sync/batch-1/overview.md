# Batch 1 — triage, tracker conformance suite, two small cleanups

Parallel (worktrees). Write-sets are disjoint. T4 is the only writer of
`known-failing.json` in this batch (`ptIssue` list). Land order: T3 (notes),
T5, T6, then T4. T5/T6 touch `src/` and need a fresh survey at land.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T3 | Triage the 519 commits + 15-vs-16 native corpus diff → port rows | cpp-pro (model: opus) | `.agent-notes/gv16-triage.md` | T0, T2 | [x] |
| T4 | Tracker conformance suite from plantuml-ts repros (~55) | typescript-pro | `test/golden/inputs/pt-issue-*`, `test/golden/refs/pt-issue-*`, `test/golden/pt-issue-*.test.ts`, `test/golden/inputs/PROVENANCE.md`, `known-failing.json` (`ptIssue`) | T0, T1 | [x] |
| T5 | Parser: grammar.y `optmacroname` (`node a = [...]`) | typescript-pro | `src/parser/dot.pegjs`, `src/parser/parser.test.ts`, `test/golden/optmacroname.test.ts` (+ input/ref) | T0 | [x] |
| T6 | Delete dead `routeFlatEdgeFaithful` | typescript-pro (model: sonnet) | `src/layout/dot/splines-flat.ts`, `splines-flat.branch.test.ts`, comment-only refs in `edge-route.ts`, `splines-flat-multi.ts`, `splines-flat-oracle.test.ts` | — | [x] |

Specs: [T3](T3-triage.md) · [T4](T4-tracker-suite.md) · [T5](T5-optmacroname.md) · [T6](T6-dead-flat-router.md)
