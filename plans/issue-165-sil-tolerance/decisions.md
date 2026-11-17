# Decisions: issue #165

## Background

Graphviz 16.1.1 (`d3ab9ba47`) adds a tolerance to three float comparisons in
`splineintersectsline` (16.1.1 `lib/pathplan/route.c:306-346`; 16.1.0 `:314-347`):

| site | 16.1.0 | 16.1.1 |
|---|---|---|
| barrier is vertical | `xcoeff[1] == 0` | `eq(xcoeff[1], 0)` |
| barrier is a point | `ycoeff[1] == 0` | `eq(ycoeff[1], 0)` |
| x-root equals y-root (point barrier) | `xroots[i] == yroots[j]` | `eq(xroots[i], yroots[j])` |

`eq(a, b)` is a new file-static function, `fabs(a - b) < EPS` with a local
`const double EPS = 1e-7` ("same tolerance as `solve3`"). The other commits to
`route.c` in `16.1.0..16.1.1` (`a07adde2f`..`0ff9bbf67`: scope, `const`,
parentheses; `40eba80cf`: clang-format) change no behaviour.

The port (`src/pathplan/route.ts`, base `954ec6b3`) has 16.1.0's three exact
comparisons: `splineIntersectsLine` (`:147`, `:148`) and `silBothZero` (`:94`).

What the change does. A barrier edge whose x-extent is not zero but below 1e-7
used to take the general branch, which divides by that tiny `xcoeff[1]`
(`rat = ycoeff[1]/xcoeff[1]`, then `sv = (x(t) - xcoeff[0]) / xcoeff[1]`). The
result there is noise: 16.1.0 reports crossings that do not exist (harness case
`A[dx=1e-15]`: the spline collapses to its chord) and misses ones that do
(`A[dx=-1e-15]`, `C[dx=1e-14]`). 16.1.1 treats the edge as vertical. For a point
barrier, 16.1.0 needs the separately solved x- and y-roots to agree to the last
bit. Those roots come from `solve3`, whose `acos`/`cos`/`cbrt` are libm, so the
count used to depend on libm's last bit (see AD-3).

## AD-1: port `eq` as C has it

Add `static eq(a: number, b: number): boolean` to `RouteHelper`, with a local
`const EPS = 1e-7` and `Math.abs(a - b) < EPS`, carrying `@see
lib/pathplan/route.c:eq`. Use it at the three sites, in C's order. Do not reuse
`solvers.ts`'s `aeq0` or share its `EPS`: C keeps two separate file-static
functions with their own local constants, and `aeq0` takes one argument.
NaN and infinity behave as in C (`fabs(NaN) < EPS` is false; `inf - inf` is
NaN).

[harness/counterfactual.patch](harness/counterfactual.patch) is this change
(src only, without the AD-2 export).

## AD-2: test through `routeSpline`, and `splineIntersectsLine` via an `@internal` export

The two coefficient sites change what `routeSpline` returns, so they are pinned
there, with native 16.1.1's `Proutespline` output
([harness/route-1611.out](harness/route-1611.out)). The root-equality site
cannot be seen through `routeSpline`. `splineisinside` (`route.c:278-303`,
the test at `:298`) skips any crossing within `EPSILON1` of a barrier endpoint, and a point
barrier's crossing is always at its endpoint. So it is pinned on
`splineIntersectsLine` itself, against
[harness/sil-1611.out](harness/sil-1611.out), from 16.1.1's own `route.c`
`#include`d into the harness.

That needs `RouteHelper` visible to the test. Mark it `/** @internal */ export
class RouteHelper`, as `position-ycoords.ts` and `rbtree/index.ts` mark their
test-visible internals. `src/pathplan/index.ts` does not re-export it, and
`package.json` exports only `.`, `./api` and `./render`, none of which reach
`pathplan`, so no published API changes.

Rejected: (a) a new module-level wrapper function: a symbol C does not have.
(b) Leave the root site to the planning harness only: a ported branch with no
test, against `testing.md` and the C-is-sacred rule.

## AD-3: root values are compared to 1e-15, counts exactly

On identical coefficients, the port's `solve3` roots differ from the oracle's in
the last bit (measured: `0.35113454531210520` against `0.35113454531210514`).
The cause is libm: V8's `Math.acos`/`Math.cbrt` against Apple's (`acos(0.123456789)`
differs by 1 ulp). This is accepted platform variance (memory
`libm-variance-accepted`), not this issue's. The `splineIntersectsLine` tests
therefore assert the root count exactly and each root with
`toBeCloseTo(native, 15)`. The `routeSpline` tests assert the points exactly
(`toEqual`): on those cases, the head equals native byte for byte.

The tolerance itself makes this variance matter less. On the base, 2 of the 17
`sil` cases give a root count that differs from 16.1.0 C (`P[k=0.3]`,
`Qp[d=-1e-15]`: exact equality on libm output), and 4 more differ in a root's
last bit. On the counterfactual every count equals 16.1.1, and every root is
within 1e-15 ([harness/port-sil-cf.out](harness/port-sil-cf.out)).

## AD-4: how "equals native" is judged

- Unit level: [harness/run.sh](harness/run.sh) builds both C harnesses against
  the 16.1.0 and 16.1.1 builds with the oracle's flags (`-O3 -std=gnu17`,
  clang's default `-ffp-contract=on`), runs the port's cases on the current
  tree, and compares. Pass on the head: `route: port vs 16.1.1 EQUAL` and
  `sil ... EQUAL`.
- Corpus level: the reach probe and survey in
  [T2](batch-1/T2-gates-finish.md#targeted-survey-gate-6).

## AD-5: scope

In: AD-1, AD-2 and the gates.

Out:

- The other `route.c` commits in `16.1.0..16.1.1` (no behaviour).
- solve3's libm last bits (AD-3; accepted variance, no follow-up).
- Corpus records and `docs/known-divergences.md`: the maintainer's at merge, as
  for #158 and #162-#164. #147 measured no verdict change from this commit.

## Rollback

Reversible: revert the squashed commit. No data model change; the only new
export is `@internal` and reaches no package entry point.

## Operational readiness

- Observability: N/A (a library; no new messages).
- Scalability: one `Math.abs` and a compare per site, same complexity.
- Backwards compatibility: no API shape change. Routes change only where a
  barrier edge's x-extent is non-zero and under 1e-7, or on a point barrier,
  toward 16.1.1.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 helper | `RouteHelper.eq`, local `EPS = 1e-7` | reuse `aeq0` / shared `EPS` | 16.1.1 `route.c:306-310`: own static `eq`, own constant |
| AD-2 test surface | `routeSpline` + `@internal export class RouteHelper` | wrapper function; harness-only coverage | root site unobservable via `Proutespline` (`splineisinside` endpoint skip); `@internal` precedent (70 uses) |
| AD-3 root compare | counts exact, roots `toBeCloseTo(·, 15)` | exact roots; a libm acos/cbrt model | same coefficients give 1-ulp different roots (libm); memory `libm-variance-accepted` |
| AD-5 records | maintainer at merge | update corpus records here | same split as #158, #162-#164 |
