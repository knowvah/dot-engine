# Follow-up filed as #185 (T1 step 1, 2026-11-10)

Title: json: print an anonymous root graph's name as agnameof does (%1)
Labels: bug, follow-up

---

C's `write_graph` prints the root's name through `agnameof(g)`
(`plugin/core/gvrender_core_json.c`), and `agnameof` returns `%<AGID>` for an
anonymous graph (`lib/cgraph/id.c:145-169`). Native 16.1.0 prints `"name": "%1"`
for `digraph { a -> b }` under `-Tjson` and `-Tjson0`; the port prints `"name": ""`.
Anonymous subgraphs already print `%3` etc. on both sides; only the root differs.
`compareJson` skips the top-level `name` (`RESERVED_TOP`, `test/golden/compare-json.ts:114`),
so surveys miss it. Not diagnosed.

Repro (16.1.0 oracle, `GVBINDIR=/tmp/ghl`): `digraph { subgraph { a } subgraph cluster_x { b } a -> b }`
- native: root `"name": "%1"`, anonymous subgraph `"name": "%3"`.
- port: root `"name": ""`, anonymous subgraph `"name": "%3"`.

**Done when:** the port's json and json0 root `name` equals native on the repro and on
the smoke ids' anonymous roots.

Found while planning #136.
