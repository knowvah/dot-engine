<!-- SPDX-License-Identifier: EPL-2.0 -->

# sfdp `42` — node drift from Apple-libm `pow` vs the port's ARM `pow`

## Status

**ACCEPTED** (2026-10-12, graphviz 16.1 sync, T12). The residual on
`~/git/graphviz/tests/42.dot` under `-Ksfdp` is iterative drift seeded by one
1-ULP disagreement in `pow(dist, 2)` between Apple's libm (native oracle) and
the port's ARM optimized-routines `pow` (`src/common/arm-pow.ts`). It belongs
to the A1 floating-point-determinism class (`docs/known-divergences.md#a1`).
Everything downstream of that primitive was shown to be bit-exact by injecting
the oracle's `pow` values (below).

The earlier registry wording (an A9 "CDT cocircular incircle tie" from a
`sin`/`hypot` 1-ULP) does not describe this graph: with the oracle's own node
positions injected, the routing residual was a port-side mis-port (unmirrored
clang FMA contraction in the multispline corridor geometry), fixed in
`b77b2703 fix(neato): mirror fma contraction in multispline routing geometry`.
Since that commit, injected positions reproduce native's xdot exactly.

## Repro

```sh
GVBINDIR=$SCRATCH/ghl16-all ~/git/graphviz/build/cmd/dot/dot -Ksfdp -Txdot \
  ~/git/graphviz/tests/42.dot > native.xdot
npx tsx test/corpus/render-one-xdot.ts ~/git/graphviz/tests/42.dot sfdp > port.xdot
npx tsx test/golden/compare-xdot.ts port.xdot native.xdot
```

## Native vs port

| | native 16.1.0 | port |
|---|---|---|
| node `0` centre | `290.02,287.31` | `290.13,287.09` |
| node offsets (25 nodes) | — | 0.06–0.65 pt |
| `compare-xdot` diffs | — | 3525 (every node and edge, plus `bb`) |
| with native positions injected (`GVTS_POS_INJECT`) | — | 0 diffs |
| with native `pow` values injected | — | 0 diffs |

## Mechanism

`spring_electrical_embedding` computes the repulsive force as
`KP * (x_i - x_j) / pow(dist, 1 - p)`; for 42 `p = -1`, so the call is
`pow(dist, 2)`. The multilevel hierarchy is 25 → 13 → 7 → 4 nodes and the
coarsest grid's first 94 spring iterations are bit-identical in both builds.
In iteration 95 the repulsive term between coarse nodes 0 and 2 calls `pow`
with

- `dist = 0x1.e67db20e6587fp-1`

which returns

- Apple libm (native): `0x1.ce40bee303b3bp-1` (0.49992 ULP from the exact square)
- `armPow` (port): `0x1.ce40bee303b3ap-1` (0.50008 ULP)

— a near-tie that the two libms round differently. Rounding absorbs the
1-ULP force difference in the positions until iteration 104, where `Fnorm`
differs by 1 ULP; from there the positions diverge, and the remaining
iterations, the three finer levels, `pcp_rotate` and the overlap scaling
amplify it into the 0.06–0.65 pt node offsets. Edge routes and `bb` follow the
moved nodes.

Neither `pow(x, 2) = x * x` nor ARM's `pow` reproduces Apple's: within the
same run Apple's `pow(d, 2)` differs from the correctly rounded `d * d` on 3 of
the first 3279 repulsive terms (errors ≈ 0.503 ULP), so Apple's routine is a
non-correctly-rounded `pow` that no portable implementation matches — the
boundary `src/common/arm-pow.ts` already documents.

## The experiment

1. **Instrumented native.** `lib/sfdpgen/spring_electrical.c` copied to the
   scratchpad with env-gated (`T12DUMP`) `%a` traces: initial positions,
   `K/p/KP/CRK/step`, every iteration's positions, `step` and `Fnorm`, every
   node's force before normalisation, every attractive and repulsive term
   (`dist`, `pow(dist, 1-p)`, running force), every `prolongate` result, and
   the positions before and after `pcp_rotate`. The rebuilt
   `gvplugin_neato_layout` produces output byte-identical to the stock
   oracle with and without the traces enabled.
2. **Matching port traces** (temporary, reverted) at the same points.
3. **First divergence.** Of 67153 trace rows, the first that differs is the
   repulsive term above: identical `dist`, `pow` 1 ULP apart. All earlier rows
   (initial `rand()` positions, 103 full iterations, every force term) are
   bit-identical.
4. **Injection.** The port's `pow(dist, 1-p)` was replaced by a lookup of the
   41112 `(dist → pow)` pairs the native trace recorded (82224 lookups,
   0 misses). Result: all 67153 trace rows bit-identical, including the
   positions after `pcp_rotate`, and `compare-xdot` reports 0 diffs against
   native (after `b77b2703`; before it, the 2 diffs left were edge `4->11`'s
   corridor, which is what led to that fix).
5. **Routing isolation.** Native's own positions injected through the
   attribution hook (`GVTS_POS_DUMP` → `GVTS_POS_INJECT`) also give 0 diffs,
   so no routing divergence remains.

A second libm difference exists but does not move 42's output: in
`makeObstacle`'s circumscribed 8-gon, V8's `Math.sin(0x1.c463abeccb2bbp+1)`
(angle 9π/8) is `-0x1.87de2a6aea960p-2` where Apple's `__sincos_stret` gives
`-0x1.87de2a6aea961p-2`. Injecting Apple's value changes obstacle corners in
the last bit but no emitted coordinate.

## Pins

- `src/layout/neato/multispline.branch.test.ts` — the routing contractions
  (`mkCtrlPts — control points match the native contractions`, boundary-port
  fan).
- Registry: `test/corpus/accepted-divergences-engines.json` `sfdp.42`.
