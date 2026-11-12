# Follow-up issue #182 (filed 2026-11-10 by T1 step 1)

Title: `fdp, dot compound: warn on two clusters with one name (fillMap)`
Labels: `bug`, `follow-up` (not `queue:ready`)

---

C's `fillMap` (`lib/common/utils.c:1577`) warns `Two clusters named %s - the second
will be ignored` when two clusters in the cluster tree share a name. Both port copies
keep the first silently: `src/layout/fdp/cluster-edges.ts:40` (`fillMap`) and
`src/layout/dot/compound.ts:34` (`fillClustMap`).

Repro (16.1.0 oracle), `plans/issue-135-json-dup-cluster-warn/harness/dup.gv`:

```
digraph G {
  subgraph cluster_a { subgraph cluster_x { a } }
  subgraph cluster_b { subgraph cluster_x { b } }
  a -> b
}
```

- `-Kfdp -Tsvg`: native prints the warning once; the port prints nothing.
- With `compound=true` added, `-Kdot -Tsvg`: same.
- Corpus: `1436` (5 warnings), `1902` and `graphs-b7` (1 each) under fdp.

**Done when:** stderr equals native for fdp, and for dot with `compound=true`, on the
repro and the three corpus ids.

Found while planning #135.
