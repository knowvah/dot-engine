# T8: circo multi-component overlap removal

## Context

`src/layout/circo/circular.ts:168` `adjustNodes(_sg)` is a stub. C runs
`adjustNodes(sg)` on each derived component subgraph before packing
(`~/git/graphviz/lib/circogen/circularinit.c:212`; single-component path at :203
is already ported via `adjustNodesFull(g)`). The port builds proxy graphs for
packing (`buildProxyGraph`, circular.ts:212) — check whether they (or the derived
nodes) can carry width/height/pos to `adjustNodesFull` and copy results back the
way C's derived nodes do.

## Task

Step 0: a 2-component circo graph with `overlap=prism` (and `overlap=scale`) where
native output differs from the port. Wire per-component `adjustNodes` faithfully.
If it needs more than ~3× the C involved (adjustNodes call + derived-node
position plumbing), stop and propose (ADR-6).

## Write-set

`src/layout/circo/circular.ts`, `src/layout/circo/circo-components-overlap.test.ts` (new).

## Acceptance criteria

- Given a 2-component circo graph with `overlap=prism`, when it renders, then it
  matches native within ±0.5.
- Given `overlap=scale`, then it matches native within ±0.5.
- Given no `overlap` or a single component, then output is byte-identical to before.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
