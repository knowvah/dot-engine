<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Isolated replay A/B

## Context

T3 pinned the first diverging stage. This task classifies the mechanism
WITHOUT further full renders, by replaying stage inputs through the port's
stage function in isolation (tsx script importing the real port modules —
the pattern that closed polypoly via arrayRects and oldarrows via the
offline directVis replication).

## Task

Case A — `inputsIdentical: true` (mechanism is IN this stage):
1. Build a tsx harness that feeds the recorded inputs to the port's stage
   function; confirm it reproduces the port's divergent output.
2. Then feed C's recorded inputs (identical anyway) and step INTO the stage:
   bisect sub-steps (fitter iterations, box splits, tie comparisons) against
   C's behavior — add C-side sub-step prints only if needed (temporary,
   journal-tracked). Identify the exact expression/branch that forks and WHY
   (misport vs fp tie). For suspected fp ties, run the D4 injection test:
   force the C-side value at the fork; expect the stage output to byte-match.

Case B — `inputsIdentical: false` (divergence is upstream):
1. Recurse one stage up with the T3 dumps (they cover all stages — no new
   render needed). If the trail leaves routing entirely (positions/x-coord),
   check the stop condition (decisions.md #5) before proceeding.
2. If a minimal repro would now help (upstream stage is cheap to exercise),
   extract a subgraph containing the target corridor (tail/head clusters +
   the rank window) and verify it reproduces the upstream divergence in
   seconds-scale renders; iterate there.

## Write-set

Scratchpad harness only.

## Read-set

- T3 interface (`firstDivergingStage`, values)
- The stage's port module (from T3's localization)
- Matching C source (`routespl.c` / `dotsplines.c` region)

## Interface out (consumed by T5)

Mechanism statement draft: site (`file:line` both sides), classification
(misport | irreducible tie | upstream-out-of-scope), decisive experiment
results, ruled-out list with evidence.

## Acceptance criteria

- Given the harness on recorded inputs, when run, then it reproduces the
  port's divergent stage output (validates the harness itself).
- Given the classification, when it is "misport", then the exact branch and
  the C behavior it diverges from are named.
- Given the classification, when it is "tie", then the D4 injection test
  result (forced C value → byte-match) is recorded.

## Observability: N/A. ## Rollback: Reversible.
