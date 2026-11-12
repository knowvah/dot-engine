# Follow-up issue #183 (filed 2026-11-10 by T1 step 1)

Title: `isACluster ignores a cluster attribute inherited from the parent`
Labels: `bug`, `follow-up` (not `queue:ready`)

---

C's `is_a_cluster` (`lib/common/utils.c:697`) reads `agget(g, "cluster")`, which
returns the value a subgraph inherits from its parent's graph attributes. The port's
`isACluster` (`src/layout/dot/rank.ts:89`) reads only `g.attrs.get('cluster')`, the
subgraph's own value, so an inherited `cluster=true` is ignored.

Repro (16.1.0 oracle, `-Kdot -Tsvg`, count of `class="cluster"` groups):

- `graph G { cluster=true; subgraph p { subgraph q { a } } subgraph r { subgraph q { b } } }`:
  native 4, port 0.
- `graph G { subgraph p { cluster=true; subgraph q { a } } subgraph r { cluster=true; subgraph q { b } } }`:
  native 4, port 2.

Layout-affecting: every engine that asks `isACluster` sees fewer clusters than native.
It also hides #135's json warning on these two inputs (native warns
`Duplicate cluster name "q"` on both; after #135 the port still warns on neither).

**Done when:** both repros equal native under dot (svg and xdot, stdout and stderr), and
a targeted survey of corpus ids that set `cluster` as a graph attribute shows no new
difference from native.

Found while planning #135.
