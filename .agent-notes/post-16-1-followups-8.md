# post-16-1-followups-8 mission — observations (2026-11-02)

## Observation: native KK circuit and mds overflow on the 1-based AGSEQ
- **Context**: T0 model fixtures.
- **Finding**: `circuit.c:46-47` and `neatoinit.c:1231-1232` index 0-based n×n arrays by
  `AGSEQ` (1..n). Row 0 of `Gm` stays zero, so `lu_decompose` is singular on every graph:
  KK `model=circuit` always warns "graph G is disconnected" and uses shortest paths, on
  connected graphs too. `Gm[n]` / `GD_dist[n]` read past the row pointers: `kk-circuit`
  exits 139 in about 3 of 4 runs, `kk-len-mds` in all but about 1 of 1500, and pack cases in
  every run sampled (seq exceeds the component's nG). An isolated last-created node removes
  the overflow and makes native deterministic.
- **Impact**: pick native KK fixtures with a retry loop, or end the graph in an isolated
  node. Never read rc 139 here as an oracle failure.
- **Confidence**: High

## Observation: non-KK neato splits disconnected graphs before the solver
- **Context**: T0 `*-disc-circuit` printed no warning on major or hier.
- **Finding**: `neato_layout` sets `Pack = CL_OFFSET` when `layoutMode` is non-zero, so
  each connected component is solved alone (`neatoinit.c:1371-1376`). `pack=false` does not
  undo this. Pinned nodes in different components stay in one (`pccomps`), which is the way
  to reach stress.c's disconnected warning.
- **Impact**: a disconnected probe on major or hier needs pinned nodes to exercise that
  branch.
- **Confidence**: High

## Observation: a /tmp clean deletes config8 and every engine then reports no layout support
- **Context**: T0 preflight.
- **Finding**: both plugin dirs had lost `config8` while the dylibs stayed; the error is
  `There is no layout engine support for "dot"` and rc 1. `GVBINDIR=<dir> dot -c` fixes it
  at the same path, which keeps the walk caches valid.
- **Impact**: run the preflight first in any session after a gap.
- **Confidence**: High

## Observation: a shortest-path-consistent `len` graph cannot tell mds from shortpath
- **Context**: T0 classification of `major-len-mds`, which passed before T6.
- **Finding**: mds overwrites Dij with each edge's `len`; if every edge is already its ends'
  shortest path, the matrix is unchanged. A distinguishing probe needs an edge longer than
  the path around it.
- **Impact**: check that a probe fails before its fix is in.
- **Confidence**: High

## Observation: passing 0.01 on small KK fixtures does not prove the solver is bit-faithful
- **Context**: T7, `kk-len-circuit` missed 0.01 by 9 coordinates; T7's first fix passed the
  small case and gave 4159 diffs on a 160-node graph.
- **Finding**: the KK solver needs clang's `-ffp-contract=on` fusion (`fma`/`fms`) in
  `kk.ts` and `kk-solve.ts`. Last-bit drift moves the `max < Epsilon2` stopping move.
  `Math.pow` matched macOS `pow` on 200001 of 200001 x^1.5 samples in Node here; `armPow`
  missed 336. `kk-large` is committed for this reason.
- **Impact**: judge solver fidelity with a per-move trace against an instrumented native and
  a large graph, not with small fixtures at 0.01.
- **Confidence**: High

## Observation: a scratch instrumented plugin only needs the changed C file relinked
- **Context**: T7's trace of `stuff.c`.
- **Finding**: recompile the one file, `ar r` it into a copy of `libneatogen.a`, and relink
  from `link.txt` with `/opt/homebrew/Cellar/X/V/` rewritten to `/opt/homebrew/opt/X/`,
  because the Cellar gts path has moved.
- **Impact**: no full graphviz rebuild is needed for one traced function.
- **Confidence**: Medium (reported by T7; used in that one case)

## Observation: a harness crash rate is not dot's crash rate
- **Context**: T2, native `circuit_model` values.
- **Finding**: `kk-disc-circuit` crashed a harness in all 2000 tries while `dot` survived 28
  of 50: the overflow's outcome depends on the process's heap layout. An isolated last node
  (`kk-disc-iso`) removes the overflow.
- **Impact**: use a graph without the overflow to read native values in a harness.
- **Confidence**: High

## Observation: VPSC native variants need many runs to enumerate
- **Context**: T3 fixture refresh.
- **Finding**: `cluster dir0` looked like 1 variant in T0's 8 runs and is 2 in 800
  (`e665a3` 69 of 800). `noverlap1 dir2 n10` shows 5 variants in 200 runs, `dir1 n40` 21 in
  300.
- **Impact**: 8 runs can miss a valid variant. Sample hundreds before calling a port output
  "not native".
- **Confidence**: High

## Observation: image and model details that look like port bugs
- **Context**: T4, T5, T6.
- **Finding**: `imagetype` treats fewer than 20 bytes (`HDRLEN`) as FT_NULL, so a short fake
  image warns. Graph init reaches the context through `g.root.info.gvc`, set before layout.
  A declared `len` no edge carries leaves every `ED_dist` at 1.0, so `graphHasLen` testing
  edges gives the same Dij as C's declaration test. Hier runs need `csrand(1)` before each
  comparison, or libc `rand()` flips the x-axis sign.
- **Impact**: test fixtures need 20+ bytes of real magic; seed before comparing hier runs.
- **Confidence**: High

## Observation: bytediff --all skips quarantined ids and near-cap jobs flip under load
- **Context**: T9 full bytediff.
- **Finding**: `--all` reads only `applicable` manifest ids, so the 21 quarantined ids need
  a separate `bd-job.ts` comparison. Jobs near the 120 s cap time out on one side under load
  (`2108` dot: head capped 4 times, yet 89.4 s vs 83.9 s when timed alone). `BD_CAP_MS=600000`
  on those id/engine pairs clears them. The stderr is inside the compared bytes.
- **Impact**: 38,000 jobs took 6h55m at load 8 to 13. Rerun one-sided caps instead of
  assuming noise; plan the full run for an evening.
- **Confidence**: High
