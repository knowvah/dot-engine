<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Blind-spot diagnoses

Run SEQUENTIALLY in main under diagnosis mode (C instrumentation + injection
A/B don't parallelize; write-sets are disjoint but the discipline is serial).
Only ids T1 left unresolved are in scope — consult T1's journal note first.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T3 | circo 2095_1 (deterministic, Δ66pt, 2197 diffs) | (main, diagnosis mode) | `src/layout/circo/*` or `src/pathplan/*` per mechanism, registries, circo parity files | T1 | [ ] |
| T4 | fdp family: graphs-b53, 1879, graphs-badvoro, 2108, 1652 | (main, diagnosis mode) | `src/layout/fdp/*` per mechanism, registries, fdp parity files | T1 | [ ] |
| T5 | sfdp 2619_1 + 1879, neato 2619_2 (small deltas, likely drift) | (main, diagnosis mode) | `src/layout/sfdp/*`, `src/layout/neato/*` per mechanism, registries, parity files | T1 | [ ] |

Gate per task: typecheck + tests; touched-engine plain/json/map/xdot
re-verdicts 0 regressions; every resolved id journaled with mechanism.
