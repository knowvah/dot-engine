# issue-153: compass-port theta in quarter-pi units

## Observation: negating a C int in JS can make a -0 the C never has
- **Context**: porting graphviz 16.1.1's `invflip_angle`
  (`lib/common/shapes.c:2607`), whose `RANKDIR_BT` arm is `angle *= -1` on an
  `int`.
- **Finding**: C's `int` has one zero, so `0 * -1` is `0` and the later
  `angle * 0.25 * M_PI` is `+0.0`. In JS every number is a double: `-a` and
  `a * -1` turn `0` into `-0`, and `-0 * 0.25 * Math.PI` stays `-0`. `0 - a`
  gives `+0` for a zero and the same value as `-a` otherwise. `toBe` and
  `Object.is` tell the two zeros apart; `===` and `toBeCloseTo` do not.
- **Impact**: where the C negates an integer-typed value that the port holds
  as a `number`, write `0 - a`, or the port carries a sign bit the C cannot
  produce. Here the `-0` theta fed `sin`/`cos` for the spline end tangent
  (`src/common/splines-routespl.ts`) and reached no output: base and head are
  byte-identical on a BT probe with `:e` ports, 5 formats. 16.1.0 negated a
  double there, so the old port's `-0` matched that release.
- **Confidence**: High

## Observation: the old radian thetas were already bit-exact multiples
- **Context**: checking that integer units × `0.25 * Math.PI` equals the
  radians the port built by `Math.PI * 0.75`, `angle - Math.PI * 0.5`, and so
  on.
- **Finding**: for 8 compass points × 4 rankdirs, the only pairs whose bits
  differ are BT on theta 0 (the sign above). A matrix test asserting
  `k * 0.25 * Math.PI` with `toBe` passed 31 of 32 rows on the base
  (`74b09d00`); the failing row was BT `e`.
- **Impact**: 16.1.1's int-theta change (upstream `54360ff3b`) moves no
  layout; a later output difference near compass ports has another cause.
- **Confidence**: High
