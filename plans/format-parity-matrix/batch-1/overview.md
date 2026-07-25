<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Harness plumbing

Four independent tasks, no write overlap, all parallelizable. T1+T2 create the
plain comparator + renderer (consumed by T5). T3+T4 parameterize the existing
json/map walkers by engine.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T1 | Plain comparator + tests | typescript-pro | `test/golden/compare-plain.ts`, `test/golden/compare-plain.test.ts` | — | [x] |
| T2 | Plain subprocess renderer | typescript-pro | `test/corpus/render-one-plain.ts` | — | [x] |
| T3 | json-walk per-engine | typescript-pro | `test/corpus/json-walk.ts`, `test/corpus/render-one-json.ts` | — | [x] |
| T4 | map-walk per-engine | typescript-pro | `test/corpus/map-walk.ts`, `test/corpus/render-one-map.ts` | — | [x] |

Gate after batch: `npm run typecheck` + `npm test` green. No sweeps yet.
