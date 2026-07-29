<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — top gap families (6 parallel sonnet agents)

All tasks depend on T1 (need their Uncovered appendix). Disjoint write-sets;
helpers owner: T2c. One commit per task, made by the orchestrator after that
task's verification. Batch gate per README.

| ID | Family | Mode | Writes | Done |
|----|--------|------|--------|------|
| T2a | layout/neato/splines.ts | mixed | src/layout/neato/splines.branch.test.ts + fixture inputs (neato-splines-*) | [ ] |
| T2b | layout/neato/cdt-surface.ts + multispline*.ts | mixed | colocated *.branch.test.ts + one boundary-port fixture | [ ] |
| T2c | render/json.ts + render/map.ts | mixed | colocated tests + attr-variant fixtures; OWNS test/helpers/ | [ ] |
| T2d | layout/dot/rank.ts + rank-dot2.ts | mixed | colocated tests + rank-zoo fixture | [ ] |
| T2e | layout/circo/blockpath.ts | fixture-heavy | circo topology fixtures + colocated tests | [ ] |
| T2f | label/xlabels-intersect.ts | unit | src/label/xlabels-intersect.branch.test.ts | [ ] |

Gate: manifest merge + count pin (orchestrator), zero existing-ref churn,
full coverage journal, assertion spot-read, iterative fixtures 2x, write-set
diff per task.
