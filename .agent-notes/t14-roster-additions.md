# graphviz-16.1-sync — roster-addition divergences (2026-10-13)

## Observation: circo positioning arithmetic is not the oracle's
- **Context**: tree-share-examples-world diverged on circo in the final walks.
- **Finding**: `src/layout/circo/position.ts` / `position-helpers.ts` evaluate
  `x += a + b` left to right and use no fused multiply-adds, where the 16.1
  oracle's `circpos.c` (objdump of `_doBlock`/`_applyDelta`) uses the
  parenthesised `+=` and five FMAs, C `hypot`, and a 2π wrap on one rotation
  branch. Fixing all of them takes world's positioning trace from 51,274 to
  5,897 mismatched rows; the rest is V8-vs-Apple-libm sin/cos (247,874 of
  8,032,876 calls differ; injecting the oracle's values gives 0 diffs).
- **Impact**: NOT landed — it flips 1855 (circo) from pass to 599 diffs: the
  old pass is luck (with oracle sin/cos injected the patched 1855 is 0 diffs),
  but under the mission's walk rules that is a regression. Patch + tests:
  `plans/graphviz-16.1-sync/followups/circpos-fma-assoc.patch`,
  `position-arith.test.ts.saved`. Landing it needs 1855 accepted as a
  libm-amplification case (comparison page) first.
- **Confidence**: High

## Observation: walk firstDiff is output order, not cause
- **Context**: 1314/2784 reported as background-polygon divergences.
- **Finding**: the cause was component packing (`pack.c` int step saturation
  and 32-bit placement wrap); the graph `_draw_` background is simply the
  first object in xdot output.
- **Impact**: classify a diverged id by trace, not by `firstDiff`.
- **Confidence**: High

## Observation: a second polyomino copy keeps double arithmetic
- **Context**: porting the pack int semantics (`910be2a2`).
- **Finding**: `src/layout/pack/poly-pack.ts` (`putRects` path) has its own
  `computeStep` (`Math.floor`, `d<0` guard) and `fits` (double multiply) —
  the same C functions with the same int-arithmetic gap.
- **Impact**: follow-up candidate for extreme-coordinate polyomino inputs.
- **Confidence**: High

## Observation: libm interposer separates libm drift from port bugs
- **Context**: proving world's residual is sin/cos.
- **Finding**: a `DYLD_INSERT_LIBRARIES` interposer on the stock oracle logs
  every libm call with byte-identical output, and a replay script injects the
  values into the port (built in the session scratchpad, which is ephemeral;
  rebuild from the description if needed: interpose `sin`, `cos`,
  `__sincos_stret`, `pow`, `hypot`, log args+results as `%a`).
- **Impact**: reusable for any last-bit question without rebuilding graphviz.
- **Confidence**: High
