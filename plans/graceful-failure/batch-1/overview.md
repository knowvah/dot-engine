<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 1: policy, carried-oracle tooling, scanner

All three tasks run in parallel; none touches `src/`.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | ADR-0003 and the CLAUDE.md carve-out | technical-writer | `docs/adr/0003-upstream-fix-forward.md`, `CLAUDE.md` | — | [x] |
| T2 | Carried-oracle build script and patch-series skeleton | build-engineer | `test/corpus/build-carried-oracle.sh`, `test/corpus/oracle-patches/{README.md,manifest.json}`, `test/corpus/oracle-patches.test.ts` | — | [x] |
| T3 | Failure-site scanner | typescript-pro | `test/tools/failure-sites/{scan.ts,scan.test.ts,cli.ts}` | — | [x] |

Gates: 1–5.
