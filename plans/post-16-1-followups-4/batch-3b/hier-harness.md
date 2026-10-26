# Shared note for T15–T17, T22: the C harness

Build in `<scratchpad>/hier-harness/`, never in `~/git/graphviz/build`.
- Compile the needed `lib/neatogen/*.c` (and `lib/util` headers) from `~/git/graphviz`
  with `clang -O2` (same as the 16.1 build's flags for float contraction; check
  `~/git/graphviz/build/CMakeCache.txt` `CMAKE_C_FLAGS_RELEASE`), plus a small `main.c`
  that builds a `vtx_data` graph, calls the function, and prints every output with `%a`
  (hex float) so tests compare bit for bit.
- Inputs: the item-43 probe graph (6 nodes, edges a→b→c→d→e→f, a→d, b→e, c→f), corpus
  1554, and one 30+ node random DAG (fixed seed). Neato builds `vtx_data` in
  `neatogen/neatoinit.c:makeGraphData`/`makeGraphData` with `dir` set for hier
  (`neatoinit.c:767`); the port's builder is `src/layout/neato/init.ts:338`
  (`makeGraphDataC`).
- Commit the expected vectors as test fixtures (small arrays in the test file), not the
  harness.
- `float` arithmetic in C (`quad_prog_solve`, `constrained_majorization`, `float **`
  matrices) must be ported with `Math.fround` after each float operation and
  `Float32Array` storage, as `stress-kernel.ts` does.
