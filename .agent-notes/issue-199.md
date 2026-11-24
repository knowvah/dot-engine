# issue #199: json walks a graph's nodes in sequence order

## Observation: native exits 1 with its json written when it reports an Error
- **Context**: gate 6, `plans/issue-199-json-subgraph-node-order/harness/toward-native.ts` over the 42-id survey (8 engines, json and json0), carried oracle.
- **Finding**: native exits 1 and still writes the whole document for `1332`, `1767`, `graphs-b53` under fdp (`node "x" is contained in two non-comparable clusters`), and for `2778`, `2780`, `2825` under dot (`checkpath`/`triangulation failed`, `rebuild_vlists: lead is null`). The port's head output equals that document on all 12 rows.
- **Impact**: a checker that drops a native run on `status !== 0` loses rows that have a reference. Drop a row only when stdout is empty.
- **Confidence**: High

## Observation: json prints a non-finite number as a bare `inf` or `nan`
- **Context**: same run, `1332` under osage, `-Tjson`.
- **Finding**: native prints `"points": [[inf,inf],[inf,nan],[nan,nan],[nan,inf]]` and `"bb": "inf,inf,nan,nan"`; the port prints the same tokens. `JSON.parse` rejects the document on both sides. `-Tjson0` has the tokens only inside the `bb` string and parses.
- **Impact**: a json checker has to quote bare `inf`/`nan` outside strings before parsing (as `toward-native.ts` now does), the same way on native, base and head.
- **Confidence**: High

## Observation: native fdp on `2239` segfaults on some runs and completes on others
- **Context**: same run; `.agent-notes/gv16-triage.md:146` lists fdp `2239` as "no output on either build (native SIGSEGV)".
- **Finding**: carried and pristine 16.1.1 both exit 139 with no output on most runs of `-Kfdp -Tjson 2239.dot`; 2 of 6 carried runs (and 1 of 4 for json0) exit 0 with a full document (409142 bytes, the two equal byte for byte). The port's head is `toward` against it (json 4344 → 4322 lines unequal, json0 355 → 333).
- **Impact**: fdp `2239` has a native reference; retry the run until it exits 0.
- **Confidence**: Medium (10 runs)

## Observation: one native sample can turn a `native` row into `toward`
- **Context**: two `toward-native.ts` runs over the same saved outputs.
- **Finding**: `tree-graphs-directed-sdh|fdp|json` was `native` (172 → 0) in the first run and `toward` (2367 → 2195) in the second. 39 of 40 later native runs give one md5, which the head equals; 1 of 40 gives another. `share-newarrows`/`windows-newarrows` under twopi gave 3 native md5s in 12 runs (known: `gv16-triage.md:171`), so their `toward` counts move between runs (24 → 6, 21 → 3).
- **Impact**: as `.agent-notes/issue-179.md` says for `AWAY`: an fdp or twopi `toward` count is one sample. Run native several times before reading it as the row's remaining difference.
- **Confidence**: High

## Observation: `2621` under dot, circo and fdp needs more than bytediff's default cap
- **Context**: gate 6's bytediff with the default `BD_CAP_MS=120000`.
- **Finding**: `2621 × {dot, circo, fdp} × {json, json0}` came out `TIMEOUT` on base and head alike (6 capped). It is the id's cost, not load (`test/corpus/engine-walk.ts:251`: 1237 s for the port under dot). Run alone with `BD_CAP_MS=3000000` the fdp pair finished in under 4 minutes a side.
- **Impact**: a survey that holds `2621` needs a second bytediff for it with a long cap, and native runs with a long timeout (`NATIVE_TIMEOUT_MS` in `toward-native.ts`).
- **Confidence**: High

## Observation: a newrank fill node stays in its cluster's node map after `removeFill` (#308)
- **Context**: `2621 × dot × json`: member lists unequal to native on base and head alike.
- **Finding**: `digraph { newrank=true; subgraph cluster_c { a; c } a -> b -> c }` prints `"nodes": [1, 2, null]` in json and a `__fill_1_0` node in `-Tdot`; native prints neither. `removeFill` (`src/layout/dot/init.ts:348`) calls `agdelnode(g.root, n)`, and the port's `agdelnode` (`src/model/cgraph-ops.ts:171`) deletes from `g` and its ancestors, where C's (`lib/cgraph/node.c:192-215`, `agapply` with `rec_apply`) deletes from `g` and every subgraph below it that holds the node.
- **Impact**: a `null` in a json member list is a node the cluster holds and the root does not. On a `newrank=true` input, look for a cluster rank hole first. Filed as #308, not fixed here.
- **Confidence**: High
