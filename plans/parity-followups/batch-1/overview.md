<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Baseline refresh

Refresh every stale oracle-error/timeout classification on the 7 per-engine
xdot tracks; close blind-spot accepts whose ids now pass.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T1 | Targeted engine-track refresh + accept closure | (main) | `test/corpus/parity-<engine>.json(l)` ×7, `accepted-divergences-{json,map,plain}.json` (closures only), affected `{json,map}-parity-<engine>.json(l)` | — | [ ] |

Gate: typecheck + tests green; no previously-passing engine-track id regresses.
