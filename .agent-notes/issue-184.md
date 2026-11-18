# issue-184 mission — observations (2026-11-17)

## Observation: json0 and json take their layout attributes by different routes
- **Context**: #184, json0 printed no graph or cluster `bb` and no edge `pos`.
- **Finding**: `-Tjson0` prints the layout attributes from `attrs`, so `attachAttrs` has to run
  before `buildJson(g, false)` (C: `json_begin_graph` runs `attach_attrs` for `FORMAT_JSON0`,
  `plugin/core/gvrender_core_json.c:56-67`). `-Tjson` prints them from the held xdot render's draw
  lookup (`collectDrawLookup`, `src/render/json.ts`), which overlays `bb`, `pos` and the rest on
  the object as it is written; its write-back (`xr.attach`) can run after the write. Only nodes
  have a fallback when there is no lookup (`nodeLayoutAttrs` in `buildNodeObject`).
- **Impact**: a change to when the write-back runs moves json0's output and not json's. A json0
  defect in a layout attribute is looked for in `write-back.ts` and the attach order, a json one in
  the xdot overlay.
- **Confidence**: High (80 probe rows against native 16.1.1, base and head)

## Observation: `attachBeforeWriteWithClusterEdges` returns its callback uncalled
- **Context**: reading why fdp graphs with cluster edges already matched native in json0.
- **Finding**: the helper (`src/render/json-cluster-edge.ts`) runs `attach` and the cluster-edge
  undo only when `g.info.n_cluster_edges` is set, and then returns a no-op. On every other graph
  it returns `attach` itself, uncalled: the caller decides when it runs. json runs it after the
  write; json0 calls the returned function at once (`attachFirst(g, ...)()`).
- **Impact**: a new caller that drops the return value never attaches on a graph with no cluster
  edges. `clusteredge.gv` under fdp is the only probe row the base already had right, which is
  why #135's tests did not show the gap.
- **Confidence**: High

## Observation: json0's object key order is not native's
- **Context**: checking whether any test pinned json0's key order before the attach moved.
- **Finding**: native lists an object's attributes alphabetically (cgraph's symbol dict order).
  The port lists them in `attrs` insertion order: a node now reads `pos, height, width, label`
  (`attachNode`'s set order, then the `\N` default); before #184 it read
  `label, pos, width, height`. Neither is native's. No test pins the order; the json bar is
  structural (`compareJson`, #136 AD-2). The root `name` also differs (`%1`, #185).
- **Impact**: json0 can never be byte-compared with native; use `compareJson`. The queue's
  bytediff default formats leave json0 out for the same reason.
- **Confidence**: High (`plans/issue-184-json0-attach-before-write/harness/native/ab.gv.dot.json0`)

## Observation: a key json0 newly prints carries the layout's existing divergence
- **Context**: the smoke survey under sfdp after the fix.
- **Finding**: where a layout already differs from native (sfdp's 4-cycle orientation, #257), the
  new `bb` and `pos` keys differ too, by the values base `-Tjson` already shows against native
  `-Tjson`. The harness's `unowned` column (`harness/json0-compare.ts`) counts head diffs that
  base `-Tjson` does not also show; it is the number that says whether a change added a
  divergence or only printed one.
- **Impact**: judge a format that gains keys by `unowned`, not by its raw diff count.
- **Confidence**: High
