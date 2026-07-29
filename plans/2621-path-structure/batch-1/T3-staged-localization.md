<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Staged render + first-divergence localization

## Context

T1 identified the diverging edge(s) by name; T2 confirmed per-stage dumps
with an edge filter. This task spends the mission's SECOND full port render
(and one instrumented oracle render) to capture every stage for the target
edge(s), then localizes offline.

## Task

1. Oracle instrumented render with stage dumps for the target edge(s),
   captured to `$SCRATCHPAD/2621/c-stages/`.
2. Port instrumented render likewise (`$SCRATCHPAD/2621/port-stages/`) —
   background, `timeout -s KILL`, sequential with the oracle, orphan check.
3. Offline diff per stage at `%.17g`: corridor boxes → ports → fitter input →
   fitted spline → installed spline. Record the FIRST stage whose
   inputs/outputs diverge beyond fp noise, and capture BOTH sides' full
   values at that stage.
4. Distinguish "inputs already differ" (upstream) from "identical inputs,
   different output" (this stage is the mechanism site) — that decision
   drives T4's direction.

## Write-set

Scratchpad only.

## Read-set

- `$SCRATCHPAD/2621/target.json` (T1)
- T2's inventory journal section
- Memory `edge-routing-order-done` (routeSplines mutates boxes — dump order
  matters); memory `bezier-emit-size-not-length` (compare bz.size entries,
  not list length)

## Interface out (consumed by T4)

```
{ firstDivergingStage, stageInputsC, stageInputsPort,
  stageOutputC, stageOutputPort, inputsIdentical: bool }
```

## Acceptance criteria

- Given both dump sets, when diffed stage-by-stage, then the first diverging
  stage is identified with both sides' exact values recorded.
- Given the render, when timed, then cumulative full-render count (≤2 of 3)
  is logged against the D5 budget.

## Observability: N/A. ## Rollback: Reversible.
