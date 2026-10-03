# T5: sfdp loud checks

## Context

Read `CLAUDE.md` and `../decisions.md` (ADR-1…4). `src/layout/sfdp/init.ts` parses
`quadtree` (line ~141, `ctrl.tscheme`) and `label_scheme` (~157) but nothing
honours them: `src/layout/sfdp/quadtree.ts:1-6` says only the NORMAL scheme is
ported. C: `~/git/graphviz/lib/sfdpgen/sfdpinit.c:166-216` (parse),
`spring_electrical.c:1140-1148` (dispatch: NONE → `_slow`, FAST/HYBRID →
`_fast`), and the `edge_labeling_scheme` path in `sfdpinit.c` /
`stress_model.c`. `smoothing`/`rotation` are already loud (lines ~134-155);
follow their pattern.

## Task

Loud check: `throw new RenderError(`<attr>=<value>: <what> is not supported yet`, 'UNSUPPORTED_FEATURE')` from `src/errors.ts`, placed where C branches into the feature (ADR-3). Step 0 (ADR-4): first confirm on a discriminating fixture that native output differs from the port; journal the Δ.
- `quadtree` resolving to NONE or FAST → loud (HYBRID behaves like FAST only
  above `QUAD_TREE_HYBRID_SIZE`; read C and mirror it exactly; journal).
- `label_scheme` > 0 **when** C would take the edge-label path (check whether C
  needs edge labels present; mirror its condition) → loud.

## Write-set

`src/layout/sfdp/init.ts`, `src/layout/sfdp/fidelity.test.ts` (new).

## Acceptance criteria

- `graph{quadtree=none; a--b--c}` with sfdp throws `RenderError`,
  `UNSUPPORTED_FEATURE`, with a message naming `quadtree=none`. Same for `fast`.
- `quadtree=normal` (or unset) is unchanged: same output as before.
- A labelled-edge graph with `label_scheme=1` is loud; a graph where C ignores
  the scheme (if any; see C) is not.
- The existing sfdp tests stay green.

## Quality bar

TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
references on every ported symbol. Complexity limits: ≤30 NLOC/function,
CCN ≤10, ≤5 params. Run `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo
--noEmit` and your own tests only; do not run npm scripts (pre-scripts race
with parallel agents). Do not git commit, push, stash or checkout.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit); irreversible in practice once 2.0.0 publishes.

## Commit

`feat(sfdp)!: fail loudly on unported quadtree and label_scheme`
