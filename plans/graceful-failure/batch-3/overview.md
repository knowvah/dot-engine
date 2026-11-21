<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 3: pilot carried patch and registry classification

T6 and T7 run in parallel (their write-sets are disjoint).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T6 | Patch 0001 = graphviz!5152; retire the canon use-after-free acceptances; add U1 | cpp-pro | `test/corpus/oracle-patches/0001-*.patch`, `test/corpus/oracle-patches/manifest.json`, `test/corpus/accepted-divergences-plain.json`, `test/corpus/plain-parity-*.{json,jsonl}`, `test/corpus/PARITY-*-plain.md`, `docs/known-divergences.md` | T5 | [x] |
| T7 | Classify every registry row; choose the mirror pilot sites | general-purpose | `test/corpus/failure-sites.json`, `plans/graceful-failure/batch-4/mirror-sites.md` | T4 | [x] |

Gates: 1–5, plus gate 6 for T6 (the plain walk across all 8 engines,
against the carried oracle).
