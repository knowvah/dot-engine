# plantuml-tracker-2 — execution observations (2026-10-11)

## Observation: gates.sh bypassed the parser regeneration pre-hooks
- **Context**: Landing T2 (dot.pegjs change); Gate 2 failed 9 tests.
- **Finding**: `src/parser/dot.js` is generated (untracked) and regenerated
  only by npm `pre*` hooks (`pretest`, `pretypecheck`, `prebuild`). gates.sh
  invokes `npx tsc` / `npx vitest` directly, so a grammar change ran against
  the stale parser. gates.sh now runs `npm run --silent parser:regen` first.
  Fresh worktrees have no `dot.js` at all until a hook or regen runs.
- **Impact**: Any script calling npx tools directly after a .pegjs edit must
  regenerate first.
- **Confidence**: High

## Observation: the perf bench overwrites tracked test/corpus/perf.json
- **Context**: T0 perf baseline (`BENCH_IDS=2646,graphs-b100 node test/corpus/bench.mjs`).
- **Finding**: bench.mjs rewrites `test/corpus/perf.json` with only the
  benched ids. It also feeds survey timeouts (PORT_TIMES) — restore with
  `git checkout test/corpus/perf.json` after every subset bench.
- **Impact**: A committed subset perf.json would shrink survey timeouts.
- **Confidence**: High

## Observation: AttrStmt lacks grammar.y optmacroname
- **Context**: T2 parser fix.
- **Finding**: C grammar.y `attrstmt` accepts `node a = [...]`
  (`optmacroname`); dot.pegjs does not model it.
- **Impact**: Out of scope for T2; a separate parser-gap fix.
- **Confidence**: Medium (grammar read; not probed against native)

## Observation: /tmp/ghl holds only core + dot_layout plugins
- **Context**: T5 checked the neato multispline re-pin.
- **Finding**: `/tmp/ghl` (gen-headless-gvbindir.sh) contains only
  libgvplugin_core and libgvplugin_dot_layout; native neato comparisons need
  a different GVBINDIR.
- **Impact**: Oracle checks for non-dot engines cannot use /tmp/ghl as-is.
- **Confidence**: High

## Observation: swapping a rebuilt library into the unmodified oracle
- **Context**: T1 contraction map, T6 and T7 instrumentation.
- **Finding**: Rebuild libpathplan from an rsync'd scratchpad copy of
  graphviz and load it with `DYLD_LIBRARY_PATH` ahead of the oracle; for
  dotgen code, rebuild only `gvplugin_dot_layout` into a copy of /tmp/ghl
  and point `GVBINDIR` at the copy. Output with an uninstrumented rebuild was
  byte-identical to the oracle, so per-call dumps (all 42,432 Proutespline
  calls on 2646) are trustworthy.
- **Impact**: Instrument the oracle without touching ~/git/graphviz or /tmp/ghl.
- **Confidence**: High

## Observation: otool -tV hangs on libpathplan disassembly
- **Context**: T1 asm cross-check.
- **Finding**: `otool -tV` grew to ~29 GB RSS without finishing;
  `objdump -d` completes.
- **Impact**: Use objdump for disassembly on this host.
- **Confidence**: High

## Observation: V8 Math.cbrt/cos/atan2 differ from Apple libm by ~1 ULP
- **Context**: T7 solve3.
- **Finding**: On ~16% of random solve3 inputs V8's cbrt/cos/atan2 differ
  from the oracle's libm by ~1 ULP; not decisive on any corpus id.
- **Impact**: Remaining solve3 drift risk is libm-class (like hypot before
  libmHypot), not contraction.
- **Confidence**: Medium

## Observation: routeFlatEdgeFaithful has no production caller
- **Context**: T3 threaded `et` through it.
- **Finding**: `src/layout/dot/splines-flat.ts` routeFlatEdgeFaithful is
  called only from tests; production flat routing goes through edge-route.ts.
- **Impact**: Candidate dead code for a cleanup PR (grep tests first).
- **Confidence**: High

## Observation: survey wall time is dominated by share/examples/world.gv
- **Context**: Fresh per-task surveys (~3h each).
- **Finding**: The port render of `tree-share-examples-world` takes ~2h15m
  (native ~26 min) and is the last item to finish.
- **Impact**: Budget ~3h per fresh survey.
- **Confidence**: High

## Observation: native clips makeSimpleFlatLabels labels out of the viewBox
- **Context**: User saw issue 32's top label outside the SVG viewBox.
- **Finding**: Native dot 15.x does it too: pt-issue-32 viewBox is 94x36
  (translate 4 32.34) but the upper label's table spans y -37.34..-22.34,
  5pt above the box. dotsplines.c makeSimpleFlatLabels (944-1073) sets
  ED_label(e)->pos for adjacent flat labelled edges, and the make_flat_edge
  branch (dotsplines.c:410-417) never calls updateBB; the self-loop branch
  (:405-408) and the aux-graph flat path (:1275) do. bb was fixed in
  dot_position, so the label stays outside it. Port geometry is identical
  to native.
- **Impact**: An upstream Graphviz bug that the faithful port reproduces.
  Fix consumer-side (plantuml-ts pads the viewBox) or upstream; the port
  must not diverge.
- **Confidence**: High (C read + native and port SVG compared)

## Observation: why graphvizonline.net shows the label that native clips
- **Context**: Verified live in Chrome on graphvizonline.net (pt-issue-32).
- **Finding**: Its SVG has the same geometry (viewBox 94x36.34). The page
  runs svg-pan-zoom 3.6.1, which removes the viewBox attribute and sizes
  the <svg> to the 503x689px preview panel. Putting the viewBox back changed
  nothing: with preserveAspectRatio "meet" the 94x36 box is letterboxed and
  clipping happens only at the element edge. Sizing the element to the
  viewBox aspect ratio reproduced the plantuml-ts clipped picture exactly.
- **Impact**: Viewers only hide the overflow by accident (a tall element).
  Grow the viewBox to the drawn content; do not rely on the host's sizing.
- **Confidence**: High
