<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — shape=plain init defect

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T2 | twopi/neato shape=plain sizing at init call-site (AD-3) | (main, diagnosis mode) | `src/layout/twopi/*`, `src/layout/neato/*` init call-sites + colocated tests, `accepted-divergences-plain.json`, `plain-parity-twopi.json(l)` | — | [ ] |

Gate: typecheck + tests; twopi/neato plain + xdot re-verdicts 0 regressions;
dot plain sweep unchanged (754 pass).
