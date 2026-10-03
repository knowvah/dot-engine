# T2: fdp `coords` declared graph-wide

## Context

`src/layout/fdp/layout.ts:63` sets `hasCoords: g.attrs.has('coords')` (root
attrs only). C: `infop->G_coord = agattr_text(g, AGRAPH, "coords", NULL)`
(`~/git/graphviz/lib/fdpgen/layout.c:946`) — non-NULL when any (sub)graph
declared `coords`, so cluster `coords=` set only on subgraphs is honoured
(`chkPos`, layout.c:295-330; port `src/layout/fdp/derive.ts` chkPos).
v2-fidelity T9 measured Δ156 pt on such a fixture; adding root `coords=""`
gave Δ0 (plans/v2-fidelity/decision-journal.md, row T9).

## Task

Step 0, then make `hasCoords` true exactly when C's symbol exists: the graph's
own attr or a graph-wide declaration (`g.root.declaredGraphAttrs`, see
`src/model/cgraph-ops.ts:agGraphAttr`). Nothing else changes.

## Write-set

`src/layout/fdp/layout.ts`, `src/layout/fdp/coords-declared.test.ts` (new).

## Acceptance criteria

- Given clusters with `coords=` and no root `coords`, when fdp lays out, then
  node positions match native within ±0.5 (≥2 fixtures, incl. the T9 `k` one in
  the v2-fidelity scratchpad if present, else rebuild it).
- Given no `coords` anywhere, then output is byte-identical to before.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md` and `../conventions.md` (Step 0,
oracle, quality bar, observability/rollback) first. Scratch files go in the
executor's scratchpad under `<task-id>/`. Write-set only; stop and report on
anything else (README stop conditions).
