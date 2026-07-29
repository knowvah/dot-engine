<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Localize

Serial diagnosis chain, except T1 ∥ T2 (disjoint work: T1 renders/measures,
T2 reads code). T1–T4 write scratchpad artifacts only; the batch's single
tracked commit is T5 (the RCA + journal).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T1 | Baseline renders + target-edge identification + perf calibration | main (inline) | scratchpad only | — | [x] |
| T2 | Stage-dump hook inventory (GV_XDUMP / __XDUMP), close gaps | main (inline) | none expected; else env-gated additions in src/layout/dot/edge-route-faithful.ts | — | [x] |
| T3 | ONE instrumented render per side; offline first-divergence localization | main (inline) | scratchpad dumps | T1, T2 | [x] |
| T4 | Isolated replay A/B; classify defect vs upstream vs tie | main (inline) | scratchpad harness | T3 | [x] |
| T5 | RCA artifact + journal (commit 1) | main (inline) | .agent-notes/2621-path-structure.md, plans/2621-path-structure/decision-journal.md | T4 | [x] |

Batch gate: T5's RCA satisfies diagnosis.md (mechanism, file:line, causal
chain, non-empty ruled-out list). No batch-2 work before it exists.
