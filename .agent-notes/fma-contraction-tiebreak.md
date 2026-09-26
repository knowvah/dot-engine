## Observation: route.c split tie-break is decided by clang FMA contraction, not libm hypot
- **Context**: plantuml-ts docs/graphviz-issues/23 (flat labelled edge routes via the
  mirrored label-box corner for label WIDTH 9/20). Symmetric corridor: the two
  candidate split points in `reallyroutespline` deviate by exactly equal amounts
  (port: 58.75559104580429 vs 58.755591045804294, 1 ULP apart).
- **Finding**: the oracle `~/git/graphviz/build` is Apple clang 21 `-O3` on arm64,
  which contracts `a*b+c` to FMA by default (`libpathplan.4.dylib` has ~155
  fmadd/fmsub). Rebuilt the same tree with `-ffp-contract=off` (scratch build,
  oracle untouched): C's OWN corner choice flips on nugecu widths 5, 12, 20, on
  the whole of tests/2368.dot (2 lines) and on the splines-flat-multi cnt=3 graph.
  The port with C's literal strict `if (d > maxd)` (src/pathplan/route.ts
  findMaxDev) is byte-identical to the no-FMA C build on all of these: nugecu
  5/9/12/20/30, 2368.dot (0 diff lines), cnt=3 SVG paths. The no-FMA build still
  calls Apple libm `hypot`, so hypot is NOT the deciding variable here — this
  corrects .agent-notes/2368-residual-flat-label-ranksep.md's attribution.
- **Impact**: against the FMA oracle no tie rule is faithful: tolerant (current)
  matches FMA C on nugecu 5/12/30 and cnt=3, strict matches it on 9/30. Matching
  the oracle exactly would require emulating clang's contraction choices
  (JS has no fma). Issue 23 is left as-is pending a decision on whether the
  oracle should be an `-ffp-contract=off` build (source semantics) — which
  would make strict `>` the faithful rule.
- **Confidence**: High (controlled A/B build, only CMAKE_C_FLAGS differs)
