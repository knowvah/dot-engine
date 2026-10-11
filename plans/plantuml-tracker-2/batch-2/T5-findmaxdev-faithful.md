# T5 — Faithful `findMaxDev` (plantuml-ts 23/32/33/35; A3)

**Agent:** typescript-pro, model `opus`. Opus compensation: implement exactly
AD-1/AD-3; no speculative abstractions; do not widen beyond the measured need;
return only the structured result — no preamble, no trailing summary.
**Depends on:** T1 (contraction map). **Rollback:** Reversible.
**Observability:** perf SLI — 2646 and graphs-b100 ≤ 1.10× T0 baseline
(`npm run build:js && BENCH_POOL=1 BENCH_IDS=2646,graphs-b100 node test/corpus/bench.mjs`).

## Context

`src/pathplan/route.ts`:
- `:33` `ptDist` = `Math.hypot` (C `dist` = libm `hypot`).
- `:182-212` `findMaxDev`: Bezier eval at `tnas[i].t`, then tolerant
  `d > maxd*(1+1e-10)+1e-10`; C `route.c:reallyroutespline` uses strict `>`.
- `:146` `mkspline`, `:169` `initTnas` (`tnas[i].t` accumulates `dist`).
The long comment at `:193-209` explains why the tolerant rule was chosen; its
premise (Apple hypot/contraction unreproducible) is superseded by
`src/common/libm-hypot.ts` + `src/common/fma.ts` and T1's map — rewrite it.

Planning evidence (reverted experiment, main v2.3.0): `ptDist`→`libmHypot` +
strict `>` alone matched native on 23-w9, 32, 33, 35; 23-w20 still differed
(contraction). `.agent-notes/fma-contraction-tiebreak.md`: with `-ffp-contract=off`
C equals strict-port on nugecu 5/9/12/20/30, 2368 and the cnt=3 graph — so
strict + hypot + contraction is the complete model there.

## Task

1. TDD: `test/golden/pt-issue-23.test.ts` (all 5 widths), `pt-issue-32`, `pt-issue-33`,
   `pt-issue-35` against T0's refs — failing first (23-w5/12/30 pass already and
   must keep passing).
2. `ptDist` → `libmHypot`. Strict `>`. Apply every fused expression from
   `.agent-notes/pathplan-fma-contraction-map.md` for `reallyroutespline`,
   `mkspline`, `dist` — operand order exactly as the table, each site commented
   `// clang -ffp-contract=on: fmadd at route.c:<line>`. Leave `points2coeff` /
   `solve3` to T7 unless the 4 repros cannot pass without them (then do the
   minimum and journal it).
3. Rewrite the A3 comment block to state the new faithful contract.
4. Gates, perf, fresh sweep. Check explicitly: oracle-pinned 241_0 and
   cnt=3 goldens (`src/layout/dot/splines-flat-multi.test.ts`, golden suite)
   stay green; list which A3 ids (2368, 241_1, 2413_1/2, graphs-b100/b104,
   graphs-decorate, 2371) became conformant — T8 consumes this.

## Interface output (consumed by T7, T8)

`{ conformantNow: string[], stillDivergent: { id, maxDelta, note }[], perfMs: {...} }`
in the journal row.

## Acceptance

- Given 23 at widths 5/9/12/20/30, 32, 33, 35, when rendered, then each matches
  native within 0.01.
- Given a fresh full survey, then 0 conformant→worse vs T0 baseline.
- Given the bench, then 2646 and graphs-b100 ≤ 1.10× baseline.
- Given `route.branch.test.ts`, then a test pins the strict tie (two exactly
  equal deviations → first index wins only when C's arithmetic makes them equal)
  using a captured oracle case, not a synthetic assertion of the old rule.

## Read-set

`src/pathplan/route.ts:1-60,140-250`, `~/git/graphviz/lib/pathplan/route.c:97-200`,
`.agent-notes/pathplan-fma-contraction-map.md`, `.agent-notes/fma-contraction-tiebreak.md`,
`src/common/fma.ts`, `src/common/libm-hypot.ts`, `decisions.md#ad-1--findmaxdev-tie-break`.

## Write-set

`src/pathplan/route.ts`, `src/pathplan/route.branch.test.ts`,
`test/golden/pt-issue-23.test.ts`, `pt-issue-32.test.ts`, `pt-issue-33.test.ts`,
`pt-issue-35.test.ts`. Not the ledgers (T8). If a test elsewhere pins the old
tolerant behaviour and now fails against a *conformant* result, that test file is
outside the write-set → STOP 1 and report it.

## Commit

`fix(pathplan): split splines at C's max-deviation point bit for bit`
(body: mechanism + perf numbers; refs plantuml-ts 23/32/33/35).
