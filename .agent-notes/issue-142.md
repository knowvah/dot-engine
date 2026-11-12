# Issue #142: where fdp's last-bit drift starts, and how to trace it

## Observation: fdp's clustered drift starts at libm atan2/sin/cos, nowhere else
- **Context**: `dot -Kfdp -Txdot tests/graphs/fdp.gv` differed from the port on one
  value (clusterA `bb` x0, `3.1974e-14` native, `1.5987e-14` port); #142's own case is
  render 3 of `subg.gv` / `cluster_k` in root mode.
- **Finding**: the first differing value is `atan2(dy, dx)` at
  `lib/fdpgen/layout.c:568` (`getEdgeList`; port `src/layout/fdp/ports.ts`): Apple
  libm and V8 return different last bits on equal inputs. `cos`/`sin` at
  `tlayout.c:501-502` and `atan2` at `tlayout.c:474` differ the same way on other
  inputs. With native's libm results injected into the port, the xdot equals native
  byte for byte on fdp.gv, on #142's three renders, and on 8 `drift-exonerated`
  members of `attribution-fdp.json` (clust2.dot, 2183, 56, ldbxtried x3, b15, b51),
  whose raw differences are 18 to 646 pt.
- **Impact**: fdp's force solve, xlayout, packing and bb code are bit-exact against
  the 16.1.0 oracle on clustered inputs once libm agrees. Do not look for a port
  defect in those phases again without a trace that shows one. Whether to model
  `atan2` is #209 (needs-ruling).
- **Confidence**: High (traced, every phase value compared as `%a`).

## Observation: Apple atan2 was correctly rounded on every traced call; sin/cos were not
- **Context**: 887 distinct libm calls from the native traces, checked against
  400-bit mpmath.
- **Finding**: `atan2` 175 of 175 correctly rounded (V8 differs on 32); `cos` 348 of
  356 (V8 differs on 12); `sin` 346 of 356 (V8 differs on 10). macOS 27.2, node
  v26.3.1.
- **Impact**: a correctly rounded `atan2` is a candidate exact model of Apple's on
  this sample; `sin`/`cos` would need Apple's algorithm.
- **Confidence**: Medium (a sample, not a proof).

## Observation: the oracle contracts two statements in fdp's port code
- **Context**: the counterfactual left one differing trace line (`dist2`); reading
  the disassembly next to it found the second.
- **Finding**: `layout.c:569` `dx*dx + dy*dy` is `fmul dy,dy` + `fmadd dx,dx`
  (`0x63154` in `libgvplugin_neato_layout.8.dylib`), and `layout.c:640`
  `angle += delta * (cnt - 1)` is one `fmadd` (`0x6334c`). `getEdgeList` and
  `genPorts` are inlined into the second `_layout` symbol; find them by the
  `_atan2` stub call. The port now uses `fma` at both.
- **Impact**: `genPorts`' contraction changes a port angle only when `cnt - 1` is
  not a power of two (4 or more real edges between two clusters, on the reversed
  side). `normalize`'s rotation (`adjust.c:758-759`) is contracted too and is not
  modelled (#213).
- **Confidence**: High.

## Observation: trace recipe (instrumented native against the port, with libm injection)
- **Context**: bisecting a last-bit difference in fdp.
- **Finding**: everything is under `plans/issue-142-fdp-bb-drift/harness/`:
  1. Stock plugin dir with neato_layout (`/tmp/ghl` has none): symlink core,
     dot_layout, neato_layout from `~/git/graphviz/build/plugin/*` into a temp dir,
     then `GVBINDIR=<dir> dot -c`.
  2. `bash build-native.sh <scratch> <stock-dir>`: recompiles only
     `fdpgen/{layout,tlayout,xlayout}.c` (noaddr.patch + trace-native.patch) with the
     oracle's flags and links them ahead of `libfdpgen.a`. `GVTS_TRACE142=<file>`
     turns the `%a` traces on; `GVTS_NOADDR=1` removes the heap-address order.
     Traces off must print stock's bytes.
  3. `git apply harness/port-trace.patch` (temporary; adds `src/layout/fdp/tr142.ts`),
     then `bash run-trace.sh <scratch> <out-prefix> <file>` (or `--subg <file>
     <subgraph>` for #142's three renders): raw first difference, then the
     counterfactual with native's libm injected. `trace-survey.sh` loops a list.
  4. Revert: `git checkout -- src/ && rm src/layout/fdp/tr142.ts`.
  5. `libm-check.c` (`cc -O0`) and `libm-check.mjs` print Apple's and V8's result
     for one call; `fma-check.ts` evaluates a contracted site three ways.
- **Impact**: port-node names (`_port_<g>_(<id>)_(<id>)_<seq>`) and component names
  (`ccderived+<n>`) are debug text that can differ between C and the port; normalise
  them before comparing traces (run-trace.sh does the first).
- **Confidence**: High.

## Observation: two drift-exonerated fdp rows are not drift
- **Context**: the trace survey over `attribution-fdp.json`'s members.
- **Finding**: `2242` first departs at the cluster margin in `finalCC` (native 12,
  port 8; #210). `1436` lays out a different component sequence (#211). Neither
  makes a libm call at the traced sites. `crazy`, `viewport`, `mode` (no clusters)
  first depart by one ulp inside `x_layout`'s `adjust` (#212).
- **Impact**: the fdp attribution's `drift-exonerated` verdict does not mean "libm
  drift" for every id.
- **Confidence**: High for the first differing lines; the mechanisms of #211 and
  #212 are not diagnosed.
