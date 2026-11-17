# T1: `eq` tolerance in splineIntersectsLine, test-first

## Context

16.1.1 `d3ab9ba47` replaces three exact comparisons in `splineintersectsline`
with `eq(a, b)` = `fabs(a - b) < 1e-7` ([decisions](../decisions.md#background)).
The port (`src/pathplan/route.ts`, base `954ec6b3`) keeps 16.1.0's `===` at
`:94` (`silBothZero`), `:147` and `:148` (`splineIntersectsLine`).

## Steps

1. **Red.** In `src/pathplan/route.branch.test.ts`, add a `describe` for
   16.1.1's tolerance with the tests below. Run
   `npx vitest run src/pathplan/route.branch.test.ts` on the base and journal
   each failure message. Every test listed as red must fail for the stated
   reason; the controls must pass.
2. **Green.** Apply AD-1 and AD-2:
   - `/** @internal — exported for route.branch.test.ts */ export class RouteHelper`.
   - `static eq` before `addRoot`, as
     [harness/counterfactual.patch](../harness/counterfactual.patch) has it.
   - The three sites use `RouteHelper.eq`.
   `git diff <base> -- src/pathplan/route.ts` must equal the counterfactual
   plus the export line and its comment, nothing else.
3. Update the test file's header comment. It says silBothZero is "only
   reachable when a barrier edge is a single point (a === b)" and names an
   exact-root-coincidence branch "impractical to construct". Both are now
   wrong: silBothZero takes any edge with both extents under 1e-7, and the new
   tests construct the root case.
4. Run `bash plans/issue-165-sil-tolerance/harness/run.sh $TMPDIR/issue165-t1`.
   Pass: `route: port vs 16.1.1` prints `EQUAL`, and `sil` prints `EQUAL`.

## Tests (values from native 16.1.1: harness `route-1611.out`, `sil-1611.out`)

`routeSpline(barriers, [pt(0,0), pt(10,0)], slopes)`, exact `toEqual` on the
returned points. The A and C rows use one barrier, the 16.1.1 column is the
expected value, and the middle two control points are listed (end points are
`pt(0,0)` and `pt(10,0)`):

| case | barrier | slopes | base (red) | 16.1.1 |
|---|---|---|---|---|
| A, dx = 1e-15 | `(5,1)`–`(5+1e-15,100)` | `(0,1)`, `(0,-1)` | `(0,0) (10,0)` | `(0,1.1111111111111112) (10,1.1111111111111112)` |
| A, dx = -1e-15 | `(5,1)`–`(5-1e-15,100)` | same | `(0,4.4444444444444446) (10,4.4444444444444446)` | same as above |
| C, dx = 1e-14 | `(5,-100)`–`(5+1e-14,-1)` | `(0,-1)`, `(0,1)` | `(0,-4.4444444444444446) (10,-4.4444444444444446)` | `(0,-1.1111111111111112) (10,-1.1111111111111112)` |
| A, dx = 2e-7 (control) | `(5,1)`–`(5+2e-7,100)` | `(0,1)`, `(0,-1)` | `1.1111111111111112` | same (outside the tolerance) |

`RouteHelper.splineIntersectsLine(sps, lps, roots)`: the count exactly, each
root with `toBeCloseTo(v, 15)` (AD-3):

| case | sps | lps | base (red) | 16.1.1 |
|---|---|---|---|---|
| P, k = 1.7 (root site) | `(0,0) (2,3.4) (7,11.9) (10,17)` | `(3,5.1)` twice | 0 | 1: `0.35113454531210514` |
| Qp, d = 0 (root site) | `(0,0) (0,4) (10,4) (10,0)` | `(5,3)` twice | 0 | 1: `0.50000000000000011` |
| Qv, dx = -1e-15 (vertical site) | same | `(5,1)`–`(5-1e-15,100)` | 0 | 1: `0.50000000000000011` |
| Qv, dx = 1e-9 (vertical site) | same | `(5,1)`–`(5+1e-9,100)` | 1: `0.50000000000134703` | 1: `0.50000000000000011` |
| Qv, dx = 2e-7 (control) | same | `(5,1)`–`(5+2e-7,100)` | 1: `0.50000000026936064` | same |

Build the P points as the harness does (`2*k`, `7*k`, `10*k`, `3*k` in double
arithmetic), not as decimal literals: `3*1.7` is not `5.1`. Each test's comment
cites `d3ab9ba47` and the harness file the value came from.

## Write-set

`src/pathplan/route.ts`, `src/pathplan/route.branch.test.ts`, the mission
journal.

## Read-set

`~/git/graphviz-16.1.1/lib/pathplan/route.c:278-346`, `src/pathplan/route.ts`,
`src/pathplan/route.branch.test.ts`, `src/pathplan/solvers.ts:15-21`,
`.agent-notes/pathplan-fma-contraction-map.md`, the harness.

## Acceptance criteria

- Given the base, when the new tests run, then the A ±1e-15, C 1e-14, P 1.7,
  Qp 0, Qv -1e-15 and Qv 1e-9 tests fail and the two controls pass.
- Given the head, when `npx vitest run src/pathplan` runs, then every test
  passes.
- Given the head, when `harness/run.sh` runs, then the port's route output
  equals `route-1611.out` byte for byte and `sil` prints `EQUAL`.
- Given `git diff <base> -- src/pathplan/route.ts`, then it is the
  counterfactual plus the `@internal` export, nothing else.

## Observability

N/A.

## Rollback

Reversible: revert the commit.
