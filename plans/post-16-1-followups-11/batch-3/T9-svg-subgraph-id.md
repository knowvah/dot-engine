# T9: svg graph id on a subgraph render (136)

**Context:** rendering a subgraph to svg after a root layout (part 10 T15's case, `harness/T0/subg-*`), native's top `<g>`
is `id="graph1"`, the port's `graph0`. C's `getObjId` (`lib/common/emit.c`) builds the graph id from `AGSEQ` of the graph
being emitted; `src/render/svg-graph.ts:271` sets `obj.id = 'graph0'` unconditionally (and its gradient prefix comment at
`:262-263` assumes it). AD-5.

**Task:** derive the id as `getObjId` does for a graph object, so the root stays `graph0` and a subgraph gets its sequence;
keep gradient ids consistent with C's `svg_gradstyle` prefix. Test in `src/render/svg-subgraph-id.test.ts` against
`harness/T0/subg-*.svg` for the id and one gradient id.

**Write-set:** `src/render/svg-graph.ts` (449 lines), `src/render/svg-subgraph-id.test.ts` (new).
**Read-set:** `lib/common/emit.c:getObjId`, `plugin/core/gvrender_core_svg.c:svg_begin_graph`, `svg_gradstyle`;
`src/render/svg-graph.ts:250-290`.

**Acceptance criteria:**
- *Given* a subgraph render after a root layout, *when* rendered to svg, *then* the top `<g>` id equals native's.
- *Given* any root render, *then* the id stays `graph0` and the smoke bytediff is identical (stop 8).

**Commit:** `fix(T9): number the svg graph id by sequence as getobjid does`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
