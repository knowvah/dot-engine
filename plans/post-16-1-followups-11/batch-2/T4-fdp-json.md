# T4: fdp `json` undoes cluster-edge proxies (133)

**Context:** native's `json` renderer calls `attach_attrs` (`plugin/core/gvrender_core_json.c:66`), which ends with
`if (HAS_CLUST_EDGE(g)) undoClusterEdges(g)` (`lib/common/output.c:403-404`), so json never shows fdp's `__0:<cluster>`
proxy nodes and cluster edges point at the cluster. Part 10 T14 moved the port's undo to the next layout
(`src/gvc/layout-reset.ts:53-57`) for `dot`/`xdot` re-renders; the port's `json` path never undoes, so a first fdp `json`
render on `src/gvc/__fixtures__/rerender/cluster-edge-splines.gv` prints a `__0:clusterA` object and an edge to it with no
`pos`. Native: edges `(4,5)`, `(1,3)`, `(1,0)`, six objects.

**Task:** make the port's `json` render perform `attach_attrs`'s undo at C's point, through the same helper `dot`/`xdot`
use, without changing part 10's second-render behaviour. Tests in `src/render/json-cluster-edge.test.ts`: fdp `json` and
`json0` equal `harness/T0/cluster-edge.*`; part 10's `src/gvc/rerender.test.ts` still passes unchanged.

**Write-set:** `src/render/json.ts` (733 lines: may not grow; put new code in a new `json-*.ts` along C function
boundaries), `src/render/dot/write-back.ts`, `src/render/json-cluster-edge.test.ts` (new).
**Read-set:** `lib/common/output.c:254-420`, `plugin/core/gvrender_core_json.c:50-80`, `lib/common/utils.c:undoClusterEdges`;
`src/gvc/layout-reset.ts`, `src/layout/fdp/cluster-edges.ts:250-324`; part 10's journal row T14.

**Acceptance criteria:**
- *Given* the cluster-edge fixture on fdp, *when* rendered to `json`, *then* no `__0:` object, the edge's head is the cluster's
  index, and the output equals native's.
- *Given* a second render, *then* `src/gvc/rerender.test.ts` passes unchanged.
- *Given* the smoke bytediff, *then* the only changes are fdp `json`/`json0` on graphs with an edge to a cluster (stop 8 exception).

**Commit:** `fix(T4): undo cluster-edge proxies in json as attach_attrs does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
