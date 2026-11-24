# Batch 1

The executor runs this one task itself, with nothing in parallel. The port
of `init_job_viewport` changes the signatures of `setupPageClip` and
`setupPageSize` that five consumers share, and the edge gate becomes
reachable only once the clip moves. One test file pins both. Splitting the
work would leave the tree uncompilable or a test red between commits.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-viewport.md) | port `viewport=` (view, zoom, focus) through every clip, page-size and zoom consumer; move `edge_in_box` into the walk's edge gate; tests on carried fixtures; gates; squash | executor | `src/gvc/{viewport,job,device,emit-xdot,emit-walk,emit-gates}.ts`, `src/render/{svg-graph,map}.ts`, `src/common/graph-init.ts`, `src/gvc/viewport-attr.test.ts` and four test fixtures | — | [x] |
