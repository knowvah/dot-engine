# T1 — Map clang's FMA contractions in libpathplan (research only)

**Agent:** cpp-pro (Opus behavioural compensation: implement the simplest
interpretation; no speculative work; return only the structured result — no
preamble, no trailing summary). **Depends on:** T0. **Rollback:** Reversible
(notes only). **Observability:** N/A — no new observable operations.

## Context

The native oracle `~/git/graphviz/build` is Apple clang `-O3` arm64, which
contracts `a*b + c` into `fmadd` per source expression (`-ffp-contract=on`).
`.agent-notes/fma-contraction-tiebreak.md` proved by controlled rebuild that the
contraction — not libm hypot alone — decides the `reallyroutespline` split tie
(plantuml-ts issue 23). `.agent-notes/` A8 / `plans/residual-cleanup/analysis/2646-fp-contract.md`
proved the same for `points2coeff`/`solve3` (2646). The port has `fma`/`fms` in
`src/common/fma.ts` and bit-exact host `hypot` in `src/common/libm-hypot.ts`.
T5 and T7 need a table saying exactly which expressions are fused, and how.

## Task

1. `rsync -a ~/git/graphviz/ <scratchpad>/gv/` (never touch `~/git/graphviz`).
2. Read the oracle's flags from `~/git/graphviz/build/CMakeCache.txt`
   (`CMAKE_C_FLAGS*`, build type) and compile `lib/pathplan/route.c` and
   `lib/pathplan/solvers.c` in the copy with those flags plus `-S -g`.
3. Map every `fmadd`/`fmsub`/`fnmadd`/`fnmsub` in `reallyroutespline`, `mkspline`,
   `points2coeff` (and its callers `splineintersectsline`), `dist`, `solve1/2/3`
   to its source line via `.loc` directives. Record the fused operand order
   (which product is fused, which addend is rounded first).
4. Cross-check: `otool -tV ~/git/graphviz/build/lib/pathplan/libpathplan.4.dylib`
   — same instruction sequence per function as your `-S` build (else your flags
   differ: STOP condition 6 if unresolved).
5. Confirm `dist` calls libm `hypot` (not inlined `sqrt`), and whether any
   static helper (`add`, `sub`, `scale`, `B0..B3`) is inlined and then
   contracted across what were function boundaries in source.
6. For any ambiguous site: bisect with `#pragma clang fp contract(off)` around
   that expression in the copy, rebuild `gvplugin_dot_layout` + `libpathplan`
   in the copy (flags in `native-oracle-libm` memory:
   `-DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex`),
   run the T0 repros 23-w20 and 32 with `GVBINDIR` pointing at the copy, and
   compare bitwise (`-Tdot` pos) with the real oracle.

## Output (interface consumed by T5, T7)

`.agent-notes/pathplan-fma-contraction-map.md` containing, first, a table:

| cFile | line | function | source expr | fused form | notes |
|---|---|---|---|---|---|
| route.c | 133 | reallyroutespline | `B0(t)*p1.x + B1(t)*cp1.x + …` | `fma(B3, p2.x, fma(B2, cp2.x, fma(B1, cp1.x, B0*p1.x)))` | example shape only |

…then the evidence (asm excerpts with `.loc`), and a one-line verdict on
`hypot` (libm call vs inlined).

## Acceptance

- Given the oracle dylib, when disassembled, then every fused instruction in the
  target functions maps to exactly one source expression in the table.
- Given an ambiguous site, when pragma-bisected, then the table records the
  operand order that reproduces the oracle's bits on 23-w20 / 32.
- Given the `-S` build, then its instruction sequence for each target function
  equals `otool`'s (or the discrepancy is stated).

## Read-set

`~/git/graphviz/lib/pathplan/route.c:97-200` (reallyroutespline, mkspline, dist),
`route.c` points2coeff / splineintersectsline, `~/git/graphviz/lib/pathplan/solvers.c`,
`~/git/graphviz/build/CMakeCache.txt`, `.agent-notes/fma-contraction-tiebreak.md`,
`src/common/fma.ts:1-40`.

## Write-set

`.agent-notes/pathplan-fma-contraction-map.md` only (plus scratchpad files).
