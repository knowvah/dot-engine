# Survey: issue #192

Oracle: the carried 16.1.1 build, `GVBINDIR=/tmp/ghl1611-carried`, captured
2026-11-21 by `capture-native.sh`. Port: the working tree through
`port-render.ts` (public `parse` + `render`). Runner: `run-probes.sh`. It
line-diffs dot, xdot and plain, and compares json with `compareJson`
(golden comparator, 0.01 tolerance), because the port's json formatting
differs from native's.

## C semantics

- `attach_phase_attrs(g, maxphase)` (`lib/dotgen/dotinit.c:241-256`):
  `agattr_text(g, AGNODE, "rank", "")` and `"order"`, then for each
  `agfstnode(g)` node `agxset(n, rk, ITOS(ND_rank(n)))`; when `maxphase >= 2`,
  also `order`. Called with 1, 2, 2 at the phase 1, 2, 3 stops.
- `setattr` (`lib/cgraph/attr.c:257-309`): an existing local (root) symbol has
  its default replaced. No existing symbol: a new global one with the
  default, and `addattr` on every node.
- `write_dict` (`lib/cgraph/write.c:268-315`): skips an empty default only
  when `!sym->print`. A user-declared symbol has `print` set, so after the
  reset native prints `order=""`.

## Probe table (14 probes x 4 formats)

Diff counts: lines for dot, xdot and plain; `compareJson` diffs for json.
Every base diff is a missing `rank` or `order` (or the root default's value).

| Probe | What it covers | base dot/xdot/json/plain | prototype |
|---|---|---|---|
| p1-basic | phase 1 | 3/3/3/0 | 0/0/0/0 |
| p1-node-own | user `a [rank=5]` overwritten | 3/3/2/0 | 0 |
| p1-subg-default | subgraph `node [rank=9]` kept | 2/2/2/0 | 0 |
| p1-zero | `phase=0` clamps to 1 | 2/2/2/0 | 0 |
| p2-basic | phase 2 | 6/6/6/0 | 0 |
| p2-cluster | cluster members | 6/6/6/0 | 0 |
| p2-newrank | newrank, 3 clusters, no fill node | 8/8/8/0 | 0 |
| p2-root-default | root `node [order=7]` becomes `""` | 6/6/4/0 | 0 |
| p2-undirected | `graph` | 6/6/6/0 | 0 |
| p3-basic | phase 3 attaches with 2 | 6/6/6/0 | 0 |
| p3-golden | `test/golden/inputs/dot-phase.dot` | 8/8/8/0 | 0 |
| p3-lr | rankdir=LR | 6/6/6/0 | 0 |
| p3-root-both | root `node [rank=x, order=y]` | 8/8/4/0 | 0 |
| p4-full | full pipeline, no attach | 0/0/0/0 | 0 |
| **total** | | **same 17, diff 39** | **same 56, diff 0** |

Full rows: `results/probes-base.tsv`, `results/probes-proto.tsv`; outputs in
`results/base/` and `results/proto/`.

## Reach selection

The change runs only when `graphPhase(g)` is 1, 2 or 3, which requires a
`phase` graph attribute (absent or unparseable gives -1). A search for
`phase` over every `.gv`/`.dot` under `~/git/graphviz-16.1.1/tests` finds
only `2621.dot`, and there only inside node names and labels
(`…_phase2.geojson.gz`). So no corpus id can reach the change, and the
smoke bytediff must be identical. The golden input `dot-phase` (phase=3)
does reach it. Its xdot golden ref (`test/golden/refs-xdot/dot-phase.xdot`)
already has native's `rank` and `order`, and the comparator does not score
those attributes. `gates.sh` was not run at planning (load 28); the
executor runs it as gate 3.

## No native reference: newrank phase stop with fill nodes

`digraph { newrank=true; phase=2; subgraph cluster_a { a1 a3 } a1 -> x -> a3 }`
segfaults native (`-Tdot`, carried build). The port prints the fill node
`__fill_1_0` and a `_new_rank` subgraph. C's `agfstnode` includes fill nodes,
so the head attaches `rank`/`order` to that node too, which matches the C
code path. Nothing can be compared, so it is excluded from the probes and
recorded in #282.

## Pack arm

`pack` set: the port ignores `phase` entirely (`pack-components.ts:250-254`);
native stops per component. Out of scope here; #281.

## Probes added at execution (26, `e*.gv`)

All 26 x 4 formats equal native at the head (`results/probes-head.tsv`:
`# same 160, diff 0` over all 40 probes). On the base, each differs from
native only in `rank=`/`order=` lines.

| Probes | What they cover |
|---|---|
| e1, e2, e3 | a root default with phase 1 (nodes keep `order=7`; the root prints `order=""`), and a default declared after a node |
| e4, e21, e26 | subgraph and cluster defaults for `order`/`rank`, kept beside a root reset |
| e5 | a node's own `order` at phase 1 is kept (only `rank` is written) |
| e6, e7, e15, e16 | clusters and newrank (no fill node) at phases 1 and 3 |
| e8, e9, e11 | edge labels (ranks doubled) and a flat-edge label |
| e10, e12, e13, e14, e17, e18 | `rank=same`, concentrate, two components, a self-loop, `rankdir=BT` |
| e19, e20, e22 | edge and graph attributes named `rank`/`order` are untouched; an HTML root default becomes `""` |
| e23, e24, e25 | an empty graph, a strict undirected graph, a record port |
