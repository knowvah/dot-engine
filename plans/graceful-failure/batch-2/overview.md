<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 2: registry and zero-patch carried oracle

T4 and T5 run in parallel; neither touches `src/`.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T4 | Generate the registry; add the fitness test | typescript-pro | `test/corpus/failure-sites.json`, `test/corpus/failure-sites.test.ts` | T3 | [x] |
| T5 | Zero-patch carried build, sample self-check, oracle switch | build-engineer | `test/corpus/carried-selfcheck.ts`, `test/corpus/carried-selfcheck-sample.json`, `test/corpus/oracle-paths.mjs`, `test/corpus/gvbindir-defaults.test.ts` | T2 | [x] |

Gates: 1–5. Gate 4 must be fully green again; T5 clears batch 1's known
`gvbindir-defaults` failure.
