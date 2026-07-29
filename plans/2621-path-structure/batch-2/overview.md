<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Resolve

Exactly ONE of T6a/T6b runs, chosen by T5's classification. T7 always runs.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|-----------|------|
| T6a | Faithful fix + unit test (commit 2) — if classification = misport | main (inline) | RCA-named files under src/layout/dot/, src/pathplan/, src/common/splines* + colocated test | T5 | [ ] |
| T6b | Documented acceptance (commit 2) — if classification = irreducible tie | main (inline) | test/corpus/accepted-divergences.json, docs/known-divergences.md | T5 | [ ] |
| T7 | End gates + closeout (commit 3) | main (inline) | test/corpus/parity.json, PARITY*.md, journal, memory | T6a or T6b | [ ] |

If T5 classifies the divergence as upstream-out-of-scope (stop condition 5
fired and the human redirected), this batch is re-planned — do not improvise.
