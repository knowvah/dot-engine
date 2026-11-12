# issue-145 mission — observations (2026-11-10)

## Observation: where dot's memory goes on a graph with many sibling clusters
- **Context**: diagnosing why the port's render of `tests/2475_1.dot` (5,711 sibling clusters, 150k
  nodes) dies at V8's default heap.
- **Finding**: `separate_subclust` (`lib/dotgen/position.c:454`, port
  `src/layout/dot/position-cluster.ts:244`) makes one aux edge per pair of sibling clusters whose
  rank ranges overlap: exactly n(n-1)/2 on the prefixes (4,950 / 19,900 / 79,800 / 319,600 /
  1,279,200 for 100..1600 clusters) and 16,304,905 on the full graph. Every other aux-edge maker is
  linear, about 5.6 edges per node. The aux graph is the peak on both sides: live bytes rise across
  `create_aux_edges`, stay flat through the x-coordinate network simplex, and fall back at
  `remove_aux_edges`. C pays 128 B (`Agedgepair_t`) + 240 B (`Agedgeinfo_t`) per aux edge, 423-455 B
  measured with the elists and malloc rounding. Rank, mincross, splines and render are each small
  and linear in nodes.
- **Impact**: on a cluster-heavy input, look at the count of sibling clusters before anything else;
  the cost is quadratic in it, in native too. A per-aux-edge allocation in the port is multiplied by
  that count: an `Edge` made by `makeAuxEdge` should own nothing C does not allocate.
- **Confidence**: High

## Observation: what a JS aux edge cost, object by object
- **Context**: V8 heap snapshot at the peak, c400 and c800 prefixes.
- **Finding**: per aux edge at the base: `EdgeInfo` 312 B (38 fields), two `Port` objects 208 B, two
  `{x, y}` points 80 B, four boxed doubles 64 B, an empty `Map` 32 B plus its 151 B table, the `Edge`
  80 B. The point fields are stored as heap numbers (16 B each) because the field has held a
  non-integer somewhere, so "two zeroed structs" cost 352 B. Sharing one frozen port and the shared
  empty attrs map brought an aux edge from 995 B to 458 B (native 423 B) with byte-identical output.
- **Impact**: a small object with double fields costs its own size plus 16 B per double field. An
  empty `Map` costs 183 B. Both matter only when multiplied by millions.
- **Confidence**: High

## Observation: reading a heap snapshot too large to `JSON.parse`
- **Context**: `v8.writeHeapSnapshot()` at a phase marker; 266 MB file for a 200 MB heap, 755 MB for
  530 MB.
- **Finding**: `plans/issue-145-2475-heap/harness/heap-summary.mjs` streams the file: the `nodes` and
  `edges` arrays go into `Uint32Array`s, `strings` through a small tokenizer. Grouping plain
  `Object`s by their hidden class (the `map` internal edge) and labelling the group with one sample's
  property names tells `EdgeInfo` from `Port` from `NodeInfo`. Properties holding small integers have
  no edge in the snapshot, so a `{x: 0, y: 0}` object shows no property names. An "owner" breakdown
  (the parent on the shortest path from the GC roots, with the edge name) attributes anonymous arrays
  and numbers: it showed 71.5 of 72.4 MB of arrays were `Map.table` and which `Map`s were
  `Edge.attrs`. A snapshot diff across a phase (before `create_aux_edges`, after `remove_aux_edges`)
  finds what a phase leaves behind.
- **Impact**: reuse the script; pass group keys after the top-N argument for the owner breakdown.
  Take the snapshot through an env-gated hook in `test/corpus/render-one.ts`, never in `src/`.
- **Confidence**: High

## Observation: live bytes per phase from native, without a profiler
- **Context**: separating C's own growth from the port's.
- **Finding**: `malloc_zone_statistics(NULL, &s)` (`<malloc/malloc.h>`) gives `size_in_use` across
  all zones; printed at the phase points of `dotLayout`, `dot_position` and around `gvLayoutJobs` it
  is the native counterpart of `heapUsed` after a forced GC. The patch is
  `plans/issue-145-2475-heap/harness/native-markers.patch`; the copy is an rsync of `~/git/graphviz`
  without `build` and `.git`, built Release with the bison and flex paths from the oracle notes. Its
  SVG differs from the oracle's in the version stamp only (`16.1.0 (0)`: no `.git`). Peak RSS cannot
  show a phase that frees; this can.
- **Impact**: when a port/native memory ratio is in question, measure both sides at the same points
  and compare the ratio across sizes; a constant ratio is representation, a growing one is a defect.
- **Confidence**: High

## Observation: `--trace-gc` prints to stdout
- **Context**: `node --trace-gc ... render-one.ts > out.svg`.
- **Finding**: the trace lines land in the SVG file. Pipe stdout through `grep -a ' ms: '` into a
  log when the SVG is not needed, or render a second time without the flag.
- **Impact**: never byte-compare an SVG taken under `--trace-gc`.
- **Confidence**: High

## Observation: a detached worktree needs two things before tsx can render from it
- **Context**: base and head trees under `$TMPDIR` so a long render does not read a tree being
  edited.
- **Finding**: `git worktree add --detach` gives no `node_modules` and no `src/parser/dot.js` /
  `dot.d.ts` (generated, ignored). Symlink the first, copy the second; then
  `node --import tsx test/corpus/render-one.ts` and `esbuild src/index.ts` both work there.
- **Impact**: saves a failed first run. Remove the worktrees with `git worktree remove --force`.
- **Confidence**: High

## Observation: `ND_par` outlives the aux edges it points at
- **Context**: snapshot diff across `dotPosition` on c400.
- **Finding**: after `removeAuxEdges`, `NodeInfo.par` still references each node's tree edge from
  the x pass; in C the pointer dangles after `free(e)` (`position.c:542-543`), in the port it keeps
  the edge, its slack node and, through a removed slack node's stale `next`, more slack nodes alive:
  about 2.8 KB per node, held through splines and render. Filed as #204; not fixed here because it
  saves nothing at the peak.
- **Impact**: a C pointer left dangling after a `free` is a live reference in the port. Where a
  phase frees a structure, look for fields that still point into it.
- **Confidence**: High

## Observation: adding a section to `docs/known-divergences.md` means 24 files
- **Context**: the A14 section for this issue.
- **Finding**: the page has 23 translated copies under `docs-site/<locale>/divergences.md`, each
  with a `sourceHash` of the English file. `npx vitest run test/docs` passes on a stale hash;
  `npm run docs:i18n-status` is what reports it. The convention (A13, `c6181aaa`) is to translate the new
  section into every locale and set each copy's front-matter `sourceHash` to
  `node scripts/i18n-hash.mjs docs/known-divergences.md` (`npm run docs:i18n-hashes` only writes the
  ignored stale-page map for the site banner; it does not touch the pages). Locale copies use
  a plain space or `.` or `,` as the thousands separator (no NBSP), fr writes `Mo`/`Go`, ru `МБ`/`ГБ`.
- **Impact**: a brief whose write-set lists only `docs/known-divergences.md` understates the work;
  keep run-dependent figures in a table so the prose translates once.
- **Confidence**: High
