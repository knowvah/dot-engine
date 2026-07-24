<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Plain walker

Assemble the plain track walker from the T1 comparator + T2 renderer.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T5 | plain-walk + empty accept registry | typescript-pro | `test/corpus/plain-walk.ts`, `test/corpus/accepted-divergences-plain.json` | T1, T2 | [ ] |

Gate: `tsc` + `npm test` green; a 3-id `dot` smoke writes `plain-parity-dot.json`.
No full sweep (that is T6).
