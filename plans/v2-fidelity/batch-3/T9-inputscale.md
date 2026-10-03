# T9: neato `inputscale`

## Context

C: `get_inputscale(g)` (`~/git/graphviz/lib/common/utils.c`) returns the CLI
`-s` value if set, else `late_double(g, "inputscale", -1, 0)`, with 0 → 72.
Only `neato_layout` calls it (`neatoinit.c:1351-1366`, restored at
`:1442`). `PSinputscale > 0` then divides user `pos` values in
`user_pos` (`neatoinit.c:80-112`). The library has no CLI, so the
attribute is the only source. fdp reads the global `PSinputscale`
(`fdpinit.c:52`, `layout.c:320`) but never calls `get_inputscale`. In a
library run the global is whatever neato last left (saved and restored, so 0),
so fdp is unaffected by the attribute.

The port documents it as unported (`src/layout/neato/init.ts:110-115`,
`src/layout/fdp/derive.ts:82`, `src/layout/fdp/init.ts:28`).

## Task

0. Step 0 (ADR-4): confirm natively that `inputscale` changes neato output with
   pinned `pos` and does **not** change fdp output. If fdp *does* change, stop
   (stop condition 3) and report: the planning measurement showed an fdp Δ that
   may have another cause.
1. Port `get_inputscale` (`@see utils.c`) to its natural home: check for an
   existing `late_double` / utils module first; create
   `src/common/utils-inputscale.ts` only if none fits.
2. Apply it in neato's `user_pos` port exactly as C does: the 2-D and 3-D
   branches, and the `z` coordinate.
3. Keep fdp untouched (journal step 0's evidence).

## Write-set

`src/layout/neato/init.ts`, `src/common/utils-inputscale.ts` (new, optional),
`src/layout/neato/inputscale.test.ts` (new).

## Acceptance criteria

- neato with `inputscale=72` and `pos="1,1!"`-style inch inputs matches native
  within ±0.5 on ≥2 graphs.
- `inputscale=0` behaves as 72; negative or absent → no scaling (late_double
  min 0 / default -1; mirror C exactly).
- Graphs without `inputscale` are byte-identical to before.

## Quality bar

TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
references on every ported symbol. Complexity limits: ≤30 NLOC/function,
CCN ≤10, ≤5 params. Run `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo
--noEmit` and your own tests. Do not git commit, push, stash or checkout.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit); irreversible in practice once 2.0.0 publishes.

## Commit

`feat(neato): honour the inputscale attribute for user positions`
