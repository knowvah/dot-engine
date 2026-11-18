# Batch 1

One task, one agent (the executor itself). No parallel work: the fix is one
line in the builder, and every test reads the same probes.

| Task | Writes | Status |
|---|---|---|
| [T1](T1-seed-cluster.md): seed `cluster` from the snapshot, tests, gates, squash | `src/parser/builder{,.test}.ts`, `src/render/dot-write-dicts.test.ts`, `src/layout/cluster-inherit.test.ts` | [x] |
