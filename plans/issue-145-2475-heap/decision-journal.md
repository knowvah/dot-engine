# Decision journal: issue #145

| Time | Task | Decision / result | Evidence |
|---|---|---|---|
| 2026-11-10 18:11 | start | Base is `59a5b3ee` (tip unchanged since planning). Brief committed as `a1489e76`. | `git log --oneline -1` |
| 2026-11-10 18:13 | T1 | Markers are a `globalThis.__phase` hook defined in `render-one.ts` and called from `src/`; the patch is `harness/markers.patch`. Added markers inside `dotPosition` (`pos.ycoords`, `pos.auxedges`, `pos.xrank`, `pos.removeaux`) after the first c800 run showed the whole rise and fall inside that phase (push-forward: where markers sit). | first c800 run: `position` preGc 576.5 MB → 177.7 MB |
| 2026-11-10 18:13 | T1 | `--trace-gc` writes to stdout, so the first run's SVG held the trace; later runs pipe stdout through `grep ' ms: '` into `<prefix>.gc.log`. | `c800.port.svg` held 154 trace lines |
| 2026-11-10 18:17 | T1 | Load average was 37 (another queue, `elk-engine-queue`, in its gates). Waited for it to fall under 12 before the native build and every run over a minute. | `uptime` 18:17 → 18:19 |
| 2026-11-10 18:19 | T1 | Instrumented native: rsync of `~/git/graphviz` (no `build`, no `.git`) to `$TMPDIR/gv-145/src`, Release build of `dot`, `gvplugin_core`, `gvplugin_dot_layout`, own plugin dir, `dot -c`. The markers print `malloc_zone_statistics(NULL)` `size_in_use` and a count of `make_aux_edge` calls. Its c400 and c800 SVGs differ from the oracle's in one line only, the version stamp (`16.1.0 (0)` against `16.1.0 (20261012.1431)`: the copy has no `.git`). | `diff c800.inst.svg c800.oracle.svg`: 1 line |
| 2026-11-10 18:19 | T1 | Oracle preflight for `dot` with `GVBINDIR=/tmp/ghl` passed. | `oraclePreflight` returned |
| 2026-11-10 18:24 | T1 | Phase table below. Peak phase: `pos.auxedges` (`createAuxEdges`). No phase's port/native ratio grows from c800 to c1600; the ratio at the peak falls (2.48 → 2.39). The lead is confirmed and named: the memory freed "at once" is the aux graph of the x-coordinate pass, built by `createAuxEdges` and released by `removeAuxEdges`. | table |
| 2026-11-10 18:25 | T2 | Snapshots at `pos.auxedges` on c400 (266 MB file) and c800 (755 MB file), read by the streaming `harness/heap-summary.mjs`. Added an owner breakdown to it (which object holds a group), needed to tell `Map` tables and boxed doubles apart. | summaries below |
| 2026-11-10 18:27 | T2 | Outcome `mixed`: the growth is C's own (one aux edge per pair of sibling clusters), the port multiplies it by a constant 2.4x, and part of that constant is a per-aux-edge attribute `Map` with no C counterpart. Diagnosis artifact below. | artifact |
| 2026-11-10 18:27 | T2 | Second finding, not at the peak: `ND_par` keeps the x-pass tree edges and their slack nodes alive after `removeAuxEdges` (20 MB at c400, 44 MB at c800, 100 MB at c1600; C: +0.2 MB). It is linear in nodes and saves nothing at the peak, so by AD-4's 3% rule it is not a T3 change; filed as `follow-up` issue #204 (push-forward). | snapshot diff `pos.ycoords` → `pos.removeaux`, c400 |
| 2026-11-10 18:28 | T2 | Base worktree for every base run from here on: `$TMPDIR/issue-145/base-wt` at `59a5b3ee` (node_modules symlinked, generated `src/parser/dot.js` copied), so the queue tree stays free to edit while a base run reads source. | `git worktree add --detach` |
| 2026-11-10 18:33 | T3a | Aux edges share one frozen default port (`AUX_EDGE_PORT`, `src/model/edgeInfo.ts`), passed through a fifth `Edge` constructor flag from `makeAuxEdge`. Values are `makePort()`'s, so every read is unchanged; a write throws. Writers of a port in place were audited: `flat.ts:197-202` (virtual edges from `virtualEdge`), `splines-path-shared.ts:161-165` and `edge-label-init.ts:319-323` (real edges); none reaches an aux edge. c100-c800 byte-identical; c800 peak live heap 530.0 → 393.5 MB (-25.8%), largest heap before a GC 582.2 → 442.3 MB, peak RSS 799 → 620 MB. Gates 1-2 green (13,456 tests). Commit `4ba4c689`. | `harness/bytecheck.sh`, `harness/measure.sh` |
| 2026-11-10 18:37 | T3b | Aux edges start on `EMPTY_ATTRS` (the fourth constructor flag, as `newVirtualEdge` does). c100-c800 byte-identical; c800 peak live heap 393.5 → 322.2 MB (-18.1%; -39.2% against base), largest heap 442.3 → 371.0 MB, peak RSS 620 → 551 MB. Gates 1-2 green (13,458 tests). Commit `2a254c80`. | same |
| 2026-11-10 18:38 | T3 | No third change. What is left per aux edge is `EdgeInfo` (312 B) and `Edge` (80 B) against C's 240 + 128 B: parity. T3's write-set held (`src/model/edge.ts`, `edgeInfo.ts`, `lazy-attrs.ts`, `src/layout/dot/position-aux.ts` and one colocated test). | T2 table |
| 2026-11-10 18:41 | T3 → T4/T5 | Head: c800 peak RSS 551 MB, peak live heap 322.2 MB; c1600 peak RSS 1,143 MB, peak live heap 914.9 MB (base 2,010 MB and 1,672.0 MB). An aux edge costs 485 B on c800 and 458 B on c1600 (native 435 and 423 B). `R` = 1,143 / 844 = 1.354. The c1600 wall time (160.8 s) was taken at load 23 right after a test run; only its memory numbers are used. | `c1600.head.phase.log` |
| 2026-11-10 18:42 | T4 | `PORT_HEAP_MB` and `portEnv(id, env)` in `test/corpus/survey.ts`; `portSvg` takes the id; the start banner lists the capped ids. `portEnv` tests the map with `Object.hasOwn`, so an id named like an `Object.prototype` member is not capped. Placeholder value 17,408 MB (the trial cap 1.5 x 1.354 x 8,410 = 17,084 MB, rounded up to a GB); T5 replaces it. Gates 1, 2, 4 green (13,463 unit tests; corpus + docs 2,844). | `survey.test.ts` |
| 2026-11-10 18:48 | T2 (evidence) | The base full render, with markers, confirms the causal chain directly: `rank` at 344.7 s (775.8 MB live), `mincross` at 1,140.8 s (992.6 MB), `pos.ycoords` at 1,141.3 s (997.1 MB), then `FATAL ERROR: Ineffective mark-compacts near heap limit ... JavaScript heap out of memory` 11 s later with the heap at 4,064.9 MB, before the `pos.auxedges` marker. It dies inside `createAuxEdges`; (4,064.9 - 997.1) MB / 995 B is 3.2 M aux edges, 19% of the 17.1 M. | `$TMPDIR/issue-145/full.base.log` |
| 2026-11-10 18:45 | Gate 3 | `bash test/golden/gates.sh`: 5/5 PASS at `f09401a7`. | `g3.log` |
| 2026-11-10 18:46 | Gate 5 | Smoke bytediff, base `59a5b3ee` against head `f09401a7`: 1,960 jobs, 1,960 identical, 0 diffs, 0 capped. The bundles were built with esbuild from `src/index.ts` with `build:js`'s flags into `$TMPDIR` (base from a clean detached worktree), not by copying `dist/index.js`: same bundle, and the worktree's `dist/` stays untouched. | `bytediff.json` |
| 2026-11-10 18:47 | AD-6 probe | Survey-parent comparison measured before the full render, with the cached native `2475_1.svg` (101,313,598 bytes) on both sides: `isWellFormedSvg` + `diffVerdict` finish under `--max-old-space-size=4192` (21.5 s, 3,156 MB live at the end, 4,237 MB peak RSS) and also under `--max-old-space-size=3500` (22.7 s, 3,170 MB live). So the comparison needs at most 3.5 GB of heap: stop condition 6 does not hold on a same-sized pair. T5 repeats it on the real pair. | `compare.self.log`, `compare.self3500.log` |
| 2026-11-10 18:49 | T5 | Full head render started 18:49:47 from a detached worktree at `f09401a7` (`$TMPDIR/issue-145/head-wt`), trial cap `--max-old-space-size=17084` (1.5 x 1.354 x 8,410), with the brief's command. Load 9.2, memory 91% free. An RSS sampler (15 s) backs up `/usr/bin/time -l`, because the worker is a grandchild of `tsx`. | `2475_1.port.log`, `2475_1.rss.log` |
| 2026-11-10 18:52 | T5 (docs) | `docs/known-divergences.md` is the English source of 23 translated copies (`docs-site/<locale>/divergences.md`, each with a `sourceHash`), and the earlier section additions (A13, `c6181aaa`) translated the new section into all of them. So the new section goes into the 23 locale files too: outside T5's listed write-set, needed because a new English section otherwise leaves 23 pages stale. Each locale reuses its own A10 labels and terms; numbers that depend on the run sit in one table. | `git show --stat c6181aaa` |
| 2026-11-10 19:01 | Gate 6 | Targeted survey, how the ids were chosen: (a) the prefixes c100-c800, port SVG byte-identical base vs head, and each conformant against native 16.1.0 by `diffVerdict` (c100, c200, c400, c800); (b) T3 touched `src/model/`, so beyond the smoke list every applicable corpus input whose text contains `cluster` (the code path of `separate_subclust`, `keepout_othernodes`, `contain_subclust` and `interclust1`), less 5 with a recorded port time over 20 s and `2475_1` itself: 283 ids on dot, svg and xdot, 566 jobs, 566 byte-identical base vs head, 0 capped. 277 of them are `conformant` in `parity.json`, so they stay conformant; (c) the full `2475_1`, below. | `bytediff-clusters.json`, `cluster-ids.txt` |
| 2026-11-10 20:01 | T5 | **Full render, head, trial cap 17,084 MB: exit 0, 4,259 s wall, 9,704,521,728 bytes peak RSS (9.70 GB), SVG 101,313,586 bytes.** RSS reached 8.9 GB 22 min in (end of `createAuxEdges`), stayed there through the x-rank and peaked while the output was built. The load average ranged from 4 to 54 during the run (another queue's gates), so the wall time is an upper bound. | `2475_1.port.log`, `2475_1.rss.log` |
| 2026-11-10 20:02 | T5 | **Verdict: `conformant`** against the cached native SVG (`c2e610dcc867`, the survey's current `ORACLE_SIG`, 101,313,598 bytes; the 12-byte difference is the generator comment). The comparison (`isWellFormedSvg` + `diffVerdict`) ran under `--max-old-space-size=4192` (21.4 s, 3,162 MB live, 4,265 MB peak RSS) and under 3,500 (22.1 s, 3,914 MB peak RSS). Stop condition 6 does not hold: under 48 GB, first render succeeded, comparison fits 3.5 GB. | `compare.full4192.log`, `compare.full3500.log` |
| 2026-11-10 20:03 | correction | Units. `harness/measure.sh` prints peak RSS in MiB, and the base numbers were read from `time -l` in decimal MB, so the T3 rows above and the T3a/T3b commit bodies mix the two. In decimal MB, like the maintainer's table: c800 base 799, T3a 650, T3b 578; c1600 base 2,010, head 1,199. `R` is 1,199 / 844 = 1.42, not 1.354; the trial cap by AD-6 would have been 17,917 MB. The render ran under 17,084 MB and peaked far below it, so nothing is re-run for this. Live-heap figures (`heapUsed`) were all MiB and stand. | `c1600.head.phase.log`: 1,198,931,968 bytes |
| 2026-11-10 20:09 | T5 | Cap value: k = 9,704.5 / 8,410 = 1.154; `ceil(1.25 x k x 8,410)` = 12,131 MB; rounded up to a whole GB the flag can take: `12 * 1024` = 12,288 (`--max-old-space-size` counts MiB). Comment in `survey.ts` updated; T4's tests pass. | `survey.test.ts` 11/11 |
| 2026-11-10 20:25 | T5 | Wall times for the docs table are plain runs (no markers, no `--trace-gc`) from the detached base and head trees. The host was noisy: c1600 took 131, 137, 147 s on base and 131, 163, 173, 180 s on head, the slow ones while the load average was 20-40. The table gives the fastest run of each (131 s both) and the largest peak RSS seen (base 2,424 MB, head 1,621 MB). No slowdown from T3 is measurable; c400 and c800 were 6.0 → 5.4 s and 27.0 → 25.8 s. Plain peaks are above the marker runs' (no forced GC). | `c1600.*.plain*.log` |
| 2026-11-10 20:26 | T5 | Confirmation render started under the committed cap, through `portEnv('2475_1', env)` and `tsx render-one.ts` as `portSvg` spawns it (`NODE_OPTIONS=--max-old-space-size=12288` reached the worker). Result in the row below. | `2475_1.confirm.log` |
| 2026-11-10 20:28 | T5 (docs) | Section A14 added to `docs/known-divergences.md` and, translated, to the 23 locale copies; each copy's `sourceHash` set to the new English hash (`730cdd9d...`); `npm run docs:i18n-status`: 23 locales, 0 stale, 0 missing. The translations were written in this session from each locale's own A10 labels and terms (cluster, edge, heap, survey, port, native checked by count in each file); no native speaker reviewed them. `2475_1` is not added to either list of `known-divergences-examples.test.ts`: its `parity.json` verdict is still `errored` until the maintainer's survey re-scores it, and that file is not edited by hand (AD-7). | `git diff --stat -- docs-site` |
| 2026-11-10 20:31 | Gates (final tree) | 1 `npm run typecheck` exit 0. 2 `npm test` exit 0 (570 files, 13,463 tests). 3 `bash test/golden/gates.sh` 5/5 PASS. 4 `npx vitest run test/corpus test/docs` exit 0 (24 files, 2,844 tests). 5 smoke bytediff 1,960/1,960 identical, taken at `f09401a7`; `git diff f09401a7 -- src` is empty, so it holds for the final tree. 6 targeted survey as recorded above, plus the full `2475_1`: `conformant`. Accepted-row changes: none (no output changed). | `f1.log`..`f4.log` |
| 2026-11-10 21:37 | T5 | **Confirmation render under the committed-cap path: exit 0, 4,196.9 s, 10,150,871,040 bytes peak RSS (10.15 GB), SVG byte-identical to the first full render**, so `conformant` holds. It ran through `portEnv` with `--max-old-space-size=12288`. Its peak is above the first run's 9.70 GB (the peak falls while the output is built, where GC timing decides it), so the cap is re-sized from the larger peak: k = 10,150.9 / 8,410 = 1.207, `ceil(1.25 x k x 8,410)` = 12,689 MB, rounded up to a whole GB: `13 * 1024` = 13,312. The render finished under 12,288 and under 17,084, so 13,312 is not run again: a larger heap limit cannot fail where a smaller one passed. The A14 table and the `survey.ts` comment carry the confirmation run's numbers. | `2475_1.confirm.log` |
| 2026-11-10 21:42 | Gates (after the cap change) | Re-run on the final tree: 1 typecheck exit 0; 2 `npm test` exit 0 (13,463 tests); 3 goldens 5/5 PASS; 4 corpus + docs exit 0 (2,844 tests); `npm run docs:i18n-status` 23 locales, 0 stale. `src/` unchanged since `f09401a7`, so gates 5 and 6 stand. | `f1.log`..`f4.log` |
| 2026-11-10 21:43 | Squash | Per-task history kept under the tag `issue-145/pre-squash`; one commit on `59a5b3ee`. The detached worktrees under `$TMPDIR/issue-145` are removed. | `git log 59a5b3ee..` |

## T1: live bytes per phase

Port: `heapUsed` after a forced GC at the marker, MB, whole process (it includes
about 35 MB of tsx and runtime). Native: `size_in_use` of the default malloc zone, MB.
`aux` is the number of `make_aux_edge` calls so far, identical on both sides.

| phase | c400 port | c400 native | c800 port | c800 native | c1600 port | c1600 native |
|---|---|---|---|---|---|---|
| parse | 47.6 | 7.6 | 66.0 | 16.1 | 108.7 | 35.3 |
| init | 60.0 | 16.8 | 93.6 | 36.8 | 173.8 | 84.2 |
| rank | 68.5 | 16.6 | 111.1 | 36.4 | 212.8 | 83.0 |
| mincross | 79.4 | 20.9 | 134.2 | 45.5 | 266.2 | 103.9 |
| pos.ycoords | 79.4 | 20.9 | 134.3 | 45.5 | 267.2 | 103.9 |
| **pos.auxedges** | **199.6** | **72.2** | **530.0** | **213.9** | **1672.0** | **701.0** |
| pos.xrank | 195.3 | 72.3 | 520.5 | 213.9 | 1649.1 | 701.1 |
| pos.removeaux | 99.5 | 21.1 | 177.9 | 45.7 | 366.7 | 104.1 |
| splines | 112.0 | 22.3 | 202.9 | 48.3 | 422.4 | 110.4 |
| layout (postprocess) | 113.6 | 22.3 | 206.6 | 48.3 | 431.4 | 110.4 |
| render | 118.5 | 22.3 | 216.7 | 48.3 | 453.9 | 110.4 |

| | c400 | c800 | c1600 |
|---|---|---|---|
| node statements / edges | 6,786 / 6,794 | 15,327 / 15,300 | 36,217 / 36,326 |
| aux edges (both sides) | 118,345 | 406,171 | 1,481,313 |
| of which `separate_subclust` (n(n-1)/2) | 79,800 | 319,600 | 1,279,200 |
| port bytes per aux edge (rise over `createAuxEdges`) | 1,065 | 1,021 | 995 |
| native bytes per aux edge | 455 | 435 | 423 |
| ratio at `pos.auxedges`, port / native | 2.76 | 2.48 | 2.39 |
| port peak RSS / wall | 415 MB / 6.5 s | 799 MB / 29.9 s | 2,010 MB / 149.9 s |
| native peak RSS / wall | 89 MB / 0.8 s | 257 MB / 4.8 s | 844 MB / 35.3 s |
| largest heap before any GC (`--trace-gc`) | 240.6 MB | 582.2 MB | 1,742 MB |

c100 and c200 gave `separate_subclust` counts of 4,950 and 19,900: exactly n(n-1)/2.

The largest heap between markers is within 5% of the live heap at `pos.auxedges`: the
peak is live data, not garbage waiting for a collection.

## T2: structures at the peak (`pos.auxedges`)

Self size by structure, from the snapshots. c400 total 203.2 MB, c800 total 533.9 MB.

| structure | c400 MB | c800 MB | % of c800 | per aux edge | port origin | C counterpart | class (AD-3) |
|---|---|---|---|---|---|---|---|
| `EdgeInfo` object (38 fields) | 41.4 | 134.7 | 25.2 | 312 B | `src/model/edgeInfo.ts:416` (`makeEdgeInfo`) | `Agedgeinfo_t`, 240 B, `lib/common/types.h:543`, allocated at `lib/dotgen/position.c:188` | C-faithful, constant 1.3x |
| two `Port` objects | 27.6 | 89.8 | 16.8 | 208 B | `src/model/edge.ts:103` (`makePort()` twice) | two `port` structs inline in `Agedgeinfo_t` (48 B each, zeroed by `gv_alloc`), `types.h:48` | representation overhead, removable |
| two port points `{x, y}` | 13.9 | 41.9 | 7.8 | 80 B | `src/model/edgeInfo.ts:379` | `port.p`, inline | representation overhead, removable |
| boxed doubles of those points | 14.0 | 39.8 | 7.5 | 64 B | same (`x`, `y` are double fields, 16 B each) | inline doubles | representation overhead, removable |
| `Map` tables of `Edge.attrs` | 24.7 | 72.4 | 13.6 | 151 B | `src/model/edge.ts:102` (`new Map()`) | **none**: an aux edge has no attribute record (`position.c:185-199` binds only `Agedgeinfo_t`) | **port artifact** |
| `Map` objects of `Edge.attrs` | 4.6 | 14.5 | 2.7 | 32 B | same | none | port artifact |
| `Edge` object | 10.6 | 34.5 | 6.5 | 80 B | `src/layout/dot/position-aux.ts:105` | `Agedgepair_t`, 128 B, `position.c:185` | C-faithful |
| node info, strings, code | 36.9 | 61.9 | 11.6 | — | not per aux edge | — | not growth |

Counts scale with the aux-edge count, not the node count: c400 → c800 the nodes grow
2.26x, the aux edges 3.43x, `EdgeInfo` objects 3.25x (139,169 → 452,692), `Edge.attrs`
maps 3.2x. The owner breakdown on c800 gives 421,471 of 474,479 `Map`s to `Edge.attrs`,
71.5 of 72.4 MB of plain arrays to `Map.table`, and 2,194,195 of 2,609,701 heap numbers
to the 40-byte `{x, y}` objects.

## T2: diagnosis artifact

- **Outcome:** `mixed`.
- **Mechanism:** `separate_subclust` adds one auxiliary edge for every pair of sibling
  clusters whose rank ranges overlap. `2475_1` has 5,711 top-level clusters that all start
  on the same rank, so the x-coordinate pass builds 5,711 x 5,710 / 2 = 16,304,905 of them
  (plus about 5.6 per node from the other constraint makers), and they all stay live until
  `remove_aux_edges`. C does the same and pays about 423 B per edge; the port pays about
  995 B, because each aux edge also allocates two `Port` objects with a point each
  (352 B, where C has two zeroed inline structs) and an empty attribute `Map` (183 B,
  where C has nothing).
- **Origin:** the growth, `src/layout/dot/position-cluster.ts:240` (`separateClustPair`,
  called for every pair from `separateSubclust`, `:244-258`), a faithful port of
  `lib/dotgen/position.c:454-486` (the edge is made at `:480`). The port's constant,
  `src/model/edge.ts:102-103`, reached from `makeAuxEdge` at
  `src/layout/dot/position-aux.ts:105`.
- **Causal chain:** the port's live heap is about 1.1 GB when `dotPosition` starts on the
  full graph (c1600: 267 MB for 36k nodes). `createAuxEdges` then needs
  17.1 M x 995 B = 16 GB. V8's default limit on this host is 4,192 MB, so the worker dies
  inside `separateSubclust` after about 3.3 M aux edges, a fifth of the way through.
  Native reaches the same point with 104 MB x 4.1 and adds 17.1 M x 423 B = 6.9 GB:
  its 8.41 GB peak RSS. No port without the 2.4x constant fits the default heap either
  (6.9 GB > 4.2 GB), which is why the id needs a cap sized from native.
- **Ruled out:**
  - *JS objects where C has packed structs, as the cause of the growth:* the port/native
    ratio at the peak falls with size (2.76, 2.48, 2.39), and stays inside AD-3's 1.25x
    band from c800 to c1600. It is the constant, not the order.
  - *Arrays that never shrink:* `removeAuxEdges` returns the live heap from 530.0 to
    177.9 MB on c800 (1672.0 → 366.7 MB on c1600). The elists it clears are released.
  - *Retained closures or back-references, as the cause of the peak:* the largest heap
    before any GC is within 5% of the live heap at the marker, so the peak is reachable
    data. One back-reference does exist after the peak (`ND_par`, see the journal row):
    44 MB on c800, linear in nodes, and filed separately (#204).
  - *Per-cluster copies:* the snapshot holds no per-cluster structure above 1 MB; the
    cluster-shaped cost is the pair count itself. `Graph` objects: 801 on c800.
  - *Network simplex working storage (tree lists, cut values):* live heap is flat across
    the x-rank (`pos.auxedges` 530.0 → `pos.xrank` 520.5 MB on c800; native 213.9 → 213.9).
  - *Rank, mincross, splines, render:* each adds under 60 MB on c1600 (table), all linear
    in nodes.
  - *A different aux-edge count in the port:* the counts are equal to the edge on all
    three sizes (118,345 / 406,171 / 1,481,313).

### Interface T2 → T3, T4, T5

- `outcome`: `mixed`.
- T3a candidate: the two `Port` objects of an aux edge → one shared, frozen default port
  (the JS form of C's two zeroed inline structs). 352 B per aux edge, about 136 MB of the
  530 MB peak on c800 (26%).
- T3b candidate: the attribute `Map` of an aux edge → the shared `EMPTY_ATTRS`, as
  `newVirtualEdge` already does (`src/layout/dot/fastgr.ts:170`). 183 B per aux edge,
  about 71 MB on c800 (13%).
- Not a candidate: `EdgeInfo` (312 B against C's 240 B). Its single hidden class is what
  keeps the network-simplex edge scan monomorphic (`src/model/edgeInfo.ts:405-415`); a
  smaller aux-only record would change that for no more than 72 B per edge.
