# issue-154: finite-quotient guards (fdiv_overflow, fdivf_overflow)

## Observation: a float guard has to test the float32 quotient
- **Context**: porting graphviz 16.1.1's `fdivf_overflow`
  (`lib/util/overflow.h:161-174`) for the vpsc alpha and beta steps
  (`lib/neatogen/quad_prog_vpsc.c:114`, `:145`).
- **Finding**: C divides two `float`s and tests `isfinite` on the `float`
  result. The port holds float32 values as doubles, and a quotient between
  `FLT_MAX` (about 3.4e38) and `DBL_MAX` is finite as a double and `inf` as a
  float: `1.25 / 2.5e-39` is 5e38. `Number.isFinite(n / d)` misses it;
  `Number.isFinite(Math.fround(n / d))` does not. With a packed matrix
  `[-1e-39, 0, -1e-39]`, `place = [1, -1]`, `b = [0.5, -0.25]`, one iteration
  ends at `[0, -0.5]` with the float test and at `[-inf, inf]` without it.
- **Impact**: any port of a C `float` range or finiteness check needs
  `Math.fround` before the test, not only before the store.
- **Confidence**: High

## Observation: beta's new guard cannot be seen through the public function
- **Context**: looking for a red test for upstream `d8c1cc3c9` (beta falls
  back to 1 when the quotient is not finite, where 16.1.0 fell back only on a
  zero denominator).
- **Finding**: beta's one reader is `applyBeta`
  (`src/layout/neato/quad-prog-vpsc.ts`), which steps only when
  `beta > 0 && beta < 1.0`. The values the old code could return where the
  new one returns 1 are `+inf`, `-inf` and `NaN`; all three fail that test,
  and so does 1. No input to `constrainedMajorizationVpsc` tells the two
  apart. On the `ipsep-diredge` probe a counting copy of the bundle saw the
  fallback taken twice in 7 calls, both times on `0 / 0`, which the old
  guard also caught.
- **Impact**: the beta change is ported for fidelity and has no behaviour
  test. A later reader of beta outside `applyBeta` would make it observable
  and would need one.
- **Confidence**: High

## Observation: the probes' native comparison is 24 jobs, not 18
- **Context**: running the brief's head-vs-native check on the five probes.
- **Finding**: the probe list is 8 (probe, engine) pairs (`ipsep` and
  `ipsep-diredge` on neato, the other three on dot and neato) times 3
  formats (xdot, plain, cmapx), which is 24. The brief's "18" is a miscount;
  all 24 equal native 16.1.1 byte for byte.
- **Impact**: none on the result; the journal records 24.
- **Confidence**: High
