# Batch 2: model parsing, KK primitives, VPSC order, image warnings

Runs after T0, in parallel worktrees. Write-sets are disjoint. T1 and T2 feed T6/T7; T3, T4
and T5 are independent items.

Every new or grown file in `src/` stays within the complexity hook (500 lines per file,
30 NLOC per function, CCN 10, 5 parameters; a file already over 500 lines may not grow).
Long C functions split into named helpers in C order, each with `@see` and its C line
range.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-neato-model.md) | Item 108: port `neatoModel` | typescript-pro (sonnet) | `src/layout/neato/index.ts` (parseModel), its test, `ipsep-probes.test.ts` | T0 | [ ] |
| [T2](T2-kk-primitives.md) | Item 103a: KK subset weights, `circuit_model(g)` | typescript-pro (opus) | `src/layout/neato/kkutils.ts`, `stress-models.ts`, `circuit.ts` (+ tests, harness values) | T0 | [ ] |
| [T3](T3-sweepline.md) | Item 105: VPSC sweep-line order and tie-break | typescript-pro (opus) | `src/vpsc/SweepLine.ts` (+ `sweepTypes.ts`), `src/layout/neato/quad-prog-vpsc.test.ts` (+ fixture) | T0 | [ ] |
| [T4](T4-ftnull.md) | Item 104: layout-time FT_NULL warning | typescript-pro (sonnet) | `src/common/poly-init.ts`, `src/common/htmltable.ts`, `src/gvc/image-resolver.ts`, `src/gvc/usershape.ts` (sizer accessor) (+ tests) | T0 | [ ] |
| [T5](T5-safefile-hooks.md) | Item 107: per-context hooks in `safefile` | typescript-pro (sonnet) | `src/common/safefile.ts`, `src/common/graph-init.ts` (+ tests) | T0 | [ ] |
