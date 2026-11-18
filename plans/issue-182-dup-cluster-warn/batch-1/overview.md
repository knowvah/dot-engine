# Batch 1

One task, one agent (the executor itself). No parallel work: every change
touches the same function and its two callers.

| Task | Writes | Status |
|---|---|---|
| [T1](T1-fillmap-warn.md): shared `mkClustMap` with fillMap's warning, tests, gates, squash | `src/common/clust-map{,.test}.ts`, `src/layout/fdp/cluster-edges.ts`, `src/layout/dot/compound.ts`, `src/render/json-dup-cluster.test.ts` | [x] |
