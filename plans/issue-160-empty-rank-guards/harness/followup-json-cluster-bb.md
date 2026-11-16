<!-- Follow-up issue body, drafted at planning. `gh issue create` was denied to the
planning session by the permission classifier; T2 files it (labels `bug`,
`follow-up`), title:
"json: a cluster inside an anonymous subgraph after an edge loses bb and _draw_" -->

Found while planning #160 (unattended `/plan-mission`, queue tip `bd5ddf75`). This
port defect predates the 16.1.1 work. Not diagnosed yet: no mechanism.

**Repro:**

```
digraph{ a->b {subgraph cluster{ x }} }
```

- `-Txdot`: the port equals native 16.1.1 byte for byte, the cluster's
  `bb="…"` and `_draw_` included.
- `-Tjson`: native's `cluster` object has `"bb": "64,64,134,116"` and its
  `_draw_`. The port's `cluster` object has neither. (The root's `"name": "%1"`
  against `""` is #185.)

It needs an edge **before** an anonymous subgraph that wraps the cluster:

| input | port json `"bb"` count | native |
|---|---|---|
| `digraph{ a->b {subgraph cluster{ x }} }` | 1 | 2 |
| `digraph{ a->a[label=0] {subgraph cluster{ x }} }` | 1 | 2 |
| `digraph{ a {subgraph cluster{ x }} }` | 2 | 2 |
| `digraph{ {subgraph cluster{ x }} a }` | 2 | 2 |
| `digraph{ a->b subgraph cluster{ x } }` | 2 | 2 |

Corpus: once #160's empty-rank guards stop the port throwing on `2759` and
`2759_1`, their `-Tjson` differs from native by exactly this cluster
`_draw_`/`bb` plus #185's line. Every other format equals native.

Start from the json writer's cluster walk (C
`lib/plugin/core/gvrender_core_json.c`) compared with the port's. The xdot
attributes are there, so the layout is right and the json side doesn't reach
them.
