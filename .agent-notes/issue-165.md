# Issue #165: tolerance in `splineintersectsline` (graphviz 16.1.1)

## Observation: solve3's roots differ from the oracle's in the last bit
- **Context**: Pinning `RouteHelper.splineIntersectsLine` against 16.1.1's
  own `splineintersectsline` (`plans/issue-165-sil-tolerance/harness/`).
- **Finding**: On identical inputs the port returns `0.35113454531210520`
  where native returns `0.35113454531210514` (harness cases `P[k=...]`, one
  ulp). The root counts are equal on all 17 cases once `eq` is ported. The
  planning record attributes the bit to libm (`Math.acos`/`Math.cbrt` in V8
  against Apple's); that attribution was not re-measured in execution.
- **Impact**: A test of solve3-derived roots against native values needs
  `toBeCloseTo(v, 15)`, not `toBe`. Counts can be exact. On 16.1.0's exact
  `==` the same last bit changed root counts on a point barrier (2 of the 17
  cases); with 16.1.1's `eq` it no longer does.
- **Confidence**: High for the values (measured, `harness/run.sh` on the
  head); Medium for the libm attribution (planning record).

## Observation: the root-equality site cannot be seen through `routeSpline`
- **Context**: Choosing a test surface for the third `eq` site
  (`silBothZero`, x-root against y-root).
- **Finding**: A point barrier's crossing lies at the barrier's endpoint, and
  `splineIsInside` skips any crossing within `EPSILON1` of an endpoint
  (`route.c:298`). `routeSpline` output is therefore the same whether the
  site finds the root or not. `RouteHelper` is now an `@internal` export
  (not re-exported by `src/pathplan/index.ts`) so the site is tested
  directly.
- **Impact**: Do not look for a `routeSpline` or corpus case to cover
  `silBothZero`'s root comparison; use `RouteHelper.splineIntersectsLine`.
- **Confidence**: High (the harness B cases, near-point barriers, are equal
  between 16.1.0 and 16.1.1 through `Proutespline`; the `sil` P and Qp cases
  differ).

## Observation: a C harness can `#include` `route.c` to reach its statics
- **Context**: `harness/sil-cases.c` calls the file-static
  `splineintersectsline` of each graphviz build.
- **Finding**: `-DROUTE_C="\"<dir>/lib/pathplan/route.c\""` with
  `#include ROUTE_C`, compiled `-O3 -DNDEBUG -std=gnu17` and linked against
  that build's `libpathplan` (and `libutil.a` where the build has one),
  gives the same roots as the oracle library. The planning record says an
  `-O0` build gave different `points2coeff` bits; that was not re-measured.
- **Impact**: Build such harnesses with the oracle's flags (see
  `pathplan-fma-contraction-map.md`), or the comparison is against a
  different contraction pattern.
- **Confidence**: High for the working recipe (run in execution); Medium for
  the `-O0` difference (planning record).

## Observation: the tolerance reaches three corpus jobs and moves none
- **Context**: Gate 6, an instrumented head over 602 svg jobs.
- **Finding**: Only `2168|circo`, `2168|fdp` and `2168_2|fdp` reach a
  comparison whose outcome `eq` changes (near-vertical polygon edges with
  x-extent 7.1e-15 or 1.4e-14, from trig-placed vertices). Their output is
  the same on base and head in all five formats.
- **Impact**: A corpus verdict change is not expected from `d3ab9ba47`; the
  change is observable only on synthetic inputs.
- **Confidence**: High (measured at planning and again in execution).
