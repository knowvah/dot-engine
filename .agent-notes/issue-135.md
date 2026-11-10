# issue-135 mission — observations (2026-11-10)

## Observation: json's `label_subgs` numbers the rendered graph itself on a subgraph render
- **Context**: porting `label_subgs` (`plugin/core/gvrender_core_json.c:626-639`) for #135. The
  brief's AD-1 said gids would not change.
- **Finding**: `label_subgs` tests `g != agroot(g)`, not "g is the graph being written". On a render
  of a subgraph alone (`gvLayout(gvc, s)`, `gvRenderData(gvc, s, "json")`), `s` takes gid 0, so
  `_subgraph_cnt` counts it and the subgraphs below it start at 1, while `write_subgs` lists only
  what is below `s`: gid 0 belongs to no object. Native 16.1.0, `harness/sub.gv` subgraph `s`:
  `_subgraph_cnt` 4, object gids 1, 2, 3, nodes 4, 5. The base port printed 3 and 0, 1, 2 / 3, 4
  (`compareJson` reported the count). Root renders are unaffected.
- **Impact**: a numbering pass ported from C needs its root test checked against a subgraph render,
  which no corpus input and no golden exercises; the only native source is part 10 T15's program.
- **Confidence**: High (native refs `plans/issue-135-json-dup-cluster-warn/harness/out/sub.s.*`)

## Observation: part 10 T15's `subg-after-free.c` hides native warnings
- **Context**: capturing native stderr for a subgraph json render.
- **Finding**: the program calls `agseterr(AGMAX)`, so no warning reaches stderr. Compiling a copy
  with that line removed (`sed '/agseterr(AGMAX);/d'`) prints them; the issue-135 `regen.sh` does
  this. Its `subonly` mode renders the subgraph without ever laying out the root.
- **Impact**: a stderr ref for a subgraph render cannot come from the T15 binary as built.
- **Confidence**: High

## Observation: a hand-built subgraph fixture must set `root`
- **Context**: `json.branch.test.ts` failed after the port: its hand-built `cluster_0` vanished.
- **Finding**: `new Graph()` sets `root = this`. The fixture set `parent` and `subgraphs` but not
  `root`, so code ported with C's `g != agroot(g)` test took the subgraph for a root. Every
  production path that creates a subgraph sets `root` (`parser/builder.ts:304`,
  `model/cgraph-ops.ts:125`, `layout/pack/ccomps.ts:37`).
- **Impact**: build test subgraphs with `agsubg` (`model/cgraph-ops.ts`) or set `root` by hand.
- **Confidence**: High

## Observation: `json.ts` held two literal NUL bytes
- **Context**: planning and executing #135.
- **Finding**: `canonicalRootEdges` joined edge keys with a raw NUL byte inside the string literals
  (`json.ts:222,225`), so plain `grep` treated the file as binary and printed nothing. They are
  now written `'\0'` (same string value).
- **Impact**: when `grep` finds nothing in a file that plainly holds the text, try `grep -a` and
  look for control bytes (`grep -naP '[\x00-\x08]'`).
- **Confidence**: High

## Observation: json0 prints no graph or cluster `bb` and no edge `pos`
- **Context**: comparing a json0 subgraph render with native through `compareJson`.
- **Finding**: native `-Tjson0` runs `attach_attrs` in `json_begin_graph` and prints `bb` on the
  graph and each cluster and `pos` on each edge; the port's json0 prints neither, on a root render
  too (`digraph{a->b}`), on the queue's merge base with main as well. Filed as #184, not diagnosed.
- **Impact**: json0 has no corpus or golden comparison that would have shown this; do not use a
  json0 `compareJson` against native as a pass/fail check until #184 is done.
- **Confidence**: High (native and port output of `digraph{a->b}`)

## Observation: `isACluster` ignores an inherited `cluster` attribute
- **Context**: planning #135 (AD-5).
- **Finding**: C's `is_a_cluster` reads `agget(g, "cluster")`, which sees a value inherited from the
  parent; the port reads the subgraph's own attributes only. Filed as #183.
- **Impact**: `graph{cluster=true; ...}` inputs lay out with fewer clusters than native and miss
  the #135 warning.
- **Confidence**: High (planning probes, native svg cluster counts)
